// GET MOVIES FROM BACKEND API

async function fetchGenres() {
  try {
    const response = await fetch('/api/genres');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.genres || [];
  } catch (err) {
    console.error("Error fetching genres:", err);
    return [];
  }
}

async function fetchMovies(type) {
  try {
    const response = await fetch(`/api/movies/${type}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (err) {
    console.error("Error fetching movies:", err);
    return [];
  }
}

export { fetchGenres, fetchMovies };