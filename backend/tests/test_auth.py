import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient

from app.db.models.user import User
from app.db.models.otp_code import OtpCode
from app.core.security import hash_password


class TestRegistration:
    """Test user registration flow."""

    def test_register_success(self, client: TestClient, mock_email_send, db_session):
        """Test successful user registration."""
        response = client.post(
            "/api/auth/register",
            json={"email": "test@example.com", "password": "TangoRiver47!"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == "test@example.com"
        assert data["email_verified"] is False
        assert data["organization"] is None
        
        # Check user created in database
        user = db_session.query(User).filter(User.email == "test@example.com").first()
        assert user is not None
        assert user.email_verified is False
        
        # Check verification email sent
        assert len(mock_email_send) == 1
        assert mock_email_send[0]["to"] == "test@example.com"
        
        # Check OTP created
        otp = db_session.query(OtpCode).filter(OtpCode.email == "test@example.com").first()
        assert otp is not None
        assert otp.code_type == "email_verification"

    def test_register_duplicate_email(self, client: TestClient, db_session):
        """Test registration with existing email fails."""
        # Create existing user
        existing_user = User(
            email="test@example.com",
            hashed_password=hash_password("password123")
        )
        db_session.add(existing_user)
        db_session.commit()
        
        response = client.post(
            "/api/auth/register",
            json={"email": "test@example.com", "password": "TangoRiver47!"}
        )
        
        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_weak_password(self, client: TestClient):
        """Test registration with weak password fails."""
        response = client.post(
            "/api/auth/register",
            json={"email": "test@example.com", "password": "weak"}
        )
        
        assert response.status_code == 422  # Validation error


class TestEmailVerification:
    """Test email verification flow."""

    def test_verify_code_success(self, client: TestClient, db_session, mock_email_send):
        """Test successful email verification."""
        # Create user
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=False
        )
        db_session.add(user)
        db_session.commit()
        
        # Create OTP
        otp = OtpCode(
            email="test@example.com",
            code="123456",
            code_type="email_verification",
            expires_at=datetime.utcnow() + timedelta(minutes=5)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/verify-code",
            json={"email": "test@example.com", "code": "123456"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        
        # Check user marked as verified
        db_session.refresh(user)
        assert user.email_verified is True
        
        # Check OTP deleted
        otp_after = db_session.query(OtpCode).filter(OtpCode.email == "test@example.com").first()
        assert otp_after is None

    def test_verify_code_invalid(self, client: TestClient, db_session):
        """Test verification with invalid code fails."""
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=False
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post(
            "/api/auth/verify-code",
            json={"email": "test@example.com", "code": "wrong"}
        )
        
        assert response.status_code == 400
        assert "Invalid or expired" in response.json()["detail"]

    def test_verify_code_expired(self, client: TestClient, db_session):
        """Test verification with expired code fails."""
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=False
        )
        db_session.add(user)
        db_session.commit()
        
        # Create expired OTP
        otp = OtpCode(
            email="test@example.com",
            code="123456",
            code_type="email_verification",
            expires_at=datetime.utcnow() - timedelta(minutes=1)
        )
        db_session.add(otp)
        db_session.commit()
        
        response = client.post(
            "/api/auth/verify-code",
            json={"email": "test@example.com", "code": "123456"}
        )
        
        assert response.status_code == 400
        assert "Invalid or expired" in response.json()["detail"]

    def test_verify_code_already_verified_generic(self, client: TestClient, db_session):
        """Already-verified user must not get a distinct error (anti-enumeration)."""
        user = User(
            email="done@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True,
        )
        db_session.add(user)
        db_session.commit()

        otp = OtpCode(
            email="done@example.com",
            code="654321",
            code_type="email_verification",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
        )
        db_session.add(otp)
        db_session.commit()

        response = client.post(
            "/api/auth/verify-code",
            json={"email": "done@example.com", "code": "654321"},
        )
        assert response.status_code == 400
        assert response.json()["detail"] == "Invalid or expired code"

    def test_resend_verification(self, client: TestClient, db_session, mock_email_send):
        """Test resending verification email."""
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=False
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post(
            "/api/auth/resend-verification",
            json={"email": "test@example.com"}
        )
        
        assert response.status_code == 200
        assert len(mock_email_send) == 1
        
        # Check new OTP created
        otp = db_session.query(OtpCode).filter(OtpCode.email == "test@example.com").first()
        assert otp is not None
        assert otp.code_type == "email_verification"

    def test_resend_verification_unknown_email_generic(self, client: TestClient, mock_email_send):
        """Unknown email returns the same success body and sends no email (anti-enumeration)."""
        response = client.post(
            "/api/auth/resend-verification",
            json={"email": "nobody@example.com"},
        )
        assert response.status_code == 200
        assert "verification code has been sent" in response.json()["message"]
        assert len(mock_email_send) == 0

    def test_resend_verification_already_verified_generic(
        self, client: TestClient, db_session, mock_email_send
    ):
        """Verified user gets the same generic response; no new email."""
        user = User(
            email="verified@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/resend-verification",
            json={"email": "verified@example.com"},
        )
        assert response.status_code == 200
        assert "verification code has been sent" in response.json()["message"]
        assert len(mock_email_send) == 0


class TestRequestCode:
    """Login OTP request (anti-enumeration)."""

    def test_request_code_unknown_email_no_send(self, client: TestClient, mock_email_send, db_session):
        response = client.post(
            "/api/auth/request-code",
            json={"email": "missing@example.com"},
        )
        assert response.status_code == 200
        assert "verification code has been sent" in response.json()["message"]
        assert len(mock_email_send) == 0
        assert db_session.query(OtpCode).filter(OtpCode.email == "missing@example.com").first() is None

    def test_request_code_existing_user_sends(self, client: TestClient, db_session, mock_email_send):
        user = User(
            email="exists@example.com",
            hashed_password=hash_password("TestPass123"),
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/request-code",
            json={"email": "exists@example.com"},
        )
        assert response.status_code == 200
        assert "verification code has been sent" in response.json()["message"]
        assert len(mock_email_send) == 1
        otp = db_session.query(OtpCode).filter(OtpCode.email == "exists@example.com").first()
        assert otp is not None
        assert otp.code_type == "login"


class TestCompleteProfile:
    """Test profile completion flow."""

    def test_complete_profile_success(self, client: TestClient, db_session):
        """Test successful profile completion."""
        # Create verified user
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        
        # Create access token (simplified)
        from app.core.security import create_access_token
        token = create_access_token(data={"sub": user.email})
        
        response = client.post(
            "/api/auth/complete-profile",
            json={
                "first_name": "John", 
                "last_name": "Doe",
                "organization_name": "Test Corp"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["organization"]["name"] == "Test Corp"

    def test_complete_profile_unauthorized(self, client: TestClient):
        """Test profile completion without authentication fails."""
        response = client.post(
            "/api/auth/complete-profile",
            json={
                "first_name": "John", 
                "last_name": "Doe",
                "organization_name": "Test Corp"
            }
        )
        
        assert response.status_code == 401


class TestEmailChange:
    """Change account email with password + OTP to new address."""

    def test_request_email_change_sends_code(
        self, client: TestClient, db_session, test_user, auth_headers, mock_email_send
    ):
        r = client.post(
            "/api/auth/me/request-email-change",
            json={"new_email": "newmail@example.com", "password": "testpassword123"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert len(mock_email_send) == 1
        assert mock_email_send[0]["to"] == "newmail@example.com"
        otp = (
            db_session.query(OtpCode)
            .filter(
                OtpCode.email == "newmail@example.com",
                OtpCode.code_type == "email_change",
                OtpCode.user_id == test_user.id,
            )
            .first()
        )
        assert otp is not None

    def test_confirm_email_change_updates_email_and_cookies(
        self, client: TestClient, db_session, test_user, auth_headers, mock_email_send
    ):
        otp = OtpCode(
            email="newmail@example.com",
            code="111222",
            code_type="email_change",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            user_id=test_user.id,
        )
        db_session.add(otp)
        db_session.commit()

        r = client.post(
            "/api/auth/me/confirm-email-change",
            json={"new_email": "newmail@example.com", "code": "111222"},
            headers=auth_headers,
        )
        assert r.status_code == 200
        assert r.json().get("access_token")
        db_session.refresh(test_user)
        assert test_user.email == "newmail@example.com"
        assert test_user.email_verified is True

    def test_request_email_change_wrong_password(
        self, client: TestClient, test_user, auth_headers, mock_email_send
    ):
        r = client.post(
            "/api/auth/me/request-email-change",
            json={"new_email": "newmail@example.com", "password": "wrong"},
            headers=auth_headers,
        )
        assert r.status_code == 400
        assert len(mock_email_send) == 0

    def test_resend_email_change(
        self, client: TestClient, db_session, test_user, auth_headers, mock_email_send
    ):
        otp = OtpCode(
            email="newmail@example.com",
            code="111222",
            code_type="email_change",
            expires_at=datetime.utcnow() + timedelta(minutes=5),
            user_id=test_user.id,
        )
        db_session.add(otp)
        db_session.commit()

        r = client.post("/api/auth/me/resend-email-change", headers=auth_headers)
        assert r.status_code == 200
        assert len(mock_email_send) == 1
        assert mock_email_send[0]["to"] == "newmail@example.com"


class TestPasswordLogin:
    """Test password login flow."""

    def test_login_success(self, client: TestClient, db_session):
        """Test successful password login."""
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post(
            "/api/auth/login-password",
            json={"email": "test@example.com", "password": "TestPass123"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client: TestClient, db_session):
        """Test login with wrong password fails."""
        user = User(
            email="test@example.com",
            hashed_password=hash_password("TestPass123")
        )
        db_session.add(user)
        db_session.commit()
        
        response = client.post(
            "/api/auth/login-password",
            json={"email": "test@example.com", "password": "wrongpass"}
        )
        
        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_login_inactive_user_fails(self, client: TestClient, db_session):
        """Inactive users must not be able to create a new session."""
        user = User(
            email="inactive@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True,
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        response = client.post(
            "/api/auth/login-password",
            json={"email": "inactive@example.com", "password": "TestPass123"},
        )

        assert response.status_code == 401
        assert "Invalid credentials" in response.json()["detail"]

    def test_inactive_user_token_rejected_by_me(self, client: TestClient, db_session):
        """Existing access tokens stop working once a user is deactivated."""
        user = User(
            email="inactive-token@example.com",
            hashed_password=hash_password("TestPass123"),
            email_verified=True,
            is_active=False,
        )
        db_session.add(user)
        db_session.commit()

        from app.core.security import create_access_token
        token = create_access_token(data={"sub": user.email})

        response = client.get(
            "/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        assert response.status_code == 401
