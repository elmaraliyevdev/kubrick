from unittest.mock import patch

from app.db.models.candidate import Candidate
from app.db.models.email_template import EmailTemplate
from app.db.models.job import Job
from app.db.models.job_application import JobApplication


class TestCandidateEmailAPI:
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

    def _create_candidate(self, db_session, org_id: int, email: str) -> Candidate:
        c = Candidate(first_name="A", last_name="B", email=email, organization_id=org_id)
        db_session.add(c)
        db_session.commit()
        db_session.refresh(c)
        return c

    def test_upsert_and_send_template_email(
        self, client, auth_headers, db_session, test_user, test_organization
    ):
        job = self._create_job(db_session, test_organization.id, test_user.id)
        cand = self._create_candidate(db_session, test_organization.id, "cand@example.com")
        app_row = JobApplication(job_id=job.id, candidate_id=cand.id, status="interview")
        db_session.add(app_row)
        db_session.commit()
        db_session.refresh(app_row)

        r = client.put(
            "/api/organizations/me/email-templates/interview",
            headers=auth_headers,
            json={
                "name": "Invite",
                "subject": "Interview — {{ job_title }}",
                "body_html": "<p>Hi {{ candidate_name }}</p>",
            },
        )
        assert r.status_code == 200
        tid = r.json()["id"]

        with patch("app.api.candidate_emails.send_email") as send:
            send.return_value = {"id": "resend-msg-1"}
            resp = client.post(
                f"/api/job-applications/{app_row.id}/emails",
                headers=auth_headers,
                json={"template_id": tid},
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["to_email"] == "cand@example.com"
        assert body["status"] == "sent"
        assert body["provider_message_id"] == "resend-msg-1"

        hist = client.get(f"/api/job-applications/{app_row.id}/emails", headers=auth_headers)
        assert hist.status_code == 200
        assert len(hist.json()["emails"]) == 1

    def test_send_rejects_without_candidate_email(
        self, client, auth_headers, db_session, test_user, test_organization
    ):
        job = self._create_job(db_session, test_organization.id, test_user.id)
        cand = Candidate(first_name="X", last_name="Y", email=None, organization_id=test_organization.id)
        db_session.add(cand)
        db_session.commit()
        db_session.refresh(cand)
        app_row = JobApplication(job_id=job.id, candidate_id=cand.id, status="applied")
        db_session.add(app_row)
        db_session.commit()
        db_session.refresh(app_row)

        tmpl = EmailTemplate(
            organization_id=test_organization.id,
            stage="applied",
            subject="Hi",
            body_html="<p>x</p>",
        )
        db_session.add(tmpl)
        db_session.commit()
        db_session.refresh(tmpl)

        resp = client.post(
            f"/api/job-applications/{app_row.id}/emails",
            headers=auth_headers,
            json={"template_id": tmpl.id},
        )
        assert resp.status_code == 400

    def test_tracking_pixel_sets_opened(self, client, db_session, test_user, test_organization):
        job = self._create_job(db_session, test_organization.id, test_user.id)
        cand = self._create_candidate(db_session, test_organization.id, "t@example.com")
        app_row = JobApplication(job_id=job.id, candidate_id=cand.id, status="applied")
        db_session.add(app_row)
        db_session.commit()
        db_session.refresh(app_row)

        from app.db.models.outbound_email import OutboundEmail

        row = OutboundEmail(
            organization_id=test_organization.id,
            job_application_id=app_row.id,
            candidate_id=cand.id,
            to_email="t@example.com",
            subject_snapshot="s",
            html_snapshot="<p>x</p>",
            tracking_token="tok-test-123",
            status="sent",
        )
        db_session.add(row)
        db_session.commit()

        r = client.get("/api/email/open/tok-test-123")
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/gif")

        db_session.refresh(row)
        assert row.first_opened_at is not None
