import logging
import secrets
import hmac
import hashlib
import re
import smtplib
import socket
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from functools import wraps

import razorpay
from flask import session, redirect, url_for, flash, current_app
from app import db
from models import CartItem, Script

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────
# Auth decorators
# ──────────────────────────────────────────────────────────────

def admin_required(f):
    """Server-side admin gate. Kept for any non-JSON view that may need it."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_id = session.get('admin_id')
        if not session.get('is_admin') or not admin_id:
            flash('Admin login required', 'danger')
            return redirect(url_for('auth.admin_login'))
        from models import Admin
        admin = Admin.query.get(admin_id)
        if not admin or not admin.is_active:
            session.pop('admin_id', None)
            session.pop('is_admin', None)
            session.pop('admin_session_token', None)
            flash('Admin session expired or account deactivated.', 'danger')
            return redirect(url_for('auth.admin_login'))
        # Verify the per-admin session token (set at login). Rotates on password change.
        admin_token = session.get('admin_session_token')
        if not admin_token or not admin.session_token or not hmac.compare_digest(
            admin_token, admin.session_token
        ):
            session.pop('admin_id', None)
            session.pop('is_admin', None)
            session.pop('admin_session_token', None)
            flash('Admin session invalidated. Please log in again.', 'danger')
            return redirect(url_for('auth.admin_login'))
        return f(*args, **kwargs)
    return decorated_function


# ──────────────────────────────────────────────────────────────
# Cart helpers
# ──────────────────────────────────────────────────────────────

def get_cart_items_count(user_id):
    from models import Cart
    cart = Cart.query.filter_by(user_id=user_id).first()
    if not cart:
        return 0
    return CartItem.query.filter_by(cart_id=cart.id).count()


def get_cart_total(cart_id):
    cart_items = db.session.query(CartItem, Script).join(
        Script, CartItem.script_id == Script.id
    ).filter(CartItem.cart_id == cart_id).all()

    total = 0
    for cart_item, script in cart_items:
        price = script.price_yearly if cart_item.subscription_type == 'yearly' else script.price_monthly
        total += price
    return total


# ──────────────────────────────────────────────────────────────
# Razorpay
# ──────────────────────────────────────────────────────────────

def create_razorpay_order(order_id, amount):
    """Create a Razorpay order. Never logs the API keys (full or partial)."""
    try:
        key_id = current_app.config['RAZORPAY_KEY_ID']
        key_secret = current_app.config['RAZORPAY_KEY_SECRET']
        client = razorpay.Client(auth=(key_id, key_secret))

        amount_paise = int(round(float(amount) * 100))
        order_data = {
            "amount": amount_paise,
            "currency": "INR",
            "receipt": f"receipt#{order_id}",
            "notes": {"order_id": str(order_id)},
        }

        order = client.order.create(data=order_data)
        return {
            "key_id": key_id,
            "amount": amount_paise,
            "currency": "INR",
            "order_id": order['id'],
        }
    except Exception as e:
        # Log only the exception type — never the request, response, or credentials.
        logger.error(f"Razorpay order creation failed: {type(e).__name__}")
        raise


# ──────────────────────────────────────────────────────────────
# OTP / verification helpers
# ──────────────────────────────────────────────────────────────

def generate_verification_code():
    """6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000:06d}"


def hash_otp(code):
    """Hash the OTP using SECRET_KEY (HMAC-SHA256) so it can be safely stored in
    a signed session cookie."""
    if not code:
        return None
    secret = current_app.config['SECRET_KEY']
    if isinstance(secret, str):
        secret = secret.encode('utf-8')
    return hmac.new(secret, str(code).encode('utf-8'), hashlib.sha256).hexdigest()


def verify_otp(code, expected_hash):
    """Constant-time OTP verification."""
    if not code or not expected_hash:
        return False
    return hmac.compare_digest(hash_otp(code), str(expected_hash))


# ──────────────────────────────────────────────────────────────
# Input validation
# ──────────────────────────────────────────────────────────────

_EMAIL_RE = re.compile(r'^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$')


def is_valid_email(email):
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if len(email) > 254 or len(email) < 3:
        return False
    return bool(_EMAIL_RE.match(email))


