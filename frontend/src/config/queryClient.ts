import { QueryClient } from '@tanstack/react-query';
import { isDevelopment } from './environment';

// Create a client with optimized settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 3 times
      retry: 3,
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus in development
      refetchOnWindowFocus: isDevelopment(),
      // Refetch on reconnect
      refetchOnReconnect: true,
      // Refetch on mount if data is stale
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query keys factory for consistent key management
export const queryKeys = {
  // Dashboard queries
  dashboard: {
    stats: (range: string) => ['dashboard', 'stats', range],
    topPerformers: (range: string) => ['dashboard', 'topPerformers', range],
    revenueTrends: (range: string) => ['dashboard', 'revenueTrends', range],
  },
  
  // Analytics queries
  analytics: {
    clients: (range: string) => ['analytics', 'clients', range],
    commission: (range: string) => ['analytics', 'commission', range],
    volumeAnalysis: (range: string) => ['analytics', 'volumeAnalysis', range],
    systemPerformance: () => ['analytics', 'systemPerformance'],
    dataQuality: () => ['analytics', 'dataQuality'],
    integrationStatus: () => ['analytics', 'integrationStatus'],
    securityMetrics: () => ['analytics', 'securityMetrics'],
    ledgerData: (days: number) => ['analytics', 'ledgerData', days],
  },
  
  // Transaction queries
  transactions: {
    all: (params?: any) => ['transactions', 'all', params],
    clients: () => ['transactions', 'clients'],
    dropdownOptions: () => ['transactions', 'dropdownOptions'],
    pspSummaryStats: () => ['transactions', 'pspSummaryStats'],
  },
  
  // User queries
  users: {
    settings: () => ['users', 'settings'],
    profile: () => ['users', 'profile'],
  },
  
  // Auth queries
  auth: {
    check: () => ['auth', 'check'],
    csrfToken: () => ['auth', 'csrfToken'],
  },
  
  // Exchange rates queries
  exchangeRates: {
    all: () => ['exchangeRates', 'all'],
    refresh: () => ['exchangeRates', 'refresh'],
  },
} as const;

// Prefetch functions for critical data
export const prefetchQueries = {
  // Prefetch dashboard data
  dashboard: async (range: string = 'all') => {
    await Promise.all([
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.stats(range),
        queryFn: () => fetch(`/api/v1/analytics/dashboard/stats?range=${range}`).then(res => res.json()),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.topPerformers(range),
        queryFn: () => fetch(`/api/v1/analytics/top-performers?range=${range}`).then(res => res.json()),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.dashboard.revenueTrends(range),
        queryFn: () => fetch(`/api/v1/analytics/revenue/trends?range=${range}`).then(res => res.json()),
      }),
    ]);
  },
  
  // Prefetch user settings
  userSettings: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.users.settings(),
      queryFn: () => fetch('/api/v1/users/settings').then(res => res.json()),
    });
  },
  
  // Prefetch auth check
  authCheck: async () => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.auth.check(),
      queryFn: () => fetch('/api/v1/auth/check').then(res => res.json()),
    });
  },
};

export default queryClient;
