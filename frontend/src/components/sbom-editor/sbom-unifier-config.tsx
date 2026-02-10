"use client"

import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UnifierConfig {
  appName: string
  appVersion: string
  manufacturer: string
}

interface UnifierConfigProps {
  config: UnifierConfig
  onChange: (config: UnifierConfig) => void
}

export function SbomUnifierConfig({ config, onChange }: UnifierConfigProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Параметры объединения
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Название приложения</Label>
            <Input
              value={config.appName}
              onChange={(e) =>
                onChange({ ...config, appName: e.target.value })
              }
              placeholder="My Application"
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Версия</Label>
            <Input
              value={config.appVersion}
              onChange={(e) =>
                onChange({ ...config, appVersion: e.target.value })
              }
              placeholder="1.0.0"
              className="h-8"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Производитель</Label>
            <Input
              value={config.manufacturer}
              onChange={(e) =>
                onChange({ ...config, manufacturer: e.target.value })
              }
              placeholder="ООО Компания"
              className="h-8"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export type { UnifierConfig }
