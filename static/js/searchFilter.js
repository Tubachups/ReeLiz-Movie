document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.getElementById("search-input");
  const moviesContainer = document.getElementById("movies");

  searchInput.addEventListener("input", () => {
    const query = searchInput.value.toLowerCase();
    const movies = moviesContainer.querySelectorAll(".movie-card");

    movies.forEach((movie) => {
      const title = movie.querySelector(".movie-title").innerText.toLowerCase();
      if (title.includes(query)) {
        movie.style.display = "block";
      } else {
        movie.style.display = "none";
      }
    });
  });
});
