"""FastAPI application for VEX-to-Confluence conversion."""

import json

from fastapi import FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from converters.vex_to_confluence import convert_vex_to_confluence
from models.vex import ConvertResponse, VexDocument

app = FastAPI(
    title="VEX Converter",
    description="Convert CycloneDX VEX files to Confluence wiki markup",
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
