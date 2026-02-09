const API_BASE = "/api/tools/vex"

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new ApiError(response.status, text || response.statusText)
  }
  return response.json()
}

export interface SeverityCounts {
  critical: number
  high: number
  medium: number
  low: number
  info: number
  none: number
  unknown: number
}

export interface Stats {
  total: number
  by_severity: SeverityCounts
  by_state: Record<string, number>
  by_source: Record<string, number>
  components_affected: number
}

export interface VulnerabilityInfo {
  id: string
  severity: string
  score: number | null
  source: string | null
  state: string | null
  description: string | null
  cwes: number[]
}

export interface ConvertResponse {
  markup: string
  stats: Stats
  vulnerabilities: VulnerabilityInfo[]
}

export async function uploadVexFile(file: File): Promise<ConvertResponse> {
  const formData = new FormData()
  formData.append("file", file)

  const response = await fetch(`${API_BASE}/convert/vex`, {
    method: "POST",
    body: formData,
  })

  return handleResponse<ConvertResponse>(response)
}

export async function healthCheck() {
  const response = await fetch(`${API_BASE}/health`)
  return handleResponse<{ status: string }>(response)
}
