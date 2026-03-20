"""Tests for application form configuration."""
import pytest


class TestGetFormConfig:
    def test_get_returns_defaults_when_no_config(self, client, auth_headers):
        response = client.get(
            "/api/organizations/me/application-form",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["config"]["show_phone"] is True
        assert data["config"]["require_phone"] is False
        assert data["custom_fields"] == []

    def test_requires_auth(self, client):
        response = client.get("/api/organizations/me/application-form")
        assert response.status_code == 401


class TestUpdateFormConfig:
    def test_toggle_field_visibility(self, client, auth_headers):
        response = client.put(
            "/api/organizations/me/application-form/config",
            json={"show_phone": False, "show_linkedin": False},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["show_phone"] is False
        assert data["show_linkedin"] is False
        # Others unchanged
        assert data["show_location"] is True

    def test_set_field_required(self, client, auth_headers):
        response = client.put(
            "/api/organizations/me/application-form/config",
            json={"require_cover_letter": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["require_cover_letter"] is True


class TestCustomFields:
    def test_create_custom_field(self, client, auth_headers):
        response = client.post(
            "/api/organizations/me/application-form/fields",
            json={
                "label": "Years of Experience",
                "field_type": "number",
                "is_required": True,
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["label"] == "Years of Experience"
        assert data["field_key"] == "years_of_experience"
        assert data["field_type"] == "number"
        assert data["is_required"] is True

    def test_create_select_field_with_options(self, client, auth_headers):
        response = client.post(
            "/api/organizations/me/application-form/fields",
            json={
                "label": "Availability",
                "field_type": "select",
                "options": ["Immediate", "2 weeks", "1 month"],
            },
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["options"] == ["Immediate", "2 weeks", "1 month"]

    def test_create_duplicate_field_key_fails(self, client, auth_headers):
        # Create first
        client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "Unique Field", "field_type": "text"},
            headers=auth_headers,
        )
        # Duplicate
        response = client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "Unique Field", "field_type": "text"},
            headers=auth_headers,
        )
        assert response.status_code == 409

    def test_update_custom_field(self, client, auth_headers):
        # Create
        create_resp = client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "To Update", "field_type": "text"},
            headers=auth_headers,
        )
        field_id = create_resp.json()["id"]

        # Update
        response = client.put(
            f"/api/organizations/me/application-form/fields/{field_id}",
            json={"label": "Updated Label", "is_required": True},
            headers=auth_headers,
        )
        assert response.status_code == 200
        assert response.json()["label"] == "Updated Label"
        assert response.json()["is_required"] is True

    def test_delete_custom_field(self, client, auth_headers):
        # Create
        create_resp = client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "To Delete", "field_type": "text"},
            headers=auth_headers,
        )
        field_id = create_resp.json()["id"]

        # Delete
        response = client.delete(
            f"/api/organizations/me/application-form/fields/{field_id}",
            headers=auth_headers,
        )
        assert response.status_code == 204

    def test_reorder_fields(self, client, auth_headers):
        # Create two fields
        r1 = client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "Field A", "field_type": "text"},
            headers=auth_headers,
        )
        r2 = client.post(
            "/api/organizations/me/application-form/fields",
            json={"label": "Field B", "field_type": "text"},
            headers=auth_headers,
        )
        id_a = r1.json()["id"]
        id_b = r2.json()["id"]

        # Reorder: B before A
        response = client.put(
            "/api/organizations/me/application-form/fields/reorder",
            json={"field_ids": [id_b, id_a]},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert data[0]["id"] == id_b
        assert data[1]["id"] == id_a
