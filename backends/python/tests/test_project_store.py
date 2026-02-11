"""Tests for ProjectStore file-based storage."""

import json
import shutil
from pathlib import Path

import pytest

from storage.project_store import ProjectStore


@pytest.fixture
def tmp_store(tmp_path):
    """Create a ProjectStore with a temporary directory."""
    store = ProjectStore(data_dir=str(tmp_path))
    yield store


class TestProjectCRUD:
    """Test project create/read/update/delete operations."""

    def test_create_project(self, tmp_store):
        metadata = tmp_store.create_project("Test Project", "A test")
        assert metadata["name"] == "Test Project"
        assert metadata["description"] == "A test"
        assert "id" in metadata
        assert "created_at" in metadata
        assert "updated_at" in metadata

    def test_create_project_default_description(self, tmp_store):
        metadata = tmp_store.create_project("No Desc")
        assert metadata["description"] == ""

    def test_list_projects_empty(self, tmp_store):
        projects = tmp_store.list_projects()
        assert projects == []

    def test_list_projects_returns_created(self, tmp_store):
        tmp_store.create_project("Project A")
        tmp_store.create_project("Project B")
        projects = tmp_store.list_projects()
        assert len(projects) == 2
        names = {p["name"] for p in projects}
        assert names == {"Project A", "Project B"}

    def test_get_project(self, tmp_store):
        created = tmp_store.create_project("Test", "Desc")
        project = tmp_store.get_project(created["id"])
        assert project is not None
        assert project["name"] == "Test"
        assert project["description"] == "Desc"
        assert "sboms" in project

    def test_get_project_has_empty_sboms(self, tmp_store):
        created = tmp_store.create_project("Fresh")
        project = tmp_store.get_project(created["id"])
        assert project["sboms"] == []

    def test_get_nonexistent_project(self, tmp_store):
        result = tmp_store.get_project("00000000-0000-0000-0000-000000000000")
        assert result is None

    def test_delete_project(self, tmp_store):
        created = tmp_store.create_project("To Delete")
        assert tmp_store.delete_project(created["id"]) is True
        assert tmp_store.get_project(created["id"]) is None
        # Verify removed from index
        projects = tmp_store.list_projects()
        assert len(projects) == 0

    def test_delete_nonexistent_project(self, tmp_store):
        result = tmp_store.delete_project("00000000-0000-0000-0000-000000000000")
        assert result is False

    def test_create_multiple_projects_unique_ids(self, tmp_store):
        p1 = tmp_store.create_project("One")
        p2 = tmp_store.create_project("Two")
        p3 = tmp_store.create_project("Three")
        ids = {p1["id"], p2["id"], p3["id"]}
        assert len(ids) == 3

    def test_delete_one_preserves_others(self, tmp_store):
        p1 = tmp_store.create_project("Keep")
        p2 = tmp_store.create_project("Remove")
        tmp_store.delete_project(p2["id"])
        projects = tmp_store.list_projects()
        assert len(projects) == 1
        assert projects[0]["name"] == "Keep"


