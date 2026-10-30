const { createReadStream, statSync } = require("node:fs");
const { createServer } = require("node:http");
const path = require("node:path");

const root = __dirname;
const publicFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/script.js", "script.js"],
  ["/assets/rcaa-logo.png", "assets/rcaa-logo.png"],
  ["/assets/rcaa-training-1.jpg", "assets/rcaa-training-1.jpg"],
  ["/assets/rcaa-training-2.jpg", "assets/rcaa-training-2.jpg"],
  ["/assets/rcaa-placement-1.jpg", "assets/rcaa-placement-1.jpg"],
  ["/assets/rcaa-placement-2.jpg", "assets/rcaa-placement-2.jpg"],
  ["/assets/rcaa-campus-hero.png", "assets/rcaa-campus-hero.png"],
  ["/assets/rcaa-simulator.jpg", "assets/rcaa-simulator.jpg"],
  ["/assets/rcaa-cabin-attendant.jpg", "assets/rcaa-cabin-attendant.jpg"],
]);
const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
};

const server = createServer((request, response) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" });
    response.end("Method not allowed");
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  } catch {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const requestedPath = publicFiles.get(pathname);
  if (!requestedPath) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  const filePath = path.resolve(root, requestedPath);
  const relativePath = path.relative(root, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const contentType = mimeTypes[path.extname(filePath).toLowerCase()];
  if (!contentType) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  let fileInfo;
  try {
    fileInfo = statSync(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    console.error(`Unable to read ${pathname}:`, error);
    response.writeHead(500);
    response.end("Internal server error");
    return;
  }

  if (!fileInfo.isFile()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Length": fileInfo.size,
    "Content-Type": contentType,
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  createReadStream(filePath)
    .on("error", (error) => {
      console.error(`Unable to serve ${pathname}:`, error);
      if (!response.headersSent) {
        response.writeHead(500);
      }
      response.end("Internal server error");
    })
    .pipe(response);
});

const port = Number(process.env.PORT) || 5173;
server.listen(port, "127.0.0.1", () => {
  console.log(`Landing page available at http://localhost:${port}`);
});
