import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.token_blacklist import TokenBlacklist
from app.db.models.refresh_token import RefreshToken

# Cookie-based auth: httpOnly JWTs + optional Bearer fallback. CSRF posture (SameSite, CORS, optional tokens)
# is documented in the repo at docs/CSRF-and-auth.md.

# Security configuration from environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Enhanced password hashing with higher rounds for security
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-password", auto_error=False)


def get_db():
    try:
        db = SessionLocal()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable. Please try again later.",
        )
    try:
        yield db
    except OperationalError:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Service temporarily unavailable. Please try again later.",
        )
    finally:
        db.close()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, hashed: str) -> bool:
    return pwd_context.verify(password, hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token with JTI for revocation."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    jti = str(uuid.uuid4())

    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": jti,
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, db: Session, ip_address: str = None, user_agent: str = None) -> str:
    """Create a secure refresh token and store it in the database."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    db.add(refresh_token)
    db.commit()

    return token


def is_token_blacklisted(jti: str, db: Session) -> bool:
    """Check if a token is blacklisted."""
    blacklisted = db.query(TokenBlacklist).filter(
        TokenBlacklist.jti == jti,
        TokenBlacklist.expires_at > datetime.utcnow(),
    ).first()
    return blacklisted is not None


def blacklist_token(jti: str, token_type: str, user_id: int, expires_at: datetime, db: Session, reason: str = None):
    """Add a token to the blacklist."""
    blacklist_entry = TokenBlacklist(
        jti=jti,
        token_type=token_type,
        user_id=user_id,
        expires_at=expires_at,
        reason=reason,
    )
    db.add(blacklist_entry)
    db.commit()


def validate_refresh_token(token: str, db: Session) -> Optional[RefreshToken]:
    """Validate and return refresh token if valid."""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.is_active == True,
        RefreshToken.expires_at > datetime.utcnow(),
    ).first()

    if refresh_token:
        refresh_token.last_used_at = datetime.utcnow()
        db.commit()

    return refresh_token


def revoke_refresh_token(token: str, db: Session) -> bool:
    """Revoke a refresh token."""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.is_active == True,
    ).first()

    if refresh_token:
        refresh_token.is_active = False
        db.commit()
        return True
    return False


def revoke_all_user_refresh_tokens(user_id: int, db: Session):
    """Revoke all active refresh tokens for a user."""
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.is_active == True,
    ).update({"is_active": False})
    db.commit()


# --- Environment / cookie helpers ---

ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"

# Must match `app.include_router(auth.router, prefix="/api/auth")` — refresh is only sent to URLs under this path.
REFRESH_COOKIE_PATH = "/api/auth"


def _is_secure_request(request: Request = None) -> bool:
    if IS_PRODUCTION:
        return True
    if request and request.headers.get("x-forwarded-proto") == "https":
        return True
    return False


def _resolve_auth_cookie_attributes(request: Optional[Request]) -> Tuple[bool, str, Optional[str]]:
    """
    Returns (secure, samesite, domain) for Set-Cookie.

    - AUTH_COOKIE_DOMAIN: optional e.g. `.example.com` so cookies work across `app.*` and `api.*`.
      Omit for host-only cookies (typical for localhost / single-host API).
    - AUTH_COOKIE_SAMESITE: `lax` (default), `strict`, or `none`.
      Use `none` only when the SPA and API are on different sites and you need cross-site credentialed
      requests; browsers require `Secure` with `SameSite=None` (we force secure=True in that case).
    """
    secure = _is_secure_request(request)
    raw = (os.getenv("AUTH_COOKIE_SAMESITE") or "lax").strip().lower()
    if raw not in ("lax", "strict", "none"):
        raw = "lax"
    if raw == "none":
        secure = True
    domain = (os.getenv("AUTH_COOKIE_DOMAIN") or "").strip() or None
    return secure, raw, domain


def _apply_set_cookie(
    response: Response,
    *,
    key: str,
    value: str,
    max_age: int,
    path: str,
    request: Optional[Request],
) -> None:
    secure, samesite, domain = _resolve_auth_cookie_attributes(request)
    if domain:
        response.set_cookie(
            key=key,
            value=value,
            max_age=max_age,
            path=path,
            domain=domain,
            httponly=True,
            secure=secure,
            samesite=samesite,
        )
    else:
        response.set_cookie(
            key=key,
            value=value,
            max_age=max_age,
            path=path,
            httponly=True,
            secure=secure,
            samesite=samesite,
        )


def _apply_delete_cookie(
    response: Response,
    *,
    key: str,
    path: str,
    request: Optional[Request],
) -> None:
    secure, samesite, domain = _resolve_auth_cookie_attributes(request)
    if domain:
        response.delete_cookie(
            key,
            path=path,
            domain=domain,
            httponly=True,
            secure=secure,
            samesite=samesite,
        )
    else:
        response.delete_cookie(
            key,
            path=path,
            httponly=True,
            secure=secure,
            samesite=samesite,
        )


def set_auth_cookies(response: Response, access_token: str, refresh_token: str, request: Request = None) -> None:
    """Set both access and refresh token cookies."""
    _apply_set_cookie(
        response,
        key="access_token",
        value=access_token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        request=request,
    )
    _apply_set_cookie(
        response,
        key="refresh_token",
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        path=REFRESH_COOKIE_PATH,
        request=request,
    )


# Keep backward compat for any code still using set_auth_cookie
def set_auth_cookie(response: Response, token: str, request: Request = None) -> None:
    """Set JWT token as an httpOnly cookie (access token only)."""
    _apply_set_cookie(
        response,
        key="access_token",
        value=token,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
        request=request,
    )


def clear_auth_cookies(response: Response, request: Request = None) -> None:
    """Clear both auth cookies (must match same path/domain/samesite as when set)."""
    _apply_delete_cookie(response, key="access_token", path="/", request=request)
    _apply_delete_cookie(response, key="refresh_token", path=REFRESH_COOKIE_PATH, request=request)


# Keep backward compat
def clear_auth_cookie(response: Response, request: Request = None) -> None:
    clear_auth_cookies(response, request)


def _extract_token(request: Request, oauth2_token: Optional[str] = None) -> str:
    """Extract token from cookie first, then fall back to Authorization header."""
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    if oauth2_token:
        return oauth2_token
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    request: Request,
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    resolved_token = _extract_token(request, token)

    try:
        payload = jwt.decode(resolved_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        jti: str = payload.get("jti")
        token_type: str = payload.get("type")

        if email is None or jti is None or token_type != "access":
            raise credentials_exception

        if is_token_blacklisted(jti, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise credentials_exception
    return user


ORG_MEMBERSHIP_REQUIRED_DETAIL = (
    "You must belong to an organization to access this resource"
)


def require_org_member(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Tenant scope for B2B routes: require `organization_id` before running queries that
    filter by it. Without this, `column == None` can match NULL rows and leak data across tenants.
    """
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ORG_MEMBERSHIP_REQUIRED_DETAIL,
        )
    return current_user


def logout_user(token: str, db: Session) -> bool:
    """Logout user by blacklisting their current token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        user_email = payload.get("sub")
        expires_at = datetime.fromtimestamp(payload.get("exp"))

        if jti and user_email:
            user = db.query(User).filter(User.email == user_email).first()
            if user:
                blacklist_token(jti, "access", user.id, expires_at, db, "logout")
                return True
    except JWTError:
        pass

    return False
