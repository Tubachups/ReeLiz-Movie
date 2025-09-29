from flask import Flask, render_template, jsonify
from datetime import datetime, timedelta
import requests
import time
import os

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True

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
            return data
    
    # Fetch new data
    data = fetch_function()
    cache[cache_key] = (data, current_time)
    return data

# ...existing routes...

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
            response = requests.get(url)
            return response.json()
        
        result = get_cached_or_fetch("genres", fetch_genres)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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
                
            response = requests.get(url, timeout=10)
            return response.json()
        
        cache_key = f"movies_{movie_type}"
        result = get_cached_or_fetch(cache_key, fetch_movies)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
    response = requests.get(url)
    movie = response.json()
    return render_template("pages/detail.html", movie=movie)

if __name__ == "__main__":
    # Only run with livereload in development
    if os.getenv('FLASK_ENV') == 'development':
        from livereload import Server
        server = Server(app.wsgi_app)
        server.serve(port=5500, host="127.0.0.1")
    else:
        app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)))