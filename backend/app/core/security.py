import os
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import jwt, JWTError
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.db.models.user import User
from app.db.models.token_blacklist import TokenBlacklist
from app.db.models.refresh_token import RefreshToken

# Security configuration from environment variables
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable must be set")

ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))  # Shorter access tokens
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Enhanced password hashing with higher rounds for security
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=12  # Higher rounds for better security
)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login-password", auto_error=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
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
    jti = str(uuid.uuid4())  # Unique token identifier
    
    to_encode.update({
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access",
        "jti": jti
    })
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(user_id: int, db: Session, ip_address: str = None, user_agent: str = None) -> str:
    """Create a secure refresh token."""
    # Generate cryptographically secure random token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    
    # Store in database
    refresh_token = RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(refresh_token)
    db.commit()
    
    return token


def is_token_blacklisted(jti: str, db: Session) -> bool:
    """Check if a token is blacklisted."""
    blacklisted = db.query(TokenBlacklist).filter(
        TokenBlacklist.jti == jti,
        TokenBlacklist.expires_at > datetime.utcnow()
    ).first()
    return blacklisted is not None


def blacklist_token(jti: str, token_type: str, user_id: int, expires_at: datetime, db: Session, reason: str = None):
    """Add a token to the blacklist."""
    blacklist_entry = TokenBlacklist(
        jti=jti,
        token_type=token_type,
        user_id=user_id,
        expires_at=expires_at,
        reason=reason
    )
    db.add(blacklist_entry)
    db.commit()


def revoke_refresh_token(token: str, db: Session) -> bool:
    """Revoke a refresh token."""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.is_active == True
    ).first()
    
    if refresh_token:
        refresh_token.is_active = False
        db.commit()
        return True
    return False


def validate_refresh_token(token: str, db: Session) -> Optional[RefreshToken]:
    """Validate and return refresh token if valid."""
    refresh_token = db.query(RefreshToken).filter(
        RefreshToken.token == token,
        RefreshToken.is_active == True,
        RefreshToken.expires_at > datetime.utcnow()
    ).first()
    
    if refresh_token:
        # Update last used timestamp
        refresh_token.last_used_at = datetime.utcnow()
        db.commit()
    
    return refresh_token


ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
IS_PRODUCTION = ENVIRONMENT == "production"


def _is_secure_request(request: Request = None) -> bool:
    """Determine if cookie should use Secure flag.

    In production, always use Secure. Also checks X-Forwarded-Proto
    from reverse proxy to handle TLS termination at the proxy level.
    """
    if IS_PRODUCTION:
        return True
    if request and request.headers.get("x-forwarded-proto") == "https":
        return True
    return False


def set_auth_cookie(response: Response, token: str, request: Request = None) -> None:
    """Set JWT token as an httpOnly cookie."""
    secure = _is_secure_request(request)
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=secure,
        samesite="lax" if secure else "lax",
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )


def clear_auth_cookie(response: Response, request: Request = None) -> None:
    """Clear the auth cookie on logout."""
    secure = _is_secure_request(request)
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def _extract_token(request: Request, oauth2_token: Optional[str] = None) -> str:
    """Extract token from cookie first, then fall back to Authorization header."""
    # 1. Try httpOnly cookie
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token
    # 2. Fall back to Bearer header (for backwards compatibility / mobile clients)
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

        # Check if token is blacklisted
        if is_token_blacklisted(jti, db):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has been revoked",
                headers={"WWW-Authenticate": "Bearer"},
            )

    except JWTError:
        raise credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user


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