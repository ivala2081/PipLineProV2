export const queryKeys = {
  transfers: {
    all: ['transfers'] as const,
    lists: () => [...queryKeys.transfers.all, 'list'] as const,
    list: (orgId: string, page: number) =>
      [...queryKeys.transfers.lists(), { orgId, page }] as const,
    detail: (id: string) => [...queryKeys.transfers.all, 'detail', id] as const,
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
    invitations: (orgId: string) =>
      [...queryKeys.organizations.all, 'invitations', orgId] as const,
  },
} as const
