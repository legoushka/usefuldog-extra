"use client"

import { X, FileCode2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface UnifierFile {
  file: File
  name: string
  componentsCount: number
}

interface UnifierFileListProps {
  files: UnifierFile[]
  onRemove: (index: number) => void
}

export function SbomUnifierFileList({
  files,
  onRemove,
}: UnifierFileListProps) {
  if (files.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Загрузите минимум 2 SBOM файла для объединения
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {files.map((f, i) => (
        <Card key={i}>
          <CardContent className="flex items-center justify-between py-2 px-4">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                ({f.componentsCount} компонентов)
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemove(i)}
              className="h-7 w-7 p-0"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

export type { UnifierFile }
