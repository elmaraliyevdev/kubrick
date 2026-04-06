import httpx
import os
import logging

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "Kubrick <noreply@kubrick.app>")

EMAIL_ENABLED = bool(RESEND_API_KEY)

if not EMAIL_ENABLED:
    print("⚠️  WARNING: Resend email service not configured. Emails will be mocked (printed to console).")


async def send_email(to_email: str, subject: str, html: str):
    """Send an email via Resend API."""
    if not EMAIL_ENABLED:
        print(f"📧 MOCK EMAIL to {to_email}")
        print(f"   Subject: {subject}")
        print(f"   Body: {html}")
        return {"id": "mock-message-id"}

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.resend.com/emails",
            headers={
                "Authorization": f"Bearer {RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "from": FROM_EMAIL,
                "to": [to_email],
                "subject": subject,
                "html": html,
            },
        )
        if response.status_code >= 400:
            logger.error(f"Resend error: {response.text}")
        response.raise_for_status()
        return response.json()


def _otp_html(code: str, heading: str, message: str) -> str:
    """Generate a clean OTP email template."""
    return f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">{heading}</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">{message}</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111;">{code}</span>
        </div>
        <p style="color: #888; font-size: 13px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
    </div>
    """


async def send_login_otp(email: str, code: str):
    """Send OTP code for login."""
    return await send_email(
        to_email=email,
        subject=f"Your login code: {code}",
        html=_otp_html(code, "Sign in to Kubrick", "Use the code below to sign in to your account."),
    )


async def send_email_verification(email: str, code: str):
    """Send email verification code for registration."""
    return await send_email(
        to_email=email,
        subject=f"Verify your email: {code}",
        html=_otp_html(code, "Verify your email", "Use the code below to verify your email address and activate your account."),
    )


async def send_password_reset_otp(email: str, code: str):
    """Send OTP code for password reset."""
    return await send_email(
        to_email=email,
        subject=f"Password reset code: {code}",
        html=_otp_html(code, "Reset your password", "Use the code below to reset your password."),
    )


async def send_email_change_verification(email: str, code: str):
    """Send OTP to confirm a new account email address."""
    return await send_email(
        to_email=email,
        subject=f"Confirm your new email: {code}",
        html=_otp_html(
            code,
            "Confirm your new email",
            "Use the code below to verify this address and update your Kubrick account email.",
        ),
    )


async def send_application_confirmation(
    candidate_email: str,
    candidate_name: str,
    job_title: str,
    org_name: str,
):
    """Send confirmation email to the candidate after they apply."""
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">Application received</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            Hi {candidate_name},
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            Your application for <strong>{job_title}</strong> at <strong>{org_name}</strong> has been received. The hiring team will review your profile and get back to you.
        </p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">Good luck!</p>
    </div>
    """
    return await send_email(
        to_email=candidate_email,
        subject=f"Application received — {job_title} at {org_name}",
        html=html,
    )


async def send_new_application_notification(
    recruiter_email: str,
    candidate_name: str,
    candidate_email_addr: str,
    job_title: str,
    org_name: str,
):
    """Notify HR/recruiters about a new application."""
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">New application received</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            <strong>{candidate_name}</strong> ({candidate_email_addr}) just applied for <strong>{job_title}</strong>.
        </p>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">
            Log in to Kubrick to review the application and candidate profile.
        </p>
    </div>
    """
    return await send_email(
        to_email=recruiter_email,
        subject=f"New application: {candidate_name} → {job_title}",
        html=html,
    )


async def send_invite_email(email: str, invite_token: str, org_name: str, invited_by: str):
    """Send organization invite email."""
    invite_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/signup?invite={invite_token}"
    html = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
        <h2 style="color: #111; margin-bottom: 8px;">You're invited to {org_name}</h2>
        <p style="color: #555; font-size: 15px; line-height: 1.5;">{invited_by} has invited you to join <strong>{org_name}</strong> on Kubrick.</p>
        <div style="margin: 24px 0;">
            <a href="{invite_url}" style="display: inline-block; background: #111; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Accept Invitation</a>
        </div>
        <p style="color: #888; font-size: 13px;">If you didn't expect this invitation, you can safely ignore this email.</p>
    </div>
    """
    return await send_email(
        to_email=email,
        subject=f"{invited_by} invited you to {org_name} on Kubrick",
        html=html,
    )
