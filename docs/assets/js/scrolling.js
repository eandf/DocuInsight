// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Fade in animation on scroll
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, observerOptions);

document.querySelectorAll(".fade-in").forEach((el) => {
  observer.observe(el);
});

// Update navigation background and visibility on scroll
let lastScrollTop = 0;
let scrollTimeout;
let navClicked = false;

// Track when nav links are clicked
document.querySelectorAll('.nav a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    navClicked = true;
  });
});

window.addEventListener("scroll", () => {
  const nav = document.querySelector(".nav");
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

  // Clear existing timeout
  clearTimeout(scrollTimeout);

  // If nav was clicked, keep it visible until scrolling stops
  if (navClicked) {
    nav.style.transform = "translateY(0)";
    nav.style.transition = "transform 0.3s ease-in-out";

    // Set timeout to reset navClicked when scrolling stops
    scrollTimeout = setTimeout(() => {
      navClicked = false;
    }, 150); // 150ms after scrolling stops
  } else {
    // Normal hide/show nav based on scroll direction
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down & past 100px - hide nav
      nav.style.transform = "translateY(-100%)";
      nav.style.transition = "transform 0.3s ease-in-out";
    } else {
      // Scrolling up or at top - show nav
      nav.style.transform = "translateY(0)";
      nav.style.transition = "transform 0.3s ease-in-out";
    }
  }

  // Update background
  if (window.scrollY > 100) {
    nav.style.background = "rgba(255, 255, 255, 0.98)";
    nav.style.boxShadow = "0 4px 6px -1px rgb(0 0 0 / 0.1)";
  } else {
    nav.style.background = "rgba(255, 255, 255, 0.95)";
    nav.style.boxShadow = "none";
  }

  lastScrollTop = scrollTop <= 0 ? 0 : scrollTop; // For Mobile or negative scrolling
});
