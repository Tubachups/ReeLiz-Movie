import secrets
import threading
import os
import api
import auth
import database
from livereload import Server
from dotenv import load_dotenv
from flask import Flask, jsonify, redirect, render_template, session, url_for

load_dotenv()

app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", secrets.token_hex(32))
app.debug = False

database.init_app(app)
app.register_blueprint(api.api_bp)


@app.route("/")
def home():
    return render_template("pages/index.html", username=session.get("username"))


@app.route("/about")
def about():
    return render_template("pages/about.html", username=session.get("username"))


@app.route("/contact")
def contact():
    return render_template("pages/contact.html", username=session.get("username"))


@app.route("/landing")
def landing():
    return render_template("pages/landing.html", username=session.get("username"))


@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    try:
        movie_data = api.get_movie_details(movie_id)
        return render_template(
            "pages/detail.html",
            username=session.get("username"),
            email=session.get("email", "guest@reeliz.com"),
            **movie_data,
        )
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/login", methods=["GET", "POST"])
def login():
    return auth.login()


@app.route("/signup", methods=["GET", "POST"])
def signup():
    return auth.signup()


@app.route("/logout")
def logout():
    return auth.logout()


@app.route("/admin")
def admin_dashboard():
    if not session.get("is_admin"):
        return redirect(url_for("login"))
    return render_template("pages/admin.html")


def preload_movie_cache():
    def load_cache():
        try:
            print("[CACHE] Preloading movie data...")
            api.preload_cache()
            print("[CACHE] Preload complete")
        except Exception as error:
            print(f"[CACHE] Warning: preload failed: {error}")

    threading.Thread(target=load_cache, daemon=True).start()


if __name__ == "__main__":
    print("\n" + "=" * 50)
    print("  ReeLiz Movie Booking System")
    print("=" * 50)

    preload_movie_cache()

    print("Starting web server on http://127.0.0.1:5500")
    print("=" * 50 + "\n")

    server = Server(app.wsgi_app)
    server.serve(port=5500, debug=True)
