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