def validate_password_complexity(password):
    """Length >= 8, at most 128; at least one digit, uppercase, special."""
    if not password or not isinstance(password, str):
        return False, "Password is required."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if len(password) > 128:
        return False, "Password is too long (max 128 characters)."
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter."
    if not re.search(r'[0-9]', password):
        return False, "Password must contain at least one digit."
    if not re.search(r'[^A-Za-z0-9]', password):
        return False, "Password must contain at least one special character."
    return True, ""


_USERNAME_RE = re.compile(r'^[A-Za-z0-9_.\-]{3,64}$')


def is_valid_username(username):
    if not username or not isinstance(username, str):
        return False
    return bool(_USERNAME_RE.match(username))


# ──────────────────────────────────────────────────────────────
# Image upload safety — content sniffing by magic bytes
# ──────────────────────────────────────────────────────────────

_IMAGE_SIGNATURES = [
    (b'\xff\xd8\xff', 'jpg'),          # JPEG
    (b'\x89PNG\r\n\x1a\n', 'png'),     # PNG
    (b'GIF87a', 'gif'),                # GIF87a
    (b'GIF89a', 'gif'),                # GIF89a
]


def detect_image_type(file_storage):
    """Return canonical extension ('jpg'/'png'/'gif') if the file's magic bytes
    match a supported image type. Otherwise return None. Always resets the
    file pointer back to the start."""
    try:
        head = file_storage.read(16)
    finally:
        try:
            file_storage.seek(0)
        except Exception:
            pass
    for sig, kind in _IMAGE_SIGNATURES:
        if head.startswith(sig):
            return kind
    return None


# ──────────────────────────────────────────────────────────────
# Email
# ──────────────────────────────────────────────────────────────

def _connect_ipv4(host, port, timeout, source_address=None):
    """Open a TCP socket to host:port over IPv4 only.

    Some container platforms (e.g. Railway) can't route IPv6 egress; when the
    mail server also has an AAAA record the default resolver may pick IPv6 and
    connect() fails with OSError errno 101 ("Network is unreachable"). Forcing
    IPv4 sidesteps that.
    """
    last_err = None
    for family, socktype, proto, _canon, sa in socket.getaddrinfo(
            host, port, socket.AF_INET, socket.SOCK_STREAM):
        sock = None
        try:
            sock = socket.socket(family, socktype, proto)
            if isinstance(timeout, (int, float)):
                sock.settimeout(timeout)
            if source_address:
                sock.bind(source_address)
            sock.connect(sa)
            return sock
        except OSError as err:
            last_err = err
            if sock is not None:
                sock.close()
    raise last_err if last_err else OSError(f"no IPv4 address for {host!r}")


class _IPv4OnlySMTP(smtplib.SMTP):
    """STARTTLS SMTP (port 587) that connects over IPv4 only. TLS still verifies
    against the original hostname because ``self._host`` is unchanged."""

    def _get_socket(self, host, port, timeout):
        return _connect_ipv4(host, port, timeout, self.source_address)


class _IPv4OnlySMTPSSL(smtplib.SMTP_SSL):
    """Implicit-SSL SMTP (port 465) that connects over IPv4 only, then wraps the
    socket in TLS verified against the original hostname."""

    def _get_socket(self, host, port, timeout):
        sock = _connect_ipv4(host, port, timeout, self.source_address)
        return self.context.wrap_socket(sock, server_hostname=self._host)


