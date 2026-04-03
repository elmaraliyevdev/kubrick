from app.db.models.candidate import Candidate
from app.db.models.job import Job
from app.db.models.job_application import JobApplication
from app.db.models.organization import Organization


class TestPipelineAPI:
    def _create_job(self, db_session, org_id: int, user_id: int, title: str = "Job Test") -> Job:
        job = Job(
            user_id=user_id,
            organization_id=org_id,
            title=title,
            slug=title.lower().replace(" ", "-"),
            description="test",
            employment_type="full_time",
            work_arrangement="onsite",
            status="open",
        )
        db_session.add(job)
        db_session.commit()
        db_session.refresh(job)
        return job

    def _create_candidate(self, db_session, org_id: int, email: str, first_name: str = "A", last_name: str = "B") -> Candidate:
        candidate = Candidate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            organization_id=org_id,
        )
        db_session.add(candidate)
        db_session.commit()
        db_session.refresh(candidate)
        return candidate

    def _create_application(self, db_session, job_id: int, candidate_id: int, status_value: str) -> JobApplication:
        app = JobApplication(job_id=job_id, candidate_id=candidate_id, status=status_value)
        db_session.add(app)
        db_session.commit()
        db_session.refresh(app)
        return app

    def test_job_pipeline_get_groups_by_stage(self, client, auth_headers, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id, title="Job Pipeline")
        c1 = self._create_candidate(db_session, test_organization.id, email="c1@example.com")
        c2 = self._create_candidate(db_session, test_organization.id, email="c2@example.com", first_name="C", last_name="Two")

        a1 = self._create_application(db_session, job.id, c1.id, status_value="applied")
        a2 = self._create_application(db_session, job.id, c2.id, status_value="screening")

        resp = client.get(f"/api/jobs/{job.id}/pipeline", headers=auth_headers)
        assert resp.status_code == 200

        payload = resp.json()
        assert payload["job_id"] == job.id
        assert any(card["application_id"] == a1.id for card in payload["stages"]["applied"])
        assert any(card["application_id"] == a2.id for card in payload["stages"]["screening"])

    def test_stage_move_allows_forward_and_backward(self, client, auth_headers, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id, title="Job Move")
        candidate = self._create_candidate(db_session, test_organization.id, email="move@example.com")
        application = self._create_application(db_session, job.id, candidate.id, status_value="applied")

        resp = client.patch(
            f"/api/job-applications/{application.id}/stage",
            headers=auth_headers,
            json={"stage": "screening"},
        )
        assert resp.status_code == 200
        assert resp.json()["stage"] == "screening"

        resp2 = client.patch(
            f"/api/job-applications/{application.id}/stage",
            headers=auth_headers,
            json={"stage": "applied"},
        )
        assert resp2.status_code == 200
        assert resp2.json()["stage"] == "applied"

    def test_stage_move_is_org_scoped(self, client, auth_headers, db_session, test_user, test_organization):
        # Create a different organization, and an application belonging to it.
        org2 = Organization(name="Org 2", slug="org-2")
        db_session.add(org2)
        db_session.commit()
        db_session.refresh(org2)

        job_other_org = self._create_job(db_session, org2.id, test_user.id, title="Other Org Job")
        candidate_other_org = self._create_candidate(db_session, org2.id, email="other@example.com")
        application_other_org = self._create_application(db_session, job_other_org.id, candidate_other_org.id, status_value="applied")

        # User from test_organization tries to move application from org2.
        resp = client.patch(
            f"/api/job-applications/{application_other_org.id}/stage",
            headers=auth_headers,
            json={"stage": "screening"},
        )
        assert resp.status_code == 404

    def test_eligible_candidates_excludes_already_applied(self, client, auth_headers, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id, title="Eligible Job")
        on_job = self._create_candidate(db_session, test_organization.id, email="on@example.com", first_name="On", last_name="Job")
        not_on = self._create_candidate(db_session, test_organization.id, email="not@example.com", first_name="Not", last_name="Yet")
        self._create_application(db_session, job.id, on_job.id, status_value="applied")

        resp = client.get(f"/api/jobs/{job.id}/pipeline/eligible-candidates", headers=auth_headers)
        assert resp.status_code == 200
        ids = {c["id"] for c in resp.json()["candidates"]}
        assert on_job.id not in ids
        assert not_on.id in ids

    def test_add_pipeline_applicants_creates_applied(self, client, auth_headers, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id, title="Bulk Add Job")
        c1 = self._create_candidate(db_session, test_organization.id, email="bulk1@example.com")
        c2 = self._create_candidate(db_session, test_organization.id, email="bulk2@example.com")

        resp = client.post(
            f"/api/jobs/{job.id}/pipeline/applicants",
            headers=auth_headers,
            json={"candidate_ids": [c1.id, c2.id]},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["created"]) == 2
        assert len(body["skipped"]) == 0

        apps = db_session.query(JobApplication).filter(JobApplication.job_id == job.id).all()
        assert len(apps) == 2
        assert all(a.status == "applied" for a in apps)

    def test_add_pipeline_applicants_skips_duplicate(self, client, auth_headers, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id, title="Dup Job")
        c = self._create_candidate(db_session, test_organization.id, email="dup@example.com")
        self._create_application(db_session, job.id, c.id, status_value="applied")

        resp = client.post(
            f"/api/jobs/{job.id}/pipeline/applicants",
            headers=auth_headers,
            json={"candidate_ids": [c.id]},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["created"]) == 0
        assert any(s["reason"] == "already_applied" for s in body["skipped"])

