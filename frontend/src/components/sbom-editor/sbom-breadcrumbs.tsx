"use client"

import { ChevronRight, FolderOpen, FileCode2 } from "lucide-react"

interface BreadcrumbsProps {
  projectName?: string | null
  sbomName?: string | null
  sbomVersion?: string | null
}

export function SbomBreadcrumbs({ projectName, sbomName, sbomVersion }: BreadcrumbsProps) {
  if (!projectName && !sbomName) return null

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {projectName && (
        <>
          <FolderOpen className="h-4 w-4" />
          <span className="font-medium">{projectName}</span>
        </>
      )}

      {projectName && sbomName && (
        <ChevronRight className="h-3 w-3" />
      )}

      {sbomName && (
        <>
          <FileCode2 className="h-4 w-4" />
          <span className="font-medium">{sbomName}</span>
          {sbomVersion && (
            <span className="text-xs">v{sbomVersion}</span>
          )}
        </>
      )}
    </div>
  )
}
