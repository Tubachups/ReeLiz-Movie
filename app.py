from flask import Flask, render_template, jsonify, request, redirect, url_for, session
from livereload import Server
from dotenv import load_dotenv
import api
import subprocess
import os
import json

load_dotenv()
app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "your-secret-key-here")  # Add to .env file
app.debug = True

def run_php_script(script_path, args=None):
    try:
        # Path to XAMPP PHP executable (adjust if your XAMPP is installed elsewhere)
        php_path = r'C:\xampp\php\php.exe'
        
        # Make script path absolute if it's relative
        if not os.path.isabs(script_path):
            script_path = os.path.join(os.path.dirname(__file__), script_path)
        
        cmd = [php_path, script_path]
        if args:
            cmd.extend(args)
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        return f"Error: {e.stderr}"
    except subprocess.TimeoutExpired:
        return "Error: PHP script timed out"
    except FileNotFoundError:
        return "Error: PHP not found. Make sure XAMPP is installed at C:\\xampp"


@app.route('/run-php')
def run_php_example():
    """Example route that executes a PHP script"""
    output = run_php_script('test.php')
    return jsonify({"output": output})


@app.route('/run-php-with-args')
def run_php_with_args():
    """Example route that executes PHP with arguments"""
    arg1 = request.args.get('arg1', '')
    arg2 = request.args.get('arg2', '')
    output = run_php_script('test.php', [arg1, arg2])
    return jsonify({"output": output})


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
        
        # Call PHP login handler
        output = run_php_script('login_handler.php', [email, password])
        
        try:
            result = json.loads(output)
            if result['status'] == 'success':
                # Store user data in session
                session['user_id'] = result['user']['id']
                session['username'] = result['user']['username']
                session['email'] = result['user']['email']
                return redirect(url_for('landing'))
            else:
                return render_template('pages/login.html', error=result['message'])
        except json.JSONDecodeError:
            return render_template('pages/login.html', error='An error occurred. Please try again.')
    
    return render_template('pages/login.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        # Validate passwords match
        if password != confirm_password:
            return render_template('pages/login.html', error='Passwords do not match!')
        
        # Call PHP signup handler
        output = run_php_script('signup_handler.php', [username, email, password])
        
        try:
            result = json.loads(output)
            if result['status'] == 'success':
                return render_template('pages/login.html', success='Account created successfully! Please login.')
            else:
                return render_template('pages/login.html', error=result['message'])
        except json.JSONDecodeError:
            return render_template('pages/login.html', error='An error occurred. Please try again.')
        
    return render_template('pages/login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


if __name__ == "__main__":
    server = Server(app.wsgi_app)
    server.serve(port=5500, host="127.0.0.1")