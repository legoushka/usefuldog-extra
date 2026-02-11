"use client"

import { Component, type ReactNode } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[50vh] p-6">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Произошла ошибка</AlertTitle>
              <AlertDescription>
                Что-то пошло не так при отображении страницы. Попробуйте обновить страницу.
              </AlertDescription>
            </Alert>
            <Button
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Обновить страницу
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
