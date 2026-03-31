(function () {
  const STORAGE_KEY = "reeliz-theme";

  function getInitialTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEY);
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }

  function applyTheme(theme) {
    const html = document.documentElement;
    const isDark = theme === "dark";

    html.setAttribute("data-theme", theme);
    html.setAttribute("data-bs-theme", theme);

    const navbar = document.getElementById("main-navbar");
    if (navbar) {
      navbar.setAttribute("data-bs-theme", theme);
    }

    const toggleBtn = document.getElementById("theme-toggle");
    if (toggleBtn) {
      toggleBtn.setAttribute("aria-pressed", String(isDark));
      toggleBtn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
      toggleBtn.innerHTML = isDark
        ? '<i class="bi bi-sun-fill me-1"></i>Light'
        : '<i class="bi bi-moon-stars-fill me-1"></i>Dark';
    }
  }

  function initializeThemeToggle() {
    const theme = getInitialTheme();
    applyTheme(theme);

    const toggleBtn = document.getElementById("theme-toggle");
    if (!toggleBtn) return;

    toggleBtn.addEventListener("click", function () {
      const current = document.documentElement.getAttribute("data-theme") || "light";
      const nextTheme = current === "dark" ? "light" : "dark";
      localStorage.setItem(STORAGE_KEY, nextTheme);
      applyTheme(nextTheme);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeThemeToggle);
  } else {
    initializeThemeToggle();
  }
})();
