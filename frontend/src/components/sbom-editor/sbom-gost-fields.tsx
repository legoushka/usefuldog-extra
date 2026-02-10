"use client"

import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import type { CdxComponent, CdxProperty } from "@/lib/sbom-types"
import { getGostProp } from "@/lib/sbom-utils"

interface GostFieldsProps {
  component: CdxComponent
  onChange: (updated: CdxComponent) => void
}

const GOST_PREFIX = "cdx:gost:"

function setGostProp(
  component: CdxComponent,
  propName: string,
  value: string,
): CdxComponent {
  const fullName = `${GOST_PREFIX}${propName}`
  const properties: CdxProperty[] = [...(component.properties || [])]
  const idx = properties.findIndex((p) => p.name === fullName)

  if (value === "" || value === "none") {
    if (idx >= 0) properties.splice(idx, 1)
  } else if (idx >= 0) {
    properties[idx] = { ...properties[idx], value }
  } else {
    properties.push({ name: fullName, value })
  }

  return { ...component, properties }
}

const GOST_OPTIONS = [
  { value: "none", label: "Не задано" },
  { value: "yes", label: "yes" },
  { value: "indirect", label: "indirect" },
  { value: "no", label: "no" },
]

export function GostFields({ component, onChange }: GostFieldsProps) {
  const attackSurface = getGostProp(component, "attackSurface") || "none"
  const securityFunction =
    getGostProp(component, "securityFunction") || "none"
  const providedBy = getGostProp(component, "providedBy") || ""
  const sourceLangs = getGostProp(component, "sourceLangs") || ""

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">ГОСТ/ФСТЭК</h4>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">GOST:attack_surface</Label>
          <Select
            value={attackSurface}
            onValueChange={(v) =>
              onChange(setGostProp(component, "attack_surface", v))
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOST_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">GOST:security_function</Label>
          <Select
            value={securityFunction}
            onValueChange={(v) =>
              onChange(setGostProp(component, "security_function", v))
            }
          >
            <SelectTrigger className="h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {GOST_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">GOST:provided_by</Label>
          <Input
            value={providedBy}
            onChange={(e) =>
              onChange(setGostProp(component, "provided_by", e.target.value))
            }
            placeholder="Поставщик"
            className="h-8"
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">GOST:source_langs</Label>
          <Input
            value={sourceLangs}
            onChange={(e) =>
              onChange(setGostProp(component, "source_langs", e.target.value))
            }
            placeholder="Языки исходного кода"
            className="h-8"
          />
        </div>
      </div>
    </div>
  )
}
