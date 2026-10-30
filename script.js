const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle.addEventListener("click", () => {
  const isOpen = mainNav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Open navigation");
  });
});

document.querySelectorAll(".lead-form").forEach((form) => {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    form.querySelector(".form-status").textContent =
      "Your details were not sent. Connect an enquiry service to receive submissions.";
    form.reset();
  });
});

const testimonialSlides = [...document.querySelectorAll("[data-testimonial]")];
const testimonialCount = document.querySelector(".story-count");
const testimonialPanel = document.querySelector(".testimonial-panel");
let activeTestimonial = 0;
let testimonialTimer;

testimonialCount.lastChild.textContent = ` ${String(testimonialSlides.length).padStart(2, "0")}`;

const showTestimonial = (index) => {
  activeTestimonial = (index + testimonialSlides.length) % testimonialSlides.length;
  testimonialSlides.forEach((slide, slideIndex) => {
    const isActive = slideIndex === activeTestimonial;
    slide.hidden = !isActive;
    slide.classList.toggle("is-active", isActive);
  });
  testimonialCount.firstChild.textContent = `${String(activeTestimonial + 1).padStart(2, "0")} `;
  testimonialCount.lastChild.textContent = ` ${String(testimonialSlides.length).padStart(2, "0")}`;
};

const stopTestimonialTimer = () => {
  window.clearInterval(testimonialTimer);
};

const startTestimonialTimer = () => {
  stopTestimonialTimer();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    testimonialTimer = window.setInterval(() => {
      showTestimonial(activeTestimonial + 1);
    }, 2000);
  }
};

document.querySelectorAll("[data-testimonial-step]").forEach((button) => {
  button.addEventListener("click", () => {
    showTestimonial(activeTestimonial + Number(button.dataset.testimonialStep));
  });
});

testimonialPanel.addEventListener("mouseenter", stopTestimonialTimer);
testimonialPanel.addEventListener("mouseleave", startTestimonialTimer);
testimonialPanel.addEventListener("focusin", stopTestimonialTimer);
testimonialPanel.addEventListener("focusout", (event) => {
  if (!testimonialPanel.contains(event.relatedTarget)) {
    startTestimonialTimer();
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopTestimonialTimer();
  } else {
    startTestimonialTimer();
  }
});

startTestimonialTimer();
