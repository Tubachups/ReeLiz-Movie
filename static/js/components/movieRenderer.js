// SHOW MOVIES ON SCREEN

import { formatDate } from '../utils/dateUtils.js';

export function renderMovies(movies, genresMap) {
  const container = document.querySelector("#movies");
  container.innerHTML = "";

  movies.forEach((movie) => {
    const movieCard = createMovieCard(movie, genresMap);
    container.append(movieCard);
  });
}

function createMovieCard(movie, genresMap) {
  const movieCard = document.createElement("div");
  movieCard.className = "movie-card";

  const imgLink = document.createElement("a");
  imgLink.href = `/movie/${movie.id}`;

  const imgWrapper = document.createElement("div");
  imgWrapper.className = "movie-img-wrapper";

  const img = document.createElement("img");
  img.src = `https://image.tmdb.org/t/p/w500${movie.poster_path}`;
  img.alt = movie.title;

  const overlay = createMovieOverlay(movie, genresMap);

  imgWrapper.append(img, overlay);
  imgLink.append(imgWrapper);
  movieCard.append(imgLink);

  return movieCard;
}

function createMovieOverlay(movie, genresMap) {
  const overlay = document.createElement("div");
  overlay.className = "movie-overlay";

  const genreDiv = document.createElement("div");
  genreDiv.className = "movie-genre";
  const genreNames = movie.genre_ids
    .map((id) => genresMap[id])
    .filter(Boolean);
  genreDiv.innerText = `Genre: ${genreNames.join(", ") || "N/A"}`;

  const title = document.createElement("div");
  title.className = "movie-title";
  title.innerText = movie.title;

  const release = document.createElement("div");
  release.className = "movie-date";
  release.innerText = formatDate(movie.release_date);

  const bottomRow = document.createElement("div");
  bottomRow.className = "bottom-row";
  bottomRow.append(release);

  overlay.append(genreDiv, title, bottomRow);
  return overlay;
}