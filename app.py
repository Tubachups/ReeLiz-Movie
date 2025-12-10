from flask import Flask, render_template, jsonify, session, request, redirect, url_for
from livereload import Server
from dotenv import load_dotenv
import api
import auth
import database
import scanner
import os
import traceback
import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from call_php import run_php_script

load_dotenv()
app = Flask(__name__)
app.config["TEMPLATES_AUTO_RELOAD"] = True
# Generate new secret key on each startup to auto-logout all sessions (including screen mode)
# This ensures screen users must re-login after server restart
import secrets
app.config["SECRET_KEY"] = secrets.token_hex(32)
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
        email = session.get('email', 'guest@reeliz.com')
        movie_data = api.get_movie_details(movie_id)
        return render_template("pages/detail.html", username=username, email=email, **movie_data)
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


# Scanner Routes
@app.route('/scanner')
def scanner_page():
    """Scanner page - only accessible when logged in as scanner"""
    if not session.get('is_screen_mode'):
        return redirect(url_for('login'))
    return render_template('pages/scanner.html')


@app.route('/scanner/logout')
def scanner_logout():
    """Logout from scanner mode"""
    return auth.scanner_logout()


@app.route('/api/scanner/status')
def scanner_status_api():
    """Get scanner/Arduino status for the UI"""
    if not session.get('is_screen_mode'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        status = scanner.get_scanner_status()
        return jsonify(status)
    except Exception as e:
        print(f"Error in scanner_status_api: {e}")
        return jsonify({
            'connected': False,
            'ready': False,
            'message': str(e),
            'cooldown': 0
        })


@app.route('/api/scanner/poll')
def scanner_poll_api():
    """Poll for the latest scan result from the background scanner thread"""
    if not session.get('is_screen_mode'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        # Get the last scan result (if any)
        result = scanner.get_last_scan_result()
        
        if result:
            print(f"[POLL] Sending scan result to web: {result.get('status')}")
            # Clear the result so it's not shown again
            scanner.clear_scan_result()
            return jsonify({
                'has_scan': True,
                'scan_result': result
            })
        else:
            return jsonify({
                'has_scan': False
            })
    except Exception as e:
        print(f"Error in scanner_poll_api: {e}")
        return jsonify({
            'has_scan': False,
            'error': str(e)
        })


@app.route('/api/scanner/validate', methods=['POST'])
def validate_barcode_api():
    """Validate barcode and return ticket information"""
    if not session.get('is_screen_mode'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        barcode = data.get('barcode', '').strip()
        
        if not barcode:
            return jsonify({
                'status': 'error',
                'message': 'No barcode provided',
                'error_type': 'empty_barcode'
            })
        
        # Validate the barcode
        result = scanner.validate_barcode(barcode)
        
        if result['status'] == 'success':
            # Mark ticket as scanned
            success, msg = scanner.mark_ticket_as_scanned(barcode)
            
            if success:
                # Trigger door unlock
                door_success, door_msg = scanner.trigger_door_unlock(result['room'])
                
                return jsonify({
                    'status': 'success',
                    'ticket': result,
                    'door_unlocked': door_success
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'Failed to process ticket',
                    'error_type': 'processing_error'
                })
        else:
            return jsonify(result)
    
    except Exception as e:
        print(f"Error in validate_barcode_api: {e}")
        traceback.print_exc()
        return jsonify({
            'status': 'error',
            'message': 'Server error',
            'error_type': 'server_error'
        }), 500


# Admin Dashboard Routes
@app.route('/admin')
def admin_dashboard():
    """Admin dashboard page - only accessible by admin users"""
    if not session.get('is_admin'):
        return redirect(url_for('login'))
    return render_template('pages/admin.html')


@app.route('/api/admin/users')
def admin_get_users():
    """Get all users for admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        output = run_php_script('php/read.php', ['users'])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/users/create', methods=['POST'])
def admin_create_user():
    """Create new user from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/create.php', ['users', json.dumps(data)])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/users/update', methods=['POST'])
def admin_update_user():
    """Update user from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/update.php', ['users', json.dumps(data)])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/users/delete', methods=['POST'])
def admin_delete_user():
    """Delete user from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/delete.php', ['users', str(data.get('id'))])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/transactions')
def admin_get_transactions():
    """Get all transactions for admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        output = run_php_script('php/read.php', ['transaction'])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/transactions/create', methods=['POST'])
def admin_create_transaction():
    """Create new transaction from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/create.php', ['transaction', json.dumps(data)])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/transactions/update', methods=['POST'])
