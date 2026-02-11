"use client"

import { useState, useCallback, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Search, Plus, AlertTriangle } from "lucide-react"
import { ComponentNode, type ComponentIssueData } from "./sbom-component-node"
import type { CdxComponent, ValidateResponse } from "@/lib/sbom-types"

type ValidationFilter = "all" | "errors" | "warnings"

interface ComponentTreeProps {
  components: CdxComponent[]
  selectedPath: number[] | null
  onSelectPath: (path: number[]) => void
  onAddComponent: () => void
  onDeleteComponent?: (path: number[]) => void
  validationResults?: ValidateResponse | null
}

function extractComponentPath(issuePath: string): string | null {
  const regex = /components\[(\d+)\]/g
  const indices: number[] = []
  let match
  while ((match = regex.exec(issuePath)) !== null) {
    indices.push(parseInt(match[1], 10))
  }
  return indices.length > 0 ? indices.join("-") : null
}

function buildIssueMap(
  validationResults: ValidateResponse | null,
): Map<string, ComponentIssueData> {
  const map = new Map<string, ComponentIssueData>()
  if (!validationResults) return map

  for (const issue of validationResults.issues) {
    if (!issue.path) continue
    const pathKey = extractComponentPath(issue.path)
    if (!pathKey) continue

    const existing = map.get(pathKey) || { errors: 0, warnings: 0, issues: [] }
    if (issue.level === "error") existing.errors++
    else existing.warnings++
    existing.issues.push(issue)
    map.set(pathKey, existing)
  }

  return map
}

function countAllChildren(component: CdxComponent): number {
  if (!component.components || component.components.length === 0) {
    return 0
  }
  let count = component.components.length
  component.components.forEach((child) => {
    count += countAllChildren(child)
  })
  return count
}

