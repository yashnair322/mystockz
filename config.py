import os
import logging
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file with override=True to prioritize .env values
load_dotenv(override=True)

# Print loaded DATABASE_URL status (presence only — never the URL itself)
db_url = os.environ.get('DATABASE_URL')
if db_url:
    logger.info("Loaded DATABASE_URL from environment")
else:
    logger.warning("No DATABASE_URL found in environment variables")


def _force_sslmode_require(url: str) -> str:
    """Replace any sslmode= value (or append one) so the DB connection is encrypted.
    Fixes the previous bug where sslmode=disable / verify-* were left untouched."""
    if not url:
        return url
    if 'sslmode=' in url:
        import re
        return re.sub(r'sslmode=[^&\s]+', 'sslmode=require', url)
    sep = '&' if '?' in url else '?'
    return f"{url}{sep}sslmode=require"


def _bool_env(name: str, default: bool) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in ('true', '1', 't', 'yes', 'on')


class Config:
    """Configuration settings for the application."""
    DATABASE_URL = os.environ.get('DATABASE_URL')
    REDIS_URL = os.environ.get('REDIS_URL')

    # Force sslmode=require regardless of what the URL originally specified.
    # Allow opt-out only via an explicit DATABASE_SSL_DISABLED=true for local dev.
    if DATABASE_URL:
        if _bool_env('DATABASE_SSL_DISABLED', False):
            SQLALCHEMY_DATABASE_URI = DATABASE_URL
            logger.warning("DATABASE_SSL_DISABLED=true — DB connection is NOT using SSL.")
        else:
            SQLALCHEMY_DATABASE_URI = _force_sslmode_require(DATABASE_URL)
            logger.info("DB connection forced to sslmode=require")
    else:
        SQLALCHEMY_DATABASE_URI = None

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }

    # Email configuration
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_USE_TLS = True
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_DEFAULT_SENDER')

    # Secret key for sessions — MUST be set; no insecure fallback
    SECRET_KEY = os.environ.get('SESSION_SECRET')
    if not SECRET_KEY:
        raise RuntimeError("SESSION_SECRET is not set in environment variables! Must provide a persistent secret key.")
    if len(SECRET_KEY) < 32:
        raise RuntimeError("SESSION_SECRET is too short. Use at least 32 random characters.")

    # Razorpay configuration
    RAZORPAY_KEY_ID = os.environ.get('RAZORPAY_KEY_ID', 'placeholder_key_id')
    RAZORPAY_KEY_SECRET = os.environ.get('RAZORPAY_KEY_SECRET', 'placeholder_key_secret')

    # Admin email for notifications
    ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')

    # Application settings
    DEBUG = _bool_env('FLASK_DEBUG', False)
    HOST = '0.0.0.0'
    PORT = int(os.environ.get('PORT', 5000))

    # Session cookie security
    # Default: secure in non-debug; can be explicitly toggled via SESSION_COOKIE_SECURE env.
    SESSION_COOKIE_SECURE = _bool_env('SESSION_COOKIE_SECURE', not DEBUG)
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    # Limit how long a session lives even with "remember me"
    PERMANENT_SESSION_LIFETIME = 60 * 60 * 24 * 14  # 14 days
    REMEMBER_COOKIE_SECURE = SESSION_COOKIE_SECURE
    REMEMBER_COOKIE_HTTPONLY = True
    REMEMBER_COOKIE_SAMESITE = 'Lax'
    REMEMBER_COOKIE_DURATION = 60 * 60 * 24 * 14  # 14 days

    # File upload limit (5MB)
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
