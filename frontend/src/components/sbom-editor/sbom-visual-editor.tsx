"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ListPlus,
  Loader2,
} from "lucide-react"
import { ComponentTree } from "./sbom-component-tree"
import { ComponentForm } from "./sbom-component-form"
import { MetadataForm } from "./sbom-metadata-form"
import { BatchGostEditor } from "./sbom-batch-gost-editor"
import { AddComponentDialog } from "./sbom-add-component-dialog"
import { getComponentByPath } from "@/lib/sbom-utils"
import { validateSbomJson, SbomApiError } from "@/lib/sbom-api"
import type { CycloneDxBom, CdxComponent, ValidateResponse } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

const GOST_PREFIX = "cdx:gost:"

interface VisualEditorProps {
  bom: CycloneDxBom
  selectedPath: number[] | null
  onSelectPath: (path: number[]) => void
  onChange: (updated: CycloneDxBom) => void
  validationResults?: ValidateResponse | null
  onValidationResults?: (results: ValidateResponse) => void
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

function addGostFieldsToComponent(component: CdxComponent): CdxComponent {
  const properties = [...(component.properties || [])]
  const hasAS = properties.some((p) => p.name === `${GOST_PREFIX}attack_surface`)
  const hasSF = properties.some((p) => p.name === `${GOST_PREFIX}security_function`)

  if (!hasAS) {
    properties.push({ name: `${GOST_PREFIX}attack_surface`, value: "" })
  }
  if (!hasSF) {
    properties.push({ name: `${GOST_PREFIX}security_function`, value: "" })
  }

  const children = component.components?.map(addGostFieldsToComponent)

  return {
    ...component,
    properties,
    ...(children && { components: children }),
  }
}

function countComponentsMissingGost(components: CdxComponent[]): number {
  let count = 0
  for (const comp of components) {
    const props = comp.properties || []
    const hasAS = props.some((p) => p.name === `${GOST_PREFIX}attack_surface`)
    const hasSF = props.some((p) => p.name === `${GOST_PREFIX}security_function`)
    if (!hasAS || !hasSF) count++
    if (comp.components) count += countComponentsMissingGost(comp.components)
  }
  return count
}

export function SbomVisualEditor({
  bom,
  selectedPath,
  onSelectPath,
  onChange,
  validationResults,
  onValidationResults,
  projectId,
  savedSboms = [],
  currentSbomId,
}: VisualEditorProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const selectedComponent = selectedPath
    ? getComponentByPath(bom.components, selectedPath)
    : null

  // Find VCS accessibility issue for selected component
  const selectedVcsIssue = (() => {
    if (!selectedPath || !validationResults) return null
    const pathPrefix = `$.components${selectedPath.map((i) => `[${i}]`).join(".components")}`
    return validationResults.issues.find(
      (issue) =>
        issue.path === pathPrefix &&
        (issue.level === "info" || issue.level === "warning") &&
        issue.message.includes("VCS репозиторий")
    ) ?? null
  })()

  const errors = validationResults?.issues.filter((i) => i.level === "error") || []
  const warnings = validationResults?.issues.filter((i) => i.level === "warning") || []
  const infos = validationResults?.issues.filter((i) => i.level === "info") || []

  const handleValidate = useCallback(async () => {
    setIsValidating(true)
    setValidationError(null)
    try {
      const result = await validateSbomJson(bom)
      onValidationResults?.(result)
    } catch (err) {
      if (err instanceof SbomApiError) {
        setValidationError(`Ошибка сервера (${err.status}): ${err.message}`)
      } else {
        setValidationError("Не удалось выполнить валидацию")
      }
    } finally {
      setIsValidating(false)
    }
  }, [bom, onValidationResults])

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
    setAddDialogOpen(true)
  }, [])

  const handleAddNewComponent = useCallback(
    (newComp: CdxComponent, targetPath: number[] | null) => {
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
        targetPath,
        newComp,
      )
      onChange({ ...bom, components: newComponents })
    },
    [bom, onChange],
  )

  const handleBatchGostChange = useCallback(
    (updatedComponents: CdxComponent[]) => {
      onChange({ ...bom, components: updatedComponents })
    },
    [bom, onChange],
  )

  const handleAddGostFieldsToAll = useCallback(() => {
    const components = bom.components || []
    const missingCount = countComponentsMissingGost(components)

    if (missingCount === 0) {
      toast.info("Все компоненты уже содержат GOST-поля")
      return
    }

    const updatedComponents = components.map(addGostFieldsToComponent)
    onChange({ ...bom, components: updatedComponents })
    toast.success(`GOST-поля добавлены к ${missingCount} компонентам`)
  }, [bom, onChange])

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
      {/* Validation bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">
                Валидация CycloneDX + ФСТЭК
              </span>
              {validationResults && !isValidating && (
                <div className="flex gap-2">
                  {errors.length > 0 && (
                    <Badge variant="destructive">
                      {errors.length}{" "}
                      {errors.length === 1 ? "ошибка" : "ошибок"}
                    </Badge>
                  )}
                  {warnings.length > 0 && (
                    <Badge variant="secondary">
                      {warnings.length}{" "}
                      {warnings.length === 1
                        ? "предупреждение"
                        : "предупреждений"}
                    </Badge>
                  )}
                  {infos.length > 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                    >
                      {infos.length} подтверждено
                    </Badge>
                  )}
                  {errors.length === 0 && warnings.length === 0 && infos.length === 0 && (
                    <Badge
                      variant="secondary"
                      className="bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Валиден
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Button
              onClick={handleValidate}
              disabled={isValidating}
              size="sm"
            >
              {isValidating && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {isValidating ? "Проверка..." : "Проверить"}
            </Button>
          </div>
          {validationError && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{validationError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <MetadataForm bom={bom} onChange={onChange} />
      <div className="flex gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAddGostFieldsToAll}
          disabled={!bom.components || bom.components.length === 0}
        >
          <ListPlus className="h-4 w-4 mr-2" />
          Добавить пустые GOST-поля
        </Button>
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
        {selectedComponent ? (
          <ComponentForm
            key={selectedPath?.join("-")}
            component={selectedComponent}
            onChange={handleComponentChange}
            vcsValidationIssue={selectedVcsIssue}
          />
        ) : (
          <div className="flex items-center justify-center border rounded-lg h-[500px]">
            <p className="text-sm text-muted-foreground">
              Выберите компонент для редактирования
            </p>
          </div>
        )}
      </div>

      <AddComponentDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        components={bom.components || []}
        selectedPath={selectedPath}
        projectId={projectId}
        savedSboms={savedSboms}
        currentSbomId={currentSbomId}
        onAdd={handleAddNewComponent}
      />

    </div>
  )
}
