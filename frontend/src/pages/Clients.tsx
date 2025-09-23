import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { handleApiError, getUserFriendlyMessage } from '../utils/errorHandler';
import { getRadius, getSectionSpacing } from '../utils/spacingUtils';
import {
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Building2,
  FileText,
  Calendar,
  Eye,
  Edit,
  Trash2,
  Filter,
  Search,
  Download,
  AlertCircle,
  Award,
  BarChart,
  User,
  Building,
  Plus,
  LineChart,
  Activity,
  X,
  Globe,
  ArrowUpRight,
  RefreshCw,
  CheckCircle,
  Clock,
  PieChart,
  MoreHorizontal,
  Upload,
  Info,
  Settings
} from 'lucide-react';
import {
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from 'recharts';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/apiClient';
import { formatCurrency as formatCurrencyUtil, formatCurrencyPositive } from '../utils/currencyUtils';
import { usePSPRefresh } from '../hooks/usePSPRefresh';
import { ProfessionalPagination } from '../components/ProfessionalPagination';
import Modal from '../components/Modal';
import TransactionDetailView from '../components/TransactionDetailView';
import TransactionEditForm from '../components/TransactionEditForm';
import BulkUSDRates from '../components/BulkUSDRates';
import { 
  UnifiedCard, 
  UnifiedButton, 
  UnifiedBadge, 
  UnifiedSection, 
  UnifiedGrid 
} from '../design-system';
import { Breadcrumb } from '../components/ui';
// Using Unified components for consistency
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { FormField } from '../components/ui/form-field';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import StandardMetricsCard from '../components/StandardMetricsCard';
import MetricCard from '../components/MetricCard';
import { ClientsPageSkeleton } from '../components/EnhancedSkeletonLoaders';

interface Client {
  client_name: string;
  company_name?: string;
  payment_method?: string;
  category?: string;
  total_amount: number;
  total_commission: number;
  total_net: number;
  transaction_count: number;
  first_transaction: string;
  last_transaction: string;
  currencies: string[];
  psps: string[];
  avg_transaction: number;
}

interface Transaction {
  id: number;
  client_name: string;
  company?: string;
  iban?: string;
  payment_method?: string;
  category: string;
  amount: number;
  commission: number;
  net_amount: number;
  currency?: string;
  psp?: string;
  notes?: string;
  date?: string;
  created_at?: string;
  updated_at?: string;
  amount_tl?: number;
  commission_tl?: number;
  net_amount_tl?: number;
  exchange_rate?: number;
}


interface ClientsResponse {
  clients: Client[];
  total_clients: number;
}

interface DailySummary {
  date: string;
  date_str: string;
  usd_rate: number | null;
  total_amount_tl: number;
  total_amount_usd: number;
  total_commission_tl: number;
  total_commission_usd: number;
  total_net_tl: number;
  total_net_usd: number;
  gross_balance_tl?: number;
  gross_balance_usd?: number;
  total_deposits_tl?: number;
  total_deposits_usd?: number;
  total_withdrawals_tl?: number;
  total_withdrawals_usd?: number;
  transaction_count: number;
  unique_clients: number;
  psp_summary: Array<{
    name: string;
    amount_tl: number;
    amount_usd: number;
    commission_tl: number;
    commission_usd: number;
    net_tl: number;
    net_usd: number;
    count: number;
    is_tether: boolean;
    primary_currency: 'USD' | 'TRY';
  }>;
  category_summary: Array<{
    name: string;
    amount_tl: number;
    amount_usd: number;
    commission_tl: number;
    commission_usd: number;
    net_tl: number;
    net_usd: number;
    count: number;
  }>;
  payment_method_summary: Array<{
    name: string;
    net_amount_tl: number;  // Changed from amount_tl to net_amount_tl
    net_amount_usd: number;  // Changed from amount_usd to net_amount_usd
    commission_tl: number;
    commission_usd: number;
    net_tl: number;
    net_usd: number;
    count: number;
  }>;
  transactions: Array<{
    id: number;
    client_name: string;
    company?: string;
    payment_method?: string;
    category: string;
    amount: number;
    commission: number;
    net_amount: number;
    currency: string;
    psp?: string;
    notes?: string;
    date: string;
    created_at?: string;
    updated_at?: string;
    amount_tl?: number;
    commission_tl?: number;
    net_amount_tl?: number;
    exchange_rate?: number;
  }>;
}

export default function Clients() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const { refreshPSPDataSilent } = usePSPRefresh();

  // Initialize state from localStorage if available
  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const saved = localStorage.getItem('pipeline_clients_data');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem('pipeline_transactions_data');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientsError, setClientsError] = useState<string | null>(null);
  const [dataLoadingState, setDataLoadingState] = useState({
    clients: false,
    transactions: false,
    analytics: false,
    dropdowns: false,
    allLoaded: false
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>(
    []
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [clientTransactions, setClientTransactions] = useState<Record<string, Transaction[]>>({});
  const [loadingClientTransactions, setLoadingClientTransactions] = useState<Record<string, boolean>>({});
  
  // State for daily summary modal
  const [showDailySummaryModal, setShowDailySummaryModal] = useState(false);
  const [dailySummaryData, setDailySummaryData] = useState<DailySummary | null>(null);
  const [dailySummaryLoading, setDailySummaryLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  
  // State for daily net balances
  const [dailyNetBalances, setDailyNetBalances] = useState<Record<string, number>>({});
  
  // State for current exchange rate (for fallback calculations)
  const [currentUsdRate, setCurrentUsdRate] = useState<number>(48.9); // Default fallback rate

  // Fetch current exchange rate for fallback calculations
  const fetchCurrentExchangeRate = async () => {
    try {
      const response = await api.get('/api/v1/exchange-rates/current');
      if (response.ok) {
        const data = await api.parseResponse(response);
        if (data && data.rates && data.rates.USD_TRY) {
          setCurrentUsdRate(data.rates.USD_TRY.rate);
        }
      }
    } catch (error) {
      console.warn('Failed to fetch current exchange rate, using fallback:', error);
    }
  };

  // Fetch current exchange rate on component mount
  useEffect(() => {
    fetchCurrentExchangeRate();
  }, []);



  const [dropdownOptions, setDropdownOptions] = useState({
    psps: [] as string[],
    categories: [] as string[],
    payment_methods: [] as string[],
    currencies: [] as string[],
    companies: [] as string[],
  });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    psp: '',
    company: '',
    payment_method: '',
    currency: '',
    status: '',
    date_from: '',
    date_to: '',
    amount_min: '',
    amount_max: '',
    commission_min: '',
    commission_max: '',
    client_name: '',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [expandedFilterSections, setExpandedFilterSections] = useState({
    basic: true,
    advanced: false,
    amounts: false,
    dates: false,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 100, // Increased to show more transactions per page (roughly 3-4 days worth)
    total: 0,
    pages: 0,
  });
  const [exporting, setExporting] = useState(false);
  const location = useLocation();
  // Tab state - get from localStorage or default to 'overview'
  const getInitialTab = () => {
    // Check localStorage for last active tab
    const lastTab = localStorage.getItem('clients-page-active-tab') as 'overview' | 'transactions' | 'analytics' | 'clients' | 'accounting';
    if (lastTab) return lastTab;
    
    return 'overview';
  };
  
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'clients' | 'accounting'>(
    getInitialTab()
  );
  const [isChangingPagination, setIsChangingPagination] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewTransactionModal, setShowViewTransactionModal] = useState(false);
  const [showEditTransactionModal, setShowEditTransactionModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  
  // Debug initial state
  console.log('🔍 Component state:', {
    isAuthenticated,
    authLoading,
    activeTab,
    transactionsLength: transactions.length,
    loading
  });
  
  // Import functionality state
  const [importing, setImporting] = useState(false);
  const [showImportGuide, setShowImportGuide] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  const [importData, setImportData] = useState<Transaction[]>([]);
  const [importPreview, setImportPreview] = useState<Transaction[]>([]);

  // Unified data loading function
  const loadAllData = useCallback(async () => {
    if (!isAuthenticated || authLoading) {
      console.log('🔄 Clients: Skipping loadAllData - not authenticated or loading');
      return;
    }
    
    console.log('🔄 Clients: Starting loadAllData...');
    setLoading(true);
    setError(null);

    try {
      // Load all data simultaneously using Promise.all
      const [clientsResult, dropdownsResult, transactionsResult] = await Promise.allSettled([
        fetchClientsData(),
        fetchDropdownOptionsData(),
        fetchTransactionsData()
      ]);

      // Debug: Log the results
      console.log('🔄 Clients: loadAllData results:', {
        clients: clientsResult.status,
        dropdowns: dropdownsResult.status,
        transactions: transactionsResult.status,
        transactionsData: transactionsResult.status === 'fulfilled' ? transactionsResult.value?.length : 'failed'
      });

      // Update loading states
      setDataLoadingState(prev => ({
        ...prev,
        clients: clientsResult.status === 'fulfilled',
        dropdowns: dropdownsResult.status === 'fulfilled',
        transactions: transactionsResult.status === 'fulfilled',
        allLoaded: true
      }));

      // Clear any previous errors if data loaded successfully
      if (clientsResult.status === 'fulfilled') {
        setClientsError(null);
      }
      if (transactionsResult.status === 'fulfilled') {
        setError(null);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);


  // Fallback: Ensure clients data loads on page load
  useEffect(() => {
    if (isAuthenticated && !authLoading && clients.length === 0 && !clientsError) {
      // Add a small delay to ensure authentication is fully established
      setTimeout(() => {
        console.log('🔄 Clients: Fallback loading clients data...');
        fetchClientsData();
      }, 100);
    }
  }, [isAuthenticated, authLoading, clients.length, clientsError]);

  // Force load clients data when component mounts and we're on overview tab
  useEffect(() => {
    if (isAuthenticated && !authLoading && activeTab === 'overview' && clients.length === 0) {
      console.log('🔄 Clients: Force loading clients data for overview tab...');
      fetchClientsData();
    }
  }, [isAuthenticated, authLoading, activeTab]);

  // Add a refresh mechanism that can be called externally
  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Clients page: Received transactionsUpdated event', customEvent?.detail);
      
      // Skip refresh if this page triggered the update
      if (customEvent?.detail?.skipCurrentPage) {
        console.log('🔄 Clients page: Skipping refresh - update originated from this page');
        return;
      }
      
      if (isAuthenticated && !authLoading) {
        console.log('🔄 Clients page: Refreshing data...');
        // Only reset to page 1 for new transactions, not updates
        if (customEvent?.detail?.action === 'create') {
          setPagination(prev => ({ ...prev, page: 1 }));
        }
        // Use skipLoadingState to prevent loading conflicts
        fetchTransactionsData(true);
        fetchClientsData();
      } else {
        console.log('🔄 Clients page: Not authenticated or still loading, skipping refresh');
      }
    };

    // Listen for transaction updates from other components
    window.addEventListener('transactionsUpdated', handleRefresh);
    
    return () => {
      window.removeEventListener('transactionsUpdated', handleRefresh);
    };
  }, [isAuthenticated, authLoading]);

  // Cleanup timeouts on component unmount
  useEffect(() => {
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [loadingTimeout]);

  // Retry mechanism for failed clients data
  const retryClientsData = () => {
    setClientsError(null);
    fetchClientsData();
  };

  const fetchTransactions = useCallback(async () => {
    console.log('🎯 fetchTransactions called!');
    
    // Prevent multiple simultaneous calls
    if (loading) {
      console.log('🔄 fetchTransactions: Already loading, skipping...');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      // Check authentication first
      if (!isAuthenticated) {
        console.log('🔄 Clients: Not authenticated, skipping transactions fetch');
        // Don't clear transactions here - let the main effect handle it
        return;
      }

      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('page', pagination.page.toString());
      params.append('per_page', pagination.per_page.toString());
      
      // Add all filter parameters
      if (filters.search && filters.search.trim() !== '') params.append('search', filters.search);
      if (filters.category && filters.category.trim() !== '') params.append('category', filters.category);
      if (filters.psp && filters.psp.trim() !== '') params.append('psp', filters.psp);
      if (filters.company && filters.company.trim() !== '') params.append('company', filters.company);
      if (filters.payment_method && filters.payment_method.trim() !== '') params.append('payment_method', filters.payment_method);
      if (filters.currency && filters.currency.trim() !== '') params.append('currency', filters.currency);
      if (filters.status && filters.status.trim() !== '') params.append('status', filters.status);
      if (filters.date_from && filters.date_from.trim() !== '') params.append('date_from', filters.date_from);
      if (filters.date_to && filters.date_to.trim() !== '') params.append('date_to', filters.date_to);
      if (filters.amount_min && filters.amount_min.trim() !== '') params.append('amount_min', filters.amount_min);
      if (filters.amount_max && filters.amount_max.trim() !== '') params.append('amount_max', filters.amount_max);
      if (filters.commission_min && filters.commission_min.trim() !== '') params.append('commission_min', filters.commission_min);
      if (filters.commission_max && filters.commission_max.trim() !== '') params.append('commission_max', filters.commission_max);
      if (filters.client_name && filters.client_name.trim() !== '') params.append('client', filters.client_name);
      if (filters.sort_by && filters.sort_by.trim() !== '') params.append('sort_by', filters.sort_by);
      if (filters.sort_order && filters.sort_order.trim() !== '') params.append('sort_order', filters.sort_order);

      console.log('🔄 Clients: Fetching transactions...');
      console.log('🔄 API URL:', `/api/v1/transactions/?${params.toString()}`);
      
      const response = await api.get(`/api/v1/transactions/?${params.toString()}`);

      console.log('🔍 Transactions API Response:', response);
      console.log('🔍 Response Type:', typeof response);
      console.log('🔍 Is Response Object:', response instanceof Response);
      console.log('🔍 Response OK:', response.ok);
      console.log('🔍 Response Status:', response.status);
      console.log('🔍 Response StatusText:', response.statusText);

      if (response.status === 401) {
        console.log('🔄 Clients: Authentication failed, clearing transactions data');
        setTransactions([]);
        setError('Authentication required. Please log in again.');
        return;
      }

      // Handle both Response objects and cached plain objects
      let data: any;
      let isSuccess = false;

      if (response instanceof Response) {
        // Fresh API call - response is a Response object
        if (response.ok) {
          data = await api.parseResponse(response);
          console.log('✅ API Response parsed successfully:', {
            hasTransactions: !!data?.transactions,
            transactionCount: data?.transactions?.length || 0,
            hasPagination: !!data?.pagination,
            paginationData: data?.pagination,
            responseKeys: Object.keys(data || {})
          });
          isSuccess = true;
        } else {
          console.error('❌ API Response not OK:', response.status, response.statusText);
          console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
          try {
            const errorData = await api.parseResponse(response);
            console.error('❌ Error data from API:', errorData);
            setError(errorData.message || 'Failed to fetch transactions');
          } catch (parseError) {
            console.error('❌ Failed to parse error response:', parseError);
            setError(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
          }
          return;
        }
      } else {
        // Cached response - response is already parsed data
        data = response;
        isSuccess = true;
        console.log('📦 Using cached data');
      }

      if (isSuccess) {
        console.log('🔍 Parsed Data:', data);
        console.log('🔍 Data Structure:', {
          hasTransactions: !!data?.transactions,
          transactionsLength: data?.transactions?.length,
          hasPagination: !!data?.pagination,
          pagination: data?.pagination
        });
        
        // Validate response data structure
        if (data?.transactions) {
          // Process transaction data
          setTransactions(data.transactions);
          // Calculate pages properly
          const total = data.pagination?.total || data.transactions.length;
          const perPage = pagination.per_page || 100;
          const calculatedPages = Math.ceil(total / perPage);
          
          setPagination(prev => ({
            ...prev,
            total: total,
            pages: data.pagination?.pages || calculatedPages,
            page: data.pagination?.page || pagination.page
          }));
          
          // Debug pagination data
          console.log('🔍 Pagination Debug:', {
            total,
            perPage,
            calculatedPages,
            apiPages: data.pagination?.pages,
            finalPages: data.pagination?.pages || calculatedPages,
            currentPage: data.pagination?.page || pagination.page
          });
          console.log('✅ Transactions loaded successfully:', data.transactions.length);
        } else {
          console.error('❌ No transaction data in response:', data);
          setError(`No transaction data received. Response structure: ${JSON.stringify(data)}`);
        }
      }
    } catch (error: any) {
      console.error('❌ Fetch Transactions Error:', error);
      console.error('❌ Error Details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      const pipLineError = handleApiError(error, 'fetchTransactions');
      console.error('❌ Processed Error:', pipLineError);
      setError(getUserFriendlyMessage(pipLineError));
    } finally {
      setLoading(false);
      setPaginationLoading(false);
      // Clear any pending timeouts
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
        setLoadingTimeout(null);
      }
    }
  }, [filters, pagination]);

  // Update active tab based on route - only on initial load or route change
  useEffect(() => {
    // Don't change tabs if we're in the middle of changing pagination
    if (isChangingPagination) return;
    
    // Only change tabs on actual route changes, not on data updates
    if (location.pathname === '/transactions') {
      setActiveTab('transactions');
      // Refresh data when navigating to transactions if we don't have recent data
      if (isAuthenticated && !authLoading && transactions.length === 0) {
        console.log('🔄 Clients: Navigating to transactions, refreshing data...');
        loadAllData();
      }
    } else if (location.pathname === '/clients') {
      // Only set to 'clients' if we don't already have a tab set from localStorage
      const savedTab = localStorage.getItem('clients-page-active-tab');
      if (!savedTab) {
        setActiveTab('clients');
      }
    } else if (location.pathname === '/accounting') {
      setActiveTab('accounting');
    }
  }, [location.pathname, isAuthenticated, authLoading, isChangingPagination]); // Removed transactions.length dependency

  // Main data loading effect - simplified and reliable
  useEffect(() => {
    console.log('🔄 Clients: Main data loading effect triggered', {
      isAuthenticated,
      authLoading,
      activeTab,
      transactionsLength: transactions.length,
      clientsLength: clients.length
    });

    if (isAuthenticated && !authLoading) {
      // Only load data if we have NO data at all (both arrays empty)
      if (clients.length === 0 && transactions.length === 0) {
        console.log('🔄 Clients: No data found, loading all data...', {
          clientsLength: clients.length,
          transactionsLength: transactions.length
        });
        loadAllData();
      } else {
        console.log('🔄 Clients: Data exists, skipping load', {
          clientsLength: clients.length,
          transactionsLength: transactions.length
        });
      }
    } else if (!isAuthenticated && !authLoading) {
      // Only clear data if we actually have data to clear
      if (clients.length > 0 || transactions.length > 0) {
        console.log('🔄 Clients: Clearing data - not authenticated', {
          clientsLength: clients.length,
          transactionsLength: transactions.length
        });
        setClients([]);
        setTransactions([]);
        setError(null);
        // Also clear localStorage when not authenticated
        try {
          localStorage.removeItem('pipeline_clients_data');
          localStorage.removeItem('pipeline_transactions_data');
        } catch (error) {
          console.error('Failed to clear localStorage:', error);
        }
      }
    }
  }, [isAuthenticated, authLoading]); // Removed activeTab from dependencies

  // Handle tab changes without clearing data
  useEffect(() => {
    console.log('🔄 Clients: Tab changed to:', activeTab);
    // Don't reload data on tab change, just log it
    // Data should persist across tab changes
  }, [activeTab]);

  // Debug: Log transactions state changes
  useEffect(() => {
    console.log('🔄 Clients: Transactions state changed:', {
      transactionsLength: transactions.length,
      activeTab,
      isAuthenticated,
      authLoading
    });
  }, [transactions, activeTab, isAuthenticated, authLoading]);

  // Persist clients data to localStorage
  useEffect(() => {
    if (clients.length > 0) {
      try {
        localStorage.setItem('pipeline_clients_data', JSON.stringify(clients));
        console.log('🔄 Clients: Saved clients data to localStorage:', clients.length, 'clients');
      } catch (error) {
        console.error('Failed to save clients data to localStorage:', error);
      }
    }
  }, [clients]);

  // Persist transactions data to localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      try {
        localStorage.setItem('pipeline_transactions_data', JSON.stringify(transactions));
        console.log('💾 Transactions data saved to localStorage:', transactions.length, 'transactions');
      } catch (error) {
        console.error('Failed to save transactions data to localStorage:', error);
      }
    }
  }, [transactions]);
  
  // Restore transactions from localStorage on component mount
  useEffect(() => {
    if (isAuthenticated && !authLoading && transactions.length === 0) {
      try {
        const saved = localStorage.getItem('pipeline_transactions_data');
        if (saved) {
          const parsedTransactions = JSON.parse(saved);
          if (Array.isArray(parsedTransactions) && parsedTransactions.length > 0) {
            console.log('🔄 Restoring transactions from localStorage:', parsedTransactions.length, 'transactions');
            setTransactions(parsedTransactions);
          }
        }
      } catch (error) {
        console.error('Error restoring transactions from localStorage:', error);
      }
    }
  }, [isAuthenticated, authLoading]);

  // Cleanup localStorage on component unmount (only for logout scenarios)
  useEffect(() => {
    return () => {
      // Only clear localStorage if user is not authenticated
      if (!isAuthenticated) {
        try {
          localStorage.removeItem('pipeline_clients_data');
          localStorage.removeItem('pipeline_transactions_data');
        } catch (error) {
          console.error('Failed to clear localStorage on unmount:', error);
        }
      }
    };
  }, [isAuthenticated]);

  // Removed force data loading on component mount to prevent conflicts

  // Removed conflicting data loading effects to prevent data clearing

  // Debug: Log transactions state changes
  useEffect(() => {
    console.log('🔄 Clients: Transactions state changed:', transactions.length, 'transactions');
  }, [transactions]);

  // Debug: Log clients state changes
  useEffect(() => {
    console.log('🔄 Clients: Clients state changed:', {
      clientsLength: clients.length,
      clientsError,
      isAuthenticated,
      authLoading,
      activeTab
    });
  }, [clients, clientsError, isAuthenticated, authLoading, activeTab]);

  // Handle filter changes for transactions tab
  useEffect(() => {
    if (isAuthenticated && !authLoading && activeTab === 'transactions') {
      // Debounce filter changes to avoid too many API calls
      const timeoutId = setTimeout(() => {
        console.log('🔄 Clients: Filter changed, refreshing transactions...');
        // Only fetch if we don't already have data or if filters actually changed
        if (transactions.length === 0 || Object.values(filters).some(filter => filter && filter.trim() !== '')) {
          fetchTransactionsData();
        }
      }, 1000); // Increased to 1000ms debounce to prevent flickering
      
      return () => clearTimeout(timeoutId);
    }
    return undefined;
  }, [filters, pagination.page, pagination.per_page, isAuthenticated, authLoading, activeTab]);

  // Individual data fetching functions (without loading states)
  const fetchClientsData = async () => {
    try {
      console.log('🔄 Clients: Fetching clients data...', {
        isAuthenticated,
        authLoading,
        currentClientsLength: clients.length
      });
      setClientsError(null);
      // Check authentication first
      if (!isAuthenticated) {
        console.log('🔄 Clients: Not authenticated, skipping clients fetch');
        setClientsError('Authentication required');
        return [];
      }

      const response = await api.get('/api/v1/transactions/clients');

      console.log('🔄 Clients: Clients API response:', {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });

      if (response.status === 401) {
        console.log('❌ Unauthorized access');
        return [];
      }

      if (response.ok) {
        const data = await api.parseResponse(response);
        console.log('🔄 Clients: Clients data received:', data);
        const clientsData = Array.isArray(data) ? data : [];

        const transformedData: Client[] = clientsData.map((item: any) => ({
          client_name: item.client_name || 'Unknown',
          company_name: item.company_name || null,
          payment_method: item.payment_method || null,
          category: item.category || null,
          total_amount: item.total_amount || 0,
          total_commission: item.total_commission || 0,
          total_net: item.total_net || 0,
          transaction_count: item.transaction_count || 0,
          first_transaction: item.first_transaction || '',
          last_transaction: item.last_transaction || '',
          currencies: item.currencies || [],
          psps: item.psps || [],
          avg_transaction: item.avg_transaction || 0,
        }));

        console.log('🔄 Clients: Transformed clients data:', transformedData.length, 'clients');
        setClients(transformedData);
        setClientsError(null); // Clear any previous errors
        return transformedData;
      } else {
        console.error('🔄 Clients: Clients API failed:', response.status, response.statusText);
        setClientsError('Failed to load clients data');
        setClients([]);
        return [];
      }
    } catch (error) {
      console.error('❌ Clients fetch error:', error);
      setClientsError('Failed to load clients data. Please try again.');
      setClients([]);
      return [];
    }
  };

  const fetchDropdownOptionsData = async () => {
    try {
      const response = await api.get('/api/v1/transactions/dropdown-options');
      if (response.ok) {
        const data = await api.parseResponse(response);
        if (data) {
          // Extract just the 'value' property from each option object
          setDropdownOptions({
            currencies: (data.currencies || data.currency || []).map((option: any) => option.value),
            payment_methods: (data.payment_method || []).map((option: any) => option.value),
            categories: (data.category || []).map((option: any) => option.value),
            psps: (data.psp || []).map((option: any) => option.value),
            companies: (data.company || []).map((option: any) => option.value),
          });
        }
        return data;
      }
      return {};
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      return {};
    }
  };

  const fetchTransactionsData = async (skipLoadingState = false) => {
    try {
      // Check authentication first
      if (!isAuthenticated) {
        console.log('🔄 Clients: Not authenticated, skipping transactions fetch');
        return [];
      }
      
      // Prevent multiple simultaneous calls unless explicitly allowed
      if (loading && !skipLoadingState) {
        console.log('🔄 fetchTransactionsData: Already loading, skipping...');
        return [];
      }

      console.log('🔄 Clients: Fetching transactions data...', { skipLoadingState });

      const params = new URLSearchParams();
      
      // Add pagination parameters
      params.append('page', pagination.page.toString());
      params.append('per_page', pagination.per_page.toString());
      
      // Add all filter parameters
      if (filters.search && filters.search.trim() !== '') params.append('search', filters.search);
      if (filters.category && filters.category.trim() !== '') params.append('category', filters.category);
      if (filters.psp && filters.psp.trim() !== '') params.append('psp', filters.psp);
      if (filters.company && filters.company.trim() !== '') params.append('company', filters.company);
      if (filters.payment_method && filters.payment_method.trim() !== '') params.append('payment_method', filters.payment_method);
      if (filters.currency && filters.currency.trim() !== '') params.append('currency', filters.currency);
      if (filters.status && filters.status.trim() !== '') params.append('status', filters.status);
      if (filters.date_from && filters.date_from.trim() !== '') params.append('date_from', filters.date_from);
      if (filters.date_to && filters.date_to.trim() !== '') params.append('date_to', filters.date_to);
      if (filters.amount_min && filters.amount_min.trim() !== '') params.append('amount_min', filters.amount_min);
      if (filters.amount_max && filters.amount_max.trim() !== '') params.append('amount_max', filters.amount_max);
      if (filters.commission_min && filters.commission_min.trim() !== '') params.append('commission_min', filters.commission_min);
      if (filters.commission_max && filters.commission_max.trim() !== '') params.append('commission_max', filters.commission_max);
      if (filters.client_name && filters.client_name.trim() !== '') params.append('client', filters.client_name);
      if (filters.sort_by && filters.sort_by.trim() !== '') params.append('sort_by', filters.sort_by);
      if (filters.sort_order && filters.sort_order.trim() !== '') params.append('sort_order', filters.sort_order);

      console.log('🔄 Clients: Fetching transactions...');
      console.log('🔄 API URL:', `/api/v1/transactions/?${params.toString()}`);
      
      const response = await api.get(`/api/v1/transactions/?${params.toString()}`);

      console.log('🔍 fetchTransactionsData API Response:', response);
      console.log('🔍 Response Type:', typeof response);
      console.log('🔍 Is Response Object:', response instanceof Response);
      console.log('🔍 Response OK:', response.ok);
      console.log('🔍 Response Status:', response.status);
      console.log('🔍 Response StatusText:', response.statusText);

      if (response.status === 401) {
        console.log('🔄 Clients: Authentication failed, clearing transactions data');
        setTransactions([]);
        setError('Authentication required. Please log in again.');
        return [];
      }

      if (response.ok) {
        const data = await api.parseResponse(response);
        console.log('✅ fetchTransactionsData API Response parsed successfully:', {
          hasTransactions: !!data?.transactions,
          transactionCount: data?.transactions?.length || 0,
          hasPagination: !!data?.pagination,
          paginationData: data?.pagination,
          responseKeys: Object.keys(data || {})
        });
        
        const transactionsData = Array.isArray(data.transactions) ? data.transactions : [];
        console.log('🔄 Clients: Setting transactions data:', transactionsData.length, 'transactions');
        setTransactions(transactionsData);
        // Calculate pages properly
        const total = data.total || 0;
        const perPage = pagination.per_page || 100;
        const calculatedPages = Math.ceil(total / perPage);
        
        setPagination(prev => ({
          ...prev,
          total: total,
          pages: data.pages || calculatedPages,
        }));
        
        // Fetch daily net balances for all dates
        fetchDailyNetBalances(transactionsData);
        
        return transactionsData;
      }
      return [];
    } catch (error) {
      console.error('❌ Error fetching transactions:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        error: error
      });
      setError(`Failed to load transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return [];
    }
  };

  // Legacy function for backward compatibility
  const fetchClients = async () => {
    setLoading(true);
    await fetchClientsData();
    setLoading(false);
  };



  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      category: '',
      psp: '',
      company: '',
      payment_method: '',
      currency: '',
      status: '',
      date_from: '',
      date_to: '',
      amount_min: '',
      amount_max: '',
      commission_min: '',
      commission_max: '',
      client_name: '',
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    // Reset pagination to first page when filters are reset
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleFilterSection = (section: keyof typeof expandedFilterSections) => {
    setExpandedFilterSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearAllFilters = () => {
    resetFilters();
  };

  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => 
      value && value !== 'created_at' && value !== 'desc'
    ).length;
  };

  const applyQuickFilter = (filterType: string) => {
    switch (filterType) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        setFilters(prev => ({
          ...prev,
          date_from: today,
          date_to: today,
        }));
        break;
      case 'thisWeek':
        const startOfWeek = new Date();
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        const endOfWeek = new Date();
        endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
        setFilters(prev => ({
          ...prev,
          date_from: startOfWeek.toISOString().split('T')[0],
          date_to: endOfWeek.toISOString().split('T')[0],
        }));
        break;
      case 'deposits':
        setFilters(prev => ({
          ...prev,
          category: 'DEP',
        }));
        break;
      case 'withdrawals':
        setFilters(prev => ({
          ...prev,
          category: 'WD',
        }));
        break;
      case 'highValue':
        setFilters(prev => ({
          ...prev,
          amount_min: '10000',
        }));
        break;
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const formatCurrency = (amount: number, currency?: string) => {
    // Use the shared utility for proper currency formatting
    return formatCurrencyUtil(amount, currency || 'USD');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDateHeader = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Check if it's today
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    }
    
    // Check if it's yesterday
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }
    
    // For other dates, show formatted date
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Group transactions by date
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    const grouped = transactions.reduce((acc, transaction) => {
      const dateKey = transaction.date || 'Unknown';
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {} as Record<string, Transaction[]>);

    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([dateKey, transactions]) => ({
        dateKey,
        date: dateKey,
        transactions: transactions.sort(
          (a, b) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          }
        ),
        netBalance: dailyNetBalances[dateKey] || null, // Add net balance from state
      }));
  };

  // Fetch daily summary data for all dates
  const fetchDailyNetBalances = async (transactions: Transaction[]) => {
    const dates = [...new Set(transactions.map(t => t.date).filter(Boolean))] as string[];
    const netBalances: Record<string, number> = {};
    
    for (const date of dates) {
      if (!date) continue; // Skip undefined dates
      try {
        const response = await api.get(`/api/summary/${date}`);
        if (response.ok) {
          const data = await api.parseResponse(response);
          if (data && data.summary && data.summary.gross_balance_tl) {
            netBalances[date] = data.summary.gross_balance_tl;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch daily summary for ${date}:`, error);
      }
    }
    
    setDailyNetBalances(netBalances);
  };

  const handleExport = () => {
    const headers = [
      'Client Name',
      'Payment',
      'Total Amount',
      'Commissions',
      'Net Amount',
      'Transactions',
      'Currency',
      'PSP',
    ];
    const rows = sortedClients.map(client => {
      // Determine primary currency for this client
      const primaryCurrency =
        Array.isArray(client.currencies) && client.currencies.length > 0
          ? client.currencies[0]
          : 'USD';

      return [
        client.client_name || 'Unknown',
        client.payment_method || 'N/A',
        formatCurrency(client.total_amount || 0, primaryCurrency),
        formatCurrency(client.total_commission || 0, primaryCurrency),
        formatCurrency(client.total_net || 0, primaryCurrency),
        client.transaction_count || 0,
        Array.isArray(client.currencies) && client.currencies.length > 0
          ? client.currencies.join(', ')
          : 'N/A',
        Array.isArray(client.psps) ? client.psps.join(', ') : 'N/A',
      ];
    });

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'clients_export.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Import functionality
  const triggerFileInput = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.xlsx,.xls,.xlsm,.xlsb';
    fileInput.onchange = handleImport;
    fileInput.click();
  };

    const handleImport = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (!file) {
      return;
    }
    
    console.log('📁 File details:', {
      name: file.name,
      size: file.size,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    setImporting(true);
    console.log('✅ Importing state set to true');
    
    try {
      let transactions: Transaction[] = [];
      console.log('📊 Transactions array initialized');
      
      if (file.name.toLowerCase().endsWith('.csv')) {
        console.log('📄 Processing CSV file...');
        
        // Handle CSV files
        console.log('📖 Reading file content...');
        const text = await file.text();
        console.log('📖 File content length:', text.length);
        console.log('📖 First 200 characters:', text.substring(0, 200));
        
        const lines = text.split('\n');
        console.log('📊 Total lines:', lines.length);
        
        const headers = lines[0].split(',');
        console.log('📋 CSV Headers:', headers);
        console.log('📋 Header count:', headers.length);
        
        const data = lines.slice(1).filter(line => line.trim());
        console.log('📊 Data lines (after filtering):', data.length);
        
        // Process CSV structure
        if (data.length > 0) {
          console.log('📊 First data line:', data[0]);
          console.log('📊 First line values:', data[0].split(','));
          console.log('📊 First line value count:', data[0].split(',').length);
        }
        
        if (data.length === 0) {
          console.error('❌ No data lines found after filtering');
          alert('No valid data found in CSV file');
          setImporting(false);
          return;
        }
        
        // Create column mapping based on headers
        const getColumnIndex = (columnName: string): number => {
          return headers.findIndex(header => 
            header.toLowerCase().trim() === columnName.toLowerCase().trim()
          );
        };
        
        const clientNameIndex = getColumnIndex('client_name');
        const amountIndex = getColumnIndex('amount');
        const dateIndex = getColumnIndex('date');
        const ibanIndex = getColumnIndex('iban');
        const paymentMethodIndex = getColumnIndex('payment_method');
        const companyOrderIndex = getColumnIndex('company_order');
        const categoryIndex = getColumnIndex('category');
        const pspIndex = getColumnIndex('psp');
        const currencyIndex = getColumnIndex('currency');
        const notesIndex = getColumnIndex('notes');
        
        console.log('📋 Column mapping:', {
          client_name: clientNameIndex,
          amount: amountIndex,
          date: dateIndex,
          iban: ibanIndex,
          payment_method: paymentMethodIndex,
          company_order: companyOrderIndex,
          category: categoryIndex,
          psp: pspIndex,
          currency: currencyIndex,
          notes: notesIndex
        });
        
        // Process transaction data
        transactions = data.map((line, index) => {
          try {
            const values = line.split(',');
            
            // Extract values using proper column mapping
            const client_name = values[clientNameIndex]?.trim() || '';
            const amount = parseFloat(values[amountIndex]) || 0;
            const date = values[dateIndex]?.trim() || new Date().toISOString().split('T')[0];
            const iban = values[ibanIndex]?.trim() || '';
            const payment_method = values[paymentMethodIndex]?.trim() || '';
            const company_order = values[companyOrderIndex]?.trim() || '';
            const category = values[categoryIndex]?.trim() || 'DEP';
            const psp = values[pspIndex]?.trim() || '';
            const currency = values[currencyIndex]?.trim() || 'TL';
            const notes = values[notesIndex]?.trim() || '';
            
            // Process category data
            let processedCategory: string;
            if (category && category.trim()) {
              const rawCategory = category.trim().toUpperCase();
              
              // Map common variations
              const categoryMapping: { [key: string]: string } = {
                'DEPOSIT': 'DEP',
                'WITHDRAW': 'WD',
                'WITHDRAWAL': 'WD',
                'ÇEKME': 'WD',
                'YATIRMA': 'DEP',
                'WD': 'WD',
                'DEP': 'DEP'
              };
              
              processedCategory = categoryMapping[rawCategory] || 'DEP';
            } else {
              processedCategory = 'DEP'; // Default value
            }
            
            // Validate data quality
            if (!client_name || amount === 0) {
              console.warn(`⚠️ Skipping invalid transaction at row ${index + 2}: client_name="${client_name}", amount=${amount}`);
              return null;
            }
            
            const transaction = {
              id: index + 1,
              client_name: client_name,
              company: company_order || undefined,
              iban: iban || undefined,
              payment_method: payment_method || undefined,
              category: processedCategory,
              amount: amount,
              commission: 0, // Will be calculated by backend
              net_amount: amount, // Will be calculated by backend
              currency: currency || undefined,
              psp: psp || undefined,
              date: date,
              notes: notes || `Imported from CSV - Row ${index + 2}`
            };
            
            // Transaction created successfully
            
            return transaction;
          } catch (error) {
            console.error(`❌ Error processing line ${index + 2}:`, error);
            return null; // Skip invalid transactions
          }
        }).filter((transaction): transaction is NonNullable<typeof transaction> => transaction !== null); // Remove null transactions
      } else if (file.name.toLowerCase().match(/\.(xlsx|xls|xlsm|xlsb)$/)) {
        // Handle Excel files
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Get the first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) {
          alert('Excel file must have at least a header row and one data row.');
          setImporting(false);
          return;
        }
        
        const headers = jsonData[0] as string[];
        const dataRows = jsonData.slice(1) as any[][];
        
        transactions = dataRows.map((row, index) => {
          try {
            // CRITICAL FIX: Define category FIRST, before any other logic
            let category: string;
          if (row[4] && row[4].toString().trim()) {
            const rawCategory = row[4].toString().trim().toUpperCase();
            // Map common variations
            const categoryMapping: { [key: string]: string } = {
              'DEPOSIT': 'DEP',
              'WITHDRAW': 'WD',
              'WITHDRAWAL': 'WD',
              'ÇEKME': 'WD',
              'YATIRMA': 'DEP',
              'WD': 'WD',
              'DEP': 'DEP'
            };
            category = categoryMapping[rawCategory] || 'DEP';
          } else {
            category = 'DEP'; // Default value
          }
          
          // Validate and clean data
          const client_name = (row[0] || '').toString().trim();
          const company = (row[1] || '').toString().trim();
          const iban = (row[2] || '').toString().trim();
          const payment_method = (row[3] || '').toString().trim();
          const amount = parseFloat(row[5]) || 0;
          const currency = (row[8] || 'TL').toString().trim();
          const psp = (row[9] || '').toString().trim();
          const date = (row[10] || '').toString().trim() || new Date().toISOString().split('T')[0];
          
          // SAFETY CHECK: Ensure category is defined before validation
          if (typeof category === 'undefined') {
            console.error(`Row ${index + 1}: Category is undefined! This should never happen.`);
            category = 'DEP'; // Emergency fallback
          }
          
          // Generate warnings for data quality issues - now category is guaranteed to be defined
          if (!client_name) {
            console.warn(`Row ${index + 1}: Missing client name`);
          }
          if (amount <= 0 && category === 'DEP') {
            console.warn(`Row ${index + 1}: DEP transactions should have positive amounts, got: ${amount}`);
          }
          if (amount >= 0 && category === 'WD') {
            console.warn(`Row ${index + 1}: WD transactions typically have negative amounts, got: ${amount}`);
          }
          if (!category || !['DEP', 'WD'].includes(category)) {
            console.warn(`Row ${index + 1}: Invalid category: ${category}, defaulting to DEP`);
          }
          
          return {
            id: index + 1,
            client_name: client_name || `Unknown_Client_${index + 1}`,
            company: company || 'Unknown',
            iban: iban || 'Unknown',
            payment_method: payment_method || 'Unknown',
            category: category,
            amount: amount,
            commission: parseFloat(row[6]) || 0,
            net_amount: parseFloat(row[7]) || amount,
            currency: currency,
            psp: psp || 'Unknown',
            date: date,
            notes: (row[11] || `Imported from Excel - Row ${index + 2}`).toString()
          };
          } catch (error) {
            console.error(`❌ Error processing Excel row ${index + 1}:`, error);
            console.error(`❌ Row content:`, row);
            // Return a safe default transaction
            return {
              id: index + 1,
              client_name: `Error_Client_${index + 1}`,
              company: 'Error',
              iban: 'Error',
              payment_method: 'Error',
              category: 'DEP',
              amount: 0,
              commission: 0,
              net_amount: 0,
              currency: 'TL',
              psp: 'Error',
              date: new Date().toISOString().split('T')[0],
              notes: `Error processing Excel row ${index + 2}: ${error}`
            };
          }
        });
      } else {
        alert('Unsupported file format. Please use CSV, XLSX, XLS, XLSM, or XLSB files.');
        setImporting(false);
        return;
      }
      
                         console.log('\n📊 ===== IMPORT PROCESSING COMPLETED =====');
      console.log(`📊 Total transactions processed:`, transactions.length);
      console.log(`📊 Transactions array:`, transactions);
      
      if (transactions.length > 0) {
        console.log('✅ Setting import data and preview...');
        setImportData(transactions);
        setImportPreview(transactions.slice(0, 5)); // Show first 5 for preview
        setShowImportPreview(true); // Show import preview, not guide
        console.log('✅ Import preview shown successfully');
      } else {
        console.error('❌ No transactions to import');
        alert('No valid data found in the file. Please check the file format and content.');
      }
      
    } catch (error: any) {
      console.error('\n❌ ===== IMPORT ERROR OCCURRED =====');
      console.error('❌ Error type:', typeof error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      console.error('❌ Full error object:', error);
      alert(`Error importing file: ${error.message}\n\nPlease check the file format and try again.`);
    } finally {
      console.log('🔄 Setting importing state to false');
      setImporting(false);
      console.log('✅ Import process completed (success or failure)');
    }
  };

  // Handle final import of transactions to the system
  const handleFinalImport = async () => {
    if (!importData || importData.length === 0) {
      alert('No data to import');
      return;
    }

    setImporting(true);
    
    try {
      // Prepare transactions for import
      const transactionsToImport = importData.map(transaction => ({
        client_name: transaction.client_name,
        company: transaction.company || '',
        payment_method: transaction.payment_method || '',
        category: transaction.category,
        amount: transaction.amount,
        commission: transaction.commission || 0,
        net_amount: transaction.net_amount || transaction.amount,
        currency: transaction.currency || 'TL',
        psp: transaction.psp || '',
        notes: transaction.notes || '',
        date: transaction.date || new Date().toISOString().split('T')[0]
      }));

      console.log('🚀 Importing transactions:', transactionsToImport);

      // Send transactions to backend API
      const response = await api.post('/api/v1/transactions/bulk-import', {
        transactions: transactionsToImport
      });

      if (response.ok) {
        const result = await api.parseResponse(response);
        console.log('✅ Import successful:', result);
        
        // Show detailed success message with import statistics
        let message = `Import completed successfully!\n\n`;
        message += `📊 Import Summary:\n`;
        message += `✅ Successfully imported: ${result.data.successful_imports} transactions\n`;
        message += `❌ Failed imports: ${result.data.failed_imports} transactions\n`;
        message += `⚠️ Duplicates skipped: ${result.data.skipped_duplicates} transactions\n`;
        message += `📝 Total rows processed: ${result.data.total_rows}\n`;
        
        // Add warnings if any
        if (result.data.warnings && result.data.warnings.length > 0) {
          message += `\n⚠️ Warnings:\n`;
          result.data.warnings.slice(0, 5).forEach((warning: string) => {
            message += `• ${warning}\n`;
          });
          if (result.data.warnings.length > 5) {
            message += `• ... and ${result.data.warnings.length - 5} more warnings\n`;
          }
        }
        
        // Add errors if any
        if (result.data.errors && result.data.errors.length > 0) {
          message += `\n❌ Errors:\n`;
          result.data.errors.slice(0, 5).forEach((error: string) => {
            message += `• ${error}\n`;
          });
          if (result.data.errors.length > 5) {
            message += `• ... and ${result.data.errors.length - 5} more errors\n`;
          }
        }
        
        // Add summary statistics if available
        if (result.data.summary) {
          message += `\n💰 Summary:\n`;
          message += `• Total amount imported: ${result.data.summary.total_amount?.toLocaleString() || 'N/A'} ₺\n`;
          message += `• Categories imported: ${result.data.summary.categories_imported?.join(', ') || 'N/A'}\n`;
        }
        
        // Show the detailed message
        alert(message);
        
        // Close modal
        setShowImportPreview(false);
        
        // Clear import data
        setImportData([]);
        setImportPreview([]);
        
        // Refresh the page data
        if (activeTab === 'transactions') {
          fetchTransactions();
        }
        fetchClients();
        
      } else {
        console.error('❌ Import failed:', response);
        alert(`Import failed: ${response.statusText || 'Unknown error'}`);
      }
      
    } catch (error: any) {
      console.error('❌ Import error:', error);
      alert(`Import error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setImporting(false);
    }
  };

  // Handle bulk delete of all transactions
  const handleBulkDeleteAll = async () => {
    if (confirmationCode !== '4561') {
      alert('Invalid confirmation code. Please enter 4561 to confirm deletion.');
      return;
    }
    
    if (!confirm('Are you absolutely sure you want to delete ALL transactions? This action cannot be undone!')) {
      return;
    }
    
    setDeleting(true);
    try {
      const response = await api.post('/api/v1/transactions/bulk-delete', {
        confirmation_code: confirmationCode
      });
      
      if (response.ok) {
        const result = await api.parseResponse(response);
        alert(`Successfully deleted ${result.data.deleted_count} transactions!`);
        setShowBulkDeleteModal(false);
        setConfirmationCode('');
        // Refresh data
        fetchClients();
        if (activeTab === 'transactions') {
          fetchTransactions();
        }
      } else {
        const errorData = await api.parseResponse(response);
        alert(`Bulk delete failed: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('❌ Bulk delete error:', error);
      alert(`Bulk delete failed: ${error.message || 'Unknown error'}`);
    } finally {
      setDeleting(false);
    }
  };

  // Action handlers
  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const handleEditClient = (client: Client) => {
    setSelectedClient(client);
    setShowEditModal(true);
  };

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client);
    setShowDeleteModal(true);
  };

  // Transaction action handlers
  const handleViewTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setShowViewTransactionModal(true);
  };

  const handleEditTransaction = async (transaction: Transaction) => {
    try {
      // Ensure dropdown options are loaded before opening edit modal
      await fetchDropdownOptionsData();
      
      // Fetch full transaction details before editing
      const response = await api.get(`/api/v1/transactions/${transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedTransaction(result.transaction);
        setShowEditTransactionModal(true);
      } else {
        console.error('Failed to fetch transaction details for editing');
        // Fallback to using the transaction data we have
        setSelectedTransaction(transaction);
        setShowEditTransactionModal(true);
      }
    } catch (error) {
      console.error('Error fetching transaction details for editing:', error);
      // Fallback to using the transaction data we have
      setSelectedTransaction(transaction);
      setShowEditTransactionModal(true);
    }
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (
      confirm(
        `Are you sure you want to delete this transaction?\n\nClient: ${transaction.client_name}\nAmount: ${formatCurrency(transaction.amount, transaction.currency)}`
      )
    ) {
      try {
        const response = await api.delete(
          `/api/v1/transactions/${transaction.id}`
        );

        if (response.ok) {
          const data = await api.parseResponse(response);
          if (data?.success) {
            // Remove transaction from local state
            setTransactions(prev => prev.filter(t => t.id !== transaction.id));

            // Refresh PSP data automatically after successful deletion
            try {
              await refreshPSPDataSilent();
              console.log('PSP data refreshed after transaction deletion');
            } catch (pspError) {
              console.warn(
                'Failed to refresh PSP data after transaction deletion:',
                pspError
              );
              // Don't fail the deletion if PSP refresh fails
            }

            alert('Transaction deleted successfully!');
          } else {
            alert(data?.message || 'Failed to delete transaction');
          }
        } else {
          const data = await api.parseResponse(response);
          alert(data?.message || 'Failed to delete transaction');
        }
      } catch (error) {
        console.error('Error deleting transaction:', error);
        alert('Failed to delete transaction. Please try again.');
      }
    }
  };

  // Function to refresh PSP data
  const refreshPSPData = async () => {
    try {
      console.log('🔄 Starting PSP data refresh from Clients page...');
      
      // Clear PSP cache first
      api.clearPSPCache();
      
      // Force refresh by disabling cache
      const response = await api.get('/api/v1/transactions/psp_summary_stats', {}, false);
      console.log('📡 PSP API response from Clients:', response);
      
      if (response.ok) {
        const pspData = await api.parseResponse(response);
        // Update any PSP-related state if needed
        console.log('✅ PSP data refreshed from Clients:', pspData);
        return pspData;
      } else {
        console.error('❌ PSP API response not OK from Clients:', response.status, response.statusText);
        throw new Error('Failed to fetch PSP data');
      }
    } catch (error) {
      console.error('❌ Error refreshing PSP data from Clients:', error);
      throw error;
    }
  };

  // Bulk delete functions
  const handleSelectTransaction = (transactionId: number, checked: boolean) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  const handleSelectAllTransactions = (checked: boolean) => {
    if (checked) {
      const allTransactionIds = transactions.map(t => t.id);
      setSelectedTransactions(allTransactionIds);
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) {
      alert('Please select transactions to delete');
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedTransactions.length} transaction${selectedTransactions.length > 1 ? 's' : ''}?\n\nThis action cannot be undone.`;

    if (confirm(confirmMessage)) {
      try {
        setBulkDeleteLoading(true);

        // Delete transactions one by one
        const deletePromises = selectedTransactions.map(async transactionId => {
          try {
            const response = await api.delete(
              `/api/v1/transactions/${transactionId}`
            );
            return { id: transactionId, success: response.ok };
          } catch (error) {
            return { id: transactionId, success: false, error };
          }
        });

        const results = await Promise.all(deletePromises);
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);

        // Remove successful deletions from local state
        setTransactions(prev =>
          prev.filter(t => !successful.some(s => s.id === t.id))
        );

        // Clear selection
        setSelectedTransactions([]);
        setShowBulkDeleteModal(false);

        // Wait a moment for backend to process all deletions, then refresh
        setTimeout(async () => {
          await fetchTransactions();

          // Refresh PSP data after bulk deletion
          try {
            await refreshPSPData();
            console.log('PSP data refreshed after bulk deletion');
          } catch (pspError) {
            console.warn(
              'Failed to refresh PSP data after bulk deletion:',
              pspError
            );
            // Don't fail the bulk deletion if PSP refresh fails
          }
        }, 500);

        // Show results
        if (successful.length > 0 && failed.length === 0) {
          alert(
            `Successfully deleted ${successful.length} transaction${successful.length > 1 ? 's' : ''}!`
          );
        } else if (successful.length > 0 && failed.length > 0) {
          alert(
            `Deleted ${successful.length} transaction${successful.length > 1 ? 's' : ''} successfully. Failed to delete ${failed.length} transaction${failed.length > 1 ? 's' : ''}.`
          );
        } else {
          alert(`Failed to delete any transactions. Please try again.`);
        }
      } catch (error) {
        console.error('Error in bulk delete:', error);
        alert('An error occurred during bulk delete. Please try again.');
      } finally {
        setBulkDeleteLoading(false);
      }
    }
  };

  const confirmDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      setDeleteLoading(true);

      // Note: You'll need to implement the actual delete endpoint
      // For now, we'll simulate the deletion
      const response = await api.delete(
        `/api/v1/clients/${encodeURIComponent(selectedClient.client_name)}`
      );

      if (response.ok) {
        // Remove client from local state
        setClients(prev =>
          prev.filter(
            client => client.client_name !== selectedClient.client_name
          )
        );
        setShowDeleteModal(false);
        setSelectedClient(null);
      } else {
        const data = await api.parseResponse(response);
        alert(data?.message || 'Failed to delete client');
      }
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Failed to delete client');
    } finally {
      setDeleteLoading(false);
    }
  };

  const closeModal = () => {
    setShowViewModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowBulkDeleteModal(false);
    setSelectedClient(null);
  };




  const filteredClients = Array.isArray(clients)
    ? clients.filter(client => {
        const matchesSearch =
          !filters.search ||
          client.client_name
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          (client.company_name &&
            client.company_name
              .toLowerCase()
              .includes(filters.search.toLowerCase()));

        const matchesClientName =
          !filters.client_name ||
          client.client_name
            .toLowerCase()
            .includes(filters.client_name.toLowerCase());

        const matchesPaymentMethod =
          !filters.payment_method ||
          (client.payment_method &&
            client.payment_method
              .toLowerCase()
              .includes(filters.payment_method.toLowerCase()));

        const matchesCategory =
          !filters.category ||
          (client.category &&
            client.category
              .toLowerCase()
              .includes(filters.category.toLowerCase()));

        const matchesPSP =
          !filters.psp ||
          (Array.isArray(client.psps) &&
            client.psps.some(psp =>
              psp.toLowerCase().includes(filters.psp.toLowerCase())
            ));

        const matchesCurrency =
          !filters.currency ||
          (Array.isArray(client.currencies) &&
            client.currencies.some(currency =>
              currency.toLowerCase().includes(filters.currency.toLowerCase())
            ));

        return (
          matchesSearch &&
          matchesClientName &&
          matchesPaymentMethod &&
          matchesCategory &&
          matchesPSP &&
          matchesCurrency
        );
      })
    : [];

  // Clients are displayed in chronological order (newest transactions first)
  const sortedClients = filteredClients;

  // Calculate summary metrics - use data when available, regardless of loading state
  const totalVolume = Array.isArray(filteredClients) && filteredClients.length > 0
    ? filteredClients.reduce((sum, client) => sum + client.total_amount, 0)
    : Array.isArray(clients) && clients.length > 0
    ? clients.reduce((sum, client) => sum + client.total_amount, 0)
    : 0;
  
  const totalCommissions = Array.isArray(filteredClients) && filteredClients.length > 0
    ? filteredClients.reduce((sum, client) => sum + client.total_commission, 0)
    : Array.isArray(clients) && clients.length > 0
    ? clients.reduce((sum, client) => sum + client.total_commission, 0)
    : 0;
    
  const totalTransactions = Array.isArray(filteredClients) && filteredClients.length > 0
    ? filteredClients.reduce((sum, client) => sum + client.transaction_count, 0)
    : Array.isArray(clients) && clients.length > 0
    ? clients.reduce((sum, client) => sum + client.transaction_count, 0)
    : 0;

  // Debug logging for commission calculation
  console.log('🔍 Commission Debug:', {
    activeTab,
    clientsLength: clients.length,
    filteredClientsLength: filteredClients.length,
    totalCommissions,
    sampleClient: filteredClients[0] ? {
      name: filteredClients[0].client_name,
      commission: filteredClients[0].total_commission
    } : 'No clients',
    allCommissions: filteredClients.map(c => ({ name: c.client_name, commission: c.total_commission }))
  });

  const avgTransactionValue =
    totalTransactions > 0 ? totalVolume / totalTransactions : 0;

  // Calculate deposit and withdrawal metrics from transactions - make it reactive
  const depositWithdrawMetrics = useMemo(() => {
    if (!Array.isArray(transactions)) {
      console.log('🔄 Clients: No transactions array available for deposit/withdrawal calculation');
      return { totalDeposits: 0, totalWithdrawals: 0 };
    }
    
    console.log('🔄 Clients: Calculating deposit/withdrawal metrics from', transactions.length, 'transactions');
    
    // Handle both category formats: 'DEP'/'WD' and 'Deposit'/'Withdraw'
    const deposits = transactions.filter(t => 
      t.category === 'DEP' || t.category === 'Deposit' || t.category === 'Investment'
    );
    const withdrawals = transactions.filter(t => 
      t.category === 'WD' || t.category === 'Withdraw' || t.category === 'Withdrawal'
    );
    
    console.log('🔄 Clients: Found', deposits.length, 'deposits and', withdrawals.length, 'withdrawals');
    
    const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    console.log('🔄 Clients: Calculated totals - Deposits:', totalDeposits, 'Withdrawals:', totalWithdrawals);
    
    return { totalDeposits, totalWithdrawals };
  }, [transactions]); // Make it reactive to transactions changes

  const { totalDeposits, totalWithdrawals } = depositWithdrawMetrics;

  // Debug logging for overview cards
  console.log('🔄 Clients: Overview cards data:', {
    transactionsLength: transactions.length,
    totalDeposits,
    totalWithdrawals,
    netCash: totalDeposits - totalWithdrawals,
    clientsLength: clients.length,
    totalTransactions,
    activeTab
  });

  // Calculate payment method breakdown - make it reactive
  const paymentMethodBreakdown = useMemo(() => {
    if (!Array.isArray(transactions)) return {};
    
    const breakdown: { [key: string]: { deposits: number; withdrawals: number; total: number } } = {};
    
    transactions.forEach(transaction => {
      const method = transaction.payment_method || 'Unknown';
      
      if (!breakdown[method]) {
        breakdown[method] = { deposits: 0, withdrawals: 0, total: 0 };
      }
      
      if (transaction.category === 'DEP' || transaction.category === 'Deposit' || transaction.category === 'Investment') {
        breakdown[method].deposits += transaction.amount || 0;
        breakdown[method].total += transaction.amount || 0;
      } else if (transaction.category === 'WD' || transaction.category === 'Withdraw' || transaction.category === 'Withdrawal') {
        breakdown[method].withdrawals += transaction.amount || 0;
        breakdown[method].total -= transaction.amount || 0;
      }
    });
    
    return breakdown;
  }, [transactions]); // Make it reactive to transactions changes

  // Calculate daily deposit and withdrawal metrics for the selected date
  const calculateDailyDepositWithdrawMetrics = (date: string) => {
    // Use backend data if available (from Daily Summary API)
    if (dailySummaryData && dailySummaryData.date === date) {
      return {
        totalDeposits: dailySummaryData.total_deposits_tl || 0,
        totalWithdrawals: dailySummaryData.total_withdrawals_tl || 0,
        transactionCount: dailySummaryData.transaction_count || 0,
        uniqueClients: dailySummaryData.unique_clients || 0
      };
    }
    
    // Fallback to local calculation if backend data not available
    if (!Array.isArray(transactions)) return { totalDeposits: 0, totalWithdrawals: 0, transactionCount: 0, uniqueClients: 0 };
    
    const dateTransactions = transactions.filter(t => {
      const transactionDate = t.date ? t.date.split('T')[0] : null;
      return transactionDate === date;
    });
    
    // Handle both category formats: 'DEP'/'WD' and 'Deposit'/'Withdraw'
    const deposits = dateTransactions.filter(t => 
      t.category === 'DEP' || t.category === 'Deposit' || t.category === 'Investment'
    );
    const withdrawals = dateTransactions.filter(t => 
      t.category === 'WD' || t.category === 'Withdraw' || t.category === 'Withdrawal'
    );
    
    // Use original amounts since we now have automatic rate conversion from backend
    const totalDeposits = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate transaction count and unique clients from the same filtered transactions
    const transactionCount = dateTransactions.length;
    const uniqueClients = new Set(dateTransactions.map(t => t.client_name).filter(name => name)).size;
    
    return { totalDeposits, totalWithdrawals, transactionCount, uniqueClients };
  };

  // Calculate daily payment method breakdown for the selected date
  const calculateDailyPaymentMethodBreakdown = (date: string) => {
    if (!Array.isArray(transactions)) return {};
    
    const dateTransactions = transactions.filter(t => {
      const transactionDate = t.date ? t.date.split('T')[0] : null;
      return transactionDate === date;
    });
    
    const breakdown: { [key: string]: { deposits: number; withdrawals: number; total: number } } = {};
    
    dateTransactions.forEach(transaction => {
      const method = transaction.payment_method || 'Unknown';
      const amount = transaction.amount || 0; // Use original amount since we have automatic conversion
      
      if (!breakdown[method]) {
        breakdown[method] = { deposits: 0, withdrawals: 0, total: 0 };
      }
      
      if (transaction.category === 'DEP' || transaction.category === 'Deposit' || transaction.category === 'Investment') {
        breakdown[method].deposits += amount;
        breakdown[method].total += amount;
      } else if (transaction.category === 'WD' || transaction.category === 'Withdraw' || transaction.category === 'Withdrawal') {
        breakdown[method].withdrawals += amount;
        breakdown[method].total -= amount;
      }
    });
    
    return breakdown;
  };


  // Daily Summary Functions
  const fetchDailySummary = async (date: string) => {
    try {
      setDailySummaryLoading(true);
      setSelectedDate(date);
      
      const response = await api.get(`/api/summary/${date}`);
      
      if (response.ok) {
        const data = await api.parseResponse(response);
        console.log('🔍 Daily Summary Data Received:', data);
        console.log('🔍 PSP Summary Data:', data.psp_summary);
        setDailySummaryData(data);
        setShowDailySummaryModal(true);
      } else {
        // Create empty summary for dates without data
        const emptySummary: DailySummary = {
          date: date,
          date_str: new Date(date).toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          }),
          usd_rate: null,
          total_amount_tl: 0,
          total_amount_usd: 0,
          total_commission_tl: 0,
          total_commission_usd: 0,
          total_net_tl: 0,
          total_net_usd: 0,
          transaction_count: 0,
          unique_clients: 0,
          psp_summary: [],
          category_summary: [],
          payment_method_summary: [],
          transactions: []
        };
        setDailySummaryData(emptySummary);
        setShowDailySummaryModal(true);
      }
    } catch (error) {
      console.error('Error fetching daily summary:', error);
      // Show empty summary on error
      const emptySummary: DailySummary = {
        date: date,
        date_str: new Date(date).toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        usd_rate: null,
        total_amount_tl: 0,
        total_amount_usd: 0,
        total_commission_tl: 0,
        total_commission_usd: 0,
        total_net_tl: 0,
        total_net_usd: 0,
        transaction_count: 0,
        unique_clients: 0,
        psp_summary: [],
        category_summary: [],
        payment_method_summary: [],
        transactions: []
      };
      setDailySummaryData(emptySummary);
      setShowDailySummaryModal(true);
    } finally {
      setDailySummaryLoading(false);
    }
  };

  const closeDailySummaryModal = () => {
    setShowDailySummaryModal(false);
    setDailySummaryData(null);
    setSelectedDate('');
  };

  // Function to detect foreign currencies in daily transactions
  // const detectForeignCurrencies = (date: string): string[] => { ... }
  // Function to check if exchange rates are needed
  // const needsExchangeRates = (date: string): boolean => { ... }
  // Function to get missing exchange rates
  // const getMissingExchangeRates = (date: string): string[] => { ... }
  // Function to save exchange rates
  // const saveExchangeRates = async () => { ... }
  // Function to calculate amounts with exchange rates
  // const calculateAmountWithRates = (amount: number, currency: string): number => { ... }
  // Function to calculate daily metrics with exchange rates
  // const calculateDailyMetricsWithRates = (date: string) => { ... }

  // Chart data preparation functions
  const prepareTransactionVolumeData = () => {
    const monthlyData = transactions.reduce((acc, transaction) => {
      if (!transaction.date) return acc; // Skip transactions without dates
      
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          month: monthKey,
          deposits: 0,
          withdrawals: 0,
          net: 0,
          count: 0
        };
      }
      
      if (transaction.amount > 0) {
        acc[monthKey].deposits += transaction.amount;
      } else {
        acc[monthKey].withdrawals += Math.abs(transaction.amount);
      }
      acc[monthKey].net += transaction.amount;
      acc[monthKey].count += 1;
      
      return acc;
    }, {} as Record<string, any>);

    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6); // Last 6 months
  };

  const preparePaymentMethodChartData = () => {
    const methodData = transactions.reduce((acc, transaction) => {
      const method = transaction.payment_method || 'Unknown';
      if (!acc[method]) {
        acc[method] = { method, volume: 0, count: 0 };
      }
      acc[method].volume += Math.abs(transaction.amount);
      acc[method].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(methodData)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5); // Top 5 methods
  };

  const prepareClientPerformanceData = () => {
    return clients
      .map(client => ({
        name: client.client_name,
        volume: client.total_amount,
        transactions: client.transaction_count,
        avgTransaction: client.avg_transaction,
        commission: client.total_commission
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 10); // Top 10 clients
  };

  const prepareCurrencyDistributionData = () => {
    const currencyData = transactions.reduce((acc, transaction) => {
      const currency = transaction.currency || 'Unknown';
      if (!acc[currency]) {
        acc[currency] = { currency, volume: 0, count: 0 };
      }
      acc[currency].volume += Math.abs(transaction.amount);
      acc[currency].count += 1;
      return acc;
    }, {} as Record<string, any>);

    return Object.values(currencyData)
      .sort((a, b) => b.volume - a.volume);
  };

  const preparePSPPerformanceData = () => {
    const pspData = transactions.reduce((acc, transaction) => {
      const psp = transaction.psp || 'Unknown';
      if (!acc[psp]) {
        acc[psp] = { psp, volume: 0, count: 0, success: 0 };
      }
      acc[psp].volume += Math.abs(transaction.amount);
      acc[psp].count += 1;
      // Assume successful if amount is not zero
      if (transaction.amount !== 0) {
        acc[psp].success += 1;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(pspData)
      .map(item => ({
        ...item,
        successRate: item.count > 0 ? (item.success / item.count) * 100 : 0
      }))
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 5); // Top 5 PSPs
  };

  // Chart colors
  const chartColors = {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    light: '#f3f4f6',
    dark: '#1f2937'
  };

  const pieChartColors = [
    chartColors.primary,
    chartColors.secondary,
    chartColors.success,
    chartColors.warning,
    chartColors.danger,
    chartColors.info
  ];

  // Enhanced loading state
  if (authLoading) {
    return <ClientsPageSkeleton />;
  }

  // Error boundary for critical errors
  if (error && !clientsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-16 w-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Application Error
          </h3>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button
            variant="default"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  const fetchClientTransactions = async (clientName: string) => {
    if (clientTransactions[clientName]) return; // Already loaded
    
    setLoadingClientTransactions(prev => ({ ...prev, [clientName]: true }));
    
    try {
      const params = new URLSearchParams();
      params.append('client', clientName);
      params.append('per_page', '100'); // Get all transactions for this client
      
      const response = await api.get(`/api/v1/transactions/?${params.toString()}`);
      
      if (response.ok) {
        const data = await api.parseResponse(response);
        if (data?.transactions) {
          setClientTransactions(prev => ({ ...prev, [clientName]: data.transactions }));
        }
      }
    } catch (error) {
      console.error('Error fetching client transactions:', error);
    } finally {
      setLoadingClientTransactions(prev => ({ ...prev, [clientName]: false }));
    }
  };

  const toggleClientExpansion = (clientName: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientName)) {
      newExpanded.delete(clientName);
    } else {
      newExpanded.add(clientName);
      fetchClientTransactions(clientName);
    }
    setExpandedClients(newExpanded);
  };

  const renderGroupedTransactions = () => {
    const groupedTransactions = groupTransactionsByDate(transactions);

    if (groupedTransactions.length === 0) {
      return (
        <div className='p-8 text-center text-gray-500'>
          No transactions to group by date
        </div>
      );
    }

    return groupedTransactions.map((dateGroup, groupIndex) => (
      <div key={dateGroup.dateKey} className='border-b border-gray-100 last:border-b-0'>
        {/* Enhanced Date Header */}
        <div className='group relative px-6 py-5 bg-gradient-to-r from-slate-50 via-blue-50/30 to-indigo-50/40 border-b border-gray-200/60 hover:from-slate-100 hover:via-blue-50/50 hover:to-indigo-50/60 transition-all duration-300 ease-out'>
          {/* Subtle background pattern */}
          <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 ease-out'></div>
          
          <div className='relative flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {/* Enhanced Date Icon */}
              <div className='relative'>
                <div className='w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-300 ease-out'>
                  <Calendar className='h-5 w-5 text-white' />
                </div>
                {/* Subtle glow effect */}
                <div className='absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-xl opacity-0 group-hover:opacity-20 blur-sm transition-opacity duration-300 ease-out'></div>
              </div>
              
              <div className='space-y-1'>
                {/* Enhanced Date Title */}
                <div className='flex items-center gap-3'>
                  <h4 className='text-xl font-bold text-gray-900 group-hover:text-gray-800 transition-colors duration-200 ease-out'>
                    {formatDateHeader(dateGroup.date)}
                  </h4>
                  {/* Day indicator */}
                  <span className='inline-flex items-center px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full'>
                    {new Date(dateGroup.date).toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                </div>
                
                {/* Enhanced Stats */}
                <div className='flex items-center gap-4 text-sm'>
                  <div className='flex items-center gap-1.5 text-gray-600'>
                    <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                    <span className='font-medium'>{dateGroup.transactions.length}</span>
                    <span className='text-gray-500'>transaction{dateGroup.transactions.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className='flex items-center gap-1.5 text-gray-600'>
                    <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                    <span className='font-medium'>
                      {dateGroup.netBalance ? formatCurrency(dateGroup.netBalance, '₺') : formatCurrency(dateGroup.transactions.reduce((sum, t) => {
                        // Convert to TRY using each transaction's own exchange rate
                        const amount = t.amount || 0;
                        let amountInTRY = amount;
                        
                        if ((t.currency === 'USD' || t.currency === 'EUR') && t.exchange_rate) {
                          // Use transaction's own exchange rate for accurate conversion
                          amountInTRY = amount * t.exchange_rate;
                        } else if (t.currency === 'USD' && !t.exchange_rate) {
                          // Fallback to current USD rate if transaction doesn't have exchange rate
                          amountInTRY = amount * currentUsdRate;
                        }
                        
                        // Apply deposit/withdrawal logic (same as backend)
                        const isWithdrawal = t.category && t.category.toUpperCase() === 'WD';
                        return isWithdrawal ? sum - amountInTRY : sum + amountInTRY;
                      }, 0), '₺')}
                    </span>
                    <span className='text-gray-500'>{dateGroup.netBalance ? 'net balance' : 'total'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Enhanced Action Buttons */}
            <div className='flex items-center gap-3'>
              <Button
                onClick={() => fetchDailySummary(dateGroup.date)}
                disabled={dailySummaryLoading}
                variant="gradient"
                size="sm"
                className="group/btn inline-flex items-center gap-2"
              >
                <BarChart className='h-4 w-4 group-hover/btn:scale-110 transition-transform duration-200 ease-out' />
                {dailySummaryLoading && selectedDate === dateGroup.date ? 'Loading...' : 'Summary'}
              </Button>
              
              {/* Enhanced Transaction Counter */}
              <div className='bg-white/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-gray-200/60 shadow-sm group-hover:shadow-md group-hover:bg-white transition-all duration-200 ease-out'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full'></div>
                  <span className='text-sm font-semibold text-gray-800'>
                    {dateGroup.transactions.length}
                  </span>
                  <span className='text-xs text-gray-500 font-medium'>
                    transaction{dateGroup.transactions.length !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table for this date */}
        <div className='overflow-x-auto border border-gray-200 rounded-lg bg-white shadow-sm'>
          <table className='min-w-full divide-y divide-gray-200' style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Client
                </th>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Company
                </th>

                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Payment Method
                </th>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Category
                </th>
                <th className='px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Amount
                </th>
                <th className='px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Commission
                </th>
                <th className='px-6 py-4 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Net Amount
                </th>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Currency
                </th>
                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  PSP
                </th>
                <th className='px-6 py-4 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider w-1/12 border-b border-gray-200'>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {dateGroup.transactions.map((transaction) => (
                <tr key={transaction.id} className='hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300 ease-in-out cursor-pointer'>
                  <td className='px-6 py-4 whitespace-nowrap border-b border-gray-100'>
                    <div className='flex items-center'>
                      <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mr-3'>
                        <User className='h-4 w-4 text-gray-600' />
                      </div>
                      <div className='text-sm font-medium text-gray-900'>
                        {transaction.client_name || 'Unknown'}
                      </div>
                    </div>
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100'>
                    {transaction.company || 'N/A'}
                  </td>

                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100'>
                    {transaction.payment_method || 'N/A'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100'>
                    {transaction.category || 'N/A'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right border-b border-gray-100'>
                    {formatCurrencyPositive(transaction.amount || 0, transaction.currency)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600 text-right border-b border-gray-100'>
                    {formatCurrencyPositive(transaction.commission || 0, transaction.currency)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-600 text-right border-b border-gray-100'>
                    {formatCurrencyPositive(transaction.net_amount || 0, transaction.currency)}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100'>
                    {transaction.currency || 'N/A'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900 border-b border-gray-100'>
                    {transaction.psp || 'N/A'}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap text-center border-b border-gray-100'>
                    <div className='flex items-center justify-center gap-1'>
                      <Button
                        onClick={() => handleViewTransaction(transaction)}
                        variant="ghost"
                        size="icon-sm"
                        className='text-gray-600 hover:text-gray-900'
                        title='View Details'
                      >
                        <Eye className='h-3 w-3' />
                      </Button>
                      <Button
                        onClick={() => handleEditTransaction(transaction)}
                        variant="ghost"
                        size="icon-sm"
                        className='text-green-600 hover:text-green-900'
                        title='Edit Transaction'
                      >
                        <Edit className='h-3 w-3' />
                      </Button>
                      <Button
                        onClick={() => handleDeleteTransaction(transaction)}
                        variant="ghost"
                        size="icon-sm"
                        className='text-red-600 hover:text-red-900'
                        title='Delete Transaction'
                      >
                        <Trash2 className='h-3 w-3' />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    ));
  };

  // Template download function
  const downloadTemplate = (type: 'essential' | 'full', format: 'csv' | 'xlsx') => {
    if (type === 'essential') {
      if (format === 'csv') {
        // Download essential CSV template
        const csvContent = `Client,Company,Payment Method,Category,Amount,Currency,PSP,Date
John Doe,ABC Corporation,Credit Card,DEP,1000.50,USD,Stripe,2025-08-18
Jane Smith,XYZ Ltd,Bank Transfer,WIT,2500.00,EUR,PayPal,2025-08-19
Mike Johnson,Global Inc,TR1122334455,Wire Transfer,DEP,5000.00,GBP,Bank of America,2025-08-20`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'essential_transaction_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download essential Excel template
        const essentialData = [
          ['Client', 'Company', 'Payment Method', 'Category', 'Amount', 'Currency', 'PSP', 'Date'],
          ['John Doe', 'ABC Corporation', 'Credit Card', 'DEP', 1000.50, 'USD', 'Stripe', '2025-08-18'],
          ['Jane Smith', 'XYZ Ltd', 'Bank Transfer', 'WIT', 2500.00, 'EUR', 'PayPal', '2025-08-19'],
          ['Mike Johnson', 'Global Inc', 'TR1122334455', 'Wire Transfer', 'DEP', 5000.00, 'GBP', 'Bank of America', '2025-08-20']
        ];
        
        const worksheet = XLSX.utils.aoa_to_sheet(essentialData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        
        XLSX.writeFile(workbook, 'essential_transaction_template.xlsx');
      }
    } else {
      if (format === 'csv') {
        // Download full CSV template
        const csvContent = `Client,Company,Payment Method,Category,Amount,Commission,Net Amount,Currency,PSP,Date,Notes
John Doe,ABC Corporation,Credit Card,DEP,1000.50,25.00,975.50,USD,Stripe,2025-08-18,Monthly payment
Jane Smith,XYZ Ltd,Bank Transfer,WIT,2500.00,50.00,2450.00,EUR,PayPal,2025-08-19,Quarterly transfer
Mike Johnson,Global Inc,TR1122334455,Wire Transfer,DEP,5000.00,100.00,4900.00,GBP,Bank of America,2025-08-20,Annual deposit`;
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'full_transaction_template.csv';
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        // Download full Excel template
        const fullData = [
          ['Client', 'Company', 'Payment Method', 'Category', 'Amount', 'Commission', 'Net Amount', 'Currency', 'PSP', 'Date', 'Notes'],
          ['John Doe', 'ABC Corporation', 'Credit Card', 'DEP', 1000.50, 25.00, 975.50, 'USD', 'Stripe', '2025-08-18', 'Monthly payment'],
          ['Jane Smith', 'XYZ Ltd', 'Bank Transfer', 'WIT', 2500.00, 50.00, 2450.00, 'EUR', 'PayPal', '2025-08-19', 'Quarterly transfer'],
          ['Mike Johnson', 'Global Inc', 'TR1122334455', 'Wire Transfer', 'DEP', 5000.00, 100.00, 4900.00, 'GBP', 'Bank of America', '2025-08-20', 'Annual deposit']
        ];
        
        const worksheet = XLSX.utils.aoa_to_sheet(fullData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        
        XLSX.writeFile(workbook, 'full_transaction_template.xlsx');
      }
    }
  };

  // Handle tab change and save to localStorage
  const handleTabChange = (value: string) => {
    const newTab = value as 'overview' | 'transactions' | 'analytics' | 'clients' | 'accounting';
    console.log('🔄 Clients page - Tab change:', newTab, 'Previous tab:', activeTab);
    setActiveTab(newTab);
    
    // Save tab state to localStorage for persistence across page reloads
    localStorage.setItem('clients-page-active-tab', newTab);
  };

  // Handle page change with loading state
  const handlePageChange = (newPage: number) => {
    console.log('🔄 Clients page - Page change:', newPage);
    setPaginationLoading(true);
    setIsChangingPagination(true);
    setPagination(prev => ({ ...prev, page: newPage }));
    
    // Clear the flag after a short delay
    setTimeout(() => setIsChangingPagination(false), 100);
    
    // Set a timeout to prevent stuck loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    const timeout = setTimeout(() => {
      console.log('🔄 Loading timeout reached, clearing loading states');
      setPaginationLoading(false);
      setLoading(false);
    }, 10000); // 10 second timeout
    setLoadingTimeout(timeout);
  };

  // Handle items per page change
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    console.log('🔄 Clients page - Items per page change:', newItemsPerPage);
    setPaginationLoading(true);
    setIsChangingPagination(true);
    setPagination(prev => ({ 
      ...prev, 
      per_page: newItemsPerPage, 
      page: 1 // Reset to first page when changing page size
    }));
    
    // Clear the flag after a short delay
    setTimeout(() => setIsChangingPagination(false), 100);
    
    // Set a timeout to prevent stuck loading states
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
    }
    const timeout = setTimeout(() => {
      console.log('🔄 Loading timeout reached, clearing loading states');
      setPaginationLoading(false);
      setLoading(false);
    }, 10000); // 10 second timeout
    setLoadingTimeout(timeout);
  };

  // Loading state
  if (loading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading clients...</p>
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
            { label: 'Clients', current: true }
          ]} 
        />
      </div>

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-gray-600" />
              {t('clients.title')}
              </h1>
              <p className="text-gray-600">{t('clients.description')}</p>
            </div>
            <div className="flex items-center gap-3">
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={handleExport}
                icon={<Download className="h-4 w-4" />}
                iconPosition="left"
              >
                {t('clients.export')}
              </UnifiedButton>
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={triggerFileInput}
                disabled={importing}
                icon={<Upload className="h-4 w-4" />}
                iconPosition="left"
                className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
              >
                {importing ? 'Importing...' : 'Import'}
              </UnifiedButton>
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={() => setShowImportGuide(true)}
                icon={<Info className="h-4 w-4" />}
                iconPosition="left"
                className="bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Guide
              </UnifiedButton>
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={() => setShowBulkDeleteModal(true)}
                icon={<Trash2 className="h-4 w-4" />}
                iconPosition="left"
                className="bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
              >
                Bulk
              </UnifiedButton>
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={() => {
                  // BRate functionality removed - button kept for visual consistency
                }}
                icon={<TrendingUp className="h-4 w-4" />}
                iconPosition="left"
                className="bg-gray-50 border-gray-300 text-gray-500 cursor-not-allowed opacity-60"
                disabled
              >
                BRate
              </UnifiedButton>
              <UnifiedButton
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    console.log('🔄 Starting data refresh...');
                    
                    // Refresh all data from database sequentially to avoid conflicts
                    console.log('📊 Fetching clients...');
                    await fetchClients();
                    
                    console.log('💳 Fetching transactions...');
                    await fetchTransactions();
                    
                    console.log('🏦 Refreshing PSP data...');
                    await refreshPSPData();
                    
                    console.log('✅ Data refreshed successfully');
                    alert('Data refreshed successfully!');
                  } catch (error: unknown) {
                    console.error('❌ Error refreshing data:', error);
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    console.error('❌ Error details:', errorMessage);
                    alert(`Error refreshing data: ${errorMessage}`);
                  }
                }}
                icon={<RefreshCw className="h-4 w-4" />}
                iconPosition="left"
                className="bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                Fetch
              </UnifiedButton>
              <UnifiedButton
                variant="primary"
                size="sm"
                onClick={() => navigate('/transactions/add')}
                icon={<Plus className="h-4 w-4" />}
                iconPosition="left"
              >
                Add Transaction
              </UnifiedButton>
            </div>
          </div>
        </div>

      <div className="space-y-6">

      

      {/* Status Indicators */}
      <div className="bg-gray-50/50 border border-gray-200/60 rounded-xl p-4">
        <div className='flex items-center gap-6 text-sm text-gray-700'>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                            <span className="font-medium">{t('dashboard.active_clients')}: {clients.length}</span>
          </div>
          <div className='flex items-center gap-2'>
            <div className='w-2 h-2 bg-gray-500 rounded-full'></div>
            <span className="font-medium">Total Volume: {formatCurrency(totalVolume, '₺')}</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className={`grid w-full grid-cols-5 bg-gray-50/80 border border-gray-200/60 ${getRadius('md')} shadow-sm`}>
          <TabsTrigger value="overview" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <BarChart3 className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <Users className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Info</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <FileText className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Transactions</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <LineChart className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="accounting" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
            <DollarSign className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
            <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Accounting</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
          {/* Professional Financial Metrics Section */}
          <UnifiedCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-gray-600" />
                Financial Overview
              </CardTitle>
              <CardDescription>
                Key financial metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Deposit"
                value={formatCurrency(totalDeposits, '₺')}
                subtitle="DEP Transactions"
                icon={TrendingUp}
                color="green"
              />
              
              <MetricCard
                title="Total Withdraw"
                value={formatCurrency(Math.abs(totalWithdrawals), '₺')}
                subtitle="WD Transactions"
                icon={TrendingDown}
                color="red"
              />
              
              <MetricCard
                title="Net Cash"
                value={formatCurrency(totalDeposits - totalWithdrawals, '₺')}
                subtitle="Tot DEP - Tot WD"
                icon={DollarSign}
                color={totalDeposits - totalWithdrawals >= 0 ? "gray" : "red"}
              />
              
              <MetricCard
                title="Total Commissions"
                value={formatCurrency(totalCommissions, '₺')}
                subtitle="All paid commissions"
                icon={FileText}
                color="purple"
              />
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Client Distribution and Top Performers */}
          <UnifiedCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-600" />
                Client Insights
              </CardTitle>
              <CardDescription>
                Distribution and top performers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <MetricCard
                title="Client Distribution"
                value={clients.length}
                subtitle={`${clients.filter(c => Array.isArray(c.currencies) && c.currencies.length > 1).length} multi-currency`}
                icon={Users}
                color="gray"
              />

              <MetricCard
                title="Top Performers"
                value={filteredClients.length > 0 ? filteredClients.reduce((max, client) => client.total_amount > max.total_amount ? client : max).client_name : 'N/A'}
                subtitle={`Most transactions: ${filteredClients.length > 0 ? filteredClients.reduce((max, client) => client.transaction_count > max.transaction_count ? client : max).client_name : 'N/A'}`}
                icon={Award}
                color="purple"
              />
              </div>
            </CardContent>
          </UnifiedCard>

          {/* Payment Method Breakdown */}
          <UnifiedCard variant="elevated" className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-600" />
                Payment Method Analysis
              </CardTitle>
              <CardDescription>
                Payment method breakdown
              </CardDescription>
            </CardHeader>
            <CardContent>
            {Object.keys(paymentMethodBreakdown).length > 0 ? (
              <div className='space-y-4'>
                {Object.entries(paymentMethodBreakdown)
                  .sort(([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total))
                  .map(([method, data]) => (
                    <div key={method} className='bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors duration-200'>
                      <div className='flex items-center justify-between mb-3'>
                        <h4 className='text-lg font-semibold text-gray-900'>
                          {method}
                        </h4>
                        <div className={`text-lg font-bold ${data.total >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {formatCurrency(Math.abs(data.total), '₺')}
                        </div>
                      </div>
                      
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='bg-white rounded-lg p-3 border border-emerald-200'>
                          <div className='flex items-center gap-2 mb-1'>
                            <TrendingUp className='h-4 w-4 text-emerald-600' />
                            <span className='text-sm font-medium text-emerald-700'>Deposits</span>
                          </div>
                          <div className='text-lg font-bold text-emerald-900'>
                            {formatCurrency(data.deposits, '₺')}
                          </div>
                        </div>
                        
                        <div className='bg-white rounded-lg p-3 border border-red-200'>
                          <div className='flex items-center gap-2 mb-1'>
                            <TrendingUp className='h-4 w-4 text-red-600 rotate-180' />
                            <span className='text-sm font-medium text-red-700'>Withdrawals</span>
                          </div>
                          <div className='text-lg font-bold text-red-900'>
                            {formatCurrency(data.withdrawals, '₺')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className='text-center py-8'>
                <CreditCard className='h-12 w-12 text-gray-400 mx-auto mb-4' />
                <p className='text-gray-500'>No payment method data available</p>
              </div>
            )}
            </CardContent>
          </UnifiedCard>

        </TabsContent>

        <TabsContent value="transactions" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
          {/* Transactions Header Section */}
          <UnifiedCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-3">
                      Transaction Management
                      <UnifiedBadge variant="secondary" size="sm" className="bg-gray-100 text-gray-800">
                        Enhanced Filters Available
                      </UnifiedBadge>
                    </CardTitle>
              <CardDescription>All transaction records</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Prominent Filter Button */}
                  <UnifiedButton
                    variant={showFilters ? "primary" : "outline"}
                    onClick={() => setShowFilters(!showFilters)}
                    icon={<Filter className="h-4 w-4" />}
                    className={`transition-all duration-200 ${
                      showFilters 
                        ? 'bg-gray-600 hover:bg-gray-700 text-white shadow-lg' 
                        : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'
                    }`}
                  >
                    {showFilters ? 'Hide Filters' : `Show Filters${getActiveFilterCount() > 0 ? ` (${getActiveFilterCount()})` : ''}`}
                  </UnifiedButton>
                </div>
              </div>
            </CardHeader>
            <CardContent>
            
            {/* Comprehensive Filter Card */}
            {showFilters && (
              <div className="mb-6 animate-in slide-in-from-top-4 duration-300">
                <UnifiedCard variant="outlined" className="overflow-hidden shadow-lg border-gray-200">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-50 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Filter className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg font-semibold text-gray-900">
                            Advanced Transaction Filters
                          </CardTitle>
                          <CardDescription className="text-gray-600">
                            Refine your search with comprehensive filtering options
                            {getActiveFilterCount() > 0 && (
                              <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                {getActiveFilterCount()} active
                              </span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getActiveFilterCount() > 0 && (
                          <UnifiedButton
                            variant="ghost"
                            size="sm"
                            onClick={clearAllFilters}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Clear All
                          </UnifiedButton>
                        )}
                        <UnifiedButton
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowFilters(false)}
                          icon={<X className="h-4 w-4" />}
                        >
                          Close
                        </UnifiedButton>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-6">
                      {/* Quick Filters */}
                      <div className="space-y-4">
                        <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          Quick Filters
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          <UnifiedButton
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickFilter('today')}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            Today
                          </UnifiedButton>
                          <UnifiedButton
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickFilter('thisWeek')}
                            className="text-gray-600 hover:text-gray-700 hover:bg-gray-50"
                          >
                            This Week
                          </UnifiedButton>
                          <UnifiedButton
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickFilter('deposits')}
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                          >
                            Deposits Only
                          </UnifiedButton>
                          <UnifiedButton
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickFilter('withdrawals')}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Withdrawals Only
                          </UnifiedButton>
                          <UnifiedButton
                            variant="outline"
                            size="sm"
                            onClick={() => applyQuickFilter('highValue')}
                            className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                          >
                            High Value (10K+)
                          </UnifiedButton>
                        </div>
                      </div>

                      {/* Basic Filters Section */}
                      <div className="space-y-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFilterSection('basic')}
                        >
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${expandedFilterSections.basic ? 'bg-gray-500' : 'bg-gray-300'}`}></div>
                            Basic Filters
                          </h3>
                          <div className="flex items-center gap-2">
                            {(filters.search || filters.category || filters.status) && (
                              <UnifiedBadge variant="secondary" size="sm">
                                {(filters.search ? 1 : 0) + (filters.category ? 1 : 0) + (filters.status ? 1 : 0)} active
                              </UnifiedBadge>
                            )}
                            <div className={`transform transition-transform ${expandedFilterSections.basic ? 'rotate-90' : ''}`}>
                              <ArrowUpRight className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                        
                        {expandedFilterSections.basic && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                            <FormField label="Search">
                              <Input
                                placeholder="Search transactions..."
                                variant="default"
                                size="default"
                                value={filters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                              />
                            </FormField>
                            <FormField label="Category">
                              <Select
                  value={filters.category}
                                onValueChange={value => handleFilterChange('category', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All Categories</SelectItem>
                                  <SelectItem value="DEP">Deposit (DEP)</SelectItem>
                                  <SelectItem value="WD">Withdrawal (WD)</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Status">
                              <Select
                                value={filters.status}
                                onValueChange={value => handleFilterChange('status', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All Status</SelectItem>
                                  <SelectItem value="completed">Completed</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="failed">Failed</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                        )}
                      </div>

                      {/* Advanced Filters Section */}
                      <div className="space-y-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFilterSection('advanced')}
                        >
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${expandedFilterSections.advanced ? 'bg-purple-500' : 'bg-gray-300'}`}></div>
                            Advanced Filters
                          </h3>
                          <div className="flex items-center gap-2">
                            {(filters.psp || filters.company || filters.payment_method || filters.currency) && (
                              <UnifiedBadge variant="secondary" size="sm">
                                {(filters.psp ? 1 : 0) + (filters.company ? 1 : 0) + (filters.payment_method ? 1 : 0) + (filters.currency ? 1 : 0)} active
                              </UnifiedBadge>
                            )}
                            <div className={`transform transition-transform ${expandedFilterSections.advanced ? 'rotate-90' : ''}`}>
                              <ArrowUpRight className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                        
                        {expandedFilterSections.advanced && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-4">
                            <FormField label="PSP">
                              <Select
                                value={filters.psp}
                                onValueChange={value => handleFilterChange('psp', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All PSPs" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All PSPs</SelectItem>
                                {dropdownOptions.psps.map((psp: string) => (
                                    <SelectItem key={psp} value={psp}>{psp}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Company">
                              <Select
                                value={filters.company}
                                onValueChange={value => handleFilterChange('company', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All Companies" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All Companies</SelectItem>
                                {dropdownOptions.companies.map((company: string) => (
                                    <SelectItem key={company} value={company}>{company}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Payment Method">
                              <Select
                                value={filters.payment_method}
                                onValueChange={value => handleFilterChange('payment_method', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All Methods" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All Methods</SelectItem>
                                {dropdownOptions.payment_methods.map((method: string) => (
                                    <SelectItem key={method} value={method}>{method}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Currency">
                              <Select
                                value={filters.currency}
                                onValueChange={value => handleFilterChange('currency', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="All Currencies" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="">All Currencies</SelectItem>
                                {dropdownOptions.currencies.map((currency: string) => (
                                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                                ))}
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                        )}
                      </div>

                      {/* Amount Filters Section */}
                      <div className="space-y-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFilterSection('amounts')}
                        >
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${expandedFilterSections.amounts ? 'bg-emerald-500' : 'bg-gray-300'}`}></div>
                            Amount Filters
                          </h3>
                          <div className="flex items-center gap-2">
                            {(filters.amount_min || filters.amount_max || filters.commission_min || filters.commission_max) && (
                              <UnifiedBadge variant="secondary" size="sm">
                                {(filters.amount_min ? 1 : 0) + (filters.amount_max ? 1 : 0) + (filters.commission_min ? 1 : 0) + (filters.commission_max ? 1 : 0)} active
                              </UnifiedBadge>
                            )}
                            <div className={`transform transition-transform ${expandedFilterSections.amounts ? 'rotate-90' : ''}`}>
                              <ArrowUpRight className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                        
                        {expandedFilterSections.amounts && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Min Amount</label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={filters.amount_min}
                                onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Max Amount</label>
                              <Input
                                type="number"
                                placeholder="1000000.00"
                                value={filters.amount_max}
                                onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Min Commission</label>
                              <Input
                                type="number"
                                placeholder="0.00"
                                value={filters.commission_min}
                                onChange={(e) => handleFilterChange('commission_min', e.target.value)}
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-gray-700">Max Commission</label>
                              <Input
                                type="number"
                                placeholder="10000.00"
                                value={filters.commission_max}
                                onChange={(e) => handleFilterChange('commission_max', e.target.value)}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date & Sorting Section */}
                      <div className="space-y-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => toggleFilterSection('dates')}
                        >
                          <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${expandedFilterSections.dates ? 'bg-orange-500' : 'bg-gray-300'}`}></div>
                            Date & Sorting
                          </h3>
                          <div className="flex items-center gap-2">
                            {(filters.date_from || filters.date_to || filters.sort_by !== 'created_at' || filters.sort_order !== 'desc') && (
                              <UnifiedBadge variant="secondary" size="sm">
                                {(filters.date_from ? 1 : 0) + (filters.date_to ? 1 : 0) + (filters.sort_by !== 'created_at' ? 1 : 0) + (filters.sort_order !== 'desc' ? 1 : 0)} active
                              </UnifiedBadge>
                            )}
                            <div className={`transform transition-transform ${expandedFilterSections.dates ? 'rotate-90' : ''}`}>
                              <ArrowUpRight className="h-4 w-4 text-gray-500" />
                            </div>
                          </div>
                        </div>
                        
                        {expandedFilterSections.dates && (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pl-4">
                            <FormField label="From Date">
                              <Input
                                type="date"
                                variant="default"
                                size="default"
                                value={filters.date_from}
                                onChange={(e) => handleFilterChange('date_from', e.target.value)}
                              />
                            </FormField>
                            <FormField label="To Date">
                              <Input
                                type="date"
                                variant="default"
                                size="default"
                                value={filters.date_to}
                                onChange={(e) => handleFilterChange('date_to', e.target.value)}
                              />
                            </FormField>
                            <FormField label="Sort By">
                              <Select
                                value={filters.sort_by}
                                onValueChange={value => handleFilterChange('sort_by', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="Sort By" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="created_at">Date Created</SelectItem>
                                  <SelectItem value="amount">Amount</SelectItem>
                                  <SelectItem value="commission">Commission</SelectItem>
                                  <SelectItem value="client_name">Client Name</SelectItem>
                                  <SelectItem value="psp">PSP</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                            <FormField label="Sort Order">
                              <Select
                                value={filters.sort_order}
                                onValueChange={value => handleFilterChange('sort_order', value)}
                              >
                                <SelectTrigger variant="default" size="default">
                                  <SelectValue placeholder="Sort Order" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="desc">Descending</SelectItem>
                                  <SelectItem value="asc">Ascending</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormField>
                          </div>
                        )}
                      </div>

                      {/* Active Filters Summary */}
                      {getActiveFilterCount() > 0 && (
                        <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h4 className="text-sm font-medium text-gray-900">Active Filters</h4>
                          <div className="flex flex-wrap gap-2">
                            {filters.search && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-gray-100 text-gray-800">
                                Search: "{filters.search}"
                              </UnifiedBadge>
                            )}
                {filters.category && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-green-100 text-green-800">
                                Category: {filters.category}
                              </UnifiedBadge>
                            )}
                            {filters.psp && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-purple-100 text-purple-800">
                                PSP: {filters.psp}
                              </UnifiedBadge>
                            )}
                            {filters.company && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-orange-100 text-orange-800">
                                Company: {filters.company}
                              </UnifiedBadge>
                            )}
                            {filters.payment_method && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-indigo-100 text-indigo-800">
                                Method: {filters.payment_method}
                              </UnifiedBadge>
                            )}
                            {filters.currency && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-cyan-100 text-cyan-800">
                                Currency: {filters.currency}
                              </UnifiedBadge>
                            )}
                            {filters.status && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-yellow-100 text-yellow-800">
                                Status: {filters.status}
                              </UnifiedBadge>
                            )}
                            {filters.date_from && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-gray-100 text-gray-800">
                                From: {filters.date_from}
                              </UnifiedBadge>
                            )}
                            {filters.date_to && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-gray-100 text-gray-800">
                                To: {filters.date_to}
                              </UnifiedBadge>
                            )}
                            {filters.amount_min && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-emerald-100 text-emerald-800">
                                Min: {filters.amount_min}
                              </UnifiedBadge>
                            )}
                            {filters.amount_max && (
                              <UnifiedBadge variant="secondary" size="sm" className="bg-emerald-100 text-emerald-800">
                                Max: {filters.amount_max}
                              </UnifiedBadge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-600">
                          {getActiveFilterCount() > 0 ? (
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                              {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                              No filters applied
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <UnifiedButton
                            variant="outline"
                            onClick={clearAllFilters}
                            disabled={getActiveFilterCount() === 0}
                          >
                            Clear All
                          </UnifiedButton>
                          <UnifiedButton
                            variant="primary"
                    onClick={() => {
                              // Trigger data refresh
                      setPagination(prev => ({ ...prev, page: 1 }));
                              fetchTransactions();
                    }}
                            icon={<RefreshCw className="h-4 w-4" />}
                            iconPosition="left"
                  >
                            Apply Filters
                          </UnifiedButton>
              </div>
            </div>
                    </div>
                  </CardContent>
                </UnifiedCard>
              </div>
            )}
            {loading ? (
              <div className='p-12 text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4'></div>
                <p className='text-gray-600 text-lg'>Loading transactions...</p>
              </div>
            ) : error ? (
              <div className='p-12 text-center'>
                <div className='text-red-500 mb-4'>
                  <AlertCircle className='h-16 w-16 mx-auto' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Error Loading Transactions
                </h3>
                <p className='text-gray-600 mb-6'>{error}</p>
                <Button
                  variant="default"
                  onClick={fetchTransactions}
                  className="flex items-center gap-2"
                >
                  Try Again
                </Button>
              </div>
            ) : transactions.length === 0 ? (
              <div className='p-12 text-center'>
                <div className='text-gray-400 mb-4'>
                  <FileText className='h-16 w-16 mx-auto' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  No Transactions Found
                </h3>
                <p className='text-gray-600'>
                  No transactions are currently available.
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                {renderGroupedTransactions()}

                {/* Summary Footer */}
                <div className='px-6 py-4 border-t border-gray-200 bg-gray-50'>
                  <div className='flex items-center justify-between text-sm text-gray-700'>
                    <div className='flex items-center gap-4'>
                      <span className='font-medium'>
                        {transactions.length} {t('dashboard.total_transactions').toLowerCase()}
                      </span>
                      <span className='text-gray-500'>
                        across {groupTransactionsByDate(transactions).length} date{groupTransactionsByDate(transactions).length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <span className='font-semibold text-gray-900'>
                      Total: {formatCurrency(
                        transactions.reduce((sum, t) => sum + (t.amount || 0), 0),
                        'TL'
                      )}
                    </span>
                  </div>
                </div>

                {/* Professional Pagination */}
                <ProfessionalPagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages || Math.ceil((pagination.total || transactions.length) / pagination.per_page)}
                  totalItems={pagination.total || transactions.length}
                  itemsPerPage={pagination.per_page}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={paginationLoading}
                  showItemsPerPage={true}
                  showJumpToPage={true}
                  itemsPerPageOptions={[25, 50, 100, 200, 300, 500, 1000, 2000, 5000]}
                />
              </div>
            )}

            </CardContent>
          </UnifiedCard>

        </TabsContent>

        <TabsContent value="analytics" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
          {/* Analytics Overview Section */}
          <UnifiedCard>
            <CardHeader>
              <CardTitle>Analytics Overview</CardTitle>
              <CardDescription>Financial and performance insights</CardDescription>
            </CardHeader>
            <CardContent>
            {/* Professional Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Volume Trend Chart */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>Transaction Volume Trend</h3>
                  <div className='flex items-center gap-2 text-sm text-gray-500'>
                    <div className='w-3 h-3 bg-emerald-500 rounded-full'></div>
                    <span>Deposits</span>
                    <div className='w-3 h-3 bg-red-500 rounded-full'></div>
                    <span>Withdrawals</span>
                  </div>
                </div>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <RechartsLineChart data={prepareTransactionVolumeData()}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                      <XAxis 
                        dataKey='month' 
                        stroke='#6b7280'
                        fontSize={12}
                        tickFormatter={(value) => {
                          const [year, month] = value.split('-');
                          return `${month}/${year.slice(2)}`;
                        }}
                      />
                      <YAxis 
                        stroke='#6b7280'
                        fontSize={12}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value, '₺'), '']}
                        labelFormatter={(label) => {
                          const [year, month] = label.split('-');
                          return `${month}/${year}`;
                        }}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line 
                        type='monotone' 
                        dataKey='deposits' 
                        stroke={chartColors.success} 
                        strokeWidth={3}
                        dot={{ fill: chartColors.success, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: chartColors.success, strokeWidth: 2 }}
                      />
                      <Line 
                        type='monotone' 
                        dataKey='withdrawals' 
                        stroke={chartColors.danger} 
                        strokeWidth={3}
                        dot={{ fill: chartColors.danger, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: chartColors.danger, strokeWidth: 2 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Payment Method Distribution Chart */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>Payment Method Distribution</h3>
                  <div className='text-sm text-gray-500'>Volume by Method</div>
                </div>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <RechartsPieChart>
                      <Pie
                        data={preparePaymentMethodChartData()}
                        cx='50%'
                        cy='50%'
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey='volume'
                      >
                        {preparePaymentMethodChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={pieChartColors[index % pieChartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value, '₺'), 'Volume']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend 
                        verticalAlign='bottom' 
                        height={36}
                        formatter={(value) => <span className='text-sm text-gray-700'>{value}</span>}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            </CardContent>
          </UnifiedCard>

          {/* Client Performance and Currency Charts Section */}
          <UnifiedCard>
            <CardHeader>
              <CardTitle>Client & Currency Analysis</CardTitle>
              <CardDescription>Performance and distribution</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Client Performance Chart */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>Top Client Performance</h3>
                  <div className='text-sm text-gray-500'>Volume by Client</div>
                </div>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <RechartsBarChart data={prepareClientPerformanceData()}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                      <XAxis 
                        dataKey='name' 
                        stroke='#6b7280'
                        fontSize={10}
                        angle={-45}
                        textAnchor='end'
                        height={80}
                        tickFormatter={(value) => value.length > 12 ? value.substring(0, 12) + '...' : value}
                      />
                      <YAxis 
                        stroke='#6b7280'
                        fontSize={12}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value, '₺'), 'Volume']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey='volume' 
                        fill={chartColors.primary}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Currency Distribution Chart */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>Currency Distribution</h3>
                  <div className='text-sm text-gray-500'>Volume by Currency</div>
                </div>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <RechartsBarChart data={prepareCurrencyDistributionData()}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                      <XAxis 
                        dataKey='currency' 
                        stroke='#6b7280'
                        fontSize={12}
                      />
                      <YAxis 
                        stroke='#6b7280'
                        fontSize={12}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value, '₺'), 'Volume']}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey='volume' 
                        fill={chartColors.secondary}
                        radius={[4, 4, 0, 0]}
                      />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            </CardContent>
          </UnifiedCard>

          {/* PSP Performance and Recent Activity Section */}
          <UnifiedCard>
            <CardHeader>
              <CardTitle>PSP Performance & Activity</CardTitle>
              <CardDescription>Provider performance metrics and client activity insights</CardDescription>
            </CardHeader>
            <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* PSP Performance Chart */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>PSP Performance</h3>
                  <div className='text-sm text-gray-500'>Volume & Success Rate</div>
                </div>
                <div className='h-64'>
                  <ResponsiveContainer width='100%' height='100%'>
                    <ComposedChart data={preparePSPPerformanceData()}>
                      <CartesianGrid strokeDasharray='3 3' stroke='#f3f4f6' />
                      <XAxis 
                        dataKey='psp' 
                        stroke='#6b7280'
                        fontSize={10}
                        angle={-45}
                        textAnchor='end'
                        height={80}
                      />
                      <YAxis 
                        stroke='#6b7280'
                        fontSize={12}
                        tickFormatter={(value) => formatCurrency(value, '₺')}
                      />
                      <Tooltip 
                        formatter={(value: any, name: string) => [
                          name === 'volume' ? formatCurrency(value, '₺') : `${value.toFixed(1)}%`,
                          name === 'volume' ? 'Volume' : 'Success Rate'
                        ]}
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Bar 
                        dataKey='volume' 
                        fill={chartColors.info}
                        radius={[4, 4, 0, 0]}
                      />
                      <Line 
                        type='monotone' 
                        dataKey='successRate' 
                        stroke={chartColors.warning} 
                        strokeWidth={3}
                        dot={{ fill: chartColors.warning, strokeWidth: 2, r: 4 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Client Activity */}
              <div className='bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-200'>
                <div className='flex items-center justify-between mb-6'>
                  <h3 className='text-lg font-semibold text-gray-900'>Recent Client Activity</h3>
                  <div className='text-sm text-gray-500'>Last 5 {t('dashboard.active_clients')}</div>
                </div>
                <div className='space-y-4'>
                  {clients
                    .filter(client => client.last_transaction)
                    .sort((a, b) => new Date(b.last_transaction).getTime() - new Date(a.last_transaction).getTime())
                    .slice(0, 5)
                    .map((client, index) => (
                      <div key={client.client_name} className='flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-200'>
                        <div className='flex items-center gap-4'>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                            index === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                            index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                            index === 2 ? 'bg-gradient-to-br from-amber-600 to-yellow-600' :
                            'bg-gradient-to-br from-gray-400 to-purple-500'
                          }`}>
                            <User className='h-5 w-5 text-white' />
                          </div>
                          <div>
                            <p className='text-sm font-semibold text-gray-900'>{client.client_name}</p>
                            <p className='text-xs text-gray-500'>Last: {formatDate(client.last_transaction)}</p>
                          </div>
                        </div>
                        <div className='text-right'>
                          <p className='text-sm font-bold text-gray-900'>{formatCurrency(client.total_amount, '₺')}</p>
                          <p className='text-xs text-gray-500'>{client.transaction_count} transactions</p>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            </CardContent>
          </UnifiedCard>

      </TabsContent>

      <TabsContent value="clients" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
          {/* Clients Table */}
          <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
            <div className='px-8 py-6 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center'>
                    <Users className='w-5 h-5 text-gray-600' />
                  </div>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900'>Client Information</h2>
                    <p className='text-sm text-gray-500'>Manage your client relationships and details</p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <Button
                    onClick={() => setShowAddModal(true)}
                    className='bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg flex items-center gap-2'
                  >
                    <Plus className='w-4 h-4' />
                    Add Client
                  </Button>
                </div>
              </div>
            </div>
            <div className='p-8'>
              {loading ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600'></div>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-gray-100'>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Client</th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Company</th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Total Amount</th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Transactions</th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Last Transaction</th>
                        <th className='text-left py-3 px-4 font-medium text-gray-600'>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((client, index) => (
                        <React.Fragment key={index}>
                          <tr className='border-b border-gray-50 hover:bg-gray-50 hover:scale-[1.01] transition-all duration-300 ease-in-out cursor-pointer'>
                            <td className='py-4 px-4'>
                              <div className='flex items-center gap-3'>
                                <div className='w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center'>
                                  <span className='text-sm font-medium text-gray-600'>
                                    {client.client_name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <div className='font-medium text-gray-900'>{client.client_name}</div>
                                  <div className='text-sm text-gray-500'>{client.company_name || 'N/A'}</div>
                                </div>
                              </div>
                            </td>
                            <td className='py-4 px-4'>
                              <div className='text-sm text-gray-900'>{client.company_name || 'N/A'}</div>
                            </td>
                            <td className='py-4 px-4'>
                              <div className='text-sm font-medium text-gray-900'>
                                {formatCurrency(client.total_amount, 'TL')}
                              </div>
                            </td>
                            <td className='py-4 px-4'>
                              <div className='text-sm text-gray-600'>{client.transaction_count}</div>
                            </td>
                            <td className='py-4 px-4'>
                              <div className='text-sm text-gray-600'>
                                {client.last_transaction ? 
                                  new Date(client.last_transaction).toLocaleDateString() : 
                                  'N/A'
                                }
                              </div>
                            </td>
                            <td className='py-4 px-4'>
                              <div className='flex items-center gap-2'>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewClient(client)}
                                  className='text-gray-600 hover:text-gray-700'
                                >
                                  <Eye className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditClient(client)}
                                  className='text-green-600 hover:text-green-700'
                                >
                                  <Edit className='w-4 h-4' />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteClient(client)}
                                  className='text-red-600 hover:text-red-700'
                                >
                                  <Trash2 className='w-4 h-4' />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>


      </TabsContent>

      <TabsContent value="accounting" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
        {/* Accounting Overview Section */}
        <UnifiedCard>
          <CardHeader>
            <CardTitle>Accounting Overview</CardTitle>
            <CardDescription>Financial accounting and reporting tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-green-600">Total Revenue</p>
                    <p className="text-2xl font-bold text-green-900">
                      {formatCurrency(
                        filteredClients.reduce((sum, client) => sum + client.total_amount, 0),
                        'TL'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-green-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>All time revenue</span>
                </div>
              </div>

              {/* Total Commissions */}
              <div className="bg-gradient-to-br from-gray-50 to-indigo-50 rounded-xl p-6 border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-600">Total Commissions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        filteredClients.reduce((sum, client) => sum + client.total_commission, 0),
                        'TL'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>Commission earned</span>
                </div>
              </div>

              {/* Net Profit */}
              <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-purple-600">Net Profit</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {formatCurrency(
                        clients.reduce((sum, client) => sum + client.total_net, 0),
                        'TL'
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-purple-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>After commissions</span>
                </div>
              </div>

              {/* Total Transactions */}
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <FileText className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-orange-600">Total Transactions</p>
                    <p className="text-2xl font-bold text-orange-900">
                      {clients.reduce((sum, client) => sum + client.transaction_count, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-orange-700">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>All transactions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </UnifiedCard>

        {/* Financial Reports Section */}
        <UnifiedCard>
          <CardHeader>
            <CardTitle>Financial Reports</CardTitle>
            <CardDescription>Generate and download financial reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Revenue Report */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Revenue Report</h3>
                    <p className="text-sm text-gray-500">Monthly revenue breakdown</p>
                  </div>
                </div>
                <Button className="w-full" variant="success">
                  Generate Report
                </Button>
              </div>

              {/* Commission Report */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Commission Report</h3>
                    <p className="text-sm text-gray-500">Commission analysis by client</p>
                  </div>
                </div>
                <Button className="w-full" variant="secondary">
                  Generate Report
                </Button>
              </div>

              {/* Profit & Loss */}
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Profit & Loss</h3>
                    <p className="text-sm text-gray-500">P&L statement</p>
                  </div>
                </div>
                <Button className="w-full" variant="default">
                  Generate Report
                </Button>
              </div>
            </div>
          </CardContent>
        </UnifiedCard>

        {/* Client Financial Summary */}
        <UnifiedCard>
          <CardHeader>
            <CardTitle>Client Financial Summary</CardTitle>
            <CardDescription>Financial overview by client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Revenue</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Commission</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Net Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Transactions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((client, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 hover:scale-[1.01] transition-all duration-300 ease-in-out cursor-pointer">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {client.client_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{client.client_name}</div>
                            <div className="text-sm text-gray-500">{client.company_name || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(client.total_amount, 'TL')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-gray-600">
                          {formatCurrency(client.total_commission, 'TL')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm font-medium text-green-600">
                          {formatCurrency(client.total_net, 'TL')}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-600">{client.transaction_count}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </UnifiedCard>
      </TabsContent>
      </Tabs>

      {/* View Client Modal */}
      {showViewModal && selectedClient && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-semibold text-gray-900'>
                  Client Details
                </h3>
                <Button
                  onClick={closeModal}
                  variant="ghost"
                  size="icon-sm"
                  className='text-gray-400 hover:text-gray-600'
                >
                  <X className='h-5 w-5' />
                </Button>
              </div>
            </div>
            <div className='p-6 space-y-6'>
              {/* Client Info */}
              <div className='flex items-center gap-4'>
                <div className='w-16 h-16 bg-accent-100 rounded-full flex items-center justify-center'>
                  <User className='h-8 w-8 text-accent-600' />
                </div>
                <div>
                  <h4 className='text-xl font-semibold text-gray-900'>
                    {selectedClient.client_name}
                  </h4>
                  <p className='text-gray-600'>
                    {selectedClient.company_name || 'No Company'}
                  </p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-600'>Total Volume</p>
                  <p className='text-xl font-bold text-gray-900'>
                    {formatCurrency(
                      selectedClient.total_amount,
                      Array.isArray(selectedClient.currencies) &&
                      selectedClient.currencies.length > 0
                        ? selectedClient.currencies[0]
                        : 'USD'
                    )}
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-600'>Commissions</p>
                  <p className='text-xl font-bold text-success-600'>
                    {formatCurrency(
                      selectedClient.total_commission,
                      Array.isArray(selectedClient.currencies) &&
                      selectedClient.currencies.length > 0
                        ? selectedClient.currencies[0]
                        : 'USD'
                    )}
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-600'>Net Amount</p>
                  <p className='text-xl font-bold text-accent-600'>
                    {formatCurrency(
                      selectedClient.total_net,
                      Array.isArray(selectedClient.currencies) &&
                      selectedClient.currencies.length > 0
                        ? selectedClient.currencies[0]
                        : 'USD'
                    )}
                  </p>
                </div>
              </div>

              {/* Transaction Details */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-600'>Transaction Count</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {selectedClient.transaction_count}
                  </p>
                </div>
                <div className='bg-gray-50 rounded-lg p-4'>
                  <p className='text-sm text-gray-600'>Average Transaction</p>
                  <p className='text-2xl font-bold text-gray-900'>
                    {formatCurrency(
                      selectedClient.avg_transaction,
                      Array.isArray(selectedClient.currencies) &&
                      selectedClient.currencies.length > 0
                        ? selectedClient.currencies[0]
                        : 'USD'
                    )}
                  </p>
                </div>
              </div>

              {/* Additional Details */}
              <div className='space-y-4'>
                {selectedClient.payment_method && (
                  <div className='flex items-center gap-3'>
                    <Globe className='h-5 w-5 text-gray-400' />
                    <div>
                      <p className='text-sm font-medium text-gray-900'>
                        Payment Method
                      </p>
                      <p className='text-sm text-gray-600'>
                        {selectedClient.payment_method}
                      </p>
                    </div>
                  </div>
                )}

                {selectedClient.currencies &&
                  selectedClient.currencies.length > 0 && (
                    <div>
                      <p className='text-sm font-medium text-gray-900 mb-2'>
                        Currencies
                      </p>
                      <div className='flex flex-wrap gap-2'>
                        {selectedClient.currencies.map(currency => (
                          <span
                            key={currency}
                            className='inline-flex px-3 py-1 text-sm font-medium rounded-full bg-accent-100 text-accent-800'
                          >
                            {currency}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {selectedClient.psps && selectedClient.psps.length > 0 && (
                  <div>
                    <p className='text-sm font-medium text-gray-900 mb-2'>
                      Payment Service Providers
                    </p>
                    <div className='flex flex-wrap gap-2'>
                      {selectedClient.psps.map(psp => (
                        <span
                          key={psp}
                          className='inline-flex px-3 py-1 text-sm font-medium rounded-full bg-success-100 text-success-800'
                        >
                          {psp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className='flex items-center gap-3'>
                  <Calendar className='h-5 w-5 text-gray-400' />
                  <div>
                    <p className='text-sm font-medium text-gray-900'>
                      Last Transaction
                    </p>
                    <p className='text-sm text-gray-600'>
                      {selectedClient.last_transaction
                        ? formatDate(selectedClient.last_transaction)
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className='p-6 border-t border-gray-100'>
              <Button
                onClick={closeModal}
                variant="outline"
                className='w-full'
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditModal && selectedClient && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-semibold text-gray-900'>
                  Edit Client
                </h3>
                <button
                  onClick={closeModal}
                  className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>
            <div className='p-6'>
              <p className='text-gray-600 mb-6'>
                Edit functionality will be implemented here. This would include
                forms for updating client information.
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={closeModal}
                  className='flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200'
                >
                  Cancel
                </button>
                <button
                  onClick={closeModal}
                  className='flex-1 px-4 py-2 bg-accent-600 text-white rounded-lg hover:bg-accent-700 transition-colors duration-200'
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedClient && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-xl max-w-md w-full'>
            <div className='p-6 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <h3 className='text-xl font-semibold text-gray-900'>
                  Delete Client
                </h3>
                <button
                  onClick={closeModal}
                  className='p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors duration-200'
                >
                  <X className='h-5 w-5' />
                </button>
              </div>
            </div>
            <div className='p-6'>
              <div className='flex items-center gap-4 mb-4'>
                <div className='w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center'>
                  <Trash2 className='h-6 w-6 text-danger-600' />
                </div>
                <div>
                  <p className='text-lg font-semibold text-gray-900'>
                    Are you sure?
                  </p>
                  <p className='text-gray-600'>This action cannot be undone.</p>
                </div>
              </div>
              <p className='text-gray-600 mb-6'>
                You are about to delete{' '}
                <strong>{selectedClient.client_name}</strong>. This will
                permanently remove all associated data.
              </p>
              <div className='flex gap-3'>
                <button
                  onClick={closeModal}
                  disabled={deleteLoading}
                  className='flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200 disabled:opacity-50'
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteClient}
                  disabled={deleteLoading}
                  className='flex-1 px-4 py-2 bg-danger-600 text-white rounded-lg hover:bg-danger-700 transition-colors duration-200 disabled:opacity-50'
                >
                  {deleteLoading ? 'Deleting...' : 'Delete Client'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Daily Summary Modal */}
      {showDailySummaryModal && dailySummaryData && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-2xl shadow-lg max-w-5xl w-full max-h-[85vh] overflow-hidden border border-gray-100'>
            {/* Modal Header */}
            <div className='bg-gray-50 border-b border-gray-200 p-6'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-4'>
                  <div className='w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center'>
                    <Calendar className='h-5 w-5 text-gray-600' />
                  </div>
                  <div>
                    <h2 className='text-xl font-semibold text-gray-900'>Daily Summary</h2>
                    <p className='text-gray-500 text-sm'>
                      {dailySummaryData.date_str}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDailySummaryModal}
                  className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors duration-200'
                >
                  <X className='h-4 w-4 text-gray-600' />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className='p-6 overflow-y-auto max-h-[calc(85vh-120px)]'>
              {dailySummaryLoading ? (
                <div className='flex items-center justify-center py-12'>
                  <div className='text-center'>
                    <div className='animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-600 mx-auto mb-3'></div>
                    <p className='text-gray-600 text-sm'>Loading summary...</p>
                  </div>
                </div>
              ) : (
                <div className='space-y-6'>
                  {/* Key Metrics Section */}
                  {(() => {
                    const dailyMetrics = calculateDailyDepositWithdrawMetrics(dailySummaryData.date);
                    return (
                      <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-1 h-6 bg-gray-400 rounded-full'></div>
                          <h3 className='text-lg font-medium text-gray-900'>Overview</h3>
                        </div>
                        
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                          {/* Deposits */}
                          <div className='bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200'>
                            <div className='flex items-center justify-between mb-3'>
                              <div className='w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center'>
                                <TrendingUp className='h-4 w-4 text-green-600' />
                              </div>
                              <span className='text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full'>
                                Deposits
                              </span>
                            </div>
                            <p className='text-2xl font-semibold text-gray-900 mb-1'>
                              {formatCurrency(dailyMetrics.totalDeposits, '₺')}
                            </p>
                            <p className='text-xs text-gray-500'>Total incoming</p>
                          </div>

                          {/* Withdrawals */}
                          <div className='bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200'>
                            <div className='flex items-center justify-between mb-3'>
                              <div className='w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center'>
                                <TrendingUp className='h-4 w-4 text-red-600 rotate-180' />
                              </div>
                              <span className='text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full'>
                                Withdrawals
                              </span>
                            </div>
                            <p className='text-2xl font-semibold text-gray-900 mb-1'>
                              {formatCurrency(dailyMetrics.totalWithdrawals, '₺')}
                            </p>
                            <p className='text-xs text-gray-500'>Total outgoing</p>
                          </div>

                          {/* Net Flow */}
                          <div className='bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200'>
                            <div className='flex items-center justify-between mb-3'>
                              <div className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center'>
                                <Activity className='h-4 w-4 text-gray-600' />
                              </div>
                              <span className='text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-full'>
                                Net
                              </span>
                            </div>
                            <p className={`text-2xl font-semibold mb-1 ${(dailySummaryData?.gross_balance_tl || dailyMetrics.totalDeposits - dailyMetrics.totalWithdrawals) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(dailySummaryData?.gross_balance_tl || dailyMetrics.totalDeposits - dailyMetrics.totalWithdrawals, '₺')}
                            </p>
                            <p className='text-xs text-gray-500'>Balance</p>
                          </div>

                          {/* Statistics */}
                          <div className='bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200'>
                            <div className='flex items-center justify-between mb-3'>
                              <div className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center'>
                                <BarChart3 className='h-4 w-4 text-gray-600' />
                              </div>
                              <span className='text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-full'>
                                Stats
                              </span>
                            </div>
                            <div className='space-y-2'>
                              <div className='flex justify-between items-center text-sm'>
                                <span className='text-gray-600'>Transactions</span>
                                <span className='font-semibold text-gray-900'>{dailyMetrics.transactionCount}</span>
                              </div>
                              <div className='flex justify-between items-center text-sm'>
                                <span className='text-gray-600'>Clients</span>
                                <span className='font-semibold text-gray-900'>{dailyMetrics.uniqueClients}</span>
                              </div>
                              {dailyMetrics.transactionCount > 0 && (
                                <div className='flex justify-between items-center text-sm'>
                                  <span className='text-gray-600'>Average</span>
                                  <span className='font-semibold text-gray-900'>
                                    {formatCurrency((dailyMetrics.totalDeposits + dailyMetrics.totalWithdrawals) / dailyMetrics.transactionCount)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* USD Rate */}
                  {dailySummaryData.usd_rate !== null && dailySummaryData.usd_rate !== undefined && (
                    <div className='bg-gray-50 border border-gray-200 rounded-xl p-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center'>
                          <DollarSign className='h-4 w-4 text-gray-600' />
                        </div>
                        <div>
                          <p className='text-sm font-medium text-gray-700'>USD Rate</p>
                          <p className='text-xl font-semibold text-gray-900'>${Number(dailySummaryData.usd_rate).toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Payment Methods Breakdown */}
                  {(() => {
                    const dailyPaymentBreakdown = calculateDailyPaymentMethodBreakdown(dailySummaryData.date);
                    return Object.keys(dailyPaymentBreakdown).length > 0 ? (
                      <div className='space-y-4'>
                        <div className='flex items-center gap-3'>
                          <div className='w-1 h-6 bg-gray-400 rounded-full'></div>
                          <h3 className='text-lg font-medium text-gray-900'>Payment Methods</h3>
                        </div>
                        
                        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                          {Object.entries(dailyPaymentBreakdown)
                            .sort(([, a], [, b]) => Math.abs(b.total) - Math.abs(a.total))
                            .map(([method, data]) => (
                              <div key={method} className='bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow duration-200'>
                                <div className='flex items-center justify-between mb-3'>
                                  <h4 className='text-sm font-medium text-gray-900'>{method}</h4>
                                  <div className={`text-sm font-semibold px-2 py-1 rounded-full ${data.total >= 0 ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                                    {formatCurrency(Math.abs(data.total), '₺')}
                                  </div>
                                </div>
                                
                                <div className='grid grid-cols-2 gap-3'>
                                  <div className='bg-green-50 border border-green-100 rounded-lg p-3'>
                                    <div className='flex items-center gap-2 mb-1'>
                                      <TrendingUp className='h-3 w-3 text-green-600' />
                                      <span className='text-xs font-medium text-green-700'>Deposits</span>
                                    </div>
                                    <p className='text-lg font-semibold text-green-900'>
                                      {formatCurrency(data.deposits, '₺')}
                                    </p>
                                  </div>
                                  
                                  <div className='bg-red-50 border border-red-100 rounded-lg p-3'>
                                    <div className='flex items-center gap-2 mb-1'>
                                      <TrendingUp className='h-3 w-3 text-red-600 rotate-180' />
                                      <span className='text-xs font-medium text-red-700'>Withdrawals</span>
                                    </div>
                                    <p className='text-lg font-semibold text-red-900'>
                                      {formatCurrency(data.withdrawals, '₺')}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : null;
                  })()}

                  {/* Distribution Summary */}
                  {dailySummaryData.transaction_count > 0 && (
                    <div className='space-y-4'>
                      <div className='flex items-center gap-3'>
                        <div className='w-1 h-6 bg-gray-400 rounded-full'></div>
                        <h3 className='text-lg font-medium text-gray-900'>Breakdown</h3>
                      </div>
                      
                      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
                        {/* PSP Distribution */}
                        {dailySummaryData.psp_summary.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-xl p-4'>
                            <div className='flex items-center gap-3 mb-3'>
                              <div className='w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center'>
                                <Building2 className='h-3 w-3 text-gray-600' />
                              </div>
                              <h4 className='text-sm font-medium text-gray-900'>PSPs (Net Amounts)</h4>
                            </div>
                            <div className='space-y-2'>
                              {dailySummaryData.psp_summary.slice(0, 4).map((psp, idx) => {
                                // Process PSP data
                                
                                return (
                                  <div key={idx} className='flex justify-between items-center text-sm'>
                                    <span className='text-gray-600 truncate'>{psp.name}</span>
                                    <div className='flex items-center gap-2'>
                                      <span className='text-xs text-gray-500'>{psp.count} tx</span>
                                      <span className='font-medium text-gray-900'>
                                        {psp.is_tether 
                                          ? `$${psp.net_usd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                          : `${psp.net_tl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`
                                        }
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                              {dailySummaryData.psp_summary.length > 4 && (
                                <div className='text-center pt-2 border-t border-gray-100'>
                                  <span className='text-xs text-gray-500'>
                                    +{dailySummaryData.psp_summary.length - 4} more
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Category Distribution */}
                        {dailySummaryData.category_summary.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-xl p-4'>
                            <div className='flex items-center gap-3 mb-3'>
                              <div className='w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center'>
                                <FileText className='h-3 w-3 text-gray-600' />
                              </div>
                              <h4 className='text-sm font-medium text-gray-900'>Categories</h4>
                            </div>
                            <div className='space-y-2'>
                              {dailySummaryData.category_summary.slice(0, 4).map((category, idx) => (
                                <div key={idx} className='flex justify-between items-center text-sm'>
                                  <span className='text-gray-600 truncate'>{category.name}</span>
                                  <span className='font-medium text-gray-900'>{category.count}</span>
                                </div>
                              ))}
                              {dailySummaryData.category_summary.length > 4 && (
                                <div className='text-center pt-2 border-t border-gray-100'>
                                  <span className='text-xs text-gray-500'>
                                    +{dailySummaryData.category_summary.length - 4} more
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Methods */}
                        {dailySummaryData.payment_method_summary.length > 0 && (
                          <div className='bg-white border border-gray-200 rounded-xl p-4'>
                            <div className='flex items-center gap-3 mb-3'>
                              <div className='w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center'>
                                <CreditCard className='h-3 w-3 text-gray-600' />
                              </div>
                              <h4 className='text-sm font-medium text-gray-900'>Payment Methods (Net Amounts)</h4>
                            </div>
                            <div className='space-y-2'>
                              {dailySummaryData.payment_method_summary.slice(0, 4).map((method, idx) => (
                                <div key={idx} className='flex justify-between items-center text-sm'>
                                  <span className='text-gray-600 truncate'>{method.name}</span>
                                  <span className='font-medium text-gray-900'>{method.count}</span>
                                </div>
                              ))}
                              {dailySummaryData.payment_method_summary.length > 4 && (
                                <div className='text-center pt-2 border-t border-gray-100'>
                                  <span className='text-xs text-gray-500'>
                                    +{dailySummaryData.payment_method_summary.length - 4} more
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Exchange Rate Modal - REMOVED - No longer needed with automatic yfinance integration */}

      {/* Clients Table */}
      <div className='bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden'>
            <div className='px-8 py-6 border-b border-gray-100'>
              <div className='flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center'>
                    <Users className='h-5 w-5 text-gray-600' />
    </div>
                  <div>
                    <h3 className='text-xl font-bold text-gray-900'>
                      Clients Overview
                    </h3>
                    <p className='text-sm text-gray-600'>
                      Manage clients and view their transactions
                    </p>
                  </div>
                </div>
                <div className='flex items-center gap-3'>
                  <button
                    onClick={handleExport}
                    className='inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-200 font-medium'
                  >
                    <Download className='h-4 w-4' />
                    Export
                  </button>
                  <button
                    onClick={() => navigate('/transactions/add')}
                    className='inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-gray-600 to-purple-600 text-white rounded-xl hover:from-gray-700 hover:to-purple-700 hover:shadow-lg transition-all duration-200 font-medium shadow-md'
                  >
                    <Plus className='h-4 w-4' />
                    Add Transaction
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className='p-12 text-center'>
                <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-accent-600 mx-auto mb-4'></div>
                <p className='text-gray-600 text-lg'>Loading clients...</p>
              </div>
            ) : clientsError && clients.length === 0 ? (
              <div className='p-12 text-center'>
                <div className='text-red-500 mb-4'>
                  <AlertCircle className='h-16 w-16 mx-auto' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  Error Loading Clients
                </h3>
                <p className='text-gray-600 mb-6'>{clientsError}</p>
                <Button
                  variant="default"
                  onClick={retryClientsData}
                  className="inline-flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              </div>
            ) : clients.length === 0 ? (
              <div className='p-12 text-center'>
                <div className='text-gray-400 mb-4'>
                  <Users className='h-16 w-16 mx-auto' />
                </div>
                <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                  No Clients Found
                </h3>
                <p className='text-gray-600'>
                  No clients are currently available.
                </p>
              </div>
            ) : (
              <div className='overflow-x-auto'>
                <table className='min-w-full divide-y divide-gray-200'>
                  <thead className='bg-gray-50'>
                    <tr>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Client
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Company
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Total Amount
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Transactions
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Last Transaction
                      </th>
                      <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className='bg-white divide-y divide-gray-200'>
                    {clients.map((client) => (
                      <React.Fragment key={client.client_name}>
                        {/* Client Row */}
                        <tr className='hover:bg-gray-50 hover:scale-[1.01] transition-all duration-300 ease-in-out cursor-pointer'>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center'>
                              <button
                                onClick={() => toggleClientExpansion(client.client_name)}
                                className='mr-3 p-1 hover:bg-gray-100 rounded transition-colors duration-200'
                              >
                                <div className={`w-4 h-4 transition-transform duration-200 ${
                                  expandedClients.has(client.client_name) ? 'rotate-90' : ''
                                }`}>
                                  ▶
                                </div>
                              </button>
                              <div className='w-8 h-8 bg-gradient-to-br from-gray-500 to-purple-600 rounded-full flex items-center justify-center mr-3'>
                                <User className='h-4 w-4 text-white' />
                              </div>
                              <div>
                                <div className='text-sm font-semibold text-gray-900'>
                                  {client.client_name}
                                </div>
                                <div className='text-sm text-gray-500'>
                                  'Payment Method'
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {client.company_name || 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='text-sm font-semibold text-gray-900'>
                              {formatCurrency(client.total_amount, '₺')}
                            </div>
                            <div className='text-xs text-gray-500'>
                              {formatCurrency(client.total_commission, '₺')} commission
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-900'>
                            {client.transaction_count}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                            {client.last_transaction ? formatDate(client.last_transaction) : 'N/A'}
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-sm font-medium'>
                            <div className='flex items-center gap-2'>
                              <button
                                onClick={() => handleViewClient(client)}
                                className='text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors duration-200'
                                title='View Details'
                              >
                                <Eye className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() => handleEditClient(client)}
                                className='text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors duration-200'
                                title='Edit Client'
                              >
                                <Edit className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() => handleDeleteClient(client)}
                                className='text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors duration-200'
                                title='Delete Client'
                              >
                                <Trash2 className='h-4 w-4' />
                              </button>
                            </div>
                          </td>
                        </tr>
                        
                        {/* Expanded Transactions Row */}
                        {expandedClients.has(client.client_name) && (
                          <tr>
                            <td colSpan={6} className='px-6 py-4 bg-gray-50'>
                              <div className='space-y-4'>
                                <div className='flex items-center justify-between'>
                                  <h4 className='text-sm font-medium text-gray-700'>
                                    Transactions for {client.client_name}
                                  </h4>
                                  <button
                                    onClick={() => navigate('/transactions/add', { state: { clientName: client.client_name } })}
                                    className='inline-flex items-center gap-2 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-all duration-200'
                                  >
                                    <Plus className='h-3 w-3' />
                                    Add Transaction
                                  </button>
                                </div>
                                
                                {loadingClientTransactions[client.client_name] ? (
                                  <div className='text-center py-4'>
                                    <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto'></div>
                                    <p className='text-sm text-gray-500 mt-2'>Loading transactions...</p>
                                  </div>
                                ) : clientTransactions[client.client_name]?.length > 0 ? (
                                  <div className='overflow-x-auto'>
                                    <table className='min-w-full divide-y divide-gray-200'>
                                      <thead className='bg-white'>
                                        <tr>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Date
                                          </th>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Category
                                          </th>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Amount
                                          </th>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Currency
                                          </th>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            PSP
                                          </th>
                                          <th className='px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                            Actions
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className='bg-white divide-y divide-gray-200'>
                                        {clientTransactions[client.client_name].map((transaction) => (
                                          <tr key={transaction.id} className='hover:bg-gray-50 hover:scale-[1.02] transition-all duration-300 ease-in-out cursor-pointer'>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-900'>
                                              {transaction.date ? formatDate(transaction.date) : 'N/A'}
                                            </td>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-900'>
                                              {transaction.category}
                                            </td>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900'>
                                              {formatCurrencyPositive(transaction.amount, transaction.currency)}
                                            </td>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-500'>
                                              {transaction.currency}
                                            </td>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm text-gray-900'>
                                              {transaction.psp}
                                            </td>
                                            <td className='px-4 py-2 whitespace-nowrap text-sm font-medium'>
                                              <div className='flex items-center gap-1'>
                                                <button
                                                  onClick={() => handleViewTransaction(transaction)}
                                                  className='text-gray-600 hover:text-gray-900 p-1 hover:bg-gray-50 rounded transition-colors duration-200'
                                                  title='View Details'
                                                >
                                                  <Eye className='h-3 w-3' />
                                                </button>
                                                <button
                                                  onClick={() => handleEditTransaction(transaction)}
                                                  className='text-green-600 hover:text-green-900 p-1 hover:bg-green-50 rounded transition-colors duration-200'
                                                  title='Edit Transaction'
                                                >
                                                  <Edit className='h-3 w-3' />
                                                </button>
                                                <button
                                                  onClick={() => handleDeleteTransaction(transaction)}
                                                  className='text-red-600 hover:text-red-900 p-1 hover:bg-red-50 rounded transition-colors duration-200'
                                                  title='Delete Transaction'
                                                >
                                                  <Trash2 className='h-3 w-3' />
                                                </button>
                                              </div>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <div className='text-center py-4 text-sm text-gray-500'>
                                    No transactions found for this client.
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      {/* Transaction View Modal */}
      {showViewTransactionModal && selectedTransaction && (
        <Modal
          isOpen={showViewTransactionModal}
          onClose={() => setShowViewTransactionModal(false)}
          title="Transaction Details"
        >
          <TransactionDetailView transaction={selectedTransaction} />
        </Modal>
      )}

      {/* Transaction Edit Modal */}
      {showEditTransactionModal && selectedTransaction && (
        <Modal
          isOpen={showEditTransactionModal}
          onClose={() => setShowEditTransactionModal(false)}
          title="Edit Transaction"
        >
          <TransactionEditForm
            transaction={selectedTransaction}
            onSave={(updatedTransaction) => {
              console.log('🔄 Transaction updated, refreshing local state...', updatedTransaction.id);
              
              // Update the transaction in the local state
              setTransactions(prev => 
                prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t)
              );
              
              // Update in client transactions if it exists
              if (clientTransactions[updatedTransaction.client_name]) {
                setClientTransactions(prev => ({
                  ...prev,
                  [updatedTransaction.client_name]: prev[updatedTransaction.client_name].map(t => 
                    t.id === updatedTransaction.id ? updatedTransaction : t
                  )
                }));
              }
              
              // Refresh daily summary if it's currently open for the same date
              if (dailySummaryData && dailySummaryData.date === updatedTransaction.date) {
                fetchDailySummary(updatedTransaction.date);
              }
              
              // Close the modal first
              setShowEditTransactionModal(false);
              
              // Dispatch event to refresh transaction lists in other components (but not this one)
              window.dispatchEvent(new CustomEvent('transactionsUpdated', {
                detail: { 
                  action: 'update',
                  transactionId: updatedTransaction.id,
                  skipCurrentPage: true // Flag to skip refresh on current page
                }
              }));
            }}
            onCancel={() => setShowEditTransactionModal(false)}
            dropdownOptions={dropdownOptions}
          />
        </Modal>
      )}

               {/* Import Guide Modal */}
         {showImportGuide && (
           <Modal
             isOpen={showImportGuide}
             onClose={() => setShowImportGuide(false)}
             title="📁 Import Transactions Guide"
             size="lg"
           >
          <div className="space-y-6 max-h-96 overflow-y-auto">
            {/* File Format Support */}
            <div>
              <h5 className="text-sm font-medium text-gray-800 mb-2">✅ Supported File Formats:</h5>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">CSV (Fully Supported)</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">XLSX (Fully Supported)</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">XLS (Fully Supported)</span>
                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">XLSM (Fully Supported)</span>
              </div>
            </div>

            {/* Essential vs Optional Fields */}
            <div>
              <h5 className="text-sm font-medium text-gray-800 mb-2">🎯 Essential vs Optional Fields:</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <h6 className="font-medium text-green-700 mb-1">✅ Essential Fields (Recommended):</h6>
                  <ul className="text-green-600 space-y-1">
                    <li>• <strong>Client</strong> - Client's full name</li>
                    <li>• <strong>Amount</strong> - Transaction amount</li>
                    <li>• <strong>Company</strong> - Company name</li>
                    <li>• <strong>Payment Method</strong> - How payment was made</li>
                    <li>• <strong>Category</strong> - Transaction category</li>
                    <li>• <strong>Currency</strong> - Transaction currency</li>
                    <li>• <strong>PSP</strong> - Payment service provider</li>
                    <li>• <strong>Date</strong> - Transaction date</li>
                  </ul>
                </div>
                <div>
                  <h6 className="font-medium text-gray-700 mb-1">❓ Optional Fields:</h6>
                  <ul className="text-gray-600 space-y-1">
                    <li>• <strong>Commission</strong> - Auto-calculated if not provided</li>
                    <li>• <strong>Net Amount</strong> - Auto-calculated if not provided</li>
                    <li>• <strong>Notes</strong> - Additional transaction details</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Column Structure */}
            <div>
              <h5 className="text-sm font-medium text-gray-800 mb-2">📋 Essential Column Structure (in exact order):</h5>
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                <div className="grid grid-cols-9 gap-1 text-center font-medium text-gray-600 mb-2">
                  <div className="col-span-1">1</div>
                  <div className="col-span-1">2</div>
                  <div className="col-span-1">3</div>
                  <div className="col-span-1">4</div>
                  <div className="col-span-1">5</div>
                  <div className="col-span-1">6</div>
                  <div className="col-span-1">7</div>
                  <div className="col-span-1">8</div>
                  <div className="col-span-1">9</div>
                </div>
                <div className="grid grid-cols-9 gap-1 text-center">
                  <div className="col-span-1">Client</div>
                  <div className="col-span-1">Company</div>
                  
                  <div className="col-span-1">Payment</div>
                  <div className="col-span-1">Category</div>
                  <div className="col-span-1">Amount</div>
                  <div className="col-span-1">Currency</div>
                  <div className="col-span-1">PSP</div>
                  <div className="col-span-1">Date</div>
                </div>
                
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="text-xs text-gray-600 text-center mb-2">Optional Columns (if needed):</div>
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="col-span-1">10</div>
                    <div className="col-span-1">11</div>
                    <div className="col-span-1">12</div>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="col-span-1">Commission</div>
                    <div className="col-span-1">Net Amount</div>
                    <div className="col-span-1">Notes</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Formats */}
            <div>
              <h5 className="text-sm font-medium text-gray-800 mb-2">💡 Example File Formats:</h5>
              
              {/* CSV Format */}
              <div className="mb-3">
                <h6 className="text-sm font-medium text-gray-700 mb-2">📄 CSV Format (Essential Columns):</h6>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                  <div className="text-gray-600 font-medium mb-1">Essential Header Row:</div>
                  <div className="text-gray-800">Client,Company,Payment Method,Category,Amount,Currency,PSP,Date</div>
                  <div className="text-gray-600 font-medium mt-2 mb-1">Essential Data Row (Example):</div>
                  <div className="text-gray-800">John Doe,ABC Corp,Credit Card,DEP,1000.50,USD,Stripe,2025-08-18</div>
                  
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="text-gray-600 font-medium mb-1">Full Header Row (with optional columns):</div>
                    <div className="text-gray-800">Client,Company,Payment Method,Category,Amount,Commission,Net Amount,Currency,PSP,Date,Notes</div>
                    <div className="text-gray-600 font-medium mt-2 mb-1">Full Data Row (Example):</div>
                    <div className="text-gray-800">John Doe,ABC Corp,Credit Card,DEP,1000.50,25.00,975.50,USD,Stripe,2025-08-18,Monthly payment</div>
                  </div>
                </div>
              </div>
              
              {/* Excel Format */}
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">📊 Excel Format (XLSX/XLS/XLSM):</h6>
                <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-700 overflow-x-auto">
                  <div className="text-gray-600 font-medium mb-1">Essential Column Structure:</div>
                  <div className="text-gray-800">Column A: Client | Column B: Company | Column C: Payment Method</div>
                  <div className="text-gray-800">Column D: Category | Column E: Amount | Column F: Currency | Column G: PSP | Column H: Date</div>
                  
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="text-gray-600 font-medium mb-1">Optional Columns (if needed):</div>
                    <div className="text-gray-800">Column J: Commission | Column K: Net Amount | Column L: Notes</div>
                  </div>
                  
                  <div className="text-gray-600 font-medium mt-2 mb-1">💡 Tip: Excel files are automatically parsed - just ensure your first row contains headers!</div>
                </div>
              </div>
            </div>

            {/* Downloadable Template Examples */}
            <div>
              <h5 className="text-sm font-medium text-gray-800 mb-2">📥 Download Template Examples:</h5>
              
              {/* Essential Template */}
              <div className="mb-3">
                <h6 className="text-sm font-medium text-green-700 mb-2">✅ Essential Template (9 columns):</h6>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="text-sm text-green-800 mb-2">
                    <strong>Perfect for most imports:</strong> Contains only the essential columns needed for complete transaction data.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadTemplate('essential', 'csv')}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download CSV Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('essential', 'xlsx')}
                      className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download Excel Template
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Full Template */}
              <div>
                <h6 className="text-sm font-medium text-gray-700 mb-2">📋 Full Template (12 columns):</h6>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <div className="text-sm text-gray-800 mb-2">
                    <strong>Complete template:</strong> Includes all columns including commission, net amount, and notes for advanced users.
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadTemplate('full', 'csv')}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download CSV Template
                    </button>
                    <button
                      onClick={() => downloadTemplate('full', 'xlsx')}
                      className="px-3 py-1.5 bg-gray-600 text-white text-xs rounded-lg hover:bg-gray-700 transition-colors duration-200 flex items-center gap-1"
                    >
                      <Download className="w-3 h-3" />
                      Download Excel Template
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Import Note */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h6 className="text-sm font-medium text-green-800 mb-1">🧮 Smart Import Features:</h6>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• <strong>Essential 9 columns</strong> provide complete transaction data</li>
                <li>• <strong>Commission & Net Amount</strong> are auto-calculated if not provided</li>
                <li>• <strong>Transaction summaries</strong> are automatically generated</li>
                <li>• <strong>Client statistics</strong> are updated in real-time</li>
                <li>• <strong>Flexible import</strong> - use 9 essential columns or all 12 columns</li>
                <li>• Only import <strong>raw data</strong> - let the system handle calculations!</li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

         {/* Import Preview Modal */}
         {showImportPreview && (
           <Modal
             isOpen={showImportPreview}
             onClose={() => setShowImportPreview(false)}
             title="📋 Import Preview - Review Your Data"
             size="lg"
           >
             <div className="space-y-6">
               {/* Summary */}
               <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                 <h5 className="text-sm font-medium text-gray-800 mb-2">📊 Import Summary:</h5>
                 <div className="grid grid-cols-2 gap-4 text-sm">
                   <div>
                     <span className="text-gray-600 font-medium">Total Transactions:</span>
                     <span className="ml-2 text-gray-800">{importData.length}</span>
                   </div>
                   <div>
                     <span className="text-gray-600 font-medium">File Type:</span>
                     <span className="ml-2 text-gray-800">CSV</span>
                   </div>
                 </div>
               </div>

               {/* Preview Table */}
               <div>
                 <h5 className="text-sm font-medium text-gray-800 mb-3">👀 Preview (First 5 transactions):</h5>
                 <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                   <table className="min-w-full divide-y divide-gray-200">
                     <thead className="bg-gray-50">
                       <tr>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {importPreview.map((transaction, index) => (
                         <tr key={index} className="hover:bg-gray-50">
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{transaction.client_name}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{transaction.company || '-'}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.amount}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{transaction.currency}</td>
                           <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">{transaction.category}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

               {/* Action Buttons */}
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                 <button
                   onClick={() => setShowImportPreview(false)}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleFinalImport}
                   disabled={importing}
                   className="px-4 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {importing ? 'Importing...' : `Import ${importData.length} Transactions`}
                 </button>
               </div>
             </div>
           </Modal>
         )}

         {/* Bulk Delete Modal */}
         {showBulkDeleteModal && (
           <Modal
             isOpen={showBulkDeleteModal}
             onClose={() => setShowBulkDeleteModal(false)}
             title="🗑️ Bulk Delete All Transactions"
             size="md"
           >
             <div className="space-y-6">
               {/* Warning */}
               <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                 <div className="flex items-center gap-2 mb-2">
                   <AlertCircle className="w-5 h-5 text-red-600" />
                   <h5 className="text-sm font-medium text-red-800">⚠️ DANGER ZONE</h5>
                 </div>
                 <p className="text-sm text-red-700">
                   This action will <strong>permanently delete ALL transactions</strong> from the system. 
                   This action cannot be undone and will affect all client data, reports, and analytics.
                 </p>
               </div>

               {/* Confirmation Code Input */}
               <div>
                 <label htmlFor="confirmationCode" className="block text-sm font-medium text-gray-700 mb-2">
                   Enter Confirmation Code:
                 </label>
                 <input
                   type="text"
                   id="confirmationCode"
                   value={confirmationCode}
                   onChange={(e) => setConfirmationCode(e.target.value)}
                   placeholder="Enter 4-digit code"
                   className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                   maxLength={4}
                   autoComplete="off"
                 />
                 <p className="text-xs text-gray-500 mt-1">
                   You must enter the exact 4-digit confirmation code to proceed with deletion.
                 </p>
               </div>

               {/* Action Buttons */}
               <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                 <button
                   onClick={() => setShowBulkDeleteModal(false)}
                   className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                 >
                   Cancel
                 </button>
                 <button
                   onClick={handleBulkDeleteAll}
                   disabled={deleting || confirmationCode !== '4561'}
                   className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                 >
                   {deleting ? 'Deleting...' : 'Delete All Transactions'}
                 </button>
               </div>
             </div>
           </Modal>
         )}
    </div>
  );
}