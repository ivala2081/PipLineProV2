import { Component, type ErrorInfo, type ReactNode } from 'react'
import { WarningCircle, ArrowClockwise } from '@phosphor-icons/react'
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

interface SectionErrorBoundaryProps {
  children: ReactNode
  fallbackHeight?: string
  sectionName?: string
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, State> {
  constructor(props: SectionErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const label = this.props.sectionName ?? 'Unknown section'
    console.error(`[SectionErrorBoundary: ${label}]`, error, info.componentStack)
    Sentry.captureException(error, {
      extra: { componentStack: info.componentStack, sectionName: label },
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-black/10 bg-bg1 ${this.props.fallbackHeight ?? 'min-h-[200px]'}`}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-orange/10">
            <WarningCircle size={20} weight="duotone" className="text-orange" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-black/60">This section encountered an error</p>
            {this.props.sectionName && (
              <p className="mt-0.5 text-xs text-black/40">{this.props.sectionName}</p>
            )}
          </div>
          <button
            className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-black/50 transition-colors hover:bg-black/[0.04] hover:text-black/70"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            <ArrowClockwise size={12} />
            Retry
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
