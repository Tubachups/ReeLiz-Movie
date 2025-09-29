from flask import Flask, render_template, jsonify
from datetime import datetime, timedelta
import requests
import time
import os
import logging

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Use environment variable for debug mode
app.debug = os.getenv('FLASK_ENV') == 'development'

API_KEY = "da871154a03a2fefab890a14eaba1b4a"
BASE_URL = "https://api.themoviedb.org/3"

cache = {}
CACHE_DURATION = 300

def get_cached_or_fetch(cache_key, fetch_function):
    current_time = time.time()
    
    if cache_key in cache:
        data, timestamp = cache[cache_key]
        if current_time - timestamp < CACHE_DURATION:
            logger.info(f"Returning cached data for {cache_key}")
            return data
    
    # Fetch new data
    logger.info(f"Fetching new data for {cache_key}")
    data = fetch_function()
    cache[cache_key] = (data, current_time)
    return data

@app.route("/")
def home():
    return render_template("pages/index.html")

@app.route("/about")
def about():
    return render_template("pages/about.html")

@app.route("/contact")
def contact():
    return render_template("pages/contact.html")

@app.route("/landing")
def landing():
    return render_template("pages/landing.html")

@app.route("/api/genres")
def get_genres():
    try:
        def fetch_genres():
            url = f"{BASE_URL}/genre/movie/list?api_key={API_KEY}&language=en-US"
            logger.info(f"Fetching genres from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Genres fetched successfully: {len(data.get('genres', []))} genres")
            return data
        
        result = get_cached_or_fetch("genres", fetch_genres)
        return jsonify(result)
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error in get_genres: {str(e)}")
        return jsonify({"error": f"Request failed: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get_genres: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/api/movies/<movie_type>")
def get_movies(movie_type):
    try:
        def fetch_movies():
            today = datetime.now().strftime('%Y-%m-%d')
            two_months_later = (datetime.now() + timedelta(days=60)).strftime('%Y-%m-%d')
            
            url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page=1"
            
            if movie_type == "now":
                url += f"&release_date.lte={today}"
            elif movie_type == "coming":
                url += f"&release_date.gte={today}&release_date.lte={two_months_later}"
            
            logger.info(f"Fetching {movie_type} movies from: {url}")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            data = response.json()
            logger.info(f"Movies fetched successfully: {len(data.get('results', []))} movies")
            return data
        
        cache_key = f"movies_{movie_type}"
        result = get_cached_or_fetch(cache_key, fetch_movies)
        return jsonify(result)
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error in get_movies: {str(e)}")
        return jsonify({"error": f"Request failed: {str(e)}"}), 500
    except Exception as e:
        logger.error(f"Unexpected error in get_movies: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    try:
        url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
        logger.info(f"Fetching movie detail from: {url}")
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        movie = response.json()
        logger.info(f"Movie detail fetched successfully: {movie.get('title', 'Unknown')}")
        return render_template("pages/detail.html", movie=movie)
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error in movie_detail: {str(e)}")
        return render_template("pages/detail.html", movie={"error": f"Failed to load movie: {str(e)}"})
    except Exception as e:
        logger.error(f"Unexpected error in movie_detail: {str(e)}")
        return render_template("pages/detail.html", movie={"error": f"Server error: {str(e)}"})

# Add a test endpoint to check if API is working
@app.route("/api/test")
def test_api():
    try:
        url = f"{BASE_URL}/genre/movie/list?api_key={API_KEY}&language=en-US"
        response = requests.get(url, timeout=10)
        return jsonify({
            "status": "success",
            "status_code": response.status_code,
            "api_key_length": len(API_KEY),
            "base_url": BASE_URL,
            "response_size": len(response.text)
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "error": str(e),
            "api_key_length": len(API_KEY),
            "base_url": BASE_URL
        })

if __name__ == "__main__":
    # Only run with livereload in development
    if os.getenv('FLASK_ENV') == 'development':
        from livereload import Server
        server = Server(app.wsgi_app)
        server.serve(port=5500, host="127.0.0.1")
    else:
        app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))