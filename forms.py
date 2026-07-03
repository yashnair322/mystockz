from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, HiddenField, BooleanField, TextAreaField, FloatField, FileField
from flask_wtf.file import FileField, FileAllowed
from wtforms.validators import DataRequired, Email, EqualTo, Length, Optional, ValidationError
from models import User, Admin

class LoginForm(FlaskForm):
    """Form for user login"""
    username = StringField('Username', validators=[DataRequired()])
    password = PasswordField('Password', validators=[DataRequired()])
    remember_me = BooleanField('Remember Me')
    submit = SubmitField('Log In')

class RegisterForm(FlaskForm):
    """Form for initial user registration"""
    username = StringField('Username', validators=[DataRequired(), Length(min=4, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=8, max=128)])
    password_confirm = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('password')])
    first_name = StringField('First Name', validators=[Optional(), Length(max=64)])
    last_name = StringField('Last Name', validators=[Optional(), Length(max=64)])
    terms_and_conditions = BooleanField('I agree to the Terms and Conditions', validators=[DataRequired()])
    submit = SubmitField('Register')

    def validate_password(self, password):
        """Enforce password complexity: at least one digit and one uppercase letter"""
        import re
        if not re.search(r'[A-Z]', password.data):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[0-9]', password.data):
            raise ValidationError('Password must contain at least one digit.')
        if not re.search(r'[^A-Za-z0-9]', password.data):
            raise ValidationError('Password must contain at least one special character (e.g. @, #, !).')

    def validate_username(self, username):
        """Validate that username is unique and active"""
        user = User.query.filter_by(username=username.data).first()
        if user and user.is_active:
            raise ValidationError('Username already taken. Please choose a different one.')

    def validate_email(self, email):
        """Validate that email is unique and active"""
        user = User.query.filter_by(email=email.data).first()
        if user and user.is_active:
            raise ValidationError('Email already registered. Please use a different one.')

class VerificationForm(FlaskForm):
    """Form for email verification"""
    code = StringField('Verification Code', validators=[DataRequired(), Length(min=6, max=6)])
    submit = SubmitField('Verify')

class ScriptForm(FlaskForm):
    """Form for adding or editing scripts"""
    name = StringField('Script Name', validators=[DataRequired(), Length(max=128)])
    description = TextAreaField('Description', validators=[DataRequired()])
    price_monthly = FloatField('Monthly Price (INR)', validators=[DataRequired()])
    price_yearly = FloatField('Yearly Price (INR)', validators=[DataRequired()])
    image = FileField('Upload Image', validators=[Optional(), FileAllowed(['jpg', 'png', 'jpeg', 'gif'], 'Images only!')])
    image_url = StringField('Image URL', validators=[Optional()])
    features = TextAreaField('Features', validators=[Optional()])
    is_active = BooleanField('Active')
    submit = SubmitField('Save Script')

    def validate_on_submit(self, extra_validators=None):
        is_valid = super().validate_on_submit(extra_validators=extra_validators)
        if not is_valid:
            return False
        has_upload = self.image.data and hasattr(self.image.data, 'filename') and self.image.data.filename
        has_url = self.image_url.data and self.image_url.data.strip()
        if not has_upload and not has_url:
            self.image.errors = list(self.image.errors) if self.image.errors else []
            self.image.errors.append('Either upload an image or provide an image URL')
            return False
        return True

class ProfileForm(FlaskForm):
    """Form for updating user profile"""
    first_name = StringField('First Name', validators=[Optional(), Length(max=64)])
    last_name = StringField('Last Name', validators=[Optional(), Length(max=64)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    tradingview_id = StringField('TradingView Username', validators=[Optional(), Length(max=128)])
    current_password = PasswordField('Current Password', validators=[Optional()])
    new_password = PasswordField('New Password', validators=[Optional(), Length(min=8)])
    password_confirm = PasswordField('Confirm New Password', validators=[Optional(), EqualTo('new_password')])
    submit = SubmitField('Update Profile')

    def validate_new_password(self, new_password):
        """Enforce password complexity when changing password via profile"""
        if not new_password.data:
            return  # Skip validation if field is empty (no password change)
        import re
        if not re.search(r'[A-Z]', new_password.data):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[0-9]', new_password.data):
            raise ValidationError('Password must contain at least one digit.')
        if not re.search(r'[^A-Za-z0-9]', new_password.data):
            raise ValidationError('Password must contain at least one special character (e.g. @, #, !).')

class TradingViewIDForm(FlaskForm):
    """Form for submitting TradingView ID for script approval"""
    tradingview_id = StringField('TradingView ID', validators=[DataRequired(), Length(max=128)])
    script_id = HiddenField('Script ID', validators=[DataRequired()])
    submit = SubmitField('Submit for Approval')

class ApprovalForm(FlaskForm):
    """Form for admin approval of script access"""
    user_script_id = HiddenField('User Script ID', validators=[DataRequired()])
    approve = SubmitField('Approve')
    reject = SubmitField('Reject')

class AdminPasswordChangeForm(FlaskForm):
    """Form for admin password change"""
    current_password = PasswordField('Current Password', validators=[DataRequired()])
    new_password = PasswordField('New Password', validators=[DataRequired(), Length(min=8, max=128)])
    confirm_password = PasswordField('Confirm Password', validators=[DataRequired(), EqualTo('new_password')])
    submit = SubmitField('Change Password')

    def validate_new_password(self, new_password):
        """Enforce password complexity for admin accounts"""
        import re
        if not re.search(r'[A-Z]', new_password.data):
            raise ValidationError('Password must contain at least one uppercase letter.')
        if not re.search(r'[0-9]', new_password.data):
            raise ValidationError('Password must contain at least one digit.')
        if not re.search(r'[^A-Za-z0-9]', new_password.data):
            raise ValidationError('Password must contain at least one special character (e.g. @, #, !).')

class ContactForm(FlaskForm):
    """Form for contact us page"""
    first_name = StringField('First Name', validators=[DataRequired(), Length(min=1, max=64)])
    last_name = StringField('Last Name', validators=[DataRequired(), Length(min=1, max=64)])
    email = StringField('Email', validators=[DataRequired(), Email()])
    message = TextAreaField('Message', validators=[DataRequired(), Length(min=10, max=5000)])
    submit = SubmitField('Send Message')