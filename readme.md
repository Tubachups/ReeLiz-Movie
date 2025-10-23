# ReeLiz - Movie Booking Platform 🎬

A modern web application for browsing movies and booking cinema tickets, built with Flask and integrated with The Movie Database (TMDB) API.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Deployment](#deployment)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)

## ✨ Features

- **Movie Browsing**: Browse popular, trending, and top-rated movies
- **Movie Details**: View detailed information about movies including ratings, cast, and trailers
- **User Authentication**: Login and signup functionality (in development)
- **Responsive Design**: Mobile-friendly interface with modern UI/UX
- **Live Reload**: Auto-refresh during development for faster iteration
- **Genre Filtering**: Browse movies by different genres
- **Search Functionality**: Find movies quickly with search feature
- **Seat Selection**: Interactive cinema seat booking system

## 🛠️ Tech Stack

**Backend:**
- Python 3.x
- Flask - Web framework
- python-dotenv - Environment variable management
- Gunicorn - WSGI HTTP Server

**Frontend:**
- HTML5, CSS3, JavaScript
- Bootstrap 5 - UI framework
- Custom CSS for styling

**APIs:**
- TMDB (The Movie Database) API - Movie data

**Deployment:**
- Render.com - Hosting platform

## 📁 Project Structure

```
Reeliz/
├── app.py                 # Main Flask application
├── api.py                 # TMDB API integration
├── wsgi.py               # WSGI entry point for production
├── requirements.txt      # Python dependencies
├── render.yaml           # Render deployment configuration
├── .env                  # Environment variables (not in repo)
├── .gitignore           # Git ignore rules
│
├── static/              # Static files
│   ├── js/
│   │   ├── main.js
│   │   ├── components/  # UI components
│   │   ├── services/    # API services
│   │   └── utils/       # Utility functions
│   └── styles/          # CSS stylesheets
│       └── img/         # Images
│
└── templates/           # Jinja2 templates
    ├── components/      # Reusable components
    │   ├── base.html
    │   ├── navbar.html
    │   ├── footer.html
    │   └── ...
    └── pages/           # Page templates
        ├── index.html
        ├── landing.html
        ├── detail.html
        ├── login.html
        └── ...
```

## 🚀 Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- TMDB API key (get one at [TMDB](https://www.themoviedb.org/settings/api))

### Setup Steps

1. **Clone the repository:**
```bash
git clone https://github.com/yourusername/reeliz.git
cd reeliz
```

2. **Create virtual environment:**
```bash
python -m venv venv
```

3. **Activate virtual environment:**

   **Windows:**
   ```bash
   venv\Scripts\activate
   ```

   **Mac/Linux:**
   ```bash
   source venv/bin/activate
   ```

4. **Install dependencies:**
```bash
pip install -r requirements.txt
```

## ⚙️ Configuration

1. **Create `.env` file in the root directory:**
```env
TMDB_API_KEY=your_tmdb_api_key_here
SECRET_KEY=your_secret_key_here
FLASK_ENV=development
```

2. **Get your TMDB API key:**
   - Sign up at [TMDB](https://www.themoviedb.org/signup)
   - Go to Settings > API
   - Request an API key
   - Copy the API key to your `.env` file

## 🏃 Running the Application

### Development Mode

```bash
python app.py
```

The application will start with live reload enabled at `http://127.0.0.1:5500`

### Production Mode

```bash
gunicorn --bind 0.0.0.0:5500 wsgi:app
```

## 🌐 Deployment

This project is configured for deployment on [Render.com](https://render.com/).

### Deploy to Render

1. **Push your code to GitHub**

2. **Connect Render to your repository:**
   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

3. **Configure environment variables in Render:**
   - Add `TMDB_API_KEY`
   - Add `SECRET_KEY`

4. **Deploy:**
   - Render will automatically deploy using `render.yaml` configuration

## 🔌 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Home page with movie listings |
| `/landing` | GET | Landing page |
| `/about` | GET | About page |
| `/contact` | GET | Contact page |
| `/login` | GET, POST | User login |
| `/signup` | GET, POST | User registration |
| `/movie/<movie_id>` | GET | Movie details page |
| `/api/genres` | GET | Get all movie genres |
| `/api/movies/<type>` | GET | Get movies by type (popular, trending, top_rated) |

## 📝 Development Roadmap

- [x] Movie browsing functionality
- [x] Movie details page
- [x] Responsive design
- [ ] User authentication with database
- [ ] Booking system integration
- [ ] Payment gateway integration
- [ ] User profile management
- [ ] Booking history
- [ ] Email notifications

## 🐛 Known Issues

- Authentication system is currently in development
- Seat booking functionality needs backend integration

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [TMDB](https://www.themoviedb.org/) for providing the movie database API
- [Flask](https://flask.palletsprojects.com/) for the web framework
- [Bootstrap](https://getbootstrap.com/) for UI components

---

Made with ❤️ by OGAY