export function ComponentTree({
  components,
  selectedPath,
  onSelectPath,
  onAddComponent,
  onDeleteComponent,
  validationResults,
}: ComponentTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")
  const [validationFilter, setValidationFilter] =
    useState<ValidationFilter>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [componentToDelete, setComponentToDelete] = useState<{
    component: CdxComponent
    path: number[]
  } | null>(null)

  const issueMap = useMemo(
    () => buildIssueMap(validationResults ?? null),
    [validationResults],
  )

  const totalErrors = useMemo(
    () =>
      Array.from(issueMap.values()).reduce(
        (sum, count) => sum + count.errors,
        0,
      ),
    [issueMap],
  )

  const totalWarnings = useMemo(
    () =>
      Array.from(issueMap.values()).reduce(
        (sum, count) => sum + count.warnings,
        0,
      ),
    [issueMap],
  )

  const toggleExpand = useCallback((pathKey: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev)
      if (next.has(pathKey)) {
        next.delete(pathKey)
      } else {
        next.add(pathKey)
      }
      return next
    })
  }, [])

  const handleRequestDelete = useCallback(
    (component: CdxComponent, path: number[]) => {
      setComponentToDelete({ component, path })
      setDeleteDialogOpen(true)
    },
    [],
  )

  const handleConfirmDelete = useCallback(() => {
    if (componentToDelete && onDeleteComponent) {
      onDeleteComponent(componentToDelete.path)
      setDeleteDialogOpen(false)
      setComponentToDelete(null)
    }
  }, [componentToDelete, onDeleteComponent])

  const handleCancelDelete = useCallback(() => {
    setDeleteDialogOpen(false)
    setComponentToDelete(null)
  }, [])

  const matchesFilter = useCallback(
    (comp: CdxComponent, pathKey: string): boolean => {
      // Text filter
      if (filter) {
        const lower = filter.toLowerCase()
        const name = (comp.name || "").toLowerCase()
        const group = (comp.group || "").toLowerCase()
        const version = (comp.version || "").toLowerCase()
        if (
          !name.includes(lower) &&
          !group.includes(lower) &&
          !version.includes(lower)
        ) {
          const check = (c: CdxComponent): boolean => {
            const n = (c.name || "").toLowerCase()
            const g = (c.group || "").toLowerCase()
            const v = (c.version || "").toLowerCase()
            if (n.includes(lower) || g.includes(lower) || v.includes(lower))
              return true
            return c.components?.some(check) ?? false
          }
          if (!comp.components?.some(check)) return false
        }
      }

      // Validation filter
      if (validationFilter !== "all") {
        const data = issueMap.get(pathKey)
        if (!data) return false

        if (validationFilter === "errors" && data.errors === 0) return false
        if (validationFilter === "warnings" && data.warnings === 0)
          return false
      }

      return true
    },
    [filter, validationFilter, issueMap],
  )

  const renderNodes = (
    comps: CdxComponent[],
    basePath: number[],
    depth: number,
  ) => {
    return comps.map((comp, idx) => {
      const path = [...basePath, idx]
      const pathKey = path.join("-")
      if (!matchesFilter(comp, pathKey)) return null
      const hasChildren = !!comp.components && comp.components.length > 0
      const isExpanded = expandedPaths.has(pathKey)
      const issueData = issueMap.get(pathKey)

      return (
        <div key={pathKey}>
          <ComponentNode
            component={comp}
            path={path}
            selectedPath={selectedPath}
            onSelect={onSelectPath}
            onRequestDelete={
              onDeleteComponent
                ? () => handleRequestDelete(comp, path)
                : undefined
            }
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={() => toggleExpand(pathKey)}
            depth={depth}
            issueData={issueData}
          />
          {hasChildren && isExpanded && (
            <div>
              {renderNodes(comp.components!, path, depth + 1)}
            </div>
          )}
        </div>
      )
    })
  }

  const childrenCount = componentToDelete
    ? countAllChildren(componentToDelete.component)
    : 0

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Компоненты ({components.length})
            </CardTitle>
            <Button
              onClick={onAddComponent}
              size="sm"
              variant="outline"
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Новый компонент
            </Button>
          </div>

        {validationResults && (totalErrors > 0 || totalWarnings > 0) && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={validationFilter === "all" ? "default" : "outline"}
              onClick={() => setValidationFilter("all")}
              className="h-7 text-xs"
            >
              Все ({components.length})
            </Button>
            {totalErrors > 0 && (
              <Button
                size="sm"
                variant={validationFilter === "errors" ? "default" : "outline"}
                onClick={() => setValidationFilter("errors")}
                className="h-7 text-xs"
              >
                Ошибки ({totalErrors})
              </Button>
            )}
            {totalWarnings > 0 && (
              <Button
                size="sm"
                variant={
                  validationFilter === "warnings" ? "default" : "outline"
                }
                onClick={() => setValidationFilter("warnings")}
                className="h-7 text-xs"
              >
                Предупреждения ({totalWarnings})
              </Button>
            )}
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск компонентов..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="p-2 space-y-0.5">
            {components.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  Компоненты отсутствуют
                </p>
                <p className="text-xs text-muted-foreground">
                  Добавьте компоненты через кнопку &quot;+ Новый компонент&quot;
                  или импортируйте SBOM
                </p>
              </div>
            ) : (
              renderNodes(components, [], 0)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить компонент?</DialogTitle>
            <DialogDescription className="space-y-3">
              <div>
                Вы собираетесь удалить компонент{" "}
                <span className="font-semibold">
                  {componentToDelete?.component.name}
                </span>
                {componentToDelete?.component.version && (
                  <span className="text-muted-foreground">
                    {" "}
                    v{componentToDelete.component.version}
                  </span>
                )}
              </div>
              {childrenCount > 0 && (
                <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                      Внимание!
                    </p>
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      Вместе с этим компонентом будут удалены{" "}
                      <span className="font-semibold">
                        {childrenCount}{" "}
                        {childrenCount === 1
                          ? "дочерний компонент"
                          : childrenCount < 5
                            ? "дочерних компонента"
                            : "дочерних компонентов"}
                      </span>
                      .
                    </p>
                  </div>
                </div>
              )}
              <p className="text-sm">Это действие нельзя отменить.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelDelete}>
              Отмена
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
