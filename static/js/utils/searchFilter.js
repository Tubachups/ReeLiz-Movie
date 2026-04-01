document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  if (!searchInput) return;

  searchInput.addEventListener("input", () => {
    const query = searchInput.value;
    window.dispatchEvent(
      new CustomEvent("movies:search", {
        detail: { query },
      })
    );
  });
});
