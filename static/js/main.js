import { fetchGenres, fetchMovies } from "./services/movieService.js";
import { renderMovies } from "./components/movieRenderer.js";
import { setupGenresDropdown } from "./components/dropdown.js";

let genresMap = {};
let allMovies = [];

// Handle navigation on Now Showing or Coming soon
document.querySelectorAll("[data-page]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = link.dataset.page;

    if (window.location.pathname !== "/") {
      window.location.href = `/?page=${page}`;
    } else {
      loadMovies(page);
    }
  });
});

async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get("page");

  await initializeGenres();
  await loadMovies(page || "now");
}

async function initializeGenres() {
  const genres = await fetchGenres();
  genresMap = genres.reduce((map, g) => {
    map[g.id] = g.name;
    return map;
  }, {});
  setupGenresDropdown(
    genres,
    (genreId) => filterMoviesByGenre(genreId),
    () => renderMovies(allMovies, genresMap)
  );
}

async function loadMovies(type) {
  allMovies = await fetchMovies(type);
  renderMovies(allMovies, genresMap);
}

function filterMoviesByGenre(genreId) {
  if (!allMovies.length) return;

  const filtered = allMovies.filter((movie) =>
    movie.genre_ids.includes(parseInt(genreId))
  );
  renderMovies(filtered, genresMap);
}

init();
