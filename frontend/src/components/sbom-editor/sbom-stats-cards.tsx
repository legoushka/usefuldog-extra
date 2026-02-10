import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  flattenComponents,
  countByType,
  aggregateLicenses,
  getComponentTypeLabel,
} from "@/lib/sbom-utils"
import type { CdxComponent, CdxDependency } from "@/lib/sbom-types"

interface StatsCardsProps {
  components: CdxComponent[]
  dependencies: CdxDependency[] | undefined
}

export function SbomStatsCards({ components, dependencies }: StatsCardsProps) {
  const flat = flattenComponents(components)
  const byType = countByType(flat)
  const licenses = aggregateLicenses(flat)
  const licenseEntries = Object.entries(licenses).sort(([, a], [, b]) => b - a)
  const depCount = dependencies?.length || 0
  const depOnCount =
    dependencies?.reduce((sum, d) => sum + (d.dependsOn?.length || 0), 0) || 0

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            Компоненты по типу
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{flat.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.entries(byType)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {getComponentTypeLabel(type)}: {count}
                </Badge>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Лицензии</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{licenseEntries.length}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {licenseEntries.slice(0, 8).map(([name, count]) => (
              <Badge key={name} variant="outline" className="text-xs">
                {name}: {count}
              </Badge>
            ))}
            {licenseEntries.length > 8 && (
              <Badge variant="secondary" className="text-xs">
                +{licenseEntries.length - 8}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Зависимости</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{depCount}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {depOnCount} связей dependsOn
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
