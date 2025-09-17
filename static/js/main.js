import { fetchGenres, fetchMovies } from './services/movieService.js';
import { renderMovies } from './components/movieRenderer.js';

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
  setupGenresDropdown(genres);
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

function setupGenresDropdown(genres) {
  const genresDropdown = document.querySelector("#genres-dropdown");
  if (!genresDropdown) return;

  genresDropdown.classList.add('columns-2');
  genresDropdown.innerHTML = '';

  const gridContainer = document.createElement('div');
  gridContainer.className = 'genres-grid';

  addAllGenresOption(gridContainer);
  addGenreOptions(gridContainer, genres);

  genresDropdown.appendChild(gridContainer);
}

function addAllGenresOption(container) {
  const allGenresLi = document.createElement('div');
  const allGenresLink = document.createElement('a');
  allGenresLink.className = 'dropdown-item';
  allGenresLink.href = '#';
  allGenresLink.innerText = 'All Genres';
  allGenresLink.addEventListener('click', (e) => {
    e.preventDefault();
    renderMovies(allMovies, genresMap);
    updateActiveGenre(allGenresLink);
  });
  allGenresLi.appendChild(allGenresLink);
  container.appendChild(allGenresLi);
}

function addGenreOptions(container, genres) {
  genres.forEach((genre) => {
    const genreItem = document.createElement('div');
    const genreLink = document.createElement('a');
    genreLink.className = 'dropdown-item';
    genreLink.href = '#';
    genreLink.innerText = genre.name;

    genreLink.addEventListener('click', (e) => {
      e.preventDefault();
      filterMoviesByGenre(genre.id);
      updateActiveGenre(genreLink);
    });

    genreItem.appendChild(genreLink);
    container.appendChild(genreItem);
  });
}

function updateActiveGenre(activeLink) {
  document.querySelectorAll('#genres-dropdown .dropdown-item')
    .forEach(item => item.classList.remove('active'));
  activeLink.classList.add('active');
}

init();