from datetime import datetime

def _current_timestamp():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def _serialize_user(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "created_at": user.created_at,
    }


def _serialize_transaction(transaction):
    return {
        "id": transaction.id,
        "date": transaction.date,
        "name": transaction.name,
        "room": transaction.room,
        "movie": transaction.movie,
        "sits": transaction.sits,
        "amount": transaction.amount,
        "barcode": transaction.barcode,
        "remarks": transaction.remarks,
    }

def format_datetime_for_db():
  return datetime.now().strftime("%m/%d:%H")
  