def _send_email(to_email, subject, body):
    """Send an email. Returns True on success, False on failure. No SMTP credentials
    or response payloads are ever logged."""
    stage = "init"
    try:
        mail_username = current_app.config.get('MAIL_USERNAME')
        mail_password = current_app.config.get('MAIL_PASSWORD')
        mail_server = current_app.config.get('MAIL_SERVER', 'smtp.gmail.com')
        mail_port = current_app.config.get('MAIL_PORT', 587)

        if not mail_username or not mail_password:
            logger.error("Missing SMTP credentials")
            return False
        if not is_valid_email(to_email):
            logger.error("Refusing to send to malformed email address")
            return False

        msg = MIMEMultipart()
        msg['From'] = mail_username
        msg['To'] = to_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        stage = "connect"
        # Port 465 = implicit SSL (SMTP_SSL); anything else (587) = STARTTLS.
        use_ssl = int(mail_port) == 465
        smtp_cls = _IPv4OnlySMTPSSL if use_ssl else _IPv4OnlySMTP
        with smtp_cls(mail_server, mail_port, timeout=10) as server:
            stage = "ehlo"
            server.ehlo()
            if not use_ssl:
                stage = "starttls"
                server.starttls()
                server.ehlo()
            stage = "login"
            server.login(mail_username, mail_password)
            stage = "send"
            server.send_message(msg)

        logger.info("Email dispatched.")
        return True

    except Exception as e:
        # Diagnostic detail — safe: the password is never included. The stage + errno
        # pinpoint the cause:
        #   stage 'connect' + errno 101/110/111 -> host is blocking outbound SMTP (or unreachable)
        #   stage 'starttls' (SSL error)         -> wrong port/mode (e.g. 465 with STARTTLS)
        #   stage 'login'  (SMTPAuthenticationError) -> wrong MAIL_USERNAME / MAIL_PASSWORD
        #   stage 'init'   (gaierror)            -> DNS can't resolve MAIL_SERVER
        errno = getattr(e, "errno", None)
        logger.error(
            f"Failed to send email at stage '{stage}' to "
            f"{current_app.config.get('MAIL_SERVER', 'smtp.gmail.com')}:"
            f"{current_app.config.get('MAIL_PORT', 587)} -> "
            f"{type(e).__name__} (errno={errno}): {e}"
        )
        return False


def send_verification_email(user_email, code):
    body = f"""
Dear User,

Your verification code is: {code}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Best regards,
Mystockz Team
"""
    return _send_email(user_email, "Mystockz - Email Verification", body)


def send_password_reset_email(user_email, code):
    body = f"""
Dear User,

Your password reset code is: {code}

This code will expire in 10 minutes.

If you didn't request a password reset, please ignore this email and your password will remain unchanged.

Best regards,
Mystockz Team
"""
    return _send_email(user_email, "Mystockz - Password Reset", body)


def send_payment_notification_email(user_email, script_name, amount):
    admin_email = current_app.config.get('ADMIN_EMAIL', 'admin@example.com')
    body = f"""
Dear Admin,

A new payment has been received:

User Email: {user_email}
Script: {script_name}
Amount: INR {amount}

Please review and approve the script access in the admin dashboard.

Best regards,
Team Mystockz"""
    return _send_email(admin_email, 'New Payment Received - Script Approval Required', body)


def send_approval_email(user_email, script_name):
    body = f"""
Dear Sir/Madam,

Your access to the Indicator "{script_name}" has been approved.
You can now access the Indicator from your dashboard.

Best regards,
Team Mystockz"""
    return _send_email(user_email, f'Indicator Access Approved - {script_name}', body)


def send_rejection_email(user_email, script_name):
    body = f"""
Dear Sir/Madam,

Your access to the Indicator "{script_name}" has been rejected.
Please update your TradingView ID and submit again for approval.

Best regards,
Team Mystockz"""
    return _send_email(user_email, f'Indicator Access Rejected - {script_name}', body)


def send_new_strategy_notification(user_email, strategy_name, description):
    script = Script.query.filter_by(name=strategy_name, is_active=True).first()
    if not script:
        return False

    body = f"""
Dear Trader,

We're excited to announce a new trading Indicator available on our platform!

Indicator Name: {strategy_name}

Description:
{description}

Visit our platform to learn more about this Indicator and start optimizing your trading today!

Best regards,
Team Mystockz"""
    return _send_email(user_email, f'New Trading Indicator Available - {strategy_name}', body)


def send_script_deactivation_notification(user_email, script_name):
    body = f"""
Dear Trader,

We want to inform you that the Indicator "{script_name}" has been deactivated.

You can continue using the Indicator until your current subscription expires.

Best regards,
Team Mystockz"""
    return _send_email(user_email, f'Important Update - {script_name} Indicator Deactivated', body)
