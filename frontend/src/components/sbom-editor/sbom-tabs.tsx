"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReactNode } from "react"

interface SbomTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  viewContent: ReactNode
  editContent: ReactNode
  unifyContent: ReactNode
  validateContent: ReactNode
  hasBom: boolean
}

export function SbomTabs({
  activeTab,
  onTabChange,
  viewContent,
  editContent,
  unifyContent,
  validateContent,
  hasBom,
}: SbomTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="view" disabled={!hasBom}>
          Просмотр
        </TabsTrigger>
        <TabsTrigger value="edit" disabled={!hasBom}>
          Редактирование
        </TabsTrigger>
        <TabsTrigger value="unify">Объединение</TabsTrigger>
        <TabsTrigger value="validate" disabled={!hasBom}>
          Валидация
        </TabsTrigger>
      </TabsList>
      <TabsContent value="view" className="space-y-4 mt-4">
        {viewContent}
      </TabsContent>
      <TabsContent value="edit" className="space-y-4 mt-4">
        {editContent}
      </TabsContent>
      <TabsContent value="unify" className="space-y-4 mt-4">
        {unifyContent}
      </TabsContent>
      <TabsContent value="validate" className="space-y-4 mt-4">
        {validateContent}
      </TabsContent>
    </Tabs>
  )
}
