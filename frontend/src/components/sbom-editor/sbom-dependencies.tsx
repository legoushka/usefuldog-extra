import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { CdxDependency } from "@/lib/sbom-types"

interface DependenciesProps {
  dependencies: CdxDependency[]
}

export function SbomDependencies({ dependencies }: DependenciesProps) {
  if (dependencies.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Зависимости</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Информация о зависимостях отсутствует
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Зависимости ({dependencies.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Компонент (ref)</TableHead>
                <TableHead>Зависит от</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dependencies.map((dep) => (
                <TableRow key={dep.ref}>
                  <TableCell className="font-mono text-xs">
                    {dep.ref}
                  </TableCell>
                  <TableCell>
                    {dep.dependsOn && dep.dependsOn.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {dep.dependsOn.map((ref) => (
                          <span
                            key={ref}
                            className="inline-block bg-muted px-1.5 py-0.5 rounded text-xs font-mono"
                          >
                            {ref}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        Нет зависимостей
                      </span>
                    )}
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
