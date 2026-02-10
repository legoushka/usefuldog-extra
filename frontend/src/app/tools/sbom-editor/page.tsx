"use client"

import { useState, useCallback } from "react"
import { HelpCircle } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SbomUploadZone } from "@/components/sbom-editor/sbom-upload-zone"
import { SbomTabs } from "@/components/sbom-editor/sbom-tabs"
import { SbomMetadata } from "@/components/sbom-editor/sbom-metadata"
import { SbomStatsCards } from "@/components/sbom-editor/sbom-stats-cards"
import { ComponentTree } from "@/components/sbom-editor/sbom-component-tree"
import { SbomDependencies } from "@/components/sbom-editor/sbom-dependencies"
import { SbomLicensesSummary } from "@/components/sbom-editor/sbom-licenses-summary"
import { SbomEditorPanel } from "@/components/sbom-editor/sbom-editor-panel"
import { SbomValidationPanel } from "@/components/sbom-editor/sbom-validation-panel"
import { SbomUnifier } from "@/components/sbom-editor/sbom-unifier"
import type { CycloneDxBom, ValidateResponse } from "@/lib/sbom-types"

export default function SbomEditorPage() {
  const [sbomData, setSbomData] = useState<CycloneDxBom | null>(null)
  const [selectedComponentPath, setSelectedComponentPath] = useState<
    number[] | null
  >(null)
  const [activeTab, setActiveTab] = useState("view")
  const [isDirty, setIsDirty] = useState(false)
  const [validationResults, setValidationResults] =
    useState<ValidateResponse | null>(null)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleFileLoaded = useCallback((parsed: unknown, _file: File) => {
    const bom = parsed as CycloneDxBom
    setSbomData(bom)
    setSelectedComponentPath(null)
    setValidationResults(null)
    setIsDirty(false)
    setActiveTab("view")
  }, [])

  const handleBomUpdate = useCallback((updatedBom: CycloneDxBom) => {
    setSbomData(updatedBom)
    setIsDirty(true)
  }, [])

  const handleUnified = useCallback((bom: CycloneDxBom) => {
    setSbomData(bom)
    setSelectedComponentPath(null)
    setValidationResults(null)
    setIsDirty(false)
    setActiveTab("view")
  }, [])

  const viewContent = sbomData ? (
    <>
      <SbomMetadata
        metadata={sbomData.metadata}
        specVersion={sbomData.specVersion}
        bomFormat={sbomData.bomFormat}
        serialNumber={sbomData.serialNumber}
      />
      <SbomStatsCards
        components={sbomData.components || []}
        dependencies={sbomData.dependencies}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <ComponentTree
          components={sbomData.components || []}
          selectedPath={selectedComponentPath}
          onSelectPath={setSelectedComponentPath}
        />
        <div className="space-y-4">
          <SbomLicensesSummary components={sbomData.components || []} />
          <SbomDependencies dependencies={sbomData.dependencies || []} />
        </div>
      </div>
    </>
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для просмотра
    </p>
  )

  const editContent = sbomData ? (
    <SbomEditorPanel
      bom={sbomData}
      selectedPath={selectedComponentPath}
      onSelectPath={setSelectedComponentPath}
      onChange={handleBomUpdate}
    />
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для редактирования
    </p>
  )

  const unifyContent = <SbomUnifier onUnified={handleUnified} />

  const validateContent = sbomData ? (
    <SbomValidationPanel
      bom={sbomData}
      validationResults={validationResults}
      onValidationResults={setValidationResults}
    />
  ) : (
    <p className="text-sm text-muted-foreground text-center py-8">
      Загрузите SBOM файл для валидации
    </p>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">
              SBOM Редактор
            </h1>
            {isDirty && (
              <Badge variant="secondary" className="text-xs">
                Изменён
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Просмотр, редактирование, объединение и валидация CycloneDX SBOM
          </p>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/tools/sbom-editor/help">
            <HelpCircle className="h-4 w-4 mr-1" />
            Справка
          </Link>
        </Button>
      </div>

      <SbomUploadZone onFileLoaded={handleFileLoaded} isLoading={false} />

      {sbomData && (
        <SbomTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          viewContent={viewContent}
          editContent={editContent}
          unifyContent={unifyContent}
          validateContent={validateContent}
          hasBom={!!sbomData}
        />
      )}
    </div>
  )
}
