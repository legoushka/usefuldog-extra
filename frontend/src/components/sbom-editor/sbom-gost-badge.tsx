import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface GostBadgeProps {
  label: string
  value: string | undefined
}

const valueStyles: Record<string, string> = {
  yes: "bg-green-600 hover:bg-green-600 text-white",
  indirect: "bg-yellow-500 hover:bg-yellow-500 text-black",
  no: "bg-gray-400 hover:bg-gray-400 text-white",
}

export function GostBadge({ label, value }: GostBadgeProps) {
  if (!value) return null
  return (
    <Badge className={cn("text-[10px] px-1.5 py-0", valueStyles[value] || "")}>
      {label}: {value}
    </Badge>
  )
}
