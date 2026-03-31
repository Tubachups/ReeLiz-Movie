import base64
import os
import smtplib
import time
import traceback
import controller
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import requests
from dotenv import load_dotenv
from flask import Blueprint, jsonify, request, session

import controller

load_dotenv()

api_bp = Blueprint("api", __name__)

API_KEY = os.getenv("TMDB_API_KEY")
if not API_KEY:
    raise ValueError("TMDB_API_KEY environment variable is not set")
BASE_URL = "https://api.themoviedb.org/3"
cache = {}
CACHE_DURATION = 3600

http_session = requests.Session()


def get_cached_or_fetch(cache_key, fetch_function):
    current_time = time.time()
    if cache_key in cache:
        data, timestamp = cache[cache_key]
        if current_time - timestamp < CACHE_DURATION:
            return data
    data = fetch_function()
    cache[cache_key] = (data, current_time)
    return data


def _fetch_genres_data():
    url = f"{BASE_URL}/genre/movie/list?api_key={API_KEY}&language=en-US"
    response = http_session.get(url, timeout=10)
    return response.json()


def get_genres():
    try:
        return jsonify(get_cached_or_fetch("genres", _fetch_genres_data))
    except Exception as error:
        return jsonify({"error": str(error)}), 500


def get_movie_schedule(movie_index):
    time_slots = ["10:00 AM", "1:00 PM", "4:00 PM", "7:00 PM"]

    if movie_index < 4:
        allowed_weekdays = [1, 3, 5, 0]
        slot1_index = movie_index % 4
        slot2_index = (movie_index + 1) % 4
    else:
        allowed_weekdays = [2, 4, 6]
        adjusted_index = movie_index - 4
        slot1_index = adjusted_index % 4
        slot2_index = (adjusted_index + 1) % 4

    return {
        "allowed_weekdays": allowed_weekdays,
        "time_slots": [time_slots[slot1_index], time_slots[slot2_index]],
        "all_times": time_slots,
    }


def has_complete_details(movie_id):
    cache_key = f"movie_details_check_{movie_id}"
    if cache_key in cache:
        result, timestamp = cache[cache_key]
        if time.time() - timestamp < CACHE_DURATION:
            return result

    try:
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"

        credits = http_session.get(credits_url, timeout=5).json()
        releases = http_session.get(release_url, timeout=5).json()

        cast = credits.get("cast", [])
        if not cast:
            cache[cache_key] = (False, time.time())
            return False

        directors = [crew for crew in credits.get("crew", []) if crew.get("job") == "Director"]
        if not directors:
            cache[cache_key] = (False, time.time())
            return False

        producers = [crew for crew in credits.get("crew", []) if crew.get("job") == "Producer"]
        if not producers:
            cache[cache_key] = (False, time.time())
            return False

        writers = [
            crew
            for crew in credits.get("crew", [])
            if crew.get("job") in ["Writer", "Screenplay", "Story"]
        ]
        if not writers:
            cache[cache_key] = (False, time.time())
            return False

        has_certification = False
        for country in releases.get("results", []):
            if country["iso_3166_1"] in ["PH", "US"]:
                for release in country.get("release_dates", []):
                    if release.get("certification"):
                        has_certification = True
                        break
                if has_certification:
                    break

        cache[cache_key] = (has_certification, time.time())
        return has_certification
    except Exception:
        cache[cache_key] = (False, time.time())
        return False


def get_movie_schedule_api(movie_id):
    try:
        cache_key = "movies_now"
        if cache_key in cache:
            cached_movies, _ = cache[cache_key]
            if "results" in cached_movies:
                for index, movie in enumerate(cached_movies["results"]):
                    if movie["id"] == movie_id:
                        return jsonify(get_movie_schedule(index))
        return jsonify({"error": "Movie not found in current schedule"}), 404
    except Exception as error:
        return jsonify({"error": str(error)}), 500


