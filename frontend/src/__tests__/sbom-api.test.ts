import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  validateSbom,
  validateSbomJson,
  listProjects,
  createProject,
  deleteProject,
  uploadSbom,
  getSbom,
  updateSbom,
  deleteSbom,
  SbomApiError,
} from "@/lib/sbom-api"

describe("SBOM API client", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe("validateSbom", () => {
    it("sends file and returns validation response", async () => {
      const mockResponse = { valid: true, issues: [], schema_version: "1.6" }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const file = new File(["{}"], "test.json", { type: "application/json" })
      const result = await validateSbom(file)
      expect(result).toEqual(mockResponse)
    })
  })

  describe("validateSbomJson", () => {
    it("sends JSON body for validation", async () => {
      const mockResponse = { valid: true, issues: [], schema_version: "1.6" }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await validateSbomJson({ bomFormat: "CycloneDX" })
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/tools/sbom/validate/json",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe("listProjects", () => {
    it("fetches project list", async () => {
      const mockResponse = { projects: [] }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await listProjects()
      expect(result).toEqual(mockResponse)
    })
  })

  describe("createProject", () => {
    it("creates project with name and description", async () => {
      const mockResponse = { id: "123", name: "Test", description: "", sboms: [] }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await createProject({ name: "Test", description: "" })
      expect(result).toEqual(mockResponse)
    })
  })

  describe("deleteProject", () => {
    it("sends DELETE request", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

      await deleteProject("123")
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/123",
        expect.objectContaining({ method: "DELETE" }),
      )
    })

    it("throws SbomApiError on failure", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not found"),
        statusText: "Not Found",
      })

      await expect(deleteProject("999")).rejects.toThrow(SbomApiError)
    })
  })

  describe("uploadSbom", () => {
    it("uploads file to project", async () => {
      const mockResponse = { id: "sbom1", name: "test.json", version: "", uploaded_at: "" }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const file = new File(["{}"], "test.json", { type: "application/json" })
      const result = await uploadSbom("proj1", file)
      expect(result).toEqual(mockResponse)
    })
  })

  describe("getSbom", () => {
    it("fetches SBOM content", async () => {
      const mockBom = { bomFormat: "CycloneDX", specVersion: "1.6" }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBom),
      })

      const result = await getSbom("proj1", "sbom1")
      expect(result).toEqual(mockBom)
    })
  })

  describe("updateSbom", () => {
    it("sends PUT with SBOM data", async () => {
      const mockResponse = { id: "sbom1", name: "test", version: "", uploaded_at: "" }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await updateSbom("proj1", "sbom1", { document: {} })
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/proj1/sboms/sbom1",
        expect.objectContaining({ method: "PUT" }),
      )
      expect(result).toEqual(mockResponse)
    })
  })

  describe("deleteSbom", () => {
    it("sends DELETE request", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })

      await deleteSbom("proj1", "sbom1")
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/projects/proj1/sboms/sbom1",
        expect.objectContaining({ method: "DELETE" }),
      )
    })
  })
})
