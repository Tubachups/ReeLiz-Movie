from flask import Flask, render_template, jsonify, session
from livereload import Server
from dotenv import load_dotenv
import api
import auth
import os

load_dotenv()
app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "your-secret-key-here")  # Add to .env file
app.debug = True

@app.route("/")
def home():
    username = session.get('username')
    return render_template("pages/index.html", username=username)


@app.route("/about")
def about():
    username = session.get('username')
    return render_template("pages/about.html", username=username)


@app.route("/contact")
def contact():
    username = session.get('username')
    return render_template("pages/contact.html", username=username)


@app.route("/landing")
def landing():
    username = session.get('username')
    return render_template("pages/landing.html", username=username)


@app.route("/api/genres")
def genres_route():
    return api.get_genres()


@app.route("/api/movies/<movie_type>")
def movies_route(movie_type):
    return api.get_movies(movie_type)


@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    try:
        movie_data = api.get_movie_details(movie_id)
        return render_template("pages/detail.html", **movie_data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/login', methods=['GET', 'POST'])
def login():
    return auth.login()
    

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    return auth.signup()

@app.route('/logout')
def logout():
    return auth.logout()

if __name__ == "__main__":
    server = Server(app.wsgi_app)
    server.serve(port=5500, host="127.0.0.1")