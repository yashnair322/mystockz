import logging
import time
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone, time as dt_time
from zoneinfo import ZoneInfo

import requests
import razorpay
from flask import Blueprint, jsonify, request, session, current_app
from flask_login import login_user, logout_user, current_user, login_required
from flask_wtf.csrf import generate_csrf
from sqlalchemy.exc import IntegrityError

from models import Script, User, Admin, Cart, CartItem, Order, OrderItem, UserScript, Contact, DemoRequest
from app import db, limiter
from helpers import (
    generate_verification_code, send_verification_email, get_cart_total,
    create_razorpay_order, hash_otp, verify_otp, validate_password_complexity,
    is_valid_email, is_valid_username,
)

logger = logging.getLogger(__name__)

# OTP configuration
OTP_EXPIRY_MINUTES = 10
OTP_MAX_ATTEMPTS = 5

# Field length caps for input validation
MAX_NAME_LEN = 64
MAX_EMAIL_LEN = 120
MAX_MESSAGE_LEN = 5000
MAX_TRADINGVIEW_ID_LEN = 128
MAX_PHONE_LEN = 32
DEMO_MESSAGE_MAX = 2000

# Session keys grouped so they can be cleared together
_REG_SESSION_KEYS = (
    'pending_user_id', 'verification_code_hash',
    'verification_code_created', 'verification_attempts',
)
_RESET_SESSION_KEYS = (
    'reset_email', 'reset_code_hash',
    'reset_code_created', 'reset_attempts',
)


def _pop_keys(keys):
    for k in keys:
        session.pop(k, None)


api_bp = Blueprint('api', __name__)


@api_bp.route('/csrf-token', methods=['GET'])
@limiter.limit("120 per minute")
def get_csrf_token():
    return jsonify({'csrf_token': generate_csrf()})


# ---------------------------------------------------------------------------
# Market quotes — Yahoo Finance proxy serving end-of-day (close) prices.
# Refreshed once per trading day after the Indian market close (15:30 IST);
# cached in memory in between so the endpoint never hammers Yahoo.
# ---------------------------------------------------------------------------

# Indian stocks only (all .NS, priced in ₹) — no indices, so there is no
# points-vs-rupees ambiguity in the UI.
_MARKET_SYMBOLS = [
    ('RELIANCE',    'RELIANCE.NS',   'ticker'),
    ('TCS',         'TCS.NS',        'ticker'),
    ('INFY',        'INFY.NS',       'ticker'),
    ('HDFC BANK',   'HDFCBANK.NS',   'ticker'),
    ('ICICI BANK',  'ICICIBANK.NS',  'ticker'),
    ('SBI',         'SBIN.NS',       'ticker'),
    ('AXIS BANK',   'AXISBANK.NS',   'ticker'),
    ('KOTAK BANK',  'KOTAKBANK.NS',  'ticker'),
    ('BAJAJ FIN',   'BAJFINANCE.NS', 'ticker'),
    # Floating "bubble" badges — Indian stocks (end-of-day close).
    ('ITC',         'ITC.NS',        'floating'),
    ('AIRTEL',      'BHARTIARTL.NS', 'floating'),
    ('L&T',         'LT.NS',         'floating'),
    ('HUL',         'HINDUNILVR.NS', 'floating'),
    ('MARUTI',      'MARUTI.NS',     'floating'),
    ('WIPRO',       'WIPRO.NS',      'floating'),
]

_YF_HEADERS = {
    'User-Agent': (
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/124.0 Safari/537.36'
    ),
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
}

_quote_cache = {}
_quote_cache_lock = threading.Lock()

_IST = ZoneInfo('Asia/Kolkata')
_MARKET_CLOSE = dt_time(15, 30)


def _is_indian_market_open():
    now = datetime.now(_IST)
    if now.weekday() >= 5:
        return False
    return dt_time(9, 15) <= now.time() <= _MARKET_CLOSE


def _most_recent_close(now_ist):
    """IST datetime of the most recently completed market close at/before now.

    Walks back over weekends. Exact NSE holidays are not tracked — on a holiday
    we simply keep serving the prior session's close, which is the desired
    behaviour for an end-of-day price."""
    candidate = datetime.combine(now_ist.date(), _MARKET_CLOSE, tzinfo=_IST)
    while candidate > now_ist or candidate.weekday() >= 5:
        candidate = datetime.combine(
            (candidate - timedelta(days=1)).date(), _MARKET_CLOSE, tzinfo=_IST)
    return candidate


def _eod_refresh_due(cached_ts):
    """True when the cached quote predates the most recent market close, i.e. a
    fresh end-of-day price has become available and should be fetched once.

    This replaces 30-second polling: between closes the cached close is reused,
    so Yahoo is hit at most once per trading day (per server process)."""
    if not cached_ts:
        return True
    return cached_ts < _most_recent_close(datetime.now(_IST)).timestamp()