def _fetch_movies_data(movie_type):
    today = datetime.now()
    thirty_days_ago = (today - timedelta(days=30)).strftime("%Y-%m-%d")
    fourteenth_day = (
        today.replace(day=14).strftime("%Y-%m-%d") if today.day <= 14 else today.strftime("%Y-%m-%d")
    )
    two_months_later = (today + timedelta(days=60)).strftime("%Y-%m-%d")

    if movie_type == "now":
        complete_movies = []
        page = 1
        max_pages = 10

        while len(complete_movies) < 8 and page <= max_pages:
            url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page={page}"
            url += f"&release_date.gte={thirty_days_ago}&release_date.lte={fourteenth_day}"
            url += "&sort_by=release_date.desc"

            response = http_session.get(url, timeout=10)
            data = response.json()
            results = data.get("results", [])
            if not results:
                break

            candidates = [movie for movie in results if movie.get("poster_path")]

            def check_movie(movie):
                return movie if has_complete_details(movie["id"]) else None

            with ThreadPoolExecutor(max_workers=5) as executor:
                futures = {executor.submit(check_movie, movie): movie for movie in candidates}
                for future in as_completed(futures):
                    result = future.result()
                    if result and len(complete_movies) < 8:
                        complete_movies.append(result)

            page += 1
            if len(complete_movies) >= 8:
                break

        complete_movies = sorted(
            complete_movies,
            key=lambda item: item.get("release_date", ""),
            reverse=True,
        )[:8]

        for index, movie in enumerate(complete_movies):
            movie["schedule"] = get_movie_schedule(index)
            movie["is_now_showing"] = True

        return {"results": complete_movies}

    if movie_type == "coming":
        now_showing_ids = []
        if "movies_now" in cache:
            cached_now, _ = cache["movies_now"]
            if "results" in cached_now:
                now_showing_ids = [movie["id"] for movie in cached_now["results"]]

        tomorrow = (today + timedelta(days=1)).strftime("%Y-%m-%d")
        url = f"{BASE_URL}/discover/movie?api_key={API_KEY}&language=en-US&region=PH&with_release_type=2|3&page=1"
        url += f"&release_date.gte={tomorrow}&release_date.lte={two_months_later}"

        response = http_session.get(url, timeout=10)
        data = response.json()
        if "results" in data:
            data["results"] = [
                movie
                for movie in data["results"]
                if movie.get("poster_path") and movie["id"] not in now_showing_ids
            ]
            for movie in data["results"]:
                movie["is_now_showing"] = False
        return data

    return {"results": []}


def get_movies(movie_type):
    try:
        cache_key = f"movies_{movie_type}"
        return jsonify(get_cached_or_fetch(cache_key, lambda: _fetch_movies_data(movie_type)))
    except Exception as error:
        return jsonify({"error": str(error)}), 500


def get_movie_details(movie_id):
    try:
        cache_key = f"movie_detail_{movie_id}"
        if cache_key in cache:
            cached_data, timestamp = cache[cache_key]
            if time.time() - timestamp < CACHE_DURATION:
                return cached_data

        movie_url = f"{BASE_URL}/movie/{movie_id}?api_key={API_KEY}&language=en-US"
        credits_url = f"{BASE_URL}/movie/{movie_id}/credits?api_key={API_KEY}&language=en-US"
        release_url = f"{BASE_URL}/movie/{movie_id}/release_dates?api_key={API_KEY}"

        def fetch_url(url):
            return http_session.get(url, timeout=10).json()

        with ThreadPoolExecutor(max_workers=3) as executor:
            future_movie = executor.submit(fetch_url, movie_url)
            future_credits = executor.submit(fetch_url, credits_url)
            future_releases = executor.submit(fetch_url, release_url)
            movie = future_movie.result()
            credits = future_credits.result()
            releases = future_releases.result()

        certification = "N/A"
        for country in releases.get("results", []):
            if country["iso_3166_1"] in ["PH", "US"]:
                for release in country.get("release_dates", []):
                    if release.get("certification"):
                        certification = release["certification"]
                        break
                if certification != "N/A":
                    break

        cast = [member["name"] for member in credits.get("cast", [])[:5]]
        directors = [crew["name"] for crew in credits.get("crew", []) if crew.get("job") == "Director"]
        producers = [crew["name"] for crew in credits.get("crew", []) if crew.get("job") == "Producer"][:3]
        writers = [
            crew["name"]
            for crew in credits.get("crew", [])
            if crew.get("job") in ["Writer", "Screenplay", "Story"]
        ][:3]

        schedule = None
        is_now_showing = False
        cached_release_date = None
        try:
            if "movies_now" in cache:
                cached_movies, _ = cache["movies_now"]
                if "results" in cached_movies:
                    for index, cached_movie in enumerate(cached_movies["results"]):
                        if cached_movie["id"] == movie_id:
                            schedule = get_movie_schedule(index)
                            is_now_showing = True
                            cached_release_date = cached_movie.get("release_date")
                            break
        except Exception:
            pass

        raw_release_date = cached_release_date or movie.get("release_date", "")
        if raw_release_date:
            try:
                release_date_obj = datetime.strptime(raw_release_date, "%Y-%m-%d")
                movie["release_date"] = release_date_obj.strftime("%B %d, %Y")
            except Exception:
                pass

        result_data = {
            "movie": movie,
            "certification": certification,
            "cast": cast,
            "directors": directors,
            "producers": producers,
            "writers": writers,
            "schedule": schedule,
            "is_now_showing": is_now_showing,
        }
        cache[cache_key] = (result_data, time.time())
        return result_data
    except Exception as error:
        raise Exception(f"Error fetching movie details: {error}") from error


