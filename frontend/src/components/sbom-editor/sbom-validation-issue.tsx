import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { ValidationIssue } from "@/lib/sbom-types"

interface ValidationIssueRowProps {
  issue: ValidationIssue
  onPathClick?: (path: string) => void
}

export function ValidationIssueRow({
  issue,
  onPathClick,
}: ValidationIssueRowProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 px-3 py-2 text-sm border-b last:border-b-0",
        issue.level === "error" && "bg-red-50 dark:bg-red-950/20",
        issue.level === "warning" && "bg-yellow-50 dark:bg-yellow-950/20",
        issue.level === "info" && "bg-green-50 dark:bg-green-950/20",
      )}
    >
      {issue.level === "error" ? (
        <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
      ) : issue.level === "warning" ? (
        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p>{issue.message}</p>
        {issue.path && (
          <button
            className="text-xs text-muted-foreground font-mono hover:underline mt-0.5"
            onClick={() => onPathClick?.(issue.path!)}
          >
            {issue.path}
          </button>
        )}
      </div>
    </div>
  )
}
