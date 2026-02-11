"""Pydantic models for project and SBOM persistence API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ProjectMetadata(BaseModel):
    """Project metadata for list view."""

    id: str
    name: str
    description: str = ""
    created_at: str
    updated_at: str


class SbomMetadata(BaseModel):
    """SBOM metadata within a project."""

    id: str
    name: str
    version: str = ""
    uploaded_at: str


class ProjectDetail(BaseModel):
    """Detailed project info with SBOM list."""

    id: str
    name: str
    description: str = ""
    created_at: str
    updated_at: str
    sboms: list[SbomMetadata] = Field(default_factory=list)


class CreateProjectRequest(BaseModel):
    """Request to create a new project."""

    name: str
    description: str = ""


class SaveSbomRequest(BaseModel):
    """Request to save/update SBOM via JSON body."""

    document: dict[str, Any]


class ListProjectsResponse(BaseModel):
    """Response from list projects endpoint."""

    projects: list[ProjectMetadata] = Field(default_factory=list)


class SaveSbomResponse(BaseModel):
    """Response from save SBOM endpoint."""

    id: str
    name: str
    version: str = ""
    uploaded_at: str