def preload_cache():
    get_cached_or_fetch("movies_now", lambda: _fetch_movies_data("now"))
    get_cached_or_fetch("movies_coming", lambda: _fetch_movies_data("coming"))
    get_cached_or_fetch("genres", _fetch_genres_data)


def _json_result(success, message, data=None, success_code=200, error_code=400):
    payload = {"status": "success" if success else "error", "message": message}
    if data is not None:
        payload["data"] = data
    return jsonify(payload), success_code if success else error_code


@api_bp.get("/api/genres")
def genres_route():
    return get_genres()


@api_bp.get("/api/movies/<movie_type>")
def movies_route(movie_type):
    return get_movies(movie_type)


@api_bp.get("/api/movie/<int:movie_id>/schedule")
def movie_schedule_route(movie_id):
    return get_movie_schedule_api(movie_id)


@api_bp.get("/api/admin/users")
def admin_get_users():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    success, result = controller.get_users(archived=False)
    if success:
        return jsonify({"status": "success", "message": "Users retrieved successfully", "data": result})
    return jsonify({"status": "error", "message": result}), 500


@api_bp.post("/api/admin/users/create")
def admin_create_user():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message, created = controller.create_user(
        data.get("username"),
        data.get("email"),
        data.get("password"),
    )
    return _json_result(success, message, data=created)


@api_bp.post("/api/admin/users/update")
def admin_update_user():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message = controller.update_user(
        data.get("id"),
        data.get("username"),
        data.get("email"),
        data.get("password"),
    )
    return _json_result(success, message)


@api_bp.post("/api/admin/users/delete")
def admin_delete_user():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message = controller.archive_user(data.get("id"))
    return _json_result(success, message)


@api_bp.get("/api/admin/archive_users")
def admin_get_archive_users():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    success, result = controller.get_users(archived=True)
    if success:
        return jsonify(
            {"status": "success", "message": "Archived users retrieved successfully", "data": result}
        )
    return jsonify({"status": "error", "message": result}), 500


@api_bp.get("/api/admin/transactions")
def admin_get_transactions():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    success, result = controller.get_transactions(archived=False)
    if success:
        return jsonify({"status": "success", "message": "Transactions retrieved successfully", "data": result})
    return jsonify({"status": "error", "message": result}), 500


@api_bp.get("/api/admin/archive")
def admin_get_archive():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    success, result = controller.get_transactions(archived=True)
    if success:
        return jsonify({"status": "success", "message": "Archives retrieved successfully", "data": result})
    return jsonify({"status": "error", "message": result}), 500


@api_bp.post("/api/admin/transactions/create")
def admin_create_transaction():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message, created = controller.create_transaction(data)
    return _json_result(success, message, data=created)


@api_bp.post("/api/admin/transactions/update")
def admin_update_transaction():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message = controller.update_transaction(data)
    return _json_result(success, message)


@api_bp.post("/api/admin/transactions/delete")
def admin_delete_transaction():
    if not session.get("is_admin"):
        return jsonify({"status": "error", "message": "Unauthorized"}), 403

    data = request.get_json(silent=True) or {}
    success, message = controller.archive_transaction(data.get("id"))
    return _json_result(success, message)


@api_bp.post("/api/prepare-transaction")
def prepare_transaction():
    try:
        data = request.get_json(silent=True) or {}
        selected_date = data.get("selectedDate")
        cinema_room = str(data.get("cinemaRoom", ""))
        total_amount_raw = data.get("totalAmount", "")
        total_amount = str(total_amount_raw).replace("â‚±", "").replace(",", "").strip()

        if not all([selected_date, cinema_room, total_amount]):
            return jsonify(
                {"success": False, "message": "Missing required fields for transaction preparation"}
            ), 400

        try:
            date_part = selected_date.split(",")[0].strip()
            time_part = selected_date.split(",")[1].strip()
            month_day = date_part.split("(")[0].strip()
            month_str, day_str = month_day.split()
            month_map = {
                "Jan": "01",
                "Feb": "02",
                "Mar": "03",
                "Apr": "04",
                "May": "05",
                "Jun": "06",
                "Jul": "07",
                "Aug": "08",
                "Sep": "09",
                "Oct": "10",
                "Nov": "11",
                "Dec": "12",
            }
            month_num = month_map.get(month_str, "01")
            hour = datetime.strptime(time_part, "%I:%M %p").strftime("%H")
            db_date = f"{month_num}/{day_str.zfill(2)}:{hour}"
        except Exception:
            db_date = controller.format_datetime_for_db()

        success, next_id, _ = controller.get_next_transaction_id()
        if not success or next_id is None:
            return jsonify({"success": False, "message": "Failed to get next transaction ID"}), 500

        date_formatted = db_date.replace("/", "").replace(":", "")
        barcode = f"{next_id}{date_formatted}{cinema_room}{total_amount}"
        return jsonify(
            {"success": True, "transaction_id": next_id, "barcode": barcode, "db_date": db_date}
        ), 200
    except Exception as error:
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {error}"}), 500


