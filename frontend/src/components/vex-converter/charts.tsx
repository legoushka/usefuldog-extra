"use client"

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Stats } from "@/lib/api"

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6",
  info: "#38bdf8",
  none: "#9ca3af",
  unknown: "#6b7280",
}

const STATE_COLORS: Record<string, string> = {
  resolved: "#22c55e",
  resolved_with_pedigree: "#16a34a",
  exploitable: "#ef4444",
  in_triage: "#f59e0b",
  false_positive: "#94a3b8",
  not_affected: "#3b82f6",
}

interface ChartsProps {
  stats: Stats
}

export function SeverityChart({ stats }: ChartsProps) {
  const data = Object.entries(stats.by_severity)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name, value }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Распределение по критичности
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, value }) => `${name} (${value})`}
            >
              {data.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={SEVERITY_COLORS[entry.name] ?? "#6b7280"}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function StateChart({ stats }: ChartsProps) {
  const data = Object.entries(stats.by_state)
    .filter(([, count]) => count > 0)
    .map(([name, value]) => ({ name: name.replace(/_/g, " "), value, key: name }))

  if (data.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">
          Состояние анализа
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={STATE_COLORS[entry.key] ?? "#6b7280"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
