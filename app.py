from flask import Flask, render_template, jsonify, session, request
from livereload import Server
from dotenv import load_dotenv
import api
import auth
import database
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


@app.route("/api/movie/<int:movie_id>/schedule")
def movie_schedule(movie_id):
    return api.get_movie_schedule_api(movie_id)


@app.route("/movie/<int:movie_id>")
def movie_detail(movie_id):
    try:
        username = session.get('username')
        movie_data = api.get_movie_details(movie_id)
        return render_template("pages/detail.html", username=username, **movie_data)
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

@app.route('/api/prepare-transaction', methods=['POST'])
def prepare_transaction():
    """Get next transaction ID and generate barcode for display in modal"""
    try:
        data = request.json
        
        # Extract data from request
        selected_date = data.get('selectedDate')  # Format: "Jan 15 (Mon), 10:00 AM"
        cinema_room = str(data.get('cinemaRoom', ''))  # 1 or 2
        total_amount_raw = data.get('totalAmount', '')
        
        # Clean and convert total_amount (remove ₱ symbol if present)
        total_amount = str(total_amount_raw).replace('₱', '').replace(',', '').strip()
        
        print(f"=== PREPARE TRANSACTION ===")
        print(f"Selected date: {selected_date}")
        print(f"Cinema room: {cinema_room}")
        print(f"Total amount: {total_amount}")
        
        # Validate required fields
        if not all([selected_date, cinema_room, total_amount]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields for transaction preparation'
            }), 400
        
        # Format date for database (MM/DD:HH)
        from datetime import datetime
        try:
            # Extract date and time from format like "Jan 15 (Mon), 10:00 AM"
            date_part = selected_date.split(',')[0].strip()  # "Jan 15 (Mon)"
            time_part = selected_date.split(',')[1].strip()  # "10:00 AM"
            
            # Parse month and day
            month_day = date_part.split('(')[0].strip()  # "Jan 15"
            month_str, day_str = month_day.split()
            
            # Convert month name to number
            month_map = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            }
            month_num = month_map.get(month_str, '01')
            
            # Parse hour from time (convert to 24-hour format)
            time_obj = datetime.strptime(time_part, "%I:%M %p")
            hour = time_obj.strftime("%H")
            
            # Format as MM/DD:HH
            db_date = f"{month_num}/{day_str.zfill(2)}:{hour}"
            
        except Exception as e:
            print(f"Date parsing error: {e}")
            # Fallback to current date/time
            db_date = database.format_datetime_for_db()
        
        # Get next transaction ID
        success, next_id, _ = database.get_next_transaction_id()
        
        if not success or next_id is None:
            return jsonify({
                'success': False,
                'message': 'Failed to get next transaction ID'
            }), 500
        
        # Generate barcode: id+date+room+amount
        date_formatted = db_date.replace('/', '').replace(':', '')
        barcode = f"{next_id}{date_formatted}{cinema_room}{total_amount}"
        
        print(f"Next ID: {next_id}")
        print(f"DB Date: {db_date}")
        print(f"Barcode: {barcode}")
        
        return jsonify({
            'success': True,
            'transaction_id': next_id,
            'barcode': barcode,
            'db_date': db_date
        }), 200
        
    except Exception as e:
        print(f"Error in prepare_transaction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/confirm-transaction', methods=['POST'])
def confirm_transaction():
    """Insert complete transaction when user clicks Done on success modal"""
    try:
        data = request.json
        
        # Extract data from request
        transaction_id = data.get('transaction_id')
        barcode = data.get('barcode')
        db_date = data.get('db_date')
        username = session.get('username', 'Guest')
        cinema_room = str(data.get('cinemaRoom', ''))
        movie_title = data.get('movieTitle', '')
        selected_seats = data.get('selectedSeats', '')
        total_amount = str(data.get('totalAmount', '')).replace('₱', '').replace(',', '').strip()
        
        print(f"=== CONFIRM TRANSACTION ===")
        print(f"Transaction ID: {transaction_id}")
        print(f"Barcode: {barcode}")
        print(f"Username: {username}")
        print(f"DB Date: {db_date}")
        print(f"Cinema room: {cinema_room}")
        print(f"Movie title: {movie_title}")
        print(f"Selected seats: {selected_seats}")
        print(f"Total amount: {total_amount}")
        print(f"Session data: {dict(session)}")
        
        # Validate required fields
        if not all([transaction_id, barcode, db_date, cinema_room, movie_title, selected_seats, total_amount]):
            missing = []
            if not transaction_id: missing.append('transaction_id')
            if not barcode: missing.append('barcode')
            if not db_date: missing.append('db_date')
            if not cinema_room: missing.append('cinemaRoom')
            if not movie_title: missing.append('movieTitle')
            if not selected_seats: missing.append('selectedSeats')
            if not total_amount: missing.append('totalAmount')
            
            return jsonify({
                'success': False,
                'message': f'Missing required fields: {", ".join(missing)}'
            }), 400
        
        # Insert the complete transaction with barcode
        success, message = database.insert_transaction_with_barcode(
            transaction_id=transaction_id,
            date=db_date,
            name=username,
            room=cinema_room,
            movie=movie_title,
            sits=selected_seats,
            amount=total_amount,
            barcode=barcode
        )
        
        if success:
            return jsonify({
                'success': True,
                'message': message
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': message
            }), 500
            
    except Exception as e:
        print(f"Error in confirm_transaction: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'message': f'Server error: {str(e)}'
        }), 500

@app.route('/api/occupied-seats/<int:movie_id>/<cinema_room>', methods=['GET'])
def get_occupied_seats(movie_id, cinema_room):
    """Get occupied seats for a specific movie, cinema room, and date"""
    try:
        # Get movie title from movie_id
        movie_data = api.get_movie_details(movie_id)
        movie_title = movie_data['movie']['title']
        
        # Get selected date from query parameter (format: MM/DD)
        selected_date = request.args.get('date', None)
        
        print(f"Fetching occupied seats - Movie: {movie_title}, Room: {cinema_room}, Date: {selected_date}")
        
        # Get occupied seats from database filtered by date
        occupied = database.get_occupied_seats(movie_title, cinema_room, selected_date)
        
        return jsonify({
            'success': True,
            'occupied_seats': occupied,
            'movie': movie_title,
            'room': cinema_room,
            'date': selected_date
        }), 200
        
    except Exception as e:
        print(f"Error getting occupied seats: {e}")
        return jsonify({
            'success': False,
            'message': str(e),
            'occupied_seats': []
        }), 500

if __name__ == "__main__":
    server = Server(app.wsgi_app)
    server.serve(port=5500, host="127.0.0.1")