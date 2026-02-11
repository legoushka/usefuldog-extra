"use client"

import { useState, useCallback } from "react"
import { Upload, Merge, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { unifySboms, getSbom, SbomApiError } from "@/lib/sbom-api"
import {
  SbomUnifierFileList,
  type UnifierFile,
} from "./sbom-unifier-file-list"
import { SbomUnifierConfig, type UnifierConfig } from "./sbom-unifier-config"
import type { CycloneDxBom } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

interface UnifierProps {
  onUnified: (bom: CycloneDxBom) => void
  projectId?: string | null
  savedSboms?: SbomMetadata[]
}

export function SbomUnifier({
  onUnified,
  projectId,
  savedSboms = [],
}: UnifierProps) {
  const [mode, setMode] = useState<"project" | "upload">(
    projectId ? "project" : "upload",
  )
  const [files, setFiles] = useState<UnifierFile[]>([])
  const [selectedSbomIds, setSelectedSbomIds] = useState<Set<string>>(new Set())
  const [config, setConfig] = useState<UnifierConfig>({
    appName: "",
    appVersion: "1.0.0",
    manufacturer: "",
  })
  const [isUnifying, setIsUnifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const addFile = useCallback((file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string
        const parsed = JSON.parse(text)
        const componentsCount = parsed.components?.length || 0
        setFiles((prev) => [
          ...prev,
          { file, name: file.name, componentsCount },
        ])
      } catch {
        setError(`Не удалось разобрать JSON файл: ${file.name}`)
      }
    }
    reader.readAsText(file)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f) =>
        f.name.endsWith(".json"),
      )
      for (const file of droppedFiles) {
        addFile(file)
      }
    },
    [addFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files
      if (!selectedFiles) return
      for (const file of Array.from(selectedFiles)) {
        addFile(file)
      }
      e.target.value = ""
    },
    [addFile],
  )

  const handleRemove = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const handleToggleSbom = useCallback((sbomId: string) => {
    setSelectedSbomIds((prev) => {
      const next = new Set(prev)
      if (next.has(sbomId)) {
        next.delete(sbomId)
      } else {
        next.add(sbomId)
      }
      return next
    })
  }, [])

  const handleUnifyFromProject = async () => {
    if (!projectId || selectedSbomIds.size < 2) {
      setError("Необходимо выбрать минимум 2 SBOM")
      return
    }

    setIsUnifying(true)
    setError(null)

    try {
      // Fetch all selected SBOMs in parallel
      const sbomPromises = Array.from(selectedSbomIds).map((sbomId) =>
        getSbom(projectId, sbomId),
      )
      const sboms = await Promise.all(sbomPromises)

      // Convert to File objects for unifySboms API
      const files = sboms.map((sbom: CycloneDxBom, idx: number) => {
        const jsonString = JSON.stringify(sbom, null, 2)
        const blob = new Blob([jsonString], { type: "application/json" })
        const savedSbom = savedSboms.find((s) =>
          Array.from(selectedSbomIds)[idx] === s.id
        )
        const fileName = savedSbom
          ? `${savedSbom.name}-${savedSbom.version}.json`
          : `sbom-${idx}.json`
        return new File([blob], fileName, { type: "application/json" })
      })

      const result = await unifySboms(files, {
        app_name: config.appName || "Unified Application",
        app_version: config.appVersion || "1.0.0",
        manufacturer: config.manufacturer,
      })

      onUnified(result.bom as CycloneDxBom)
    } catch (err) {
      if (err instanceof SbomApiError) {
        setError(`Ошибка сервера (${err.status}): ${err.message}`)
      } else {
        setError("Не удалось объединить SBOM")
      }
    } finally {
      setIsUnifying(false)
    }
  }

  const handleUnify = async () => {
    if (mode === "project") {
      return handleUnifyFromProject()
    }

    if (files.length < 2) {
      setError("Необходимо загрузить минимум 2 файла")
      return
    }
    setIsUnifying(true)
    setError(null)
    try {
      const result = await unifySboms(
        files.map((f) => f.file),
        {
          app_name: config.appName || "Unified Application",
          app_version: config.appVersion || "1.0.0",
          manufacturer: config.manufacturer,
        },
      )
      onUnified(result.bom as CycloneDxBom)
    } catch (err) {
      if (err instanceof SbomApiError) {
        setError(`Ошибка сервера (${err.status}): ${err.message}`)
      } else {
        setError("Не удалось объединить SBOM файлы")
      }
    } finally {
      setIsUnifying(false)
    }
  }

  const canUnify =
    mode === "project"
      ? selectedSbomIds.size >= 2 && !isUnifying
      : files.length >= 2 && !isUnifying

  return (
    <div className="space-y-4">
      {projectId ? (
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="project">
              <FolderOpen className="h-4 w-4 mr-2" />
              Из проекта
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Upload className="h-4 w-4 mr-2" />
              Загрузить файлы
            </TabsTrigger>
          </TabsList>

          <TabsContent value="project" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">
                    Выбрано: {selectedSbomIds.size} / {savedSboms.length}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Минимум 2 для объединения
                  </p>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {savedSboms.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      В проекте нет сохранённых SBOM
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-3">
                      {savedSboms.map((sbom) => (
                        <div
                          key={sbom.id}
                          className="flex items-start space-x-2"
                        >
                          <Checkbox
                            id={sbom.id}
                            checked={selectedSbomIds.has(sbom.id)}
                            onCheckedChange={() =>
                              handleToggleSbom(sbom.id)
                            }
                          />
                          <label
                            htmlFor={sbom.id}
                            className="text-sm leading-none cursor-pointer"
                          >
                            {sbom.name} {sbom.version}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4 mt-4">
            <Card
              className={cn(
                "border-2 border-dashed transition-colors",
                isDragOver && "border-primary bg-primary/5",
              )}
            >
              <CardContent className="p-0">
                <label
                  className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragOver(true)
                  }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                >
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm">
                    Перетащите SBOM JSON файлы или нажмите для выбора
                  </p>
                  <input
                    type="file"
                    accept=".json"
                    multiple
                    onChange={handleChange}
                    className="hidden"
                  />
                </label>
              </CardContent>
            </Card>

            <SbomUnifierFileList files={files} onRemove={handleRemove} />
          </TabsContent>
        </Tabs>
      ) : (
        <>
          <Card
            className={cn(
              "border-2 border-dashed transition-colors",
              isDragOver && "border-primary bg-primary/5",
            )}
          >
            <CardContent className="p-0">
              <label
                className="flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
                onDragOver={(e) => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
              >
                <Upload className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm">
                  Перетащите SBOM JSON файлы или нажмите для выбора
                </p>
                <input
                  type="file"
                  accept=".json"
                  multiple
                  onChange={handleChange}
                  className="hidden"
                />
              </label>
            </CardContent>
          </Card>

          <SbomUnifierFileList files={files} onRemove={handleRemove} />
        </>
      )}

      <SbomUnifierConfig config={config} onChange={setConfig} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isUnifying && (
        <div className="space-y-2">
          <Skeleton className="h-10" />
          <Skeleton className="h-20" />
        </div>
      )}

      <Button onClick={handleUnify} disabled={!canUnify} className="w-full">
        <Merge className="h-4 w-4 mr-2" />
        {isUnifying
          ? "Объединение..."
          : mode === "project"
            ? `Объединить ${selectedSbomIds.size} SBOM`
            : `Объединить ${files.length} файлов`}
      </Button>
    </div>
  )
}
