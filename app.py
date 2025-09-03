from flask import Flask, render_template
import requests

app = Flask(__name__)

API_KEY = "da871154a03a2fefab890a14eaba1b4a"
BASE_URL = "https://api.themoviedb.org/3"

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/about")
def about():
    return render_template("about.html")

@app.route("/contact")
def contact():
    return render_template("contact.html")


@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
    response = requests.get(url)
    movie = response.json()
    return render_template("detail.html", movie=movie)

if __name__ == "__main__":
    app.run(debug=True)
