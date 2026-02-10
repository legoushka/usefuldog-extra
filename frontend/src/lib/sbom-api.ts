import type { ValidateResponse, UnifyResponse } from "./sbom-types"

const API_BASE = "/api/tools/sbom"

class SbomApiError extends Error {
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

export { SbomApiError }

export async function validateSbom(file: File): Promise<ValidateResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE}/validate`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<ValidateResponse>(response)
}

export async function validateSbomJson(
  document: unknown,
  format: string = "oss",
): Promise<ValidateResponse> {
  const response = await fetch(`${API_BASE}/validate/json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ document, format }),
  })
  return handleResponse<ValidateResponse>(response)
}

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

  const response = await fetch(`${API_BASE}/unify`, {
    method: "POST",
    body: formData,
  })
  return handleResponse<UnifyResponse>(response)
}
