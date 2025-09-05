document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const dropdown = document.querySelector(".dropdown");
  const navLinks = document.querySelectorAll(".nav-center a[data-page], .dropdown a[data-page]");

  // Hamburger menu toggle
  if (hamburger && dropdown) {
    hamburger.addEventListener("click", () => {
      dropdown.classList.toggle("show");
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!hamburger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });
  }

  // Handle nav link clicks
  navLinks.forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const page = link.dataset.page;
      if (page === "about") {
        window.location.href = "/";
        }

      if (page === "home") {
        window.location.href = "/";
      } else if (page === "now" || page === "coming") {
        if (document.querySelector("#movies")) {
          fetchMovies(page);
        } else {
          window.location.href = `/?type=${page}`;
        }
      }
    });
  });
});
