from flask import render_template, request, redirect, url_for, session

import database

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


def login():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        password = request.form.get("password", "").strip()

        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session["user_id"] = 0
            session["username"] = "Admin"
            session["email"] = "admin@reeliz.com"
            session["is_admin"] = True
            return redirect(url_for("admin_dashboard"))

        success, message, user = database.authenticate_user(username, password)
        if success:
            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["email"] = user["email"]
            session["is_admin"] = False
            return redirect(url_for("landing"))

        return render_template("pages/login.html", error=message)

    return render_template("pages/login.html")


def signup():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")
        confirm_password = request.form.get("confirm_password", "")

        if password != confirm_password:
            return render_template("pages/login.html", error="Passwords do not match!")

        success, message, _ = database.create_user(username, email, password)
        if success:
            return render_template(
                "pages/login.html",
                success="Account created successfully! Please login.",
            )

        return render_template("pages/login.html", error=message)

    return render_template("pages/login.html")


def logout():
    session.clear()
    return redirect(url_for("login"))
