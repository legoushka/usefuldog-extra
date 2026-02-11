/**
 * API client for SBOM operations and project persistence.
 * Combines SBOM validation/unify endpoints with project management endpoints.
 */

import type {
  ValidateResponse,
  UnifyResponse,
  CycloneDxBom,
} from "./sbom-types"
import type {
  ListProjectsResponse,
  ProjectDetail,
  CreateProjectRequest,
  SaveSbomRequest,
  SaveSbomResponse,
} from "./project-types"

const SBOM_API_BASE = "/api/tools/sbom"
const PROJECTS_API_BASE = "/api/projects"

export class SbomApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "SbomApiError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new SbomApiError(response.status, text || response.statusText)
  }
  return response.json()
}

// ============================================================================
// SBOM Validation and Unify Endpoints
// ============================================================================

/**
 * Validate SBOM file.
 * POST /api/tools/sbom/validate
 */
export async function validateSbom(file: File): Promise<ValidateResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${SBOM_API_BASE}/validate`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<ValidateResponse>(response)
}

/**
 * Validate SBOM JSON document.
 * POST /api/tools/sbom/validate/json
 */
export async function validateSbomJson(
  document: unknown,
  format: string = "oss",
): Promise<ValidateResponse> {
  const response = await fetch(`${SBOM_API_BASE}/validate/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, format }),
  })
  return handleResponse<ValidateResponse>(response)
}

/**
 * Unify multiple SBOM files into one.
 * POST /api/tools/sbom/unify
 */
export async function unifySboms(
  files: File[],
  config: { app_name: string; app_version: string; manufacturer: string },
): Promise<UnifyResponse> {
  const formData = new FormData()
  for (const file of files) {
    formData.append("files", file)
  }
  formData.append("app_name", config.app_name)
  formData.append("app_version", config.app_version)
  formData.append("manufacturer", config.manufacturer)

  const response = await fetch(`${SBOM_API_BASE}/unify`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<UnifyResponse>(response)
}

// ============================================================================
// Project Management Endpoints
// ============================================================================

/**
 * List all projects.
 * GET /api/projects
 */
export async function listProjects(): Promise<ListProjectsResponse> {
  const response = await fetch(PROJECTS_API_BASE, {
    method: "GET",
  })
  return handleResponse<ListProjectsResponse>(response)
}

/**
 * Create a new project.
 * POST /api/projects
 */
export async function createProject(
  data: CreateProjectRequest,
): Promise<ProjectDetail> {
  const response = await fetch(PROJECTS_API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  return handleResponse<ProjectDetail>(response)
}

/**
 * Get project details with SBOM list.
 * GET /api/projects/{id}
 */
export async function getProject(projectId: string): Promise<ProjectDetail> {
  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}`, {
    method: "GET",
  })
  return handleResponse<ProjectDetail>(response)
}

/**
 * Delete a project.
 * DELETE /api/projects/{id}
 */
export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new SbomApiError(response.status, text || response.statusText)
  }
}

/**
 * Upload SBOM file to a project.
 * POST /api/projects/{id}/sboms
 */
export async function uploadSbom(
  projectId: string,
  file: File,
): Promise<SaveSbomResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}/sboms`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<SaveSbomResponse>(response)
}

/**
 * Get SBOM content from a project.
 * GET /api/projects/{id}/sboms/{sbom_id}
 */
export async function getSbom(
  projectId: string,
  sbomId: string,
): Promise<CycloneDxBom> {
  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}/sboms/${sbomId}`, {
    method: "GET",
  })
  return handleResponse<CycloneDxBom>(response)
}

/**
 * Update SBOM content in a project.
 * PUT /api/projects/{id}/sboms/{sbom_id}
 */
export async function updateSbom(
  projectId: string,
  sbomId: string,
  data: SaveSbomRequest,
): Promise<SaveSbomResponse> {
  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}/sboms/${sbomId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })
  return handleResponse<SaveSbomResponse>(response)
}

/**
 * Delete SBOM from a project.
 * DELETE /api/projects/{id}/sboms/{sbom_id}
 */
export async function deleteSbom(
  projectId: string,
  sbomId: string,
): Promise<void> {
  const response = await fetch(`${PROJECTS_API_BASE}/${projectId}/sboms/${sbomId}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const text = await response.text()
    throw new SbomApiError(response.status, text || response.statusText)
  }
}
