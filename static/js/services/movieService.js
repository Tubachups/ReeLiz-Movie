// GET MOVIES FROM API

import { API_KEY, BASE_URL } from "../api/config.js";
import { getTodayDate, getFutureDate } from "../utils/dateUtils.js";

async function fetchGenres() {
  try {
    const response = await axios.get(
      `${BASE_URL}/genre/movie/list?api_key=${API_KEY}&language=en-US`
    );
    return response.data.genres;
  } catch (err) {
    console.error("Error fetching genres:", err);
    return [];
  }
}

async function fetchMovies(type) {
  const today = getTodayDate();
  const twoMonthsLater = getFutureDate(2)

  let url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&language=en-US&region=PH&with_release_type=2|3`;

  if (type === "now") url += `&release_date.lte=${today}`;
  if (type === "coming")
    url += `&release_date.gte=${today}&release_date.lte=${
      twoMonthsLater
    }`;

  try {
    const response = await axios.get(url);
    return response.data.results;
  } catch (err) {
    console.error("Error fetching movies:", err);
    return [];
  }
}

export { fetchGenres, fetchMovies };
