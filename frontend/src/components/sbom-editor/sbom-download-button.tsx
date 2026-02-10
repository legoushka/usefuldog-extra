"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { CycloneDxBom } from "@/lib/sbom-types"

interface DownloadButtonProps {
  bom: CycloneDxBom
}

export function SbomDownloadButton({ bom }: DownloadButtonProps) {
  const handleDownload = () => {
    const json = JSON.stringify(bom, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    const name = bom.metadata?.component?.name || "sbom"
    const version = bom.metadata?.component?.version || ""
    a.download = `${name}${version ? `-${version}` : ""}.cdx.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleDownload}>
      <Download className="h-4 w-4 mr-1" />
      Скачать JSON
    </Button>
  )
}
