"""Pydantic models matching the CycloneDX VEX schema and API response types."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# ── CycloneDX VEX input models ──────────────────────────────────────────────


class Source(BaseModel):
    name: str | None = None
    url: str | None = None


class Rating(BaseModel):
    source: Source | None = None
    score: float | None = None
    severity: str | None = None  # critical, high, medium, low, info, none, unknown
    method: str | None = None
    vector: str | None = None


class Analysis(BaseModel):
    state: str | None = None  # resolved, resolved_with_pedigree, exploitable,
    #   in_triage, false_positive, not_affected
    justification: str | None = None
    response: list[str] | None = None
    detail: str | None = None


class Affect(BaseModel):
    ref: str | None = None


class Vulnerability(BaseModel):
    id: str | None = None
    bom_ref: str | None = Field(None, alias="bom-ref")
    source: Source | None = None
    ratings: list[Rating] | None = None
    cwes: list[int] | None = None
    description: str | None = None
    detail: str | None = None
    recommendation: str | None = None
    advisories: list[dict[str, Any]] | None = None
    published: str | None = None
    updated: str | None = None
    analysis: Analysis | None = None
    affects: list[Affect] | None = None
    properties: list[dict[str, Any]] | None = None


class Component(BaseModel):
    type: str | None = None
    name: str | None = None
    version: str | None = None
    purl: str | None = None
    bom_ref: str | None = Field(None, alias="bom-ref")


class Metadata(BaseModel):
    timestamp: str | None = None
    component: Component | None = None
    tools: Any | None = None
    properties: list[dict[str, Any]] | None = None


class VexDocument(BaseModel):
    """Top-level CycloneDX VEX document."""
    bom_format: str | None = Field(None, alias="bomFormat")
    spec_version: str | None = Field(None, alias="specVersion")
    serial_number: str | None = Field(None, alias="serialNumber")
    version: int | None = None
    metadata: Metadata | None = None
    vulnerabilities: list[Vulnerability] | None = None
    components: list[Component] | None = None


# ── API response models ─────────────────────────────────────────────────────


class SeverityCounts(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0
    none: int = 0
    unknown: int = 0


class Stats(BaseModel):
    total: int = 0
    by_severity: SeverityCounts = Field(default_factory=SeverityCounts)
    by_state: dict[str, int] = Field(default_factory=dict)
    by_source: dict[str, int] = Field(default_factory=dict)
    components_affected: int = 0


class VulnerabilityInfo(BaseModel):
    id: str
    severity: str
    score: float | None = None
    source: str | None = None
    state: str | None = None
    description: str | None = None
    cwes: list[int] = Field(default_factory=list)


class ConvertResponse(BaseModel):
    markup: str
    stats: Stats
    vulnerabilities: list[VulnerabilityInfo]
