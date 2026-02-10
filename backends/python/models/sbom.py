"""Pydantic models for SBOM API responses."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ValidationIssue(BaseModel):
    """A single validation issue (error or warning)."""

    level: str  # "error" or "warning"
    message: str
    path: str | None = None


class ValidateResponse(BaseModel):
    """Response from SBOM validation endpoint."""

    valid: bool
    issues: list[ValidationIssue] = Field(default_factory=list)
    schema_version: str | None = None


class UnifyResponse(BaseModel):
    """Response from SBOM unification endpoint."""

    bom: dict  # The unified CycloneDX BOM as a dict
    components_count: int = 0
    sources_count: int = 0
