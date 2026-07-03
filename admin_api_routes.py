import logging
import os
import hmac
from datetime import datetime, timezone
from functools import wraps
from urllib.parse import urlparse

from flask import Blueprint, jsonify, request, session, current_app
from werkzeug.utils import secure_filename

from models import Admin, User, Script, Order, UserScript, DemoRequest
from app import db
from helpers import detect_image_type

logger = logging.getLogger(__name__)

admin_api_bp = Blueprint('admin_api', __name__)

# Maximum length caps for admin-supplied text content (defence-in-depth alongside DB columns).
MAX_SCRIPT_NAME_LEN = 128
MAX_DESCRIPTION_LEN = 5000
MAX_FEATURES_LEN = 5000
MAX_IMAGE_URL_LEN = 256
# Limit a single uploaded image to 5 MB (the global MAX_CONTENT_LENGTH also caps this).
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# Map detected image kind → safe extension we'll write to disk.
_IMAGE_EXT = {'jpg': '.jpg', 'png': '.png', 'gif': '.gif'}


def admin_required_api(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        admin_id = session.get('admin_id')
        if not session.get('is_admin') or not admin_id:
            return jsonify({'success': False, 'message': 'Admin login required'}), 403

        admin = Admin.query.get(admin_id)
        if not admin or not admin.is_active:
            session.pop('admin_id', None)
            session.pop('is_admin', None)
            session.pop('admin_session_token', None)
            return jsonify({'success': False, 'message': 'Admin session expired or account deactivated.'}), 403

        # Verify per-admin session token (rotated when admin password changes).
        admin_token = session.get('admin_session_token')
        if not admin_token or not admin.session_token or not hmac.compare_digest(
            str(admin_token), str(admin.session_token)
        ):
            session.pop('admin_id', None)
            session.pop('is_admin', None)
            session.pop('admin_session_token', None)
            return jsonify({'success': False, 'message': 'Admin session invalidated. Please log in again.'}), 403
        return f(*args, **kwargs)
    return decorated_function


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_safe_image_url(url):
    """Allow only http(s) URLs; reject schemes like javascript:, data:, file:, etc."""
    if not url:
        return False
    if len(url) > MAX_IMAGE_URL_LEN:
        return False
    try:
        parsed = urlparse(url)
    except Exception:
        return False
    if parsed.scheme not in ('http', 'https'):
        return False
    if not parsed.netloc:
        return False
    return True


def _parse_price(raw, field_name):
    """Parse a non-negative finite float price. Returns (value, error_msg)."""
    try:
        val = float(raw)
    except (TypeError, ValueError):
        return None, f'Invalid value for {field_name}.'
    import math
    if math.isnan(val) or math.isinf(val):
        return None, f'Invalid value for {field_name}.'
    if val < 0 or val > 10_000_000:
        return None, f'{field_name} is out of allowed range.'
    return val, None


def _save_uploaded_image(file_storage, base_name):
    """Validate by magic bytes, enforce size, write under static/uploads/scripts.
    Returns (image_url, error_msg)."""
    # Enforce size by streaming-read up to limit (also gated by MAX_CONTENT_LENGTH).
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)
    if size <= 0:
        return None, 'Uploaded file is empty.'
    if size > MAX_IMAGE_BYTES:
        return None, 'Uploaded file is too large.'

    kind = detect_image_type(file_storage)
    if kind not in _IMAGE_EXT:
        return None, 'Invalid image. Only JPG, PNG, or GIF are allowed.'
    ext = _IMAGE_EXT[kind]

    safe_base = (base_name or 'script').lower().replace(' ', '_')
    new_filename = secure_filename(f"{safe_base}_{int(datetime.now(timezone.utc).timestamp())}{ext}")
    if not new_filename:
        new_filename = f"script_{int(datetime.now(timezone.utc).timestamp())}{ext}"

    upload_dir = os.path.join(current_app.root_path, 'static', 'uploads', 'scripts')
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, new_filename)
    file_storage.save(file_path)
    return f'/static/uploads/scripts/{new_filename}', None


def _form_truthy(value):
    return str(value).strip().lower() in ('true', '1', 't', 'yes', 'on')


# ---------------------------------------------------------------------------
# Dashboard / users / scripts / orders / approvals
# ---------------------------------------------------------------------------

