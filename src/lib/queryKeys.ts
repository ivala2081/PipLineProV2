export const queryKeys = {
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (orgId: string, page: number, filterDate?: string) =>
      [...queryKeys.transfers.lists(), { orgId, page, filterDate }] as const,
    detail: (id: string) => [...queryKeys.transfers.all, 'detail', id] as const,
    audit: (transferId: string, page: number) =>
      [...queryKeys.transfers.all, 'audit', transferId, page] as const,
    monthlySummary: (orgId: string, year: number, month: number) =>
      [...queryKeys.transfers.all, 'monthlySummary', orgId, year, month] as const,
  },
  lookups: {
    all: ['lookups'] as const,
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
    portfolio: (orgId: string) => [...queryKeys.presence.all, 'portfolio', orgId] as const,
  },
} as const
