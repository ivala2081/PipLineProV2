import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { ModernDashboard } from '../components/modern/ModernDashboard';
import {
  DollarSign,
  TrendingUp,
  Users,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity,
  Calendar,
  PieChart,
  Eye,
  Download,
  RefreshCw,
  LineChart,
  Building2,
  Globe,
  Clock,
  X,
  User,
  Shield,
  Database,
  Wifi,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Server,
  HardDrive,
  Cpu,
  Network,
  Lock,
  Unlock,
  Activity as ActivityIcon,
  Award,
  Star,
  RefreshCw as RefreshIcon,
  FileText,
  Settings,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useUniqueToast } from '../hooks/useUniqueToast';
import { useAppDispatch, useAppSelector } from '../store';
import { 
  fetchDashboardData, 
  fetchSecondaryData, 
  fetchCommissionAnalytics,
  setActiveTab, 
  setTimeRange,
  setRefreshing,
  clearError 
} from '../store/slices/dashboardSlice';
import { useExchangeRates } from '../hooks/useExchangeRates';
import ExchangeRatesDisplay from '../components/ExchangeRatesDisplay';
import TopPerformersCard from '../components/TopPerformersCard';
import ExchangeRatesWidget from '../components/ExchangeRatesWidget';
import DashboardTabNavigation from '../components/DashboardTabNavigation';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';
import { DashboardSkeleton } from '../components/SkeletonLoader';
import StandardMetricsCard from '../components/StandardMetricsCard';
import MetricCard from '../components/MetricCard';
import { 
  DashboardPageSkeleton, 
  TableSkeleton, 
  ChartSkeleton,
  ProgressiveLoader 
} from '../components/EnhancedSkeletonLoaders';

