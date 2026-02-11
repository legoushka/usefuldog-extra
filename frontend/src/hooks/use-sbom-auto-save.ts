"use client"

import { useState, useCallback, useRef } from "react"
import { toast } from "sonner"
import { updateSbom } from "@/lib/sbom-api"
import type { CycloneDxBom } from "@/lib/sbom-types"

interface UseSbomAutoSaveOptions {
  selectedProjectId: string | null
  currentSbomId: string | null
  onBomChange: (bom: CycloneDxBom) => void
}

export function useSbomAutoSave({ selectedProjectId, currentSbomId, onBomChange }: UseSbomAutoSaveOptions) {
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved">("idle")
  const isSavingRef = useRef(false)

  const handleBomUpdate = useCallback(async (updatedBom: CycloneDxBom) => {
    onBomChange(updatedBom)

    if (selectedProjectId && currentSbomId && !isSavingRef.current) {
      isSavingRef.current = true
      setAutoSaveStatus("saving")

      try {
        await updateSbom(selectedProjectId, currentSbomId, {
          document: updatedBom as unknown as Record<string, unknown>,
        })
        setAutoSaveStatus("saved")
        setTimeout(() => {
          setAutoSaveStatus("idle")
        }, 1500)
      } catch (err) {
        console.error("Failed to auto-save SBOM:", err)
        setAutoSaveStatus("idle")
        toast.error("Ошибка автосохранения: " + (err instanceof Error ? err.message : "Неизвестная ошибка"))
      } finally {
        isSavingRef.current = false
      }
    }
  }, [selectedProjectId, currentSbomId, onBomChange])

  return { autoSaveStatus, handleBomUpdate }
}
