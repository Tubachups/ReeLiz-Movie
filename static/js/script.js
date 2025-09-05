const API_KEY = "da871154a03a2fefab890a14eaba1b4a";
const BASE_URL = "https://api.themoviedb.org/3";

let genresMap = {};

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
}

function getFutureDate(monthsAhead) {
  const today = new Date();
  today.setMonth(today.getMonth() + monthsAhead);
  return today.toISOString().split("T")[0];
}

async function fetchGenres() {
  try {
    const response = await fetch(`${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`);
    const data = await response.json();
    genresMap = data.genres.reduce((map, genre) => {
      map[genre.id] = genre.name;
      return map;
    }, {});
  } catch (error) {
    console.error("Error fetching genres:", error);
  }
}

async function fetchMovies(type) {
  const today = getTodayDate();
  const twoMonthsLater = getFutureDate(2);

  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=PH&with_release_type=2|3`;

  if (type === "now") {
    url += `&release_date.lte=${today}`;
  } else if (type === "coming") {
    url += `&release_date.gte=${today}&release_date.lte=${twoMonthsLater}`;
  }

  try {
    const response = await fetch(url);
    const data = await response.json();
    renderMovies(data.results);
  } catch (error) {
    console.error("Error fetching movies:", error);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function renderMovies(movies) {
  const moviesContainer = document.querySelector("#movies");
  moviesContainer.innerHTML = "";

  movies.forEach(movie => {
    const movieCard = document.createElement("div");
    movieCard.setAttribute("class", "movie-card");

    const imgLink = document.createElement("a");
    imgLink.setAttribute("href", `/movie/${movie.id}`);

    const imgWrapper = document.createElement("div");
    imgWrapper.setAttribute("class", "movie-img-wrapper");

    const img = document.createElement("img");
    img.setAttribute("src", `https://image.tmdb.org/t/p/w500${movie.poster_path}`);
    img.setAttribute("alt", movie.title);

    const overlay = document.createElement("div");
    overlay.setAttribute("class", "movie-overlay");

    const genreDiv = document.createElement("div");
    genreDiv.setAttribute("class", "movie-genre");
    const genreNames = movie.genre_ids.map(id => genresMap[id]).filter(Boolean);
    genreDiv.innerText = `Genre: ${genreNames.join(", ") || "N/A"}`;

    const title = document.createElement("div");
    title.setAttribute("class", "movie-title");
    title.innerText = movie.title;

    const release = document.createElement("div");
    release.setAttribute("class", "movie-date");
    release.innerText = formatDate(movie.release_date);

    const showBtn = document.createElement("button");
    showBtn.setAttribute("class", "show-btn");
    showBtn.innerText = "Show";

    const bottomRow = document.createElement("div");
    bottomRow.setAttribute("class", "bottom-row");
    bottomRow.append(showBtn, release);

    overlay.append(genreDiv, title, bottomRow);
    imgWrapper.append(img, overlay);
    imgLink.append(imgWrapper);
    movieCard.append(imgLink);
    moviesContainer.append(movieCard);
  });
}

document.querySelector("#btn-now").addEventListener("click", () => fetchMovies("now"));
document.querySelector("#btn-coming").addEventListener("click", () => fetchMovies("coming"));

(async function init() {
  await fetchGenres();
  fetchMovies("now");
})();

document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const dropdown = document.querySelector(".dropdown");

  if (hamburger && dropdown) {
    hamburger.addEventListener("click", () => {
      dropdown.classList.toggle("show");
    });

    // Optional: close dropdown when clicking outside
    document.addEventListener("click", (e) => {
      if (!hamburger.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove("show");
      }
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const btnNow = document.querySelector("#btn-now");
  const btnComing = document.querySelector("#btn-coming");
  const homeLink = document.querySelector(".nav-center a[data-page='home']");
  const nowLink = document.querySelector(".nav-center a[data-page='now']");
  const comingLink = document.querySelector(".nav-center a[data-page='coming']");

  if (btnNow) {
    btnNow.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.querySelector("#movies")) {
        fetchMovies("now");
      } else {
        window.location.href = "{{ url_for('home') }}";
      }
    });
  }

  if (btnComing) {
    btnComing.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.querySelector("#movies")) {
        fetchMovies("coming");
      } else {
        window.location.href = "{{ url_for('home') }}";
      }
    });
  }

  if (homeLink) {
    homeLink.addEventListener("click", (e) => {
      e.preventDefault();
      window.location.href = "{{ url_for('home') }}";
    });
  }

  if (nowLink) {
    nowLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.querySelector("#movies")) {
        fetchMovies("now");
      } else {
        window.location.href = "{{ url_for('home') }}";
      }
    });
  }

  if (comingLink) {
    comingLink.addEventListener("click", (e) => {
      e.preventDefault();
      if (document.querySelector("#movies")) {
        fetchMovies("coming");
      } else {
        window.location.href = "{{ url_for('home') }}";
      }
    });
  }
});





