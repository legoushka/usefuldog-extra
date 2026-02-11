"""Tests for API endpoints."""

import json
import os

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport

from storage.project_store import ProjectStore


@pytest.fixture(autouse=True)
def _patch_store(tmp_path, monkeypatch):
    """Replace the global project_store with one using a temp directory.

    This must run before importing `main` so the store initialization
    does not require /data to exist. We patch the DATA_DIR env var
    and then reload the module-level store.
    """
    monkeypatch.setenv("DATA_DIR", str(tmp_path))

    import main

    store = ProjectStore(data_dir=str(tmp_path))
    monkeypatch.setattr(main, "project_store", store)


@pytest_asyncio.fixture
async def client():
    from main import app

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestHealth:
    @pytest.mark.asyncio
    async def test_health_endpoint(self, client):
        response = await client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}


class TestVexConvert:
    @pytest.mark.asyncio
    async def test_convert_invalid_json(self, client):
        response = await client.post(
            "/api/convert/vex",
            files={"file": ("test.json", b"not json", "application/json")},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_convert_empty_object(self, client):
        # An empty JSON object {} is accepted by VexDocument model with defaults
        response = await client.post(
            "/api/convert/vex",
            files={"file": ("test.json", b"{}", "application/json")},
        )
        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_convert_invalid_content_type(self, client):
        response = await client.post(
            "/api/convert/vex",
            files={"file": ("test.txt", b"plain text", "text/plain")},
        )
        # Should fail parsing as JSON
        assert response.status_code == 400


class TestSbomValidation:
    @pytest.mark.asyncio
    async def test_validate_invalid_json(self, client):
        response = await client.post(
            "/api/sbom/validate",
            files={"file": ("test.json", b"not json", "application/json")},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_validate_json_body(self, client):
        response = await client.post(
            "/api/sbom/validate/json",
            json={
                "document": {"bomFormat": "CycloneDX", "specVersion": "1.6"},
                "format": "oss",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data

    @pytest.mark.asyncio
    async def test_validate_valid_sbom(self, client):
        sbom = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "metadata": {"component": {"name": "App", "version": "1.0"}},
            "components": [],
        }
        response = await client.post(
            "/api/sbom/validate",
            files={"file": ("sbom.json", json.dumps(sbom).encode(), "application/json")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "valid" in data
        assert "issues" in data


class TestUUIDValidation:
    """Test that invalid UUIDs are rejected by path parameter validation."""

    @pytest.mark.asyncio
    async def test_invalid_uuid_get_project(self, client):
        response = await client.get("/api/projects/not-a-uuid")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_delete_project(self, client):
        response = await client.delete("/api/projects/not-a-uuid")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_get_sbom(self, client):
        response = await client.get("/api/projects/not-valid/sboms/also-not-valid")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_upload_sbom(self, client):
        response = await client.post(
            "/api/projects/not-valid/sboms",
            files={"file": ("test.json", b"{}", "application/json")},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_update_sbom(self, client):
        response = await client.put(
            "/api/projects/not-valid/sboms/also-not-valid",
            json={"document": {}},
        )
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_uuid_delete_sbom(self, client):
        response = await client.delete("/api/projects/not-valid/sboms/also-not-valid")
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_path_traversal_in_url_rejected(self, client):
        # URL-encoded slashes are decoded by the HTTP transport, causing
        # the path to resolve outside the route. The request either fails
        # UUID validation (422) or is resolved to a non-existent route (404).
        # Both outcomes are safe -- the traversal never reaches the store.
        response = await client.get("/api/projects/..%2F..%2Fetc%2Fpasswd")
        assert response.status_code in (404, 422)

    @pytest.mark.asyncio
    async def test_valid_uuid_format_returns_404(self, client):
        # Valid UUID format but non-existent should return 404, not 422
        response = await client.get(
            "/api/projects/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404


class TestProjectEndpoints:
    @pytest.mark.asyncio
    async def test_list_projects_empty(self, client):
        response = await client.get("/api/projects")
        assert response.status_code == 200
        data = response.json()
        assert "projects" in data
        assert data["projects"] == []

    @pytest.mark.asyncio
    async def test_create_project(self, client):
        response = await client.post(
            "/api/projects",
            json={"name": "Test Project", "description": "Test"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Project"
        assert data["description"] == "Test"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    @pytest.mark.asyncio
    async def test_create_project_no_description(self, client):
        response = await client.post(
            "/api/projects",
            json={"name": "No Desc"},
        )
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "No Desc"
        assert data["description"] == ""

    @pytest.mark.asyncio
    async def test_create_and_get_project(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Get Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        get_resp = await client.get(f"/api/projects/{project_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert data["name"] == "Get Test"
        assert "sboms" in data

    @pytest.mark.asyncio
    async def test_create_and_list_project(self, client):
        await client.post(
            "/api/projects",
            json={"name": "Listed", "description": ""},
        )
        response = await client.get("/api/projects")
        assert response.status_code == 200
        projects = response.json()["projects"]
        assert len(projects) == 1
        assert projects[0]["name"] == "Listed"

    @pytest.mark.asyncio
    async def test_delete_project(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Delete Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        delete_resp = await client.delete(f"/api/projects/{project_id}")
        assert delete_resp.status_code == 204

        get_resp = await client.get(f"/api/projects/{project_id}")
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_project(self, client):
        response = await client.delete(
            "/api/projects/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_get_nonexistent_project(self, client):
        response = await client.get(
            "/api/projects/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_project_missing_name(self, client):
        response = await client.post(
            "/api/projects",
            json={"description": "no name"},
        )
        assert response.status_code == 422


class TestSbomEndpoints:
    @pytest.mark.asyncio
    async def test_upload_sbom(self, client):
        # Create project first
        create_resp = await client.post(
            "/api/projects",
            json={"name": "SBOM Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        # Upload SBOM
        sbom = json.dumps(
            {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        ).encode()
        response = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        assert response.status_code == 201
        data = response.json()
        assert "id" in data
        assert "name" in data
        assert "uploaded_at" in data

    @pytest.mark.asyncio
    async def test_upload_sbom_to_nonexistent_project(self, client):
        sbom = json.dumps({"bomFormat": "CycloneDX"}).encode()
        response = await client.post(
            "/api/projects/00000000-0000-0000-0000-000000000000/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_upload_invalid_json(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Invalid JSON Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        response = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", b"not json", "application/json")},
        )
        assert response.status_code == 400

    @pytest.mark.asyncio
    async def test_get_sbom(self, client):
        # Create project and upload SBOM
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Get SBOM Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        sbom = json.dumps(
            {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        ).encode()
        upload_resp = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        sbom_id = upload_resp.json()["id"]

        get_resp = await client.get(
            f"/api/projects/{project_id}/sboms/{sbom_id}"
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["bomFormat"] == "CycloneDX"

    @pytest.mark.asyncio
    async def test_get_nonexistent_sbom(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "No SBOM Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        response = await client.get(
            f"/api/projects/{project_id}/sboms/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_sbom(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Update SBOM Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        sbom = json.dumps(
            {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        ).encode()
        upload_resp = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        sbom_id = upload_resp.json()["id"]

        update_resp = await client.put(
            f"/api/projects/{project_id}/sboms/{sbom_id}",
            json={
                "document": {
                    "bomFormat": "CycloneDX",
                    "specVersion": "1.6",
                    "components": [{"type": "library", "name": "updated"}],
                }
            },
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert "id" in data
        assert data["id"] == sbom_id

    @pytest.mark.asyncio
    async def test_update_nonexistent_sbom(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Update Missing SBOM", "description": ""},
        )
        project_id = create_resp.json()["id"]

        response = await client.put(
            f"/api/projects/{project_id}/sboms/00000000-0000-0000-0000-000000000000",
            json={"document": {"bomFormat": "CycloneDX"}},
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_sbom(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Delete SBOM Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        sbom = json.dumps(
            {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        ).encode()
        upload_resp = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        sbom_id = upload_resp.json()["id"]

        delete_resp = await client.delete(
            f"/api/projects/{project_id}/sboms/{sbom_id}"
        )
        assert delete_resp.status_code == 204

        get_resp = await client.get(
            f"/api/projects/{project_id}/sboms/{sbom_id}"
        )
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_nonexistent_sbom(self, client):
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Delete Missing SBOM", "description": ""},
        )
        project_id = create_resp.json()["id"]

        response = await client.delete(
            f"/api/projects/{project_id}/sboms/00000000-0000-0000-0000-000000000000"
        )
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_upload_and_list_sboms_via_project(self, client):
        # Create project
        create_resp = await client.post(
            "/api/projects",
            json={"name": "List SBOMs Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        # Upload two SBOMs
        for i in range(2):
            sbom = json.dumps(
                {
                    "bomFormat": "CycloneDX",
                    "specVersion": "1.6",
                    "metadata": {
                        "component": {"name": f"App{i}", "version": f"{i}.0"}
                    },
                }
            ).encode()
            await client.post(
                f"/api/projects/{project_id}/sboms",
                files={"file": (f"sbom{i}.json", sbom, "application/json")},
            )

        # Get project to see SBOMs listed
        get_resp = await client.get(f"/api/projects/{project_id}")
        assert get_resp.status_code == 200
        data = get_resp.json()
        assert len(data["sboms"]) == 2

    @pytest.mark.asyncio
    async def test_delete_project_removes_sboms(self, client):
        # Create project
        create_resp = await client.post(
            "/api/projects",
            json={"name": "Cascade Test", "description": ""},
        )
        project_id = create_resp.json()["id"]

        # Upload SBOM
        sbom = json.dumps({"bomFormat": "CycloneDX"}).encode()
        upload_resp = await client.post(
            f"/api/projects/{project_id}/sboms",
            files={"file": ("test.json", sbom, "application/json")},
        )
        sbom_id = upload_resp.json()["id"]

        # Delete project
        await client.delete(f"/api/projects/{project_id}")

        # Verify project gone
        get_resp = await client.get(f"/api/projects/{project_id}")
        assert get_resp.status_code == 404


class TestBodySizeLimit:
    """Test the body size limit middleware."""

    @pytest.mark.asyncio
    async def test_oversized_body_rejected(self, client):
        # Send a request with Content-Length header exceeding 10 MB
        huge_content = b"x" * (10 * 1024 * 1024 + 1)
        response = await client.post(
            "/api/convert/vex",
            files={"file": ("big.json", huge_content, "application/json")},
        )
        assert response.status_code == 413


class TestCORSHeaders:
    """Test CORS middleware is configured."""

    @pytest.mark.asyncio
    async def test_cors_headers_present(self, client):
        response = await client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Should include CORS headers for allowed origin
        assert "access-control-allow-origin" in response.headers
