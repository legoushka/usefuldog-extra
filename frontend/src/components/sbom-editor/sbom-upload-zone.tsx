"use client"

import { useCallback, useState } from "react"
import { Upload, FileCode2 } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface SbomUploadZoneProps {
  onFileLoaded: (bom: unknown, file: File) => void
  isLoading: boolean
}

export function SbomUploadZone({ onFileLoaded, isLoading }: SbomUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const processFile = useCallback(
    (file: File) => {
      setParseError(null)
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const parsed = JSON.parse(text)
          if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
            setParseError("Файл не содержит JSON-объект.")
            return
          }
          if (parsed.bomFormat !== "CycloneDX") {
            setParseError(
              `Это не CycloneDX документ (bomFormat: "${parsed.bomFormat || "отсутствует"}"). Ожидается bomFormat: "CycloneDX".`,
            )
            return
          }
          onFileLoaded(parsed, file)
        } catch {
          setParseError("Не удалось разобрать JSON. Проверьте формат файла.")
        }
      }
      reader.onerror = () => {
        setParseError("Не удалось прочитать файл.")
      }
      reader.readAsText(file)
    },
    [onFileLoaded],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".json")) {
        processFile(file)
      }
    },
    [processFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        processFile(file)
      }
      e.target.value = ""
    },
    [processFile],
  )

  return (
    <Card
      className={cn(
        "border-2 border-dashed transition-colors",
        isDragOver && "border-primary bg-primary/5",
        isLoading && "opacity-50 pointer-events-none",
      )}
    >
      <CardContent className="p-0">
        <label
          className="flex flex-col items-center justify-center gap-3 p-10 cursor-pointer"
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="rounded-full bg-muted p-4">
            {isDragOver ? (
              <FileCode2 className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isLoading
                ? "Загрузка..."
                : "Перетащите CycloneDX SBOM JSON файл сюда"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              или нажмите для выбора
            </p>
          </div>
          {parseError && (
            <p className="text-xs text-destructive mt-1">{parseError}</p>
          )}
          <input
            type="file"
            accept=".json"
            onChange={handleChange}
            className="hidden"
            disabled={isLoading}
          />
        </label>
      </CardContent>
    </Card>
  )
}
