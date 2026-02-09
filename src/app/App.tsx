import { ThemeProvider } from '@/app/providers/ThemeProvider'

export function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <div className="min-h-screen bg-bg1 text-black font-normal">
        <h1 className="text-2xl font-semibold p-8">PipLinePro Dashboard</h1>
        <p className="px-8 text-black/60">Design system loaded. Ready to build.</p>
      </div>
    </ThemeProvider>
  )
}
