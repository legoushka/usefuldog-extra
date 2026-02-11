"use client"

import { useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { SbomVisualEditor } from "./sbom-visual-editor"
import { SbomTextEditor } from "./sbom-text-editor"
import { SbomDownloadButton } from "./sbom-download-button"
import type { CycloneDxBom, ValidateResponse } from "@/lib/sbom-types"
import type { SbomMetadata } from "@/lib/project-types"

interface EditorPanelProps {
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

export function SbomEditorPanel({
  bom,
  selectedPath,
  onSelectPath,
  onChange,
  validationResults,
  onValidationResults,
  projectId,
  savedSboms,
  currentSbomId,
}: EditorPanelProps) {
  const [editorMode, setEditorMode] = useState<"visual" | "text">("visual")
  const [textValue, setTextValue] = useState("")
  const [parseError, setParseError] = useState<string | null>(null)
  const lastSyncedBomRef = useRef<CycloneDxBom | null>(null)

  const switchToText = useCallback(() => {
    setTextValue(JSON.stringify(bom, null, 2))
    lastSyncedBomRef.current = bom
    setParseError(null)
    setEditorMode("text")
  }, [bom])

  const switchToVisual = useCallback(() => {
    try {
      const parsed = JSON.parse(textValue)
      onChange(parsed)
      setParseError(null)
      setEditorMode("visual")
    } catch (e) {
      setParseError(
        `Невалидный JSON: ${e instanceof Error ? e.message : "Ошибка парсинга"}`,
      )
    }
  }, [textValue, onChange])

  const handleTextChange = useCallback(
    (text: string) => {
      setTextValue(text)
      try {
        const parsed = JSON.parse(text)
        onChange(parsed)
        setParseError(null)
      } catch {
        // Don't update bom on invalid JSON; error shown in editor
      }
    },
    [onChange],
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={editorMode === "visual" ? "default" : "outline"}
            size="sm"
            onClick={editorMode === "text" ? switchToVisual : undefined}
          >
            Визуальный
          </Button>
          <Button
            variant={editorMode === "text" ? "default" : "outline"}
            size="sm"
            onClick={editorMode === "visual" ? switchToText : undefined}
          >
            Текстовый
          </Button>
        </div>
        <SbomDownloadButton bom={bom} />
      </div>

      {editorMode === "visual" ? (
        <SbomVisualEditor
          bom={bom}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
          onChange={onChange}
          validationResults={validationResults}
          onValidationResults={onValidationResults}
          projectId={projectId}
          savedSboms={savedSboms}
          currentSbomId={currentSbomId}
        />
      ) : (
        <SbomTextEditor
          value={textValue}
          onChange={handleTextChange}
          parseError={parseError}
        />
      )}
    </div>
  )
}
