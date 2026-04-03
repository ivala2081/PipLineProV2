import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { queryClient } from '@/lib/queryClient'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider, useAuth, type SessionPromise } from '@/app/providers/AuthProvider'
import { OrganizationProvider } from '@/app/providers/OrganizationProvider'
import { AppToastProvider } from '@/hooks/useToast'
import { usePresence } from '@/hooks/usePresence'
import { AppLayout } from '@/layouts/AppLayout'
import { PageErrorBoundary } from '@/components/ErrorBoundary'
import { PageGuard } from '@/app/components/RoleRoute'
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ */
/*  Lazy page imports                                                   */
/* ------------------------------------------------------------------ */

const LoginPage = lazy(() => import('@/pages/login').then((m) => ({ default: m.LoginPage })))
const ForgotPasswordPage = lazy(() =>
  import('@/pages/forgot-password').then((m) => ({ default: m.ForgotPasswordPage })),
)
const ResetPasswordPage = lazy(() =>
  import('@/pages/reset-password').then((m) => ({ default: m.ResetPasswordPage })),
)
const DashboardPage = lazy(() =>
  import('@/pages/dashboard').then((m) => ({ default: m.DashboardPage })),
)
const TransfersPage = lazy(() =>
  import('@/pages/transfers').then((m) => ({ default: m.TransfersPage })),
)
const AddTransferPage = lazy(() =>
  import('@/pages/transfers/AddTransferPage').then((m) => ({ default: m.AddTransferPage })),
)
const EditTransferPage = lazy(() =>
  import('@/pages/transfers/EditTransferPage').then((m) => ({ default: m.EditTransferPage })),
)
const AccountingPage = lazy(() =>
  import('@/pages/accounting').then((m) => ({ default: m.AccountingPage })),
)
const WalletTransfersPage = lazy(() =>
  import('@/pages/accounting/WalletTransfersPage').then((m) => ({
    default: m.WalletTransfersPage,
  })),
)
const PspsPage = lazy(() => import('@/pages/psps').then((m) => ({ default: m.PspsPage })))
const PspDetailPage = lazy(() =>
  import('@/pages/psps/PspDetailPage').then((m) => ({ default: m.PspDetailPage })),
)
const AiPage = lazy(() => import('@/pages/ai').then((m) => ({ default: m.AiPage })))
const MembersPage = lazy(() =>
  import('@/pages/management/members').then((m) => ({ default: m.MembersPage })),
)
const MemberProfilePage = lazy(() =>
  import('@/pages/members/MemberProfilePage').then((m) => ({ default: m.MemberProfilePage })),
)
const OrganizationsListPage = lazy(() =>
  import('@/pages/organizations').then((m) => ({ default: m.OrganizationsListPage })),
)
const OrganizationDetailPage = lazy(() =>
  import('@/pages/organizations/OrganizationDetailPage').then((m) => ({
    default: m.OrganizationDetailPage,
  })),
)
const SecurityDashboard = lazy(() => import('@/pages/security-dashboard'))
const HrPage = lazy(() => import('@/pages/hr').then((m) => ({ default: m.HrPage })))
const EmployeeFormPage = lazy(() =>
  import('@/pages/hr/EmployeeFormPage').then((m) => ({ default: m.EmployeeFormPage })),
)
const BulkSalaryPayoutPage = lazy(() =>
  import('@/pages/hr/payments/BulkSalaryPayoutPage').then((m) => ({
    default: m.BulkSalaryPayoutPage,
  })),
)
const BulkBankDepositPage = lazy(() =>
  import('@/pages/hr/payments/BulkBankDepositPage').then((m) => ({
    default: m.BulkBankDepositPage,
  })),
)
const BulkBonusPayoutPage = lazy(() =>
  import('@/pages/hr/payments/BulkBonusPayoutPage').then((m) => ({
    default: m.BulkBonusPayoutPage,
  })),
)
const BulkPaymentDetailPage = lazy(() =>
  import('@/pages/accounting/BulkPaymentDetailPage').then((m) => ({
    default: m.BulkPaymentDetailPage,
  })),
)
const SettingsPage = lazy(() =>
  import('@/pages/settings').then((m) => ({ default: m.SettingsPage })),
)
const AuditLogPage = lazy(() => import('@/pages/audit').then((m) => ({ default: m.AuditLogPage })))
const WalletsPage = lazy(() => import('@/pages/wallets').then((m) => ({ default: m.WalletsPage })))
const IBPage = lazy(() => import('@/pages/ib').then((m) => ({ default: m.IBPage })))
const PartnerFormPage = lazy(() =>
  import('@/pages/ib/PartnerFormPage').then((m) => ({ default: m.PartnerFormPage })),
)
const PaymentFormPage = lazy(() =>
  import('@/pages/ib/PaymentFormPage').then((m) => ({ default: m.PaymentFormPage })),
)

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
      <Suspense fallback={<LoadingScreen />}>{children}</Suspense>
    </PageErrorBoundary>
  )
}

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */

