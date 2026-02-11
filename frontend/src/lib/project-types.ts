/**
 * TypeScript types matching backend Pydantic models from backends/python/models/project.py
 * These types define the shape of data for project and SBOM persistence API.
 */

/**
 * Project metadata for list view.
 */
export interface ProjectMetadata {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
}

/**
 * SBOM metadata within a project.
 */
export interface SbomMetadata {
  id: string
  name: string
  version: string
  uploaded_at: string
}

/**
 * Detailed project info with SBOM list.
 */
export interface ProjectDetail {
  id: string
  name: string
  description: string
  created_at: string
  updated_at: string
  sboms: SbomMetadata[]
}

/**
 * Request to create a new project.
 */
export interface CreateProjectRequest {
  name: string
  description?: string
}

/**
 * Request to save/update SBOM via JSON body.
 */
export interface SaveSbomRequest {
  document: Record<string, unknown>
}

/**
 * Response from list projects endpoint.
 */
export interface ListProjectsResponse {
  projects: ProjectMetadata[]
}

/**
 * Response from save SBOM endpoint.
 */
export interface SaveSbomResponse {
  id: string
  name: string
  version: string
  uploaded_at: string
}
