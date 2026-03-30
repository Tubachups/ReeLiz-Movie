from datetime import datetime
from sqlalchemy import func
from models import User, ArchiveUser, Transaction, Archive
from database import db
from utils import _current_timestamp, _serialize_user, _serialize_transaction
from werkzeug.security import check_password_hash, generate_password_hash
from database import db


def _find_lowest_available_user_id():
    existing_ids = [row[0] for row in db.session.query(User.id).order_by(User.id).all()]
    next_id = 1
    for record_id in existing_ids:
        if record_id == next_id:
            next_id += 1
        else:
            break
    return next_id



def authenticate_user(username, password):
    try:
        user = User.query.filter_by(username=username).first()
        if not user or not check_password_hash(user.password, password):
            return False, "Invalid credentials", None

        return True, "Login successful", {
            "id": user.id,
            "username": user.username,
            "email": user.email,
        }
    except Exception as error:
        return False, f"Database error: {error}", None


def create_user(username, email, password):
    try:
        username = (username or "").strip()
        email = (email or "").strip()
        password = password or ""

        if not username or not email or not password:
            return False, "Username, email, and password are required", None

        if len(password) < 4:
            return False, "Password must be at least 4 characters", None

        if User.query.filter_by(email=email).first():
            return False, "Email already registered", None

        if User.query.filter_by(username=username).first():
            return False, "Username already taken", None

        new_user = User(
            id=_find_lowest_available_user_id(),
            username=username,
            email=email,
            password=generate_password_hash(password),
            created_at=_current_timestamp(),
        )
        db.session.add(new_user)
        db.session.commit()
        return True, "User created successfully", {"id": new_user.id}
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}", None


def get_users(archived=False):
    try:
        model = ArchiveUser if archived else User
        rows = model.query.order_by(model.id.desc()).all()
        return True, [_serialize_user(row) for row in rows]
    except Exception as error:
        return False, f"Database error: {error}"


def update_user(user_id, username, email, password=""):
    try:
        if not user_id:
            return False, "User ID is required"
        if not username or not email:
            return False, "Username and email are required"

        user = User.query.filter_by(id=user_id).first()
        if not user:
            return False, "User not found or no changes made"

        username_conflict = User.query.filter(
            User.username == username,
            User.id != user_id,
        ).first()
        if username_conflict:
            return False, "Username already taken by another user"

        email_conflict = User.query.filter(
            User.email == email,
            User.id != user_id,
        ).first()
        if email_conflict:
            return False, "Email already used by another user"

        changed = False
        if user.username != username:
            user.username = username
            changed = True
        if user.email != email:
            user.email = email
            changed = True
        if password:
            user.password = generate_password_hash(password)
            changed = True

        if not changed:
            return False, "User not found or no changes made"

        db.session.commit()
        return True, "User updated successfully"
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}"


def archive_user(user_id):
    try:
        if not user_id:
            return False, "Record ID is required"

        user = User.query.filter_by(id=user_id).first()
        if not user:
            return False, "User not found"

        archived_user = ArchiveUser.query.filter_by(id=user.id).first()
        if archived_user:
            archived_user.username = user.username
            archived_user.email = user.email
            archived_user.created_at = user.created_at
        else:
            db.session.add(
                ArchiveUser(
                    id=user.id,
                    username=user.username,
                    email=user.email,
                    created_at=user.created_at,
                )
            )

        username = user.username
        db.session.delete(user)
        db.session.commit()
        return True, f'User "{username}" archived successfully'
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}"


def get_transactions(archived=False):
    try:
        model = Archive if archived else Transaction
        rows = model.query.order_by(model.id.desc()).all()
        return True, [_serialize_transaction(row) for row in rows]
    except Exception as error:
        return False, f"Database error: {error}"


def create_transaction(data):
    try:
        name = (data.get("name") or "").strip()
        movie = (data.get("movie") or "").strip()
        if not name or not movie:
            return False, "Name and movie are required", None

        transaction = Transaction(
            date=data.get("date", ""),
            name=name,
            room=data.get("room", ""),
            movie=movie,
            sits=data.get("sits", ""),
            amount=str(data.get("amount", "")),
            barcode=data.get("barcode", ""),
            remarks=data.get("remarks", "Active") or "Active",
        )
        db.session.add(transaction)
        db.session.commit()
        return True, "Transaction created successfully", {"id": transaction.id}
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}", None


