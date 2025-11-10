import os
import requests
import time
from datetime import datetime, timedelta
from flask import jsonify
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("TMDB_API_KEY")
if not API_KEY:
    raise ValueError("TMDB_API_KEY environment variable is not set")
BASE_URL = "https://api.themoviedb.org/3"
cache = {}
CACHE_DURATION = 300


def get_cached_or_fetch(cache_key, fetch_function):
    current_time = time.time()
    if cache_key in cache:
        data, timestamp = cache[cache_key]
        if current_time - timestamp < CACHE_DURATION:
            return data
    # Fetch new data
    data = fetch_function()
    cache[cache_key] = (data, current_time)
    return data


def get_genres():
    try:
        def fetch_genres():
            url = f"{BASE_URL}/genre/movie/list?api_key={API_KEY}&language=en-US"
            response = requests.get(url)
            return response.json()

        result = get_cached_or_fetch("genres", fetch_genres)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_movie_schedule(movie_index):
    """
    Generate schedule for a movie based on its index (0-7)
    Movies 0-3: Group A (Mon, Wed, Fri, Sun) - MWF pattern
    Movies 4-7: Group B (Tue, Thu, Sat) - TTS pattern
    Each movie shows twice per day across Cinema 1 and Cinema 2
    
    Time slot assignment to prevent conflicts:
    - Movie 0: 10:00 AM (Cinema 1), 1:00 PM (Cinema 2)
    - Movie 1: 1:00 PM (Cinema 1), 4:00 PM (Cinema 2)
    - Movie 2: 4:00 PM (Cinema 1), 7:00 PM (Cinema 2)
    - Movie 3: 7:00 PM (Cinema 1), 10:00 AM (Cinema 2)
    - Movie 4-7: Same pattern for different days
    """
    # Time slots: 10:00 AM, 1:00 PM, 4:00 PM, 7:00 PM
    time_slots = ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM"]
    
    # Determine which group this movie belongs to
    if movie_index < 4:
        # Group A: Monday(1), Wednesday(3), Friday(5), Sunday(0)
        allowed_weekdays = [1, 3, 5, 0]
        # Each movie gets unique time slots
        # Movie 0: slots 0,1 (10AM, 1PM)
        # Movie 1: slots 1,2 (1PM, 4PM)
        # Movie 2: slots 2,3 (4PM, 7PM)
        # Movie 3: slots 3,0 (7PM, 10AM)
        slot1_index = movie_index % 4
        slot2_index = (movie_index + 1) % 4
    else:
        # Group B: Tuesday(2), Thursday(4), Saturday(6)
        allowed_weekdays = [2, 4, 6]
        # Movies 4-7 use the same time slot pattern as 0-3
        adjusted_index = movie_index - 4
        slot1_index = adjusted_index % 4
        slot2_index = (adjusted_index + 1) % 4
    
    return {
        "allowed_weekdays": allowed_weekdays,
        "time_slots": [time_slots[slot1_index], time_slots[slot2_index]],
        "all_times": time_slots  # All available times for display
    }


def has_complete_details(movie_id):
    """
    Check if a movie has complete details (cast, directors, producers, writers, certification)
    """
    try:
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"
        
        credits = requests.get(credits_url, timeout=10).json()
        releases = requests.get(release_url, timeout=10).json()
        
        # Check cast (at least 1 cast member)
        cast = credits.get("cast", [])
        if not cast or len(cast) == 0:
            return False
        
        # Check directors (at least 1)
        directors = [crew for crew in credits.get("crew", []) if crew.get("job") == "Director"]
        if not directors or len(directors) == 0:
            return False
        
        # Check producers (at least 1)
        producers = [crew for crew in credits.get("crew", []) if crew.get("job") == "Producer"]
        if not producers or len(producers) == 0:
            return False
        
        # Check writers (at least 1)
        writers = [crew for crew in credits.get("crew", []) if crew.get("job") in ["Writer", "Screenplay", "Story"]]
        if not writers or len(writers) == 0:
            return False
        
        # Check certification
        has_certification = False
        for country in releases.get("results", []):
            if country["iso_3166_1"] in ["PH", "US"]:
                for release in country.get("release_dates", []):
                    if release.get("certification"):
                        has_certification = True
                        break
                if has_certification:
                    break
        
        if not has_certification:
            return False
        
        return True
    except:
        return False


