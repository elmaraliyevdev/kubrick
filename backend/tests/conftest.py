"""
Test configuration and fixtures.
"""
import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import Base
from app.core.security import get_db, create_access_token, create_refresh_token
from app.db.models.user import User
from app.db.models.organization import Organization


# Test database URL
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session")
def db_engine():
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db_engine):
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_organization(db_session):
    org = Organization(name="Test Organization", slug="test-organization")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_user(db_session, test_organization):
    from app.core.security import hash_password

    user = User(
        email="testuser@example.com",
        hashed_password=hash_password("testpassword123"),
        first_name="Test",
        last_name="User",
        organization_id=test_organization.id,
        role="admin",
        email_verified=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def auth_client(client, test_user, db_session):
    """TestClient with auth cookies set."""
    access_token = create_access_token(data={"sub": test_user.email})
    refresh_token = create_refresh_token(
        user_id=test_user.id, db=db_session,
    )
    client.cookies.set("access_token", access_token)
    client.cookies.set("refresh_token", refresh_token)
    return client


@pytest.fixture
def mock_email_send():
    """Patch email functions to capture calls."""
    sent: list = []

    async def _capture(to_email, *args, **kwargs):
        sent.append({"to": to_email, "args": args})
        return {"id": "mock-id"}

    with (
        patch("app.core.email.send_email", side_effect=_capture),
        patch("app.api.auth.send_login_otp", side_effect=_capture),
        patch("app.api.auth.send_email_verification", side_effect=_capture),
        patch("app.api.auth.send_password_reset_otp", side_effect=_capture),
        patch("app.api.auth.send_email_change_verification", side_effect=_capture),
    ):
        yield sent


@pytest.fixture(autouse=True)
def setup_test_env():
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = SQLALCHEMY_DATABASE_URL
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
    yield
