import { useState, useEffect } from 'react';
import {
  Building,
  Search,
  Filter,
  Download,
  Eye,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
  LayoutGrid,
  Table,
  LineChart,
  Save,
  AlertTriangle,
  Shield,
  X,
  Target,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { api } from '../utils/apiClient';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  UnifiedCard
} from '../design-system';
import { Breadcrumb } from '../components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import MetricCard from '../components/MetricCard';
import { LedgerPageSkeleton } from '../components/EnhancedSkeletonLoaders';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart as RechartsLineChart, 
  Line, 
  PieChart as RechartsPieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter
} from 'recharts';

interface PSPData {
  psp: string;
  total_amount: number;
  total_commission: number;
  total_net: number;
  total_allocations: number;
  total_deposits: number;
  total_withdrawals: number;
  transaction_count: number;
  commission_rate: number;
}

interface PSPOverviewData {
  psp: string;
  total_deposits: number;
  total_withdrawals: number;
  total_net: number;
  total_allocations: number;
  total_rollover: number;
  transaction_count: number;
  average_transaction: number;
  last_activity: string;
}

interface PSPLedgerData {
  deposit: number;        // Backend uses 'deposit' not 'deposits'
  withdraw: number;       // Backend uses 'withdraw' not 'withdrawals'
  toplam: number;         // Backend uses 'toplam' not 'total'
  komisyon: number;       // Backend uses 'komisyon' not 'commission'
  net: number;
  allocation: number;
  rollover: number;
  transaction_count: number;
}

interface DayData {
  date: string;
  date_str: string;
  psps: { [key: string]: PSPLedgerData };
  totals: {
    total_psp: number;
    total: number;
    net: number;
    commission: number;
    carry_over: number;
  };
}

interface AllocationHistoryEntry {
  id: number;
  date: string;
  psp_name: string;
  allocation_amount: number;
  created_at: string;
  updated_at: string;
}

