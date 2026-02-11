"use client"

import { useCallback, useState } from "react"
import { Upload, FileCode2, Plus } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface SbomUploadZoneProps {
  onFileLoaded: (bom: unknown, file: File) => void
  isLoading: boolean
}

function generateEmptyBom() {
  const timestamp = new Date().toISOString()
  const appRef = `app-${Date.now()}`

  // Generate UUID v4
  const uuid = crypto.randomUUID()

  return {
    bomFormat: "CycloneDX",
    specVersion: "1.6",
    serialNumber: `urn:uuid:${uuid}`,
    version: 1,
    metadata: {
      timestamp,
      component: {
        type: "application",
        "bom-ref": appRef,
        name: "New Application",
        version: "1.0.0",
      },
      manufacturer: { name: "Organization Name" },
      properties: [
        { name: "cdx:gost:attack_surface", value: "no" },
        { name: "cdx:gost:security_function", value: "no" },
      ],
    },
    components: [],
    dependencies: [],
  }
}

export function SbomUploadZone({ onFileLoaded, isLoading }: SbomUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)

  const processFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error("Файл слишком большой. Максимальный размер — 10 МБ.")
        return
      }
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

  const handleCreateNew = useCallback(() => {
    setParseError(null)
    const emptyBom = generateEmptyBom()
    const jsonString = JSON.stringify(emptyBom, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const file = new File([blob], "new-sbom.json", { type: "application/json" })
    onFileLoaded(emptyBom, file)
  }, [onFileLoaded])

  return (
    <div className="space-y-4">
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

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">или</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full"
        onClick={handleCreateNew}
        disabled={isLoading}
      >
        <Plus className="h-4 w-4 mr-2" />
        Создать новый SBOM
      </Button>
    </div>
  )
}
