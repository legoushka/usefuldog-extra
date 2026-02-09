import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileSearch } from "lucide-react"

const tools = [
  {
    title: "VEX Converter",
    description: "Convert CSAF VEX JSON documents to Confluence wiki markup with vulnerability analysis charts.",
    href: "/tools/vex-converter",
    icon: FileSearch,
    status: "Active" as const,
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Security tooling and utilities
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.title} href={tool.href}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {tool.title}
                </CardTitle>
                <Badge variant="secondary">{tool.status}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <tool.icon className="h-8 w-8 text-muted-foreground" />
                  <CardDescription>{tool.description}</CardDescription>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
