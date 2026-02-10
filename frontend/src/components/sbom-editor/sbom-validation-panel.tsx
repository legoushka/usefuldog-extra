"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react"
import { validateSbomJson, SbomApiError } from "@/lib/sbom-api"
import { ValidationIssueRow } from "./sbom-validation-issue"
import type { CycloneDxBom, ValidateResponse } from "@/lib/sbom-types"

interface ValidationPanelProps {
  bom: CycloneDxBom
  validationResults: ValidateResponse | null
  onValidationResults: (results: ValidateResponse) => void
}

export function SbomValidationPanel({
  bom,
  validationResults,
  onValidationResults,
}: ValidationPanelProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleValidate = async () => {
    setIsValidating(true)
    setError(null)
    try {
      const result = await validateSbomJson(bom)
      onValidationResults(result)
    } catch (err) {
      if (err instanceof SbomApiError) {
        setError(`Ошибка сервера (${err.status}): ${err.message}`)
      } else {
        setError("Не удалось выполнить валидацию")
      }
    } finally {
      setIsValidating(false)
    }
  }

  const errors = validationResults?.issues.filter((i) => i.level === "error") || []
  const warnings =
    validationResults?.issues.filter((i) => i.level === "warning") || []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium">
            Валидация CycloneDX + ФСТЭК
          </span>
        </div>
        <Button onClick={handleValidate} disabled={isValidating} size="sm">
          {isValidating ? "Проверка..." : "Проверить"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isValidating && (
        <div className="space-y-2">
          <Skeleton className="h-20" />
          <Skeleton className="h-40" />
        </div>
      )}

      {validationResults && !isValidating && (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {validationResults.valid ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Документ валиден
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    Обнаружены ошибки
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                {errors.length > 0 && (
                  <Badge variant="destructive">
                    {errors.length} {errors.length === 1 ? "ошибка" : "ошибок"}
                  </Badge>
                )}
                {warnings.length > 0 && (
                  <Badge variant="secondary">
                    {warnings.length}{" "}
                    {warnings.length === 1 ? "предупреждение" : "предупреждений"}
                  </Badge>
                )}
                {validationResults.issues.length === 0 && (
                  <span className="text-sm text-muted-foreground">
                    Проблем не найдено
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          {validationResults.issues.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Результаты ({validationResults.issues.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="max-h-[500px]">
                  {validationResults.issues.map((issue, i) => (
                    <ValidationIssueRow key={i} issue={issue} />
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
