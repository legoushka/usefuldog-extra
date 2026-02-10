"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GostFields } from "./sbom-gost-fields"
import type { CdxComponent } from "@/lib/sbom-types"

interface ComponentFormProps {
  component: CdxComponent
  onChange: (updated: CdxComponent) => void
}

const COMPONENT_TYPES = [
  "application",
  "framework",
  "library",
  "container",
  "platform",
  "operating-system",
  "device",
  "device-driver",
  "firmware",
  "file",
  "machine-learning-model",
  "data",
]

const SCOPES = ["required", "optional", "excluded"]

export function ComponentForm({ component, onChange }: ComponentFormProps) {
  const update = (fields: Partial<CdxComponent>) =>
    onChange({ ...component, ...fields })

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Редактирование компонента
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Тип</Label>
                <Select
                  value={component.type}
                  onValueChange={(v) => update({ type: v })}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPONENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Scope</Label>
                <Select
                  value={component.scope || "none"}
                  onValueChange={(v) =>
                    update({ scope: v === "none" ? undefined : v })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Не задан</SelectItem>
                    {SCOPES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Группа</Label>
              <Input
                value={component.group || ""}
                onChange={(e) => update({ group: e.target.value || undefined })}
                placeholder="org.example"
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Название</Label>
              <Input
                value={component.name}
                onChange={(e) => update({ name: e.target.value })}
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Версия</Label>
              <Input
                value={component.version || ""}
                onChange={(e) =>
                  update({ version: e.target.value || undefined })
                }
                placeholder="1.0.0"
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">PURL</Label>
              <Input
                value={component.purl || ""}
                onChange={(e) => update({ purl: e.target.value || undefined })}
                placeholder="pkg:npm/example@1.0.0"
                className="h-8 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">CPE</Label>
              <Input
                value={component.cpe || ""}
                onChange={(e) => update({ cpe: e.target.value || undefined })}
                placeholder="cpe:2.3:a:vendor:product:version"
                className="h-8 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={component.description || ""}
                onChange={(e) =>
                  update({ description: e.target.value || undefined })
                }
                rows={2}
                className="text-sm"
              />
            </div>

            <GostFields component={component} onChange={onChange} />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
