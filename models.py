from database import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False, unique=True)
    email = db.Column(db.String(255), nullable=False, unique=True)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.String(32), nullable=False)


class ArchiveUser(db.Model):
    __tablename__ = "archive_users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.String(32), nullable=False)


class Transaction(db.Model):
    __tablename__ = "transaction"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    date = db.Column(db.String(32))
    name = db.Column(db.String(120), nullable=False)
    room = db.Column(db.String(16))
    movie = db.Column(db.String(255), nullable=False)
    sits = db.Column(db.String(255))
    amount = db.Column(db.String(32))
    barcode = db.Column(db.String(255))
    remarks = db.Column(db.String(32), nullable=False, default="Active")


class Archive(db.Model):
    __tablename__ = "archive"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.String(32))
    name = db.Column(db.String(120), nullable=False)
    room = db.Column(db.String(16))
    movie = db.Column(db.String(255), nullable=False)
    sits = db.Column(db.String(255))
    amount = db.Column(db.String(32))
    barcode = db.Column(db.String(255))
    remarks = db.Column(db.String(32), nullable=False, default="Archived")