def admin_update_transaction():
    """Update transaction from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/update.php', ['transaction', json.dumps(data)])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/admin/transactions/delete', methods=['POST'])
def admin_delete_transaction():
    """Delete transaction from admin dashboard"""
    if not session.get('is_admin'):
        return jsonify({'status': 'error', 'message': 'Unauthorized'}), 403
    
    try:
        data = request.json
        output = run_php_script('php/delete.php', ['transaction', str(data.get('id'))])
        result = json.loads(output)
        return jsonify(result)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


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

@app.route('/api/send-ticket-email', methods=['POST'])
def send_ticket_email():
    """Send ticket details via email with embedded image"""
    try:
        data = request.json
        
        # Extract data from request
        recipient_email = data.get('email')
        username = data.get('username', 'Guest')
        ticket_image = data.get('ticketImage')  # Base64 encoded image
        
        print(f"=== SENDING EMAIL ===")
        print(f"To: {recipient_email}")
        print(f"Username: {username}")
        
        # Validate required fields
        if not all([recipient_email, ticket_image]):
            print(f"✗ Missing fields - email: {recipient_email}, ticket_image: {bool(ticket_image)}")
            return jsonify({"success": False, "message": "Missing required fields"}), 400
        
        # Create email content
        sender_email = "cinemareeliz@gmail.com"
        sender_password = "grmxczoonfgajmgn"  # App password without spaces
        
        # Create message
        msg = MIMEMultipart('related')
        msg['From'] = sender_email
        msg['To'] = recipient_email
        msg['Subject'] = "Your Reeliz Movie Ticket"
        
        # HTML email body with embedded image
        html = f"""
        <html>
          <head>
            <style>
              body {{
                font-family: Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                background-color: #f0f0f0;
                padding: 20px;
              }}
              .email-container {{
                max-width: 650px;
                margin: 0 auto;
                background-color: white;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              }}
              .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
              }}
              .header h1 {{
                margin: 0;
                font-size: 28px;
              }}
              .content {{
                padding: 30px;
                background-color: white;
              }}
              .ticket-image {{
                width: 100%;
                height: auto;
                display: block;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              }}
              .message {{
                text-align: center;
                margin: 20px 0;
                color: #555;
              }}
              .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #777;
                font-size: 14px;
              }}
              .footer p {{
                margin: 5px 0;
              }}
            </style>
          </head>
          <body>
            <div class="email-container">
              <div class="header">
                <h1>🎬 ReeLiz Cinema</h1>
                <p style="margin: 10px 0 0 0; font-size: 16px;">Your Movie Ticket</p>
              </div>
              
              <div class="content">
                <div class="message">
                  <p><strong>Dear {username},</strong></p>
                  <p>Thank you for booking with ReeLiz Cinema! Your ticket is attached below.</p>
                  <p>Please present this ticket at the cinema entrance.</p>
                </div>
                
                <img src="cid:ticket_image" alt="Movie Ticket" class="ticket-image">
                
                <div class="message" style="margin-top: 30px;">
                  <p style="color: #007bff; font-weight: bold;">📧 This is your official ticket confirmation.</p>
                  <p style="font-size: 14px; color: #666;">Save this email or take a screenshot for easy access at the cinema.</p>
                </div>
              </div>
              
              <div class="footer">
                <p><strong>ReeLiz Cinema</strong></p>
                <p>701P Mercedes Avenue, San Miguel, Pasig City</p>
                <p>Thank you for choosing ReeLiz Cinema!</p>
                <p style="margin-top: 15px;">&copy; 2025 ReeLiz Cinema. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
        """
        
        # Attach HTML content
        html_part = MIMEText(html, 'html')
        msg.attach(html_part)
        
        # Process and attach the ticket image
        import base64
        from email.mime.image import MIMEImage
        
        # Remove the data URL prefix if present
        if ',' in ticket_image:
            ticket_image = ticket_image.split(',')[1]
        
        # Decode base64 image
        image_data = base64.b64decode(ticket_image)
        
        # Create image attachment
        image = MIMEImage(image_data, name='ticket.png')
        image.add_header('Content-ID', '<ticket_image>')
        image.add_header('Content-Disposition', 'inline', filename='ReeLiz_Ticket.png')
        msg.attach(image)
        
        # Send email via Gmail SMTP
        try:
            print("Connecting to Gmail SMTP server...")
            server = smtplib.SMTP('smtp.gmail.com', 587)
            print("Starting TLS...")
            server.starttls()
            print("Logging in...")
            server.login(sender_email, sender_password)
            print("Sending message...")
            server.send_message(msg)
            print("Closing connection...")
            server.quit()
            
            print(f"✓ Email sent successfully to {recipient_email}")
            return jsonify({"success": True, "message": "Email sent successfully"}), 200
            
        except smtplib.SMTPAuthenticationError as auth_error:
            print(f"✗ Authentication error: {auth_error}")
            traceback.print_exc()
            return jsonify({"success": False, "message": "Email authentication failed. Please check credentials."}), 500
            
        except smtplib.SMTPException as smtp_error:
            print(f"✗ SMTP error: {smtp_error}")
            traceback.print_exc()
            return jsonify({"success": False, "message": f"Email server error: {str(smtp_error)}"}), 500
            
        except Exception as e:
            print(f"✗ Unexpected error in SMTP: {e}")
            traceback.print_exc()
            return jsonify({"success": False, "message": f"Unexpected error: {str(e)}"}), 500
            
    except Exception as e:
        print(f"✗ Error in send_ticket_email: {e}")
        traceback.print_exc()
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == "__main__":
    # Start the barcode scanner background thread
    print("\n" + "=" * 50)
    print("  ReeLiz Movie Booking System")
    print("=" * 50)
    print("Starting scanner thread...")
    scanner.start_scanner_thread()
    print("Starting web server on http://127.0.0.1:5500")
    print("=" * 50 + "\n")
    
    try:
        server = Server(app.wsgi_app)
        server.serve(port=5500, host="127.0.0.1")
    finally:
        print("\n[APP] Shutting down scanner thread...")
        scanner.stop_scanner_thread()
        print("[APP] Goodbye!")