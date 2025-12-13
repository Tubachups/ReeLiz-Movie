import os
import requests
import time
from datetime import datetime, timedelta
from flask import jsonify
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed

load_dotenv()

API_KEY = os.getenv("TMDB_API_KEY")
if not API_KEY:
    raise ValueError("TMDB_API_KEY environment variable is not set")
BASE_URL = "https://api.themoviedb.org/3"
cache = {}
CACHE_DURATION = 3600  # Increased to 1 hour (was 5 minutes) - movies don't change often

# Create a session for connection pooling (reuses connections)
session = requests.Session()


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
            response = session.get(url, timeout=10)
            return response.json()

        result = get_cached_or_fetch("genres", fetch_genres)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_movie_schedule(movie_index):
    """
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
    Uses caching to avoid repeated API calls for the same movie
    """
    # Check cache first
    cache_key = f"movie_details_check_{movie_id}"
    if cache_key in cache:
        result, timestamp = cache[cache_key]
        if time.time() - timestamp < CACHE_DURATION:
            return result
    
    try:
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"
        
        # Use session for connection pooling
        credits = session.get(credits_url, timeout=5).json()
        releases = session.get(release_url, timeout=5).json()
        
        # Check cast (at least 1 cast member)
        cast = credits.get("cast", [])
        if not cast or len(cast) == 0:
            cache[cache_key] = (False, time.time())
            return False
        
        # Check directors (at least 1)
        directors = [crew for crew in credits.get("crew", []) if crew.get("job") == "Director"]
        if not directors or len(directors) == 0:
            cache[cache_key] = (False, time.time())
            return False
        
        # Check producers (at least 1)
        producers = [crew for crew in credits.get("crew", []) if crew.get("job") == "Producer"]
        if not producers or len(producers) == 0:
            cache[cache_key] = (False, time.time())
            return False
        
        # Check writers (at least 1)
        writers = [crew for crew in credits.get("crew", []) if crew.get("job") in ["Writer", "Screenplay", "Story"]]
        if not writers or len(writers) == 0:
            cache[cache_key] = (False, time.time())
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
            cache[cache_key] = (False, time.time())
            return False
        
        cache[cache_key] = (True, time.time())
        return True
    except:
        cache[cache_key] = (False, time.time())
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
            # Date range: From 30 days ago to 14th day of current month (wider range for more movies)
            thirty_days_ago = (today - timedelta(days=30)).strftime('%Y-%m-%d')
            fourteenth_day = today.replace(day=14).strftime('%Y-%m-%d') if today.day <= 14 else today.strftime('%Y-%m-%d')
            two_months_later = (today + timedelta(days=60)).strftime('%Y-%m-%d')
            
            if movie_type == "now":
                # For "now showing", fetch movies in batches and validate in parallel
                complete_movies = []
                page = 1
                max_pages = 10
                
                while len(complete_movies) < 8 and page <= max_pages:
                    url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page={page}"
                    url += f"&release_date.gte={thirty_days_ago}&release_date.lte={fourteenth_day}"
                    url += "&sort_by=release_date.desc"
                    
                    response = session.get(url, timeout=10)
                    data = response.json()
                    
                    if "results" in data and len(data["results"]) > 0:
                        # Filter movies with posters first (fast check)
                        candidates = [m for m in data["results"] if m.get("poster_path")]
                        
                        # Validate movies in parallel using ThreadPoolExecutor
                        def check_movie(movie):
                            if has_complete_details(movie["id"]):
                                return movie
                            return None
                        
                        with ThreadPoolExecutor(max_workers=5) as executor:
                            futures = {executor.submit(check_movie, m): m for m in candidates}
                            for future in as_completed(futures):
                                result = future.result()
                                if result and len(complete_movies) < 8:
                                    complete_movies.append(result)
                    else:
                        break  # No more results
                    
                    page += 1
                    
                    # Stop if we have enough movies
                    if len(complete_movies) >= 8:
                        break
                
                # Sort by release date descending and limit to 8
                complete_movies = sorted(complete_movies, key=lambda x: x.get('release_date', ''), reverse=True)[:8]
                
                # Add schedule information to each movie and mark as now showing
                for index, movie in enumerate(complete_movies):
                    movie["schedule"] = get_movie_schedule(index)
                    movie["is_now_showing"] = True
                
                return {"results": complete_movies}
                
            elif movie_type == "coming":
                # Get the list of "now showing" movie IDs to exclude them
                now_showing_cache_key = "movies_now"
                now_showing_ids = []
                if now_showing_cache_key in cache:
                    cached_now, _ = cache[now_showing_cache_key]
                    if "results" in cached_now:
                        now_showing_ids = [m["id"] for m in cached_now["results"]]
                
                # For "coming soon", start from tomorrow to get upcoming movies
                tomorrow = (today + timedelta(days=1)).strftime('%Y-%m-%d')
                url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page=1"
                url += f"&release_date.gte={tomorrow}&release_date.lte={two_months_later}"
                
                response = session.get(url, timeout=10)
                data = response.json()
                
                # Filter out movies without poster images and movies already in "now showing"
                if "results" in data:
                    data["results"] = [
                        movie for movie in data["results"] 
                        if movie.get("poster_path") is not None and movie["id"] not in now_showing_ids
                    ]
                    # Mark all coming soon movies
                    for movie in data["results"]:
                        movie["is_now_showing"] = False
                
                return data

        cache_key = f"movies_{movie_type}"
        result = get_cached_or_fetch(cache_key, fetch_movies)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


