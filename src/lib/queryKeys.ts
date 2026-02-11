export const queryKeys = {
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (orgId: string, page: number) =>
      [...queryKeys.transfers.lists(), { orgId, page }] as const,
    detail: (id: string) => [...queryKeys.transfers.all, 'detail', id] as const,
    audit: (transferId: string, page: number) =>
      [...queryKeys.transfers.all, 'audit', transferId, page] as const,
  },
  lookups: {
    all: ['lookups'] as const,
    psps: (orgId: string) => [...queryKeys.lookups.all, 'psps', orgId] as const,
    categories: (orgId: string) =>
      [...queryKeys.lookups.all, 'categories', orgId] as const,
    paymentMethods: (orgId: string) =>
      [...queryKeys.lookups.all, 'paymentMethods', orgId] as const,
    transferTypes: (orgId: string) =>
      [...queryKeys.lookups.all, 'transferTypes', orgId] as const,
  },
  organizations: {
    all: ['organizations'] as const,
    list: () => [...queryKeys.organizations.all, 'list'] as const,
    detail: (id: string) =>
      [...queryKeys.organizations.all, 'detail', id] as const,
    members: (orgId: string) =>
      [...queryKeys.organizations.all, 'members', orgId] as const,
  },
  accounting: {
    all: ['accounting'] as const,
    lists: () => [...queryKeys.accounting.all, 'list'] as const,
    list: (orgId: string, page: number) =>
      [...queryKeys.accounting.lists(), { orgId, page }] as const,
    summary: (orgId: string) =>
      [...queryKeys.accounting.all, 'summary', orgId] as const,
  },
  pspRates: {
    all: ['pspRates'] as const,
    byPsp: (pspId: string) => [...queryKeys.pspRates.all, 'byPsp', pspId] as const,
    byOrg: (orgId: string) => [...queryKeys.pspRates.all, 'byOrg', orgId] as const,
  },
  wallets: {
    all: ['wallets'] as const,
    list: (orgId: string) =>
      [...queryKeys.wallets.all, 'list', orgId] as const,
    balances: (walletId: string) =>
      [...queryKeys.wallets.all, 'balances', walletId] as const,
    snapshots: (walletId: string) =>
      [...queryKeys.wallets.all, 'snapshots', walletId] as const,
  },
} as const