@admin_api_bp.route('/dashboard', methods=['GET'])
@admin_required_api
def get_dashboard_stats():
    user_count = User.query.count()
    script_count = Script.query.count()
    order_count = Order.query.filter_by(status='completed').count()
    pending_approvals = UserScript.query.filter_by(approval_status='pending').count()
    pending_demo_requests = DemoRequest.query.filter_by(status='pending').count()
    total_revenue = db.session.query(db.func.sum(Order.total_amount)).filter_by(status='completed').scalar() or 0

    recent_orders = Order.query.order_by(Order.created_at.desc()).limit(5).all()

    return jsonify({
        'success': True,
        'stats': {
            'user_count': user_count,
            'script_count': script_count,
            'order_count': order_count,
            'pending_approvals': pending_approvals,
            'pending_demo_requests': pending_demo_requests,
            'total_revenue': float(total_revenue),
        },
        'recent_orders': [{
            'id': o.id,
            'user': o.user.username if o.user else None,
            'amount': float(o.total_amount),
            'date': o.created_at.isoformat(),
            'status': o.status,
        } for o in recent_orders]
    })


@admin_api_bp.route('/users', methods=['GET'])
@admin_required_api
def get_users():
    users = User.query.all()
    return jsonify({
        'success': True,
        'users': [{
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'is_active': u.is_active,
            'created_at': u.created_at.isoformat(),
        } for u in users]
    })


