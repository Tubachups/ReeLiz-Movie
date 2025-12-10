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
    window.location.href = `/?page=${page}`;
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

 (function () {
    const pageLinks = document.querySelectorAll('.nav-link[data-page]');
    const genresDropdown = document.getElementById('genres-dropdown');

    function clearActive() {
      pageLinks.forEach(l => l.classList.remove('active'));
    }

    pageLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        clearActive();
        link.classList.add('active');
      });
    });

    // When a genre is selected, remove the active rectangle from page links.
    if (genresDropdown) {
      genresDropdown.addEventListener('click', (e) => {
        const a = e.target.closest('a');
        if (!a) return;
        clearActive();
      });
    }

    // Only set the active indicator when a ?page= query param is present.
    // This prevents showing the rectangle on routes like the landing (navbar-brand) or /login.
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

   if (pageParam) {
      const currentLink = document.querySelector(`.nav-link[data-page="${pageParam}"]`);
      if (currentLink) {
        clearActive();
        currentLink.classList.add('active');
      }
    } else if (location.pathname === '/' || location.pathname === '/index' || location.pathname === '/index.html') {
      // Default to Now Showing on index page
      const nowShowingLink = document.querySelector('.nav-link[data-page="now"]');
      if (nowShowingLink) {
        clearActive();
        nowShowingLink.classList.add('active');
      }
    } else {
      // no page param and not on index -> ensure no page-link is active (landing / login / other pages)
      clearActive();
    }

    // highlight Login when we're on the login page (keeps other behavior unchanged)
    if (location.pathname && location.pathname.toLowerCase().startsWith('/login')) {
      const loginLink = Array.from(document.querySelectorAll('.nav-link')).find(l => {
        const href = l.getAttribute('href');
        if (!href) return false;
        try {
          const url = new URL(href, location.origin);
          return url.pathname.toLowerCase().startsWith('/login');
        } catch (e) {
          return false;
        }
      });
      if (loginLink) loginLink.classList.add('active');
    }
  })();