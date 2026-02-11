"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Folder,
  FolderOpen,
  FileCode2,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  MoreVertical,
  FolderPlus,
  FilePlus,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  listProjects,
  getProject,
  createProject,
  deleteProject,
  getSbom,
  deleteSbom,
} from "@/lib/sbom-api"
import type {
  ProjectMetadata,
  SbomMetadata,
} from "@/lib/project-types"
import type { CycloneDxBom } from "@/lib/sbom-types"
import { cn } from "@/lib/utils"

interface FileExplorerProps {
  onOpenSbom: (sbom: CycloneDxBom, metadata: SbomMetadata, projectId: string) => void
  onCreateEmpty: (projectId: string) => void
  onFileLoaded?: (parsed: unknown, file: File, projectId: string) => void
  onProjectsLoaded?: (hasProjects: boolean) => void
  onProjectSelected?: (projectId: string, projectName: string) => void
  selectedProjectId?: string | null
  selectedSbomId?: string | null
  refreshTrigger?: number
}

export function SbomFileExplorer({
  onOpenSbom,
  onCreateEmpty,
  onFileLoaded,
  onProjectsLoaded,
  onProjectSelected,
  selectedProjectId,
  selectedSbomId,
  refreshTrigger,
}: FileExplorerProps) {
  const [projects, setProjects] = useState<ProjectMetadata[]>([])
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [projectSboms, setProjectSboms] = useState<Map<string, SbomMetadata[]>>(
    new Map(),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Drag and drop state
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null)

  // Create project dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")

  // Delete confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    type: "project" | "sbom"
    id: string
    name: string
    projectId?: string
  }>({
    open: false,
    type: "project",
    id: "",
    name: "",
  })

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listProjects()
      setProjects(response.projects)
      onProjectsLoaded?.(response.projects.length > 0)

      // Preload all SBOMs for all projects in parallel
      const sbomLoadPromises = response.projects.map(async (project) => {
        try {
          const projectDetail = await getProject(project.id)
          return { projectId: project.id, sboms: projectDetail.sboms }
        } catch (err) {
          console.error(`Failed to load SBOMs for project ${project.id}:`, err)
          return { projectId: project.id, sboms: [] }
        }
      })

      const sbomResults = await Promise.all(sbomLoadPromises)

      // Update state with all loaded SBOMs
      const newProjectSboms = new Map<string, SbomMetadata[]>()
      sbomResults.forEach(({ projectId, sboms }) => {
        newProjectSboms.set(projectId, sboms)
      })
      setProjectSboms(newProjectSboms)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось загрузить проекты")
      onProjectsLoaded?.(false)
    } finally {
      setLoading(false)
    }
  }, [onProjectsLoaded])

  const loadProjectSboms = useCallback(async (projectId: string) => {
    try {
      const project = await getProject(projectId)
      setProjectSboms((prev) => new Map(prev).set(projectId, project.sboms))
    } catch (err) {
      console.error("Failed to load project SBOMs:", err)
    }
  }, [])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // Reload when refresh is triggered from parent
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadProjects() // This now preloads all SBOMs automatically
    }
  }, [refreshTrigger, loadProjects])

  const toggleProject = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      await createProject({
        name: newProjectName,
        description: newProjectDescription,
      })
      await loadProjects()
      setCreateDialogOpen(false)
      setNewProjectName("")
      setNewProjectDescription("")
      toast.success("Проект создан")
    } catch (err) {
      toast.error("Не удалось создать проект: " + (err instanceof Error ? err.message : ""))
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    setDeleteDialog({
      open: true,
      type: "project",
      id: projectId,
      name: projectName,
    })
  }

  const confirmDelete = async () => {
    const { type, id, projectId } = deleteDialog

    try {
      if (type === "project") {
        await deleteProject(id)
        await loadProjects()
        setProjectSboms((prev) => {
          const next = new Map(prev)
          next.delete(id)
          return next
        })
        setExpandedProjects((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
        toast.success("Проект удалён")
      } else if (type === "sbom" && projectId) {
        await deleteSbom(projectId, id)
        await loadProjectSboms(projectId)
        await loadProjects()
        toast.success("SBOM удалён")
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : ""
      toast.error(`Не удалось удалить: ${errorMsg}`)
    } finally {
      setDeleteDialog({ open: false, type: "project", id: "", name: "" })
    }
  }

  const handleOpenSbom = async (
    projectId: string,
    sbom: SbomMetadata,
  ) => {
    try {
      const content = await getSbom(projectId, sbom.id)
      onOpenSbom(content, sbom, projectId)
    } catch (err) {
      toast.error("Не удалось загрузить SBOM: " + (err instanceof Error ? err.message : ""))
    }
  }

  const handleDeleteSbom = async (
    projectId: string,
    sbomId: string,
    sbomName: string,
  ) => {
    setDeleteDialog({
      open: true,
      type: "sbom",
      id: sbomId,
      name: sbomName,
      projectId,
    })
  }

  const handleCreateEmptySbom = (projectId: string) => {
    onCreateEmpty(projectId)
  }

  const handleUploadFile = useCallback(async (projectId: string, file: File) => {
    try {
      // Parse and validate JSON
      const text = await file.text()
      const parsed = JSON.parse(text)

      // Call parent to handle file loaded (will auto-save to project)
      if (onFileLoaded) {
        onFileLoaded(parsed, file, projectId)
      }

      // Refresh explorer after upload
      await loadProjectSboms(projectId)
      await loadProjects()
      toast.success("SBOM загружен")
    } catch (err) {
      toast.error("Не удалось загрузить файл: " + (err instanceof Error ? err.message : ""))
    }
  }, [onFileLoaded, loadProjectSboms, loadProjects])

  const triggerFileUpload = (projectId: string) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = ".json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        handleUploadFile(projectId, file)
      }
    }
    input.click()
  }

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, projectId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverProjectId(projectId)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverProjectId(null)
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent, projectId: string) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOverProjectId(null)

      const file = e.dataTransfer.files?.[0]
      if (file && file.type === "application/json") {
        await handleUploadFile(projectId, file)
      } else {
        toast.error("Пожалуйста, загрузите JSON файл")
      }
    },
    [handleUploadFile],
  )

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xs font-medium mb-0.5">Проекты</CardTitle>
            <p className="text-[10px] text-muted-foreground leading-tight">
              Нажмите + для загрузки
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setCreateDialogOpen(true)}
            title="Создать проект"
          >
            <FolderPlus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {error && (
          <Alert variant="destructive" className="m-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="px-3 pb-3">
            {loading ? (
              <p className="text-xs text-muted-foreground py-3">Загрузка...</p>
            ) : projects.length === 0 ? (
              <div className="text-center py-6">
                <Folder className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  Нет проектов
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
                  Создать проект
                </Button>
              </div>
            ) : (
              <div className="space-y-0.5">
                {projects.map((project) => {
                  const isExpanded = expandedProjects.has(project.id)
                  const sboms = projectSboms.get(project.id) || []
                  const isSelected = selectedProjectId === project.id
                  const isDragOver = dragOverProjectId === project.id

                  return (
                    <div key={project.id}>
                      {/* Project row */}
                      <div
                        className={cn(
                          "flex items-center gap-0.5 px-1.5 py-1 rounded hover:bg-accent group transition-colors",
                          isSelected && "bg-accent",
                          isDragOver && "bg-blue-50 border border-blue-500 border-dashed",
                        )}
                        onDragOver={(e) => handleDragOver(e, project.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, project.id)}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => toggleProject(project.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                        </Button>

                        {isExpanded ? (
                          <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                        ) : (
                          <Folder className="h-3.5 w-3.5 text-blue-500" />
                        )}

                        <span
                          className="flex-1 text-xs cursor-pointer truncate"
                          onClick={() => {
                            toggleProject(project.id)
                            onProjectSelected?.(project.id, project.name)
                          }}
                        >
                          {project.name}
                        </span>

                        <span className="text-[10px] text-muted-foreground">
                          {projectSboms.get(project.id)?.length || 0}
                        </span>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-5 w-5 p-0"
                          onClick={() => triggerFileUpload(project.id)}
                          title="Загрузить SBOM"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleCreateEmptySbom(project.id)}
                            >
                              <FilePlus className="h-4 w-4 mr-2" />
                              Создать пустой SBOM
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                handleDeleteProject(project.id, project.name)
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Удалить проект
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* SBOM files */}
                      {isExpanded && (
                        <div className="ml-4 space-y-0.5 mt-0.5">
                          {sboms.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-1 pl-5">
                              Нет SBOM файлов
                            </p>
                          ) : (
                            sboms.map((sbom) => {
                              const isSbomSelected = selectedSbomId === sbom.id

                              return (
                                <div
                                  key={sbom.id}
                                  className={cn(
                                    "flex items-center gap-1 px-1.5 py-1 pl-5 rounded hover:bg-accent cursor-pointer group",
                                    isSbomSelected && "bg-accent",
                                  )}
                                  onClick={() =>
                                    handleOpenSbom(project.id, sbom)
                                  }
                                >
                                  <FileCode2 className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs truncate leading-tight">
                                      {sbom.name}
                                    </p>
                                    {sbom.version && (
                                      <p className="text-[10px] text-muted-foreground leading-tight">
                                        v{sbom.version}
                                      </p>
                                    )}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDeleteSbom(
                                        project.id,
                                        sbom.id,
                                        sbom.name,
                                      )
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Create project dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый проект</DialogTitle>
            <DialogDescription>
              Введите название и описание проекта для группировки SBOM файлов
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Название проекта</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Мой проект"
              />
            </div>
            <div>
              <Label htmlFor="project-desc">Описание (необязательно)</Label>
              <Input
                id="project-desc"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Описание проекта"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim()}
            >
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Подтверждение удаления</DialogTitle>
            <DialogDescription>
              {deleteDialog.type === "project"
                ? `Удалить проект "${deleteDialog.name}" со всеми SBOM файлами? Это действие нельзя отменить.`
                : `Удалить SBOM "${deleteDialog.name}"? Это действие нельзя отменить.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog({ ...deleteDialog, open: false })}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
