"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, FolderOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { listProjects, createProject } from "@/lib/sbom-api"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { ProjectMetadata } from "@/lib/project-types"

interface ProjectSelectorProps {
  selectedProjectId: string | null
  onProjectChange: (projectId: string | null) => void
}

export function SbomProjectSelector({
  selectedProjectId,
  onProjectChange,
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDescription, setNewProjectDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await listProjects()
      setProjects(response.projects)

      // Auto-select first project if none selected
      if (!selectedProjectId && response.projects.length > 0) {
        onProjectChange(response.projects[0].id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки проектов")
    } finally {
      setLoading(false)
    }
  }, [selectedProjectId, onProjectChange])

  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return

    try {
      setCreating(true)
      const newProject = await createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
      })
      setProjects([...projects, newProject])
      onProjectChange(newProject.id)
      setCreateDialogOpen(false)
      setNewProjectName("")
      setNewProjectDescription("")
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ошибка создания проекта",
      )
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FolderOpen className="h-4 w-4" />
        <span>Загрузка проектов...</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          value={selectedProjectId || undefined}
          onValueChange={onProjectChange}
        >
          <SelectTrigger className="w-[300px]">
            <SelectValue placeholder="Выберите проект" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Создать новый проект</DialogTitle>
            <DialogDescription>
              Введите название и описание проекта для хранения SBOM файлов.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name">Название проекта</Label>
              <Input
                id="project-name"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="Например: Мой проект"
              />
            </div>
            <div>
              <Label htmlFor="project-description">Описание (необязательно)</Label>
              <Textarea
                id="project-description"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="Описание проекта"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={creating}
            >
              Отмена
            </Button>
            <Button
              onClick={handleCreateProject}
              disabled={!newProjectName.trim() || creating}
            >
              {creating ? "Создание..." : "Создать"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
