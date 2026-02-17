// CycloneDX 1.6 SBOM TypeScript types

export interface CdxProperty {
  name: string
  value: string
}

export interface CdxLicenseExpression {
  expression: string
}

export interface CdxLicenseId {
  license: {
    id?: string
    name?: string
    url?: string
  }
}

export type CdxLicenseChoice = CdxLicenseExpression | CdxLicenseId

export interface CdxExternalReference {
  type: string
  url: string
  comment?: string
}

export interface CdxHash {
  alg: string
  content: string
}

export interface CdxComponent {
  type: string
  name: string
  version?: string
  group?: string
  description?: string
  purl?: string
  cpe?: string
  scope?: string
  "bom-ref"?: string
  licenses?: CdxLicenseChoice[]
  hashes?: CdxHash[]
  externalReferences?: CdxExternalReference[]
  properties?: CdxProperty[]
  components?: CdxComponent[]
}

export interface CdxTool {
  vendor?: string
  name?: string
  version?: string
}

export interface CdxToolsChoice {
  tools?: CdxTool[]
  components?: CdxComponent[]
  services?: unknown[]
}

export interface CdxOrganizationalEntity {
  name?: string
  url?: string[]
  contact?: { name?: string; email?: string; phone?: string }[]
}

export interface CdxMetadata {
  timestamp?: string
  component?: CdxComponent
  tools?: CdxTool[] | CdxToolsChoice
  authors?: CdxOrganizationalEntity[]
  manufacture?: CdxOrganizationalEntity
  manufacturer?: CdxOrganizationalEntity
  supplier?: CdxOrganizationalEntity
  properties?: CdxProperty[]
}

export interface CdxDependency {
  ref: string
  dependsOn?: string[]
}

export interface CycloneDxBom {
  bomFormat?: string
  specVersion?: string
  serialNumber?: string
  version?: number
  metadata?: CdxMetadata
  components?: CdxComponent[]
  dependencies?: CdxDependency[]
  compositions?: unknown[]
  vulnerabilities?: unknown[]
  properties?: CdxProperty[]
}

// GOST/FSTEC extension properties
export interface GostProperties {
  attackSurface?: string // "yes" | "no" | "indirect"
  securityFunction?: string // "yes" | "no" | "indirect"
  providedBy?: string
  sourceLangs?: string
}

// API response types
export interface ValidationIssue {
  level: "error" | "warning" | "info"
  message: string
  path?: string
}

export interface ValidateResponse {
  valid: boolean
  issues: ValidationIssue[]
  schema_version?: string
}

export interface UnifyResponse {
  bom: CycloneDxBom
  components_count: number
  sources_count: number
}
