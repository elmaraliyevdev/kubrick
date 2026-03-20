"""Tests for job CRUD with bullet sections."""
import pytest


class TestCreateJob:
    def test_create_job_with_bullet_sections(self, client, auth_headers):
        response = client.post(
            "/api/jobs/",
            json={
                "title": "Backend Engineer",
                "description": "Build APIs",
                "responsibilities": ["Design REST APIs", "Write tests", "Code review"],
                "requirements": ["3+ years Python", "FastAPI or Django"],
                "nice_to_have": ["AWS experience", "Docker"],
                "benefits": ["Remote work", "Health insurance"],
                "employment_type": "full_time",
                "work_arrangement": "remote_only",
                "status": "open",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Backend Engineer"
        assert data["responsibilities"] == ["Design REST APIs", "Write tests", "Code review"]
        assert data["requirements"] == ["3+ years Python", "FastAPI or Django"]
        assert data["nice_to_have"] == ["AWS experience", "Docker"]
        assert data["benefits"] == ["Remote work", "Health insurance"]

    def test_create_job_without_bullet_sections(self, client, auth_headers):
        response = client.post(
            "/api/jobs/",
            json={
                "title": "Simple Job",
                "description": "A job without sections",
                "employment_type": "full_time",
                "work_arrangement": "onsite",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["responsibilities"] is None
        assert data["requirements"] is None

    def test_create_job_without_experience_level(self, client, auth_headers):
        """experience_level is no longer required."""
        response = client.post(
            "/api/jobs/",
            json={
                "title": "No Experience Level",
                "description": "Should work without experience_level",
            },
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestGetJob:
    def test_get_job_returns_bullet_sections(self, client, auth_headers):
        # Create
        create_resp = client.post(
            "/api/jobs/",
            json={
                "title": "Test Get",
                "description": "Testing get",
                "responsibilities": ["Task 1"],
                "benefits": ["Perk 1"],
            },
            headers=auth_headers,
        )
        job_id = create_resp.json()["id"]

        # Get
        response = client.get(f"/api/jobs/{job_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["responsibilities"] == ["Task 1"]
        assert data["benefits"] == ["Perk 1"]


class TestUpdateJob:
    def test_update_bullet_sections(self, client, auth_headers):
        # Create
        create_resp = client.post(
            "/api/jobs/",
            json={"title": "Update Test", "description": "Testing update"},
            headers=auth_headers,
        )
        job_id = create_resp.json()["id"]

        # Update
        response = client.put(
            f"/api/jobs/{job_id}",
            json={
                "responsibilities": ["New responsibility"],
                "requirements": ["New requirement"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["responsibilities"] == ["New responsibility"]
        assert data["requirements"] == ["New requirement"]
