import secrets
import hashlib
import hmac
from datetime import datetime, timezone
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import logging

logger = logging.getLogger(__name__)


def _new_session_token() -> str:
    """Random per-user token included in the Flask-Login session id.
    Rotating it invalidates every existing session for that user."""
    return secrets.token_hex(32)


class User(UserMixin, db.Model):
    """User model for regular platform users"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(64))
    last_name = db.Column(db.String(64))
    tradingview_id = db.Column(db.String(128), comment='TradingView Username')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)
    # Rotated on password change/reset to invalidate all other sessions.
    session_token = db.Column(db.String(64), default=_new_session_token, nullable=True)

    # Relationships
    orders = db.relationship('Order', backref='user', lazy=True)
    cart = db.relationship('Cart', backref='user', uselist=False, lazy=True)

    def set_password(self, password):
        """Set password hash and rotate session token so other sessions are invalidated."""
        self.password_hash = generate_password_hash(password)
        self.session_token = _new_session_token()

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_id(self):
        """Encode user id + current session token into the Flask-Login session.
        load_user verifies the token, so a stale cookie (after password change) fails."""
        return f"u:{self.id}:{self.session_token or ''}"

    def __repr__(self):
        return f'<User {self.username}>'


class Admin(UserMixin, db.Model):
    """Admin model for platform administrators"""
    __tablename__ = 'admins'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)
    session_token = db.Column(db.String(64), default=_new_session_token, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        self.session_token = _new_session_token()

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def get_id(self):
        """Admin doesn't use Flask-Login (session-based) but keep this for safety."""
        return f"admin_{self.id}"

    def __repr__(self):
        return f'<Admin {self.username}>'

    @staticmethod
    def create_default_admin():
        """Create default admin user if not exists"""
        import os
        admin = Admin.query.filter_by(username="admin").first()
        if not admin:
            admin_password = os.environ.get('ADMIN_DEFAULT_PASSWORD')
            if not admin_password:
                admin_password = secrets.token_urlsafe(24)
                logger.info("Generated new default admin password. (Hidden for security).")
                logger.info("Set ADMIN_DEFAULT_PASSWORD env var to use a fixed password.")
            admin = Admin(username="admin", email=os.environ.get('ADMIN_EMAIL', 'admin@example.com'))
            admin.set_password(admin_password)
            db.session.add(admin)
            db.session.commit()
            return admin
        return None


class Script(db.Model):
    """Model for trading scripts"""
    __tablename__ = 'scripts'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text)
    price_monthly = db.Column(db.Float, nullable=False)
    price_yearly = db.Column(db.Float, nullable=False)
    image_url = db.Column(db.String(256))
    features = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    is_active = db.Column(db.Boolean, default=True)

    order_items = db.relationship('OrderItem', backref='script', lazy=True)
    cart_items = db.relationship('CartItem', backref='script', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Script {self.name}>'

    def get_price(self, subscription_type):
        if subscription_type == 'yearly':
            return self.price_yearly
        return self.price_monthly

    def calculate_yearly_savings(self):
        if not self.price_monthly or not self.price_yearly:
            return 0
        monthly_annual = self.price_monthly * 12
        if monthly_annual <= 0:
            return 0
        savings = ((monthly_annual - self.price_yearly) / monthly_annual) * 100
        return round(savings)


class UserScript(db.Model):
    """Many-to-many relationship between users and their approved scripts"""
    __tablename__ = 'user_scripts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    approval_status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    approved_at = db.Column(db.DateTime)
    approved_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)
    tradingview_id = db.Column(db.String(128), comment='TradingView Username')
    subscription_type = db.Column(db.String(20), default='monthly')
    expires_at = db.Column(db.DateTime)

    user = db.relationship('User', backref=db.backref('user_scripts', lazy=True))
    script = db.relationship('Script', backref=db.backref('user_scripts', lazy=True))
    order = db.relationship('Order', backref=db.backref('user_scripts', lazy=True))
    approver = db.relationship('Admin', foreign_keys=[approved_by])

    def is_subscription_expired(self):
        if not self.expires_at:
            return False
        expires = self.expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) > expires

    def __repr__(self):
        return f'<UserScript {self.user_id}:{self.script_id}>'


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    razorpay_order_id = db.Column(db.String(128), unique=True, index=True)
    razorpay_payment_id = db.Column(db.String(128))
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = db.relationship('OrderItem', backref='order', lazy=True)

    def __repr__(self):
        return f'<Order {self.id}>'


class OrderItem(db.Model):
    __tablename__ = 'order_items'

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('orders.id'), nullable=False)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False)
    price = db.Column(db.Float, nullable=False)
    subscription_type = db.Column(db.String(20), default='monthly')

    def __repr__(self):
        return f'<OrderItem {self.id}>'


class Cart(db.Model):
    __tablename__ = 'carts'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, unique=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    items = db.relationship('CartItem', backref='cart', lazy=True)

    def __repr__(self):
        return f'<Cart {self.id}>'


class CartItem(db.Model):
    __tablename__ = 'cart_items'

    id = db.Column(db.Integer, primary_key=True)
    cart_id = db.Column(db.Integer, db.ForeignKey('carts.id'), nullable=False)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False)
    subscription_type = db.Column(db.String(20), default='monthly')

    __table_args__ = (db.UniqueConstraint('cart_id', 'script_id', name='uq_cart_script'),)

    def __repr__(self):
        return f'<CartItem {self.id}>'


class Contact(db.Model):
    __tablename__ = 'contacts'

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(64), nullable=False)
    last_name = db.Column(db.String(64), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    def __repr__(self):
        return f'<Contact {self.email}>'


class DemoRequest(db.Model):
    """A user (or visitor) requesting a demo/trial of the platform or a specific script."""
    __tablename__ = 'demo_requests'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=True)
    name = db.Column(db.String(128), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(32))
    tradingview_id = db.Column(db.String(128))
    message = db.Column(db.Text)
    status = db.Column(db.String(20), default='pending')
    admin_notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    handled_at = db.Column(db.DateTime)
    handled_by = db.Column(db.Integer, db.ForeignKey('admins.id'), nullable=True)

    user = db.relationship('User', backref=db.backref('demo_requests', lazy=True))
    script = db.relationship('Script', backref=db.backref('demo_requests', lazy=True))
    handler = db.relationship('Admin', foreign_keys=[handled_by])

    def __repr__(self):
        return f'<DemoRequest {self.email} script={self.script_id} status={self.status}>'


class Comment(db.Model):
    """A comment/review left on a script by a user who purchased it.
    Publicly visible to everyone; only buyers of that script may post."""
    __tablename__ = 'comments'

    id = db.Column(db.Integer, primary_key=True)
    script_id = db.Column(db.Integer, db.ForeignKey('scripts.id'), nullable=False, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    # Reserved for future admin moderation — hidden comments aren't returned.
    is_hidden = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    user = db.relationship('User', backref=db.backref('comments', lazy=True))
    script = db.relationship('Script', backref=db.backref('comments', lazy=True, cascade='all, delete-orphan'))

    def __repr__(self):
        return f'<Comment {self.id} script={self.script_id} user={self.user_id}>'