interface HistoryPagination {
  page: number;
  per_page: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export default function Ledger() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLanguage();
  const [pspData, setPspData] = useState<PSPData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pspFilter, setPspFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'monthly' | 'analytics' | 'history'>('overview');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPsp, setSelectedPsp] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Monthly tab state
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [expandedPSPs, setExpandedPSPs] = useState<Set<string>>(new Set());
  
  // Enhanced date filtering state
  const [dateRange, setDateRange] = useState<'custom' | '7' | '30' | '90' | '365'>('30');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [detailsData, setDetailsData] = useState<any>(null);
  const [ledgerData, setLedgerData] = useState<DayData[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [allocationSaving, setAllocationSaving] = useState<{[key: string]: boolean}>({});
  const [allocationSaved, setAllocationSaved] = useState<{[key: string]: boolean}>({});
  const [tempAllocations, setTempAllocations] = useState<{[key: string]: number}>({});
  const [pspOverviewData, setPspOverviewData] = useState<PSPOverviewData[]>([]);
  
  // Bulk allocation modal state
  const [showBulkAllocationModal, setShowBulkAllocationModal] = useState(false);
  const [selectedDayForBulk, setSelectedDayForBulk] = useState<string | null>(null);
  const [bulkAllocations, setBulkAllocations] = useState<{[key: string]: number}>({});
  const [bulkAllocationSaving, setBulkAllocationSaving] = useState(false);
  
  // History tab state
  const [historyData, setHistoryData] = useState<AllocationHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState<HistoryPagination | null>(null);
  const [historyFilters, setHistoryFilters] = useState({
    startDate: '',
    endDate: '',
    psp: '',
    page: 1
  });

  // Consolidated data fetching effect
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('🔄 Ledger: Component mounted, fetching data...');
      
      // Clear any previous errors when component mounts
      setError(null);
      
      // Always fetch PSP data first
      fetchPSPData();
      
      // Fetch ledger data if on relevant tabs
      if (activeTab === 'ledger' || activeTab === 'overview') {
        fetchLedgerData();
      }
    }
  }, [isAuthenticated, authLoading, activeTab]);

  // Fetch history data when History tab is active
  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated && !authLoading) {
      fetchHistoryData(historyFilters.page);
    }
  }, [activeTab, isAuthenticated, authLoading, historyFilters.startDate, historyFilters.endDate, historyFilters.psp]);

  // Fetch monthly data when Monthly tab is active
  useEffect(() => {
    if (activeTab === 'monthly' && isAuthenticated && !authLoading) {
      fetchMonthlyData(selectedYear, selectedMonth);
    }
  }, [activeTab, isAuthenticated, authLoading, selectedYear, selectedMonth]);

  // Listen for transaction updates to automatically refresh ledger data
  useEffect(() => {
    const handleTransactionsUpdate = (event: any) => {
      console.log('🔄 Ledger: Received transaction update event', event.detail);
      console.log('🔄 Ledger: Event type:', event.detail?.action);
      console.log('🔄 Ledger: Transaction count:', event.detail?.count);
      
      // Refresh both PSP data and ledger data when transactions are updated
      if (isAuthenticated && !authLoading) {
        console.log('🔄 Ledger: Refreshing data due to transaction updates...');
        console.log('🔄 Ledger: Current active tab:', activeTab);
        
        // Force refresh to get latest data after transaction updates
        fetchPSPData(true);
        
        // Also refresh ledger data if we're on a tab that uses it
        if (activeTab === 'ledger' || activeTab === 'overview') {
          console.log('🔄 Ledger: Refreshing ledger data for tab:', activeTab);
          fetchLedgerData(true);
        } else {
          console.log('🔄 Ledger: Not on ledger/overview tab, skipping ledger refresh');
        }
      } else {
        console.log('🔄 Ledger: Not authenticated or still loading, skipping refresh');
      }
    };

    // Add event listener
    window.addEventListener('transactionsUpdated', handleTransactionsUpdate);
    
    // Cleanup
    return () => {
      window.removeEventListener('transactionsUpdated', handleTransactionsUpdate);
    };
  }, [isAuthenticated, authLoading, activeTab]);

  // Cleanup effect to clear cache when component unmounts
  useEffect(() => {
    return () => {
      // Clear cache when component unmounts to prevent stale data
      api.clearCacheForUrl('psp_summary_stats');
      api.clearCacheForUrl('ledger-data');
    };
  }, []);

  const fetchPSPData = async (forceRefresh = false) => {
    try {
      console.log('🔄 Ledger: Starting PSP data fetch...', { forceRefresh });
      setLoading(true);
      setError(null);

      // Clear cache if forcing refresh
      if (forceRefresh) {
        api.clearCacheForUrl('psp_summary_stats');
      }

      const response = await api.get('/api/v1/transactions/psp_summary_stats', undefined, !forceRefresh);
      console.log('🔄 Ledger: PSP API response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        console.log('🔄 Ledger: Unauthorized, redirect will be handled by AuthContext');
        // User is not authenticated, redirect will be handled by AuthContext
        return;
      }

      const data = await api.parseResponse(response);
      console.log('🔄 Ledger: PSP data parsed:', data);

      if (response.ok && data) {
        // Handle the correct API response format
        // Backend now returns: [{ psp, total_amount, total_commission, total_net, transaction_count, commission_rate }]
        const pspStats = Array.isArray(data) ? data : [];
        console.log('🔄 Ledger: PSP stats array:', pspStats);

        // Transform backend data to frontend format (if needed)
        const transformedData: PSPData[] = pspStats.map((item: any) => ({
          psp: item.psp || 'Unknown',
          total_amount: item.total_amount || 0,
          total_commission: item.total_commission || 0,
          total_net: item.total_net || 0,
          total_allocations: item.total_allocations || 0,
          total_deposits: item.total_deposits || 0,
          total_withdrawals: item.total_withdrawals || 0,
          transaction_count: item.transaction_count || 0,
          commission_rate: item.commission_rate || 0,
        }));

        console.log('🔄 Ledger: Transformed PSP data:', transformedData);
        setPspData(transformedData);
        console.log('🔄 Ledger: PSP data set successfully');
      } else {
        console.error('🔄 Ledger: PSP API response not ok or no data:', { response, data });
        setError(data?.message || 'Failed to load PSP data');
        setPspData([]); // Ensure it's always an array
      }
    } catch (error) {
      console.error('🔄 Ledger: Error fetching PSP data:', error);
      setError(`Failed to load PSP data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setPspData([]); // Ensure it's always an array
    } finally {
      setLoading(false);
      console.log('🔄 Ledger: PSP data fetch completed');
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Force refresh PSP, ledger, and monthly data
      const refreshPromises = [
        fetchPSPData(true),
        fetchLedgerData(true)
      ];
      
      // Only refresh monthly data if we're on the monthly tab
      if (activeTab === 'monthly') {
        refreshPromises.push(fetchMonthlyData(selectedYear, selectedMonth, true));
      }
      
      await Promise.all(refreshPromises);
    } finally {
      setRefreshing(false);
    }
  };

  const handleExport = () => {
    try {
      // Prepare CSV data for export
      const headers = [
        'Date',
        'PSP',
        'Deposits',
        'Withdrawals',
        'Total',
        'Commission',
        'Net',
        'Allocation',
        'Rollover',
        'Risk Level'
      ];

      const rows: (string | number)[][] = [];
      
      // Add ledger data rows
      ledgerData.forEach((dayData) => {
        Object.entries(dayData.psps).forEach(([psp, pspData]) => {
          const rolloverAmount = (pspData.net || 0) - (pspData.allocation || 0);
          const riskLevel = getRolloverRiskLevel(rolloverAmount, pspData.net || 0);
          
          rows.push([
            dayData.date_str,
            psp,
            pspData.deposit || 0,
            pspData.withdraw || 0,
            pspData.toplam || 0,
            pspData.komisyon || 0,
            pspData.net || 0,
            pspData.allocation || 0,
            rolloverAmount,
            riskLevel
          ]);
        });
      });

      // Create CSV content
      const csvContent = [headers, ...rows].map(row => 
        row.map((cell: string | number) => `"${cell}"`).join(',')
      ).join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ledger_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Failed to export data. Please try again.');
    }
  };

  // Rollover Risk Assessment Functions
  const getRolloverRiskLevel = (rolloverAmount: number, netAmount: number): string => {
    if (netAmount === 0) return 'Normal';
    
    const rolloverRatio = rolloverAmount / netAmount;
    
    if (rolloverRatio > 0.3) return 'Critical';
    if (rolloverRatio > 0.2) return 'High';
    if (rolloverRatio > 0.1) return 'Medium';
    return 'Normal';
  };

  const getRolloverRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'Critical': return 'text-red-600 bg-red-50 border-red-200';
      case 'High': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'Medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRolloverRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'High': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'Medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Shield className="h-4 w-4 text-green-600" />;
    }
  };

  const getRolloverWarningMessage = (riskLevel: string, rolloverAmount: number): string => {
    switch (riskLevel) {
      case 'Critical': return `High rollover risk: ₺${rolloverAmount.toLocaleString()} outstanding`;
      case 'High': return `Elevated rollover: ₺${rolloverAmount.toLocaleString()} pending`;
      case 'Medium': return `Moderate rollover: ₺${rolloverAmount.toLocaleString()} to monitor`;
      default: return `Healthy rollover level`;
    }
  };

  // Enhanced Date Utility Functions
  const getDateRangeLabel = (range: string) => {
    switch (range) {
      case '7': return 'Last 7 days';
      case '30': return 'Last 30 days';
      case '90': return 'Last 90 days';
      case '365': return 'Last year';
      case 'custom': return 'Custom range';
      default: return 'Last 30 days';
    }
  };

  const getQuickDateRange = (type: string) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const thisWeekStart = new Date(today);
    thisWeekStart.setDate(today.getDate() - today.getDay());
    
    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setDate(thisWeekStart.getDate() - 1);
    
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    switch (type) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'Today'
        };
      case 'yesterday':
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0],
          label: 'Yesterday'
        };
      case 'thisWeek':
        return {
          start: thisWeekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'This Week'
        };
      case 'lastWeek':
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: lastWeekEnd.toISOString().split('T')[0],
          label: 'Last Week'
        };
      case 'thisMonth':
        return {
          start: thisMonthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'This Month'
        };
      case 'lastMonth':
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0],
          label: 'Last Month'
        };
      default:
        return {
          start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
          label: 'Last 30 days'
        };
    }
  };

  const handleQuickDateSelect = (type: string) => {
    const range = getQuickDateRange(type);
    setCustomStartDate(range.start);
    setCustomEndDate(range.end);
    setDateRange('custom');
    setShowDatePicker(false);
  };

  const formatDateRange = () => {
    if (dateRange === 'custom' && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }
    return getDateRangeLabel(dateRange);
  };

  // Advanced Risk Analysis Functions

  // Toggle PSP expansion
  const togglePSPExpansion = (pspName: string) => {
    setExpandedPSPs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pspName)) {
        newSet.delete(pspName);
      } else {
        newSet.add(pspName);
      }
      return newSet;
    });
  };

  const fetchMonthlyData = async (year: number, month: number, forceRefresh = false) => {
    try {
      console.log('🔄 Ledger: Starting monthly data fetch...', { year, month, forceRefresh });
      setMonthlyLoading(true);
      setError(null);

      const response = await api.get(`/api/v1/transactions/psp_monthly_stats?year=${year}&month=${month}`, undefined, !forceRefresh);
      console.log('🔄 Ledger: Monthly API response received:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        console.log('🔄 Ledger: Unauthorized, redirect will be handled by AuthContext');
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await api.parseResponse(response);
      console.log('🔄 Ledger: Monthly data parsed successfully:', {
        dataLength: data.data?.length || 0,
        month: data.month,
        year: data.year
      });

      setMonthlyData(data.data || []);
      console.log('✅ Ledger: Monthly data fetch completed successfully');
      
    } catch (error) {
      console.error('❌ Ledger: Monthly data fetch error:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch monthly data');
    } finally {
      setMonthlyLoading(false);
    }
  };

  const fetchLedgerData = async (forceRefresh = false) => {
    setLedgerLoading(true);
    try {
      console.log('🔄 Ledger: Fetching ledger data...', { forceRefresh });
      
      // Clear cache if forcing refresh
      if (forceRefresh) {
        api.clearCacheForUrl('ledger-data');
      }
      
      const response = await api.get('/api/v1/analytics/ledger-data', undefined, !forceRefresh);
      console.log('🔄 Ledger: Response status:', response.status);
      
      if (response.ok) {
        const data = await api.parseResponse(response);
        console.log('🔄 Ledger: Raw API response:', data);
        
        const ledgerData = data.ledger_data || [];
        console.log('🔄 Ledger: Processed ledger data:', ledgerData);
        console.log('🔄 Ledger: Data length:', ledgerData.length);
        
        if (ledgerData.length > 0) {
          console.log('🔄 Ledger: First day data:', ledgerData[0]);
          console.log('🔄 Ledger: PSPs in first day:', Object.keys(ledgerData[0].psps || {}));
        }
        
        setLedgerData(ledgerData);
        
        // Initialize tempAllocations with current allocation values
        const initialTempAllocations: {[key: string]: number} = {};
        ledgerData.forEach((day: DayData) => {
          Object.entries(day.psps).forEach(([psp, pspData]) => {
            const key = `${day.date}-${psp}`;
            const typedPspData = pspData as PSPLedgerData;
            initialTempAllocations[key] = typedPspData.allocation || 0;
          });
        });
        setTempAllocations(initialTempAllocations);
        
        // Calculate PSP overview data
        console.log('🔄 About to calculate PSP overview data with:', ledgerData.length, 'days');
        calculatePSPOverviewData(ledgerData);
        
        // Check for validation errors
        if (data?.validation_errors) {
          console.warn('Data validation warnings:', data.validation_errors);
          setError(`Data loaded with warnings: ${data.validation_errors.join(', ')}`);
        } else {
          // Clear any previous errors on successful load
          setError(null);
        }
      } else {
        const errorMessage = 'Failed to fetch ledger data';
        console.error('Failed to fetch ledger data:', errorMessage);
        setError(errorMessage);
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Network error occurred';
      console.error('Error fetching ledger data:', error);
      setError(`Failed to load ledger data: ${errorMessage}`);
      setLedgerData([]); // Clear data on error
    } finally {
      setLedgerLoading(false);
    }
  };

  const calculatePSPOverviewData = (data: DayData[]) => {
    console.log('🔄 calculatePSPOverviewData called with data:', data.length, 'days');
    const pspMap = new Map<string, PSPOverviewData>();

    data.forEach(day => {
      Object.entries(day.psps).forEach(([psp, pspData]) => {
        if (!pspMap.has(psp)) {
          pspMap.set(psp, {
            psp,
            total_deposits: 0,
            total_withdrawals: 0,
            total_net: 0,
            total_allocations: 0,
            total_rollover: 0,
            transaction_count: 0,
            average_transaction: 0,
            last_activity: day.date_str
          });
        }

        const overview = pspMap.get(psp)!;
        overview.total_deposits += pspData.deposit || 0;
        overview.total_withdrawals += pspData.withdraw || 0;
        overview.total_net += pspData.net || 0;
        // Don't add allocation from ledger data - we'll use PSP data instead
        
        // Use actual transaction count from backend
        overview.transaction_count += pspData.transaction_count || 1;
        
        overview.last_activity = day.date_str; // Keep the most recent date
        
        // Debug log for each PSP data point
        console.log(`📊 PSP Data - ${psp} on ${day.date}:`, {
          deposits: pspData.deposit,
          withdrawals: pspData.withdraw,
          net: pspData.net,
          allocation: pspData.allocation,
          transaction_count: pspData.transaction_count
        });
      });
    });

    // Calculate average transaction amounts and get allocations from PSP data
    pspMap.forEach(overview => {
      // Get total_allocations from PSP data instead of calculating from ledger
      const pspFromData = pspData.find(p => p.psp === overview.psp);
      overview.total_allocations = pspFromData?.total_allocations || 0;
      
      overview.average_transaction = overview.transaction_count > 0 
        ? overview.total_net / overview.transaction_count 
        : 0;
      
      // Calculate rollover as net - allocations (PSP owes company when positive)
      overview.total_rollover = overview.total_net - overview.total_allocations;
      
      // Debug log for each PSP overview
      console.log(`🎯 PSP Overview - ${overview.psp}:`, {
        total_net: overview.total_net,
        total_allocations: overview.total_allocations,
        total_rollover: overview.total_rollover,
        transaction_count: overview.transaction_count
      });
    });

    const overviewArray = Array.from(pspMap.values());
    console.log('✅ Setting PSP Overview Data:', overviewArray);
    setPspOverviewData(overviewArray);
  };

  const handleAllocationChange = (date: string, psp: string, allocation: number) => {
    const key = `${date}-${psp}`;
    setTempAllocations(prev => ({ ...prev, [key]: allocation }));
  };

  // Bulk allocation functions
  const openBulkAllocationModal = (date: string) => {
    setSelectedDayForBulk(date);
    
    // Initialize bulk allocations with current values for ALL active PSPs
    const initialBulkAllocations: {[key: string]: number} = {};
    
    // Get all unique PSPs from the PSP data (all active PSPs)
    pspData.forEach(psp => {
      const key = `${date}-${psp.psp}`;
      // Check if this PSP has data for this specific day
      const dayData = ledgerData.find(day => day.date === date);
      const dayPspData = dayData?.psps[psp.psp];
      initialBulkAllocations[key] = dayPspData?.allocation || 0;
    });
    
    setBulkAllocations(initialBulkAllocations);
    setShowBulkAllocationModal(true);
  };

  const handleBulkAllocationChange = (psp: string, allocation: number) => {
    if (!selectedDayForBulk) return;
    const key = `${selectedDayForBulk}-${psp}`;
    setBulkAllocations(prev => ({ ...prev, [key]: allocation }));
  };

  const saveBulkAllocations = async () => {
    if (!selectedDayForBulk) return;
    
    setBulkAllocationSaving(true);
    
    try {
      // Save all allocations for the selected day (including PSPs with 0 allocation)
      const savePromises = Object.entries(bulkAllocations).map(async ([key, allocation]) => {
        // Split by the last occurrence of '-' to handle dates with hyphens
        const lastDashIndex = key.lastIndexOf('-');
        const date = key.substring(0, lastDashIndex);
        const psp = key.substring(lastDashIndex + 1);
        
        console.log('🔄 Saving bulk allocation:', { date, psp, allocation });
        // Save even if allocation is 0, to ensure the PSP is recorded for that day
        return saveAllocation(date, psp, allocation);
      });
      
      await Promise.all(savePromises);
      
      // Update temp allocations to reflect the saved values
      setTempAllocations(prev => ({ ...prev, ...bulkAllocations }));
      
      // Close modal
      setShowBulkAllocationModal(false);
      setSelectedDayForBulk(null);
      setBulkAllocations({});
      
      // Add a small delay to ensure backend has processed the allocations
      console.log('⏳ Waiting 500ms for backend to process allocations...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh data
      console.log('🔄 Refreshing data after bulk allocation...');
      await Promise.all([
        fetchLedgerData(true),
        fetchPSPData(true)
      ]);
      console.log('✅ Data refresh completed after bulk allocation');
      
    } catch (error) {
      console.error('Error saving bulk allocations:', error);
    } finally {
      setBulkAllocationSaving(false);
    }
  };

  const closeBulkAllocationModal = () => {
    setShowBulkAllocationModal(false);
    setSelectedDayForBulk(null);
    setBulkAllocations({});
  };

  // History tab functions
  const fetchHistoryData = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: '50'
      });
      
      if (historyFilters.startDate) params.append('start_date', historyFilters.startDate);
      if (historyFilters.endDate) params.append('end_date', historyFilters.endDate);
      if (historyFilters.psp) params.append('psp', historyFilters.psp);
      
      const response = await api.get(`/api/v1/analytics/allocation-history?${params}`);
      
      if (response.ok) {
        const data = await api.parseResponse(response);
        if (data?.success) {
          setHistoryData(data.data);
          setHistoryPagination(data.pagination);
        }
      }
    } catch (error) {
      console.error('Error fetching history data:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleHistoryFilterChange = (key: string, value: string) => {
    setHistoryFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleHistoryPageChange = (page: number) => {
    setHistoryFilters(prev => ({ ...prev, page }));
    fetchHistoryData(page);
  };

  const exportHistoryData = async (format: 'csv' | 'json') => {
    try {
      const params = new URLSearchParams({
        format: format
      });
      
      if (historyFilters.startDate) params.append('start_date', historyFilters.startDate);
      if (historyFilters.endDate) params.append('end_date', historyFilters.endDate);
      if (historyFilters.psp) params.append('psp', historyFilters.psp);
      
      const response = await api.get(`/api/v1/analytics/allocation-history/export?${params}`, {
        responseType: 'blob'
      });
      
      if (response.ok) {
        // Create download link
        const url = window.URL.createObjectURL(await response.blob());
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `allocation_history_${new Date().toISOString().split('T')[0]}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error exporting history data:', error);
    }
  };

  // Helper function for bulk allocation saves
  const saveAllocation = async (date: string, psp: string, allocation: number) => {
    try {
      const response = await api.post('/api/v1/analytics/update-allocation', {
        date,
        psp,
        allocation
      });

      if (response.ok) {
        const responseData = await api.parseResponse(response);
        console.log('✅ Allocation saved successfully:', responseData);
        return responseData;
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to update allocation:', errorData);
        throw new Error(errorData.message || 'Failed to save allocation');
      }
    } catch (error) {
      console.error('❌ Error saving allocation:', error);
      throw error;
    }
  };

  const testCSRF = async () => {
    try {
      console.log('🧪 Testing CSRF with simple endpoint...');
      const response = await api.post('/api/v1/analytics/test-csrf', {
        test: 'data',
        timestamp: new Date().toISOString()
      });
      
      if (response.ok) {
        const data = await api.parseResponse(response);
        console.log('✅ CSRF test successful:', data);
        alert('CSRF test successful!');
      } else {
        console.error('❌ CSRF test failed:', response.status);
        alert('CSRF test failed!');
      }
    } catch (error) {
      console.error('💥 CSRF test error:', error);
      alert('CSRF test error!');
    }
  };

  const handleSaveAllocation = async (date: string, psp: string) => {
    const key = `${date}-${psp}`;
    const allocation = tempAllocations[key] || 0;
    
    setAllocationSaving(prev => ({ ...prev, [key]: true }));
    setAllocationSaved(prev => ({ ...prev, [key]: false }));

    try {
      console.log('🔄 Saving allocation:', { date, psp, allocation });
      
      const response = await api.post('/api/v1/analytics/update-allocation', {
        date,
        psp,
        allocation
      });

      console.log('📡 Allocation save response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.ok) {
        const responseData = await api.parseResponse(response);
        console.log('✅ Allocation saved successfully:', responseData);
        
        setAllocationSaved(prev => ({ ...prev, [key]: true }));
        
        // Add a small delay to ensure backend has processed the allocation
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Refresh data from backend to get updated rollover calculations
        await Promise.all([
          fetchLedgerData(true),
          fetchPSPData(true)
        ]);
        
        // Clear saved status after 2 seconds
        setTimeout(() => {
          setAllocationSaved(prev => ({ ...prev, [key]: false }));
        }, 2000);
      } else {
        // Try to get error details
        try {
          const errorData = await response.json();
          console.error('❌ Failed to update allocation:', errorData);
        } catch (parseError) {
          console.error('❌ Failed to parse error response:', parseError);
        }
      }
    } catch (error) {
      console.error('💥 Error updating allocation:', error);
    } finally {
      setAllocationSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handlePspDetails = async (psp: string) => {
    console.log('handlePspDetails called with PSP:', psp);
    setSelectedPsp(psp);
    setSelectedDate(null);
    setShowDetailsModal(true);
    
    try {
      console.log('Fetching PSP details for:', psp);
      
      // First, ensure we're authenticated
      const authResponse = await fetch('/api/v1/auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      if (!authResponse.ok) {
        console.error('Authentication check failed:', authResponse.status);
        setDetailsData({
          type: 'psp',
          psp: psp,
          transactions: [],
          total: 0,
          error: 'Authentication required. Please log in again.'
        });
        return;
      }
      
      // Get CSRF token
      const csrfResponse = await fetch('/api/v1/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      });
      
      let csrfToken = null;
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token;
      }
      
      // Fetch PSP-specific transaction details with proper headers
      const response = await fetch(`/api/v1/transactions/?psp=${encodeURIComponent(psp)}&per_page=100`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken && { 'X-CSRFToken': csrfToken }),
        },
      });
      
      console.log('API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('PSP details data:', data);
        setDetailsData({
          type: 'psp',
          psp: psp,
          transactions: data.transactions || [],
          total: data.total || 0
        });
      } else {
        console.error('API response not ok:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error response body:', errorText);
        setDetailsData({
          type: 'psp',
          psp: psp,
          transactions: [],
          total: 0,
          error: `API Error: ${response.status} - ${response.statusText}`
        });
      }
    } catch (error) {
      console.error('Error fetching PSP details:', error);
      setDetailsData({
        type: 'psp',
        psp: psp,
        transactions: [],
        total: 0,
        error: `Network Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  };

  const handleDailyDetails = async (date: string, psp: string) => {
    setSelectedDate(date);
    setSelectedPsp(psp);
    setShowDetailsModal(true);
    
    try {
      // Fetch daily transaction details for specific PSP
      const response = await api.get(`/api/v1/transactions/?date=${date}&psp=${encodeURIComponent(psp)}&per_page=100`);
      if (response.ok) {
        const data = await api.parseResponse(response);
        setDetailsData({
          type: 'daily',
          date: date,
          psp: psp,
          transactions: data.transactions || [],
          total: data.total || 0
        });
      }
    } catch (error) {
      console.error('Error fetching daily details:', error);
      setDetailsData({
        type: 'daily',
        date: date,
        psp: psp,
        transactions: [],
        total: 0,
        error: 'Failed to load details'
      });
    }
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedPsp(null);
    setSelectedDate(null);
    setDetailsData(null);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getPSPColor = (psp: string) => {
    const colors = [
      'bg-gray-100 text-gray-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800',
      'bg-teal-100 text-teal-800',
      'bg-yellow-100 text-yellow-800',
    ];
    const index = psp.length % colors.length;
    return colors[index];
  };

  const getPSPIcon = (psp: string) => {
    const icons = [Building, CreditCard, Activity, Zap, BarChart3, PieChart];
    const index = psp.length % icons.length;
    return icons[index];
  };

  // Ensure pspData is always an array and handle filtering safely
  const filteredData = Array.isArray(pspData)
    ? pspData.filter(entry => {
        const matchesSearch = entry.psp
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const matchesPSP = pspFilter === 'all' || entry.psp === pspFilter;

        return matchesSearch && matchesPSP;
      })
    : [];

  const totalEntries = filteredData.length;
  const totalAmount = filteredData.reduce(
    (sum, entry) => sum + entry.total_amount,
    0
  );
  const totalCommission = filteredData.reduce(
    (sum, entry) => sum + entry.total_commission,
    0
  );
  const totalNet = filteredData.reduce(
    (sum, entry) => sum + entry.total_net,
    0
  );
  const totalTransactions = filteredData.reduce(
    (sum, entry) => sum + entry.transaction_count,
    0
  );

  const uniquePSPs = Array.isArray(pspData)
    ? [...new Set(pspData.map(entry => entry.psp))]
    : [];

  // Enhanced loading state
  if (authLoading || loading) {
    return <LedgerPageSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50'>
        <div className='text-center max-w-md mx-auto p-8'>
          <div className='w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6'>
            <AlertCircle className='h-10 w-10 text-red-600' />
          </div>
          <h2 className='text-2xl font-bold text-gray-900 mb-4'>
            Error Loading Data
          </h2>
          <p className='text-gray-600 mb-6'>{error}</p>
          <button 
            onClick={() => fetchPSPData(true)} 
            className='inline-flex items-center gap-2 px-6 py-3 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors duration-200'
          >
            <RefreshCw className='h-4 w-4' />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb 
          items={[
            { label: 'Dashboard', href: '/' },
            { label: 'PSP Ledger', current: true }
          ]} 
        />
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Building className="h-8 w-8 text-gray-600" />
              PSP Ledger
            </h1>
            <p className="text-gray-600 mt-1">PSP transactions and balances</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
              className="flex items-center gap-2"
            >
              <Download className='h-4 w-4' />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status Indicators */}
      <div className="bg-gray-50/50 border border-gray-200/60 rounded-xl p-4">
        <div className='flex items-center gap-6 text-sm text-gray-700'>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full'></div>
            <span className="font-medium">Total Entries: {totalEntries}</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
            <span className="font-medium">Total Volume: {formatCurrency(totalAmount, '₺')}</span>
          </div>
        </div>
      </div>


      {/* Modern Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-50/80 border border-gray-200/60 shadow-sm">
          <TabsTrigger value="overview" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <LayoutGrid className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="ledger" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <Table className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="monthly" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <Calendar className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Monthly</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <BarChart3 className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <Clock className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">History</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview" className="mt-8 space-y-8">
          {/* Enhanced Stats Cards Section */}
          <UnifiedCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                PSP Overview
              </CardTitle>
              <CardDescription>
                Key performance indicators for all payment service providers (Showing all available data)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total PSPs"
                value={formatNumber(pspData.length)}
                subtitle="Active providers"
                icon={Building}
                color="gray"
              />

              {/* Rollover Risk Overview Card */}
              {(() => {
                const riskSummary = ledgerData.reduce((summary, dayData) => {
                  Object.entries(dayData.psps).forEach(([psp, pspData]) => {
                    const rolloverAmount = (pspData.net || 0) - (pspData.allocation || 0);
                    const riskLevel = getRolloverRiskLevel(rolloverAmount, pspData.net || 0);
                    
                    if (riskLevel === 'Critical') summary.critical++;
                    else if (riskLevel === 'High') summary.high++;
                    else if (riskLevel === 'Medium') summary.medium++;
                    else summary.normal++;
                    
                    summary.totalRollover += rolloverAmount;
                  });
                  return summary;
                }, { critical: 0, high: 0, medium: 0, normal: 0, totalRollover: 0 });

                const hasRisk = riskSummary.critical > 0 || riskSummary.high > 0;
                const riskColor = hasRisk ? 'red' : 'green';
                const riskIcon = hasRisk ? AlertTriangle : Shield;
                const riskValue = hasRisk ? `${riskSummary.critical + riskSummary.high}` : '0';
                const riskSubtitle = hasRisk ? `${riskSummary.critical} critical, ${riskSummary.high} high` : 'Healthy levels';
                
                // Calculate average risk percentage
                const totalPSPs = riskSummary.critical + riskSummary.high + riskSummary.medium + riskSummary.normal;
                const avgRisk = totalPSPs > 0 ? (riskSummary.critical + riskSummary.high) / totalPSPs : 0;

                return (
                  <MetricCard
                    title="Rollover Risk"
                    value={riskValue}
                    subtitle={riskSubtitle}
                    icon={riskIcon}
                    color={riskColor}
                  />
                );
              })()}

              <MetricCard
                title={t('ledger.total_allocations')}
                value={formatCurrency(pspData.reduce((sum, psp) => sum + psp.total_allocations, 0), '₺')}
                subtitle="Funds allocated"
                icon={CreditCard}
                color="orange"
              />

              <MetricCard
                title={t('ledger.total_rollover')}
                value={formatCurrency(pspData.reduce((sum, psp) => sum + (psp.total_allocations - psp.total_net), 0), '₺')}
                subtitle="Available balance"
                icon={Activity}
                color="purple"
              />
              </div>
            </CardContent>
          </UnifiedCard>

          {/* PSP Overview Cards Section */}
          <UnifiedCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-600" />
                PSP Overview Cards
              </CardTitle>
              <CardDescription>
                {`${pspData.length} PSP${pspData.length !== 1 ? 's' : ''} - All available data`}
              </CardDescription>
            </CardHeader>
            <CardContent>
            {ledgerLoading ? (
              <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                  <RefreshCw className='h-6 w-6 animate-spin text-accent-600' />
                  <span className='text-gray-600'>Loading PSP overview data...</span>
                </div>
              </div>
            ) : (
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                {pspData.map((psp, index) => {
                  const PSPSpecificIcon = getPSPIcon(psp.psp) || Building;
                  // Calculate rollover from PSP data
                  const rolloverAmount = psp.total_net - psp.total_allocations;
                  const rolloverPercentage = psp.total_net > 0 ? (rolloverAmount / psp.total_net) * 100 : 0;
                  const isRolloverPositive = rolloverAmount > 0;
                  
                  // Debug logging for all PSPs
                  console.log(`🔍 PSP Card Render - ${psp.psp}:`, {
                    total_net: psp.total_net,
                    total_allocations: psp.total_allocations,
                    rollover_amount: rolloverAmount,
                    rollover_percentage: rolloverPercentage,
                    timestamp: new Date().toISOString()
                  });
                  
                  return (
                    <div key={psp.psp} className='bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all duration-200 group'>
                      {/* Header */}
                      <div className='p-6 border-b border-gray-100'>
                        <div className='flex items-center justify-between'>
                          <div className='flex items-center gap-3'>
                            <div className='w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center'>
                              <PSPSpecificIcon className='h-5 w-5 text-primary-700' />
                          </div>
                          <div>
                              <h4 className='text-lg font-semibold text-primary-900'>{psp.psp}</h4>
                            <p className='text-sm text-gray-500'>Payment Provider</p>
                          </div>
                        </div>
                        <div className='text-right'>
                            <div className={`text-sm font-semibold ${isRolloverPositive ? 'text-success-600' : 'text-destructive-600'}`}>
                            {rolloverPercentage.toFixed(1)}%
                          </div>
                          <div className='text-xs text-gray-500'>{t('ledger.rollover_rate')}</div>
                          </div>
                        </div>
                      </div>

                      {/* Key Metrics */}
                      <div className='p-6 space-y-4'>
                        <div className='grid grid-cols-2 gap-4'>
                          <div className='text-center p-3 bg-gray-100 rounded-lg'>
                            <div className='text-xs text-gray-500 mb-1'>Total Deposits</div>
                            <div className='text-sm font-semibold text-primary-900'>{formatCurrency(psp.total_deposits, '₺')}</div>
                        </div>
                          <div className='text-center p-3 bg-gray-100 rounded-lg'>
                            <div className='text-xs text-gray-500 mb-1'>Total Withdrawals</div>
                            <div className='text-sm font-semibold text-primary-900'>{formatCurrency(psp.total_withdrawals, '₺')}</div>
                        </div>
                        </div>
                        
                        <div className='text-center p-4 bg-primary-50 rounded-lg border border-primary-100'>
                          <div className='text-xs text-primary-600 mb-1'>Net Amount</div>
                          <div className='text-lg font-semibold text-primary-900'>{formatCurrency(psp.total_net, '₺')}</div>
                      </div>

                        <div className='grid grid-cols-2 gap-4'>
                          <div className='text-center p-3 bg-gray-100 rounded-lg'>
                            <div className='text-xs text-gray-500 mb-1'>{t('ledger.allocations')}</div>
                            <div className='text-sm font-semibold text-warning-600'>{formatCurrency(psp.total_allocations, '₺')}</div>
                        </div>
                          <div className='text-center p-3 bg-gray-100 rounded-lg'>
                            <div className='text-xs text-gray-500 mb-1'>{t('ledger.rollover')}</div>
                            <div className={`text-sm font-semibold ${isRolloverPositive ? 'text-success-600' : 'text-destructive-600'}`}>
                            {formatCurrency(rolloverAmount, '₺')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Stats */}
                      <div className='px-6 py-4 bg-gray-100 border-t border-gray-200 rounded-b-lg'>
                        <div className='flex justify-between items-center'>
                        <div className='text-center'>
                          <div className='text-xs text-gray-500'>Transactions</div>
                            <div className='text-sm font-semibold text-primary-900'>{formatNumber(psp.transaction_count)}</div>
                        </div>
                        <div className='text-center'>
                          <div className='text-xs text-gray-500'>Avg. Transaction</div>
                            <div className='text-sm font-semibold text-primary-900'>{formatCurrency(psp.transaction_count > 0 ? psp.total_net / psp.transaction_count : 0, '₺')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {pspData.length === 0 && !ledgerLoading && (
              <div className='text-center py-12'>
                <div className='w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                  <Building className='h-8 w-8 text-gray-400' />
                </div>
                <h3 className='text-lg font-medium text-gray-900 mb-2'>No PSP Data Available</h3>
                <p className='text-gray-500'>No payment service provider data found for the selected period.</p>
              </div>
            )}
            </CardContent>
          </UnifiedCard>
        </TabsContent>

        <TabsContent value="ledger" className="mt-8 space-y-8">
          {/* Enhanced Filters Section with Modern Design */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                <Filter className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Filters & Search</h3>
                  <p className="text-sm text-gray-600">Search and filter PSP ledger data</p>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className='flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between'>
                <div className='flex flex-col sm:flex-row gap-4 flex-1'>
                  <div className='relative flex-1 max-w-md'>
                    <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400' />
                    <input
                      type='text'
                      placeholder='Search PSPs...'
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className='w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white'
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    <Filter className='h-4 w-4' />
                    Advanced Filters
                  </Button>
                </div>
                <div className='flex gap-3'>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-gray-200 hover:bg-gray-50 transition-all duration-200"
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button variant="default" size="sm" className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition-all duration-200 shadow-sm">
                    <Download className='h-4 w-4' />
                    Export Data
                  </Button>
                </div>
              </div>

              {/* Enhanced Date Bar */}
              <div className='mt-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden'>
                <div className='px-6 py-4 border-b border-gray-100'>
                  <div className='flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                      <Calendar className='h-5 w-5 text-gray-600' />
                      <h3 className='text-lg font-semibold text-gray-900'>Date Range</h3>
                      <span className='px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full'>
                        {formatDateRange()}
                      </span>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to previous period
                          if (dateRange === 'custom' && customStartDate && customEndDate) {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            start.setDate(start.getDate() - diffDays - 1);
                            end.setDate(end.getDate() - diffDays - 1);
                            setCustomStartDate(start.toISOString().split('T')[0]);
                            setCustomEndDate(end.toISOString().split('T')[0]);
                          }
                        }}
                        className="p-2"
                        title="Previous period"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Navigate to next period
                          if (dateRange === 'custom' && customStartDate && customEndDate) {
                            const start = new Date(customStartDate);
                            const end = new Date(customEndDate);
                            const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            start.setDate(start.getDate() + diffDays + 1);
                            end.setDate(end.getDate() + diffDays + 1);
                            setCustomStartDate(start.toISOString().split('T')[0]);
                            setCustomEndDate(end.toISOString().split('T')[0]);
                          }
                        }}
                        className="p-2"
                        title="Next period"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className="flex items-center gap-2"
                      >
                        <Calendar className='h-4 w-4' />
                        {showDatePicker ? 'Hide' : 'Custom Range'}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Quick Date Buttons */}
                <div className='px-6 py-4 bg-gray-50 border-b border-gray-100'>
                  <div className='flex flex-wrap gap-2'>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('today')}
                      className="text-xs px-3 py-2"
                    >
                      Today
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('yesterday')}
                      className="text-xs px-3 py-2"
                    >
                      Yesterday
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('thisWeek')}
                      className="text-xs px-3 py-2"
                    >
                      This Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('lastWeek')}
                      className="text-xs px-3 py-2"
                    >
                      Last Week
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('thisMonth')}
                      className="text-xs px-3 py-2"
                    >
                      This Month
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickDateSelect('lastMonth')}
                      className="text-xs px-3 py-2"
                    >
                      Last Month
                    </Button>
                    <div className='border-l border-gray-300 mx-2'></div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('7')}
                      className={`text-xs px-3 py-2 ${dateRange === '7' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                    >
                      Last 7 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('30')}
                      className={`text-xs px-3 py-2 ${dateRange === '30' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                    >
                      Last 30 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('90')}
                      className={`text-xs px-3 py-2 ${dateRange === '90' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                    >
                      Last 90 days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDateRange('365')}
                      className={`text-xs px-3 py-2 ${dateRange === '365' ? 'bg-blue-100 text-blue-800 border-blue-300' : ''}`}
                    >
                      Last Year
                    </Button>
                  </div>
                </div>

                {/* Custom Date Range Picker */}
                {showDatePicker && (
                  <div className='px-6 py-4 bg-white border-b border-gray-100'>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <div className="space-y-2">
                        <label className='block text-sm font-semibold text-gray-800'>Start Date</label>
                        <Input
                          type="date"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                          className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                        />
                      </div>
                      <div className="space-y-2">
                        <label className='block text-sm font-semibold text-gray-800'>End Date</label>
                        <Input
                          type="date"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                          className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200'
                        />
                      </div>
                    </div>
                    <div className='flex justify-end gap-3 mt-4'>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowDatePicker(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (customStartDate && customEndDate) {
                            setDateRange('custom');
                            setShowDatePicker(false);
                          }
                        }}
                        disabled={!customStartDate || !customEndDate}
                      >
                        Apply Range
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Advanced Filters */}
              {showFilters && (
                <div className='mt-6 pt-6 border-t border-gray-200 bg-gray-50 -mx-6 px-6 py-6'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div className="space-y-2">
                      <label className='block text-sm font-semibold text-gray-800'>Commission Rate</label>
                      <select className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm'>
                        <option value=''>All rates</option>
                        <option value='low'>Low (&lt; 2%)</option>
                        <option value='medium'>Medium (2-5%)</option>
                        <option value='high'>High (&gt; 5%)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className='block text-sm font-semibold text-gray-800'>Status</label>
                      <select className='w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white shadow-sm'>
                        <option value=''>All statuses</option>
                        <option value='active'>Active</option>
                        <option value='inactive'>Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Rollover Risk Summary with Predictive Alerts */}
          {(() => {
            const riskSummary = ledgerData.reduce((summary, dayData) => {
              Object.entries(dayData.psps).forEach(([psp, pspData]) => {
                const rolloverAmount = (pspData.net || 0) - (pspData.allocation || 0);
                const riskLevel = getRolloverRiskLevel(rolloverAmount, pspData.net || 0);
                
                if (riskLevel === 'Critical') summary.critical++;
                else if (riskLevel === 'High') summary.high++;
                else if (riskLevel === 'Medium') summary.medium++;
                else summary.normal++;
                
                summary.totalRollover += rolloverAmount;
              });
              return summary;
            }, { critical: 0, high: 0, medium: 0, normal: 0, totalRollover: 0 });

            const hasRisk = riskSummary.critical > 0 || riskSummary.high > 0;

            if (hasRisk) {
              return (
                <div className="bg-orange-50/50 border border-orange-200/60 rounded-xl p-4 mb-6">
                  <div className='flex items-center gap-4 text-sm'>
                    <div className='flex items-center gap-2'>
                        <AlertTriangle className='h-5 w-5 text-orange-600' />
                      <span className="font-semibold text-orange-700">
                        ⚠️ Rollover Risk Alert
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-orange-700">
                      {riskSummary.critical > 0 && (
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 bg-red-500 rounded-full'></div>
                          <span className="font-medium">{riskSummary.critical} Critical Risk PSPs</span>
                        </div>
                      )}
                      {riskSummary.high > 0 && (
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 bg-orange-500 rounded-full'></div>
                          <span className="font-medium">{riskSummary.high} High Risk PSPs</span>
                        </div>
                      )}
                      {riskSummary.medium > 0 && (
                        <div className='flex items-center gap-2'>
                          <div className='w-3 h-3 bg-yellow-500 rounded-full'></div>
                          <span className="font-medium">{riskSummary.medium} Medium Risk PSPs</span>
                        </div>
                      )}
                      <div className='flex items-center gap-2'>
                        <div className='w-3 h-3 bg-red-600 rounded-full'></div>
                        <span className="font-medium">Total Outstanding: {formatCurrency(riskSummary.totalRollover, '₺')}</span>
                      </div>
                        </div>
                    </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Enhanced Ledger Data Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                <Table className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Ledger Data</h3>
                  <p className="text-sm text-gray-600">Daily PSP transaction and balance information</p>
                </div>
              </div>
            </div>
            <div className="p-6">
            {/* Ledger Data Loading */}
            {ledgerLoading && (
              <div className='flex items-center justify-center py-12'>
                <div className='flex items-center gap-3'>
                  <RefreshCw className='h-6 w-6 animate-spin text-accent-600' />
                  <span className='text-gray-600'>Loading ledger data...</span>
                </div>
              </div>
            )}

            {/* Ledger Data */}
            {!ledgerLoading && ledgerData.length > 0 && (
              <div className='space-y-6'>
                {ledgerData.map((dayData, dayIndex) => (
                  <div key={dayIndex} className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
                    {/* Enhanced Day Header */}
                    <div className='bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-5'>
                      <div className='flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6'>
                        <div className='flex-1'>
                          <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-white rounded-lg shadow-sm">
                              <Calendar className="h-5 w-5 text-gray-600" />
                          </div>
                            <h3 className='text-xl font-bold text-gray-900'>{dayData.date_str}</h3>
                        </div>
                          <div className='flex items-center gap-6 text-sm text-gray-600'>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-medium">{dayData.totals.total_psp} PSPs</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="font-medium">{formatCurrency(dayData.totals.total, '₺')}</span>
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-6'>
                        <div className='flex gap-8'>
                            <div className='text-right bg-white rounded-lg px-4 py-3 shadow-sm'>
                              <div className='text-lg font-bold text-gray-900'>
                              {formatCurrency(dayData.totals.net, '₺')}
                            </div>
                              <div className='text-xs text-gray-500 uppercase tracking-wide font-medium'>Net Position</div>
                          </div>
                            <div className='text-right bg-white rounded-lg px-4 py-3 shadow-sm'>
                              <div className='text-lg font-bold text-gray-900'>
                                  {formatCurrency(dayData.totals.commission, '₺')}
                            </div>
                              <div className='text-xs text-gray-500 uppercase tracking-wide font-medium'>Commission</div>
                          </div>
                          </div>
                          <button
                            onClick={() => openBulkAllocationModal(dayData.date)}
                            className='px-4 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all duration-200 flex items-center gap-2 shadow-sm hover:shadow-md'
                          >
                            <Building className='h-4 w-4' />
                            Bulk Allocate
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Minimal Professional Table */}
                    <div className='overflow-x-auto'>
                      <table className='w-full'>
                        <thead className='bg-gray-50 border-b border-gray-200'>
                          <tr>
                            <th className='px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              PSP
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Deposit
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Withdraw
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Total
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Commission
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Net
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              {t('ledger.allocations')}
                            </th>
                            <th className='px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              {t('ledger.rollover')}
                            </th>
                            <th className='px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider'>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className='divide-y divide-gray-100'>
                          {Object.entries(dayData.psps).map(([psp, pspData], pspIndex) => {
                            const PSPSpecificIcon = getPSPIcon(psp) || Building;
                            const typedPspData = pspData as PSPLedgerData;
                            const currentAllocation: number = tempAllocations[`${dayData.date}-${psp}`] ?? typedPspData.allocation ?? 0;
                            const rolloverAmount = typedPspData.net - currentAllocation;
                            const netAmount = typedPspData.net;

                            return (
                              <tr key={pspIndex} className='hover:bg-gray-50 transition-colors duration-150'>
                                <td className='px-4 py-3'>
                                  <div className='flex items-center gap-3'>
                                    <div className='w-8 h-8 bg-gray-100 rounded-md flex items-center justify-center'>
                                      <PSPSpecificIcon className='h-4 w-4 text-gray-600' />
                                    </div>
                                    <div>
                                      <div className='text-sm font-medium text-gray-900'>{psp}</div>
                                      <div className='text-xs text-gray-500'>
                                        {typedPspData.transaction_count} transactions
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='text-sm text-gray-900'>
                                    {formatCurrency(typedPspData.deposit, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='text-sm text-gray-900'>
                                    {formatCurrency(typedPspData.withdraw, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='text-sm font-medium text-gray-900'>
                                    {formatCurrency(typedPspData.toplam, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='text-sm text-gray-900'>
                                    {formatCurrency(typedPspData.komisyon, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='text-sm font-semibold text-gray-900'>
                                    {formatCurrency(typedPspData.net, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className='flex items-center gap-2'>
                                      <input
                                        type='number'
                                        step='0.01'
                                      className='w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-gray-400 focus:border-gray-400 text-right bg-white'
                                        value={tempAllocations[`${dayData.date}-${psp}`] !== undefined ? tempAllocations[`${dayData.date}-${psp}`] : typedPspData.allocation || ''}
                                        onChange={(e) => handleAllocationChange(dayData.date, psp, parseFloat(e.target.value) || 0)}
                                      placeholder='0'
                                    />
                                      <button
                                        onClick={() => handleSaveAllocation(dayData.date, psp)}
                                        disabled={allocationSaving[`${dayData.date}-${psp}`] || (tempAllocations[`${dayData.date}-${psp}`] === typedPspData.allocation)}
                                      className='px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed'
                                    >
                                      {allocationSaving[`${dayData.date}-${psp}`] ? '...' : 'Save'}
                                      </button>
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-right'>
                                  <div className={`text-sm ${rolloverAmount > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                    {formatCurrency(rolloverAmount, '₺')}
                                  </div>
                                </td>
                                <td className='px-4 py-3 text-center'>
                                  <button 
                                    onClick={() => {
                                      console.log('View button clicked for PSP:', psp);
                                      handlePspDetails(psp);
                                    }}
                                    className='text-xs text-gray-500 hover:text-gray-700 underline hover:no-underline transition-colors duration-200'
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Day Summary */}
                    <div className='bg-gray-50 border-t border-gray-200 px-4 py-3'>
                      <div className='grid grid-cols-4 gap-4 text-center'>
                        <div>
                          <div className='text-xs text-gray-500'>Total</div>
                          <div className='text-sm font-medium text-gray-900'>{formatCurrency(dayData.totals.total, '₺')}</div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500'>Net</div>
                          <div className='text-sm font-medium text-gray-900'>{formatCurrency(dayData.totals.net, '₺')}</div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500'>Commission</div>
                          <div className='text-sm font-medium text-gray-900'>{formatCurrency(dayData.totals.commission, '₺')}</div>
                        </div>
                        <div>
                          <div className='text-xs text-gray-500'>Carry Over</div>
                          <div className='text-sm font-medium text-gray-900'>{formatCurrency(dayData.totals.carry_over, '₺')}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* No Data */}
            {!ledgerLoading && ledgerData.length === 0 && (
              <div className='text-center py-12'>
                <div className='text-gray-500'>
                  <Building className='h-12 w-12 mx-auto mb-4 text-gray-300' />
                  <p className='text-lg font-medium text-gray-900 mb-2'>No ledger data found</p>
                  <p className='text-gray-600'>Try adjusting your filters or date range.</p>
                  
                  {/* Error Display */}
                  {error && (
                    <div className='mt-4 p-4 bg-red-50 border border-red-200 rounded-lg'>
                      <p className='text-red-800 font-medium'>Error:</p>
                      <p className='text-red-700 text-sm'>{error}</p>
                    </div>
                  )}
                  
                  {/* Additional Information */}
                  <div className='mt-4 p-4 bg-gray-100 rounded-lg text-left text-sm'>
                    <p className='font-medium text-gray-700 mb-2'>Additional Info:</p>
                    <p>Active Tab: {activeTab}</p>
                    <p>Ledger Loading: {ledgerLoading ? 'Yes' : 'No'}</p>
                    <p>Ledger Data Length: {ledgerData.length}</p>
                    <p>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</p>
                    <p>Auth Loading: {authLoading ? 'Yes' : 'No'}</p>
                  </div>
                  
                  <div className='mt-4'>
                    <button 
                      onClick={() => fetchLedgerData(true)}
                      className='btn btn-primary'
                    >
                      <RefreshCw className='h-4 w-4 mr-2' />
                      Refresh Ledger Data
                    </button>
                  </div>
                </div>
              </div>
            )}
            </div>
          </div>
        </TabsContent>

        {/* Monthly Tab Content */}
        <TabsContent value="monthly" className="mt-8 space-y-8">
          {/* Monthly Header with Month Selection */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Calendar className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Monthly PSP Report</h3>
                    <p className="text-sm text-gray-600">Monthly financial overview for all PSPs</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {/* Year Selection */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Year:</label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Month Selection */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">Month:</label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                      className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <option key={month} value={month}>
                          {new Date(2024, month - 1).toLocaleString('default', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Refresh Button */}
                  <Button
                    onClick={() => fetchMonthlyData(selectedYear, selectedMonth, true)}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                    disabled={monthlyLoading}
                  >
                    <RefreshCw className={`h-4 w-4 ${monthlyLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Monthly Data Table */}
            <div className="p-6">
              {monthlyLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-gray-600">Loading monthly data...</span>
                  </div>
                </div>
              ) : monthlyData.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
                  <p className="text-gray-600">No PSP data found for the selected month.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-200/60 shadow-sm bg-white">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 via-gray-50 to-slate-50 border-b border-gray-200/80">
                      <tr>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider w-12"></th>
                        <th className="text-left py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4 text-slate-500" />
                            Payment Service Provider
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                            YATIRIM
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            ÇEKME
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <DollarSign className="h-4 w-4 text-slate-500" />
                            TOPLAM
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <Activity className="h-4 w-4 text-amber-500" />
                            KOMİSYON
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <Target className="h-4 w-4 text-blue-500" />
                            NET
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[140px]">
                          <div className="flex items-center justify-end gap-2">
                            <CreditCard className="h-4 w-4 text-purple-500" />
                            TAHS TUTARI
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <BarChart3 className="h-4 w-4 text-indigo-500" />
                            KASA TOP
                          </div>
                        </th>
                        <th className="text-right py-4 px-6 font-semibold text-slate-700 text-xs uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-end gap-2">
                            <RefreshCw className="h-4 w-4 text-cyan-500" />
                            DEVİR
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/80">
                      {monthlyData.map((psp, index) => (
                        <>
                          <tr key={psp.psp} className={`group hover:bg-slate-50/80 transition-all duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                            <td className="py-5 px-6">
                              <button
                                onClick={() => togglePSPExpansion(psp.psp)}
                                className="p-2 hover:bg-slate-200/60 rounded-lg transition-all duration-200 group-hover:bg-slate-200/80"
                                title={expandedPSPs.has(psp.psp) ? "Collapse daily details" : "Expand daily details"}
                              >
                                {expandedPSPs.has(psp.psp) ? (
                                  <ChevronDown className="h-4 w-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-600" />
                                )}
                              </button>
                            </td>
                            <td className="py-5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex items-center justify-center shadow-sm">
                                  <Building className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-900 text-sm">{psp.psp}</div>
                                  <div className="text-xs text-slate-500">{psp.transaction_count || 0} transactions</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-emerald-700">
                                  {formatCurrency(psp.yatimim || 0)}
                                </span>
                                <span className="text-xs text-emerald-600/70">Deposits</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-red-700">
                                  {formatCurrency(psp.cekme || 0)}
                                </span>
                                <span className="text-xs text-red-600/70">Withdrawals</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-bold text-slate-900">
                                  {formatCurrency(psp.toplam || 0)}
                                </span>
                                <span className="text-xs text-slate-600/70">Net Total</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-amber-700">
                                  {formatCurrency(psp.komisyon || 0)}
                                </span>
                                <span className="text-xs text-amber-600/70">Commission</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-blue-700">
                                  {formatCurrency(psp.net || 0)}
                                </span>
                                <span className="text-xs text-blue-600/70">Net Amount</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-purple-700">
                                  {formatCurrency(psp.tahs_tutari || 0)}
                                </span>
                                <span className="text-xs text-purple-600/70">Allocation</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="font-mono text-sm font-semibold text-indigo-700">
                                  {formatCurrency(psp.kasa_top || 0)}
                                </span>
                                <span className="text-xs text-indigo-600/70">Revenue</span>
                              </div>
                            </td>
                            <td className="py-5 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className={`font-mono text-sm font-semibold ${(psp.devir || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                  {formatCurrency(psp.devir || 0)}
                                </span>
                                <span className={`text-xs ${(psp.devir || 0) >= 0 ? 'text-emerald-600/70' : 'text-red-600/70'}`}>
                                  Rollover
                                </span>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Daily Breakdown Row */}
                          {expandedPSPs.has(psp.psp) && psp.daily_breakdown && psp.daily_breakdown.length > 0 && (
                            <tr key={`${psp.psp}-daily`} className="bg-gradient-to-r from-slate-50/50 to-blue-50/30">
                              <td colSpan={10} className="py-6 px-6">
                                <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-lg shadow-slate-200/20">
                                  <div className="px-6 py-4 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/80 to-blue-50/40 rounded-t-xl">
                                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-3">
                                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-white" />
                                      </div>
                                      Daily Transaction Breakdown - {psp.psp}
                                      <span className="ml-auto text-xs font-medium text-slate-600 bg-slate-200/60 px-3 py-1 rounded-full">
                                        {psp.daily_breakdown.length} days
                                      </span>
                                    </h4>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full">
                                      <thead className="bg-gradient-to-r from-slate-50 to-slate-100/50">
                                        <tr>
                                          <th className="text-left py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Date</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">YATIRIM</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">ÇEKME</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">TOPLAM</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">KOMİSYON</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">NET</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">TAHS TUTARI</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">KASA TOP</th>
                                          <th className="text-right py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">DEVİR</th>
                                          <th className="text-center py-3 px-4 font-semibold text-slate-700 text-xs uppercase tracking-wider">Tx Count</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100/60">
                                        {psp.daily_breakdown.map((daily: any, dailyIndex: number) => (
                                          <tr key={daily.date} className={`hover:bg-slate-50/50 transition-colors duration-150 ${dailyIndex % 2 === 0 ? 'bg-white/50' : 'bg-slate-50/30'}`}>
                                            <td className="py-3 px-4">
                                              <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                                                <span className="font-medium text-slate-800 text-sm">
                                                  {new Date(daily.date).toLocaleDateString('tr-TR')}
                                                </span>
                                              </div>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-emerald-700">
                                                {formatCurrency(daily.yatimim || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-red-700">
                                                {formatCurrency(daily.cekme || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-bold text-slate-800">
                                                {formatCurrency(daily.toplam || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-amber-700">
                                                {formatCurrency(daily.komisyon || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-blue-700">
                                                {formatCurrency(daily.net || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-purple-700">
                                                {formatCurrency(daily.tahs_tutari || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className="font-mono text-sm font-semibold text-indigo-700">
                                                {formatCurrency(daily.kasa_top || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                              <span className={`font-mono text-sm font-semibold ${(daily.devir || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                                {formatCurrency(daily.devir || 0)}
                                              </span>
                                            </td>
                                            <td className="py-3 px-4 text-center">
                                              <span className="inline-flex items-center justify-center w-6 h-6 bg-slate-100 rounded-full text-xs font-medium text-slate-700">
                                                {daily.transaction_count || 0}
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                      <tfoot className="bg-gradient-to-r from-slate-100 to-slate-200/60 border-t border-slate-200">
                                        <tr className="font-bold">
                                          <td className="py-4 px-4 text-slate-800">
                                            <div className="flex items-center gap-2">
                                              <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                              Daily Totals
                                            </div>
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-emerald-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.yatimim || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-red-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.cekme || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-slate-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.toplam || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-amber-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.komisyon || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-blue-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.net || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-purple-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.tahs_tutari || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-right font-mono text-indigo-800 text-sm">
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.kasa_top || 0), 0))}
                                          </td>
                                          <td className={`py-4 px-4 text-right font-mono text-sm ${psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.devir || 0), 0) >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                                            {formatCurrency(psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.devir || 0), 0))}
                                          </td>
                                          <td className="py-4 px-4 text-center">
                                            <span className="inline-flex items-center justify-center w-8 h-8 bg-slate-300 rounded-full text-xs font-bold text-slate-800">
                                              {psp.daily_breakdown.reduce((sum: number, daily: any) => sum + (daily.transaction_count || 0), 0)}
                                            </span>
                                          </td>
                                        </tr>
                                      </tfoot>
                                    </table>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      ))}
                    </tbody>
                    <tfoot className="bg-gradient-to-r from-slate-100 via-slate-200/80 to-slate-100 border-t-2 border-slate-300">
                      <tr className="font-bold">
                        <td className="py-6 px-6"></td>
                        <td className="py-6 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 rounded-lg flex items-center justify-center shadow-lg">
                              <BarChart3 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <div className="text-slate-900 text-sm font-bold">MONTHLY TOTALS</div>
                              <div className="text-xs text-slate-600">{monthlyData.length} PSPs</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-emerald-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.yatimim || 0), 0))}
                            </span>
                            <span className="text-xs text-emerald-700/70 font-medium">Total Deposits</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-red-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.cekme || 0), 0))}
                            </span>
                            <span className="text-xs text-red-700/70 font-medium">Total Withdrawals</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-slate-900">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.toplam || 0), 0))}
                            </span>
                            <span className="text-xs text-slate-700/70 font-medium">Net Total</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-amber-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.komisyon || 0), 0))}
                            </span>
                            <span className="text-xs text-amber-700/70 font-medium">Total Commission</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-blue-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.net || 0), 0))}
                            </span>
                            <span className="text-xs text-blue-700/70 font-medium">Net Amount</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-purple-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.tahs_tutari || 0), 0))}
                            </span>
                            <span className="text-xs text-purple-700/70 font-medium">Total Allocation</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-mono text-base font-bold text-indigo-800">
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.kasa_top || 0), 0))}
                            </span>
                            <span className="text-xs text-indigo-700/70 font-medium">Total Revenue</span>
                          </div>
                        </td>
                        <td className="py-6 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className={`font-mono text-base font-bold ${monthlyData.reduce((sum, psp) => sum + (psp.devir || 0), 0) >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                              {formatCurrency(monthlyData.reduce((sum, psp) => sum + (psp.devir || 0), 0))}
                            </span>
                            <span className={`text-xs font-medium ${monthlyData.reduce((sum, psp) => sum + (psp.devir || 0), 0) >= 0 ? 'text-emerald-700/70' : 'text-red-700/70'}`}>
                              Total Rollover
                            </span>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab Content */}
        <TabsContent value="analytics" className="mt-8 space-y-8">
          {/* Analytics Header */}
          <div className="flex items-center justify-between">
                  <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-6 w-6 text-primary-600" />
                Analytics Dashboard
              </h2>
              <p className="text-gray-600 mt-1">Comprehensive insights and performance metrics</p>
                  </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => {
                  fetchPSPData(true);
                  fetchLedgerData(true);
                }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh Data
              </Button>
                </div>
              </div>

          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Volume"
              value={formatCurrency(pspData.reduce((sum, psp) => sum + psp.total_amount, 0), '₺')}
              subtitle="All PSPs combined"
              icon={DollarSign}
              color="indigo"
            />
            <MetricCard
              title="Active PSPs"
              value={pspData.length.toString()}
              subtitle="Payment providers"
              icon={Building}
              color="green"
            />
            <MetricCard
              title="Avg Commission Rate"
              value={`${(pspData.reduce((sum, psp) => sum + psp.commission_rate, 0) / pspData.length || 0).toFixed(1)}%`}
              subtitle="Weighted average"
              icon={Target}
              color="orange"
            />
            <MetricCard
              title="Total Transactions"
              value={formatNumber(pspData.reduce((sum, psp) => sum + psp.transaction_count, 0))}
              subtitle="All time"
              icon={Activity}
              color="purple"
            />
              </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PSP Performance Comparison */}
            <UnifiedCard variant="elevated" className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary-600" />
                  PSP Performance Comparison
                </CardTitle>
                <CardDescription>
                  Net amounts and transaction counts by PSP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pspData.map(psp => ({
                      name: psp.psp,
                      net: psp.total_net,
                      transactions: psp.transaction_count,
                      commission: psp.total_commission
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'net' || name === 'commission' ? formatCurrency(Number(value), '₺') : value,
                          name === 'net' ? 'Net Amount' : name === 'transactions' ? 'Transactions' : 'Commission'
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="net" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
            </CardContent>
          </UnifiedCard>

            {/* PSP Market Share */}
            <UnifiedCard variant="elevated" className="p-6">
              <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-primary-600" />
                  PSP Market Share
              </CardTitle>
              <CardDescription>
                  Distribution of total volume by PSP
              </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={pspData.map(psp => ({
                          name: psp.psp,
                          value: psp.total_amount,
                          net: psp.total_net
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pspData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value) => [formatCurrency(Number(value), '₺'), 'Total Amount']}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
            </div>
            </CardContent>
          </UnifiedCard>
          </div>

          {/* Daily Trends */}
          <UnifiedCard variant="elevated" className="p-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary-600" />
                Daily Transaction Trends
              </CardTitle>
              <CardDescription>
                Net amounts and transaction counts over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ledgerData.map(day => ({
                    date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                    net: day.totals.net,
                    transactions: day.totals.total_psp,
                    commission: day.totals.commission
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'net' || name === 'commission' ? formatCurrency(Number(value), '₺') : value,
                        name === 'net' ? 'Net Amount' : name === 'transactions' ? 'Transactions' : 'Commission'
                      ]}
                      labelStyle={{ color: '#374151' }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="net" 
                      stackId="1" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="commission" 
                      stackId="2" 
                      stroke="#f59e0b" 
                      fill="#f59e0b" 
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Allocation vs Rollover Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UnifiedCard variant="elevated" className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary-600" />
                  Allocation Efficiency
                </CardTitle>
                <CardDescription>
                  Allocation vs Net amounts by PSP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={pspData.map(psp => ({
                      net: psp.total_net,
                      allocation: psp.total_allocations,
                      psp: psp.psp,
                      rollover: psp.total_net - psp.total_allocations
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        type="number" 
                        dataKey="net" 
                        name="Net Amount"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <YAxis 
                        type="number" 
                        dataKey="allocation" 
                        name="Allocation"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <Tooltip 
                        formatter={(value, name) => [
                          formatCurrency(Number(value), '₺'),
                          name === 'net' ? 'Net Amount' : name === 'allocation' ? 'Allocation' : 'Rollover'
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Scatter 
                        dataKey="allocation" 
                        fill="#3b82f6"
                        r={6}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
              </div>
              </CardContent>
            </UnifiedCard>

            <UnifiedCard variant="elevated" className="p-6">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary-600" />
                  Rollover Analysis
                </CardTitle>
                <CardDescription>
                  Rollover amounts and risk levels by PSP
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pspData.map(psp => {
                      const rollover = psp.total_net - psp.total_allocations;
                      const rolloverPercentage = psp.total_net > 0 ? (rollover / psp.total_net) * 100 : 0;
                      return {
                        name: psp.psp,
                        rollover: rollover,
                        percentage: rolloverPercentage,
                        color: rollover > 0 ? '#ef4444' : '#10b981'
                      };
                    })}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip 
                        formatter={(value, name) => [
                          name === 'rollover' ? formatCurrency(Number(value), '₺') : `${Number(value).toFixed(1)}%`,
                          name === 'rollover' ? 'Rollover Amount' : 'Rollover %'
                        ]}
                        labelStyle={{ color: '#374151' }}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar dataKey="rollover" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
              </div>
              </CardContent>
            </UnifiedCard>
          </div>

          {/* Performance Insights */}
          <UnifiedCard variant="elevated" className="p-6">
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary-600" />
                Performance Insights
                </CardTitle>
                <CardDescription>
                Key findings and recommendations based on current data
                </CardDescription>
              </CardHeader>
              <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Top Performer */}
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-green-900">Top Performer</h3>
                      <p className="text-sm text-green-700">Highest net amount</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-green-900">
                      {pspData.length > 0 ? pspData.reduce((max, psp) => psp.total_net > max.total_net ? psp : max).psp : 'N/A'}
                    </p>
                    <p className="text-sm text-green-700">
                      {pspData.length > 0 ? formatCurrency(pspData.reduce((max, psp) => psp.total_net > max.total_net ? psp : max).total_net, '₺') : '₺0'}
                    </p>
                  </div>
                </div>

                {/* Most Efficient */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Target className="h-5 w-5 text-white" />
                            </div>
                    <div>
                      <h3 className="font-semibold text-blue-900">Most Efficient</h3>
                      <p className="text-sm text-blue-700">Best allocation ratio</p>
                            </div>
                          </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-blue-900">
                      {pspData.length > 0 ? pspData.reduce((best, psp) => {
                        const currentRatio = psp.total_net > 0 ? psp.total_allocations / psp.total_net : 0;
                        const bestRatio = best.total_net > 0 ? best.total_allocations / best.total_net : 0;
                        return currentRatio > bestRatio ? psp : best;
                      }).psp : 'N/A'}
                    </p>
                    <p className="text-sm text-blue-700">
                      {pspData.length > 0 ? `${(pspData.reduce((best, psp) => {
                        const currentRatio = psp.total_net > 0 ? psp.total_allocations / psp.total_net : 0;
                        const bestRatio = best.total_net > 0 ? best.total_allocations / best.total_net : 0;
                        return currentRatio > bestRatio ? psp : best;
                      }).total_net > 0 ? (pspData.reduce((best, psp) => {
                        const currentRatio = psp.total_net > 0 ? psp.total_allocations / psp.total_net : 0;
                        const bestRatio = best.total_net > 0 ? best.total_allocations / best.total_net : 0;
                        return currentRatio > bestRatio ? psp : best;
                      }).total_allocations / pspData.reduce((best, psp) => {
                        const currentRatio = psp.total_net > 0 ? psp.total_allocations / psp.total_net : 0;
                        const bestRatio = best.total_net > 0 ? best.total_allocations / best.total_net : 0;
                        return currentRatio > bestRatio ? psp : best;
                      }).total_net) * 100 : 0).toFixed(1)}%` : '0%'}
                    </p>
                            </div>
                            </div>

                {/* Risk Alert */}
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-white" />
                          </div>
                          <div>
                      <h3 className="font-semibold text-orange-900">Risk Alert</h3>
                      <p className="text-sm text-orange-700">Highest rollover</p>
                          </div>
                        </div>
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-orange-900">
                      {pspData.length > 0 ? pspData.reduce((max, psp) => {
                        const currentRollover = psp.total_allocations - psp.total_net;
                        const maxRollover = max.total_allocations - max.total_net;
                        return currentRollover > maxRollover ? psp : max;
                      }).psp : 'N/A'}
                    </p>
                    <p className="text-sm text-orange-700">
                      {pspData.length > 0 ? formatCurrency(pspData.reduce((max, psp) => {
                        const currentRollover = psp.total_allocations - psp.total_net;
                        const maxRollover = max.total_allocations - max.total_net;
                        return currentRollover > maxRollover ? psp : max;
                      }).total_allocations - pspData.reduce((max, psp) => {
                        const currentRollover = psp.total_allocations - psp.total_net;
                        const maxRollover = max.total_allocations - max.total_net;
                        return currentRollover > maxRollover ? psp : max;
                      }).total_net, '₺') : '₺0'}
                    </p>
                  </div>
                </div>
              </div>
              </CardContent>
            </UnifiedCard>
        </TabsContent>

        {/* History Tab Content */}
        <TabsContent value="history" className="mt-8 space-y-8">
          {/* History Header with Filters and Export */}
            <UnifiedCard variant="elevated" className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-600" />
                Allocation History
                </CardTitle>
                <CardDescription>
                Complete audit trail of all PSP allocation changes with filtering and export capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
              {/* Filters and Export Controls */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <Input
                    type="date"
                    value={historyFilters.startDate}
                    onChange={(e) => handleHistoryFilterChange('startDate', e.target.value)}
                    className="w-full"
                  />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <Input
                    type="date"
                    value={historyFilters.endDate}
                    onChange={(e) => handleHistoryFilterChange('endDate', e.target.value)}
                    className="w-full"
                  />
                  </div>
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">PSP Filter</label>
                  <Input
                    type="text"
                    placeholder="Filter by PSP name..."
                    value={historyFilters.psp}
                    onChange={(e) => handleHistoryFilterChange('psp', e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={() => exportHistoryData('csv')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </Button>
                  <Button
                    onClick={() => exportHistoryData('json')}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    JSON
                  </Button>
                    </div>
                  </div>

              {/* History Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-500">Loading history data...</span>
                    </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          PSP Name
                        </th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Allocation Amount
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Created At
                        </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Updated At
                        </th>
                      </tr>
                    </thead>
                        <tbody className="divide-y divide-gray-100">
                          {historyData.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                                <p>No allocation history found</p>
                                <p className="text-sm">Try adjusting your filters or check back later</p>
                            </td>
                            </tr>
                          ) : (
                            historyData.map((entry) => (
                              <tr key={entry.id} className="hover:bg-gray-50 transition-colors duration-150">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {new Date(entry.date).toLocaleDateString()}
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4 text-gray-400" />
                                    {entry.psp_name}
                  </div>
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                  {formatCurrency(entry.allocation_amount, '₺')}
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(entry.created_at).toLocaleString()}
                            </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  {new Date(entry.updated_at).toLocaleString()}
                            </td>
                          </tr>
                            ))
                          )}
                    </tbody>
                  </table>
                    </div>

                    {/* Pagination */}
                    {historyPagination && historyPagination.pages > 1 && (
                      <div className="bg-gray-50 px-6 py-3 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                          <div className="text-sm text-gray-700">
                            Showing {((historyPagination.page - 1) * historyPagination.per_page) + 1} to{' '}
                            {Math.min(historyPagination.page * historyPagination.per_page, historyPagination.total)} of{' '}
                            {historyPagination.total} entries
                  </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHistoryPageChange(historyPagination.page - 1)}
                              disabled={!historyPagination.has_prev}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-gray-700">
                              Page {historyPagination.page} of {historyPagination.pages}
                        </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleHistoryPageChange(historyPagination.page + 1)}
                              disabled={!historyPagination.has_next}
                            >
                              Next
                            </Button>
                </div>
                  </div>
                </div>
                    )}
                  </>
                )}
              </div>
              </CardContent>
            </UnifiedCard>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        console.log('Rendering details modal with data:', detailsData),
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {detailsData?.type === 'psp' 
                  ? `PSP Details: ${detailsData.psp}` 
                  : `Daily Details: ${detailsData?.date} - ${detailsData?.psp}`
                }
              </h3>
              <button
                onClick={closeDetailsModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {detailsData?.error ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                  <p className="text-red-600">{detailsData.error}</p>
                </div>
              ) : detailsData?.transactions?.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Transactions</div>
                      <div className="text-2xl font-bold text-gray-900">{detailsData.transactions.length}</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Amount</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(
                          detailsData.transactions.reduce((sum: number, t: any) => sum + (t.amount || 0), 0),
                          '₺'
                        )}
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="text-sm text-gray-600">Total Commission</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {formatCurrency(
                          detailsData.transactions.reduce((sum: number, t: any) => sum + (t.commission || 0), 0),
                          '₺'
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Commission
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Net Amount
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Category
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {detailsData.transactions.map((transaction: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {new Date(transaction.date || transaction.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(transaction.amount || 0, '₺')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(transaction.commission || 0, '₺')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatCurrency(transaction.net_amount || 0, '₺')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                                transaction.category === 'DEP' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {transaction.category === 'DEP' ? 'Deposit' : 'Withdrawal'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No transactions found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Allocation Modal */}
      {showBulkAllocationModal && selectedDayForBulk && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[92vh] overflow-hidden border border-gray-200/50 animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="px-10 py-8 border-b border-gray-100 bg-gradient-to-br from-white via-gray-50/30 to-primary-50/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-2xl flex items-center justify-center shadow-sm">
                    <Building className="h-8 w-8 text-primary-700" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 tracking-tight">
                      Bulk Allocation
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <p className="text-base text-gray-600 font-medium">
                        {ledgerData.find(day => day.date === selectedDayForBulk)?.date_str}
                      </p>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeBulkAllocationModal}
                  className="w-12 h-12 rounded-xl bg-gray-100/80 hover:bg-gray-200/80 flex items-center justify-center transition-all duration-200 hover:scale-105"
                >
                  <X className="h-6 w-6 text-gray-600" />
                </button>
              </div>
            </div>
            
            {/* Content */}
            <div className="px-10 py-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-4">
                {pspData.map((psp, index) => {
                  const key = `${selectedDayForBulk}-${psp.psp}`;
                  const currentAllocation = bulkAllocations[key] || 0;
                  
                  // Get day-specific data if it exists
                  const dayData = ledgerData.find(day => day.date === selectedDayForBulk);
                  const dayPspData = dayData?.psps[psp.psp];
                  
                  // Calculate rollover for this PSP on this day
                  const dayNet = dayPspData?.net || 0;
                  const dayAllocation = dayPspData?.allocation || 0;
                  const dayRollover = dayAllocation - dayNet;
                  
                  // Overall rollover from PSP data
                  const overallRollover = psp.total_allocations - psp.total_net;
                  const hasDayActivity = !!dayPspData;
                  
                  return (
                    <div 
                      key={psp.psp} 
                      className="group bg-white border border-gray-200/60 rounded-2xl p-8 hover:border-primary-300/60 hover:shadow-lg hover:shadow-primary-100/20 transition-all duration-300 hover:-translate-y-0.5"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-6">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all duration-200 ${
                              hasDayActivity 
                                ? 'bg-gradient-to-br from-primary-100 to-primary-200 group-hover:from-primary-200 group-hover:to-primary-300' 
                                : 'bg-gradient-to-br from-gray-100 to-gray-200'
                            }`}>
                              <Building className={`h-7 w-7 transition-colors duration-200 ${
                                hasDayActivity ? 'text-primary-700' : 'text-gray-500'
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <h4 className="text-lg font-bold text-gray-900">{psp.psp}</h4>
                                {!hasDayActivity && (
                                  <span className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-orange-100 to-orange-200 text-orange-700 rounded-full border border-orange-200">
                                    No Activity
                                  </span>
                                )}
                                {hasDayActivity && (
                                  <span className="px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-green-100 to-green-200 text-green-700 rounded-full border border-green-200">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                <div className="bg-warning-50/80 rounded-xl p-4 border border-warning-200">
                                  <div className="text-xs font-medium text-warning-600 uppercase tracking-wide mb-1">Allocations</div>
                                  <div className="text-lg font-bold text-warning-700">
                                    {formatCurrency(hasDayActivity ? dayAllocation : psp.total_allocations, '₺')}
                                  </div>
                                </div>
                                <div className={`rounded-xl p-4 border ${
                                  (hasDayActivity ? dayRollover : overallRollover) > 0 
                                    ? 'bg-destructive-50/80 border-destructive-200' 
                                    : 'bg-success-50/80 border-success-200'
                                }`}>
                                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rollover</div>
                                  <div className={`text-lg font-bold ${
                                    (hasDayActivity ? dayRollover : overallRollover) > 0 
                                      ? 'text-destructive-600' 
                                      : 'text-success-600'
                                  }`}>
                                    {formatCurrency(hasDayActivity ? dayRollover : overallRollover, '₺')}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              New Allocation
                            </label>
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={currentAllocation}
                                  onChange={(e) => handleBulkAllocationChange(psp.psp, parseFloat(e.target.value) || 0)}
                                  className="w-40 px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-right font-bold text-lg transition-all duration-200 bg-white shadow-sm"
                                  placeholder="0.00"
                                  step="0.01"
                                />
                                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                                  <span className="text-sm font-bold text-gray-500">₺</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-10 py-8 border-t border-gray-100 bg-gradient-to-r from-gray-50/80 via-white to-gray-50/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                      <Building className="h-5 w-5 text-primary-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        {Object.keys(bulkAllocations).length} PSPs Selected
                      </div>
                      <div className="text-xs text-gray-500">Ready for allocation</div>
                    </div>
                  </div>
                  <div className="h-8 w-px bg-gray-200"></div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-700" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-gray-700">
                        Total Allocation
                      </div>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency(
                          Object.values(bulkAllocations).reduce((sum, val) => sum + val, 0), 
                          '₺'
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={closeBulkAllocationModal}
                    className="px-8 py-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-all duration-200 font-semibold border border-gray-200 hover:border-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveBulkAllocations}
                    disabled={bulkAllocationSaving}
                    className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl hover:from-primary-700 hover:to-primary-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-3 font-semibold shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    {bulkAllocationSaving ? (
                      <>
                        <RefreshCw className="h-5 w-5 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Building className="h-5 w-5" />
                        Apply Allocations
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
