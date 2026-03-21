from flask import Flask
from flask_cors import CORS
from config import FLASK_SECRET_KEY, UPLOAD_FOLDER, CACHE_FOLDER, MAX_CONTENT_LENGTH
from routes.upload_routes import upload_bp
from routes.analyze_routes import analyze_bp
from routes.fix_routes import fix_bp
from routes.report_routes import report_bp
from routes.history_routes import history_bp
import os


def create_app():
    app = Flask(__name__)
    app.secret_key = FLASK_SECRET_KEY
    app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

    # Allow frontend to call backend (local dev + production)
    CORS(app, origins=[
        "https://nyayai-0906.web.app",
        "https://nyayai-0906.firebaseapp.com",
    ])

    # Ensure required folders exist
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    os.makedirs(CACHE_FOLDER, exist_ok=True)

    # Register all route blueprints
    app.register_blueprint(upload_bp)
    app.register_blueprint(analyze_bp)
    app.register_blueprint(fix_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(history_bp)

    # Health check
    @app.route("/health")
    def health():
        return {"status": "healthy", "version": "1.0.0", "ai": "gemini"}

    return app


# Module-level app for Gunicorn: `gunicorn app:app`
app = create_app()

if __name__ == "__main__":
    app.run(debug=True, port=5000)