def _fetch_one_yahoo(symbol):
    try:
        url = f'https://query1.finance.yahoo.com/v8/finance/chart/{symbol}'
        r = requests.get(url, params={'interval': '1d', 'range': '5d'},
                         headers=_YF_HEADERS, timeout=6)
        r.raise_for_status()
        result = (r.json().get('chart') or {}).get('result') or []
        if not result:
            return None
        meta = result[0].get('meta') or {}
        price = meta.get('regularMarketPrice')
        prev = meta.get('chartPreviousClose') or meta.get('previousClose')
        if price is None or prev is None:
            return None
        return {'price': float(price), 'prev': float(prev),
                'currency': meta.get('currency', 'INR')}
    except Exception:
        logger.warning(f"Yahoo fetch failed for {symbol}")
        return None


def _format_value(price, currency):
    if price >= 1000:
        return f'{price:,.2f}'
    return f'{price:.2f}'


def _build_market_payload():
    now = time.time()

    with _quote_cache_lock:
        snapshot = dict(_quote_cache)

    to_fetch = []
    for _label, sym, _group in _MARKET_SYMBOLS:
        cached = snapshot.get(sym)
        if not cached or _eod_refresh_due(cached['ts']):
            to_fetch.append(sym)

    if to_fetch:
        with ThreadPoolExecutor(max_workers=8) as ex:
            future_to_sym = {ex.submit(_fetch_one_yahoo, s): s for s in to_fetch}
            for fut in as_completed(future_to_sym):
                sym = future_to_sym[fut]
                try:
                    result = fut.result()
                    if result:
                        with _quote_cache_lock:
                            _quote_cache[sym] = {**result, 'ts': now}
                except Exception:
                    logger.warning(f"Quote refresh failed for {sym}")

    with _quote_cache_lock:
        snapshot = dict(_quote_cache)

    ticker, floating = [], []
    for label, sym, group in _MARKET_SYMBOLS:
        q = snapshot.get(sym)
        if not q:
            continue
        change_pct = ((q['price'] - q['prev']) / q['prev'] * 100) if q['prev'] else 0.0
        item = {
            'label': label,
            'symbol': sym,
            'value': _format_value(q['price'], q['currency']),
            'change': f'{change_pct:+.2f}%',
            'up': change_pct >= 0,
            'currency': q['currency'],
        }
        (ticker if group == 'ticker' else floating).append(item)

    return {
        'ticker': ticker,
        'floating': floating,
        'updated_at': datetime.now(timezone.utc).isoformat(),
        'markets': {
            'india_open': _is_indian_market_open(),
        },
        'symbols_refreshed': len(to_fetch),
    }


@api_bp.route('/market/quotes', methods=['GET'])
@limiter.limit("60 per minute")
def market_quotes():
    try:
        payload = _build_market_payload()
        if payload['ticker'] or payload['floating']:
            return jsonify({'success': True, 'data': payload})
    except Exception:
        logger.exception("Market quotes fetch failed")
    return jsonify({'success': False, 'message': 'Live quotes unavailable'}), 503


# ---------------------------------------------------------------------------
# Contact form
# ---------------------------------------------------------------------------

@api_bp.route('/contact', methods=['POST'])
@limiter.limit("3 per minute")
def contact_submit():
    data = request.get_json(silent=True) or {}
    first_name = (data.get('first_name') or '').strip()
    last_name = (data.get('last_name') or '').strip()
    email = (data.get('email') or '').strip()
    message = (data.get('message') or '').strip()

    if not first_name or not last_name or not email or not message:
        return jsonify({'success': False, 'message': 'All fields are required.'}), 400
    if len(first_name) > MAX_NAME_LEN or len(last_name) > MAX_NAME_LEN:
        return jsonify({'success': False, 'message': 'Name fields are too long.'}), 400
    if len(email) > MAX_EMAIL_LEN or not is_valid_email(email):
        return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400
    if len(message) < 10 or len(message) > MAX_MESSAGE_LEN:
        return jsonify({'success': False, 'message': 'Message must be 10-5000 characters.'}), 400

    try:
        new_contact = Contact(
            first_name=first_name,
            last_name=last_name,
            email=email,
            message=message,
        )
        db.session.add(new_contact)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Thank you! Your message has been saved.'})
    except Exception:
        db.session.rollback()
        logger.exception("Contact submit error")
        return jsonify({'success': False, 'message': 'An internal error occurred. Please try again later.'}), 500


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

