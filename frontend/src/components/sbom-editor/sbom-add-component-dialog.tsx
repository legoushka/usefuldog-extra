"use client"

import { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { getSbom } from "@/lib/sbom-api"
import type { CdxComponent, CdxExternalReference } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

interface AddComponentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  components: CdxComponent[]
  selectedPath: number[] | null
  projectId?: string | null
  savedSboms?: SbomMetadata[]
  currentSbomId?: string
  onAdd: (component: CdxComponent, targetPath: number[] | null) => void
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

const GOST_PREFIX = "cdx:gost:"

const GOST_OPTIONS = [
  { value: "none", label: "Не задано" },
  { value: "yes", label: "yes" },
  { value: "indirect", label: "indirect" },
  { value: "no", label: "no" },
]

interface FlatItem {
  label: string
  pathKey: string
  path: number[]
}

function flattenComponents(
  components: CdxComponent[],
  basePath: number[] = [],
  prefix = "",
): FlatItem[] {
  const result: FlatItem[] = []
  components.forEach((comp, idx) => {
    const path = [...basePath, idx]
    const label = `${prefix}${comp.name || "Без имени"} (${comp.type})`
    result.push({ label, pathKey: path.join("-"), path })
    if (comp.components && comp.components.length > 0) {
      result.push(
        ...flattenComponents(comp.components, path, `${prefix}  └─ `),
      )
    }
  })
  return result
}

export function AddComponentDialog({
  open,
  onOpenChange,
  components,
  selectedPath,
  projectId,
  savedSboms = [],
  currentSbomId,
  onAdd,
}: AddComponentDialogProps) {
  const [mode, setMode] = useState<"manual" | "sbom">("manual")
  const [targetPathKey, setTargetPathKey] = useState<string>("root")
  const [type, setType] = useState("library")
  const [name, setName] = useState("")
  const [version, setVersion] = useState("")
  const [scope, setScope] = useState("none")
  const [group, setGroup] = useState("")
  const [purl, setPurl] = useState("")
  const [cpe, setCpe] = useState("")
  const [vcsUrl, setVcsUrl] = useState("")
  const [description, setDescription] = useState("")
  const [gostAttackSurface, setGostAttackSurface] = useState("none")
  const [gostSecurityFunction, setGostSecurityFunction] = useState("none")
  const [gostProvidedBy, setGostProvidedBy] = useState("")
  const [gostSourceLangs, setGostSourceLangs] = useState("")
  const [selectedSbomId, setSelectedSbomId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const flatList = useMemo(() => flattenComponents(components), [components])
  const availableSboms = savedSboms.filter((s) => s.id !== currentSbomId)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode("manual")
      setTargetPathKey(
        selectedPath && selectedPath.length > 0
          ? selectedPath.join("-")
          : "root",
      )
      setType("library")
      setName("")
      setVersion("")
      setScope("none")
      setGroup("")
      setPurl("")
      setCpe("")
      setVcsUrl("")
      setDescription("")
      setGostAttackSurface("none")
      setGostSecurityFunction("none")
      setGostProvidedBy("")
      setGostSourceLangs("")
      setSelectedSbomId("")
      setError(null)
    }
  }, [open, selectedPath])

  const resolveTargetPath = (): number[] | null => {
    if (targetPathKey === "root") return null
    const item = flatList.find((f) => f.pathKey === targetPathKey)
    return item?.path ?? null
  }

  const handleAddManual = () => {
    if (!name.trim()) {
      toast.error("Название компонента обязательно")
      return
    }

    // Build GOST properties
    const properties: { name: string; value: string }[] = []
    if (gostAttackSurface !== "none") {
      properties.push({ name: `${GOST_PREFIX}attack_surface`, value: gostAttackSurface })
    }
    if (gostSecurityFunction !== "none") {
      properties.push({ name: `${GOST_PREFIX}security_function`, value: gostSecurityFunction })
    }
    if (gostProvidedBy.trim()) {
      properties.push({ name: `${GOST_PREFIX}provided_by`, value: gostProvidedBy.trim() })
    }
    if (gostSourceLangs.trim()) {
      properties.push({ name: `${GOST_PREFIX}source_langs`, value: gostSourceLangs.trim() })
    }

    // Build external references
    const externalReferences: CdxExternalReference[] = []
    if (vcsUrl.trim()) {
      externalReferences.push({ type: "vcs", url: vcsUrl.trim() })
    }

    const comp: CdxComponent = {
      type,
      name: name.trim(),
      version: version.trim() || undefined,
      "bom-ref": "",
      scope: scope !== "none" ? scope : undefined,
      group: group.trim() || undefined,
      purl: purl.trim() || undefined,
      cpe: cpe.trim() || undefined,
      description: description.trim() || undefined,
      ...(externalReferences.length > 0 && { externalReferences }),
      ...(properties.length > 0 && { properties }),
    }
    onAdd(comp, resolveTargetPath())
    onOpenChange(false)
  }

  const handleAddFromSbom = async () => {
    if (!projectId || !selectedSbomId) return
    setLoading(true)
    setError(null)
    try {
      const sbom = await getSbom(projectId, selectedSbomId)

      let importedComponent: CdxComponent
      if (sbom.metadata?.component) {
        importedComponent = {
          ...sbom.metadata.component,
          type: "application",
          "bom-ref":
            sbom.metadata.component["bom-ref"] ||
            `imported-app-${Date.now()}`,
        }
      } else {
        const sbomInfo = availableSboms.find((s) => s.id === selectedSbomId)
        importedComponent = {
          type: "application",
          name: sbomInfo?.name || "Imported Application",
          version: sbomInfo?.version || "1.0.0",
          "bom-ref": `imported-app-${Date.now()}`,
        }
      }

      if (sbom.components && sbom.components.length > 0) {
        importedComponent.components = sbom.components
      }

      onAdd(importedComponent, resolveTargetPath())
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Не удалось загрузить SBOM",
      )
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    if (mode === "manual") {
      handleAddManual()
    } else {
      handleAddFromSbom()
    }
  }

  const canAdd =
    mode === "manual"
      ? name.trim().length > 0
      : selectedSbomId !== "" && !loading

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Добавить компонент</DialogTitle>
          <DialogDescription>
            Создайте компонент вручную или импортируйте из другого SBOM в
            проекте.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto min-h-0 flex-1 pr-1">
          {/* Target selector */}
          <div className="space-y-1.5">
            <Label className="text-xs">Куда добавить</Label>
            <Select value={targetPathKey} onValueChange={setTargetPathKey}>
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">В корень</SelectItem>
                {flatList.map((item) => (
                  <SelectItem key={item.pathKey} value={item.pathKey}>
                    <span className="font-mono text-xs">{item.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode tabs */}
          <Tabs
            value={mode}
            onValueChange={(v) => setMode(v as typeof mode)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Вручную</TabsTrigger>
              <TabsTrigger
                value="sbom"
                disabled={!projectId || availableSboms.length === 0}
              >
                Из SBOM в проекте
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="mt-3">
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Тип</Label>
                      <Select value={type} onValueChange={setType}>
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
                      <Select value={scope} onValueChange={setScope}>
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
                    <Label className="text-xs">Название *</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Введите название компонента"
                      className="h-8"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Группа</Label>
                      <Input
                        value={group}
                        onChange={(e) => setGroup(e.target.value)}
                        placeholder="org.example"
                        className="h-8"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Версия</Label>
                      <Input
                        value={version}
                        onChange={(e) => setVersion(e.target.value)}
                        placeholder="1.0.0"
                        className="h-8"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">PURL</Label>
                    <Input
                      value={purl}
                      onChange={(e) => setPurl(e.target.value)}
                      placeholder="pkg:npm/example@1.0.0"
                      className="h-8 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">CPE</Label>
                    <Input
                      value={cpe}
                      onChange={(e) => setCpe(e.target.value)}
                      placeholder="cpe:2.3:a:vendor:product:version"
                      className="h-8 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">VCS (ссылка на репозиторий)</Label>
                    <Input
                      value={vcsUrl}
                      onChange={(e) => setVcsUrl(e.target.value)}
                      placeholder="https://github.com/org/repo"
                      className="h-8 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Описание</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">ГОСТ/ФСТЭК</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">GOST:attack_surface</Label>
                        <Select value={gostAttackSurface} onValueChange={setGostAttackSurface}>
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
                        <Select value={gostSecurityFunction} onValueChange={setGostSecurityFunction}>
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
                          value={gostProvidedBy}
                          onChange={(e) => setGostProvidedBy(e.target.value)}
                          placeholder="Поставщик"
                          className="h-8"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">GOST:source_langs</Label>
                        <Input
                          value={gostSourceLangs}
                          onChange={(e) => setGostSourceLangs(e.target.value)}
                          placeholder="Языки исходного кода"
                          className="h-8"
                        />
                      </div>
                    </div>
                  </div>
                </div>
            </TabsContent>

            <TabsContent value="sbom" className="space-y-3 mt-3">
              {availableSboms.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Нет доступных SBOM для импорта в текущем проекте.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs">Выберите SBOM</Label>
                  <Select
                    value={selectedSbomId}
                    onValueChange={setSelectedSbomId}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue placeholder="Выберите SBOM..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSboms.map((sbom) => (
                        <SelectItem key={sbom.id} value={sbom.id}>
                          {sbom.name} {sbom.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    SBOM будет добавлен как application-компонент со всей
                    вложенной структурой.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleAdd} disabled={!canAdd}>
            {loading ? "Загрузка..." : "Добавить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
