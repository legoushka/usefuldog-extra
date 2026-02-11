import { describe, it, expect } from "vitest"
import {
  getComponentByPath,
  getGostProp,
  getGostProperties,
  flattenComponents,
  getLicenseName,
  countByType,
  aggregateLicenses,
  getComponentTypeLabel,
} from "@/lib/sbom-utils"
import type { CdxComponent } from "@/lib/sbom-types"

describe("getComponentByPath", () => {
  const components: CdxComponent[] = [
    {
      type: "application",
      name: "App",
      version: "1.0",
      components: [
        {
          type: "library",
          name: "Lib1",
          version: "2.0",
          components: [
            { type: "library", name: "SubLib", version: "3.0" },
          ],
        },
        { type: "library", name: "Lib2", version: "2.1" },
      ],
    },
    { type: "framework", name: "Framework", version: "4.0" },
  ]

  it("returns top-level component", () => {
    const result = getComponentByPath(components, [0])
    expect(result?.name).toBe("App")
  })

  it("returns nested component", () => {
    const result = getComponentByPath(components, [0, 0])
    expect(result?.name).toBe("Lib1")
  })

  it("returns deeply nested component", () => {
    const result = getComponentByPath(components, [0, 0, 0])
    expect(result?.name).toBe("SubLib")
  })

  it("returns undefined for empty path", () => {
    expect(getComponentByPath(components, [])).toBeUndefined()
  })

  it("returns undefined for undefined components", () => {
    expect(getComponentByPath(undefined, [0])).toBeUndefined()
  })

  it("returns undefined for out-of-bounds path", () => {
    expect(getComponentByPath(components, [99])).toBeUndefined()
  })

  it("returns undefined when nested path goes beyond tree", () => {
    expect(getComponentByPath(components, [1, 0])).toBeUndefined()
  })
})

describe("getGostProp", () => {
  it("extracts GOST property value", () => {
    const component: CdxComponent = {
      type: "application",
      name: "App",
      version: "1.0",
      properties: [
        { name: "cdx:gost:attack_surface", value: "yes" },
        { name: "cdx:gost:security_function", value: "no" },
      ],
    }
    expect(getGostProp(component, "attackSurface")).toBe("yes")
    expect(getGostProp(component, "securityFunction")).toBe("no")
  })

  it("returns undefined for missing property", () => {
    const component: CdxComponent = {
      type: "application",
      name: "App",
      version: "1.0",
    }
    expect(getGostProp(component, "attackSurface")).toBeUndefined()
  })
})

describe("getGostProperties", () => {
  it("extracts all GOST properties", () => {
    const component: CdxComponent = {
      type: "application",
      name: "App",
      version: "1.0",
      properties: [
        { name: "cdx:gost:attack_surface", value: "yes" },
        { name: "cdx:gost:security_function", value: "no" },
        { name: "cdx:gost:provided_by", value: "vendor" },
        { name: "cdx:gost:source_langs", value: "python,go" },
      ],
    }
    const result = getGostProperties(component)
    expect(result).toEqual({
      attackSurface: "yes",
      securityFunction: "no",
      providedBy: "vendor",
      sourceLangs: "python,go",
    })
  })
})

describe("flattenComponents", () => {
  it("flattens nested tree", () => {
    const components: CdxComponent[] = [
      {
        type: "application",
        name: "App",
        version: "1.0",
        components: [
          { type: "library", name: "Lib1", version: "2.0" },
        ],
      },
    ]
    const flat = flattenComponents(components)
    expect(flat).toHaveLength(2)
    expect(flat.map((c) => c.name)).toContain("App")
    expect(flat.map((c) => c.name)).toContain("Lib1")
  })

  it("returns empty array for undefined", () => {
    expect(flattenComponents(undefined)).toEqual([])
  })

  it("handles empty array", () => {
    expect(flattenComponents([])).toEqual([])
  })
})

describe("getLicenseName", () => {
  it("returns expression for expression license", () => {
    expect(getLicenseName({ expression: "MIT" })).toBe("MIT")
  })

  it("returns license id when available", () => {
    expect(getLicenseName({ license: { id: "Apache-2.0", name: "Apache" } })).toBe("Apache-2.0")
  })

  it("returns license name when no id", () => {
    expect(getLicenseName({ license: { name: "Custom License" } })).toBe("Custom License")
  })

  it("returns Unknown for empty license", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getLicenseName({ license: {} } as any)).toBe("Unknown")
  })
})

describe("countByType", () => {
  it("counts components by type", () => {
    const components: CdxComponent[] = [
      { type: "library", name: "A", version: "1" },
      { type: "library", name: "B", version: "2" },
      { type: "application", name: "C", version: "1" },
    ]
    expect(countByType(components)).toEqual({
      library: 2,
      application: 1,
    })
  })

  it("handles missing type as unknown", () => {
    const components = [{ name: "A", version: "1" }] as CdxComponent[]
    expect(countByType(components)).toEqual({ unknown: 1 })
  })
})

describe("aggregateLicenses", () => {
  it("aggregates licenses across components", () => {
    const components: CdxComponent[] = [
      { type: "library", name: "A", version: "1", licenses: [{ expression: "MIT" }] },
      { type: "library", name: "B", version: "2", licenses: [{ expression: "MIT" }, { expression: "Apache-2.0" }] },
    ]
    expect(aggregateLicenses(components)).toEqual({ MIT: 2, "Apache-2.0": 1 })
  })

  it("handles components without licenses", () => {
    const components: CdxComponent[] = [
      { type: "library", name: "A", version: "1" },
    ]
    expect(aggregateLicenses(components)).toEqual({})
  })
})

describe("getComponentTypeLabel", () => {
  it("returns Russian label for known types", () => {
    expect(getComponentTypeLabel("application")).toBe("Приложение")
    expect(getComponentTypeLabel("library")).toBe("Библиотека")
  })

  it("returns type string for unknown types", () => {
    expect(getComponentTypeLabel("custom-type")).toBe("custom-type")
  })
})
