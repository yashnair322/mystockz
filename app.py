import os
import logging
import hmac
from flask import Flask, jsonify, request, Response
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from flask_login import LoginManager
from werkzeug.middleware.proxy_fix import ProxyFix
from flask_wtf.csrf import CSRFProtect
from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Configure logging
# Use WARNING level in production; DEBUG only when FLASK_DEBUG is explicitly set
_log_level = logging.DEBUG if os.environ.get('FLASK_DEBUG', 'False').lower() in ['true', '1', 't'] else logging.WARNING
logging.basicConfig(level=_log_level)
logger = logging.getLogger(__name__)


class Base(DeclarativeBase):
    """SQLAlchemy declarative base with a strict constructor.

    Restricts kwargs to mapped columns + relationships so that a caller cannot
    accidentally (or maliciously) set arbitrary attributes when constructing
    a model from an untrusted dict like ``Model(**request.json)``.
    """

    def __init__(self, **kwargs):
        mapper = type(self).__mapper__
        allowed = {a.key for a in mapper.attrs}
        for key, value in kwargs.items():
            if key not in allowed:
                raise TypeError(
                    f"{type(self).__name__!r} got unexpected keyword argument {key!r}"
                )
            setattr(self, key, value)


# Initialize extensions
db = SQLAlchemy(model_class=Base)
login_manager = LoginManager()
csrf = CSRFProtect()
limiter = Limiter(key_func=get_remote_address, default_limits=["1000 per day", "60 per minute"])


def _migrate_added_columns():
    """Idempotently add columns introduced after the initial schema.

    db.create_all() only creates missing tables — it never alters existing ones.
    For our PostgreSQL deployment we therefore issue ADD COLUMN IF NOT EXISTS
    for every column added since v1.
    """
    from sqlalchemy import inspect, text

    expected = {
        'users':        [('session_token', 'VARCHAR(64)')],
        'admins':       [('session_token', 'VARCHAR(64)')],
        'user_scripts': [('approved_by',  'INTEGER')],
    }
    try:
        inspector = inspect(db.engine)
    except Exception:
        logger.exception("Could not introspect DB schema; skipping migration step.")
        return

    dialect = db.engine.dialect.name
    for table, cols in expected.items():
        try:
            existing = {c['name'] for c in inspector.get_columns(table)}
        except Exception:
            logger.warning(f"Table {table} not found during migration; skipping.")
            continue
        for col_name, col_type in cols:
            if col_name in existing:
                continue
            try:
                with db.engine.begin() as conn:
                    if dialect == 'postgresql':
                        conn.execute(text(
                            f'ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col_name} {col_type}'
                        ))
                    else:
                        conn.execute(text(
                            f'ALTER TABLE {table} ADD COLUMN {col_name} {col_type}'
                        ))
                logger.info(f"Added missing column {table}.{col_name}")
            except Exception:
                logger.exception(f"Failed adding column {table}.{col_name}")


def _backfill_session_tokens():
    """Generate session_token values for any pre-existing rows that don't have one,
    so the session-token check works on the very first request after the upgrade."""
    import secrets
    from models import User, Admin
    try:
        changed = False
        for U in (User, Admin):
            for row in U.query.filter(U.session_token.is_(None)).all():
                row.session_token = secrets.token_hex(32)
                changed = True
        if changed:
            db.session.commit()
            logger.info("Backfilled session_token values for legacy rows.")
    except Exception:
        db.session.rollback()
        logger.exception("Failed to backfill session_token values.")


