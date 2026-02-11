"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { HelpCircle, Save, CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SbomTabs } from "@/components/sbom-editor/sbom-tabs"
import { SbomMetadata as SbomMetadataPanel } from "@/components/sbom-editor/sbom-metadata"
import { SbomStatsCards } from "@/components/sbom-editor/sbom-stats-cards"
import { ComponentTree } from "@/components/sbom-editor/sbom-component-tree"
import { SbomDependencies } from "@/components/sbom-editor/sbom-dependencies"
import { SbomLicensesSummary } from "@/components/sbom-editor/sbom-licenses-summary"
import { SbomEditorPanel } from "@/components/sbom-editor/sbom-editor-panel"
import { SbomValidationPanel } from "@/components/sbom-editor/sbom-validation-panel"
import { SbomUnifier } from "@/components/sbom-editor/sbom-unifier"
import { SbomFileExplorer } from "@/components/sbom-editor/sbom-file-explorer"
import { SbomWelcomeScreen } from "@/components/sbom-editor/sbom-welcome-screen"
import { SbomBreadcrumbs } from "@/components/sbom-editor/sbom-breadcrumbs"
import { uploadSbom, updateSbom, getProject } from "@/lib/sbom-api"
import type { CycloneDxBom, ValidateResponse } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

export default function SbomEditorPage() {
  const [sbomData, setSbomData] = useState<CycloneDxBom | null>(null)
  const [selectedComponentPath, setSelectedComponentPath] = useState<
    number[] | null
  >(null)
  const [activeTab, setActiveTab] = useState("view")
  const [isDirty, setIsDirty] = useState(false)
  const [validationResults, setValidationResults] =
    useState<ValidateResponse | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  )
  const [currentSbomId, setCurrentSbomId] = useState<string | null>(null)
  const [currentSbomMetadata, setCurrentSbomMetadata] = useState<SbomMetadata | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [explorerRefreshKey, setExplorerRefreshKey] = useState(0)
  const [hasProjects, setHasProjects] = useState(false)
  const [savedSboms, setSavedSboms] = useState<SbomMetadata[]>([])
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const refreshExplorer = useCallback(() => {
    setExplorerRefreshKey((prev) => prev + 1)
  }, [])

  const handleFileLoaded = useCallback(
    async (parsed: unknown, file: File, projectId?: string) => {
      const bom = parsed as CycloneDxBom
      setSbomData(bom)
      setSelectedComponentPath(null)
      setValidationResults(null)
      setIsDirty(false)
      setActiveTab("view")

      // Use provided projectId or fall back to selectedProjectId
      const targetProjectId = projectId || selectedProjectId

      // Auto-save to project
      if (targetProjectId) {
        try {
          const response = await uploadSbom(targetProjectId, file)
          setCurrentSbomId(response.id)
          setSelectedProjectId(targetProjectId)
          refreshExplorer() // Refresh explorer to show new file
        } catch (err) {
          console.error("Failed to auto-save SBOM:", err)
        }
      }
    },
    [selectedProjectId, refreshExplorer],
  )

  const handleFileLoadedFromExplorer = useCallback(
    async (parsed: unknown, file: File, projectId: string) => {
      await handleFileLoaded(parsed, file, projectId)
    },
    [handleFileLoaded],
  )

  const handleProjectSelected = useCallback(async (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId)
    setCurrentProjectName(projectName)

    // Load SBOMs for this project
    try {
      const project = await getProject(projectId)
      setSavedSboms(project.sboms)
    } catch (err) {
      console.error("Failed to load project SBOMs:", err)
      setSavedSboms([])
    }

    // Clear SBOM selection when selecting a new project
    if (selectedProjectId !== projectId) {
      setSbomData(null)
      setCurrentSbomId(null)
      setCurrentSbomMetadata(null)
    }
  }, [selectedProjectId])

  const handleBomUpdate = useCallback((updatedBom: CycloneDxBom) => {
    setSbomData(updatedBom)
    setIsDirty(true)
    setAutoSaveStatus("idle") // Reset status when user makes changes
  }, [])

  const handleUnified = useCallback((bom: CycloneDxBom) => {
    setSbomData(bom)
    setSelectedComponentPath(null)
    setValidationResults(null)
    setIsDirty(false)
    setActiveTab("view")
  }, [])

  const handleSave = useCallback(async (showToast = true) => {
    if (!selectedProjectId || !currentSbomId || !sbomData) return

    try {
      setSaving(true)
      setAutoSaveStatus("saving")
      await updateSbom(selectedProjectId, currentSbomId, {
        document: sbomData as unknown as Record<string, unknown>,
      })
      setIsDirty(false)
      setAutoSaveStatus("saved")
      if (showToast) {
        toast.success("SBOM успешно сохранён")
      }
      // Reset "saved" status after 2 seconds
      setTimeout(() => {
        setAutoSaveStatus("idle")
      }, 2000)
    } catch (err) {
      console.error("Failed to save SBOM:", err)
      setAutoSaveStatus("idle")
      if (showToast) {
        toast.error("Ошибка сохранения: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
      }
    } finally {
      setSaving(false)
    }
  }, [selectedProjectId, currentSbomId, sbomData])

  // Auto-save with debounce
  useEffect(() => {
    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    // Don't auto-save if:
    // - No SBOM loaded
    // - No project/sbom ID
    // - Not dirty
    if (!sbomData || !selectedProjectId || !currentSbomId || !isDirty) {
      return
    }

    // Set new timeout for auto-save (2 seconds after last change)
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleSave(false) // Don't show toast for auto-save
    }, 2000)

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [sbomData, selectedProjectId, currentSbomId, isDirty, handleSave])

  const handleOpenSbomFromExplorer = useCallback(
    async (bom: CycloneDxBom, metadata: SbomMetadata, projectId: string) => {
      setSbomData(bom)
      setCurrentSbomId(metadata.id)
      setCurrentSbomMetadata(metadata)
      setSelectedProjectId(projectId)
      setSelectedComponentPath(null)
      setValidationResults(null)
      setIsDirty(false)
      setActiveTab("view")

      // Fetch project name and SBOMs for breadcrumbs and import
      try {
        const project = await getProject(projectId)
        setCurrentProjectName(project.name)
        setSavedSboms(project.sboms)
      } catch (err) {
        console.error("Failed to fetch project info:", err)
      }
    },
    [],
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
        setCurrentSbomId(response.id)
        setCurrentSbomMetadata({
          id: response.id,
          name: response.name,
          version: response.version,
          uploaded_at: response.uploaded_at,
        })
        setSelectedProjectId(projectId)
        setSelectedComponentPath(null)
        setValidationResults(null)
        setIsDirty(false)
        setActiveTab("view")

        // Fetch project name for breadcrumbs
        try {
          const project = await getProject(projectId)
          setCurrentProjectName(project.name)
        } catch (err) {
          console.error("Failed to fetch project name:", err)
        }

        refreshExplorer() // Refresh explorer to show new file
        toast.success("Пустой SBOM создан")
      } catch (err) {
        console.error("Failed to create empty SBOM:", err)
        toast.error("Ошибка создания SBOM: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
      }
    },
    [refreshExplorer],
  )

  const viewContent = sbomData ? (
    <>
      <SbomMetadataPanel
        metadata={sbomData.metadata}
        specVersion={sbomData.specVersion}
        bomFormat={sbomData.bomFormat}
        serialNumber={sbomData.serialNumber}
      />
      <SbomStatsCards
        components={sbomData.components || []}
        dependencies={sbomData.dependencies}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentTree
          components={sbomData.components || []}
          selectedPath={selectedComponentPath}
          onSelectPath={setSelectedComponentPath}
          onAddComponent={() => {}}
        />
        <div className="space-y-4">
          <SbomLicensesSummary components={sbomData.components || []} />
          <SbomDependencies dependencies={sbomData.dependencies || []} />
        </div>
      </div>
    </>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для просмотра
    </p>
  )

  const editContent = sbomData ? (
    <SbomEditorPanel
      bom={sbomData}
      selectedPath={selectedComponentPath}
      onSelectPath={setSelectedComponentPath}
      onChange={handleBomUpdate}
      validationResults={validationResults}
      projectId={selectedProjectId}
      savedSboms={savedSboms}
      currentSbomId={currentSbomId ?? undefined}
    />
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для редактирования
    </p>
  )

  const unifyContent = <SbomUnifier onUnified={handleUnified} />

  const validateContent = sbomData ? (
    <SbomValidationPanel
      bom={sbomData}
      validationResults={validationResults}
      onValidationResults={setValidationResults}
    />
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для валидации
    </p>
  )

  return (
    <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-full">
      {/* Left sidebar - File Explorer */}
      <div className="hidden lg:block">
        <SbomFileExplorer
          onOpenSbom={handleOpenSbomFromExplorer}
          onCreateEmpty={handleCreateEmptyFromExplorer}
          onFileLoaded={handleFileLoadedFromExplorer}
          onProjectsLoaded={setHasProjects}
          onProjectSelected={handleProjectSelected}
          selectedProjectId={selectedProjectId}
          selectedSbomId={currentSbomId}
          refreshTrigger={explorerRefreshKey}
        />
      </div>

      {/* Main content area */}
      <div className="space-y-6 min-w-0">
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
              {isDirty && autoSaveStatus === "idle" && (
                <Badge variant="secondary" className="text-xs">
                  Изменён
                </Badge>
              )}
              {currentSbomId && (
                <Button
                  size="sm"
                  onClick={() => handleSave(true)}
                  disabled={saving || !isDirty}
                  variant="outline"
                >
                  <Save className="h-4 w-4 mr-1" />
                  Сохранить
                </Button>
              )}
            </div>

            <SbomBreadcrumbs
              projectName={currentProjectName}
              sbomName={currentSbomMetadata?.name}
              sbomVersion={currentSbomMetadata?.version}
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
            viewContent={viewContent}
            editContent={editContent}
            unifyContent={unifyContent}
            validateContent={validateContent}
            hasBom={!!sbomData}
          />
        ) : (
          <SbomWelcomeScreen
            onCreateNew={() => {
              // Will create new SBOM - needs a project first
              if (!selectedProjectId) {
                toast.error("Сначала создайте или выберите проект в боковой панели")
                return
              }
              handleCreateEmptyFromExplorer(selectedProjectId)
            }}
            hasProjects={hasProjects}
          />
        )}
      </div>
    </div>
  )
}
