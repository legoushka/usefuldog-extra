"use client"

import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { UploadZone } from "@/components/vex-converter/upload-zone"
import { ResultsView } from "@/components/vex-converter/results-view"
import { VulnerabilitySummary } from "@/components/vex-converter/vulnerability-summary"
import { SeverityChart, StateChart } from "@/components/vex-converter/charts"
import { uploadVexFile, type ConvertResponse, ApiError } from "@/lib/api"

export default function VexConverterPage() {
  const [result, setResult] = useState<ConvertResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const data = await uploadVexFile(file)
      setResult(data)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(`Ошибка сервера (${err.status}): ${err.message}`)
      } else {
        setError("Не удалось обработать файл. Проверьте формат и попробуйте снова.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">VEX Конвертер</h1>
        <p className="text-muted-foreground">
          Загрузите CSAF VEX JSON документ для генерации Confluence wiki-разметки
        </p>
      </div>

      <UploadZone onFileSelect={handleFileSelect} isLoading={isLoading} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-72" />
            <Skeleton className="h-72" />
          </div>
          <Skeleton className="h-96" />
        </div>
      )}

      {result && (
        <>
          <VulnerabilitySummary stats={result.stats} />
          <div className="grid gap-4 md:grid-cols-2">
            <SeverityChart stats={result.stats} />
            <StateChart stats={result.stats} />
          </div>
          <ResultsView markup={result.markup} />
        </>
      )}
    </div>
  )
}
