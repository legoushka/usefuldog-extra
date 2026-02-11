"""File-based storage for projects and SBOMs."""

from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


class ProjectStore:
    """File-based storage for projects and SBOMs.

    Storage structure:
    - /data/projects.json - index of all projects
    - /data/projects/{project_id}/metadata.json - project metadata
    - /data/projects/{project_id}/sboms/{sbom_id}.json - SBOM files
    """

    def __init__(self, data_dir: str = "/data"):
        self.data_dir = Path(data_dir)
        self.projects_index_file = self.data_dir / "projects.json"
        self.projects_dir = self.data_dir / "projects"
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """Create data directories if they don't exist."""
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.projects_dir.mkdir(parents=True, exist_ok=True)
        if not self.projects_index_file.exists():
            self._write_json(self.projects_index_file, {"projects": []})

    def _read_json(self, path: Path) -> dict[str, Any]:
        """Read and parse JSON file."""
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)

    def _write_json(self, path: Path, data: dict[str, Any]) -> None:
        """Write JSON to file atomically using temp file + rename."""
        temp_path = path.with_suffix(".tmp")
        with temp_path.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        temp_path.rename(path)

    def _get_project_dir(self, project_id: str) -> Path:
        """Get path to project directory."""
        project_dir = (self.projects_dir / project_id).resolve()
        if not str(project_dir).startswith(str(self.projects_dir.resolve())):
            raise ValueError(f"Invalid project ID: {project_id}")
        return project_dir

    def _get_sboms_dir(self, project_id: str) -> Path:
        """Get path to project's SBOMs directory."""
        return self._get_project_dir(project_id) / "sboms"

    def list_projects(self) -> list[dict[str, Any]]:
        """List all projects with their metadata."""
        index = self._read_json(self.projects_index_file)
        projects = []
        for project_id in index.get("projects", []):
            try:
                metadata = self.get_project(project_id)
                if metadata:
                    projects.append(metadata)
            except Exception:
                # Skip corrupted projects
                continue
        return projects

    def create_project(self, name: str, description: str = "") -> dict[str, Any]:
        """Create a new project and return its metadata."""
        project_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Create project directory
        project_dir = self._get_project_dir(project_id)
        project_dir.mkdir(parents=True, exist_ok=True)
        sboms_dir = self._get_sboms_dir(project_id)
        sboms_dir.mkdir(parents=True, exist_ok=True)

        # Create metadata
        metadata = {
            "id": project_id,
            "name": name,
            "description": description,
            "created_at": now,
            "updated_at": now,
        }

        # Save metadata
        metadata_path = project_dir / "metadata.json"
        self._write_json(metadata_path, metadata)

        # Update index
        index = self._read_json(self.projects_index_file)
        if project_id not in index.get("projects", []):
            index.setdefault("projects", []).append(project_id)
            self._write_json(self.projects_index_file, index)

        return metadata

    def get_project(self, project_id: str) -> dict[str, Any] | None:
        """Get project metadata with list of SBOMs."""
        project_dir = self._get_project_dir(project_id)
        metadata_path = project_dir / "metadata.json"

        if not metadata_path.exists():
            return None

        metadata = self._read_json(metadata_path)

        # Add SBOM list
        sboms = self.list_sboms(project_id)
        metadata["sboms"] = sboms

        return metadata

    def delete_project(self, project_id: str) -> bool:
        """Delete a project and all its SBOMs. Returns True if deleted."""
        project_dir = self._get_project_dir(project_id)

        if not project_dir.exists():
            return False

        # Delete project directory
        shutil.rmtree(project_dir)

        # Update index
        index = self._read_json(self.projects_index_file)
        projects = index.get("projects", [])
        if project_id in projects:
            projects.remove(project_id)
            index["projects"] = projects
            self._write_json(self.projects_index_file, index)

        return True

    def list_sboms(self, project_id: str) -> list[dict[str, Any]]:
        """List all SBOMs in a project with metadata."""
        sboms_dir = self._get_sboms_dir(project_id)

        if not sboms_dir.exists():
            return []

        sboms = []
        for sbom_file in sboms_dir.glob("*.json"):
            try:
                sbom_data = self._read_json(sbom_file)
                # Extract metadata from SBOM content
                metadata = sbom_data.get("metadata", {})
                component = metadata.get("component", {})

                sbom_info = {
                    "id": sbom_file.stem,
                    "name": component.get("name", sbom_file.stem),
                    "version": component.get("version", ""),
                    "uploaded_at": metadata.get("timestamp", ""),
                }
                sboms.append(sbom_info)
            except Exception:
                # Skip corrupted SBOM files
                continue

        return sboms

    def save_sbom(
        self, project_id: str, sbom_data: dict[str, Any], sbom_name: str = ""
    ) -> dict[str, Any]:
        """Save a new SBOM to a project and return metadata."""
        sbom_id = str(uuid.uuid4())
        sboms_dir = self._get_sboms_dir(project_id)

        # Ensure project exists
        if not self._get_project_dir(project_id).exists():
            raise ValueError(f"Project {project_id} does not exist")

        sboms_dir.mkdir(parents=True, exist_ok=True)

        # Add timestamp if not present
        if "metadata" not in sbom_data:
            sbom_data["metadata"] = {}
        if "timestamp" not in sbom_data["metadata"]:
            sbom_data["metadata"]["timestamp"] = datetime.now(timezone.utc).isoformat()

        # Save SBOM file
        sbom_path = sboms_dir / f"{sbom_id}.json"
        self._write_json(sbom_path, sbom_data)

        # Update project updated_at
        self._touch_project(project_id)

        # Extract metadata
        metadata = sbom_data.get("metadata", {})
        component = metadata.get("component", {})

        return {
            "id": sbom_id,
            "name": sbom_name or component.get("name", sbom_id),
            "version": component.get("version", ""),
            "uploaded_at": metadata.get("timestamp", ""),
        }

    def get_sbom(self, project_id: str, sbom_id: str) -> dict[str, Any] | None:
        """Get SBOM content by ID."""
        sbom_path = self._get_sboms_dir(project_id) / f"{sbom_id}.json"

        if not sbom_path.exists():
            return None

        return self._read_json(sbom_path)

    def update_sbom(
        self, project_id: str, sbom_id: str, sbom_data: dict[str, Any]
    ) -> bool:
        """Update an existing SBOM. Returns True if updated."""
        sbom_path = self._get_sboms_dir(project_id) / f"{sbom_id}.json"

        if not sbom_path.exists():
            return False

        # Update timestamp
        if "metadata" not in sbom_data:
            sbom_data["metadata"] = {}
        sbom_data["metadata"]["timestamp"] = datetime.now(timezone.utc).isoformat()

        self._write_json(sbom_path, sbom_data)

        # Update project updated_at
        self._touch_project(project_id)

        return True

    def delete_sbom(self, project_id: str, sbom_id: str) -> bool:
        """Delete an SBOM. Returns True if deleted."""
        sbom_path = self._get_sboms_dir(project_id) / f"{sbom_id}.json"

        if not sbom_path.exists():
            return False

        sbom_path.unlink()

        # Update project updated_at
        self._touch_project(project_id)

        return True

    def _touch_project(self, project_id: str) -> None:
        """Update project's updated_at timestamp."""
        project_dir = self._get_project_dir(project_id)
        metadata_path = project_dir / "metadata.json"

        if metadata_path.exists():
            metadata = self._read_json(metadata_path)
            metadata["updated_at"] = datetime.now(timezone.utc).isoformat()
            self._write_json(metadata_path, metadata)