@api_bp.post("/api/confirm-transaction")
def confirm_transaction():
    try:
        data = request.get_json(silent=True) or {}

        transaction_id = data.get("transaction_id")
        barcode = data.get("barcode")
        db_date = data.get("db_date")
        username = session.get("username", "Guest")
        cinema_room = str(data.get("cinemaRoom", ""))
        movie_title = data.get("movieTitle", "")
        selected_seats = data.get("selectedSeats", "")
        total_amount = str(data.get("totalAmount", "")).replace("â‚±", "").replace(",", "").strip()

        required = [transaction_id, barcode, db_date, cinema_room, movie_title, selected_seats, total_amount]
        if not all(required):
            missing = []
            if not transaction_id:
                missing.append("transaction_id")
            if not barcode:
                missing.append("barcode")
            if not db_date:
                missing.append("db_date")
            if not cinema_room:
                missing.append("cinemaRoom")
            if not movie_title:
                missing.append("movieTitle")
            if not selected_seats:
                missing.append("selectedSeats")
            if not total_amount:
                missing.append("totalAmount")
            return jsonify({"success": False, "message": f'Missing required fields: {", ".join(missing)}'}), 400

        success, message = controller.insert_transaction_with_barcode(
            transaction_id=transaction_id,
            date=db_date,
            name=username,
            room=cinema_room,
            movie=movie_title,
            sits=selected_seats,
            amount=total_amount,
            barcode=barcode,
        )
        return jsonify({"success": success, "message": message}), 200 if success else 500
    except Exception as error:
        traceback.print_exc()
        return jsonify({"success": False, "message": f"Server error: {error}"}), 500


@api_bp.get("/api/occupied-seats/<int:movie_id>/<cinema_room>")
def get_occupied_seats_route(movie_id, cinema_room):
    try:
        movie_data = get_movie_details(movie_id)
        movie_title = movie_data["movie"]["title"]
        selected_date = request.args.get("date", None)
        occupied = controller.get_occupied_seats(movie_title, cinema_room, selected_date)
        return jsonify(
            {
                "success": True,
                "occupied_seats": occupied,
                "movie": movie_title,
                "room": cinema_room,
                "date": selected_date,
            }
        ), 200
    except Exception as error:
        return jsonify({"success": False, "message": str(error), "occupied_seats": []}), 500


@api_bp.post("/api/send-ticket-email")
def send_ticket_email():
    try:
        data = request.get_json(silent=True) or {}
        recipient_email = data.get("email")
        username = data.get("username", "Guest")
        ticket_image = data.get("ticketImage")

        if not all([recipient_email, ticket_image]):
            return jsonify({"success": False, "message": "Missing required fields"}), 400

        sender_email = "cinemareeliz@gmail.com"
        sender_password = "grmxczoonfgajmgn"

        msg = MIMEMultipart("related")
        msg["From"] = sender_email
        msg["To"] = recipient_email
        msg["Subject"] = "Your Reeliz Movie Ticket"

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
                <h1>ðŸŽ¬ ReeLiz Cinema</h1>
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
                  <p style="color: #007bff; font-weight: bold;">ðŸ“§ This is your official ticket confirmation.</p>
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

        msg.attach(MIMEText(html, "html"))
        if "," in ticket_image:
            ticket_image = ticket_image.split(",")[1]
        image_data = base64.b64decode(ticket_image)
        image = MIMEImage(image_data, name="ticket.png")
        image.add_header("Content-ID", "<ticket_image>")
        image.add_header("Content-Disposition", "inline", filename="ReeLiz_Ticket.png")
        msg.attach(image)

        try:
            smtp = smtplib.SMTP("smtp.gmail.com", 587)
            smtp.starttls()
            smtp.login(sender_email, sender_password)
            smtp.send_message(msg)
            smtp.quit()
            return jsonify({"success": True, "message": "Email sent successfully"}), 200
        except smtplib.SMTPAuthenticationError:
            traceback.print_exc()
            return jsonify({"success": False, "message": "Email authentication failed. Please check credentials."}), 500
        except smtplib.SMTPException as error:
            traceback.print_exc()
            return jsonify({"success": False, "message": f"Email server error: {error}"}), 500
    except Exception as error:
        traceback.print_exc()
        return jsonify({"success": False, "message": str(error)}), 500
