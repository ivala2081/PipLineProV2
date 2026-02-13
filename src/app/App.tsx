import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { OrganizationProvider } from '@/app/providers/OrganizationProvider'
import { AppToastProvider } from '@/hooks/useToast'
import { usePresence } from '@/hooks/usePresence'
import { AppLayout } from '@/layouts/AppLayout'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Lazy page imports                                                   */
/* ------------------------------------------------------------------ */

const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() => import('@/pages/forgot-password').then((m) => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/pages/reset-password').then((m) => ({ default: m.ResetPasswordPage })))
const DashboardPage = lazy(() => import('@/pages/dashboard').then((m) => ({ default: m.DashboardPage })))
const TransfersPage = lazy(() => import('@/pages/transfers').then((m) => ({ default: m.TransfersPage })))
const AccountingPage = lazy(() => import('@/pages/accounting').then((m) => ({ default: m.AccountingPage })))
const WalletTransactionsPage = lazy(() => import('@/pages/accounting/WalletTransactionsPage').then((m) => ({ default: m.WalletTransactionsPage })))
const PspsPage = lazy(() => import('@/pages/psps').then((m) => ({ default: m.PspsPage })))
const FuturePage = lazy(() => import('@/pages/future').then((m) => ({ default: m.FuturePage })))
const MembersPage = lazy(() => import('@/pages/management/members').then((m) => ({ default: m.MembersPage })))
const MemberProfilePage = lazy(() => import('@/pages/members/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })))
const OrganizationsListPage = lazy(() => import('@/pages/organizations').then((m) => ({ default: m.OrganizationsListPage })))
const OrganizationDetailPage = lazy(() => import('@/pages/organizations/OrganizationDetailPage').then((m) => ({ default: m.OrganizationDetailPage })))

/* ------------------------------------------------------------------ */
/*  Route guards                                                       */
/* ------------------------------------------------------------------ */

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (user) return <Navigate to="/" replace />

  return <>{children}</>
}

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  // Enable presence tracking for authenticated users
  usePresence()

  if (isLoading) return <LoadingScreen />
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg1">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-black/10 border-t-brand" />
    </div>
  )
}

function PageSuspense({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<LoadingScreen />}>
        {children}
      </Suspense>
    </PageErrorBoundary>
  )
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light">
        <AppToastProvider>
          <AuthProvider>
            <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <PageSuspense><LoginPage /></PageSuspense>
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <PageSuspense><ForgotPasswordPage /></PageSuspense>
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <PublicRoute>
                  <PageSuspense><ResetPasswordPage /></PageSuspense>
                </PublicRoute>
              }
            />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <OrganizationProvider>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<PageSuspense><DashboardPage /></PageSuspense>} />
                        <Route path="/transfers" element={<PageSuspense><TransfersPage /></PageSuspense>} />
                        <Route path="/accounting" element={<PageSuspense><AccountingPage /></PageSuspense>} />
                        <Route path="/accounting/wallet/:walletId/transactions" element={<PageSuspense><WalletTransactionsPage /></PageSuspense>} />
                        <Route path="/psps" element={<PageSuspense><PspsPage /></PageSuspense>} />
                        <Route path="/future" element={<PageSuspense><FuturePage /></PageSuspense>} />
                        <Route path="/members" element={<PageSuspense><MembersPage /></PageSuspense>} />
                        <Route path="/members/:userId" element={<PageSuspense><MemberProfilePage /></PageSuspense>} />
                        <Route path="/organizations" element={<PageSuspense><OrganizationsListPage /></PageSuspense>} />
                        <Route path="/organizations/:orgId" element={<PageSuspense><OrganizationDetailPage /></PageSuspense>} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </AppLayout>
                  </OrganizationProvider>
                </PrivateRoute>
              }
            />
            </Routes>
          </AuthProvider>
        </AppToastProvider>
      </ThemeProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
