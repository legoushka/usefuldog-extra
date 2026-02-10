"use client"

import { useState, useCallback } from "react"
import { Upload, Merge } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { unifySboms, SbomApiError } from "@/lib/sbom-api"
import {
  SbomUnifierFileList,
  type UnifierFile,
} from "./sbom-unifier-file-list"
import { SbomUnifierConfig, type UnifierConfig } from "./sbom-unifier-config"
import type { CycloneDxBom } from "@/lib/sbom-types"

interface UnifierProps {
  onUnified: (bom: CycloneDxBom) => void
}

export function SbomUnifier({ onUnified }: UnifierProps) {
  const [files, setFiles] = useState<UnifierFile[]>([])
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

  const handleUnify = async () => {
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

  return (
    <div className="space-y-4">
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

      <Button
        onClick={handleUnify}
        disabled={files.length < 2 || isUnifying}
        className="w-full"
      >
        <Merge className="h-4 w-4 mr-2" />
        {isUnifying
          ? "Объединение..."
          : `Объединить ${files.length} файлов`}
      </Button>
    </div>
  )
}
