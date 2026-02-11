"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Download, AlertCircle } from "lucide-react"
import { getSbom } from "@/lib/sbom-api"
import type { SbomMetadata } from "@/lib/project-types"
import type { CdxComponent } from "@/lib/sbom-types"

interface SbomImportDialogProps {
  projectId: string | null
  savedSboms: SbomMetadata[]
  currentSbomId?: string
  onImport: (importedComponent: CdxComponent) => void
  disabled?: boolean
}

export function SbomImportDialog({
  projectId,
  savedSboms,
  currentSbomId,
  onImport,
  disabled = false,
}: SbomImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedSbomId, setSelectedSbomId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filter out current SBOM
  const availableSboms = savedSboms.filter((s) => s.id !== currentSbomId)

  useEffect(() => {
    if (!open) {
      setSelectedSbomId("")
      setError(null)
    }
  }, [open])

  const handleImport = async () => {
    if (!projectId || !selectedSbomId) return

    setLoading(true)
    setError(null)

    try {
      const sbom = await getSbom(projectId, selectedSbomId)

      // Extract metadata.component or create fallback
      let importedComponent: CdxComponent

      if (sbom.metadata?.component) {
        importedComponent = {
          ...sbom.metadata.component,
          type: "application",
          "bom-ref": sbom.metadata.component["bom-ref"] || `imported-app-${Date.now()}`,
        }
      } else {
        // Fallback: create application component from root components
        const sbomInfo = availableSboms.find((s) => s.id === selectedSbomId)
        importedComponent = {
          type: "application",
          name: sbomInfo?.name || "Imported Application",
          version: sbomInfo?.version || "1.0.0",
          "bom-ref": `imported-app-${Date.now()}`,
          description: `Imported from SBOM ${selectedSbomId}`,
        }
      }

      // Copy all nested components from imported SBOM
      if (sbom.components && sbom.components.length > 0) {
        importedComponent.components = sbom.components
      }

      onImport(importedComponent)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить SBOM")
    } finally {
      setLoading(false)
    }
  }

  const canImport = !loading && selectedSbomId !== ""

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || availableSboms.length === 0}
          className="h-8"
        >
          <Download className="h-4 w-4 mr-1" />
          Добавить SBOM как компонент
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Импортировать SBOM как компонент</DialogTitle>
          <DialogDescription>
            SBOM будет добавлен как application-компонент со всей вложенной
            структурой.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {availableSboms.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Нет доступных SBOM для импорта в текущем проекте.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Выберите SBOM для импорта</Label>
                <Select value={selectedSbomId} onValueChange={setSelectedSbomId}>
                  <SelectTrigger>
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
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            {loading ? "Загрузка..." : "Импортировать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
