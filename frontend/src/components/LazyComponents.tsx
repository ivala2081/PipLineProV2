/**
 * Lazy-loaded components for better performance
 * These components are only loaded when needed
 */

import React, { Suspense, lazy } from 'react';
import LoadingSpinner from './LoadingSpinner';

// Lazy load heavy components
export const LazyDashboard = lazy(() => import('./modern/ModernDashboard'));
export const LazyRevenueChart = lazy(() => import('./modern/RevenueChart'));
export const LazyDataTable = lazy(() => import('./modern/DataTable'));
export const LazyGlobalSearch = lazy(() => import('./modern/GlobalSearch'));

// Lazy load forms and modals (only if they exist)
// export const LazyTransactionForm = lazy(() => import('./forms/TransactionForm'));
// export const LazyClientForm = lazy(() => import('./forms/ClientForm'));
// export const LazyPSPForm = lazy(() => import('./forms/PSPForm'));
// export const LazySettingsModal = lazy(() => import('./modals/SettingsModal'));

// Lazy load admin components (only if they exist)
// export const LazyUserManagement = lazy(() => import('./admin/UserManagement'));
// export const LazySystemSettings = lazy(() => import('./admin/SystemSettings'));
// export const LazyAuditLog = lazy(() => import('./admin/AuditLog'));

// Higher-order component for lazy loading with fallback
export const withLazyLoading = <P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = lazy(() => Promise.resolve({ default: Component }));
  
  return (props: P) => (
    <Suspense fallback={fallback || <LoadingSpinner />}>
      <LazyComponent {...(props as any)} />
    </Suspense>
  );
};

// Preload components for better UX
export const preloadComponents = () => {
  // Preload critical components
  import('./modern/ModernDashboard');
  import('./modern/ModernHeader');
  import('./modern/ModernSidebar');
  
  // Preload existing charts
  import('./modern/RevenueChart');
};

// Component that handles lazy loading with error boundaries
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export const LazyWrapper: React.FC<LazyComponentProps> = ({
  children,
  fallback = <LoadingSpinner />,
  errorFallback = <div className="text-center p-4 text-red-500">Failed to load component</div>
}) => {
  return (
    <Suspense fallback={fallback}>
      <ErrorBoundary fallback={errorFallback}>
        {children}
      </ErrorBoundary>
    </Suspense>
  );
};

// Error boundary for lazy components
interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

// Hook for preloading components
export const usePreload = () => {
  const preload = React.useCallback((component: () => Promise<any>) => {
    component();
  }, []);

  return { preload };
};

// Export all lazy components
export default {
  LazyDashboard,
  LazyRevenueChart,
  LazyDataTable,
  LazyGlobalSearch,
  withLazyLoading,
  preloadComponents,
  LazyWrapper
};
