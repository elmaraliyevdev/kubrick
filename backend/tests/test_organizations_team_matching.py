"""Organization team PATCH, matching config, and auth profile fields."""

from app.core.security import hash_password, verify_password
from app.db.models.user import User


def test_org_users_response_includes_role_and_active(auth_client, test_user):
    res = auth_client.get("/api/organizations/me/users")
    assert res.status_code == 200
    body = res.json()
    assert len(body) >= 1
    me = next(u for u in body if u["email"] == test_user.email)
    assert me["role"] == "admin"
    assert me["is_active"] is True


def test_admin_patch_member_role(auth_client, test_organization, db_session):
    recruiter = User(
        email="rec@example.com",
        hashed_password=hash_password("RecruiterPass123"),
        first_name="Rec",
        last_name="User",
        organization_id=test_organization.id,
        role="recruiter",
        email_verified=True,
    )
    db_session.add(recruiter)
    db_session.commit()
    db_session.refresh(recruiter)

    res = auth_client.patch(
        f"/api/organizations/me/users/{recruiter.id}",
        json={"role": "admin"},
    )
    assert res.status_code == 200
    assert res.json()["role"] == "admin"


def test_matching_config_get_put(auth_client, db_session):
    get_res = auth_client.get("/api/organizations/me/matching-config")
    assert get_res.status_code == 200
    cfg = get_res.json()
    assert cfg["skills_weight"] == 40

    put_body = {
        **cfg,
        "skills_weight": 35,
        "experience_weight": 30,
        "education_weight": 15,
        "additional_weight": 20,
    }
    put_res = auth_client.put("/api/organizations/me/matching-config", json=put_body)
    assert put_res.status_code == 200
    assert put_res.json()["skills_weight"] == 35


def test_matching_statistics_route(auth_client, test_organization):
    res = auth_client.get(f"/api/matches/statistics/{test_organization.id}")
    assert res.status_code == 200
    body = res.json()
    assert body["organization_id"] == test_organization.id
    assert body["total_matches"] == 0
    assert body["completion_rate"] == 0.0


def test_change_password(auth_client, test_user, db_session):
    res = auth_client.post(
        "/api/auth/me/change-password",
        json={
            "current_password": "testpassword123",
            "new_password": "NewStr0ng!Pass",
        },
    )
    assert res.status_code == 200
    db_session.expire_all()
    u = db_session.query(User).filter(User.id == test_user.id).first()
    assert verify_password("NewStr0ng!Pass", u.hashed_password)