def get_movie_details(movie_id):
    try:
        # Check cache first for movie details
        cache_key = f"movie_detail_{movie_id}"
        if cache_key in cache:
            cached_data, timestamp = cache[cache_key]
            if time.time() - timestamp < CACHE_DURATION:
                return cached_data
        
        # Fetch movie details in parallel using ThreadPoolExecutor
        movie_url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"

        def fetch_url(url):
            return session.get(url, timeout=10).json()
        
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_movie = executor.submit(fetch_url, movie_url)
            future_credits = executor.submit(fetch_url, credits_url)
            future_releases = executor.submit(fetch_url, release_url)
            
            movie = future_movie.result()
            credits = future_credits.result()
            releases = future_releases.result()

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

        # Get movie schedule from current "now showing" list and check if it's now showing
        schedule = None
        is_now_showing = False
        cached_release_date = None  # Store the release date from the movie list (more accurate for PH)
        try:
            now_cache_key = "movies_now"
            if now_cache_key in cache:
                cached_movies, _ = cache[now_cache_key]
                if "results" in cached_movies:
                    for index, cached_movie in enumerate(cached_movies["results"]):
                        if cached_movie["id"] == movie_id:
                            schedule = get_movie_schedule(index)
                            is_now_showing = True
                            # Get the release date from the cached movie list (this matches the thumbnail)
                            cached_release_date = cached_movie.get("release_date")
                            break
        except:
            pass

        # Use the cached release date (from discover API) if available, as it's more accurate for PH
        # Otherwise fall back to the movie details API release date
        raw_release_date = cached_release_date or movie.get("release_date", "")
        if raw_release_date:
            try:
                release_date_obj = datetime.strptime(raw_release_date, "%Y-%m-%d")
                movie["release_date"] = release_date_obj.strftime("%B %d, %Y")
            except:
                pass  # Keep original if parsing fails

        result_data = {
            "movie": movie,
            "certification": certification,
            "cast": cast,
            "directors": directors,
            "producers": producers,
            "writers": writers,
            "schedule": schedule,
            "is_now_showing": is_now_showing
        }
        
        # Cache the result
        cache[f"movie_detail_{movie_id}"] = (result_data, time.time())
        
        return result_data
    except Exception as e:
        raise Exception(f"Error fetching movie details: {str(e)}")