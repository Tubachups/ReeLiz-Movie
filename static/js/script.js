const API_KEY = "da871154a03a2fefab890a14eaba1b4a";
const BASE_URL = "https://api.themoviedb.org/3";

function getTodayDate() {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

function getFutureDate(monthsAhead) {
  const today = new Date();
  today.setMonth(today.getMonth() + monthsAhead);
  return today.toISOString().split("T")[0];
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

    const img = document.createElement("img");
    img.setAttribute("src", `https://image.tmdb.org/t/p/w500${movie.poster_path}`);
    img.setAttribute("alt", movie.title);

    const title = document.createElement("div");
    title.setAttribute("class", "movie-title");
    title.innerText = movie.title;

    const release = document.createElement("div");
    release.setAttribute("class", "movie-date");
    release.innerText = `Release Date: ${formatDate(movie.release_date)}`;

    movieCard.append(img, title, release);
    moviesContainer.appendChild(movieCard);
  });
}

document.querySelector("#btn-now").addEventListener("click", () => fetchMovies("now"));
document.querySelector("#btn-coming").addEventListener("click", () => fetchMovies("coming"));

fetchMovies("now");
