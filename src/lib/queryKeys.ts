export const queryKeys = {
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (orgId: string, page: number, filterDate?: string) =>
      [...queryKeys.transfers.lists(), { orgId, page, filterDate }] as const,
    dateCounts: (orgId: string) => [...queryKeys.transfers.lists(), 'dateCounts', orgId] as const,
    detail: (orgId: string, id: string) =>
      [...queryKeys.transfers.all, 'detail', orgId, id] as const,
    audit: (transferId: string, page: number) =>
      [...queryKeys.transfers.all, 'audit', transferId, page] as const,
    monthlySummary: (orgId: string, year: number, month: number) =>
      [...queryKeys.transfers.all, 'monthlySummary', orgId, year, month] as const,
  },
  lookups: {
    all: ['lookups'] as const,
    byTable: (table: string, orgId: string) => [...queryKeys.lookups.all, table, orgId] as const,
    byTablePrefix: (table: string) => [...queryKeys.lookups.all, table] as const,
    psps: (orgId: string) => [...queryKeys.lookups.all, 'psps', orgId] as const,
    categories: (orgId: string) => [...queryKeys.lookups.all, 'categories', orgId] as const,
    paymentMethods: (orgId: string) => [...queryKeys.lookups.all, 'paymentMethods', orgId] as const,
    transferTypes: (orgId: string) => [...queryKeys.lookups.all, 'transferTypes', orgId] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: () => [...queryKeys.organizations.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.organizations.all, 'detail', id] as const,
    members: (orgId: string) => [...queryKeys.organizations.all, 'members', orgId] as const,
    invitations: (orgId: string) => [...queryKeys.organizations.all, 'invitations', orgId] as const,
  },
  accounting: {
    all: ['accounting'] as const,
    lists: () => [...queryKeys.accounting.all, 'list'] as const,
    list: (orgId: string, page: number) =>
      [...queryKeys.accounting.lists(), { orgId, page }] as const,
    summary: (orgId: string) => [...queryKeys.accounting.all, 'summary', orgId] as const,
    reconciliation: (orgId: string, year: number, month: number) =>
      [...queryKeys.accounting.all, 'reconciliation', orgId, year, month] as const,
    reconciliationPrev: (orgId: string, year: number, month: number) =>
      [...queryKeys.accounting.all, 'reconciliation', orgId, year, month, 'prev'] as const,
    config: (orgId: string, year: number, month: number) =>
      [...queryKeys.accounting.all, 'config', orgId, year, month] as const,
  },
  pspRates: {
    all: ['pspRates'] as const,
    byPsp: (pspId: string) => [...queryKeys.pspRates.all, 'byPsp', pspId] as const,
    byOrg: (orgId: string) => [...queryKeys.pspRates.all, 'byOrg', orgId] as const,
  },
  pspSettlements: {
    all: ['pspSettlements'] as const,
    byPsp: (pspId: string) => [...queryKeys.pspSettlements.all, 'byPsp', pspId] as const,
  },
  pspDashboard: {
    all: ['pspDashboard'] as const,
    summary: (orgId: string) => [...queryKeys.pspDashboard.all, 'summary', orgId] as const,
    ledger: (pspId: string) => [...queryKeys.pspDashboard.all, 'ledger', pspId] as const,
    monthly: (pspId: string) => [...queryKeys.pspDashboard.all, 'monthly', pspId] as const,
    bloke: (pspId: string) => [...queryKeys.pspDashboard.all, 'bloke', pspId] as const,
  },
  profiles: {
    all: ['profiles'] as const,
    detail: (userId: string) => [...queryKeys.profiles.all, 'detail', userId] as const,
  },
  wallets: {
    all: ['wallets'] as const,
    list: (orgId: string) => [...queryKeys.wallets.all, 'list', orgId] as const,
    balances: (walletId: string) => [...queryKeys.wallets.all, 'balances', walletId] as const,
    snapshots: (walletId: string) => [...queryKeys.wallets.all, 'snapshots', walletId] as const,
    chart: (walletId: string) => [...queryKeys.wallets.all, 'chart', walletId] as const,
    transfers: (walletId: string, cursor?: string) =>
      [...queryKeys.wallets.all, 'transfers', walletId, cursor ?? ''] as const,
  },
  presence: {
    all: ['presence'] as const,
    onlineCount: (orgId: string | undefined) =>
      [...queryKeys.presence.all, 'onlineCount', orgId ?? ''] as const,
    onlineMembers: (orgId: string | undefined) =>
      [...queryKeys.presence.all, 'onlineMembers', orgId ?? ''] as const,
    portfolio: (orgId: string) => [...queryKeys.presence.all, 'portfolio', orgId] as const,
  },
  uniPayment: {
    all: ['uniPayment'] as const,
    balances: (pspId: string) => [...queryKeys.uniPayment.all, 'balances', pspId] as const,
    accounts: (pspId: string) => [...queryKeys.uniPayment.all, 'accounts', pspId] as const,
    depositAddress: (pspId: string, accountId: string) =>
      [...queryKeys.uniPayment.all, 'accounts', pspId, 'deposit', accountId] as const,
    transactions: (pspId: string, accountId: string, page: number) =>
      [...queryKeys.uniPayment.all, 'transactions', pspId, accountId, page] as const,
    invoices: (pspId: string, page: number) =>
      [...queryKeys.uniPayment.all, 'invoices', pspId, page] as const,
    payments: (pspId: string, page: number) =>
      [...queryKeys.uniPayment.all, 'payments', pspId, page] as const,
    syncStatus: (pspId: string) => [...queryKeys.uniPayment.all, 'syncStatus', pspId] as const,
  },
  apiHealth: {
    all: ['apiHealth'] as const,
    status: () => [...queryKeys.apiHealth.all, 'status'] as const,
  },
  search: {
    all: ['search'] as const,
    query: (q: string) => ['search', q] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    current: (orgId: string, period: string, from: string) =>
      [...queryKeys.dashboard.all, 'current', orgId, period, from] as const,
    previous: (orgId: string, period: string, from: string) =>
      [...queryKeys.dashboard.all, 'previous', orgId, period, from] as const,
    rateHistory: (orgId: string) => [...queryKeys.dashboard.all, 'rateHistory', orgId] as const,
    recentTransfers: (orgId: string) =>
      [...queryKeys.dashboard.all, 'recentTransfers', orgId] as const,
    recentActivity: (orgId: string) =>
      [...queryKeys.dashboard.all, 'recentActivity', orgId] as const,
    pspMeta: (orgId: string) => [...queryKeys.dashboard.all, 'pspMeta', orgId] as const,
    pspCommission: (orgId: string, from: string) =>
      [...queryKeys.dashboard.all, 'pspCommission', orgId, from] as const,
    prevPspCommission: (orgId: string, from: string) =>
      [...queryKeys.dashboard.all, 'prevPspCommission', orgId, from] as const,
  },
  exchangeRate: {
    all: ['exchangeRate'] as const,
    byCurrency: (currency: string) => [...queryKeys.exchangeRate.all, currency] as const,
  },
  orgPin: {
    all: ['orgPin'] as const,
    has: (orgId: string) => [...queryKeys.orgPin.all, 'has', orgId] as const,
  },
  sessions: {
    all: ['sessions'] as const,
    loginHistory: (userId: string, limit: number, offset: number) =>
      [...queryKeys.sessions.all, 'loginHistory', userId, limit, offset] as const,
  },
  security: {
    all: ['security'] as const,
    metrics: () => [...queryKeys.security.all, 'metrics'] as const,
    failedLogins: () => [...queryKeys.security.all, 'failed-logins'] as const,
    godAudit: () => [...queryKeys.security.all, 'god-audit'] as const,
    permissions: (orgId: string) => [...queryKeys.security.all, 'permissions', orgId] as const,
    myPagePermissions: (orgId: string) =>
      [...queryKeys.security.all, 'my-page-permissions', orgId] as const,
  },
  audit: {
    all: ['audit'] as const,
    list: (orgId: string, filters: Record<string, unknown>) =>
      ['audit', 'list', orgId, filters] as const,
    count: (orgId: string, filters: Record<string, unknown>) =>
      ['audit', 'count', orgId, filters] as const,
    activity: (orgId: string, filters: Record<string, unknown>) =>
      ['audit', 'activity', orgId, filters] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (orgId: string) => ['alerts', 'list', orgId] as const,
  },
  webhooks: {
    all: ['webhooks'] as const,
    list: (orgId: string) => ['webhooks', 'list', orgId] as const,
    deliveryLog: (webhookId: string) => ['webhooks', 'delivery', webhookId] as const,
  },
  apiKeys: {
    all: ['apiKeys'] as const,
    list: (orgId: string) => ['apiKeys', 'list', orgId] as const,
  },
  ozet: {
    all: ['ozet'] as const,
    summary: (orgId: string, year: number, month: number) =>
      ['ozet', 'summary', orgId, year, month] as const,
  },
  hr: {
    root: ['hr'] as const,
    all: (orgId: string) => ['hr', orgId] as const,
    employees: (orgId: string) => ['hr', orgId, 'employees'] as const,
    employee: (orgId: string, id: string) => ['hr', orgId, 'employee', id] as const,
    documents: (orgId: string, employeeId: string) =>
      ['hr', orgId, 'documents', employeeId] as const,
    bonusAgreements: (orgId: string) => ['hr', orgId, 'bonus-agreements'] as const,
    bonusPayments: (orgId: string) => ['hr', orgId, 'bonus-payments'] as const,
    variablePending: (orgId: string) => ['hr', orgId, 'variable-pending'] as const,
    salaryPaymentsPrefix: (orgId: string) => ['hr', orgId, 'salary-payments'] as const,
    salaryPayments: (orgId: string, year: number, month: number) =>
      ['hr', orgId, 'salary-payments', year, month] as const,
    allSalaryPayments: (orgId: string) => ['hr', orgId, 'all-salary-payments'] as const,
    attendance: (orgId: string, date: string) => ['hr', orgId, 'attendance', date] as const,
    attendanceAll: (orgId: string) => ['hr', orgId, 'attendance'] as const,
    attendanceMonth: (orgId: string, year: number, month: number) =>
      ['hr', orgId, 'attendance-month', year, month] as const,
    autoBonusTransfers: (orgId: string, year: number, month: number) =>
      ['hr', orgId, 'auto-bonus-transfers', year, month] as const,
    mtConfig: (orgId: string) => ['hr', orgId, 'mt-config'] as const,
    reConfig: (orgId: string) => ['hr', orgId, 're-config'] as const,
    hrSettings: (orgId: string) => ['hr', orgId, 'settings'] as const,
    leaves: (orgId: string) => ['hr', orgId, 'leaves'] as const,
    leavesMonth: (orgId: string, year: number, month: number) =>
      ['hr', orgId, 'leaves-month', year, month] as const,
    leavesMonthAll: (orgId: string) => ['hr', orgId, 'leaves-month'] as const,
    leavesForDate: (orgId: string, date: string) => ['hr', orgId, 'leaves-date', date] as const,
    advances: (orgId: string, year: number, month: number) =>
      ['hr', orgId, 'advances', year, month] as const,
    bulkPayments: (orgId: string) => ['hr', orgId, 'bulk-payments'] as const,
    bulkPaymentDetail: (orgId: string, id: string) => ['hr', orgId, 'bulk-payment', id] as const,
    baremFailures: (orgId: string, period: string) =>
      ['hr', orgId, 'barem-failures', period] as const,
    baremTargets: (orgId: string, period: string) =>
      ['hr', orgId, 'barem-targets', period] as const,
  },
  ib: {
    all: ['ib'] as const,
    partners: (orgId: string) => ['ib', orgId, 'partners'] as const,
    partner: (orgId: string, id: string) => ['ib', orgId, 'partner', id] as const,
    referrals: (orgId: string) => ['ib', orgId, 'referrals'] as const,
    commissions: (orgId: string) => ['ib', orgId, 'commissions'] as const,
    payments: (orgId: string) => ['ib', orgId, 'payments'] as const,
  },
} as const
