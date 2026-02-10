import type { CdxComponent, CdxLicenseChoice, GostProperties } from "./sbom-types"

/**
 * Navigate to a component by index path in a nested tree.
 * E.g. [0, 2, 1] means components[0].components[2].components[1]
 */
export function getComponentByPath(
  components: CdxComponent[] | undefined,
  path: number[],
): CdxComponent | undefined {
  if (!components || path.length === 0) return undefined
  let current: CdxComponent | undefined = components[path[0]]
  for (let i = 1; i < path.length; i++) {
    if (!current?.components) return undefined
    current = current.components[path[i]]
  }
  return current
}

const GOST_PREFIX = "cdx:gost:"

/**
 * Extract a GOST property value from a component's properties array.
 */
export function getGostProp(
  component: CdxComponent,
  name: keyof GostProperties,
): string | undefined {
  const propNameMap: Record<keyof GostProperties, string> = {
    attackSurface: `${GOST_PREFIX}attack_surface`,
    securityFunction: `${GOST_PREFIX}security_function`,
    providedBy: `${GOST_PREFIX}provided_by`,
    sourceLangs: `${GOST_PREFIX}source_langs`,
  }
  const key = propNameMap[name]
  return component.properties?.find((p) => p.name === key)?.value
}

/**
 * Extract all GOST properties from a component.
 */
export function getGostProperties(component: CdxComponent): GostProperties {
  return {
    attackSurface: getGostProp(component, "attackSurface"),
    securityFunction: getGostProp(component, "securityFunction"),
    providedBy: getGostProp(component, "providedBy"),
    sourceLangs: getGostProp(component, "sourceLangs"),
  }
}

/**
 * Flatten a nested component tree into a flat array.
 */
export function flattenComponents(
  components: CdxComponent[] | undefined,
): CdxComponent[] {
  if (!components) return []
  const result: CdxComponent[] = []
  const stack = [...components]
  while (stack.length > 0) {
    const comp = stack.pop()!
    result.push(comp)
    if (comp.components) {
      stack.push(...comp.components)
    }
  }
  return result
}

/**
 * Extract license name from a CdxLicenseChoice.
 */
export function getLicenseName(lc: CdxLicenseChoice): string {
  if ("expression" in lc) return lc.expression
  if ("license" in lc) return lc.license.id || lc.license.name || "Unknown"
  return "Unknown"
}

/**
 * Count components by type.
 */
export function countByType(
  components: CdxComponent[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of components) {
    const t = c.type || "unknown"
    counts[t] = (counts[t] || 0) + 1
  }
  return counts
}

/**
 * Aggregate licenses across all components.
 */
export function aggregateLicenses(
  components: CdxComponent[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const c of components) {
    if (!c.licenses) continue
    for (const lc of c.licenses) {
      const name = getLicenseName(lc)
      counts[name] = (counts[name] || 0) + 1
    }
  }
  return counts
}

/**
 * Human-readable component type labels in Russian.
 */
export const COMPONENT_TYPE_LABELS: Record<string, string> = {
  application: "Приложение",
  framework: "Фреймворк",
  library: "Библиотека",
  container: "Контейнер",
  platform: "Платформа",
  "operating-system": "ОС",
  device: "Устройство",
  "device-driver": "Драйвер",
  firmware: "Прошивка",
  file: "Файл",
  "machine-learning-model": "ML-модель",
  data: "Данные",
}

export function getComponentTypeLabel(type: string): string {
  return COMPONENT_TYPE_LABELS[type] || type
}
