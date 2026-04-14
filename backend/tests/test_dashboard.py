"""Tests for dashboard stats endpoint."""
import pytest
from app.db.models.job import Job
from app.db.models.job_application import JobApplication
from app.db.models.candidate import Candidate


class TestDashboardStats:
    def test_returns_correct_structure(self, client, auth_headers):
        response = client.get("/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "open_positions" in data
        assert "new_applications" in data
        assert "new_applications_7d" in data
        assert "new_candidates" in data
        assert "new_jobs" in data
        assert "candidates_to_review" in data
        assert "top_match_score" in data
        assert "trends" in data
        assert "range" in data

    def test_counts_open_positions(self, client, auth_headers, db_session, test_user):
        # Create 2 open jobs and 1 closed
        for title, status in [("Job A", "open"), ("Job B", "open"), ("Job C", "closed")]:
            job = Job(
                title=title, slug=title.lower().replace(" ", "-"),
                description="test", employment_type="full_time",
                work_arrangement="onsite", status=status,
                user_id=test_user.id, organization_id=test_user.organization_id,
            )
            db_session.add(job)
        db_session.commit()

        response = client.get("/api/dashboard/stats", headers=auth_headers)
        assert response.json()["open_positions"] == 2

    def test_counts_new_applications(self, client, auth_headers, db_session, test_user):
        # Create a job
        job = Job(
            title="App Test", slug="app-test", description="test",
            employment_type="full_time", work_arrangement="onsite",
            status="open", user_id=test_user.id,
            organization_id=test_user.organization_id,
        )
        db_session.add(job)
        db_session.flush()

        # Create a candidate and application
        candidate = Candidate(
            first_name="John", last_name="Doe", email="john@test.com",
            organization_id=test_user.organization_id,
        )
        db_session.add(candidate)
        db_session.flush()

        application = JobApplication(
            job_id=job.id, candidate_id=candidate.id, status="applied",
        )
        db_session.add(application)
        db_session.commit()

        response = client.get("/api/dashboard/stats", headers=auth_headers)
        data = response.json()
        assert data["new_applications_7d"] >= 1
        assert data["candidates_to_review"] >= 1

    def test_requires_auth(self, client):
        response = client.get("/api/dashboard/stats")
        assert response.status_code == 401

    def test_empty_org_returns_zeros(self, client, auth_headers):
        """Fresh org with no data should return zeros."""
        response = client.get("/api/dashboard/stats", headers=auth_headers)
        data = response.json()
        assert data["top_match_score"] is None
