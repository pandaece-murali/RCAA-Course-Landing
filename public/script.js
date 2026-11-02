const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");
const scrollProgress = document.querySelector(".scroll-progress");

const updateScrollProgress = () => {
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  scrollProgress.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
};

let scrollProgressFrame = 0;
window.addEventListener(
  "scroll",
  () => {
    if (!scrollProgressFrame) {
      scrollProgressFrame = window.requestAnimationFrame(() => {
        updateScrollProgress();
        scrollProgressFrame = 0;
      });
    }
  },
  { passive: true },
);
window.addEventListener("resize", updateScrollProgress, { passive: true });
updateScrollProgress();

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

const revealTargets = document.querySelectorAll(
  ".hero-copy, .hero-form, .about-grid > *, .journey-scroll-intro, " +
    ".journey-step > .journey-step-number, .journey-step > .eyebrow, " +
    ".journey-step > h3, .journey-step > p:last-child, .section-heading, .programme-card, " +
    ".why-intro, .experience-copy, .training-gallery, .learning-stack-heading, .learning-stack-card, " +
    ".career-photo, .career-copy, .career-roles > div, .story-panel, .faq-panel, " +
    ".contact-copy, .contact-section .lead-form, .footer-main > *",
);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
  const siblingIndexes = new Map();
  revealTargets.forEach((element) => {
    const parent = element.parentElement;
    const siblingIndex = siblingIndexes.get(parent) || 0;
    siblingIndexes.set(parent, siblingIndex + 1);
    element.dataset.reveal = "";
    element.style.setProperty("--reveal-delay", `${Math.min(siblingIndex, 3) * 90}ms`);
  });

  document.documentElement.classList.add("motion-ready");
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
  );
  revealTargets.forEach((element) => revealObserver.observe(element));
}

const parallaxTargets = [...document.querySelectorAll(
  ".hero-image, .about-main-image, .about-inset, .training-gallery img",
)];

if (parallaxTargets.length && !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
    "IntersectionObserver" in window) {
  const visibleParallaxTargets = new Set();
  let parallaxFrame = 0;

  const updateParallax = () => {
    const viewportCenter = window.innerHeight / 2;
    visibleParallaxTargets.forEach((element) => {
      const bounds = element.getBoundingClientRect();
      const offset = Math.max(-18, Math.min(18, (viewportCenter - bounds.top - bounds.height / 2) * 0.045));
      element.style.setProperty("--scroll-offset", `${offset.toFixed(1)}px`);
    });
    parallaxFrame = 0;
  };

  const scheduleParallaxUpdate = () => {
    if (!parallaxFrame) {
      parallaxFrame = window.requestAnimationFrame(updateParallax);
    }
  };

  const parallaxObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        visibleParallaxTargets.add(entry.target);
      } else {
        visibleParallaxTargets.delete(entry.target);
      }
    });
    scheduleParallaxUpdate();
  }, { rootMargin: "80px 0px" });

  parallaxTargets.forEach((element) => parallaxObserver.observe(element));
  window.addEventListener("scroll", scheduleParallaxUpdate, { passive: true });
  window.addEventListener("resize", scheduleParallaxUpdate, { passive: true });
}

const journeySteps = [...document.querySelectorAll("[data-journey-step]")];
const journeyImages = [...document.querySelectorAll(".journey-visual-image")];
const journeySection = document.querySelector(".journey-scroll");
const journeyNumber = document.querySelector(".journey-visual-number");
const journeyCaption = document.querySelector(".journey-visual-caption");
const journeyCaptions = ["Cabin training", "Practical learning", "Career preparation"];

if (journeySteps.length && journeyImages.length && "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const journeyObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    const activeIndex = Number(current.target.dataset.journeyStep);
    journeySection.dataset.activeStep = String(activeIndex);
    journeySteps.forEach((step, index) => step.classList.toggle("is-active", index === activeIndex));
    journeyImages.forEach((image, index) => image.classList.toggle("is-active", index === activeIndex));
    journeyNumber.textContent = String(activeIndex + 1).padStart(2, "0");
    journeyCaption.textContent = journeyCaptions[activeIndex];
  }, { threshold: 0, rootMargin: "-42% 0px -42% 0px" });
  journeySteps.forEach((step) => journeyObserver.observe(step));
}

const whySteps = [...document.querySelectorAll("[data-why-step]")];
if (whySteps.length && "IntersectionObserver" in window &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const whyStepObserver = new IntersectionObserver((entries) => {
    const current = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!current) return;
    whySteps.forEach((step) => step.classList.toggle("is-active", step === current.target));
  }, { threshold: 0, rootMargin: "-42% 0px -42% 0px" });
  whySteps.forEach((step) => whyStepObserver.observe(step));
}

const savedScrollPosition = sessionStorage.getItem("rcaa-return-scroll");
if (savedScrollPosition !== null) {
  sessionStorage.removeItem("rcaa-return-scroll");
  window.requestAnimationFrame(() => window.scrollTo(0, Number(savedScrollPosition)));
}

document.querySelectorAll(".lead-form").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector('button[type="submit"]');
    const status = form.querySelector(".form-status");
    submitButton.disabled = true;
    form.setAttribute("aria-busy", "true");
    status.classList.remove("is-error");
    status.textContent = "Sending your enquiry…";

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "We couldn't submit your enquiry. Please try again.");
      }

      form.reset();
      if (result.warning) {
        sessionStorage.setItem("rcaa-submit-warning", result.warning);
      }

      sessionStorage.setItem("rcaa-return-scroll", String(window.scrollY));
      sessionStorage.setItem("rcaa-return-url", window.location.href);
      window.location.href = "thank-you.html";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error instanceof Error
        ? error.message
        : "We couldn't submit your enquiry. Please try again.";
    } finally {
      submitButton.disabled = false;
      form.removeAttribute("aria-busy");
    }
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
