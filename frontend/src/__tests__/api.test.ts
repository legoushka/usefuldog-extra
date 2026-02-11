import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { uploadVexFile, ApiError, healthCheck } from "@/lib/api"

describe("API client", () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    globalThis.fetch = vi.fn()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  describe("uploadVexFile", () => {
    it("sends file as FormData and returns parsed response", async () => {
      const mockResponse = {
        markup: "h1. Test",
        stats: { total: 1, by_severity: {}, by_state: {}, by_source: {}, components_affected: 0 },
        vulnerabilities: [],
      }
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const file = new File(["{}"], "test.json", { type: "application/json" })
      const result = await uploadVexFile(file)

      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/tools/vex/convert/vex",
        expect.objectContaining({ method: "POST" }),
      )
      expect(result).toEqual(mockResponse)
    })

    it("throws ApiError on non-ok response", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        status: 422,
        text: () => Promise.resolve("Invalid format"),
        statusText: "Unprocessable Entity",
      })

      const file = new File(["{}"], "test.json", { type: "application/json" })
      await expect(uploadVexFile(file)).rejects.toThrow(ApiError)
    })
  })

  describe("healthCheck", () => {
    it("returns health status", async () => {
      ;(globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "ok" }),
      })

      const result = await healthCheck()
      expect(result).toEqual({ status: "ok" })
    })
  })
})