def get_movie_schedule_api(movie_id):
    """
    API endpoint to get schedule for a specific movie ID
    """
    try:
        cache_key = "movies_now"
        if cache_key in cache:
            cached_movies, _ = cache[cache_key]
            if "results" in cached_movies:
                for index, movie in enumerate(cached_movies["results"]):
                    if movie["id"] == movie_id:
                        schedule = get_movie_schedule(index)
                        return jsonify(schedule)
        return jsonify({"error": "Movie not found in current schedule"}), 404
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_movies(movie_type):
    try:
        def fetch_movies():
            today = datetime.now()
            # Date range: From 1st day of current month to 14th day of current month
            start_of_month = today.replace(day=1).strftime('%Y-%m-%d')
            fourteenth_day = today.replace(day=14).strftime('%Y-%m-%d')
            two_months_later = (today + timedelta(days=60)).strftime('%Y-%m-%d')
            
            if movie_type == "now":
                # For "now showing", fetch multiple pages to find 8 movies with complete details
                complete_movies = []
                page = 1
                max_pages = 10  # Increased to 10 pages to find more movies
                
                while len(complete_movies) < 8 and page <= max_pages:
                    url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page={page}"
                    url += f"&release_date.gte={start_of_month}&release_date.lte={fourteenth_day}"
                    url += "&sort_by=release_date.desc"
                    
                    response = requests.get(url, timeout=10)
                    data = response.json()
                    
                    if "results" in data and len(data["results"]) > 0:
                        for movie in data["results"]:
                            # Check if movie has poster and complete details
                            if movie.get("poster_path") is not None and has_complete_details(movie["id"]):
                                complete_movies.append(movie)
                                if len(complete_movies) >= 8:
                                    break
                    else:
                        break  # No more results
                    
                    page += 1
                
                # Add schedule information to each movie
                for index, movie in enumerate(complete_movies):
                    movie["schedule"] = get_movie_schedule(index)
                
                return {"results": complete_movies}
                
            elif movie_type == "coming":
                url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page=1"
                url += f"&release_date.gte={today.strftime('%Y-%m-%d')}&release_date.lte={two_months_later}"
                
                response = requests.get(url, timeout=10)
                data = response.json()
                
                # Filter out movies without poster images
                if "results" in data:
                    data["results"] = [
                        movie for movie in data["results"] 
                        if movie.get("poster_path") is not None
                    ]
                
                return data

        cache_key = f"movies_{movie_type}"
        result = get_cached_or_fetch(cache_key, fetch_movies)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_movie_details(movie_id):
    try:
        # Fetch movie details
        movie_url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"

        movie = requests.get(movie_url, timeout=10).json()
        credits = requests.get(credits_url, timeout=10).json()
        releases = requests.get(release_url, timeout=10).json()

        # Get certification (Age Rating)
        certification = "N/A"
        for country in releases.get("results", []):
            if country["iso_3166_1"] in ["PH", "US"]:
                for release in country.get("release_dates", []):
                    if release.get("certification"):
                        certification = release["certification"]
                        break
                if certification != "N/A":
                    break

        # Get cast (top 5)
        cast = [member["name"] for member in credits.get("cast", [])[:5]]
        
        # Get directors
        directors = [crew["name"] for crew in credits.get("crew", []) if crew.get("job") == "Director"]
        
        # Get producers
        producers = [crew["name"] for crew in credits.get("crew", []) if crew.get("job") == "Producer"][:3]
        
        # Get writers
        writers = [crew["name"] for crew in credits.get("crew", []) if crew.get("job") in ["Writer", "Screenplay", "Story"]][:3]

        # Get movie schedule from current "now showing" list
        schedule = None
        try:
            cache_key = "movies_now"
            if cache_key in cache:
                cached_movies, _ = cache[cache_key]
                if "results" in cached_movies:
                    for index, cached_movie in enumerate(cached_movies["results"]):
                        if cached_movie["id"] == movie_id:
                            schedule = get_movie_schedule(index)
                            break
        except:
            pass

        return {
            "movie": movie,
            "certification": certification,
            "cast": cast,
            "directors": directors,
            "producers": producers,
            "writers": writers,
            "schedule": schedule
        }
    except Exception as e:
        raise Exception(f"Error fetching movie details: {str(e)}")