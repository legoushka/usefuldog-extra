"use client"

import { useMemo } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface ConfluencePreviewProps {
  markup: string
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function parseInline(text: string): string {
  let result = escapeHtml(text)
  // *bold*
  result = result.replace(/\*([^*]+)\*/g, "<strong>$1</strong>")
  // _italic_
  result = result.replace(/\b_([^_]+)_\b/g, "<em>$1</em>")
  // {{monospace}}
  result = result.replace(
    /\{\{([^}]+)\}\}/g,
    '<code class="bg-muted px-1 py-0.5 rounded text-sm font-mono">$1</code>',
  )
  // {status:colour=X|title=Y}
  result = result.replace(
    /\{status:colour=(\w+)\|title=([^}]+)\}/gi,
    (_match, colour: string, title: string) => {
      const colorMap: Record<string, string> = {
        red: "bg-red-600 text-white",
        yellow: "bg-yellow-500 text-black",
        green: "bg-green-600 text-white",
        blue: "bg-blue-500 text-white",
        grey: "bg-gray-500 text-white",
        gray: "bg-gray-500 text-white",
      }
      const cls = colorMap[colour.toLowerCase()] ?? "bg-gray-500 text-white"
      return `<span class="inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${cls}">${escapeHtml(title)}</span>`
    },
  )
  return result
}

function parseTable(lines: string[]): string {
  const rows = lines.map((line) => {
    const isHeader = line.startsWith("||")
    const separator = isHeader ? "||" : "|"
    const cells = line
      .split(separator)
      .filter((c) => c.length > 0)
      .map((c) => c.trim())

    const tag = isHeader ? "th" : "td"
    const thClass = isHeader
      ? ' class="bg-muted font-semibold text-left px-3 py-2 border border-border text-sm"'
      : ' class="px-3 py-2 border border-border text-sm"'
    return `<tr>${cells.map((c) => `<${tag}${thClass}>${parseInline(c)}</${tag}>`).join("")}</tr>`
  })
  return `<table class="w-full border-collapse border border-border my-2">${rows.join("")}</table>`
}

