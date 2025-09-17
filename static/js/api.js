const API_KEY = "da871154a03a2fefab890a14eaba1b4a";
const BASE_URL = "https://api.themoviedb.org/3";

let genresMap = {};
let allMovies = []; // store currently displayed movies

document.querySelectorAll("[data-page]").forEach(link => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const page = link.dataset.page;
    fetchMovies(page);
  });
});

// // Genres dropdown toggle
// const genresBtn = document.querySelector("#btn-genres");
// const genresDropdown = document.querySelector("#genres-dropdown");

// genresBtn.addEventListener("click", (e) => {
//   e.preventDefault();
//   genresDropdown.classList.toggle("show"); // toggle visibility
// });

init();

async function init() {
  // await fetchGenres();
  await fetchMovies("now");
}

// Fetch genres and populate dropdown
async function fetchGenres() {
  try {
    const response = await axios.get(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`);
    const genres = response.data.genres;

    genresMap = genres.reduce((map, g) => { map[g.id] = g.name; return map; }, {});

    genresDropdown.innerHTML = "";
    genres.forEach(genre => {
      const a = document.createElement("a");
      a.href = "#";
      a.innerText = genre.name;
      a.dataset.genreId = genre.id;

      // Filter movies by genre on click
      a.addEventListener("click", (e) => {
        e.preventDefault();
        filterMoviesByGenre(genre.id);
        genresDropdown.classList.remove("show"); // close dropdown
      });

      genresDropdown.appendChild(a);
    });
  } catch (err) {
    console.error("Error fetching genres:", err);
  }
}

// Fetch movies from API
async function fetchMovies(type) {
  const today = new Date().toISOString().split("T")[0];
  const twoMonthsLater = new Date();
  twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=PH&with_release_type=2|3`;

  if (type === "now") url += `&release_date.lte=${today}`;
  if (type === "coming") url += `&release_date.gte=${today}&release_date.lte=${twoMonthsLater.toISOString().split("T")[0]}`;

  try {
    const response = await axios.get(url);
    allMovies = response.data.results; // store current movies
    renderMovies(allMovies);
  } catch (err) {
    console.error("Error fetching movies:", err);
  }
}

// Render movies on page
function renderMovies(movies) {
  const container = document.querySelector("#movies");
  container.innerHTML = "";

  movies.forEach(movie => {
    const movieCard = document.createElement("div");
    movieCard.className = "movie-card";

    const imgLink = document.createElement("a");
    imgLink.href = `/movie/${movie.id}`;

    const imgWrapper = document.createElement("div");
    imgWrapper.className = "movie-img-wrapper";

    const img = document.createElement("img");
    img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
    img.alt = movie.title;

    const overlay = document.createElement("div");
    overlay.className = "movie-overlay";

    const genreDiv = document.createElement("div");
    genreDiv.className = "movie-genre";
    const genreNames = movie.genre_ids.map(id => genresMap[id]).filter(Boolean);
    genreDiv.innerText = `Genre: ${genreNames.join(", ") || "N/A"}`;

    const title = document.createElement("div");
    title.className = "movie-title";
    title.innerText = movie.title;

    const release = document.createElement("div");
    release.className = "movie-date";
    release.innerText = new Date(movie.release_date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const bottomRow = document.createElement("div");
    bottomRow.className = "bottom-row";
    bottomRow.append(release);

    overlay.append(genreDiv, title, bottomRow);
    imgWrapper.append(img, overlay);
    imgLink.append(imgWrapper);
    movieCard.append(imgLink);
    container.append(movieCard);
  });
}

// Filter rendered movies by genre
function filterMoviesByGenre(genreId) {
  const filtered = allMovies.filter(movie => movie.genre_ids.includes(parseInt(genreId)));
  renderMovies(filtered);
}



function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFutureDate(monthsAhead) {
  const today = new Date();
  today.setMonth(today.getMonth() + monthsAhead);
  return today.toISOString().split("T")[0];
}


