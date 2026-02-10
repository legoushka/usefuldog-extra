"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

interface TextEditorProps {
  value: string
  onChange: (text: string) => void
  parseError: string | null
}

export function SbomTextEditor({ value, onChange, parseError }: TextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const viewRef = useRef<any>(null)
  const [ready, setReady] = useState(false)

  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  const initEditor = useCallback(async () => {
    if (!containerRef.current || viewRef.current) return

    const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter } =
      await import("@codemirror/view")
    const { EditorState } = await import("@codemirror/state")
    const { json } = await import("@codemirror/lang-json")
    const { defaultKeymap, history, historyKeymap } = await import("@codemirror/commands")
    const {
      syntaxHighlighting,
      defaultHighlightStyle,
      bracketMatching,
      foldGutter,
      foldKeymap,
    } = await import("@codemirror/language")
    const { oneDark } = await import("@codemirror/theme-one-dark")
    const { closeBrackets, closeBracketsKeymap } = await import("@codemirror/autocomplete")
    const { lintKeymap } = await import("@codemirror/lint")
    const { searchKeymap, highlightSelectionMatches } = await import("@codemirror/search")

    const isDark = document.documentElement.classList.contains("dark")

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        onChangeRef.current(update.state.doc.toString())
      }
    })

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightActiveLine(),
        history(),
        foldGutter(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        json(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        ...(isDark ? [oneDark] : []),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...closeBracketsKeymap,
          ...lintKeymap,
          ...searchKeymap,
        ]),
        updateListener,
        EditorView.theme({
          "&": { height: "500px", fontSize: "13px" },
          ".cm-scroller": { overflow: "auto" },
        }),
      ],
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view
    setReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    initEditor()
    return () => {
      if (viewRef.current) {
        viewRef.current.destroy()
        viewRef.current = null
      }
    }
  }, [initEditor])

  // Sync external value changes into the editor
  useEffect(() => {
    if (!viewRef.current || !ready) return
    const view = viewRef.current
    const currentText = view.state.doc.toString()
    if (currentText !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentText.length,
          insert: value,
        },
      })
    }
  }, [value, ready])

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">JSON редактор</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {parseError && (
          <div className="px-4 pb-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {parseError}
              </AlertDescription>
            </Alert>
          </div>
        )}
        <div ref={containerRef} className="border-t" />
      </CardContent>
    </Card>
  )
}
