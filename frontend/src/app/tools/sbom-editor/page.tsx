"use client"

import { useState, useCallback, useEffect } from "react"
import { HelpCircle, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SbomTabs } from "@/components/sbom-editor/sbom-tabs"
import { SbomEditorPanel } from "@/components/sbom-editor/sbom-editor-panel"
import { SbomUnifier } from "@/components/sbom-editor/sbom-unifier"
import { SbomExplorerSidebar } from "@/components/sbom-editor/sbom-explorer-sidebar"
import { SbomWelcomeScreen } from "@/components/sbom-editor/sbom-welcome-screen"
import { SbomBreadcrumbs } from "@/components/sbom-editor/sbom-breadcrumbs"
import { uploadSbom, getProject } from "@/lib/sbom-api"
import { useSbomAutoSave } from "@/hooks/use-sbom-auto-save"
import { useSbomProject } from "@/hooks/use-sbom-project"
import type { CycloneDxBom, ValidateResponse } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

export default function SbomEditorPage() {
  const [sbomData, setSbomData] = useState<CycloneDxBom | null>(null)
  const [selectedComponentPath, setSelectedComponentPath] = useState<
    number[] | null
  >(null)
  const [activeTab, setActiveTab] = useState("edit")
  const [validationResults, setValidationResults] =
    useState<ValidateResponse | null>(null)

  const project = useSbomProject()

  const { autoSaveStatus, handleBomUpdate } = useSbomAutoSave({
    selectedProjectId: project.selectedProjectId,
    currentSbomId: project.currentSbomId,
    onBomChange: setSbomData,
  })

  // Warn about unsaved changes when user has sbomData but no currentSbomId
  useEffect(() => {
    const hasUnsavedChanges = sbomData !== null && project.currentSbomId === null

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [sbomData, project.currentSbomId])

  const handleFileLoaded = useCallback(
    async (parsed: unknown, file: File, projectId?: string) => {
      const bom = parsed as CycloneDxBom
      setSbomData(bom)
      setSelectedComponentPath(null)
      setValidationResults(null)
      setActiveTab("edit")

      // Use provided projectId or fall back to selectedProjectId
      const targetProjectId = projectId || project.selectedProjectId

      // Auto-save to project
      if (targetProjectId) {
        try {
          const response = await uploadSbom(targetProjectId, file)
          project.setCurrentSbomId(response.id)
          project.setSelectedProjectId(targetProjectId)
          project.refreshExplorer() // Refresh explorer to show new file
        } catch (err) {
          console.error("Failed to auto-save SBOM:", err)
        }
      }
    },
    [project],
  )

  const handleFileLoadedFromExplorer = useCallback(
    async (parsed: unknown, file: File, projectId: string) => {
      await handleFileLoaded(parsed, file, projectId)
    },
    [handleFileLoaded],
  )

  const handleProjectSelected = useCallback(async (projectId: string, projectName: string) => {
    const prevProjectId = project.selectedProjectId
    await project.handleProjectSelected(projectId, projectName)
    if (prevProjectId !== projectId) {
      setSbomData(null)
      project.resetEditor()
    }
  }, [project])

  const handleUnified = useCallback((bom: CycloneDxBom) => {
    setSbomData(bom)
    setSelectedComponentPath(null)
    setValidationResults(null)
    setActiveTab("edit")
  }, [])

  const handleOpenSbomFromExplorer = useCallback(
    async (bom: CycloneDxBom, metadata: SbomMetadata, projectId: string) => {
      setSbomData(bom)
      project.setCurrentSbomId(metadata.id)
      project.setCurrentSbomMetadata(metadata)
      project.setSelectedProjectId(projectId)
      setSelectedComponentPath(null)
      setValidationResults(null)
      setActiveTab("edit")

      // Fetch project name and SBOMs for breadcrumbs and import
      try {
        const projectData = await getProject(projectId)
        project.setCurrentProjectName(projectData.name)
        project.setSavedSboms(projectData.sboms)
      } catch (err) {
        console.error("Failed to fetch project info:", err)
      }
    },
    [project],
  )

  const handleCreateEmptyFromExplorer = useCallback(
    async (projectId: string) => {
      // Generate empty BOM
      const emptyBom: CycloneDxBom = {
        bomFormat: "CycloneDX",
        specVersion: "1.6",
        serialNumber: `urn:uuid:${crypto.randomUUID()}`,
        version: 1,
        metadata: {
          timestamp: new Date().toISOString(),
          component: {
            type: "application",
            "bom-ref": `app-${Date.now()}`,
            name: "New Application",
            version: "1.0.0",
          },
          manufacturer: {
            name: "Organization Name",
          },
          properties: [
            {
              name: "cdx:gost:attack_surface",
              value: "no",
            },
            {
              name: "cdx:gost:security_function",
              value: "no",
            },
          ],
        },
        components: [],
        dependencies: [],
      }

      // Save to project
      try {
        const file = new File(
          [JSON.stringify(emptyBom, null, 2)],
          "new-sbom.json",
          { type: "application/json" },
        )
        const response = await uploadSbom(projectId, file)
        setSbomData(emptyBom)
        project.setCurrentSbomId(response.id)
        project.setCurrentSbomMetadata({
          id: response.id,
          name: response.name,
          version: response.version,
          uploaded_at: response.uploaded_at,
        })
        project.setSelectedProjectId(projectId)
        setSelectedComponentPath(null)
        setValidationResults(null)
        setActiveTab("edit")

        // Fetch project name for breadcrumbs
        try {
          const projectData = await getProject(projectId)
          project.setCurrentProjectName(projectData.name)
        } catch (err) {
          console.error("Failed to fetch project name:", err)
        }

        project.refreshExplorer() // Refresh explorer to show new file
        toast.success("Пустой SBOM создан")
      } catch (err) {
        console.error("Failed to create empty SBOM:", err)
        toast.error("Ошибка создания SBOM: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
      }
    },
    [project],
  )

  const editContent = sbomData ? (
    <SbomEditorPanel
      bom={sbomData}
      selectedPath={selectedComponentPath}
      onSelectPath={setSelectedComponentPath}
      onChange={handleBomUpdate}
      validationResults={validationResults}
      onValidationResults={setValidationResults}
      projectId={project.selectedProjectId}
      savedSboms={project.savedSboms}
      currentSbomId={project.currentSbomId ?? undefined}
    />
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для редактирования
    </p>
  )

  const unifyContent = (
    <SbomUnifier
      onUnified={handleUnified}
      projectId={project.selectedProjectId}
      savedSboms={project.savedSboms}
    />
  )

  return (
    <div className="flex gap-4 h-full">
      {/* Left sidebar - File Explorer */}
      <SbomExplorerSidebar
        onOpenSbom={handleOpenSbomFromExplorer}
        onCreateEmpty={handleCreateEmptyFromExplorer}
        onFileLoaded={handleFileLoadedFromExplorer}
        onProjectsLoaded={project.setHasProjects}
        onProjectSelected={handleProjectSelected}
        selectedProjectId={project.selectedProjectId}
        selectedSbomId={project.currentSbomId}
        refreshTrigger={project.explorerRefreshKey}
      />

      {/* Main content area */}
      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-start justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                SBOM Редактор
              </h1>
              {autoSaveStatus === "saving" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Сохранение...
                </Badge>
              )}
              {autoSaveStatus === "saved" && (
                <Badge variant="secondary" className="text-xs flex items-center gap-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Сохранено
                </Badge>
              )}
            </div>

            <SbomBreadcrumbs
              projectName={project.currentProjectName}
              sbomName={project.currentSbomMetadata?.name}
              sbomVersion={project.currentSbomMetadata?.version}
            />

            {!sbomData && (
              <p className="text-muted-foreground">
                Просмотр, редактирование, объединение и валидация CycloneDX SBOM
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/tools/sbom-editor/help">
              <HelpCircle className="h-4 w-4 mr-1" />
              Справка
            </Link>
          </Button>
        </div>

        {sbomData ? (
          <SbomTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            editContent={editContent}
            unifyContent={unifyContent}
            hasBom={!!sbomData}
          />
        ) : (
          <SbomWelcomeScreen
            onCreateNew={() => {
              // Will create new SBOM - needs a project first
              if (!project.selectedProjectId) {
                toast.error("Сначала создайте или выберите проект в боковой панели")
                return
              }
              handleCreateEmptyFromExplorer(project.selectedProjectId)
            }}
            hasProjects={project.hasProjects}
          />
        )}
      </div>
    </div>
  )
}
