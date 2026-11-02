const maxRequestBodyBytes = 16 * 1024;
const allowedQualifications = new Set(["12th Standard", "Undergraduate", "Graduate", "Other"]);
const allowedProgrammes = new Set([
  "Cabin Crew & Air Hostess Training",
  "Airport Operations & Ground Staff Training",
  "Aviation Hospitality Courses",
  "Personality Development & Communication Skills",
]);

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const getLead = (body) => {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestError(400, "Invalid enquiry details.");
  }

  const fields = ["name", "phone", "email", "dob", "location", "qualification", "programme"];
  const lead = Object.fromEntries(fields.map((field) => [
    field,
    typeof body[field] === "string" ? body[field].trim() : "",
  ]));
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const dobDate = /^\d{4}-\d{2}-\d{2}$/.test(lead.dob)
    ? new Date(`${lead.dob}T00:00:00.000Z`)
    : null;
  const validDob = dobDate !== null &&
    !Number.isNaN(dobDate.valueOf()) &&
    dobDate.toISOString().slice(0, 10) === lead.dob &&
    lead.dob <= new Date().toISOString().slice(0, 10);
  const phoneDigits = lead.phone.replace(/\D/g, "");
  const phone = lead.phone.startsWith("+")
    ? `+${phoneDigits}`
    : phoneDigits.length === 10
      ? `+91${phoneDigits}`
      : phoneDigits.length === 12 && phoneDigits.startsWith("91")
        ? `+${phoneDigits}`
        : "";

  if ((body.message !== undefined && typeof body.message !== "string") ||
      fields.some((field) => !lead[field]) ||
      lead.name.length > 100 ||
      lead.phone.length > 40 ||
      lead.email.length > 254 ||
      !validDob ||
      lead.location.length > 100 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email) ||
      !/^[+()\d.\-\s]+$/.test(lead.phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15 ||
      !phone ||
      !allowedQualifications.has(lead.qualification) ||
      !allowedProgrammes.has(lead.programme) ||
      message.length > 2000) {
    throw new RequestError(400, "Please check your enquiry details and try again.");
  }

  return { ...lead, phone, message };
};

const logGhlError = async (operation, response, lead) => {
  let detail = "";
  try {
    const body = await response.json();
    const messages = Array.isArray(body.message) ? body.message : [body.message || body.error];
    detail = messages.filter((message) => typeof message === "string").join("; ");
  } catch {
    // Keep the upstream status in the log when its error response is not JSON.
  }

  const sensitiveValues = [lead.name, lead.email, lead.phone, lead.dob, lead.location, lead.qualification, lead.programme, lead.message]
    .filter(Boolean);
  for (const value of sensitiveValues) {
    detail = detail.replaceAll(value, "[redacted]");
  }

  console.error(`${operation} returned HTTP ${response.status}${detail ? `: ${detail}` : "."}`);
};

export async function POST(request) {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    return json({ error: "Expected an application/json request." }, 415);
  }

  let body;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > maxRequestBodyBytes) {
      return json({ error: "Request body is too large." }, 413);
    }
    body = JSON.parse(text);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return json({ error: "Invalid JSON request." }, 400);
    }
    console.error("Unable to read lead request:", error);
    return json({ error: "Unable to read enquiry details. Please try again." }, 400);
  }

  let lead;
  try {
    lead = getLead(body);
  } catch (error) {
    if (error instanceof RequestError) return json({ error: error.message }, error.status);
    throw error;
  }

  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  const locationId = process.env.GHL_LOCATION_ID;
  if (!token || !locationId) {
    return json({
      error: "Admissions enquiries are not configured yet. Please contact the academy directly.",
    }, 503);
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  let contactResponse;
  try {
    contactResponse = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        dateOfBirth: lead.dob,
        city: lead.location,
        locationId,
        source: "RCAA Website",
        customFields: [
          { key: "contact.highest_qualification", fieldValue: lead.qualification },
          { key: "contact.course_interested_in", fieldValue: lead.programme },
          {key : "{{contact.date_of_birth}}" , fieldValue: lead.dob},
          {key :" {{contact.city}}" , fieldvalue : lead.location}
        ],
        tags: [
          "RCAA Landing Page",
          `Programme: ${lead.programme}`,
        ],
      }),
    });
  } catch (error) {
    console.error("GoHighLevel contact request failed:", error);
    return json({ error: "We couldn't submit your enquiry right now. Please try again." }, 502);
  }

  if (!contactResponse.ok) {
    await logGhlError("GoHighLevel contact request", contactResponse, lead);
    return json({ error: "We couldn't submit your enquiry right now. Please try again." }, 502);
  }

  let contactId;
  try {
    const result = await contactResponse.json();
    contactId = result.contact?.id;
  } catch (error) {
    console.error("Unable to read the GoHighLevel contact response:", error);
  }

  if (!lead.message) return json({ submitted: true }, 201);

  if (!contactId) {
    return json({
      submitted: true,
      warning: "Your contact details were received, but your message could not be saved. Please contact admissions with your enquiry.",
    }, 201);
  }

  let noteResponse;
  try {
    noteResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/${encodeURIComponent(contactId)}/notes`,
      {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ title: "RCAA website enquiry", body: lead.message }),
      },
    );
  } catch (error) {
    console.error("GoHighLevel enquiry note request failed:", error);
    return json({
      submitted: true,
      warning: "Your contact details were received, but your message could not be saved. Please contact admissions with your enquiry.",
    }, 201);
  }

  if (!noteResponse.ok) {
    console.error(`GoHighLevel enquiry note request returned HTTP ${noteResponse.status}.`);
    return json({
      submitted: true,
      warning: "Your contact details were received, but your message could not be saved. Please contact admissions with your enquiry.",
    }, 201);
  }

  return json({ submitted: true }, 201);
}
