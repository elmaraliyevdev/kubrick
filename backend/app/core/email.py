import httpx
import os

POSTMARK_API_KEY = os.getenv("POSTMARK_API_KEY")
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL")
POSTMARK_OTP_TEMPLATE_ID = os.getenv("POSTMARK_OTP_TEMPLATE_ID")
POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID = os.getenv("POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID")

# Check if Postmark is configured
POSTMARK_ENABLED = bool(POSTMARK_API_KEY and POSTMARK_FROM_EMAIL and POSTMARK_OTP_TEMPLATE_ID)

if POSTMARK_ENABLED:
    POSTMARK_OTP_TEMPLATE_ID = int(POSTMARK_OTP_TEMPLATE_ID)
    
    # Use the same template for email verification if not specified
    if POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID:
        POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID = int(POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID)
    else:
        POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID = POSTMARK_OTP_TEMPLATE_ID
else:
    print("⚠️  WARNING: Postmark email service not configured. Emails will be mocked (printed to console).")
    POSTMARK_OTP_TEMPLATE_ID = 0
    POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID = 0

async def send_template_email(to_email: str, template_id: int, model: dict):
    # Mock email sending if Postmark is not configured
    if not POSTMARK_ENABLED:
        print(f"📧 MOCK EMAIL to {to_email}")
        print(f"   Template ID: {template_id}")
        print(f"   Data: {model}")
        return {"MessageID": "mock-message-id", "SubmittedAt": "2024-01-01T00:00:00Z", "To": to_email}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.postmarkapp.com/email/withTemplate",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": POSTMARK_API_KEY,
            },
            json={
                "From": POSTMARK_FROM_EMAIL,
                "To": to_email,
                "TemplateId": template_id,
                "TemplateModel": model,
                "MessageStream": "outbound",
            },
        )
        if response.status_code >= 400:
            print("Postmark error:", response.text)
        response.raise_for_status()
        return response.json()

async def send_login_otp(email: str, code: str):
    """Send OTP code for login"""
    return await send_template_email(
        to_email=email,
        template_id=POSTMARK_OTP_TEMPLATE_ID,
        model={"code": code}
    )

async def send_email_verification(email: str, code: str):
    """Send email verification code for registration"""
    return await send_template_email(
        to_email=email,
        template_id=POSTMARK_EMAIL_VERIFICATION_TEMPLATE_ID,
        model={"code": code}
    )

async def send_password_reset_otp(email: str, code: str):
    """Send OTP code for password reset"""
    return await send_template_email(
        to_email=email,
        template_id=POSTMARK_OTP_TEMPLATE_ID,
        model={"code": code}
    )

async def send_invite_email(email: str, invite_token: str, org_name: str, invited_by: str):
    """Send organization invite email"""
    invite_url = f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}/signup?invite={invite_token}"
    return await send_template_email(
        to_email=email,
        template_id=POSTMARK_OTP_TEMPLATE_ID,
        model={
            "code": f"You've been invited to join {org_name} on Kubrick HR by {invited_by}. Visit: {invite_url}",
        }
    )