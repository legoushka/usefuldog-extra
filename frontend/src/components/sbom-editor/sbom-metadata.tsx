import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { CdxMetadata } from "@/lib/sbom-types"

interface MetadataProps {
  metadata: CdxMetadata | undefined
  specVersion?: string
  bomFormat?: string
  serialNumber?: string
}

export function SbomMetadata({
  metadata,
  specVersion,
  bomFormat,
  serialNumber,
}: MetadataProps) {
  const component = metadata?.component
  const manufacturer = metadata?.manufacturer || metadata?.manufacture
  const tools = metadata?.tools

  const toolsList: string[] = []
  if (tools) {
    if (Array.isArray(tools)) {
      for (const t of tools) {
        toolsList.push(
          [t.vendor, t.name, t.version].filter(Boolean).join(" "),
        )
      }
    } else if (tools.components) {
      for (const c of tools.components) {
        toolsList.push(
          [c.group, c.name, c.version].filter(Boolean).join(" "),
        )
      }
    } else if (tools.tools) {
      for (const t of tools.tools) {
        toolsList.push(
          [t.vendor, t.name, t.version].filter(Boolean).join(" "),
        )
      }
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {component && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Компонент</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-lg font-semibold">
              {component.group ? `${component.group}/` : ""}
              {component.name}
            </p>
            {component.version && (
              <p className="text-sm text-muted-foreground">
                Версия: {component.version}
              </p>
            )}
            {component.type && (
              <Badge variant="secondary">{component.type}</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Документ</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          {bomFormat && (
            <p>
              <span className="text-muted-foreground">Формат:</span>{" "}
              {bomFormat}
            </p>
          )}
          {specVersion && (
            <p>
              <span className="text-muted-foreground">Версия спецификации:</span>{" "}
              {specVersion}
            </p>
          )}
          {metadata?.timestamp && (
            <p>
              <span className="text-muted-foreground">Создан:</span>{" "}
              {new Date(metadata.timestamp).toLocaleString("ru-RU")}
            </p>
          )}
          {serialNumber && (
            <p className="truncate">
              <span className="text-muted-foreground">Серийный номер:</span>{" "}
              <span className="font-mono text-xs">{serialNumber}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {(manufacturer || toolsList.length > 0) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Производитель и инструменты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {manufacturer?.name && (
              <p>
                <span className="text-muted-foreground">Производитель:</span>{" "}
                {manufacturer.name}
              </p>
            )}
            {toolsList.length > 0 && (
              <div>
                <span className="text-muted-foreground">Инструменты:</span>
                <ul className="list-disc list-inside ml-1">
                  {toolsList.map((t, i) => (
                    <li key={i} className="text-xs">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
