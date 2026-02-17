"use client"

import { ChevronRight, Trash2, AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getGostProp, getComponentTypeLabel } from "@/lib/sbom-utils"
import { GostBadge } from "./sbom-gost-badge"
import type { CdxComponent, ValidationIssue } from "@/lib/sbom-types"

export interface ComponentIssueData {
  errors: number
  warnings: number
  infos: number
  issues: ValidationIssue[]
}

interface ComponentNodeProps {
  component: CdxComponent
  path: number[]
  selectedPath: number[] | null
  onSelect: (path: number[]) => void
  onRequestDelete?: () => void
  isExpanded: boolean
  hasChildren: boolean
  onToggle: () => void
  depth: number
  issueData?: ComponentIssueData
}

const typeBadgeColors: Record<string, string> = {
  application: "bg-blue-600 hover:bg-blue-600 text-white",
  library: "bg-purple-600 hover:bg-purple-600 text-white",
  framework: "bg-indigo-600 hover:bg-indigo-600 text-white",
  container: "bg-teal-600 hover:bg-teal-600 text-white",
  platform: "bg-cyan-600 hover:bg-cyan-600 text-white",
  "operating-system": "bg-slate-600 hover:bg-slate-600 text-white",
  file: "bg-gray-500 hover:bg-gray-500 text-white",
}

export function ComponentNode({
  component,
  path,
  selectedPath,
  onSelect,
  onRequestDelete,
  isExpanded,
  hasChildren,
  onToggle,
  depth,
  issueData,
}: ComponentNodeProps) {
  const isSelected =
    selectedPath !== null &&
    path.length === selectedPath.length &&
    path.every((v, i) => v === selectedPath[i])

  const attackSurface = getGostProp(component, "attackSurface")
  const securityFunction = getGostProp(component, "securityFunction")

  const hasErrors = issueData && issueData.errors > 0
  const hasWarnings = issueData && issueData.warnings > 0 && !hasErrors
  const hasInfoOnly = issueData && issueData.infos > 0 && !hasErrors && !hasWarnings

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-1.5 py-1 px-2 rounded-md cursor-pointer text-sm hover:bg-accent/50 transition-colors border-l-4 group",
          isSelected && "bg-accent",
          hasErrors && "border-destructive",
          hasWarnings && "border-yellow-500",
          hasInfoOnly && "border-green-500",
          !hasErrors && !hasWarnings && !hasInfoOnly && "border-transparent",
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelect(path)}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
            className="p-0.5 rounded hover:bg-accent"
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                isExpanded && "rotate-90",
              )}
            />
          </button>
        ) : (
          <span className="w-4.5" />
        )}

        <Badge
          className={cn(
            "text-[10px] px-1.5 py-0 shrink-0",
            typeBadgeColors[component.type] || "",
          )}
        >
          {getComponentTypeLabel(component.type)}
        </Badge>

        <span className="truncate font-medium">
          {component.group ? `${component.group}/` : ""}
          {component.name}
        </span>

        {component.version && (
          <span className="text-muted-foreground text-xs shrink-0">
            {component.version}
          </span>
        )}

        <div className="flex gap-1 ml-auto shrink-0">
          <GostBadge label="AS" value={attackSurface} />
          <GostBadge label="SF" value={securityFunction} />

          {onRequestDelete && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation()
                onRequestDelete()
              }}
              title="Удалить компонент"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Inline validation messages */}
      {issueData && issueData.issues.length > 0 && (
        <div
          className="space-y-0.5 pb-1"
          style={{ paddingLeft: `${depth * 16 + 32}px` }}
        >
          {issueData.issues.map((issue, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-1.5 text-xs",
                issue.level === "error" && "text-red-600 dark:text-red-400",
                issue.level === "warning" && "text-yellow-600 dark:text-yellow-400",
                issue.level === "info" && "text-green-600 dark:text-green-400",
              )}
            >
              {issue.level === "error" ? (
                <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
              ) : issue.level === "warning" ? (
                <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-3 w-3 shrink-0 mt-0.5" />
              )}
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
