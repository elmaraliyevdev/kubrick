"""Tests for the refresh token flow."""
import pytest
from app.db.models.refresh_token import RefreshToken


class TestLoginCreatesTokens:
    def test_login_sets_both_cookies(self, client, test_user, mock_email_send):
        response = client.post(
            "/api/auth/login-password",
            json={"email": test_user.email, "password": "testpassword123"},
        )
        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    def test_login_creates_refresh_token_in_db(self, client, test_user, db_session, mock_email_send):
        client.post(
            "/api/auth/login-password",
            json={"email": test_user.email, "password": "testpassword123"},
        )
        rt = db_session.query(RefreshToken).filter(
            RefreshToken.user_id == test_user.id,
            RefreshToken.is_active == True,
        ).first()
        assert rt is not None


class TestRefreshEndpoint:
    def test_refresh_returns_new_tokens(self, auth_client):
        response = auth_client.post("/api/auth/refresh")
        assert response.status_code == 200
        assert "access_token" in response.cookies
        assert "refresh_token" in response.cookies

    def test_refresh_rotates_token(self, auth_client, db_session, test_user):
        old_cookie = auth_client.cookies.get("refresh_token")
        auth_client.post("/api/auth/refresh")

        # Old token should be revoked
        old_rt = db_session.query(RefreshToken).filter(
            RefreshToken.token == old_cookie,
        ).first()
        assert old_rt is not None
        assert old_rt.is_active is False

    def test_refresh_without_cookie_returns_401(self, client):
        response = client.post("/api/auth/refresh")
        assert response.status_code == 401

    def test_refresh_with_invalid_token_returns_401(self, client):
        client.cookies.set("refresh_token", "invalid-token")
        response = client.post("/api/auth/refresh")
        assert response.status_code == 401


class TestLogout:
    def test_logout_revokes_refresh_token(self, auth_client, db_session, test_user):
        refresh_cookie = auth_client.cookies.get("refresh_token")
        auth_client.post("/api/auth/logout")

        rt = db_session.query(RefreshToken).filter(
            RefreshToken.token == refresh_cookie,
        ).first()
        assert rt is not None
        assert rt.is_active is False

    def test_logout_clears_cookies(self, auth_client):
        response = auth_client.post("/api/auth/logout")
        assert response.status_code == 200