def create_app():
    app = Flask(__name__, static_folder='frontend/dist', static_url_path='/')

    # Load configuration
    app.config.from_object('config.Config')

    # Configure rate limiting and session backend dynamically using Redis if available
    redis_url = app.config.get('REDIS_URL') or os.environ.get('REDIS_URL')
    if redis_url:
        app.config['RATELIMIT_STORAGE_URI'] = redis_url
        try:
            import redis
            from flask_session import Session
            app.config['SESSION_TYPE'] = 'redis'
            app.config['SESSION_REDIS'] = redis.from_url(redis_url)
            Session(app)
            logger.info("Successfully configured server-side sessions backed by Redis.")
        except ImportError:
            logger.warning("redis or flask_session package not installed. Falling back to default client-side sessions.")
        except Exception as e:
            logger.error(f"Failed to initialize Redis sessions: {type(e).__name__}. Falling back to default client-side sessions.")
    else:
        app.config['RATELIMIT_STORAGE_URI'] = 'memory://'

    # ------------------------------------------------------------------
    # Error handlers — never echo raw exception text to the client.
    # ------------------------------------------------------------------
    @app.errorhandler(404)
    def not_found_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Not Found'}), 404
        return app.send_static_file('index.html')

    @app.errorhandler(403)
    def forbidden_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Forbidden'}), 403
        return app.send_static_file('index.html')

    @app.errorhandler(429)
    def rate_limit_error(error):
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Too Many Requests'}), 429
        return app.send_static_file('index.html')

    from flask_wtf.csrf import CSRFError

    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        logger.warning("CSRF Error encountered.")
        return jsonify({'success': False, 'message': 'CSRF token missing or incorrect.'}), 400

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        logger.exception("Internal server error")
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal Server Error'}), 500
        return app.send_static_file('index.html')

    @app.errorhandler(Exception)
    def handle_exception(error):
        from werkzeug.exceptions import HTTPException
        if isinstance(error, HTTPException):
            return error
        # Log with traceback server-side, return only a generic message to the client.
        logger.exception("Unhandled exception")
        try:
            db.session.rollback()
        except Exception:
            pass
        if request.path.startswith('/api/'):
            return jsonify({'error': 'Internal Server Error'}), 500
        return app.send_static_file('index.html')

    # Configure proxy fix for correct URL generation
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # Initialize extensions with app
    db.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)
    limiter.init_app(app)
    Compress(app)

    # ------------------------------------------------------------------
    # Security response headers
    # ------------------------------------------------------------------
    @app.after_request
    def add_security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        # X-XSS-Protection is deprecated; modern browsers ignore it. Kept off intentionally.
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        response.headers['Cross-Origin-Opener-Policy'] = 'same-origin'
        response.headers['Cross-Origin-Resource-Policy'] = 'same-site'
        response.headers['Content-Security-Policy'] = (
            "default-src 'self'; "
            "script-src 'self' https://checkout.razorpay.com https://cdn.razorpay.com https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://unpkg.com; "
            "font-src 'self' https://cdn.jsdelivr.net data:; "
            "img-src 'self' https://images.unsplash.com https://cdn.razorpay.com https://via.placeholder.com data: blob:; "
            "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://cdn.razorpay.com https://cdn.jsdelivr.net; "
            "frame-src https://api.razorpay.com https://checkout.razorpay.com; "
            "frame-ancestors 'self'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        if not app.debug:
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        return response

    # CSRF protection scope
    app.config['WTF_CSRF_CHECK_DEFAULT'] = True
    app.config['WTF_CSRF_METHODS'] = ['POST', 'PUT', 'PATCH', 'DELETE']

    # API consumers expect JSON, not redirects, on unauthenticated requests.
    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'success': False, 'message': 'Unauthorized. Please log in.'}), 401

    with app.app_context():
        from models import User, Admin, Script, Order, OrderItem, Cart, CartItem, DemoRequest  # noqa: F401

        db.create_all()
        _migrate_added_columns()
        _backfill_session_tokens()
        Admin.create_default_admin()

        from api_routes import api_bp
        from admin_api_routes import admin_api_bp

        app.register_blueprint(api_bp, url_prefix='/api')
        app.register_blueprint(admin_api_bp, url_prefix='/api/admin')

        # Serve uploaded media (project /static folder) — protected by send_from_directory.
        from flask import send_from_directory

        @app.route('/static/<path:path>')
        def serve_static(path):
            return send_from_directory(os.path.join(app.root_path, 'static'), path)

        # ------------------------------------------------------------------
        # SEO: robots.txt + sitemap.xml
        # Only public, non-sensitive routes are exposed. Admin, API, auth and
        # account pages are explicitly disallowed and never listed.
        # ------------------------------------------------------------------
        SITE_BASE_URL = 'https://www.mystockz.in'

        @app.route('/robots.txt')
        def robots_txt():
            body = (
                "User-agent: *\n"
                "Disallow: /admin\n"
                "Disallow: /api/\n"
                "Disallow: /dashboard\n"
                "Disallow: /purchases\n"
                "Disallow: /profile\n"
                "Disallow: /tradingview\n"
                "Disallow: /cart\n"
                "Disallow: /verify-email\n"
                "Disallow: /forgot-password\n"
                "Disallow: /auth/\n"
                "\n"
                f"Sitemap: {SITE_BASE_URL}/sitemap.xml\n"
            )
            return Response(body, mimetype='text/plain')

        @app.route('/sitemap.xml')
        def sitemap_xml():
            from xml.sax.saxutils import escape
            from models import Script

            paths = ['/', '/resources', '/terms', '/privacy', '/refund', '/shipping', '/contact']
            try:
                active = Script.query.filter_by(is_active=True).all()
                paths.extend(f'/scripts/{s.id}' for s in active)
            except Exception:
                logger.exception("sitemap: could not load scripts")

            lines = [
                '<?xml version="1.0" encoding="UTF-8"?>',
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
            ]
            for p in paths:
                lines.append(f'  <url><loc>{escape(SITE_BASE_URL + p)}</loc></url>')
            lines.append('</urlset>')
            return Response('\n'.join(lines) + '\n', mimetype='application/xml')

        # SPA fallback
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_react(path):
            if path.startswith('api/') or path.startswith('api'):
                return jsonify({'error': 'Not Found'}), 404
            return app.send_static_file('index.html')

        # ------------------------------------------------------------------
        # Flask-Login user loader
        # ------------------------------------------------------------------
        @login_manager.user_loader
        def load_user(user_id):
            """Load a user by id, verifying the session token.

            Token mismatch (e.g. after password change) returns None, which
            forces Flask-Login to treat the request as unauthenticated and
            effectively invalidates all stale cookies.
            """
            from models import User
            if not user_id:
                return None
            # New format: 'u:<id>:<token>'
            if user_id.startswith('u:'):
                parts = user_id.split(':', 2)
                if len(parts) != 3:
                    return None
                try:
                    uid = int(parts[1])
                except (ValueError, TypeError):
                    return None
                user = User.query.get(uid)
                if not user or not user.is_active:
                    return None
                if not user.session_token or not hmac.compare_digest(parts[2] or '', user.session_token):
                    return None
                return user
            # Reject legacy ids — they have no token, so they're untrusted.
            return None

        return app


# Create app instance
app = create_app()