@api_bp.route('/auth/status', methods=['GET'])
def auth_status():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'first_name': current_user.first_name,
                'last_name': current_user.last_name,
                'tradingview_id': current_user.tradingview_id,
                'is_admin': False,
            }
        })
    if session.get('is_admin') and session.get('admin_id'):
        admin = Admin.query.get(session.get('admin_id'))
        if admin and admin.is_active:
            # Verify the admin session token (rotated on password change).
            admin_token = session.get('admin_session_token')
            if admin.session_token and admin_token and \
                    admin_token == admin.session_token:
                return jsonify({
                    'authenticated': True,
                    'user': {
                        'id': admin.id,
                        'username': admin.username,
                        'email': admin.email,
                        'is_admin': True,
                    }
                })
        # Stale or invalid admin session — clear and report unauthenticated.
        session.pop('admin_id', None)
        session.pop('is_admin', None)
        session.pop('admin_session_token', None)
    return jsonify({'authenticated': False})


@api_bp.route('/auth/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    remember = bool(data.get('remember', False))

    if not username or not password:
        return jsonify({'success': False, 'message': 'Invalid credentials.'}), 400

    # Look both records up first, then check passwords. This narrows (but doesn't
    # fully eliminate) timing differences between "admin exists" vs "user exists".
    admin = Admin.query.filter_by(username=username).first()
    user = User.query.filter((User.username == username) | (User.email == username)).first()

    # Admin path — verify password first regardless of is_active to keep timing similar.
    if admin and admin.check_password(password):
        if not admin.is_active:
            return jsonify({'success': False, 'message': 'Invalid credentials.'}), 401
        logout_user()
        session.clear()
        session['admin_id'] = admin.id
        session['is_admin'] = True
        session['admin_session_token'] = admin.session_token
        session.permanent = False
        return jsonify({'success': True, 'is_admin': True})

    # Regular user path
    if user and user.check_password(password):
        if not user.is_active:
            return jsonify({'success': False, 'message': 'Invalid credentials.'}), 401
        session.clear()
        login_user(user, remember=remember)
        return jsonify({
            'success': True,
            'user': {
                'id': user.id,
                'username': user.username,
                'is_admin': False,
            }
        })

    return jsonify({'success': False, 'message': 'Invalid credentials.'}), 401


@api_bp.route('/auth/register', methods=['POST'])
@limiter.limit("3 per minute")
def register():
    data = request.get_json(silent=True) or {}

    username = (data.get('username') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    first_name = (data.get('first_name') or '').strip()[:MAX_NAME_LEN]
    last_name = (data.get('last_name') or '').strip()[:MAX_NAME_LEN]

    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'Missing required fields'}), 400
    if not is_valid_username(username):
        return jsonify({
            'success': False,
            'message': 'Username must be 3-64 characters and contain only letters, numbers, dot, underscore or hyphen.'
        }), 400
    if not is_valid_email(email) or len(email) > MAX_EMAIL_LEN:
        return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400

    is_valid, msg = validate_password_complexity(password)
    if not is_valid:
        return jsonify({'success': False, 'message': msg}), 400

    # Block conflicts with active admin accounts too — they share the login surface.
    admin_clash = Admin.query.filter(
        (Admin.username == username) | (Admin.email == email)
    ).first()
    if admin_clash:
        # Generic message — don't reveal that this collides with an admin account.
        return jsonify({'success': False, 'message': 'Registration could not be completed.'}), 400

    existing_user = User.query.filter(
        (User.username == username) | (User.email == email)
    ).first()
    if existing_user:
        if existing_user.is_active:
            return jsonify({'success': False, 'message': 'Username or email already exists.'}), 400
        # Inactive (pending) — only allow re-registration after the OTP window has lapsed.
        created_at = existing_user.created_at
        if created_at and created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        if created_at and datetime.now(timezone.utc) > created_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
            db.session.delete(existing_user)
            db.session.commit()
        else:
            return jsonify({
                'success': False,
                'message': 'A registration is already in progress for this account. Please check your email or try again later.'
            }), 400

    user = User(
        username=username,
        email=email,
        first_name=first_name or None,
        last_name=last_name or None,
        is_active=False,
    )
    user.set_password(password)
    try:
        db.session.add(user)
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': True, 'message': 'If the details are valid, a verification email has been sent.'})

    _pop_keys(_REG_SESSION_KEYS)
    session['pending_user_id'] = user.id
    verification_code = generate_verification_code()
    session['verification_code_hash'] = hash_otp(verification_code)
    session['verification_code_created'] = datetime.now(timezone.utc).isoformat()
    session['verification_attempts'] = 0

    if send_verification_email(email, verification_code):
        return jsonify({'success': True, 'message': 'Verification email sent'})
    # Email send failed — surface to the user so they don't sit on the verify-email screen forever.
    return jsonify({'success': False, 'message': 'Failed to send verification email. Please try again later.'}), 500


