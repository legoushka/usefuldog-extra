"use client"

import { useState, useCallback } from "react"
import { getProject } from "@/lib/sbom-api"
import type { SbomMetadata } from "@/lib/project-types"

export function useSbomProject() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [currentSbomId, setCurrentSbomId] = useState<string | null>(null)
  const [currentSbomMetadata, setCurrentSbomMetadata] = useState<SbomMetadata | null>(null)
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null)
  const [savedSboms, setSavedSboms] = useState<SbomMetadata[]>([])
  const [explorerRefreshKey, setExplorerRefreshKey] = useState(0)
  const [hasProjects, setHasProjects] = useState(false)

  const refreshExplorer = useCallback(() => {
    setExplorerRefreshKey((prev) => prev + 1)
  }, [])

  const handleProjectSelected = useCallback(async (projectId: string, projectName: string) => {
    setSelectedProjectId(projectId)
    setCurrentProjectName(projectName)

    try {
      const project = await getProject(projectId)
      setSavedSboms(project.sboms)
    } catch (err) {
      console.error("Failed to load project SBOMs:", err)
      setSavedSboms([])
    }
  }, [])

  const resetEditor = useCallback(() => {
    setCurrentSbomId(null)
    setCurrentSbomMetadata(null)
  }, [])

  return {
    selectedProjectId,
    setSelectedProjectId,
    currentSbomId,
    setCurrentSbomId,
    currentSbomMetadata,
    setCurrentSbomMetadata,
    currentProjectName,
    setCurrentProjectName,
    savedSboms,
    setSavedSboms,
    explorerRefreshKey,
    hasProjects,
    setHasProjects,
    refreshExplorer,
    handleProjectSelected,
    resetEditor,
  }
}
