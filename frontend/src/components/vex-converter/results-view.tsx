"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ConfluencePreview } from "./confluence-preview"
import { CopyButton } from "@/components/common/copy-button"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ResultsViewProps {
  markup: string
}

export function ResultsView({ markup }: ResultsViewProps) {
  return (
    <Tabs defaultValue="preview" className="w-full">
      <div className="flex items-center justify-between">
        <TabsList>
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="markup">Markup</TabsTrigger>
        </TabsList>
        <CopyButton text={markup} />
      </div>
      <TabsContent value="preview" className="mt-4">
        <ConfluencePreview markup={markup} />
      </TabsContent>
      <TabsContent value="markup" className="mt-4">
        <ScrollArea className="h-[600px] rounded-md border">
          <pre className="p-6 text-sm font-mono whitespace-pre-wrap break-words">
            {markup}
          </pre>
        </ScrollArea>
      </TabsContent>
    </Tabs>
  )
}
