import os
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash

load_dotenv()

db = SQLAlchemy()

DB_PATH = os.getenv(
    "REELIZ_DB_PATH",
    os.path.join(os.path.dirname(__file__), "reeliz.sqlite3"),
)


def get_sqlalchemy_database_uri():
    db_file = Path(DB_PATH).resolve().as_posix()
    return f"sqlite:///{db_file}"


def init_app(app):
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        # Heroku may provide postgres://, but SQLAlchemy expects postgresql://
        app.config["SQLALCHEMY_DATABASE_URI"] = database_url.replace(
            "postgres://", "postgresql://", 1
        )
    else:
        app.config["SQLALCHEMY_DATABASE_URI"] = get_sqlalchemy_database_uri()

    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)
    db.init_app(app)
    with app.app_context():
        db.create_all()
