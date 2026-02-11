"use client"

import { useCallback, useState } from "react"
import { ComponentTree } from "./sbom-component-tree"
import { ComponentForm } from "./sbom-component-form"
import { MetadataForm } from "./sbom-metadata-form"
import { BatchGostEditor } from "./sbom-batch-gost-editor"
import { SbomImportDialog } from "./sbom-import-dialog"
import { getComponentByPath } from "@/lib/sbom-utils"
import type { CycloneDxBom, CdxComponent, ValidateResponse } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

interface VisualEditorProps {
  bom: CycloneDxBom
  selectedPath: number[] | null
  onSelectPath: (path: number[]) => void
  onChange: (updated: CycloneDxBom) => void
  validationResults?: ValidateResponse | null
  projectId?: string | null
  savedSboms?: SbomMetadata[]
  currentSbomId?: string
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

function addComponentAtPath(
  components: CdxComponent[],
  path: number[] | null,
  newComp: CdxComponent,
): CdxComponent[] {
  // Add to root
  if (!path || path.length === 0) {
    return [...components, newComp]
  }

  // Add as child of component at path
  const newComponents = [...components]
  if (path.length === 1) {
    const parent = { ...newComponents[path[0]] }
    parent.components = [...(parent.components || []), newComp]
    newComponents[path[0]] = parent
    return newComponents
  }

  const idx = path[0]
  const current = { ...newComponents[idx] }
  current.components = addComponentAtPath(
    current.components || [],
    path.slice(1),
    newComp,
  )
  newComponents[idx] = current
  return newComponents
}

function generateUniqueBomRef(components: CdxComponent[], prefix = "component"): string {
  const timestamp = Date.now()
  let counter = 0
  let bomRef = `${prefix}-${timestamp}`

  const checkUnique = (comps: CdxComponent[], ref: string): boolean => {
    for (const comp of comps) {
      if (comp["bom-ref"] === ref) return false
      if (comp.components && !checkUnique(comp.components, ref)) return false
    }
    return true
  }

  while (!checkUnique(components, bomRef)) {
    counter++
    bomRef = `${prefix}-${timestamp}-${counter}`
  }

  return bomRef
}

export function SbomVisualEditor({
  bom,
  selectedPath,
  onSelectPath,
  onChange,
  validationResults,
  projectId,
  savedSboms = [],
  currentSbomId,
}: VisualEditorProps) {
  const [isAddingComponent, setIsAddingComponent] = useState(false)
  const [newComponentParentPath, setNewComponentParentPath] = useState<number[] | null>(null)

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

  const handleAddComponent = useCallback(() => {
    setNewComponentParentPath(selectedPath)
    setIsAddingComponent(true)
  }, [selectedPath])

  const handleCancelAdd = useCallback(() => {
    setIsAddingComponent(false)
    setNewComponentParentPath(null)
  }, [])

  const handleSaveNewComponent = useCallback(
    (newComp: CdxComponent) => {
      // Auto-generate bom-ref if not provided
      if (!newComp["bom-ref"]) {
        newComp["bom-ref"] = generateUniqueBomRef(bom.components || [])
      }

      // Set default version if not provided
      if (!newComp.version) {
        newComp.version = "1.0.0"
      }

      const newComponents = addComponentAtPath(
        bom.components || [],
        newComponentParentPath,
        newComp,
      )
      onChange({ ...bom, components: newComponents })
      setIsAddingComponent(false)
      setNewComponentParentPath(null)
    },
    [bom, newComponentParentPath, onChange],
  )

  const handleBatchGostChange = useCallback(
    (updatedComponents: CdxComponent[]) => {
      onChange({ ...bom, components: updatedComponents })
    },
    [bom, onChange],
  )

  const handleImportSbom = useCallback(
    (importedComponent: CdxComponent) => {
      // Ensure unique bom-ref
      let uniqueBomRef = importedComponent["bom-ref"] || `imported-app-${Date.now()}`
      const existingRefs = new Set<string>()

      const collectRefs = (comps: CdxComponent[]) => {
        comps.forEach((c) => {
          if (c["bom-ref"]) existingRefs.add(c["bom-ref"])
          if (c.components) collectRefs(c.components)
        })
      }
      collectRefs(bom.components || [])

      let counter = 0
      while (existingRefs.has(uniqueBomRef)) {
        counter++
        uniqueBomRef = `imported-app-${Date.now()}-${counter}`
      }

      importedComponent["bom-ref"] = uniqueBomRef

      // Insert at selected location or root
      const newComponents = addComponentAtPath(
        bom.components || [],
        selectedPath,
        importedComponent,
      )
      onChange({ ...bom, components: newComponents })
    },
    [bom, selectedPath, onChange],
  )

  const handleDeleteComponent = useCallback(
    (path: number[]) => {
      if (path.length === 0) return

      const deleteAtPath = (
        components: CdxComponent[],
        deletePath: number[],
      ): CdxComponent[] => {
        if (deletePath.length === 1) {
          // Delete at this level
          return components.filter((_, idx) => idx !== deletePath[0])
        }

        // Recurse deeper
        const newComponents = [...components]
        const idx = deletePath[0]
        if (idx < newComponents.length) {
          const current = { ...newComponents[idx] }
          current.components = deleteAtPath(
            current.components || [],
            deletePath.slice(1),
          )
          newComponents[idx] = current
        }
        return newComponents
      }

      const newComponents = deleteAtPath(bom.components || [], path)
      onChange({ ...bom, components: newComponents })

      // Clear selection if deleted component was selected
      if (
        selectedPath &&
        selectedPath.length === path.length &&
        selectedPath.every((v, i) => v === path[i])
      ) {
        onSelectPath([])
      }
    },
    [bom, selectedPath, onChange, onSelectPath],
  )

  return (
    <div className="space-y-4">
      <MetadataForm bom={bom} onChange={onChange} />
      <div className="flex justify-end gap-2">
        <SbomImportDialog
          projectId={projectId ?? null}
          savedSboms={savedSboms}
          currentSbomId={currentSbomId}
          onImport={handleImportSbom}
          disabled={!projectId}
        />
        <BatchGostEditor
          components={bom.components || []}
          onChange={handleBatchGostChange}
        />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentTree
          components={bom.components || []}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onAddComponent={handleAddComponent}
          onDeleteComponent={handleDeleteComponent}
          validationResults={validationResults}
        />
        {isAddingComponent ? (
          <ComponentForm
            component={{
              type: "library",
              name: "",
              "bom-ref": "",
            }}
            onChange={handleSaveNewComponent}
            isNew={true}
            parentPath={newComponentParentPath}
            onCancel={handleCancelAdd}
          />
        ) : selectedComponent ? (
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
