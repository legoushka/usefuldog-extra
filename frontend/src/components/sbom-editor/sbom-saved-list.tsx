"use client"

import { useState, useEffect } from "react"
import { FileCode2, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getProject, getSbom, deleteSbom } from "@/lib/sbom-api"
import type { SbomMetadata } from "@/lib/project-types"
import type { CycloneDxBom } from "@/lib/sbom-types"

interface SavedListProps {
  projectId: string | null
  onLoadSbom: (bom: CycloneDxBom, metadata: SbomMetadata) => void
}

export function SbomSavedList({ projectId, onLoadSbom }: SavedListProps) {
  const [sboms, setSboms] = useState<SbomMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadingSbomId, setLoadingSbomId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [sbomToDelete, setSbomToDelete] = useState<SbomMetadata | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!projectId) {
      setSboms([])
      setError(null)
      return
    }

    const loadSboms = async () => {
      try {
        setLoading(true)
        setError(null)
        const project = await getProject(projectId)
        setSboms(project.sboms)
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Ошибка загрузки SBOM списка",
        )
      } finally {
        setLoading(false)
      }
    }

    loadSboms()
  }, [projectId])

  const handleLoadSbom = async (metadata: SbomMetadata) => {
    if (!projectId) return

    try {
      setLoadingSbomId(metadata.id)
      setError(null)
      const sbomData = await getSbom(projectId, metadata.id)
      onLoadSbom(sbomData as CycloneDxBom, metadata)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки SBOM")
    } finally {
      setLoadingSbomId(null)
    }
  }

  const handleDeleteClick = (metadata: SbomMetadata) => {
    setSbomToDelete(metadata)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!projectId || !sbomToDelete) return

    try {
      setDeleting(true)
      await deleteSbom(projectId, sbomToDelete.id)
      setSboms(sboms.filter((s) => s.id !== sbomToDelete.id))
      setDeleteDialogOpen(false)
      setSbomToDelete(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления SBOM")
    } finally {
      setDeleting(false)
    }
  }

  if (!projectId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Сохранённые SBOM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Выберите проект для просмотра сохранённых SBOM
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Сохранённые SBOM</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Загрузка...
          </p>
        ) : sboms.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Нет сохранённых SBOM в этом проекте
          </p>
        ) : (
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {sboms.map((sbom) => (
                <Card key={sbom.id}>
                  <CardContent className="flex items-center justify-between py-2 px-4">
                    <div className="flex items-center gap-2 flex-1">
                      <FileCode2 className="h-4 w-4 text-muted-foreground" />
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{sbom.name}</span>
                        {sbom.version && (
                          <span className="text-xs text-muted-foreground">
                            v{sbom.version}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLoadSbom(sbom)}
                        disabled={loadingSbomId === sbom.id}
                        className="h-8 px-2"
                      >
                        <Download className="h-3.5 w-3.5 mr-1" />
                        {loadingSbomId === sbom.id ? "Загрузка..." : "Загрузить"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(sbom)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить SBOM?</DialogTitle>
            <DialogDescription>
              Вы уверены, что хотите удалить &quot;{sbomToDelete?.name}&quot;?
              Это действие необратимо.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? "Удаление..." : "Удалить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