@admin_api_bp.route('/users/<int:user_id>/toggle-status', methods=['POST'])
@admin_required_api
def toggle_user_status(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    # If deactivating, also force-logout that user by rotating their session token.
    if not user.is_active:
        import secrets as _secrets
        user.session_token = _secrets.token_hex(32)
    db.session.commit()
    return jsonify({
        'success': True,
        'is_active': user.is_active,
        'message': f"User {'activated' if user.is_active else 'deactivated'} successfully",
    })


@admin_api_bp.route('/scripts', methods=['GET'])
@admin_required_api
def get_scripts():
    scripts = Script.query.all()
    return jsonify({
        'success': True,
        'scripts': [{
            'id': s.id,
            'name': s.name,
            'price_monthly': s.price_monthly,
            'price_yearly': s.price_yearly,
            'is_active': s.is_active,
            'created_at': s.created_at.isoformat(),
            'description': s.description,
            'features': s.features,
            'image_url': s.image_url,
        } for s in scripts]
    })


@admin_api_bp.route('/scripts/add', methods=['POST'])
@admin_required_api
def add_script():
    name = (request.form.get('name') or '').strip()
    description = (request.form.get('description') or '').strip()
    features = (request.form.get('features') or '').strip()
    is_active = _form_truthy(request.form.get('is_active'))

    if not name or len(name) > MAX_SCRIPT_NAME_LEN:
        return jsonify({'success': False, 'message': f'Name is required (max {MAX_SCRIPT_NAME_LEN} chars).'}), 400
    if not description or len(description) > MAX_DESCRIPTION_LEN:
        return jsonify({'success': False, 'message': f'Description is required (max {MAX_DESCRIPTION_LEN} chars).'}), 400
    if len(features) > MAX_FEATURES_LEN:
        return jsonify({'success': False, 'message': f'Features text is too long (max {MAX_FEATURES_LEN} chars).'}), 400

    price_monthly, err = _parse_price(request.form.get('price_monthly', 0), 'Monthly price')
    if err:
        return jsonify({'success': False, 'message': err}), 400
    price_yearly, err = _parse_price(request.form.get('price_yearly', 0), 'Yearly price')
    if err:
        return jsonify({'success': False, 'message': err}), 400

    image_url = ''
    uploaded = request.files.get('image')
    if uploaded and uploaded.filename:
        url, err = _save_uploaded_image(uploaded, name)
        if err:
            return jsonify({'success': False, 'message': err}), 400
        image_url = url
    else:
        url_form = (request.form.get('image_url') or '').strip()
        if url_form:
            if not _is_safe_image_url(url_form):
                return jsonify({'success': False, 'message': 'Image URL must be a valid http(s) URL.'}), 400
            image_url = url_form

    script = Script(
        name=name,
        description=description,
        price_monthly=price_monthly,
        price_yearly=price_yearly,
        image_url=image_url or None,
        features=features or None,
        is_active=is_active,
    )
    db.session.add(script)
    db.session.commit()

    if script.is_active:
        _spawn_user_notifications('new', script.id)

    return jsonify({'success': True, 'message': 'Script added successfully'})


@admin_api_bp.route('/scripts/edit/<int:script_id>', methods=['POST'])
@admin_required_api
def edit_script(script_id):
    script = Script.query.get_or_404(script_id)
    was_active = script.is_active

    new_name = (request.form.get('name') or '').strip()
    new_description = (request.form.get('description') or '').strip()
    new_features = (request.form.get('features') or '').strip()
    new_is_active = _form_truthy(request.form.get('is_active'))

    if not new_name or len(new_name) > MAX_SCRIPT_NAME_LEN:
        return jsonify({'success': False, 'message': f'Name is required (max {MAX_SCRIPT_NAME_LEN} chars).'}), 400
    if not new_description or len(new_description) > MAX_DESCRIPTION_LEN:
        return jsonify({'success': False, 'message': f'Description is required (max {MAX_DESCRIPTION_LEN} chars).'}), 400
    if len(new_features) > MAX_FEATURES_LEN:
        return jsonify({'success': False, 'message': f'Features text is too long.'}), 400

    price_monthly, err = _parse_price(request.form.get('price_monthly', 0), 'Monthly price')
    if err:
        return jsonify({'success': False, 'message': err}), 400
    price_yearly, err = _parse_price(request.form.get('price_yearly', 0), 'Yearly price')
    if err:
        return jsonify({'success': False, 'message': err}), 400

    # Image: either new upload, or new URL, or unchanged.
    uploaded = request.files.get('image')
    new_image_url = None
    if uploaded and uploaded.filename:
        url, e = _save_uploaded_image(uploaded, new_name)
        if e:
            return jsonify({'success': False, 'message': e}), 400
        new_image_url = url
    else:
        url_form = request.form.get('image_url')
        if url_form is not None:
            url_form = url_form.strip()
            if url_form:
                if not _is_safe_image_url(url_form):
                    return jsonify({'success': False, 'message': 'Image URL must be a valid http(s) URL.'}), 400
                new_image_url = url_form

    script.name = new_name
    script.description = new_description
    script.price_monthly = price_monthly
    script.price_yearly = price_yearly
    script.features = new_features or None
    script.is_active = new_is_active
    if new_image_url is not None:
        script.image_url = new_image_url
    script.updated_at = datetime.now(timezone.utc)
    db.session.commit()

    if not was_active and script.is_active:
        _spawn_user_notifications('new', script.id)
    elif was_active and not script.is_active:
        _spawn_user_notifications('deactivation', script.id)

    return jsonify({'success': True, 'message': 'Script updated successfully'})


def _spawn_user_notifications(kind, script_id):
    """Spin up an async notifier worker. All data is pre-extracted from the
    current request/session so the worker doesn't depend on the request context."""
    from threading import Thread

    script = Script.query.get(script_id)
    if not script:
        return
    script_name = script.name
    script_desc = script.description
    app_obj = current_app._get_current_object()

    def _worker():
        with app_obj.app_context():
            from helpers import (
                send_new_strategy_notification,
                send_script_deactivation_notification,
            )
            users = User.query.filter_by(is_active=True).all()
            for u in users:
                try:
                    if kind == 'new':
                        send_new_strategy_notification(u.email, script_name, script_desc)
                    elif kind == 'deactivation':
                        send_script_deactivation_notification(u.email, script_name)
                except Exception:
                    logger.exception("Failed to send notification")

    Thread(target=_worker, daemon=True).start()


@admin_api_bp.route('/orders', methods=['GET'])
@admin_required_api
def get_orders():
    orders = Order.query.order_by(Order.created_at.desc()).all()
    return jsonify({
        'success': True,
        'orders': [{
            'id': o.id,
            'user_email': o.user.email if o.user else None,
            'user_name': f"{o.user.first_name or ''} {o.user.last_name or ''}".strip() if o.user else None,
            'amount': float(o.total_amount),
            'status': o.status,
            'created_at': o.created_at.isoformat(),
            'razorpay_order_id': o.razorpay_order_id,
            'razorpay_payment_id': o.razorpay_payment_id,
        } for o in orders]
    })


@admin_api_bp.route('/approvals', methods=['GET'])
@admin_required_api
def get_approvals():
    approvals = UserScript.query.order_by(UserScript.created_at.desc()).all()
    return jsonify({
        'success': True,
        'approvals': [{
            'id': a.id,
            'user_email': a.user.email if a.user else None,
            'script_name': a.script.name if a.script else None,
            'tradingview_id': a.tradingview_id,
            'status': a.approval_status,
            'created_at': a.created_at.isoformat(),
        } for a in approvals]
    })


@admin_api_bp.route('/approvals/<int:approval_id>', methods=['POST'])
@admin_required_api
def update_approval(approval_id):
    approval = UserScript.query.get_or_404(approval_id)
    data = request.get_json(silent=True) or {}
    action = data.get('action')

    if action not in ('approve', 'reject'):
        return jsonify({'success': False, 'message': 'Invalid action'}), 400

    if action == 'approve':
        approval.approval_status = 'approved'
        approval.approved_at = datetime.now(timezone.utc)
        approval.approved_by = session.get('admin_id')
        db.session.commit()
        try:
            from helpers import send_approval_email
            if approval.user and approval.script:
                send_approval_email(approval.user.email, approval.script.name)
        except Exception:
            logger.exception("Failed to send approval email")
        return jsonify({'success': True, 'message': 'Approved successfully'})

    # reject
    approval.approval_status = 'rejected'
    db.session.commit()
    try:
        from helpers import send_rejection_email
        if approval.user and approval.script:
            send_rejection_email(approval.user.email, approval.script.name)
    except Exception:
        logger.exception("Failed to send rejection email")
    return jsonify({'success': True, 'message': 'Rejected successfully'})


# ---------------------------------------------------------------------------
# Demo / trial requests (admin)
# ---------------------------------------------------------------------------

_DEMO_STATUSES = ('pending', 'scheduled', 'completed', 'rejected')
_DEMO_NOTES_MAX = 5000


@admin_api_bp.route('/demo-requests', methods=['GET'])
@admin_required_api
def list_demo_requests():
    status = request.args.get('status')
    query = DemoRequest.query
    if status and status in _DEMO_STATUSES:
        query = query.filter_by(status=status)
    rows = query.order_by(DemoRequest.created_at.desc()).all()
    return jsonify({
        'success': True,
        'demo_requests': [{
            'id': r.id,
            'name': r.name,
            'email': r.email,
            'phone': r.phone,
            'tradingview_id': r.tradingview_id,
            'message': r.message,
            'status': r.status,
            'admin_notes': r.admin_notes,
            'created_at': r.created_at.isoformat(),
            'handled_at': r.handled_at.isoformat() if r.handled_at else None,
            'user_id': r.user_id,
            'user_email': r.user.email if r.user else r.email,
            'script_id': r.script_id,
            'script_name': r.script.name if r.script else None,
        } for r in rows]
    })


@admin_api_bp.route('/demo-requests/<int:demo_id>', methods=['POST'])
@admin_required_api
def update_demo_request(demo_id):
    demo = DemoRequest.query.get_or_404(demo_id)
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    notes = data.get('admin_notes')

    if new_status is not None:
        if new_status not in _DEMO_STATUSES:
            return jsonify({'success': False, 'message': 'Invalid status.'}), 400
        demo.status = new_status
        if new_status != 'pending':
            demo.handled_at = datetime.now(timezone.utc)
            demo.handled_by = session.get('admin_id')

    if notes is not None:
        notes_str = str(notes).strip()
        if len(notes_str) > _DEMO_NOTES_MAX:
            return jsonify({'success': False, 'message': 'Notes are too long.'}), 400
        demo.admin_notes = notes_str or None

    db.session.commit()
    return jsonify({'success': True, 'message': 'Demo request updated.'})


@admin_api_bp.route('/demo-requests/<int:demo_id>/delete', methods=['POST'])
@admin_required_api
def delete_demo_request(demo_id):
    demo = DemoRequest.query.get_or_404(demo_id)
    db.session.delete(demo)
    db.session.commit()
    return jsonify({'success': True, 'message': 'Demo request deleted.'})
