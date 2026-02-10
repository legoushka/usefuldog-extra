"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CycloneDxBom, CdxMetadata, CdxComponent } from "@/lib/sbom-types"

interface MetadataFormProps {
  bom: CycloneDxBom
  onChange: (updated: CycloneDxBom) => void
}

export function MetadataForm({ bom, onChange }: MetadataFormProps) {
  const metadata = bom.metadata || {}
  const component = metadata.component || ({} as CdxComponent)

  const updateMetadata = (fields: Partial<CdxMetadata>) =>
    onChange({ ...bom, metadata: { ...metadata, ...fields } })

  const updateComponent = (fields: Partial<CdxComponent>) =>
    updateMetadata({
      component: { ...component, ...fields },
    })

  const updateManufacturer = (name: string) =>
    updateMetadata({
      manufacturer: { ...(metadata.manufacturer || {}), name: name || undefined },
    })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Метаданные BOM</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Название компонента</Label>
            <Input
              value={component.name || ""}
              onChange={(e) => updateComponent({ name: e.target.value })}
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Версия</Label>
            <Input
              value={component.version || ""}
              onChange={(e) =>
                updateComponent({ version: e.target.value || undefined })
              }
              className="h-8"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Группа</Label>
            <Input
              value={component.group || ""}
              onChange={(e) =>
                updateComponent({ group: e.target.value || undefined })
              }
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Производитель</Label>
            <Input
              value={metadata.manufacturer?.name || metadata.manufacture?.name || ""}
              onChange={(e) => updateManufacturer(e.target.value)}
              className="h-8"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Версия спецификации</Label>
            <Input
              value={bom.specVersion || ""}
              onChange={(e) =>
                onChange({ ...bom, specVersion: e.target.value || undefined })
              }
              className="h-8"
              placeholder="1.6"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Серийный номер</Label>
            <Input
              value={bom.serialNumber || ""}
              onChange={(e) =>
                onChange({
                  ...bom,
                  serialNumber: e.target.value || undefined,
                })
              }
              className="h-8 font-mono text-xs"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
