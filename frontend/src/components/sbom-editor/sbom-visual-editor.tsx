"use client"

import { useCallback } from "react"
import { ComponentTree } from "./sbom-component-tree"
import { ComponentForm } from "./sbom-component-form"
import { MetadataForm } from "./sbom-metadata-form"
import { getComponentByPath } from "@/lib/sbom-utils"
import type { CycloneDxBom, CdxComponent } from "@/lib/sbom-types"

interface VisualEditorProps {
  bom: CycloneDxBom
  selectedPath: number[] | null
  onSelectPath: (path: number[]) => void
  onChange: (updated: CycloneDxBom) => void
}

function updateComponentAtPath(
  components: CdxComponent[],
  path: number[],
  updatedComp: CdxComponent,
): CdxComponent[] {
  if (path.length === 0) return components
  const newComponents = [...components]
  if (path.length === 1) {
    newComponents[path[0]] = updatedComp
    return newComponents
  }
  const idx = path[0]
  const current = { ...newComponents[idx] }
  current.components = updateComponentAtPath(
    current.components || [],
    path.slice(1),
    updatedComp,
  )
  newComponents[idx] = current
  return newComponents
}

export function SbomVisualEditor({
  bom,
  selectedPath,
  onSelectPath,
  onChange,
}: VisualEditorProps) {
  const selectedComponent = selectedPath
    ? getComponentByPath(bom.components, selectedPath)
    : null

  const handleComponentChange = useCallback(
    (updated: CdxComponent) => {
      if (!selectedPath || !bom.components) return
      const newComponents = updateComponentAtPath(
        bom.components,
        selectedPath,
        updated,
      )
      onChange({ ...bom, components: newComponents })
    },
    [bom, selectedPath, onChange],
  )

  return (
    <div className="space-y-4">
      <MetadataForm bom={bom} onChange={onChange} />
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentTree
          components={bom.components || []}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
        />
        {selectedComponent ? (
          <ComponentForm
            component={selectedComponent}
            onChange={handleComponentChange}
          />
        ) : (
          <div className="flex items-center justify-center border rounded-lg h-[500px]">
            <p className="text-sm text-muted-foreground">
              Выберите компонент для редактирования
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
