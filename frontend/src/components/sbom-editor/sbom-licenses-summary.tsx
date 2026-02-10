import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { flattenComponents, aggregateLicenses } from "@/lib/sbom-utils"
import type { CdxComponent } from "@/lib/sbom-types"

interface LicensesSummaryProps {
  components: CdxComponent[]
}

export function SbomLicensesSummary({ components }: LicensesSummaryProps) {
  const flat = flattenComponents(components)
  const licenses = aggregateLicenses(flat)
  const entries = Object.entries(licenses).sort(([, a], [, b]) => b - a)

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Лицензии</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Информация о лицензиях отсутствует
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Лицензии ({entries.length} уникальных)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Лицензия</TableHead>
                <TableHead className="w-[100px] text-right">Компоненты</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map(([name, count]) => (
                <TableRow key={name}>
                  <TableCell>
                    <Badge variant="outline">{name}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