def update_transaction(data):
    try:
        transaction_id = data.get("id")
        if not transaction_id:
            return False, "Transaction ID is required"

        transaction = Transaction.query.filter_by(id=transaction_id).first()
        if not transaction:
            return False, "Transaction not found or no changes made"

        changed = False
        updates = {
            "date": data.get("date", ""),
            "name": data.get("name", ""),
            "room": data.get("room", ""),
            "movie": data.get("movie", ""),
            "sits": data.get("sits", ""),
            "amount": str(data.get("amount", "")),
            "barcode": data.get("barcode", ""),
            "remarks": data.get("remarks", "Active") or "Active",
        }
        for key, value in updates.items():
            if getattr(transaction, key) != value:
                setattr(transaction, key, value)
                changed = True

        if not changed:
            return False, "Transaction not found or no changes made"

        db.session.commit()
        return True, "Transaction updated successfully"
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}"


def archive_transaction(transaction_id):
    try:
        if not transaction_id:
            return False, "Record ID is required"

        transaction = Transaction.query.filter_by(id=transaction_id).first()
        if not transaction:
            return False, "Transaction not found"

        archived = Archive.query.filter_by(id=transaction.id).first()
        payload = {
            "date": transaction.date,
            "name": transaction.name,
            "room": transaction.room,
            "movie": transaction.movie,
            "sits": transaction.sits,
            "amount": transaction.amount,
            "barcode": transaction.barcode,
            "remarks": "Archived",
        }
        if archived:
            for key, value in payload.items():
                setattr(archived, key, value)
        else:
            db.session.add(Archive(id=transaction.id, **payload))

        delete_id = transaction.id
        db.session.delete(transaction)
        db.session.commit()
        return True, f"Transaction #{delete_id} archived successfully"
    except Exception as error:
        db.session.rollback()
        return False, f"Database error: {error}"


def get_next_transaction_id():
    """
    Get the next transaction ID that will be used.
    Returns: tuple (success: bool, next_id: int or None, barcode: str or None)
    """
    try:
        latest_id = db.session.query(func.coalesce(func.max(Transaction.id), 0)).scalar()
        return True, int(latest_id) + 1, None
    except Exception as error:
        print(f"Database error in get_next_transaction_id: {error}")
        return False, None, None


def insert_transaction_with_barcode(transaction_id, date, name, room, movie, sits, amount, barcode, remarks="Active"):
    """
    Insert a complete transaction with barcode when user clicks "Done".
    Returns: tuple (success: bool, message: str)
    """
    try:
        if Transaction.query.filter_by(id=int(transaction_id)).first():
            return False, "Transaction ID already exists"

        transaction = Transaction(
            id=int(transaction_id),
            date=str(date),
            name=str(name),
            room=str(room),
            movie=str(movie),
            sits=str(sits),
            amount=str(amount),
            barcode=str(barcode),
            remarks=str(remarks),
        )
        db.session.add(transaction)
        db.session.commit()
        return True, "Transaction saved successfully"
    except Exception as error:
        db.session.rollback()
        print(f"Database error in insert_transaction_with_barcode: {error}")
        return False, f"Database error: {error}"


def cleanup_old_transactions():
    """
    Delete transactions ONLY from dates before today (past dates only).
    Returns: tuple (success: bool, deleted_count: int)
    """
    try:
        today = datetime.now()
        today_month = int(today.strftime("%m"))
        today_day = int(today.strftime("%d"))

        records = Transaction.query.with_entities(Transaction.id, Transaction.date).all()
        ids_to_delete = []

        for trans_id, trans_date in records:
            date_part = trans_date.split(":")[0] if trans_date and ":" in trans_date else trans_date
            try:
                trans_month, trans_day = map(int, date_part.split("/"))
                if trans_month < today_month or (trans_month == today_month and trans_day < today_day):
                    ids_to_delete.append(trans_id)
            except (TypeError, ValueError):
                continue

        deleted_count = 0
        if ids_to_delete:
            deleted_count = len(ids_to_delete)
            Transaction.query.filter(Transaction.id.in_(ids_to_delete)).delete(synchronize_session=False)
            db.session.commit()

        return True, deleted_count
    except Exception as error:
        db.session.rollback()
        print(f"Database error in cleanup_old_transactions: {error}")
        return False, 0


def get_occupied_seats(movie_title, cinema_room, selected_date=None):
    """
    Get occupied seats for a specific movie, cinema room, and date.
    Returns: list of seat codes.
    """
    try:
        query = Transaction.query.with_entities(Transaction.sits).filter(
            Transaction.movie == movie_title,
            Transaction.room == cinema_room,
        )
        if selected_date:
            query = query.filter(Transaction.date.like(f"{selected_date}%"))

        occupied_seats = []
        for (sits_str,) in query.all():
            if sits_str:
                occupied_seats.extend(seat.strip() for seat in sits_str.split(","))

        return occupied_seats
    except Exception as error:
        print(f"Database error in get_occupied_seats: {error}")
        return []

