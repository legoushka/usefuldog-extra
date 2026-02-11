"use client"

import { useCallback, useState } from "react"
import { Upload, FileJson } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

const MAX_FILE_SIZE = 10 * 1024 * 1024

interface UploadZoneProps {
  onFileSelect: (file: File) => void
  isLoading: boolean
}

export function UploadZone({ onFileSelect, isLoading }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.name.endsWith(".json")) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error("Файл слишком большой. Максимальный размер — 10 МБ.")
          return
        }
        onFileSelect(file)
      }
    },
    [onFileSelect],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error("Файл слишком большой. Максимальный размер — 10 МБ.")
          return
        }
        onFileSelect(file)
      }
    },
    [onFileSelect],
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
              <FileJson className="h-8 w-8 text-primary" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">
              {isLoading ? "Обработка..." : "Перетащите CSAF VEX JSON файл сюда"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              или нажмите для выбора
            </p>
          </div>
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
