"""
Test configuration and fixtures.
"""
import pytest
import os
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.session import get_db, Base
from app.core.security import create_access_token
from app.db.models.user import User
from app.db.models.organization import Organization
from app.db.models.candidate import Candidate


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
    """Create test database engine."""
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db_session(db_engine):
    """Create a test database session."""
    connection = db_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    
    yield session
    
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Create a test client."""
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
    """Create a test organization."""
    org = Organization(name="Test Organization")
    db_session.add(org)
    db_session.commit()
    db_session.refresh(org)
    return org


@pytest.fixture
def test_user(db_session, test_organization):
    """Create a test user."""
    from app.core.security import hash_password
    
    user = User(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
        first_name="Test",
        last_name="User",
        organization_id=test_organization.id,
        role="admin",
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user):
    """Create authentication headers for test user."""
    token = create_access_token(data={"sub": test_user.email})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(autouse=True)
def setup_test_env():
    """Set up test environment variables."""
    os.environ["TESTING"] = "true"
    os.environ["DATABASE_URL"] = SQLALCHEMY_DATABASE_URL
    os.environ["SECRET_KEY"] = "test-secret-key-for-testing-only"
    yield