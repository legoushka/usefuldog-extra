"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Search } from "lucide-react"
import { ComponentNode } from "./sbom-component-node"
import type { CdxComponent } from "@/lib/sbom-types"

interface ComponentTreeProps {
  components: CdxComponent[]
  selectedPath: number[] | null
  onSelectPath: (path: number[]) => void
}

export function ComponentTree({
  components,
  selectedPath,
  onSelectPath,
}: ComponentTreeProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState("")

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

  const matchesFilter = useCallback(
    (comp: CdxComponent): boolean => {
      if (!filter) return true
      const lower = filter.toLowerCase()
      const name = (comp.name || "").toLowerCase()
      const group = (comp.group || "").toLowerCase()
      const version = (comp.version || "").toLowerCase()
      if (
        name.includes(lower) ||
        group.includes(lower) ||
        version.includes(lower)
      )
        return true
      const check = (c: CdxComponent): boolean => {
        const n = (c.name || "").toLowerCase()
        const g = (c.group || "").toLowerCase()
        const v = (c.version || "").toLowerCase()
        if (n.includes(lower) || g.includes(lower) || v.includes(lower))
          return true
        return c.components?.some(check) ?? false
      }
      if (comp.components?.some(check)) return true
      return false
    },
    [filter],
  )

  const renderNodes = (
    comps: CdxComponent[],
    basePath: number[],
    depth: number,
  ) => {
    return comps.map((comp, idx) => {
      if (!matchesFilter(comp)) return null
      const path = [...basePath, idx]
      const pathKey = path.join("-")
      const hasChildren = !!comp.components && comp.components.length > 0
      const isExpanded = expandedPaths.has(pathKey)

      return (
        <div key={pathKey}>
          <ComponentNode
            component={comp}
            path={path}
            selectedPath={selectedPath}
            onSelect={onSelectPath}
            isExpanded={isExpanded}
            hasChildren={hasChildren}
            onToggle={() => toggleExpand(pathKey)}
            depth={depth}
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Компоненты ({components.length})
        </CardTitle>
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
              <p className="text-sm text-muted-foreground p-4 text-center">
                Компоненты отсутствуют
              </p>
            ) : (
              renderNodes(components, [], 0)
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
