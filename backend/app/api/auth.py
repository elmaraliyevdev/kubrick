from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timedelta
import secrets
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.validation import RateLimitConfig
from app.core.security import (
    get_current_user, get_db,
    set_auth_cookies, clear_auth_cookies,
    logout_user,
    create_access_token, create_refresh_token,
    validate_refresh_token, revoke_refresh_token, revoke_all_user_refresh_tokens,
    hash_password, verify_password,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)
from app.core.email import send_login_otp, send_email_verification, send_password_reset_otp
from app.db.models.user import User
from app.db.models.otp_code import OtpCode
from app.db.models.organization import Organization
from app.schemas.user import UserCreate, UserResponse, CompleteProfileRequest, UpdateProfileRequest
from app.schemas.auth import RequestCodeRequest, VerifyCodeRequest, LoginPasswordRequest, ForgotPasswordRequest, ResetPasswordRequest
from fastapi.responses import JSONResponse

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(tags=["auth"])


def _create_auth_response(user: User, db: Session, request: Request) -> JSONResponse:
    """Create a JSON response with access + refresh token cookies set."""
    access_token = create_access_token(data={"sub": user.email})
    refresh_token = create_refresh_token(
        user_id=user.id,
        db=db,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    response = JSONResponse(content={
        "access_token": access_token,
        "token_type": "bearer",
    })
    set_auth_cookies(response, access_token, refresh_token, request)
    return response


# -------------------------
# Register
# -------------------------
@router.post("/register", response_model=UserResponse)
async def register(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    first_name = None
    last_name = None
    if user.full_name:
        name_parts = user.full_name.strip().split()
        first_name = name_parts[0] if name_parts else None
        last_name = ' '.join(name_parts[1:]) if len(name_parts) > 1 else None

    db_user = User(
        email=user.email,
        hashed_password=hash_password(user.password),
        first_name=first_name,
        last_name=last_name,
        organization_id=None,
        email_verified=False,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)

    code = str(secrets.SystemRandom().randint(100000, 999999))
    otp = OtpCode(
        email=user.email,
        code=code,
        code_type="email_verification",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    await send_email_verification(user.email, code)

    return db_user


# -------------------------
# Complete profile
# -------------------------
@router.post("/complete-profile", response_model=UserResponse)
def complete_profile(
    payload: CompleteProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Don't allow profile completion until the email is verified.
    # This ensures the user can't bypass the UI-only redirect.
    if not current_user.email_verified:
        raise HTTPException(
            status_code=403,
            detail="Email must be verified before completing your profile",
        )

    org = db.query(Organization).filter(
        Organization.name == payload.organization_name
    ).first()

    if not org:
        try:
            from app.utils.slug import generate_organization_slug
            org = Organization(name=payload.organization_name)
            org.slug = generate_organization_slug(payload.organization_name, db)
            db.add(org)
            db.flush()
        except IntegrityError:
            db.rollback()
            org = db.query(Organization).filter(
                Organization.name == payload.organization_name
            ).first()

    user_to_update = db.query(User).filter(User.id == current_user.id).first()
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    user_to_update.first_name = payload.first_name
    user_to_update.last_name = payload.last_name
    user_to_update.organization_id = org.id

    db.commit()

    updated_user = (
        db.query(User)
        .options(joinedload(User.organization))
        .filter(User.id == current_user.id)
        .first()
    )

    return updated_user


# -------------------------
# Login with password
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/login-password")
def login_password(request: Request, payload: LoginPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _create_auth_response(user, db, request)


# -------------------------
# Request OTP
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/request-code")
async def request_code(request: Request, payload: RequestCodeRequest, db: Session = Depends(get_db)):
    code = str(secrets.SystemRandom().randint(100000, 999999))

    otp = OtpCode(
        email=payload.email,
        code=code,
        code_type="login",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    await send_login_otp(payload.email, code)

    return {"message": "Verification code sent"}


# -------------------------
# Resend Email Verification
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/resend-verification")
async def resend_verification(request: Request, payload: RequestCodeRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    if user.email_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    code = str(secrets.SystemRandom().randint(100000, 999999))
    otp = OtpCode(
        email=payload.email,
        code=code,
        code_type="email_verification",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    await send_email_verification(payload.email, code)
    return {"message": "Verification code sent"}


# -------------------------
# Verify OTP
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/verify-code")
def verify_code(request: Request, payload: VerifyCodeRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(OtpCode)
        .filter(OtpCode.email == payload.email, OtpCode.code == payload.code)
        .order_by(OtpCode.expires_at.desc())
        .first()
    )

    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    otp_code_type = otp.code_type
    db.delete(otp)
    db.commit()

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User does not exist")

    if otp_code_type == "email_verification":
        if user.email_verified:
            raise HTTPException(status_code=400, detail="Email already verified")
        user.email_verified = True
        db.commit()

    return _create_auth_response(user, db, request)


# -------------------------
# Refresh token
# -------------------------
@router.post("/refresh")
def refresh_token_endpoint(request: Request, db: Session = Depends(get_db)):
    """Exchange a valid refresh token for a new access + refresh token pair."""
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")

    rt = validate_refresh_token(token, db)
    if not rt:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == rt.user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotate: revoke the old refresh token and issue a new pair
    revoke_refresh_token(token, db)

    return _create_auth_response(user, db, request)


# -------------------------
# Get current user profile
# -------------------------
@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user_with_org = (
        db.query(User)
        .options(joinedload(User.organization))
        .filter(User.id == current_user.id)
        .first()
    )
    return user_with_org


# -------------------------
# Update profile
# -------------------------
@router.put("/me", response_model=UserResponse)
def update_me(
    payload: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name

    db.commit()

    updated_user = (
        db.query(User)
        .options(joinedload(User.organization))
        .filter(User.id == current_user.id)
        .first()
    )
    return updated_user


# -------------------------
# Logout
# -------------------------
@router.post("/logout")
def logout_endpoint(request: Request, db: Session = Depends(get_db)):
    # Blacklist access token
    access_token = request.cookies.get("access_token")
    if access_token:
        logout_user(access_token, db)

    # Revoke refresh token
    refresh_token = request.cookies.get("refresh_token")
    if refresh_token:
        revoke_refresh_token(refresh_token, db)

    response = JSONResponse(content={"message": "Logged out"})
    clear_auth_cookies(response, request)
    return response


# -------------------------
# Forgot password
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/forgot-password")
async def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    message = "If an account with that email exists, a password reset code has been sent."

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        return {"message": message}

    code = str(secrets.SystemRandom().randint(100000, 999999))
    otp = OtpCode(
        email=payload.email,
        code=code,
        code_type="password_reset",
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(otp)
    db.commit()

    await send_password_reset_otp(payload.email, code)

    return {"message": message}


# -------------------------
# Reset password
# -------------------------
@limiter.limit(RateLimitConfig.get_rate('auth'))
@router.post("/reset-password")
def reset_password(request: Request, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    otp = (
        db.query(OtpCode)
        .filter(
            OtpCode.email == payload.email,
            OtpCode.code == payload.code,
            OtpCode.code_type == "password_reset",
        )
        .order_by(OtpCode.expires_at.desc())
        .first()
    )

    if not otp or otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    db.delete(otp)
    db.commit()

    user = db.query(User).filter(User.email == payload.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.hashed_password = hash_password(payload.new_password)
    db.commit()

    # Revoke all existing sessions after password change
    revoke_all_user_refresh_tokens(user.id, db)

    return {"message": "Password has been reset successfully"}
