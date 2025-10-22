from flask import Flask, render_template, jsonify, request, redirect, url_for
from livereload import Server
from dotenv import load_dotenv
import api

load_dotenv()
app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.debug = True


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
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        remember = request.form.get('remember')
        
        # Add your login logic here
        # Authenticate user, create session, etc.
        
        return redirect(url_for('landing'))
    
    return render_template('pages/login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Add your signup logic here
        # Validate passwords match, create user account, etc.
        
        return redirect(url_for('pages/login'))
    
    return render_template('pages/signup.html')


if __name__ == "__main__":
    server = Server(app.wsgi_app)
    server.serve(port=5500, host="127.0.0.1")