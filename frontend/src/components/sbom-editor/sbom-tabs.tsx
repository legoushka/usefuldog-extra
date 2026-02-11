"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ReactNode } from "react"

interface SbomTabsProps {
  activeTab: string
  onTabChange: (tab: string) => void
  editContent: ReactNode
  unifyContent: ReactNode
  hasBom: boolean
}

export function SbomTabs({
  activeTab,
  onTabChange,
  editContent,
  unifyContent,
  hasBom,
}: SbomTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange}>
      <TabsList>
        <TabsTrigger value="edit" disabled={!hasBom}>
          Редактирование
        </TabsTrigger>
        <TabsTrigger value="unify">Объединение</TabsTrigger>
      </TabsList>
      <TabsContent value="edit" className="space-y-4 mt-4">
        {editContent}
      </TabsContent>
      <TabsContent value="unify" className="space-y-4 mt-4">
        {unifyContent}
      </TabsContent>
    </Tabs>
  )
}