class TestSbomCRUD:
    """Test SBOM create/read/update/delete within projects."""

    @pytest.fixture
    def project_with_store(self, tmp_store):
        project = tmp_store.create_project("SBOM Project")
        return tmp_store, project["id"]

    def test_save_sbom(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6", "components": []}
        result = store.save_sbom(project_id, sbom_data, "test.json")
        assert "id" in result
        assert result["name"] == "test.json"

    def test_save_sbom_adds_timestamp(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        result = store.save_sbom(project_id, sbom_data)
        assert result["uploaded_at"] != ""

    def test_get_sbom(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        saved = store.save_sbom(project_id, sbom_data)
        retrieved = store.get_sbom(project_id, saved["id"])
        assert retrieved is not None
        assert retrieved["bomFormat"] == "CycloneDX"

    def test_get_nonexistent_sbom(self, project_with_store):
        store, project_id = project_with_store
        result = store.get_sbom(project_id, "00000000-0000-0000-0000-000000000000")
        assert result is None

    def test_update_sbom(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        saved = store.save_sbom(project_id, sbom_data)

        updated_data = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "components": [{"type": "library", "name": "test"}],
        }
        assert store.update_sbom(project_id, saved["id"], updated_data) is True

        retrieved = store.get_sbom(project_id, saved["id"])
        assert len(retrieved["components"]) == 1

    def test_update_sbom_sets_timestamp(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        saved = store.save_sbom(project_id, sbom_data)

        updated_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        store.update_sbom(project_id, saved["id"], updated_data)

        retrieved = store.get_sbom(project_id, saved["id"])
        assert "timestamp" in retrieved["metadata"]

    def test_update_nonexistent_sbom(self, project_with_store):
        store, project_id = project_with_store
        assert (
            store.update_sbom(
                project_id, "00000000-0000-0000-0000-000000000000", {}
            )
            is False
        )

    def test_delete_sbom(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        saved = store.save_sbom(project_id, sbom_data)
        assert store.delete_sbom(project_id, saved["id"]) is True
        assert store.get_sbom(project_id, saved["id"]) is None

    def test_delete_nonexistent_sbom(self, project_with_store):
        store, project_id = project_with_store
        assert (
            store.delete_sbom(project_id, "00000000-0000-0000-0000-000000000000")
            is False
        )

    def test_list_sboms(self, project_with_store):
        store, project_id = project_with_store
        store.save_sbom(
            project_id,
            {
                "bomFormat": "CycloneDX",
                "specVersion": "1.6",
                "metadata": {"component": {"name": "App1", "version": "1.0"}},
            },
        )
        store.save_sbom(
            project_id,
            {
                "bomFormat": "CycloneDX",
                "specVersion": "1.6",
                "metadata": {"component": {"name": "App2", "version": "2.0"}},
            },
        )
        sboms = store.list_sboms(project_id)
        assert len(sboms) == 2

    def test_list_sboms_extracts_metadata(self, project_with_store):
        store, project_id = project_with_store
        store.save_sbom(
            project_id,
            {
                "bomFormat": "CycloneDX",
                "specVersion": "1.6",
                "metadata": {"component": {"name": "MyApp", "version": "3.0"}},
            },
        )
        sboms = store.list_sboms(project_id)
        assert len(sboms) == 1
        assert sboms[0]["name"] == "MyApp"
        assert sboms[0]["version"] == "3.0"

    def test_list_sboms_empty_project(self, project_with_store):
        store, project_id = project_with_store
        sboms = store.list_sboms(project_id)
        assert sboms == []

    def test_save_sbom_to_nonexistent_project(self, tmp_store):
        with pytest.raises(ValueError, match="does not exist"):
            tmp_store.save_sbom("00000000-0000-0000-0000-000000000000", {})

    def test_delete_project_cascades_sboms(self, project_with_store):
        store, project_id = project_with_store
        store.save_sbom(project_id, {"bomFormat": "CycloneDX"})
        store.save_sbom(project_id, {"bomFormat": "CycloneDX"})
        store.delete_project(project_id)
        assert store.get_project(project_id) is None

    def test_save_sbom_without_name_uses_component_name(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {
            "bomFormat": "CycloneDX",
            "specVersion": "1.6",
            "metadata": {"component": {"name": "ComponentName", "version": "1.0"}},
        }
        result = store.save_sbom(project_id, sbom_data)
        assert result["name"] == "ComponentName"

    def test_save_sbom_without_name_or_component_uses_id(self, project_with_store):
        store, project_id = project_with_store
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        result = store.save_sbom(project_id, sbom_data)
        # When no name and no component name, falls back to sbom_id
        assert result["name"] == result["id"]


class TestPathTraversal:
    """Test that path traversal attacks are prevented."""

    def test_path_traversal_in_project_id(self, tmp_store):
        with pytest.raises(ValueError, match="Invalid project ID"):
            tmp_store.get_project("../../../etc/passwd")

    def test_url_encoded_dot_dot_stays_inside(self, tmp_store):
        # URL-encoded sequences like %2F are literal characters on the
        # filesystem, so "..%2F..%2Fetc%2Fpasswd" resolves inside the
        # projects directory (no actual traversal). This is safe.
        project_dir = tmp_store._get_project_dir("..%2F..%2Fetc%2Fpasswd")
        assert str(project_dir).startswith(str(tmp_store.projects_dir.resolve()))

    def test_path_traversal_simple_dot_dot(self, tmp_store):
        with pytest.raises(ValueError, match="Invalid project ID"):
            tmp_store._get_project_dir("../../secret")

    def test_path_traversal_in_delete(self, tmp_store):
        with pytest.raises(ValueError, match="Invalid project ID"):
            tmp_store.delete_project("../../../etc/passwd")

    def test_path_traversal_in_save_sbom(self, tmp_store):
        with pytest.raises(ValueError, match="Invalid project ID"):
            tmp_store.save_sbom("../../../etc/passwd", {})

    def test_valid_uuid_works(self, tmp_store):
        # Should not raise
        created = tmp_store.create_project("Valid")
        project = tmp_store.get_project(created["id"])
        assert project is not None


class TestStoreInitialization:
    """Test ProjectStore initialization and directory structure."""

    def test_creates_data_dir(self, tmp_path):
        data_dir = tmp_path / "new_data"
        store = ProjectStore(data_dir=str(data_dir))
        assert data_dir.exists()
        assert (data_dir / "projects").exists()
        assert (data_dir / "projects.json").exists()

    def test_initializes_empty_index(self, tmp_path):
        store = ProjectStore(data_dir=str(tmp_path))
        index_path = tmp_path / "projects.json"
        with open(index_path) as f:
            data = json.load(f)
        assert data == {"projects": []}

    def test_preserves_existing_index(self, tmp_path):
        # Pre-create an index
        (tmp_path / "projects").mkdir(exist_ok=True)
        index_path = tmp_path / "projects.json"
        with open(index_path, "w") as f:
            json.dump({"projects": ["some-id"]}, f)

        store = ProjectStore(data_dir=str(tmp_path))
        # Should not overwrite
        with open(index_path) as f:
            data = json.load(f)
        assert data == {"projects": ["some-id"]}


class TestAtomicWrites:
    """Test that file operations are atomic."""

    def test_project_data_persists_after_create(self, tmp_store):
        created = tmp_store.create_project("Persistent", "desc")
        project_id = created["id"]

        # Create a new store instance pointing to same dir
        store2 = ProjectStore(data_dir=str(tmp_store.data_dir))
        project = store2.get_project(project_id)
        assert project is not None
        assert project["name"] == "Persistent"

    def test_sbom_data_persists_after_save(self, tmp_store):
        created = tmp_store.create_project("SBOM Persist")
        project_id = created["id"]
        sbom_data = {"bomFormat": "CycloneDX", "specVersion": "1.6"}
        saved = tmp_store.save_sbom(project_id, sbom_data)

        # Create a new store instance pointing to same dir
        store2 = ProjectStore(data_dir=str(tmp_store.data_dir))
        retrieved = store2.get_sbom(project_id, saved["id"])
        assert retrieved is not None
        assert retrieved["bomFormat"] == "CycloneDX"