export function App({ sessionPromise }: { sessionPromise?: SessionPromise }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system">
        <AppToastProvider>
          <AuthProvider sessionPromise={sessionPromise}>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <PageSuspense>
                      <LoginPage />
                    </PageSuspense>
                  </PublicRoute>
                }
              />
              <Route
                path="/forgot-password"
                element={
                  <PublicRoute>
                    <PageSuspense>
                      <ForgotPasswordPage />
                    </PageSuspense>
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password"
                element={
                  <PublicRoute>
                    <PageSuspense>
                      <ResetPasswordPage />
                    </PageSuspense>
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
                          <Route
                            path="/"
                            element={
                              <PageGuard page="dashboard">
                                <PageSuspense>
                                  <DashboardPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/transfers"
                            element={
                              <PageGuard page="transfers">
                                <PageSuspense>
                                  <TransfersPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/transfers/new"
                            element={
                              <PageGuard page="transfers">
                                <PageSuspense>
                                  <AddTransferPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/transfers/:id/edit"
                            element={
                              <PageGuard page="transfers">
                                <PageSuspense>
                                  <EditTransferPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/accounting"
                            element={
                              <PageGuard page="accounting">
                                <PageSuspense>
                                  <AccountingPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/accounting/bulk/:bulkPaymentId"
                            element={
                              <PageGuard page="accounting">
                                <PageSuspense>
                                  <BulkPaymentDetailPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/accounting/wallet/:walletId/transfers"
                            element={
                              <PageGuard page="accounting">
                                <PageSuspense>
                                  <WalletTransfersPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/wallets"
                            element={
                              <PageSuspense>
                                <WalletsPage />
                              </PageSuspense>
                            }
                          />
                          <Route
                            path="/psps"
                            element={
                              <PageGuard page="psps">
                                <PageSuspense>
                                  <PspsPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/psps/:pspId"
                            element={
                              <PageGuard page="psps">
                                <PageSuspense>
                                  <PspDetailPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/ai"
                            element={
                              <PageGuard page="ai">
                                <PageSuspense>
                                  <AiPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/members"
                            element={
                              <PageGuard page="members">
                                <PageSuspense>
                                  <MembersPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/members/:userId"
                            element={
                              <PageGuard page="members">
                                <PageSuspense>
                                  <MemberProfilePage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/organizations"
                            element={
                              <PageGuard page="organizations">
                                <PageSuspense>
                                  <OrganizationsListPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/organizations/:orgId"
                            element={
                              <PageGuard page="organizations">
                                <PageSuspense>
                                  <OrganizationDetailPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/security"
                            element={
                              <PageGuard page="security">
                                <PageSuspense>
                                  <SecurityDashboard />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <HrPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr/employees/new"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <EmployeeFormPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr/employees/:id/edit"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <EmployeeFormPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr/salary-payout"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <BulkSalaryPayoutPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr/bank-deposit"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <BulkBankDepositPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/hr/bonus-payout"
                            element={
                              <PageGuard page="hr">
                                <PageSuspense>
                                  <BulkBonusPayoutPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <PageSuspense>
                                <SettingsPage />
                              </PageSuspense>
                            }
                          />
                          <Route
                            path="/ib"
                            element={
                              <PageGuard page="ib">
                                <PageSuspense>
                                  <IBPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/ib/new"
                            element={
                              <PageGuard page="ib">
                                <PageSuspense>
                                  <PartnerFormPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/ib/:id/edit"
                            element={
                              <PageGuard page="ib">
                                <PageSuspense>
                                  <PartnerFormPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/ib/payments/new"
                            element={
                              <PageGuard page="ib">
                                <PageSuspense>
                                  <PaymentFormPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/ib/:partnerId"
                            element={
                              <PageGuard page="ib">
                                <PageSuspense>
                                  <IBPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
                          <Route
                            path="/audit"
                            element={
                              <PageGuard page="audit">
                                <PageSuspense>
                                  <AuditLogPage />
                                </PageSuspense>
                              </PageGuard>
                            }
                          />
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
