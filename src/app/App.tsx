import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider, useAuth } from '@/app/providers/AuthProvider'
import { OrganizationProvider } from '@/app/providers/OrganizationProvider'
import { AppToastProvider } from '@/hooks/useToast'
import { AppLayout } from '@/layouts/AppLayout'
import { LoginPage } from '@/pages/login'
import { ForgotPasswordPage } from '@/pages/forgot-password'
import { ResetPasswordPage } from '@/pages/reset-password'
import { DashboardPage } from '@/pages/dashboard'
import { TransfersPage } from '@/pages/transfers'
import { Module2Page } from '@/pages/modules/module-2'
import { Module3Page } from '@/pages/modules/module-3'
import { MembersPage } from '@/pages/management/members'
import { InvitationsPage } from '@/pages/management/invitations'
import { OrganizationsPage } from '@/pages/system/organizations'
import type { ReactNode } from 'react'

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
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicRoute>
                  <ForgotPasswordPage />
                </PublicRoute>
              }
            />
            <Route
              path="/reset-password"
              element={<ResetPasswordPage />}
            />
            <Route
              path="/*"
              element={
                <PrivateRoute>
                  <OrganizationProvider>
                    <AppLayout>
                      <Routes>
                        <Route path="/" element={<DashboardPage />} />
                        <Route path="/transfers" element={<TransfersPage />} />
                        <Route path="/module-2" element={<Module2Page />} />
                        <Route path="/module-3" element={<Module3Page />} />
                        <Route path="/members" element={<MembersPage />} />
                        <Route path="/invitations" element={<InvitationsPage />} />
                        <Route path="/organizations" element={<OrganizationsPage />} />
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
