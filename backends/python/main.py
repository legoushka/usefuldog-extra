"""FastAPI application for VEX-to-Confluence conversion and SBOM tools."""

import json
from typing import Any

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from converters.vex_to_confluence import convert_vex_to_confluence
from converters.sbom_validator import validate_sbom
from converters.sbom_unifier import unify_sboms
from models.vex import ConvertResponse, VexDocument
from models.sbom import ValidateResponse, UnifyResponse
from models.project import (
    CreateProjectRequest,
    ListProjectsResponse,
    ProjectDetail,
    ProjectMetadata,
    SaveSbomRequest,
    SaveSbomResponse,
    SbomMetadata,
)
from storage.project_store import ProjectStore

app = FastAPI(
    title="UsefulDog Extra Backend",
    description="Backend for VEX conversion and SBOM tools",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize project store (uses /data by default, set DATA_DIR env var to override)
import os
data_dir = os.environ.get("DATA_DIR", "/data")
project_store = ProjectStore(data_dir=data_dir)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/convert/vex", response_model=ConvertResponse)
async def convert_vex(file: UploadFile) -> ConvertResponse:
    """Accept a CycloneDX VEX JSON file upload and return Confluence wiki markup."""
    try:
        content = await file.read()
        data = json.loads(content)
        doc = VexDocument.model_validate(data)
        return convert_vex_to_confluence(doc)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ── SBOM endpoints ──────────────────────────────────────────────────────────


class ValidateJsonRequest(BaseModel):
    document: dict[str, Any]
    format: str = "oss"


@app.post("/api/sbom/validate", response_model=ValidateResponse)
async def sbom_validate(file: UploadFile) -> ValidateResponse:
    """Validate a CycloneDX SBOM JSON file upload."""
    try:
        content = await file.read()
        data = json.loads(content)
        return validate_sbom(data)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {exc}") from exc
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/sbom/validate/json", response_model=ValidateResponse)
async def sbom_validate_json(request: ValidateJsonRequest) -> ValidateResponse:
    """Validate a CycloneDX SBOM from JSON body (from editor, no re-upload)."""
    try:
        return validate_sbom(request.document, request.format)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@app.post("/api/sbom/unify", response_model=UnifyResponse)
async def sbom_unify(
    files: list[UploadFile],
    app_name: str = "Unified Application",
    app_version: str = "1.0.0",
    manufacturer: str = "",
) -> UnifyResponse:
    """Unify multiple CycloneDX SBOM files into a single BOM."""
    if len(files) < 2:
        raise HTTPException(
            status_code=400, detail="At least 2 SBOM files are required"
        )
    documents: list[dict[str, Any]] = []
    for f in files:
        try:
            content = await f.read()
            data = json.loads(content)
            documents.append(data)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid JSON in file {f.filename}: {exc}",
            ) from exc
    try:
        return unify_sboms(documents, app_name, app_version, manufacturer)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


# ── Project persistence endpoints ──────────────────────────────────────────


@app.get("/api/projects", response_model=ListProjectsResponse)
async def list_projects() -> ListProjectsResponse:
    """List all projects."""
    try:
        projects = project_store.list_projects()
        return ListProjectsResponse(
            projects=[ProjectMetadata.model_validate(p) for p in projects]
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/projects", response_model=ProjectMetadata, status_code=201)
async def create_project(request: CreateProjectRequest) -> ProjectMetadata:
    """Create a new project."""
    try:
        metadata = project_store.create_project(request.name, request.description)
        return ProjectMetadata.model_validate(metadata)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/projects/{project_id}", response_model=ProjectDetail)
async def get_project(project_id: str) -> ProjectDetail:
    """Get project details with SBOM list."""
    try:
        project = project_store.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Проект не найден")
        return ProjectDetail.model_validate(project)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/api/projects/{project_id}", status_code=204)
async def delete_project(project_id: str) -> None:
    """Delete a project and all its SBOMs."""
    try:
        deleted = project_store.delete_project(project_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="Проект не найден")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post(
    "/api/projects/{project_id}/sboms", response_model=SaveSbomResponse, status_code=201
)
async def upload_sbom(project_id: str, file: UploadFile) -> SaveSbomResponse:
    """Upload a new SBOM to a project (multipart file)."""
    try:
        # Verify project exists
        project = project_store.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail="Проект не найден")

        # Parse SBOM file
        content = await file.read()
        sbom_data = json.loads(content)

        # Save SBOM
        sbom_metadata = project_store.save_sbom(
            project_id, sbom_data, file.filename or ""
        )
        return SaveSbomResponse.model_validate(sbom_metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Неверный JSON: {exc}") from exc
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/projects/{project_id}/sboms/{sbom_id}")
async def get_sbom(project_id: str, sbom_id: str) -> dict[str, Any]:
    """Get SBOM content."""
    try:
        sbom = project_store.get_sbom(project_id, sbom_id)
        if not sbom:
            raise HTTPException(status_code=404, detail="SBOM не найден")
        return sbom
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.put("/api/projects/{project_id}/sboms/{sbom_id}", response_model=SaveSbomResponse)
async def update_sbom(
    project_id: str, sbom_id: str, request: SaveSbomRequest
) -> SaveSbomResponse:
    """Update an existing SBOM."""
    try:
        # Verify SBOM exists
        existing = project_store.get_sbom(project_id, sbom_id)
        if not existing:
            raise HTTPException(status_code=404, detail="SBOM не найден")

        # Update SBOM
        updated = project_store.update_sbom(project_id, sbom_id, request.document)
        if not updated:
            raise HTTPException(status_code=404, detail="SBOM не найден")

        # Get updated SBOM list to return metadata
        sboms = project_store.list_sboms(project_id)
        sbom_metadata = next((s for s in sboms if s["id"] == sbom_id), None)
        if not sbom_metadata:
            raise HTTPException(status_code=500, detail="Ошибка обновления SBOM")

        return SaveSbomResponse.model_validate(sbom_metadata)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.delete("/api/projects/{project_id}/sboms/{sbom_id}", status_code=204)
async def delete_sbom(project_id: str, sbom_id: str) -> None:
    """Delete an SBOM."""
    try:
        deleted = project_store.delete_sbom(project_id, sbom_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="SBOM не найден")
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
