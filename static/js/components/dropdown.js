function updateActiveGenre(activeLink) {
  document
    .querySelectorAll("#genres-dropdown .dropdown-item")
    .forEach((item) => item.classList.remove("active"));
  activeLink.classList.add("active");
}

function addAllGenresOption(container, onShowAll) {
  const allGenresLi = document.createElement("div");
  const allGenresLink = document.createElement("a");
  allGenresLink.className = "dropdown-item";
  allGenresLink.href = "#";
  allGenresLink.innerText = "All Genres";
  allGenresLink.addEventListener("click", (e) => {
    e.preventDefault();
    onShowAll();
    updateActiveGenre(allGenresLink);
  });
  allGenresLi.appendChild(allGenresLink);
  container.appendChild(allGenresLi);
}

function addGenreOptions(container, genres, onGenreSelect) {
  genres.forEach((genre) => {
    const genreItem = document.createElement("div");
    const genreLink = document.createElement("a");
    genreLink.className = "dropdown-item";
    genreLink.href = "#";
    genreLink.innerText = genre.name;

    genreLink.addEventListener("click", (e) => {
      e.preventDefault();
      onGenreSelect(genre.id);
      updateActiveGenre(genreLink);
    });

    genreItem.appendChild(genreLink);
    container.appendChild(genreItem);
  });
}

export function setupGenresDropdown(genres, onGenreSelect, onShowAll) {
  const genresDropdown = document.querySelector("#genres-dropdown");
  if (!genresDropdown) return;

  genresDropdown.classList.add("columns-2");
  genresDropdown.innerHTML = "";

  const gridContainer = document.createElement("div");
  gridContainer.className = "genres-grid";

  addAllGenresOption(gridContainer, onShowAll);
  addGenreOptions(gridContainer, genres, onGenreSelect);

  genresDropdown.appendChild(gridContainer);
}