import {
  PageHeader,
  Section,
  CardGrid,
  GridContainer,
  ContentArea,
  Row,
  Column,
  Divider,
  Spacer
} from '../components/ProfessionalLayout';
import { UnifiedButton } from '../design-system';
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = memo(() => {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  // Early return for loading state - must be done BEFORE calling other hooks
  if (authLoading) {
    return <DashboardPageSkeleton />;
  }
  
  const { showUniqueSuccess, showUniqueError, showUniqueInfo } = useUniqueToast();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  
  // Performance monitoring
  usePerformanceMonitor('Dashboard');
  
  // Redux state
  const {
    dashboardData,
    topPerformers,
    revenueTrends,
    systemPerformance,
    dataQuality,
    integrationStatus,
    securityMetrics,
    volumeAnalysis,
    clientAnalytics,
    commissionAnalytics,
    loading,
    error,
    refreshing,
    timeRange,
    activeTab,
    lastFetchTime
  } = useAppSelector(state => state.dashboard);

  // Debug logging
  console.log('Dashboard State:', {
    loading,
    error,
    refreshing,
    activeTab,
    dashboardData: !!dashboardData,
    topPerformers: !!topPerformers,
    revenueTrends: !!revenueTrends
  });

  // Local state for exchange rates modal
  const [showExchangeRatesModal, setShowExchangeRatesModal] = useState(false);
  
  // PSP Rollover data state
  const [pspRolloverData, setPspRolloverData] = useState<any>(null);
  const [pspRolloverLoading, setPspRolloverLoading] = useState(false);
  
  // Enhanced loading states
  const [loadingStep, setLoadingStep] = useState(0);
  const loadingSteps = [
    'Initializing dashboard...',
    'Loading financial data...',
    'Fetching analytics...',
    'Preparing charts...',
    'Finalizing display...'
  ];

  // Exchange Rates Integration
  const currentDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const { rates, loading: ratesLoading, error: ratesError, refreshRates } = useExchangeRates(currentDate);

  // Show exchange rate notifications
  useEffect(() => {
    if (ratesError && !ratesLoading) {
      showUniqueError('exchange-rates-error', 'Exchange Rate Error', ratesError);
    }
  }, [ratesError, ratesLoading, showUniqueError]);

  useEffect(() => {
    if (rates && Object.keys(rates).length > 0 && !ratesLoading && !ratesError) {
      const rateValues = Object.values(rates);
      if (rateValues.length > 0) {
        const currentRate = rateValues[0];
        const rateAge = new Date().getTime() - new Date(currentRate.updated_at).getTime();
        const ageInMinutes = Math.floor(rateAge / (1000 * 60));
        
        if (ageInMinutes > 30) {
          showUniqueInfo('exchange-rates-stale', 'Exchange Rates Warning', `Currency rates are ${ageInMinutes} minutes old. Consider refreshing.`);
        }
      }
    }
  }, [rates, ratesLoading, ratesError, showUniqueInfo]);

  const CACHE_DURATION = 60000; // 1 minute cache

  // Fetch PSP rollover data
  const fetchPspRolloverData = useCallback(async () => {
    try {
console.log('🔄 Function called at:', new Date().toISOString());
      setPspRolloverLoading(true);
      
      const response = await fetch('/api/v1/analytics/psp-rollover-summary', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
console.log('📡 PSP rollover response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
  if (data.success) {
          setPspRolloverData(data.data);
    console.log('✅ PSP rollover data structure:', JSON.stringify(data.data, null, 2));
          
          // Show success message if we have data
          if (data.data?.psps?.length > 0) {
            showUniqueSuccess('psp-rollover-success', 'PSP Rollover Data Loaded', `Loaded ${data.data.psps.length} PSPs with rollover data`);
          } else {
            showUniqueInfo('psp-rollover-empty', 'No PSP Data', 'No PSP transactions found in the database');
          }
        } else {
          console.error('❌ Failed to fetch PSP rollover data:', data.error);
          showUniqueError('psp-rollover-error', 'API Error', data.error || 'Failed to fetch PSP rollover data');
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to fetch PSP rollover data:', response.statusText);
        console.error('❌ Error response body:', errorText);
        showUniqueError('psp-rollover-error', 'Network Error', `HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching PSP rollover data:', error);
      console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
      showUniqueError('psp-rollover-error', 'Fetch Error', error instanceof Error ? error.message : String(error));
    } finally {
      setPspRolloverLoading(false);
    }
  }, [showUniqueSuccess, showUniqueInfo, showUniqueError]);

  // Memoized handlers
  const handleFetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      const now = Date.now();
      
      // Check if we need to fetch new data
      // Always fetch when timeRange changes, regardless of cache
      if (!forceRefresh && (now - lastFetchTime) < CACHE_DURATION) {
  return;
      }

      // Progressive loading steps
      setLoadingStep(0);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      setLoadingStep(1);
      // Fetch essential data
      await dispatch(fetchDashboardData(timeRange));

      setLoadingStep(2);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setLoadingStep(3);
      // Fetch secondary data in background
      dispatch(fetchSecondaryData(timeRange));
      
      setLoadingStep(4);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Fetch PSP rollover data
      await fetchPspRolloverData();

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  }, [dispatch, timeRange, lastFetchTime, fetchPspRolloverData]);

  const handleRefresh = useCallback(async () => {
    try {
      showUniqueInfo('dashboard-refresh', 'Refreshing Dashboard', 'Loading latest data...');
      dispatch(setRefreshing(true));
      await handleFetchDashboardData(true);
      showUniqueSuccess('dashboard-refresh', 'Dashboard Refreshed', 'All data has been updated successfully');
    } catch (error) {
      showUniqueError('dashboard-refresh', 'Refresh Failed', 'Failed to refresh dashboard data');
    } finally {
      dispatch(setRefreshing(false));
    }
  }, [dispatch, handleFetchDashboardData, showUniqueInfo, showUniqueSuccess, showUniqueError]);

  const handleTabChange = useCallback((tab: 'overview' | 'analytics' | 'performance' | 'monitoring' | 'financial') => {
    dispatch(setActiveTab(tab));
  }, [dispatch]);

  const handleTimeRangeChange = useCallback((range: string) => {
    dispatch(setTimeRange(range));
  }, [dispatch]);

  const handleExchangeRatesRefresh = useCallback(async () => {
    try {
      showUniqueInfo('exchange-rates-refresh', 'Refreshing Exchange Rates', 'Updating currency rates...');
      
      const now = new Date();
      const currentDate = now.getFullYear() + '-' + 
        String(now.getMonth() + 1).padStart(2, '0') + '-' + 
        String(now.getDate()).padStart(2, '0');
      
      const success = await refreshRates({ date: currentDate });
      
      if (success) {
        showUniqueSuccess('exchange-rates-refresh', 'Exchange Rates Updated', 'Currency rates have been successfully refreshed');
      } else {
        showUniqueError('exchange-rates-refresh', 'Refresh Failed', 'Failed to update exchange rates. Please try again.');
      }
    } catch (error) {
      showUniqueError('exchange-rates-refresh', 'Refresh Error', 'An error occurred while refreshing exchange rates');
    }
  }, [refreshRates, showUniqueInfo, showUniqueSuccess, showUniqueError]);

  const handleViewAllRates = useCallback(() => {
    setShowExchangeRatesModal(true);
  }, []);

  const handleCloseRatesModal = useCallback(() => {
    setShowExchangeRatesModal(false);
  }, []);

  // Initial data fetch on component mount
  useEffect(() => {
    console.log('🚀 Dashboard useEffect triggered - fetching data');
    handleFetchDashboardData(true);
    // Fetch PSP rollover data immediately on mount
    console.log('🔄 Calling fetchPspRolloverData from useEffect');
    fetchPspRolloverData();
  }, [handleFetchDashboardData]);

  // Separate useEffect for PSP rollover data
  useEffect(() => {
    console.log('🔄 PSP rollover useEffect triggered');
    fetchPspRolloverData();
  }, []); // Empty dependency array - only run once on mount

  const handleClearError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  // View Details handlers
  const handleViewRevenueDetails = useCallback(() => {
    console.log('Navigating to revenue analytics...');
    navigate('/revenue-analytics');
  }, [navigate]);

  const handleViewVolumeDetails = useCallback(() => {
    console.log('Navigating to analytics...');
    navigate('/analytics');
  }, [navigate]);

  const handleViewClientDetails = useCallback(() => {
    console.log('Navigating to clients...');
    navigate('/clients');
  }, [navigate]);

  const handleViewTransactionDetails = useCallback(() => {
    console.log('Navigating to transactions...');
    navigate('/transactions');
  }, [navigate]);

  // Quick Actions handlers
  const handleQuickAction = useCallback((action: string, path: string) => {
    try {
navigate(path);
    } catch (error) {
      console.error(`Navigation error for ${action}:`, error);
      showUniqueError('navigation-error', 'Navigation Error', `Failed to navigate to ${action}`);
    }
  }, [navigate, showUniqueError]);

  // Memoized utility functions
  const formatCurrency = useCallback((amount: number, currency: string = '₺') => {
    // Map internal currency codes to valid ISO 4217 currency codes
    const CURRENCY_MAP: { [key: string]: string } = {
      '₺': 'TRY',  // Turkish Lira symbol -> ISO code
      '$': 'USD',  // US Dollar symbol
      '€': 'EUR',  // Euro symbol  
      '£': 'GBP',  // British Pound symbol
      // Legacy support
      'TL': 'TRY', // Turkish Lira legacy -> ISO code
      'TRY': 'TRY', // Already correct
      'USD': 'USD',
      'EUR': 'EUR',
      'GBP': 'GBP',
    };
    
    const validCurrency = CURRENCY_MAP[currency] || currency;
    
    try {
      // Use ISO code for validation but show preferred symbol
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
      
      // Replace currency codes with preferred symbols [[memory:5971629]]
      return formatted
        .replace(/TRY/g, '₺')
        .replace(/USD/g, '$')
        .replace(/EUR/g, '€')
        .replace(/GBP/g, '£');
    } catch (error) {
      // Fallback formatting if currency code is invalid
      console.warn(`Invalid currency code: ${currency}, using fallback formatting`);
      return `${currency}${amount.toLocaleString()}`;
    }
  }, []);

  const formatNumber = useCallback((num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  }, []);

  // Memoized top performers data
  const topPerformersData = useMemo(() => {
    if (!topPerformers) return null;
    
    return {
      volumeLeaders: {
        title: t('dashboard.top_5_by_volume'),
        description: t('dashboard.highest_deposit_volume'),
        data: topPerformers.volume_leaders,
        icon: <BarChart3 className='h-4 w-4 text-white' />,
        iconBgColor: 'bg-gray-600',
        showVolume: true
      },
      countLeaders: {
        title: t('dashboard.top_5_by_count'),
        description: t('dashboard.most_active_transaction'),
        data: topPerformers.count_leaders,
        icon: <Activity className='h-4 w-4 text-white' />,
        iconBgColor: 'bg-green-600',
        showVolume: false
      }
    };
  }, [topPerformers, t]);

  // Main data fetching effect - only run when authentication changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      handleFetchDashboardData();
    }
  }, [isAuthenticated, authLoading, handleFetchDashboardData]);

  // Fetch commission analytics data
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      dispatch(fetchCommissionAnalytics(timeRange));
    }
  }, [isAuthenticated, authLoading, timeRange, dispatch]);

  // Refresh dashboard data when time range changes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      handleFetchDashboardData();
    }
  }, [timeRange, isAuthenticated, authLoading, handleFetchDashboardData]);

  // Listen for transaction updates to automatically refresh dashboard data
  useEffect(() => {
    const handleTransactionsUpdate = (event: any) => {
// Refresh dashboard data when transactions are updated
      if (isAuthenticated && !authLoading) {
  handleFetchDashboardData();
      }
    };

    // Add event listener
    window.addEventListener('transactionsUpdated', handleTransactionsUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdate);
    };
  }, [isAuthenticated, authLoading, handleFetchDashboardData]);

  // Auto-refresh exchange rates every 15 minutes
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const interval = setInterval(() => {
        const currentDate = new Date().toISOString().slice(0, 10);
        refreshRates({ date: currentDate });
      }, 900000);
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isAuthenticated, authLoading, refreshRates]);

  return (
    <ContentArea spacing="xl">
      {/* TEST BOX - Should always be visible */}
      <div style={{backgroundColor: 'yellow', color: 'black', padding: '20px', margin: '20px 0', fontSize: '18px', fontWeight: 'bold'}}>
        🧪 DASHBOARD COMPONENT IS RENDERING - If you see this, the component is working!
      </div>
      
      {/* Debug Message - Always visible for debugging */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Dashboard Debug:</h4>
        <p className="text-sm text-blue-700">
          Dashboard is rendering! Active tab: {activeTab}, Loading: {loading ? 'Yes' : 'No'}, 
          Error: {error || 'None'}, Authenticated: {isAuthenticated ? 'Yes' : 'No'}, 
          Has Dashboard Data: {dashboardData ? 'Yes' : 'No'}, NODE_ENV: {process.env.NODE_ENV}
        </p>
      </div>
      
      {/* Enhanced Page Header */}
      <PageHeader
        title={t('dashboard.title')}
        subtitle={t('dashboard.description')}
        actions={
          <div className='flex items-center gap-3'>
            <UnifiedButton
              onClick={handleRefresh}
              disabled={refreshing}
              variant="secondary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? t('common.refreshing') : t('common.refresh')}
            </UnifiedButton>
          </div>
        }
      />

      {/* Tab Navigation */}
      <DashboardTabNavigation 
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Progressive Loading State */}
      {refreshing && (
        <Section>
          <ProgressiveLoader 
            steps={loadingSteps}
            currentStep={loadingStep}
          />
        </Section>
      )}

      {/* Error State */}
      {error && (
        <Section>
          <div className='bg-red-50 border border-red-200 rounded-xl p-6'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-red-100 rounded-full flex items-center justify-center'>
                <X className='h-5 w-5 text-red-600' />
              </div>
              <div>
                <h3 className='text-lg font-semibold text-red-800'>Error Loading Dashboard</h3>
                <p className='text-red-700 mt-1'>{error}</p>
              </div>
              <UnifiedButton
                onClick={handleClearError}
                variant="ghost"
                size="sm"
                className='ml-auto text-red-400 hover:text-red-600'
              >
                <X className='h-5 w-5' />
              </UnifiedButton>
            </div>
          </div>
        </Section>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <ContentArea>
          {/* TEST BOX - Should always be visible */}
          <div style={{backgroundColor: 'purple', color: 'white', padding: '20px', margin: '20px 0', fontSize: '18px', fontWeight: 'bold'}}>
            🧪 OVERVIEW TAB IS RENDERING - If you see this, the tab is working!
          </div>
          {/* Enhanced Stats Cards */}
          {dashboardData && (
            <Section title="Key Metrics" subtitle="Business overview" spacing="lg">
              <CardGrid cols={4} gap="lg">
                <MetricCard
                  title={t('dashboard.net_cash')}
                  value={formatCurrency(dashboardData.summary.total_net, '₺')}
                  icon={DollarSign}
                  color="gray"
                  subtitle="All time net cash"
                />
                
                <MetricCard
                  title={t('dashboard.total_transactions')}
                  value={formatNumber(dashboardData.summary.transaction_count)}
                  icon={CreditCard}
                  color="green"
                  subtitle="Total transactions"
                />
                
                <MetricCard
                  title={t('dashboard.active_clients')}
                  value={formatNumber(dashboardData.summary.active_clients)}
                  icon={Users}
                  color="purple"
                  subtitle="Active clients"
                />
                
                <MetricCard
                  title={t('dashboard.total_commissions')}
                  value={formatCurrency(dashboardData.summary.total_commission, '₺')}
                  icon={TrendingUp}
                  color="teal"
                  subtitle="Commission earned"
                />
              </CardGrid>
            </Section>
          )}

          {/* Revenue Analytics */}
          <Section title="Revenue Analytics" subtitle="Company revenue breakdown by time period" spacing="lg">
            {/* Debug Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 className="font-semibold text-yellow-800 mb-2">Debug Info:</h4>
                <pre className="text-xs text-yellow-700 overflow-auto max-h-40">
                  {JSON.stringify({
                    loading: loading,
                    error: error,
                    refreshing: refreshing,
                    dashboardData_exists: !!dashboardData,
                    dashboardData_keys: dashboardData ? Object.keys(dashboardData) : [],
                    summary_exists: !!dashboardData?.summary,
                    summary_keys: dashboardData?.summary ? Object.keys(dashboardData.summary) : [],
                    daily_revenue: (dashboardData?.summary as any)?.daily_revenue,
                    weekly_revenue: (dashboardData?.summary as any)?.weekly_revenue,
                    monthly_revenue: (dashboardData?.summary as any)?.monthly_revenue,
                    annual_revenue: (dashboardData?.summary as any)?.annual_revenue,
                    has_revenue_trends: !!(dashboardData as any)?.revenue_trends,
                    revenue_trends_length: (dashboardData as any)?.revenue_trends?.length || 0,
                    topPerformers_exists: !!topPerformers,
                    topPerformersData_exists: !!topPerformersData,
                    rates_exists: !!rates,
                    rates_keys: rates ? Object.keys(rates) : [],
                    pspRolloverData_exists: !!pspRolloverData
                  }, null, 2)}
                </pre>
              </div>
            )}
            <CardGrid cols={4} gap="lg">
              <MetricCard
                title="Daily Revenue"
                value={formatCurrency((dashboardData?.summary as any)?.daily_revenue || 0, '₺')}
                icon={Calendar}
                color="indigo"
                subtitle="Today's revenue"
              />
              
              <MetricCard
                title="Weekly Revenue"
                value={formatCurrency((dashboardData?.summary as any)?.weekly_revenue || 0, '₺')}
                icon={TrendingUp}
                color="green"
                subtitle="This week's revenue"
              />
              
              <MetricCard
                title="Monthly Revenue"
                value={formatCurrency((dashboardData?.summary as any)?.monthly_revenue || 0, '₺')}
                icon={BarChart3}
                color="purple"
                subtitle="This month's revenue"
              />
              
              <MetricCard
                title="Annual Revenue"
                value={formatCurrency((dashboardData?.summary as any)?.annual_revenue || 0, '₺')}
                icon={DollarSign}
                color="orange"
                subtitle="This year's revenue"
              />
            </CardGrid>
            
            {/* Revenue Trend Chart */}
            <div className="mt-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Revenue Trend</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <TrendingUp className="h-4 w-4" />
                    <span>Last 30 days</span>
                  </div>
                </div>
                <div className="h-64">
                  {(dashboardData as any)?.revenue_trends && (dashboardData as any).revenue_trends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart data={(dashboardData as any).revenue_trends}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="date" 
                          stroke="#6b7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          stroke="#6b7280"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => `₺${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                          }}
                          formatter={(value: any) => [formatCurrency(value, '₺'), 'Revenue']}
                          labelFormatter={(label) => `Date: ${label}`}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <div className="text-center">
                        <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No revenue data available</p>
                        <p className="text-sm text-gray-400 mt-2">Revenue trends will appear here once data is available</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Section>

          {/* Quick Actions */}
          <div style={{backgroundColor: 'red', color: 'white', padding: '20px', margin: '20px 0'}}>
            <h2>🔧 QUICK ACTIONS SECTION - SHOULD BE VISIBLE</h2>
            <p>If you can see this red box, the section is rendering but might be hidden by CSS.</p>
          </div>
          <Section title="Quick Actions" subtitle="Common tasks and shortcuts" spacing="lg">
            <CardGrid cols={4} gap="lg">
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-200 transition-colors"
                onClick={() => handleQuickAction('Add Transaction', '/transactions/add')}
              >
                <CreditCard className="h-6 w-6 text-gray-600" />
                <span className="text-sm font-medium">Add Transaction</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-200 transition-colors"
                onClick={() => handleQuickAction('Manage Clients', '/clients')}
              >
                <Users className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium">Manage Clients</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                onClick={() => handleQuickAction('View Analytics', '/analytics')}
              >
                <BarChart3 className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium">View Analytics</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-200 transition-colors"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`h-6 w-6 text-orange-600 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
              </UnifiedButton>
            </CardGrid>
            
            {/* Additional Quick Actions Row */}
            <CardGrid cols={4} gap="lg" className="mt-4">
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                onClick={() => handleQuickAction('View Transactions', '/transactions')}
              >
                <FileText className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-medium">View Transactions</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-teal-50 hover:border-teal-200 transition-colors"
                onClick={() => handleQuickAction('Generate Reports', '/reports')}
              >
                <PieChart className="h-6 w-6 text-teal-600" />
                <span className="text-sm font-medium">Generate Reports</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                onClick={() => handleQuickAction('Settings', '/settings')}
              >
                <Settings className="h-6 w-6 text-rose-600" />
                <span className="text-sm font-medium">Settings</span>
              </UnifiedButton>
              
              <UnifiedButton
                variant="outline"
                className="h-24 flex flex-col items-center justify-center gap-2 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                onClick={() => handleQuickAction('System Monitor', '/system-monitor')}
              >
                <Activity className="h-6 w-6 text-amber-600" />
                <span className="text-sm font-medium">System Monitor</span>
              </UnifiedButton>
            </CardGrid>
          </Section>

          {/* Exchange Rates Widget */}
          <div style={{backgroundColor: 'blue', color: 'white', padding: '20px', margin: '20px 0'}}>
            <h2>💱 EXCHANGE RATES WIDGET - SHOULD BE VISIBLE</h2>
            <p>If you can see this blue box, the section is rendering but might be hidden by CSS.</p>
          </div>
          <Section title="Exchange Rates" subtitle="Current rates" spacing="lg">
            <ExchangeRatesWidget
              rates={rates}
              loading={ratesLoading}
              error={ratesError}
              onRefresh={handleExchangeRatesRefresh}
              onViewAll={handleViewAllRates}
              formatCurrency={formatCurrency}
            />
          </Section>

          {/* Top Performers */}
          <div style={{backgroundColor: 'green', color: 'white', padding: '20px', margin: '20px 0'}}>
            <h2>🏆 TOP PERFORMERS SECTION - SHOULD BE VISIBLE</h2>
            <p>If you can see this green box, the section is rendering but might be hidden by CSS.</p>
          </div>
          <Section title="Top Performers" subtitle="Best performers" spacing="lg">
            {topPerformersData ? (
              <CardGrid cols={2} gap="lg">
                <TopPerformersCard
                  {...topPerformersData.volumeLeaders}
                  formatCurrency={formatCurrency}
                />
                <TopPerformersCard
                  {...topPerformersData.countLeaders}
                  formatCurrency={formatCurrency}
                />
              </CardGrid>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Loading top performers...</p>
                <p className="text-sm text-gray-400 mt-2">Please wait while we fetch the latest data</p>
              </div>
            )}
          </Section>

          {/* PSP Rollover Cards */}
          <div style={{backgroundColor: 'orange', color: 'white', padding: '20px', margin: '20px 0'}}>
            <h2>🔄 PSP ROLLOVER STATUS SECTION - SHOULD BE VISIBLE</h2>
            <p>If you can see this orange box, the section is rendering but might be hidden by CSS.</p>
          </div>
          <Section title="PSP Rollover Status" subtitle="Individual PSP rollover amounts and status" spacing="lg">
            <div className='flex items-center justify-between mb-6'>
              <div className="flex items-center gap-2">
                <UnifiedButton
                  variant="outline"
                  size="sm"
                  onClick={fetchPspRolloverData}
                  disabled={pspRolloverLoading}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${pspRolloverLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </UnifiedButton>
                {pspRolloverData?.psps?.length > 0 && (
                  <span className="text-xs text-green-600 font-medium">
                    ✓ {pspRolloverData.psps.length} PSPs loaded
                  </span>
                )}
              </div>
            </div>

            {/* Debug Information */}
            <div className='mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
              <h4 className='font-medium text-yellow-800 mb-2'>Debug Info:</h4>
              <p className='text-sm text-yellow-700'>Loading: {pspRolloverLoading ? 'Yes' : 'No'}</p>
              <p className='text-sm text-yellow-700'>Data exists: {pspRolloverData ? 'Yes' : 'No'}</p>
              <p className='text-sm text-yellow-700'>PSPs count: {pspRolloverData?.psps?.length || 0}</p>
              <p className='text-sm text-yellow-700'>Raw data: {JSON.stringify(pspRolloverData, null, 2)}</p>
            </div>

            {pspRolloverLoading ? (
              <div className='text-center py-12 text-gray-500'>
                <RefreshCw className='h-12 w-12 mx-auto mb-4 text-gray-300 animate-spin' />
                <p className='text-lg'>Loading PSP rollover data...</p>
                <p className='text-sm text-gray-400 mt-2'>Please wait while we fetch the latest data</p>
              </div>
            ) : pspRolloverData?.psps?.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {pspRolloverData.psps.map((psp: any, index: number) => {
                  const isPositive = psp.total_rollover > 0;
                  const isNegative = psp.total_rollover < 0;
                  const isZero = psp.total_rollover === 0;
                  
                  return (
                    <div 
                      key={psp.psp} 
                      className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all duration-200 ${
                        isPositive ? 'border-red-200 hover:border-red-300' : 
                        isNegative ? 'border-green-200 hover:border-green-300' : 
                        'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPositive ? 'bg-red-100' : isNegative ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              isPositive ? 'text-red-700' : isNegative ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900 text-lg'>{psp.psp || 'Unknown PSP'}</h3>
                            <p className='text-sm text-gray-500'>{psp.transaction_count} transactions</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className='space-y-3'>
                        <div className='text-center'>
                          <div className={`text-2xl font-bold mb-1 ${
                            isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {formatCurrency(psp.total_rollover, '₺')}
                          </div>
                          <p className={`text-sm font-medium ${
                            isPositive ? 'text-red-700' : isNegative ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {isPositive ? 'Amount Owed' : isNegative ? 'Credit Balance' : 'Settled'}
                          </p>
                        </div>
                        
                        <div className='pt-3 border-t border-gray-100'>
                          <div className='grid grid-cols-2 gap-4 text-xs'>
                            <div>
                              <p className='text-gray-500'>Net Amount</p>
                              <p className='font-medium text-gray-900'>{formatCurrency(psp.total_net, '₺')}</p>
                            </div>
                            <div>
                              <p className='text-gray-500'>Allocated</p>
                              <p className='font-medium text-gray-900'>{formatCurrency(psp.total_allocations, '₺')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : pspRolloverData?.psps?.length > 0 ? (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'>
                {pspRolloverData.psps.slice(0, 8).map((psp: any, index: number) => {
                  const isPositive = psp.total_rollover > 0;
                  const isNegative = psp.total_rollover < 0;
                  const isZero = psp.total_rollover === 0;
                  
                  return (
                    <div 
                      key={psp.psp} 
                      className={`bg-white rounded-xl shadow-sm border-2 p-6 hover:shadow-md transition-all duration-200 ${
                        isPositive ? 'border-red-200 hover:border-red-300' : 
                        isNegative ? 'border-green-200 hover:border-green-300' : 
                        'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className='flex items-start justify-between mb-4'>
                        <div className='flex items-center gap-3'>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPositive ? 'bg-red-100' : isNegative ? 'bg-green-100' : 'bg-gray-100'
                          }`}>
                            <span className={`text-sm font-bold ${
                              isPositive ? 'text-red-700' : isNegative ? 'text-green-700' : 'text-gray-700'
                            }`}>
                              {index + 1}
                            </span>
                          </div>
                          <div>
                            <h3 className='font-semibold text-gray-900 text-lg'>{psp.psp || 'Unknown PSP'}</h3>
                            <p className='text-sm text-gray-500'>{psp.transaction_count} transactions</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className='space-y-3'>
                        <div className='text-center'>
                          <div className={`text-2xl font-bold mb-1 ${
                            isPositive ? 'text-red-600' : isNegative ? 'text-green-600' : 'text-gray-600'
                          }`}>
                            {formatCurrency(psp.total_rollover, '₺')}
                          </div>
                          <p className={`text-sm font-medium ${
                            isPositive ? 'text-red-700' : isNegative ? 'text-green-700' : 'text-gray-700'
                          }`}>
                            {isPositive ? 'Amount Owed' : isNegative ? 'Credit Balance' : 'Settled'}
                          </p>
                        </div>
                        
                        <div className='pt-3 border-t border-gray-100'>
                          <div className='grid grid-cols-2 gap-4 text-xs'>
                            <div>
                              <p className='text-gray-500'>Net Amount</p>
                              <p className='font-medium text-gray-900'>{formatCurrency(psp.total_net, '₺')}</p>
                            </div>
                            <div>
                              <p className='text-gray-500'>Allocated</p>
                              <p className='font-medium text-gray-900'>{formatCurrency(psp.total_allocations, '₺')}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className='text-center py-12 text-gray-500'>
                <CreditCard className='h-16 w-16 mx-auto mb-4 text-gray-300' />
                <p className='text-lg font-medium'>No PSP rollover data available</p>
                <p className='text-sm text-gray-400 mt-2'>Loading PSP data or no transactions found</p>
                <div className='mt-4'>
                  <UnifiedButton
                    variant="outline"
                    size="sm"
                    onClick={fetchPspRolloverData}
                    disabled={pspRolloverLoading}
                    className="flex items-center gap-2 mx-auto"
                  >
                    <RefreshCw className={`h-4 w-4 ${pspRolloverLoading ? 'animate-spin' : ''}`} />
                    {pspRolloverLoading ? 'Loading...' : 'Retry'}
                  </UnifiedButton>
                </div>
              </div>
            )}
          </Section>
        </ContentArea>
      )}

      {/* Analytics Tab Content */}
      {activeTab === 'analytics' && (
        <ContentArea>
          {/* Revenue Trends Chart */}
          {revenueTrends && (
            <Section title="Revenue Trends" subtitle="Performance over time" spacing="lg">
              <div className='business-chart'>
                <div className='business-chart-header'>
                  <div>
                    <h3 className='business-chart-title'>Revenue Trends</h3>
                    <p className='business-chart-subtitle'>Revenue performance over time</p>
                  </div>
                  <div className='business-chart-actions'>
                    <UnifiedButton 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRefresh()}
                      disabled={refreshing}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </UnifiedButton>
                    <UnifiedButton 
                      variant="outline" 
                      size="sm"
                      onClick={handleViewRevenueDetails}
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      View Details
                    </UnifiedButton>
                  </div>
                </div>
                <div className='h-80'>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart data={revenueTrends.data.daily_revenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} tickFormatter={(value) => formatCurrency(value, '₺')} />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-4 min-w-[200px]">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <span className="font-semibold text-slate-900">
                                      {new Date(label).toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                  
                                  <div className="border-t border-slate-100 pt-2 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-600">Net Revenue:</span>
                                      <span className={`font-semibold ${data.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {formatCurrency(data.amount || 0, '₺')}
                                      </span>
                                    </div>
                                    
                                    {data.deposits !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Deposits:</span>
                                        <span className="text-sm font-medium text-green-600">
                                          +{formatCurrency(data.deposits, '₺')}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {data.withdrawals !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Withdrawals:</span>
                                        <span className="text-sm font-medium text-red-600">
                                          -{formatCurrency(data.withdrawals, '₺')}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {data.transaction_count !== undefined && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-sm text-slate-600">Transactions:</span>
                                        <span className="text-sm font-medium text-slate-700">
                                          {data.transaction_count}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#3b82f6" 
                        strokeWidth={3}
                        dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
                <div className='business-chart-legend'>
                  <div className='business-chart-legend-item'>
                    <div className='business-chart-legend-color bg-gray-500'></div>
                    <span className='business-chart-legend-label'>Net Revenue</span>
                    <span className='business-chart-legend-value'>₺{revenueTrends.data.metrics.total_revenue?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* Client Analytics */}
          {clientAnalytics && (
            <Section title="Client Analytics" subtitle="Client performance and commission analysis" spacing="lg">
              <CardGrid cols={2} gap="lg">
                <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
                  <h3 className='text-lg font-semibold text-gray-900 mb-4'>Top Clients by Volume</h3>
                  <div className='space-y-3'>
                    {clientAnalytics.data.client_analytics?.slice(0, 5).map((client: any, index: number) => (
                      <div key={client.client_name} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center'>
                            <span className='text-sm font-medium text-gray-700'>{index + 1}</span>
                          </div>
                          <div>
                            <p className='font-medium text-gray-900'>{client.client_name}</p>
                            <p className='text-sm text-gray-500'>{client.transaction_count} transactions</p>
                          </div>
                        </div>
                        <span className='font-semibold text-gray-900'>{formatCurrency(client.total_volume, '₺')}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
                  <h3 className='text-lg font-semibold text-gray-900 mb-4'>PSP Performance Analysis</h3>
                  <div className='space-y-3'>
                    {commissionAnalytics?.data.psp_commission?.slice(0, 5).map((psp: any, index: number) => (
                      <div key={psp.psp} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'>
                        <div className='flex items-center gap-3'>
                          <div className='w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
                            <span className='text-sm font-medium text-green-700'>{index + 1}</span>
                          </div>
                          <div>
                            <p className='font-medium text-gray-900'>{psp.psp || 'Unknown PSP'}</p>
                            <p className='text-sm text-gray-500'>{psp.transaction_count} transactions</p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <span className='font-semibold text-gray-900'>{formatCurrency(psp.total_volume, '₺')}</span>
                          <p className='text-xs text-gray-500'>{psp.commission_rate?.toFixed(2)}% rate</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardGrid>
            </Section>
          )}
        </ContentArea>
      )}

      {/* Performance Tab Content */}
      {activeTab === 'performance' && (
        <ContentArea>
          {/* System Performance Metrics */}
          {systemPerformance && (
            <Section title="System Performance" subtitle="Real-time monitoring" spacing="lg">
              <CardGrid cols={3} gap="lg">
                <MetricCard
                  title="CPU Usage"
                  value={`${systemPerformance.cpu_usage?.toFixed(1)}%`}
                  subtitle="System performance"
                  icon={Server}
                  color="gray"
                />
                
                <MetricCard
                  title="Memory Usage"
                  value={`${systemPerformance.memory_usage?.toFixed(1)}%`}
                  subtitle="RAM utilization"
                  icon={HardDrive}
                  color="green"
                />
                
                <MetricCard
                  title="System Health"
                  value={systemPerformance.system_health === 'healthy' ? 'Healthy' : systemPerformance.system_health === 'warning' ? 'Warning' : 'Critical'}
                  subtitle="Overall status"
                  icon={Network}
                  color={systemPerformance.system_health === 'healthy' ? 'green' : systemPerformance.system_health === 'warning' ? 'orange' : 'red'}
                />
              </CardGrid>
            </Section>
          )}

          {/* Data Quality Metrics */}
          {dataQuality && (
            <Section title="Data Quality Metrics" subtitle="Comprehensive data quality assessment" spacing="lg">
              <CardGrid cols={4} gap="lg">
                <MetricCard
                  title="Client Completeness"
                  value={`${dataQuality.client_completeness?.toFixed(1)}%`}
                  icon={Users}
                  color="gray"
                  subtitle="Data completeness"
                />
                
                <MetricCard
                  title="Amount Completeness"
                  value={`${dataQuality.amount_completeness?.toFixed(1)}%`}
                  icon={DollarSign}
                  color="green"
                  subtitle="Financial data"
                />
                
                <MetricCard
                  title="Date Completeness"
                  value={`${dataQuality.date_completeness?.toFixed(1)}%`}
                  icon={Calendar}
                  color="purple"
                  subtitle="Date accuracy"
                />
                
                <MetricCard
                  title="Overall Score"
                  value={`${dataQuality.overall_quality_score?.toFixed(1)}%`}
                  icon={Award}
                  color="orange"
                  subtitle="Quality rating"
                />
              </CardGrid>
            </Section>
          )}
        </ContentArea>
      )}

      {/* Monitoring Tab Content */}
      {activeTab === 'monitoring' && (
        <ContentArea>
          {/* Security Metrics */}
          {securityMetrics && (
            <Section title="Security & Monitoring" subtitle="System security and integration status" spacing="lg">
              <CardGrid cols={2} gap="lg">
                {/* Security Status */}
                <MetricCard
                  title="Security Status"
                  value={securityMetrics.failed_logins.today}
                  subtitle={`${securityMetrics.suspicious_activities.total_alerts} alerts, ${securityMetrics.session_management.active_sessions} sessions`}
                  icon={Shield}
                  color="red"
                />

                {/* Integration Status */}
                <MetricCard
                  title="Integration Status"
                  value={integrationStatus ? (integrationStatus.bank_connections.status === 'connected' && integrationStatus.psp_connections.status === 'connected' ? 'All Connected' : 'Issues Detected') : 'Unknown'}
                  subtitle={integrationStatus ? `Bank: ${integrationStatus.bank_connections.status}, PSP: ${integrationStatus.psp_connections.status}` : 'Status unavailable'}
                  icon={ActivityIcon}
                  color={integrationStatus && integrationStatus.bank_connections.status === 'connected' && integrationStatus.psp_connections.status === 'connected' ? 'green' : 'orange'}
                />
              </CardGrid>
            </Section>
          )}

          {/* Volume Analysis */}
          {volumeAnalysis && (
            <Section title="Transaction Volume Analysis" subtitle="Daily transaction volume trends" spacing="lg">
              <div className='business-chart'>
                <div className='business-chart-header'>
                  <div>
                    <h3 className='business-chart-title'>Transaction Volume Analysis</h3>
                    <p className='business-chart-subtitle'>Daily transaction volume trends</p>
                  </div>
                  <div className='business-chart-actions'>
                    <UnifiedButton 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleRefresh()}
                      disabled={refreshing}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                      {refreshing ? 'Refreshing...' : 'Refresh'}
                    </UnifiedButton>
                    <UnifiedButton 
                      variant="outline" 
                      size="sm"
                      onClick={handleViewVolumeDetails}
                    >
                      <Eye className='w-4 h-4 mr-2' />
                      View Details
                    </UnifiedButton>
                  </div>
                </div>
                <div className='h-80'>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={volumeAnalysis.data.daily_volume} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <defs>
                        <linearGradient id="volumeBarGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                          <stop offset="25%" stopColor="#34D399" stopOpacity={0.95} />
                          <stop offset="50%" stopColor="#6EE7B7" stopOpacity={0.9} />
                          <stop offset="75%" stopColor="#A7F3D0" stopOpacity={0.85} />
                          <stop offset="100%" stopColor="#D1FAE5" stopOpacity={0.8} />
                        </linearGradient>
                        <filter id="volumeBarShadow" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#10B981" floodOpacity="0.15"/>
                        </filter>
                      </defs>
        <CartesianGrid 
          strokeDasharray="1 3" 
          stroke="#f1f5f9" 
          strokeWidth={1}
          vertical={false}
          opacity={0.8}
        />
                      <XAxis 
                        dataKey="day" 
                        stroke="#475569" 
                        fontSize={12}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                        tick={{ fill: '#475569' }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        stroke="#475569" 
                        fontSize={12}
                        fontWeight={600}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                        tick={{ fill: '#475569' }}
                        tickFormatter={(value) => formatCurrency(value, '₺')} 
                        width={80}
                      />
                      <Tooltip 
                        content={({ active, payload, label }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            // Parse the date properly - it might be in YYYY-MM-DD format
                            const dateStr = data.day;
                            const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
                            
                            return (
                              <div className="bg-white border border-slate-200 rounded-xl shadow-xl p-4 min-w-[200px] backdrop-blur-sm">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-slate-500" />
                                    <span className="font-semibold text-slate-900">
                                      {date.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        year: 'numeric', 
                                        month: 'long', 
                                        day: 'numeric' 
                                      })}
                                    </span>
                                  </div>
                                  
                                  <div className="border-t border-slate-100 pt-2 space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-600">Volume:</span>
                                      <span className="font-semibold text-green-600">
                                        {formatCurrency(data.volume || 0, '₺')}
                                      </span>
                                    </div>
                                    
                                    <div className="flex justify-between items-center">
                                      <span className="text-sm text-slate-600">Transactions:</span>
                                      <span className="text-sm font-medium text-slate-700">
                                        {data.transaction_count || 0}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                        cursor={{ fill: 'rgba(16, 185, 129, 0.05)' }}
                      />
                      <Bar 
                        dataKey="volume" 
                        fill="url(#volumeBarGradient)" 
                        radius={[6, 6, 0, 0]}
                        stroke="none"
                        filter="url(#volumeBarShadow)"
                        style={{
                          filter: 'drop-shadow(0 4px 8px rgba(16, 185, 129, 0.15))',
                        }}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className='business-chart-legend'>
                  <div className='business-chart-legend-item'>
                    <div className='business-chart-legend-color bg-green-500'></div>
                    <span className='business-chart-legend-label'>Volume</span>
                    <span className='business-chart-legend-value'>₺{volumeAnalysis.data.insights.total_volume?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </Section>
          )}

          {/* System Activity */}
          <Section title="System Activity" subtitle="Real-time system monitoring and activity logs" spacing="lg">
            <CardGrid cols={2} gap="lg">
              <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>Recent Activity</h3>
                <div className='space-y-3'>
                  <div className='flex items-center gap-3 p-3 bg-green-50 rounded-lg'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>System Health Check</p>
                      <p className='text-xs text-gray-500'>2 minutes ago</p>
                    </div>
                    <span className='text-xs text-green-600 font-medium'>Success</span>
                  </div>
                  
                  <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                    <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>Data Sync Completed</p>
                      <p className='text-xs text-gray-500'>5 minutes ago</p>
                    </div>
                    <span className='text-xs text-gray-600 font-medium'>Info</span>
                  </div>
                  
                  <div className='flex items-center gap-3 p-3 bg-yellow-50 rounded-lg'>
                    <div className='w-2 h-2 bg-yellow-500 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>Exchange Rate Updated</p>
                      <p className='text-xs text-gray-500'>10 minutes ago</p>
                    </div>
                    <span className='text-xs text-yellow-600 font-medium'>Warning</span>
                  </div>
                  
                  <div className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg'>
                    <div className='w-2 h-2 bg-gray-400 rounded-full'></div>
                    <div className='flex-1'>
                      <p className='text-sm font-medium text-gray-900'>Backup Process Started</p>
                      <p className='text-xs text-gray-500'>15 minutes ago</p>
                    </div>
                    <span className='text-xs text-gray-600 font-medium'>Processing</span>
                  </div>
                </div>
              </div>
              
              <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
                <h3 className='text-lg font-semibold text-gray-900 mb-4'>System Status</h3>
                <div className='space-y-4'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Server className='h-5 w-5 text-green-600' />
                      <span className='text-sm font-medium text-gray-900'>API Server</span>
                    </div>
                    <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>Online</span>
                  </div>
                  
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Database className='h-5 w-5 text-green-600' />
                      <span className='text-sm font-medium text-gray-900'>Database</span>
                    </div>
                    <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>Connected</span>
                  </div>
                  
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Wifi className='h-5 w-5 text-green-600' />
                      <span className='text-sm font-medium text-gray-900'>Network</span>
                    </div>
                    <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>Stable</span>
                  </div>
                  
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Shield className='h-5 w-5 text-green-600' />
                      <span className='text-sm font-medium text-gray-900'>Security</span>
                    </div>
                    <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full'>Secure</span>
                  </div>
                  
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Activity className='h-5 w-5 text-gray-600' />
                      <span className='text-sm font-medium text-gray-900'>Performance</span>
                    </div>
                    <span className='text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded-full'>Good</span>
                  </div>
                </div>
              </div>
            </CardGrid>
          </Section>
        </ContentArea>
      )}

      {/* Financial Analytics Tab Content */}
      {activeTab === 'financial' && (
        <ContentArea>
          {/* Financial Summary */}
          {dashboardData && (
            <Section title={t('dashboard.financial_overview')} subtitle={t('dashboard.comprehensive_financial_metrics')} spacing="lg">
              <CardGrid cols={4} gap="lg">
                {/* Net Cash */}
                <MetricCard
                  title={t('dashboard.net_cash')}
                  value={formatCurrency(dashboardData.summary.total_net, '₺')}
                  subtitle={t('dashboard.all_time')}
                  icon={TrendingUp}
                  color="green"
                />

                {/* Total Commission */}
                <MetricCard
                  title={t('dashboard.total_commission')}
                  value={formatCurrency(dashboardData.summary.total_commission, '₺')}
                  subtitle={t('dashboard.earned')}
                  icon={DollarSign}
                  color="gray"
                />

                {/* Active Clients */}
                <MetricCard
                  title={t('dashboard.active_clients')}
                  value={dashboardData.summary.active_clients}
                  subtitle={t('dashboard.this_month')}
                  icon={Users}
                  color="purple"
                />

                {/* Total Transactions */}
                <MetricCard
                  title={t('dashboard.total_transactions')}
                  value={formatNumber(dashboardData.summary.transaction_count)}
                  subtitle={t('dashboard.all_time')}
                  icon={CreditCard}
                  color="orange"
                />
              </CardGrid>
            </Section>
          )}

          {/* Commission Analysis Chart */}
          {commissionAnalytics && (
            <Section title="PSP Performance Analysis" subtitle="Payment Service Provider volume and commission analysis" spacing="lg">
              <div className='bg-white rounded-2xl shadow-sm border border-gray-200 p-6'>
                <div className='flex items-center justify-between mb-4'>
                  <h3 className='text-lg font-semibold text-gray-900'>PSP Volume Distribution</h3>
                  <UnifiedButton 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleRefresh()}
                    disabled={refreshing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </UnifiedButton>
                </div>
                <div className='h-80'>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={commissionAnalytics.data.psp_commission?.map((item: any, index: number) => ({
                          name: item.psp || 'Unknown PSP',
                          value: item.total_volume,
                          fill: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {commissionAnalytics.data.psp_commission?.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatCurrency(value, '₺'), 'Commission']} />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Section>
          )}
        </ContentArea>
      )}

      {/* Loading State */}
      {loading && !dashboardData && <DashboardSkeleton />}

      {/* Exchange Rates Modal */}
      {showExchangeRatesModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden'>
            <div className='flex items-center justify-between p-6 border-b border-gray-200'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-sm'>
                  <Globe className='h-5 w-5 text-white' />
                </div>
                <div>
                  <h2 className='text-2xl font-bold text-gray-900'>Exchange Rates Management</h2>
                  <p className='text-sm text-gray-600'>View and manage all currency exchange rates</p>
                </div>
              </div>
              <UnifiedButton
                onClick={handleCloseRatesModal}
                variant="ghost"
                size="sm"
                className='p-2 text-gray-400 hover:text-gray-600'
              >
                <X className='h-6 w-6' />
              </UnifiedButton>
            </div>
            <div className='p-6 overflow-y-auto max-h-[calc(90vh-120px)]'>
              <ExchangeRatesDisplay 
                date={new Date().toISOString().slice(0, 10)}
                showSource={true}
                showQuality={true}
                showManualOverride={true}
              />
            </div>
          </div>
        </div>
      )}
    </ContentArea>
  );
});

Dashboard.displayName = 'Dashboard';

export default Dashboard;