function wikiToHtml(markup: string): string {
  const lines = markup.split("\n")
  const htmlParts: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Headings: h1. through h6.
    const headingMatch = line.match(/^h([1-6])\.\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1]
      const sizes: Record<string, string> = {
        "1": "text-2xl font-bold mt-6 mb-3",
        "2": "text-xl font-semibold mt-5 mb-2",
        "3": "text-lg font-semibold mt-4 mb-2",
        "4": "text-base font-semibold mt-3 mb-1",
        "5": "text-sm font-semibold mt-2 mb-1",
        "6": "text-xs font-semibold mt-2 mb-1",
      }
      htmlParts.push(
        `<h${level} class="${sizes[level]}">${parseInline(headingMatch[2])}</h${level}>`,
      )
      i++
      continue
    }

    // Horizontal rule
    if (line.trim() === "----") {
      htmlParts.push('<hr class="my-4 border-border" />')
      i++
      continue
    }

    // {panel:title=...} ... {panel}
    const panelMatch = line.match(/^\{panel(?::title=([^}]*))?\}$/)
    if (panelMatch) {
      const title = panelMatch[1] ?? ""
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{panel\}$/)) {
        content.push(lines[i])
        i++
      }
      i++ // skip closing {panel}
      const titleHtml = title
        ? `<div class="font-semibold text-sm mb-2">${escapeHtml(title)}</div>`
        : ""
      htmlParts.push(
        `<div class="border border-border rounded-md p-4 my-3 bg-card">${titleHtml}${wikiToHtml(content.join("\n"))}</div>`,
      )
      continue
    }

    // {warning:title=...} ... {warning}
    const warningMatch = line.match(/^\{warning(?::title=([^}]*))?\}$/)
    if (warningMatch) {
      const title = warningMatch[1] ?? "Warning"
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{warning\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<div class="border-l-4 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30 p-4 my-3 rounded-r-md"><div class="font-semibold text-sm text-yellow-800 dark:text-yellow-300 mb-1">${escapeHtml(title)}</div><div class="text-sm">${wikiToHtml(content.join("\n"))}</div></div>`,
      )
      continue
    }

    // {info} ... {info}
    if (line.match(/^\{info(?::title=([^}]*))?\}$/)) {
      const titleMatch = line.match(/^\{info:title=([^}]*)\}$/)
      const title = titleMatch?.[1] ?? "Info"
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{info\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<div class="border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-950/30 p-4 my-3 rounded-r-md"><div class="font-semibold text-sm text-blue-800 dark:text-blue-300 mb-1">${escapeHtml(title)}</div><div class="text-sm">${wikiToHtml(content.join("\n"))}</div></div>`,
      )
      continue
    }

    // {note} ... {note}
    if (line.match(/^\{note(?::title=([^}]*))?\}$/)) {
      const titleMatch = line.match(/^\{note:title=([^}]*)\}$/)
      const title = titleMatch?.[1] ?? "Note"
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{note\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<div class="border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-950/30 p-4 my-3 rounded-r-md"><div class="font-semibold text-sm text-purple-800 dark:text-purple-300 mb-1">${escapeHtml(title)}</div><div class="text-sm">${wikiToHtml(content.join("\n"))}</div></div>`,
      )
      continue
    }

    // {tip} ... {tip}
    if (line.match(/^\{tip(?::title=([^}]*))?\}$/)) {
      const titleMatch = line.match(/^\{tip:title=([^}]*)\}$/)
      const title = titleMatch?.[1] ?? "Tip"
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{tip\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<div class="border-l-4 border-green-500 bg-green-50 dark:bg-green-950/30 p-4 my-3 rounded-r-md"><div class="font-semibold text-sm text-green-800 dark:text-green-300 mb-1">${escapeHtml(title)}</div><div class="text-sm">${wikiToHtml(content.join("\n"))}</div></div>`,
      )
      continue
    }

    // {expand:title=...} ... {expand}
    const expandMatch = line.match(/^\{expand(?::title=([^}]*))?\}$/)
    if (expandMatch) {
      const title = expandMatch[1] ?? "Expand"
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{expand\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<details class="my-3 border border-border rounded-md"><summary class="cursor-pointer px-4 py-2 font-medium text-sm bg-muted/50 hover:bg-muted">${escapeHtml(title)}</summary><div class="p-4">${wikiToHtml(content.join("\n"))}</div></details>`,
      )
      continue
    }

    // {noformat} ... {noformat}
    if (line.match(/^\{noformat\}$/)) {
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{noformat\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<pre class="bg-muted p-4 rounded-md my-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap">${escapeHtml(content.join("\n"))}</pre>`,
      )
      continue
    }

    // {code} ... {code}
    if (line.match(/^\{code(?::[^}]*)?\}$/)) {
      const content: string[] = []
      i++
      while (i < lines.length && !lines[i].match(/^\{code\}$/)) {
        content.push(lines[i])
        i++
      }
      i++
      htmlParts.push(
        `<pre class="bg-zinc-900 text-zinc-100 p-4 rounded-md my-3 text-sm font-mono overflow-x-auto"><code>${escapeHtml(content.join("\n"))}</code></pre>`,
      )
      continue
    }

    // {toc} macro - skip
    if (line.match(/^\{toc[^}]*\}$/)) {
      i++
      continue
    }

    // Table rows (|| or |)
    if (line.startsWith("||") || (line.startsWith("|") && line.includes("|"))) {
      const tableLines: string[] = []
      while (
        i < lines.length &&
        (lines[i].startsWith("||") || lines[i].startsWith("|"))
      ) {
        tableLines.push(lines[i])
        i++
      }
      htmlParts.push(parseTable(tableLines))
      continue
    }

    // Empty line
    if (line.trim() === "") {
      htmlParts.push("<br />")
      i++
      continue
    }

    // Regular text
    htmlParts.push(`<p class="text-sm my-1">${parseInline(line)}</p>`)
    i++
  }

  return htmlParts.join("\n")
}

export function ConfluencePreview({ markup }: ConfluencePreviewProps) {
  const html = useMemo(() => wikiToHtml(markup), [markup])

  return (
    <ScrollArea className="h-[600px] rounded-md border">
      <div
        className="p-6 prose prose-sm dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </ScrollArea>
  )
}
