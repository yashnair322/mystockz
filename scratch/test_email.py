
from app import app
from helpers import _send_email
import os

with app.app_context():
    to_email = app.config.get('ADMIN_EMAIL', 'yash@gmail.com')
    print(f"Attempting to send test email to {to_email}...")
    success = _send_email(to_email, "Test Email", "This is a test email from the mystockz application.")
    if success:
        print("Email sent successfully!")
    else:
        print("Failed to send email. Check the logs above.")
