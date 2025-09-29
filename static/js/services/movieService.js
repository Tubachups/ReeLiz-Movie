// GET MOVIES FROM BACKEND API

async function fetchGenres() {
  try {
    const response = await axios.get('/api/genres');
    return response.data.genres;
  } catch (err) {
    console.error("Error fetching genres:", err);
    return [];
  }
}

async function fetchMovies(type) {
  try {
    const response = await axios.get(`/api/movies/${type}`);
    return response.data.results;
  } catch (err) {
    console.error("Error fetching movies:", err);
    return [];
  }
}

export { fetchGenres, fetchMovies };