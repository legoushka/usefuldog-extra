"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
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
import type { CdxComponent, CdxExternalReference } from "@/lib/sbom-types"

interface ComponentFormProps {
  component: CdxComponent
  onChange: (updated: CdxComponent) => void
  isNew?: boolean
  parentPath?: number[] | null
  onCancel?: () => void
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

export function ComponentForm({
  component,
  onChange,
  isNew = false,
  parentPath = null,
  onCancel,
}: ComponentFormProps) {
  const [localComponent, setLocalComponent] = useState<CdxComponent>(component)

  const update = (fields: Partial<CdxComponent>) => {
    const updated = { ...localComponent, ...fields }
    setLocalComponent(updated)
    if (!isNew) {
      onChange(updated)
    }
  }

  const handleSave = () => {
    // Validate required fields
    if (!localComponent.name.trim()) {
      toast.error("Название компонента обязательно")
      return
    }
    onChange(localComponent)
  }

  const isValid = localComponent.name.trim().length > 0

  const formTitle = isNew
    ? parentPath && parentPath.length > 0
      ? "Новый компонент (дочерний)"
      : "Новый компонент (корневой)"
    : "Редактирование компонента"

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">{formTitle}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-4 p-4 pt-0">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Тип *</Label>
                <Select
                  value={localComponent.type}
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
                  value={localComponent.scope || "none"}
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
                value={localComponent.group || ""}
                onChange={(e) => update({ group: e.target.value || undefined })}
                placeholder="org.example"
                className="h-8"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Название *</Label>
              <Input
                value={localComponent.name}
                onChange={(e) => update({ name: e.target.value })}
                className="h-8"
                placeholder="Введите название компонента"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Версия</Label>
              <Input
                value={localComponent.version || ""}
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
                value={localComponent.purl || ""}
                onChange={(e) => update({ purl: e.target.value || undefined })}
                placeholder="pkg:npm/example@1.0.0"
                className="h-8 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">CPE</Label>
              <Input
                value={localComponent.cpe || ""}
                onChange={(e) => update({ cpe: e.target.value || undefined })}
                placeholder="cpe:2.3:a:vendor:product:version"
                className="h-8 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">VCS (ссылка на репозиторий)</Label>
              <Input
                value={
                  localComponent.externalReferences?.find(
                    (r) => r.type === "vcs",
                  )?.url || ""
                }
                onChange={(e) => {
                  const url = e.target.value
                  const refs: CdxExternalReference[] = [
                    ...(localComponent.externalReferences || []).filter(
                      (r) => r.type !== "vcs",
                    ),
                  ]
                  if (url) {
                    refs.push({ type: "vcs", url })
                  }
                  update({
                    externalReferences: refs.length > 0 ? refs : undefined,
                  })
                }}
                placeholder="https://github.com/org/repo"
                className="h-8 font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Описание</Label>
              <Textarea
                value={localComponent.description || ""}
                onChange={(e) =>
                  update({ description: e.target.value || undefined })
                }
                rows={2}
                className="text-sm"
              />
            </div>

            <GostFields
              component={localComponent}
              onChange={(updated) => {
                setLocalComponent(updated)
                if (!isNew) {
                  onChange(updated)
                }
              }}
            />

            {isNew && (
              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={!isValid} className="flex-1">
                  Добавить
                </Button>
                <Button onClick={onCancel} variant="outline" className="flex-1">
                  Отмена
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