@api_bp.route('/auth/verify-email', methods=['POST'])
@limiter.limit("5 per minute")
def verify_email():
    if current_user.is_authenticated:
        return jsonify({'success': False, 'message': 'Already authenticated'}), 400
    if 'pending_user_id' not in session:
        return jsonify({'success': False, 'message': 'No pending registration'}), 400

    data = request.get_json(silent=True) or {}
    code = (data.get('code') or '').strip()
    if not code or not code.isdigit() or len(code) != 6:
        return jsonify({'success': False, 'message': 'Invalid code'}), 400

    attempts = session.get('verification_attempts', 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        _pop_keys(_REG_SESSION_KEYS)
        return jsonify({'success': False, 'message': 'Too many failed attempts'}), 400

    created_str = session.get('verification_code_created')
    if created_str:
        try:
            created_at = datetime.fromisoformat(created_str)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
        except ValueError:
            _pop_keys(_REG_SESSION_KEYS)
            return jsonify({'success': False, 'message': 'Session corrupted'}), 400
        if datetime.now(timezone.utc) > created_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
            _pop_keys(_REG_SESSION_KEYS)
            return jsonify({'success': False, 'message': 'Code expired'}), 400

    if verify_otp(code, session.get('verification_code_hash')):
        user_id = session.get('pending_user_id')
        user = User.query.get(user_id)
        if user:
            user.is_active = True
            cart = Cart(user_id=user.id)
            db.session.add(cart)
            db.session.commit()
        _pop_keys(_REG_SESSION_KEYS)
        return jsonify({'success': True, 'message': 'Registration successful'})

    session['verification_attempts'] = attempts + 1
    return jsonify({'success': False, 'message': 'Invalid code'}), 400


@api_bp.route('/auth/forgot-password', methods=['POST'])
@limiter.limit("5 per hour")
def forgot_password():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()

    # Always return the same response to prevent email enumeration.
    generic = {'success': True, 'message': 'If your email is registered, you will receive a reset code shortly.'}

    if not email or not is_valid_email(email):
        return jsonify(generic)

    user = User.query.filter_by(email=email).first()
    if not user or not user.is_active:
        return jsonify(generic)

    import secrets as _secrets
    reset_code = f"{_secrets.randbelow(900000) + 100000:06d}"

    _pop_keys(_RESET_SESSION_KEYS)
    session['reset_email'] = email
    session['reset_code_hash'] = hash_otp(reset_code)
    session['reset_code_created'] = datetime.now(timezone.utc).isoformat()
    session['reset_attempts'] = 0

    from helpers import send_password_reset_email
    send_password_reset_email(email, reset_code)  # success/failure doesn't change the response
    return jsonify(generic)


@api_bp.route('/auth/reset-password', methods=['POST'])
@limiter.limit("5 per hour")
def reset_password():
    data = request.get_json(silent=True) or {}
    code = (data.get('code') or '').strip()
    new_password = data.get('new_password') or ''
    email = session.get('reset_email')

    if not code or not new_password or not email:
        return jsonify({'success': False, 'message': 'Missing required fields or session expired'}), 400
    if not code.isdigit() or len(code) != 6:
        return jsonify({'success': False, 'message': 'Invalid code'}), 400

    is_valid, msg = validate_password_complexity(new_password)
    if not is_valid:
        return jsonify({'success': False, 'message': msg}), 400

    attempts = session.get('reset_attempts', 0)
    if attempts >= OTP_MAX_ATTEMPTS:
        _pop_keys(_RESET_SESSION_KEYS)
        return jsonify({'success': False, 'message': 'Too many failed attempts. Please request a new code.'}), 400

    created_str = session.get('reset_code_created')
    if created_str:
        try:
            created_at = datetime.fromisoformat(created_str)
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
        except ValueError:
            _pop_keys(_RESET_SESSION_KEYS)
            return jsonify({'success': False, 'message': 'Session corrupted'}), 400
        if datetime.now(timezone.utc) > created_at + timedelta(minutes=OTP_EXPIRY_MINUTES):
            _pop_keys(_RESET_SESSION_KEYS)
            return jsonify({'success': False, 'message': 'Code expired. Please request a new code.'}), 400

    if verify_otp(code, session.get('reset_code_hash')):
        user = User.query.filter_by(email=email).first()
        if user:
            user.set_password(new_password)  # also rotates session_token → invalidates all sessions
            db.session.commit()
        _pop_keys(_RESET_SESSION_KEYS)
        return jsonify({'success': True, 'message': 'Password reset successfully. You can now login.'})

    session['reset_attempts'] = attempts + 1
    return jsonify({'success': False, 'message': 'Invalid code'}), 400


@api_bp.route('/auth/logout', methods=['POST'])
def logout():
    logout_user()
    session.pop('admin_id', None)
    session.pop('is_admin', None)
    session.pop('admin_session_token', None)
    return jsonify({'success': True})


# ---------------------------------------------------------------------------
# Scripts
# ---------------------------------------------------------------------------

@api_bp.route('/scripts', methods=['GET'])
def get_scripts():
    try:
        scripts = Script.query.filter_by(is_active=True).all()
        return jsonify({
            'success': True,
            'data': [{
                'id': script.id,
                'name': script.name,
                'description': script.description,
                'price_monthly': script.price_monthly,
                'price_yearly': script.price_yearly,
                'image_url': script.image_url,
                'features': script.features,
            } for script in scripts]
        })
    except Exception:
        logger.exception("Error fetching scripts API")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500


@api_bp.route('/scripts/<int:script_id>', methods=['GET'])
def get_script(script_id):
    try:
        script = Script.query.get_or_404(script_id)
        if not script.is_active:
            return jsonify({'success': False, 'message': 'Script not found or inactive'}), 404
        return jsonify({
            'success': True,
            'data': {
                'id': script.id,
                'name': script.name,
                'description': script.description,
                'price_monthly': script.price_monthly,
                'price_yearly': script.price_yearly,
                'image_url': script.image_url,
                'features': script.features,
            }
        })
    except Exception as e:
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            raise
        logger.exception("Error fetching single script API")
        return jsonify({'success': False, 'error': 'An internal error occurred.'}), 500


# ---------------------------------------------------------------------------
# Profile / password
# ---------------------------------------------------------------------------

@api_bp.route('/user/change-password', methods=['POST'])
@login_required
@limiter.limit("10 per hour")
def change_password():
    try:
        data = request.get_json(silent=True) or {}
        current_pwd = data.get('current_password') or ''
        new_pwd = data.get('new_password') or ''

        if not current_pwd or not new_pwd:
            return jsonify({'success': False, 'message': 'Current and new password are required'}), 400

        is_valid, msg = validate_password_complexity(new_pwd)
        if not is_valid:
            return jsonify({'success': False, 'message': msg}), 400

        if not current_user.check_password(current_pwd):
            return jsonify({'success': False, 'message': 'Current password is incorrect'}), 400

        if current_pwd == new_pwd:
            return jsonify({'success': False, 'message': 'New password must be different from the current password.'}), 400

        current_user.set_password(new_pwd)  # rotates session_token
        db.session.commit()
        # Refresh THIS session so it stays valid with the new token; all other
        # sessions instantly become invalid via load_user's token check.
        login_user(current_user)
        return jsonify({'success': True, 'message': 'Password updated successfully'})
    except Exception:
        db.session.rollback()
        logger.exception("Error changing password")
        return jsonify({'success': False, 'message': 'Failed to change password'}), 500


@api_bp.route('/user/profile', methods=['POST'])
@login_required
@limiter.limit("30 per hour")
def update_profile():
    try:
        data = request.get_json(silent=True) or {}
        first_name = (data.get('first_name') or '').strip()[:MAX_NAME_LEN]
        last_name = (data.get('last_name') or '').strip()[:MAX_NAME_LEN]
        tradingview_id = (data.get('tradingview_id') or '').strip()[:MAX_TRADINGVIEW_ID_LEN]
        new_email = (data.get('email') or '').strip().lower()
        current_password = data.get('current_password') or ''

        if new_email and new_email != (current_user.email or '').strip().lower():
            if not is_valid_email(new_email) or len(new_email) > MAX_EMAIL_LEN:
                return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400
            if not current_password or not current_user.check_password(current_password):
                return jsonify({'success': False, 'message': 'Current password is required to change your email address'}), 400
            existing = User.query.filter_by(email=new_email).first()
            if existing and existing.id != current_user.id:
                return jsonify({'success': False, 'message': 'That email address is already in use by another account'}), 400
            # Admin email collision should also be blocked.
            if Admin.query.filter_by(email=new_email).first():
                return jsonify({'success': False, 'message': 'That email address is already in use by another account'}), 400
            current_user.email = new_email

        current_user.first_name = first_name or None
        current_user.last_name = last_name or None
        current_user.tradingview_id = tradingview_id or None

        db.session.commit()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    except Exception:
        db.session.rollback()
        logger.exception("Error updating profile")
        return jsonify({'success': False, 'message': 'Failed to update profile'}), 500


@api_bp.route('/user/purchases', methods=['GET'])
@login_required
def get_user_purchases():
    try:
        user_scripts = UserScript.query.filter_by(user_id=current_user.id).all()
        purchases = []
        for us in user_scripts:
            script = Script.query.get(us.script_id)
            if script:
                purchases.append({
                    'id': us.id,
                    'script_name': script.name,
                    'approval_status': us.approval_status,
                    'subscription_type': us.subscription_type,
                    'expires_at': us.expires_at.isoformat() if us.expires_at else None,
                    'is_expired': us.is_subscription_expired(),
                    'tradingview_id': us.tradingview_id,
                })
        return jsonify({'success': True, 'purchases': purchases})
    except Exception:
        logger.exception("Error fetching purchases")
        return jsonify({'success': False, 'message': 'Failed to fetch purchases'}), 500


@api_bp.route('/user/tradingview-id/<int:user_script_id>', methods=['POST'])
@login_required
def update_tradingview_id(user_script_id):
    try:
        user_script = UserScript.query.get_or_404(user_script_id)
        if user_script.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Not authorized'}), 403

        data = request.get_json(silent=True) or {}
        tv_id = (data.get('tradingview_id') or '').strip()

        if not tv_id:
            return jsonify({'success': False, 'message': 'TradingView ID is required'}), 400
        if len(tv_id) > MAX_TRADINGVIEW_ID_LEN:
            return jsonify({'success': False, 'message': 'TradingView ID is too long.'}), 400

        user_script.tradingview_id = tv_id
        db.session.commit()
        return jsonify({'success': True, 'message': 'TradingView ID updated successfully'})
    except Exception as e:
        from werkzeug.exceptions import HTTPException
        if isinstance(e, HTTPException):
            raise
        db.session.rollback()
        logger.exception("Error updating TV ID")
        return jsonify({'success': False, 'message': 'Failed to update TradingView ID'}), 500


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------

@api_bp.route('/cart', methods=['GET'])
@login_required
def get_cart():
    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.session.add(cart)
        db.session.commit()

    cart_items = db.session.query(CartItem, Script).join(
        Script, CartItem.script_id == Script.id
    ).filter(CartItem.cart_id == cart.id).all()

    total = get_cart_total(cart.id)

    return jsonify({
        'success': True,
        'cart': {
            'id': cart.id,
            'total': total,
            'items': [{
                'item_id': item.id,
                'script_id': script.id,
                'name': script.name,
                'description': script.description,
                'image_url': script.image_url,
                'subscription_type': item.subscription_type,
                'price': script.price_yearly if item.subscription_type == 'yearly' else script.price_monthly,
            } for item, script in cart_items]
        }
    })


@api_bp.route('/cart/add/<int:script_id>', methods=['POST'])
@login_required
def add_to_cart(script_id):
    script = Script.query.get_or_404(script_id)
    if not script.is_active:
        return jsonify({'success': False, 'message': 'This indicator is no longer available.'}), 400

    data = request.get_json(silent=True) or {}
    subscription_type = data.get('subscription_type', 'monthly')
    if subscription_type not in ('monthly', 'yearly'):
        subscription_type = 'monthly'

    existing_sub = UserScript.query.filter_by(
        user_id=current_user.id,
        script_id=script_id,
        approval_status='approved',
    ).first()
    if existing_sub and not existing_sub.is_subscription_expired():
        return jsonify({'success': False, 'message': 'You already have an active subscription for this indicator'}), 400

    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        cart = Cart(user_id=current_user.id)
        db.session.add(cart)
        db.session.commit()

    existing_item = CartItem.query.filter_by(cart_id=cart.id, script_id=script_id).first()
    if existing_item:
        if existing_item.subscription_type != subscription_type:
            existing_item.subscription_type = subscription_type
            db.session.commit()
            return jsonify({'success': True, 'message': f'Subscription type updated to {subscription_type}'})
        return jsonify({'success': False, 'message': 'This indicator is already in your cart'}), 400

    try:
        cart_item = CartItem(cart_id=cart.id, script_id=script_id, subscription_type=subscription_type)
        db.session.add(cart_item)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Resource added to cart'})
    except IntegrityError:
        db.session.rollback()
        return jsonify({'success': False, 'message': 'This indicator is already in your cart'}), 400


@api_bp.route('/cart/remove/<int:item_id>', methods=['DELETE'])
@login_required
def remove_from_cart(item_id):
    cart_item = CartItem.query.get_or_404(item_id)
    cart = Cart.query.filter_by(user_id=current_user.id).first()

    if cart and cart_item.cart_id == cart.id:
        db.session.delete(cart_item)
        db.session.commit()
        return jsonify({'success': True, 'message': 'Item removed from cart'})

    return jsonify({'success': False, 'message': 'Not authorized to remove this item'}), 403


# ---------------------------------------------------------------------------
# Checkout
# ---------------------------------------------------------------------------

@api_bp.route('/checkout/create-order', methods=['POST'])
@login_required
@limiter.limit("10 per minute")
def create_checkout_order():
    cart = Cart.query.filter_by(user_id=current_user.id).first()
    if not cart:
        return jsonify({'success': False, 'message': 'Your cart is empty'}), 400

    cart_items = db.session.query(CartItem, Script).join(
        Script, CartItem.script_id == Script.id
    ).filter(CartItem.cart_id == cart.id).all()

    if not cart_items:
        return jsonify({'success': False, 'message': 'Your cart is empty'}), 400

    # Reject any inactive scripts before computing total.
    for _ci, s in cart_items:
        if not s.is_active:
            return jsonify({'success': False, 'message': 'One or more cart items are no longer available.'}), 400

    total = get_cart_total(cart.id)
    if total <= 0:
        return jsonify({'success': False, 'message': 'Invalid order total.'}), 400

    try:
        stale_cutoff = datetime.now(timezone.utc) - timedelta(minutes=30)
        stale_orders = Order.query.filter(
            Order.user_id == current_user.id,
            Order.status == 'pending',
            Order.created_at < stale_cutoff,
        ).all()
        for stale_order in stale_orders:
            stale_order.status = 'expired'
        if stale_orders:
            db.session.flush()

        order = Order(user_id=current_user.id, total_amount=total, status='pending')
        db.session.add(order)
        db.session.flush()

        for cart_item, script in cart_items:
            price = script.price_yearly if cart_item.subscription_type == 'yearly' else script.price_monthly
            order_item = OrderItem(
                order_id=order.id,
                script_id=script.id,
                price=price,
                subscription_type=cart_item.subscription_type,
            )
            db.session.add(order_item)

        razorpay_response = create_razorpay_order(order.id, total)
        order.razorpay_order_id = razorpay_response['order_id']
        db.session.commit()

        return jsonify({
            'success': True,
            'key_id': razorpay_response['key_id'],
            'order_id': razorpay_response['order_id'],
            'amount': razorpay_response['amount'],
            'currency': razorpay_response['currency'],
            'user': {
                'name': f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.username,
                'email': current_user.email,
            }
        })
    except Exception:
        logger.exception("Error creating order")
        db.session.rollback()
        return jsonify({'success': False, 'message': 'Technical difficulties creating order.'}), 503


@api_bp.route('/checkout/verify', methods=['POST'])
@login_required
@limiter.limit("20 per minute")
def verify_payment():
    try:
        payment_data = request.get_json(silent=True) or {}
        razorpay_payment_id = payment_data.get('razorpay_payment_id')
        razorpay_order_id = payment_data.get('razorpay_order_id')
        razorpay_signature = payment_data.get('razorpay_signature')

        if not (razorpay_order_id and razorpay_payment_id and razorpay_signature):
            return jsonify({'success': False, 'message': 'Incomplete payment data'}), 400

        client = razorpay.Client(
            auth=(current_app.config['RAZORPAY_KEY_ID'], current_app.config['RAZORPAY_KEY_SECRET'])
        )
        params_dict = {
            'razorpay_order_id': razorpay_order_id,
            'razorpay_payment_id': razorpay_payment_id,
            'razorpay_signature': razorpay_signature,
        }
        # Raises if signature invalid → exception path returns generic failure.
        client.utility.verify_payment_signature(params_dict)

        order = Order.query.filter_by(razorpay_order_id=razorpay_order_id).first()
        if not order or order.user_id != current_user.id:
            return jsonify({'success': False, 'message': 'Order not found'}), 404

        if order.status == 'completed':
            return jsonify({'success': True, 'message': 'Payment already processed.'})

        order.razorpay_payment_id = razorpay_payment_id
        order.status = 'completed'

        granted_script_names = []
        for order_item in order.items:
            existing_us = UserScript.query.filter_by(
                user_id=current_user.id,
                script_id=order_item.script_id,
                order_id=order.id,
            ).first()
            if existing_us:
                continue

            expires_at = datetime.now(timezone.utc) + (
                timedelta(days=365) if order_item.subscription_type == 'yearly' else timedelta(days=30)
            )
            user_script = UserScript(
                user_id=current_user.id,
                script_id=order_item.script_id,
                order_id=order.id,
                approval_status='pending',
                tradingview_id=current_user.tradingview_id,
                subscription_type=order_item.subscription_type,
                expires_at=expires_at,
            )
            db.session.add(user_script)
            s = Script.query.get(order_item.script_id)
            if s:
                granted_script_names.append(s.name)

        cart = Cart.query.filter_by(user_id=current_user.id).first()
        if cart:
            CartItem.query.filter_by(cart_id=cart.id).delete()

        order_total = float(order.total_amount)
        user_email = current_user.email
        db.session.commit()

        # Notify admin out-of-band. Pre-extract everything we need before launching the thread
        # so we don't depend on a detached SQLAlchemy session inside the worker.
        from threading import Thread
        app_obj = current_app._get_current_object()

        def _notify(app, email, names, total_amount):
            with app.app_context():
                from helpers import send_payment_notification_email
                for name in names:
                    try:
                        send_payment_notification_email(email, name, total_amount)
                    except Exception:
                        logger.exception("Error sending payment notification email")

        Thread(target=_notify, args=(app_obj, user_email, list(granted_script_names), order_total), daemon=True).start()

        return jsonify({'success': True, 'message': 'Payment verified successfully!'})

    except razorpay.errors.SignatureVerificationError:
        db.session.rollback()
        logger.warning("Razorpay signature verification failed.")
        return jsonify({'success': False, 'message': 'Payment verification failed'}), 400
    except Exception:
        db.session.rollback()
        logger.exception("Payment verification error")
        return jsonify({'success': False, 'message': 'Payment verification failed'}), 500


# ---------------------------------------------------------------------------
# Demo / trial requests
# ---------------------------------------------------------------------------

@api_bp.route('/demo-requests', methods=['POST'])
@limiter.limit("5 per hour")
def submit_demo_request():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    phone = (data.get('phone') or '').strip()
    tradingview_id = (data.get('tradingview_id') or '').strip()
    message = (data.get('message') or '').strip()
    script_id = data.get('script_id')

    # If the user is authenticated, prefer their canonical details.
    user_id = None
    if current_user.is_authenticated:
        user_id = current_user.id
        if not name:
            name = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.username
        if not email:
            email = (current_user.email or '').lower()
        if not tradingview_id:
            tradingview_id = current_user.tradingview_id or ''

    if not name or not email:
        return jsonify({'success': False, 'message': 'Name and email are required.'}), 400
    if len(name) > MAX_NAME_LEN * 2:
        return jsonify({'success': False, 'message': 'Name is too long.'}), 400
    if len(email) > MAX_EMAIL_LEN or not is_valid_email(email):
        return jsonify({'success': False, 'message': 'Please provide a valid email address.'}), 400
    if phone and len(phone) > MAX_PHONE_LEN:
        return jsonify({'success': False, 'message': 'Phone number is too long.'}), 400
    if tradingview_id and len(tradingview_id) > MAX_TRADINGVIEW_ID_LEN:
        return jsonify({'success': False, 'message': 'TradingView ID is too long.'}), 400
    if message and len(message) > DEMO_MESSAGE_MAX:
        return jsonify({'success': False, 'message': 'Message is too long.'}), 400

    # Validate optional script association.
    if script_id is not None:
        try:
            script_id = int(script_id)
        except (TypeError, ValueError):
            return jsonify({'success': False, 'message': 'Invalid script reference.'}), 400
        script = Script.query.get(script_id)
        if not script or not script.is_active:
            return jsonify({'success': False, 'message': 'Selected resource is not available.'}), 400

    # Prevent duplicate requests from the same authenticated user for the same
    # resource (script_id) or the same platform-wide demo (script_id IS NULL).
    # Only "rejected" requests are eligible to re-submit.
    if user_id is not None:
        dup_q = DemoRequest.query.filter(
            DemoRequest.user_id == user_id,
            DemoRequest.status != 'rejected',
        )
        if script_id is None:
            dup_q = dup_q.filter(DemoRequest.script_id.is_(None))
        else:
            dup_q = dup_q.filter(DemoRequest.script_id == script_id)
        if dup_q.first() is not None:
            return jsonify({
                'success': False,
                'already_requested': True,
                'message': 'You have already requested a demo for this resource.',
            }), 409

    try:
        demo = DemoRequest(
            user_id=user_id,
            script_id=script_id,
            name=name,
            email=email,
            phone=phone or None,
            tradingview_id=tradingview_id or None,
            message=message or None,
            status='pending',
        )
        db.session.add(demo)
        db.session.commit()
        return jsonify({
            'success': True,
            'message': 'Demo request received. Our team will reach out to schedule your trial.'
        })
    except Exception:
        db.session.rollback()
        logger.exception("Demo request submission failed")
        return jsonify({'success': False, 'message': 'Could not submit demo request. Please try again later.'}), 500


@api_bp.route('/demo-requests/mine', methods=['GET'])
@login_required
def my_demo_requests():
    """List demo requests submitted by the current user."""
    rows = DemoRequest.query.filter_by(user_id=current_user.id).order_by(DemoRequest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'requests': [{
            'id': r.id,
            'script_id': r.script_id,
            'script_name': r.script.name if r.script else None,
            'status': r.status,
            'created_at': r.created_at.isoformat(),
            'message': r.message,
            'admin_notes': r.admin_notes,
        } for r in rows]
    })
