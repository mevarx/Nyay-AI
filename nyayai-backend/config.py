import os
from dotenv import load_dotenv

load_dotenv()

# API Keys
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
GEMINI_API_KEY = GOOGLE_API_KEY

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

# Flask
FLASK_ENV = os.getenv("FLASK_ENV", "development")
FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev_secret")

# File handling
MAX_UPLOAD_SIZE_MB = int(os.getenv("MAX_UPLOAD_SIZE_MB", 50))
MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024
UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "./uploads")
CACHE_FOLDER = os.getenv("CACHE_FOLDER", "./cache")
ALLOWED_EXTENSIONS = {"csv"}

# Analysis
MIN_ROWS_REQUIRED = 3  # Set to 50 for production; 3 for dev/demo with sample data
MIN_COLUMNS_REQUIRED = 3
MIN_UNIQUE_VALUES_PER_SENSITIVE_COL = 2

# Bias score thresholds
BIAS_LOW_MAX = 30
BIAS_MODERATE_MAX = 60
BIAS_HIGH_MAX = 80
# Above 80 = CRITICAL

# Gemini model config
USE_DEV_MODEL = os.getenv("USE_DEV_MODEL", "true").lower() == "true"
GEMINI_MODEL = "gemini-1.5-flash" if USE_DEV_MODEL else "gemini-1.5-pro"
GEMINI_MAX_TOKENS_UPLOAD = 2048
GEMINI_MAX_TOKENS_ANALYZE = 4096
