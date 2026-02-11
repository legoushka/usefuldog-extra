"use client"

import { FileCode2, FolderOpen, Upload, Plus } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface WelcomeScreenProps {
  onCreateNew: () => void
  hasProjects: boolean
}

export function SbomWelcomeScreen({ onCreateNew, hasProjects }: WelcomeScreenProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 px-8">
        <div className="rounded-full bg-primary/10 p-6 mb-6">
          <FileCode2 className="h-16 w-16 text-primary" />
        </div>

        <h2 className="text-2xl font-semibold mb-2">
          Добро пожаловать в SBOM Редактор
        </h2>

        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Создавайте, редактируйте и валидируйте CycloneDX SBOM документы.
          Управляйте компонентами, зависимостями и GOST-полями.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Button onClick={onCreateNew} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Создать новый SBOM
          </Button>

          {hasProjects && (
            <Button variant="outline" size="lg" disabled>
              <FolderOpen className="h-5 w-5 mr-2" />
              Выберите файл слева
            </Button>
          )}
        </div>

        <div className="w-full max-w-2xl border-t pt-8">
          <h3 className="text-sm font-medium mb-4 text-center">Быстрый старт:</h3>
          <div className="grid sm:grid-cols-3 gap-4 text-sm">
            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-background p-3 mb-3">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">1. Создайте проект</p>
              <p className="text-xs text-muted-foreground">
                В боковой панели нажмите + для создания проекта
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-background p-3 mb-3">
                <Upload className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">2. Загрузите SBOM</p>
              <p className="text-xs text-muted-foreground">
                Перетащите JSON файл на проект или нажмите +
              </p>
            </div>

            <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
              <div className="rounded-full bg-background p-3 mb-3">
                <FileCode2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-medium mb-1">3. Редактируйте</p>
              <p className="text-xs text-muted-foreground">
                Используйте вкладки для просмотра, редактирования и валидации
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
