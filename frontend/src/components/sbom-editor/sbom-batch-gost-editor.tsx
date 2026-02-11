"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { Package } from "lucide-react"
import type { CdxComponent, CdxProperty } from "@/lib/sbom-types"

interface BatchGostEditorProps {
  components: CdxComponent[]
  onChange: (updated: CdxComponent[]) => void
}

interface FlatComponent {
  component: CdxComponent
  path: number[]
  label: string
}

const GOST_PREFIX = "cdx:gost:"

const GOST_OPTIONS = [
  { value: "unchanged", label: "Не изменять" },
  { value: "none", label: "Не задано" },
  { value: "yes", label: "yes" },
  { value: "indirect", label: "indirect" },
  { value: "no", label: "no" },
]

function flattenComponents(
  components: CdxComponent[],
  basePath: number[] = [],
  prefix = "",
): FlatComponent[] {
  const result: FlatComponent[] = []

  components.forEach((comp, idx) => {
    const path = [...basePath, idx]
    const label = `${prefix}${comp.name || "Без имени"} (${comp.type})`

    result.push({ component: comp, path, label })

    if (comp.components && comp.components.length > 0) {
      result.push(
        ...flattenComponents(comp.components, path, `${prefix}  └─ `),
      )
    }
  })

  return result
}

function setGostProp(
  component: CdxComponent,
  propName: string,
  value: string,
): CdxComponent {
  const fullName = `${GOST_PREFIX}${propName}`
  const properties: CdxProperty[] = [...(component.properties || [])]
  const idx = properties.findIndex((p) => p.name === fullName)

  if (value === "unchanged") {
    // Don't change existing value
    return component
  } else if (value === "none") {
    // Remove property
    if (idx >= 0) properties.splice(idx, 1)
  } else if (idx >= 0) {
    properties[idx] = { ...properties[idx], value }
  } else {
    properties.push({ name: fullName, value })
  }

  return { ...component, properties }
}

function updateComponentAtPath(
  components: CdxComponent[],
  path: number[],
  updater: (comp: CdxComponent) => CdxComponent,
): CdxComponent[] {
  if (path.length === 0) return components

  const newComponents = [...components]
  const idx = path[0]

  if (path.length === 1) {
    newComponents[idx] = updater(newComponents[idx])
    return newComponents
  }

  const current = { ...newComponents[idx] }
  current.components = updateComponentAtPath(
    current.components || [],
    path.slice(1),
    updater,
  )
  newComponents[idx] = current
  return newComponents
}

export function BatchGostEditor({ components, onChange }: BatchGostEditorProps) {
  const [open, setOpen] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set())
  const [attackSurface, setAttackSurface] = useState("unchanged")
  const [securityFunction, setSecurityFunction] = useState("unchanged")

  const flatList = useMemo(
    () => flattenComponents(components),
    [components],
  )

  const handleToggleComponent = (pathKey: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(pathKey)) {
        next.delete(pathKey)
      } else {
        next.add(pathKey)
      }
      return next
    })
  }

  const handleApply = () => {
    let updated = components

    flatList.forEach((item) => {
      const pathKey = item.path.join("-")
      if (!selectedPaths.has(pathKey)) return

      updated = updateComponentAtPath(updated, item.path, (comp) => {
        let result = comp
        if (attackSurface && attackSurface !== "unchanged") {
          result = setGostProp(result, "attack_surface", attackSurface)
        }
        if (securityFunction && securityFunction !== "unchanged") {
          result = setGostProp(result, "security_function", securityFunction)
        }
        return result
      })
    })

    onChange(updated)
    setOpen(false)
    setSelectedPaths(new Set())
    setAttackSurface("unchanged")
    setSecurityFunction("unchanged")
  }

  const selectedCount = selectedPaths.size
  const canApply = selectedCount > 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Пакетное редактирование GOST
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Пакетное редактирование GOST-полей</DialogTitle>
          <DialogDescription>
            Выберите компоненты и укажите значения GOST-полей для массового
            применения.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">
              Компоненты ({selectedCount} выбрано)
            </Label>
            <ScrollArea className="h-[300px] border rounded-md mt-2">
              <div className="p-4 space-y-3">
                {flatList.map((item) => {
                  const pathKey = item.path.join("-")
                  const isSelected = selectedPaths.has(pathKey)

                  return (
                    <div key={pathKey} className="flex items-start space-x-2">
                      <Checkbox
                        id={pathKey}
                        checked={isSelected}
                        onCheckedChange={() => handleToggleComponent(pathKey)}
                      />
                      <label
                        htmlFor={pathKey}
                        className="text-sm leading-none cursor-pointer font-mono"
                      >
                        {item.label}
                      </label>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm">GOST:attack_surface</Label>
              <Select value={attackSurface} onValueChange={setAttackSurface}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Выберите значение" />
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

            <div className="space-y-2">
              <Label className="text-sm">GOST:security_function</Label>
              <Select
                value={securityFunction}
                onValueChange={setSecurityFunction}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Выберите значение" />
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
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleApply} disabled={!canApply}>
            Применить к {selectedCount} компонентам
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
