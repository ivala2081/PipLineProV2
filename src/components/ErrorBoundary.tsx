import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Sentry } from '@/lib/sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="text-sm font-medium text-red-600">Something went wrong</p>
          <p className="text-xs text-fg3">{this.state.error?.message}</p>
          <button
            className="mt-2 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export function PageErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="rounded-full bg-red-50 p-3">
            <svg
              className="h-6 w-6 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-fg1">This page encountered an error</p>
          <button
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
