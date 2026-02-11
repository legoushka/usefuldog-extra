"use client"

import { useState } from "react"
import { FolderOpen, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { SbomFileExplorer } from "./sbom-file-explorer"
import type { SbomMetadata } from "@/lib/project-types"
import type { CycloneDxBom } from "@/lib/sbom-types"

const STORAGE_KEY = "sbom-explorer-open"

interface ExplorerSidebarProps {
  onOpenSbom: (
    sbom: CycloneDxBom,
    metadata: SbomMetadata,
    projectId: string,
  ) => void
  onCreateEmpty: (projectId: string) => void
  onFileLoaded?: (parsed: unknown, file: File, projectId: string) => void
  onProjectsLoaded?: (hasProjects: boolean) => void
  onProjectSelected?: (projectId: string, projectName: string) => void
  selectedProjectId?: string | null
  selectedSbomId?: string | null
  refreshTrigger?: number
}

function readStoredState(): boolean {
  if (typeof window === "undefined") return true
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return JSON.parse(stored)
  } catch {
    // ignore
  }
  return true
}

export function SbomExplorerSidebar(props: ExplorerSidebarProps) {
  const [isOpen, setIsOpen] = useState(readStoredState)

  const toggle = (open: boolean) => {
    setIsOpen(open)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(open))
    } catch {
      // ignore
    }
  }

  return (
    <div
      className={cn(
        "hidden lg:flex flex-col h-full shrink-0 transition-[width] duration-200 ease-linear overflow-hidden",
        isOpen ? "w-[280px]" : "w-12",
      )}
    >
      {isOpen ? (
        <div className="h-full flex flex-col w-[280px]">
          <div className="flex items-center justify-end px-1 pt-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => toggle(false)}
                >
                  <PanelLeftClose className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Свернуть панель</TooltipContent>
            </Tooltip>
          </div>
          <div className="flex-1 min-h-0">
            <SbomFileExplorer {...props} />
          </div>
        </div>
      ) : (
        <div className="h-full w-12 flex flex-col items-center border rounded-lg bg-card pt-2 gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => toggle(true)}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Развернуть проводник</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent"
                onClick={() => toggle(true)}
              >
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Проекты</TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
