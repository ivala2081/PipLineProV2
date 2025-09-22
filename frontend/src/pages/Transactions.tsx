import React, { useState, useEffect, useRef } from 'react';
import { getRadius, getSectionSpacing } from '../utils/spacingUtils';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  Eye,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  Activity,
  Users,
  CreditCard,
  Building2,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  Settings,
  X,
  LineChart,
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/apiClient';
import { formatCurrency, formatCurrencyPositive } from '../utils/currencyUtils';
import Modal from '../components/Modal';
import TransactionDetailView from '../components/TransactionDetailView';
import TransactionEditForm from '../components/TransactionEditForm';
// Removed old ProfessionalLayout imports - using modern design system
import DailyTransactionSummary from '../components/DailyTransactionSummary';
import { RevenueChart } from '../components/modern/RevenueChart';
import { ProgressRing, MiniChart } from '../components/DataVisualization';
import { 
  UnifiedCard, 
  UnifiedButton, 
  UnifiedBadge, 
  UnifiedSection, 
  UnifiedGrid 
} from '../design-system';
import { 
  EnhancedSearch, 
  FloatingAction, 
  Breadcrumb, 
  DataExport, 
  BulkActions,
  QuickActions,
  useKeyboardShortcuts,
  COMMON_SHORTCUTS,
  TableSkeleton,
  CardSkeleton
} from '../components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import StandardMetricsCard from '../components/StandardMetricsCard';
import MetricCard from '../components/MetricCard';
import { ProfessionalPagination } from '../components/ProfessionalPagination';
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
  ComposedChart,
} from 'recharts';

interface Transaction {
  id: number;
  client_name: string;
  company?: string;
  payment_method?: string;
  category: string;
  amount: number;
  commission: number;
  net_amount: number;
  currency?: string;
  psp?: string;
  created_at?: string;
  notes?: string;
  date?: string;
  updated_at?: string;
  // TL Amount fields for foreign currency transactions
  amount_tl?: number;
  commission_tl?: number;
  net_amount_tl?: number;
  amount_try?: number;
  commission_try?: number;
  net_amount_try?: number;
  exchange_rate?: number;
}

interface TransactionsResponse {
  transactions: Transaction[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
  };
}

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

export default function Transactions() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [pagination, setPagination] = useState({
    page: 1,
    per_page: 25,
    total: 0,
    pages: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFilterSections, setExpandedFilterSections] = useState({
    basic: true,
    advanced: false,
    amounts: false,
    dates: false,
  });
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  
  // Modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [dropdownOptions, setDropdownOptions] = useState<{
    categories: string[];
    psps: string[];
    payment_methods: string[];
    companies: string[];
    currencies: string[];
  }>({
    categories: [],
    psps: [],
    payment_methods: [],
    companies: [],
    currencies: [],
  });
  
  // Bulk delete functionality
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  
  // New enhanced UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // Tab state - get from URL params, localStorage, or default to 'overview'
  const getInitialTab = () => {
    const tabFromUrl = searchParams.get('tab') as 'overview' | 'transactions' | 'analytics' | 'accounting';
    if (tabFromUrl) return tabFromUrl;
    
    // Check localStorage for last active tab
    const lastTab = localStorage.getItem('clients-page-active-tab') as 'overview' | 'transactions' | 'analytics' | 'accounting';
    if (lastTab) return lastTab;
    
    return 'overview';
  };
  
  const initialTab = getInitialTab();
  console.log('🔄 Initial tab state:', { initialTab, urlParams: searchParams.toString() });
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'accounting'>(initialTab);
  const [paginationLoading, setPaginationLoading] = useState(false);
  
  

  // File input reference for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Main data loading effect - simplified and reliable
  useEffect(() => {
    console.log('🔄 Transactions: Main data loading effect triggered', {
      isAuthenticated,
      authLoading,
      transactionsLength: transactions.length
    });

    if (isAuthenticated && !authLoading) {
      // Always load data when authenticated and not loading
      console.log('🔄 Transactions: Loading data...');
      fetchTransactions();
      fetchDropdownOptions();
    } else if (!isAuthenticated && !authLoading) {
      // Clear data when not authenticated
      console.log('🔄 Transactions: Clearing data - not authenticated');
      setTransactions([]);
      setError(null);
    }
  }, [isAuthenticated, authLoading]);

  // Handle filter and pagination changes with debouncing
  useEffect(() => {
      if (isAuthenticated && !authLoading) {
      console.log('🔄 Transactions: Filters/pagination changed, refetching...');
      
      // Debounce filter changes to prevent rapid API calls
      const timeoutId = setTimeout(() => {
      fetchTransactions();
      }, 300); // 300ms debounce
      
      return () => clearTimeout(timeoutId);
    }
    return undefined; // Explicit return for all code paths
  }, [filters, pagination.page]);

  // Add a refresh mechanism that can be called externally
  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('🔄 Transactions page: Received transactionsUpdated event', customEvent?.detail);
      if (isAuthenticated && !authLoading) {
        console.log('🔄 Transactions page: Refreshing transactions...');
        // Reset to page 1 when new transactions are created to show the latest
        setPagination(prev => ({ ...prev, page: 1 }));
        fetchTransactions();
      } else {
        console.log('🔄 Transactions page: Not authenticated or still loading, skipping refresh');
      }
    };

    // Listen for transaction updates from other components
    window.addEventListener('transactionsUpdated', handleRefresh);
    
    return () => {
      window.removeEventListener('transactionsUpdated', handleRefresh);
    };
  }, [isAuthenticated, authLoading]);

  // Sync tab state with URL parameters
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') as 'overview' | 'transactions' | 'analytics' | 'accounting';
    console.log('🔄 URL sync effect:', { tabFromUrl, activeTab, searchParams: searchParams.toString() });
    if (tabFromUrl && tabFromUrl !== activeTab) {
      console.log('🔄 Setting tab from URL:', tabFromUrl);
      setActiveTab(tabFromUrl);
      // Save to localStorage when tab is set from URL
      localStorage.setItem('clients-page-active-tab', tabFromUrl);
    } else if (!tabFromUrl) {
      // If no tab in URL, check localStorage for last active tab
      const lastTab = localStorage.getItem('clients-page-active-tab') as 'overview' | 'transactions' | 'analytics' | 'accounting';
      if (lastTab && lastTab !== activeTab) {
        console.log('🔄 No tab in URL, using last active tab from localStorage:', lastTab);
        setActiveTab(lastTab);
        const currentParams = new URLSearchParams(searchParams);
        currentParams.set('tab', lastTab);
        setSearchParams(currentParams, { replace: true });
      } else if (!lastTab) {
        // If no tab in URL and no localStorage, default to overview
        console.log('🔄 No tab in URL and no localStorage, defaulting to overview tab');
        setActiveTab('overview');
        const currentParams = new URLSearchParams(searchParams);
        currentParams.set('tab', 'overview');
        setSearchParams(currentParams, { replace: true });
      }
    }
  }, [searchParams]); // Removed activeTab dependency to prevent loops



  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      ...COMMON_SHORTCUTS.SEARCH,
      action: () => {
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement;
        searchInput?.focus();
      }
    },
    {
      ...COMMON_SHORTCUTS.NEW,
      action: () => navigate('/transactions/add')
    },
    {
      key: 'e',
      ctrlKey: true,
      action: () => setExporting(true)
    },
    {
      key: 'i',
      ctrlKey: true,
      action: () => triggerFileInput()
    }
  ]);


  const fetchDropdownOptions = async () => {
    try {
      console.log('🔄 Transactions: Fetching dropdown options...');
      console.log('🔄 Transactions: API base URL:', (api as any).defaults?.baseURL);
      console.log('🔄 Transactions: Making API call to /api/v1/transactions/dropdown-options');
      
      const response = await api.get('/api/v1/transactions/dropdown-options');
      console.log('🔄 Transactions: Dropdown options response status:', response.status);
      console.log('🔄 Transactions: Response headers:', response.headers);
      
      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Transactions: Raw dropdown options data:', data);
        console.log('🔄 Transactions: API response keys:', Object.keys(data || {}));
        console.log('🔄 Transactions: PSP options from API:', data.psp);
        console.log('🔄 Transactions: Payment method options from API:', data.payment_method);
        console.log('🔄 Transactions: Currency options from API:', data.currency);
        console.log('🔄 Transactions: Currencies options from API:', data.currencies);
        if (data) {
          // Extract just the 'value' property from each option object
          const processedOptions = {
            currencies: (data.currencies || data.currency || []).map((option: any) => option.value),
            payment_methods: (data.payment_method || []).map((option: any) => option.value),
            categories: (data.category || []).map((option: any) => option.value),
            psps: (data.psp || []).map((option: any) => option.value),
            companies: (data.company || []).map((option: any) => option.value),
          };
          console.log('🔄 Transactions: Processed dropdown options:', processedOptions);
          console.log('🔄 Transactions: Setting dropdown options with counts:', {
            psps: processedOptions.psps?.length || 0,
            payment_methods: processedOptions.payment_methods?.length || 0,
            categories: processedOptions.categories?.length || 0,
            companies: processedOptions.companies?.length || 0,
            currencies: processedOptions.currencies?.length || 0
          });
          setDropdownOptions(processedOptions);
        } else {
          console.warn('🔄 Transactions: No data received from dropdown options API');
        }
      } else {
        console.error('Failed to fetch dropdown options, status:', response.status);
        const errorText = await response.text();
        console.error('Error response:', errorText);
      }
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      console.error('Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack,
        name: (error as Error).name
      });
      
      // Fallback to hardcoded options if API fails
      console.log('🔄 Transactions: Using fallback hardcoded options');
      const fallbackOptions = {
        currencies: ['TL', 'USD', 'EUR'] as string[],
        payment_methods: ['Bank', 'Credit card', 'Tether'] as string[],
        categories: ['DEP', 'WD'] as string[],
        psps: ['SİPAY', 'TETHER', 'KUYUMCU', '#60 CASHPAY', '#61 CRYPPAY', '#62 CRYPPAY'] as string[],
        companies: ['ORDER', 'ROI', 'ROİ'] as string[]
      };
      console.log('🔄 Transactions: Setting fallback options:', fallbackOptions);
      setDropdownOptions(fallbackOptions);
    }
  };

  const handleViewDetails = async (transaction: Transaction) => {
    try {
      const response = await api.get(`/api/v1/transactions/${transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedTransaction(result.transaction);
        setViewModalOpen(true);
      } else {
        console.error('Failed to fetch transaction details');
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
    }
  };

  const handleEditTransaction = async (transaction: Transaction) => {
    try {
      // Ensure dropdown options are loaded before opening edit modal
      await fetchDropdownOptions();
      
      const response = await api.get(`/api/v1/transactions/${transaction.id}`);
      if (response.ok) {
        const result = await response.json();
        setSelectedTransaction(result.transaction);
        setEditModalOpen(true);
      } else {
        console.error('Failed to fetch transaction for editing');
      }
    } catch (error) {
      console.error('Error fetching transaction for editing:', error);
    }
  };

  const handleSaveTransaction = (updatedTransaction: Transaction) => {
    // Close the modal first
    setEditModalOpen(false);
    setSelectedTransaction(null);
    
    // Refresh the entire transactions list to get the latest data including converted amounts
    fetchTransactions();
    
    // Broadcast event to notify other components to refresh
    window.dispatchEvent(new CustomEvent('transactionsUpdated', {
      detail: { 
        action: 'update',
        transactionId: updatedTransaction.id
      }
    }));
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      const response = await api.delete(`/api/v1/transactions/${transactionId}`);
      if (response.ok) {
        // Remove from local state
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
      } else {
        console.error('Failed to delete transaction');
      }
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTransactions.length} selected transactions? This action cannot be undone.`)) {
      return;
    }

    try {
      setBulkDeleting(true);
      
      // Delete transactions one by one
      const deletePromises = selectedTransactions.map(async (transactionId) => {
        try {
          const response = await api.delete(`/api/v1/transactions/${transactionId}`);
          return response.ok;
        } catch (error) {
          console.error(`Error deleting transaction ${transactionId}:`, error);
          return false;
        }
      });

      const results = await Promise.all(deletePromises);
      const successCount = results.filter(Boolean).length;
      const failedCount = selectedTransactions.length - successCount;

      // Update local state
      setTransactions(prev => prev.filter(t => !selectedTransactions.includes(t.id)));
      setSelectedTransactions([]);

      // Show result message
      if (failedCount === 0) {
        setSuccess(`Successfully deleted ${successCount} transactions!`);
      } else {
        setSuccess(`Deleted ${successCount} transactions. ${failedCount} failed to delete.`);
      }

      // Refresh the list
      fetchTransactions();
      
      // Broadcast event to notify other components to refresh
      window.dispatchEvent(new CustomEvent('transactionsUpdated', {
        detail: { 
          action: 'delete',
          count: successCount,
          message: `Deleted ${successCount} transactions`
        }
      }));
    } catch (error) {
      console.error('Error during bulk delete:', error);
      setError('An error occurred during bulk delete. Please try again.');
    } finally {
      setBulkDeleting(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      console.log('🔄 Transactions: Fetching transactions data...');
      
      // Prevent multiple simultaneous requests
      if (loading || isLoadingData) {
        console.log('🔄 Transactions: Already loading, skipping duplicate request');
        return;
      }
      
      setLoading(true);
      setError(null);
      setIsLoadingData(true);

      // Check authentication first
      if (!isAuthenticated) {
        console.log('🔄 Transactions: Not authenticated, skipping fetch');
        setTransactions([]);
        return;
      }

      const params = new URLSearchParams({
        page: pagination.page.toString(),
        per_page: pagination.per_page.toString(),
        sort_by: filters.sort_by,
        sort_order: filters.sort_order,
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.psp) params.append('psp', filters.psp);
      if (filters.company) params.append('company', filters.company);
      if (filters.payment_method) params.append('payment_method', filters.payment_method);
      if (filters.currency) params.append('currency', filters.currency);
      if (filters.status) params.append('status', filters.status);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
      if (filters.amount_min) params.append('amount_min', filters.amount_min);
      if (filters.amount_max) params.append('amount_max', filters.amount_max);
      if (filters.commission_min) params.append('commission_min', filters.commission_min);
      if (filters.commission_max) params.append('commission_max', filters.commission_max);

      // Add cache-busting parameter to ensure fresh data
      params.append('_t', Date.now().toString());

      console.log('🔄 Transactions: Fetching transactions...');
      const response = await api.get(`/api/v1/transactions/?${params}`);

      if (response.status === 401) {
        console.log('🔄 Transactions: Authentication failed, clearing data');
        setTransactions([]);
        setError('Authentication required. Please log in again.');
        return;
      }

      const data = await api.parseResponse(response);

      if (response.ok && data) {
        // Ensure we have valid transaction data
        const validTransactions = Array.isArray(data.transactions) ? data.transactions : [];
        
        // Log for debugging
        console.log(`Fetched ${validTransactions.length} transactions`);
        
        setTransactions(validTransactions);
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
        }));
        
        // Debug pagination data
        console.log('🔍 Pagination Debug:', {
          total: data.pagination?.total || 0,
          pages: data.pagination?.pages || 0,
          per_page: pagination.per_page,
          current_page: pagination.page,
          transactions_length: validTransactions.length
        });
        
        
        // Clear any previous errors
        setError(null);
      } else {
        console.error('Transaction fetch failed:', data);
        setError(data?.message || 'Failed to load transactions');
        setTransactions([]);
      }
    } catch (error) {
      console.error('🔄 Transactions: Error fetching transactions:', error);
      setError('Failed to load transactions');
      setTransactions([]);
    } finally {
      console.log('🔄 Transactions: Setting loading states to false');
      setLoading(false);
      setPaginationLoading(false);
      setIsLoadingData(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
    setSelectedTransactions([]); // Reset selected transactions when filters change
  };

  const toggleFilterSection = (section: keyof typeof expandedFilterSections) => {
    setExpandedFilterSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const clearAllFilters = () => {
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
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    setSelectedTransactions([]);
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
    setSelectedTransactions([]);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      // Implement export functionality
      const csvContent = generateCSV();
      downloadCSV(csvContent, 'transactions.csv');
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExporting(false);
    }
  };

  const generateCSV = () => {
    const headers = [
      'Client',
      'Company',
      'Payment',
      'Category',
      'Amount',
      'Commission',
      'Net Amount',
      'Currency',
      'PSP',
      'Date',
    ];
    const rows = transactions.map(t => [
      t.client_name || 'Unknown',
      t.company || 'N/A',
      t.payment_method || 'N/A',
      t.category || 'N/A',
      t.amount,
      t.commission,
      t.net_amount,
      t.currency || 'TL',
      t.psp || 'Unknown',
      new Date(t.created_at || t.date || '').toLocaleDateString(),
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\n');
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setError(null);
      setSuccess(null);
      
      // Check file type
      if (!file.name.endsWith('.csv')) {
        setError('Please select a CSV file');
        return;
      }

      // Read file content
      const text = await file.text();
      const lines = text.split('\n');
      
      if (lines.length < 2) {
        setError('CSV file must have at least a header row and one data row');
        return;
      }

      // Parse CSV with improved validation
      const headers = lines[0].split(',').map(h => h.trim());
      const dataRows = lines.slice(1).filter(line => line.trim());
      
      // Validate headers - aligned with backend expectations
      const requiredHeaders = ['Client', 'Company', 'Payment', 'Category', 'Amount', 'Commission', 'Net Amount', 'Currency', 'PSP', 'Date'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      
      if (missingHeaders.length > 0) {
        setError(`Missing required headers: ${missingHeaders.join(', ')}`);
        return;
      }

      // Process data rows with improved validation
      const processedTransactions = dataRows.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        const row: any = {};
        
        headers.forEach((header, i) => {
          row[header.toLowerCase().replace(/\s+/g, '_')] = values[i] || '';
        });

        // Convert amount fields to numbers with validation
        const amount = parseFloat(row.amount) || 0;
        const commission = parseFloat(row.commission) || 0;
        const netAmount = parseFloat(row.net_amount) || 0;

        // Validate category
        let category = (row.category || 'DEP').toUpperCase();
        if (category === 'WITHDRAW' || category === 'WITHDRAWAL' || category === 'ÇEKME') {
          category = 'WD';
        } else if (category === 'DEPOSIT' || category === 'YATIRMA') {
          category = 'DEP';
        } else if (category !== 'DEP' && category !== 'WD') {
          category = 'DEP'; // Default to DEP for unknown categories
        }

        // Handle WD (withdraw) transactions - amounts should be negative
        let finalAmount = amount;
        let finalCommission = commission;
        let finalNetAmount = netAmount;
        
        if (category === 'WD' && amount > 0) {
          finalAmount = -amount;
          finalCommission = -commission;
          finalNetAmount = -netAmount;
        }

        return {
          client_name: row.client || 'Unknown',
          company: row.company || '',
          payment_method: row.payment || '',
          category: category,
          amount: finalAmount,
          commission: finalCommission,
          net_amount: finalNetAmount,
          currency: row.currency || '₺',
          psp: row.psp || 'Unknown',
          date: row.date || new Date().toISOString().split('T')[0],
          notes: `Imported from CSV - Row ${index + 2}`,
        };
      });

      // Show preview and confirmation
      const confirmed = window.confirm(
        `Found ${processedTransactions.length} transactions to import.\n\n` +
        `First transaction preview:\n` +
        `Client: ${processedTransactions[0]?.client_name}\n` +
        `Category: ${processedTransactions[0]?.category}\n` +
        `Amount: ${processedTransactions[0]?.amount} ${processedTransactions[0]?.currency}\n\n` +
        `Do you want to proceed with the import?`
      );

      if (confirmed) {
        // Call the backend API with proper error handling
        try {
          const response = await api.post('/api/v1/transactions/bulk-import', { 
            transactions: processedTransactions 
          });

          if (response.ok) {
            const result = await api.parseResponse(response);
            
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
            
            // Set success message
            setError(null); // Clear any previous errors
            setSuccess(message);
            
            // Refresh the transactions list
            fetchTransactions();
            
            // Broadcast event to notify other components (like Ledger) to refresh
            window.dispatchEvent(new CustomEvent('transactionsUpdated', {
              detail: { 
                action: 'import',
                count: result.data.successful_imports,
                message: 'Transactions imported successfully'
              }
            }));
          } else {
            // Handle API errors
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
            setError(`Import failed: ${errorMessage}`);
            console.error('Import API error:', response.status, errorData);
          }
        } catch (apiError: any) {
          console.error('Import API call error:', apiError);
          setError(`Import failed: ${apiError.message || 'Network error occurred'}`);
        }
      }

    } catch (error: any) {
      console.error('Import error:', error);
      setError(`Import error: ${error.message || 'An unexpected error occurred'}`);
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };


  // Handle tab change and update URL
  const handleTabChange = (value: string) => {
    const newTab = value as 'overview' | 'transactions' | 'analytics' | 'accounting';
    console.log('🔄 Tab change:', newTab, 'Previous tab:', activeTab);
    setActiveTab(newTab);
    
    // Save tab state to localStorage for persistence across page reloads
    localStorage.setItem('clients-page-active-tab', newTab);
    
    // Preserve existing search parameters and only update the tab
    const currentParams = new URLSearchParams(searchParams);
    currentParams.set('tab', newTab);
    setSearchParams(currentParams);
  };


  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case 'pending':
        return <Clock className='h-4 w-4 text-yellow-500' />;
      case 'failed':
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      default:
        return <CheckCircle className='h-4 w-4 text-green-500' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  const handlePageChange = (newPage: number) => {
    console.log('🔄 Page change:', newPage, 'Current tab:', activeTab);
    setPaginationLoading(true);
    setPagination(prev => ({ ...prev, page: newPage }));
    // Ensure tab state is preserved during pagination changes
    // Don't reset the tab or URL parameters
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    console.log('🔄 Items per page change:', newItemsPerPage);
    setPaginationLoading(true);
    setPagination(prev => ({ 
      ...prev, 
      per_page: newItemsPerPage, 
      page: 1 // Reset to first page when changing page size
    }));
  };

  // Loading state
  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6">
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleImport}
        style={{ display: 'none' }}
        id="csv-file-input"
      />

        {/* Header Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Client Management</h1>
                <p className="text-gray-600 mt-1">
                  Comprehensive client management and transaction tracking
                </p>
            </div>
            <div className="flex items-center space-x-3">
            </div>
          </div>
        </div>

        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className={`grid w-full grid-cols-4 bg-gray-50/80 border border-gray-200/60 ${getRadius('md')} shadow-sm`}>
              <TabsTrigger value="overview" className="group flex items-center gap-2 transition-all duration-300 ease-in-out hover:bg-white/90 hover:shadow-md hover:scale-[1.02] data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:border data-[state=active]:border-gray-200">
                <BarChart3 className="h-4 w-4 transition-all duration-300 ease-in-out group-hover:scale-110 group-hover:text-blue-600" />
                <span className="transition-all duration-300 ease-in-out group-hover:font-semibold">Overview</span>
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
            {/* Overview Content */}
            <UnifiedCard variant="elevated" className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Financial Overview
                </CardTitle>
                <CardDescription>
                  Key metrics and performance indicators
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">Total Transactions</p>
                        <p className="text-2xl font-bold text-blue-900">{pagination.total}</p>
                        <p className="text-xs text-blue-500">+12% from last month</p>
                      </div>
                      <FileText className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">Active Clients</p>
                        <p className="text-2xl font-bold text-green-900">24</p>
                        <p className="text-xs text-green-500">+5% from last month</p>
                      </div>
                      <Users className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Total Volume</p>
                        <p className="text-2xl font-bold text-purple-900">₺2.4M</p>
                        <p className="text-xs text-purple-500">+8% from last month</p>
                      </div>
                      <DollarSign className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Commission</p>
                        <p className="text-2xl font-bold text-orange-900">₺48K</p>
                        <p className="text-xs text-orange-500">+15% from last month</p>
                      </div>
                      <TrendingUp className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>

            {/* Recent Activity */}
            <UnifiedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Latest transactions and system activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          transaction.category === 'DEP' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {transaction.category === 'DEP' ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{transaction.client_name}</p>
                          <p className="text-sm text-gray-500">{transaction.psp} • {formatDate(transaction.created_at || transaction.date || '')}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(transaction.amount, transaction.currency || '₺')}
                        </p>
                        <p className="text-sm text-gray-500">{transaction.category}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UnifiedCard>
          </TabsContent>

          <TabsContent value="transactions" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
            {/* Error Display */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                  <p className="text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Success Display */}
            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                  <p className="text-green-700 whitespace-pre-line">{success}</p>
                </div>
              </div>
            )}

        {/* Search and Filters */}
        <div className="mb-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions, clients, reports..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {getActiveFilterCount() > 0 && (
                <Badge className="ml-2 bg-primary-100 text-primary-800">
                  {getActiveFilterCount()}
                </Badge>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'Exporting...' : 'Export'}
            </Button>
            <Button
              variant="outline"
              onClick={triggerFileInput}
              disabled={importing}
              className="flex items-center"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>

        {/* Modern Filter Panel */}
        {showFilters && (
          <Card className="mb-6 border-slate-200/60 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                    <Filter className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-800">Transaction Filters</CardTitle>
                    <CardDescription className="text-sm text-slate-600">
                      Filter transactions by various criteria to find exactly what you need
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getActiveFilterCount() > 0 && (
                    <Badge className="bg-blue-100 text-blue-800 font-medium">
                      {getActiveFilterCount()} active
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Debug info for dropdown options */}
              <div className="mb-4 p-3 bg-gray-100 rounded-lg text-xs">
                <div className="font-semibold text-gray-700 mb-1">Dropdown Options Status:</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-gray-600">
                  <div>PSPs: {dropdownOptions.psps?.length || 0}</div>
                  <div>Categories: {dropdownOptions.categories?.length || 0}</div>
                  <div>Methods: {dropdownOptions.payment_methods?.length || 0}</div>
                  <div>Companies: {dropdownOptions.companies?.length || 0}</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Search Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search transactions..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Date Range Filters */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Start Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      value={filters.date_from}
                      onChange={(e) => handleFilterChange('date_from', e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">End Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="date"
                      value={filters.date_to}
                      onChange={(e) => handleFilterChange('date_to', e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* PSP Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">PSP</label>
                  <select
                    value={filters.psp}
                    onChange={(e) => handleFilterChange('psp', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="">All PSPs</option>
                    {dropdownOptions.psps && dropdownOptions.psps.length > 0 ? (
                      dropdownOptions.psps.map((psp) => (
                        <option key={psp} value={psp}>{psp}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading PSPs...</option>
                    )}
                  </select>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500">
                    PSPs loaded: {dropdownOptions.psps?.length || 0}
                  </div>
                </div>

                {/* Category Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="">All Categories</option>
                    {dropdownOptions.categories && dropdownOptions.categories.length > 0 ? (
                      dropdownOptions.categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading Categories...</option>
                    )}
                  </select>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500">
                    Categories loaded: {dropdownOptions.categories?.length || 0}
                  </div>
                </div>

                {/* Payment Method Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Payment Method</label>
                  <select
                    value={filters.payment_method}
                    onChange={(e) => handleFilterChange('payment_method', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="">All Methods</option>
                    {dropdownOptions.payment_methods && dropdownOptions.payment_methods.length > 0 ? (
                      dropdownOptions.payment_methods.map((method) => (
                        <option key={method} value={method}>{method}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading Methods...</option>
                    )}
                  </select>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500">
                    Methods loaded: {dropdownOptions.payment_methods?.length || 0}
                  </div>
                </div>

                {/* Company Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Company</label>
                  <select
                    value={filters.company}
                    onChange={(e) => handleFilterChange('company', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="">All Companies</option>
                    {dropdownOptions.companies && dropdownOptions.companies.length > 0 ? (
                      dropdownOptions.companies.map((company) => (
                        <option key={company} value={company}>{company}</option>
                      ))
                    ) : (
                      <option value="" disabled>Loading Companies...</option>
                    )}
                  </select>
                  {/* Debug info */}
                  <div className="text-xs text-gray-500">
                    Companies loaded: {dropdownOptions.companies?.length || 0}
                  </div>
                </div>

                {/* Amount Range Filters */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Min Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={filters.amount_min}
                      onChange={(e) => handleFilterChange('amount_min', e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Max Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      type="number"
                      placeholder="1000000.00"
                      value={filters.amount_max}
                      onChange={(e) => handleFilterChange('amount_max', e.target.value)}
                      className="pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-700">Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700"
                  >
                    <option value="">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  {getActiveFilterCount() > 0 && (
                    <span className="text-sm text-slate-500">
                      {getActiveFilterCount()} filter{getActiveFilterCount() !== 1 ? 's' : ''} applied
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="text-slate-600 hover:text-slate-800"
                  >
                    Close
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFilters(false)}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {(loading || isLoadingData) && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading transactions...</p>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        {!loading && !isLoadingData && (
          <div className="bg-white rounded-lg shadow">
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                <p className="text-gray-600 mb-4">
                  {getActiveFilterCount() > 0 
                    ? "Try adjusting your filters to see more results."
                    : "Get started by adding your first transaction."
                  }
                </p>
                {getActiveFilterCount() > 0 ? (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear Filters
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/transactions/add')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Bulk Actions */}
                {selectedTransactions.length > 0 && (
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        {selectedTransactions.length} transaction(s) selected
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDelete}
                          disabled={bulkDeleting}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          {bulkDeleting ? 'Deleting...' : 'Delete Selected'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransactions([])}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.length === transactions.length && transactions.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTransactions(transactions.map(t => t.id));
                              } else {
                                setSelectedTransactions([]);
                              }
                            }}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Company
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Category
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
                          PSP
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.includes(transaction.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTransactions(prev => [...prev, transaction.id]);
                                } else {
                                  setSelectedTransactions(prev => prev.filter(id => id !== transaction.id));
                                }
                              }}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {transaction.client_name || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {transaction.company || 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge 
                              className={
                                transaction.category === 'DEP' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }
                            >
                              {transaction.category}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(transaction.amount, transaction.currency || '₺')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatCurrency(transaction.commission, transaction.currency || '₺')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-sm font-medium ${
                              transaction.net_amount >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(transaction.net_amount, transaction.currency || '₺')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {transaction.psp || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(transaction.created_at || transaction.date || '')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(transaction)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditTransaction(transaction)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Professional Pagination */}
                <ProfessionalPagination
                  currentPage={pagination.page}
                  totalPages={pagination.pages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.per_page}
                  onPageChange={handlePageChange}
                  onItemsPerPageChange={handleItemsPerPageChange}
                  loading={paginationLoading}
                  showItemsPerPage={true}
                  showJumpToPage={true}
                  itemsPerPageOptions={[10, 25, 50, 100, 200, 500, 1000, 2000, 5000]}
                />
              </>
            )}
          </div>
        )}

        {/* Modals */}
        {viewModalOpen && selectedTransaction && (
          <Modal
            isOpen={viewModalOpen}
            onClose={() => {
              setViewModalOpen(false);
              setSelectedTransaction(null);
            }}
            title="Transaction Details"
          >
            <TransactionDetailView transaction={selectedTransaction} />
          </Modal>
        )}

        {editModalOpen && selectedTransaction && (
          <Modal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setSelectedTransaction(null);
            }}
            title="Edit Transaction"
          >
            <TransactionEditForm
              transaction={selectedTransaction}
              onSave={handleSaveTransaction}
              onCancel={() => {
                setEditModalOpen(false);
                setSelectedTransaction(null);
              }}
              dropdownOptions={dropdownOptions}
            />
          </Modal>
        )}
          </TabsContent>

          <TabsContent value="analytics" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
            {/* Analytics Overview Section */}
            <UnifiedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Analytics Overview
                </CardTitle>
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
                        <RechartsLineChart data={[
                          { month: '2024-01', deposits: 120000, withdrawals: 80000 },
                          { month: '2024-02', deposits: 150000, withdrawals: 90000 },
                          { month: '2024-03', deposits: 180000, withdrawals: 110000 },
                          { month: '2024-04', deposits: 200000, withdrawals: 120000 },
                          { month: '2024-05', deposits: 220000, withdrawals: 130000 },
                          { month: '2024-06', deposits: 250000, withdrawals: 140000 },
                        ]}>
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
                            stroke='#10b981' 
                            strokeWidth={3}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                          />
                          <Line 
                            type='monotone' 
                            dataKey='withdrawals' 
                            stroke='#ef4444' 
                            strokeWidth={3}
                            dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, stroke: '#ef4444', strokeWidth: 2 }}
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
                            data={[
                              { name: 'Bank', volume: 400000, color: '#3b82f6' },
                              { name: 'Credit Card', volume: 300000, color: '#10b981' },
                              { name: 'Tether', volume: 200000, color: '#f59e0b' },
                            ]}
                            cx='50%'
                            cy='50%'
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={5}
                            dataKey='volume'
                          >
                            {[
                              { name: 'Bank', volume: 400000, color: '#3b82f6' },
                              { name: 'Credit Card', volume: 300000, color: '#10b981' },
                              { name: 'Tether', volume: 200000, color: '#f59e0b' },
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
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
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </CardContent>
            </UnifiedCard>
          </TabsContent>

          <TabsContent value="accounting" className={`${getSectionSpacing('lg').margin} ${getSectionSpacing('lg').padding}`}>
            {/* Accounting Overview Section */}
            <UnifiedCard>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Accounting Overview
                </CardTitle>
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
                            transactions.reduce((sum, t) => sum + (t.amount > 0 ? t.amount : 0), 0),
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
                            transactions.reduce((sum, t) => sum + t.commission, 0),
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
                            transactions.reduce((sum, t) => sum + t.net_amount, 0),
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
                          {pagination.total.toLocaleString()}
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
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Financial Reports
                </CardTitle>
                <CardDescription>Generate and download financial reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                    <Download className="h-6 w-6" />
                    <span>Monthly Report</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                    <FileText className="h-6 w-6" />
                    <span>Transaction Summary</span>
                  </Button>
                  <Button variant="outline" className="h-20 flex flex-col items-center justify-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    <span>Analytics Report</span>
                  </Button>
                </div>
              </CardContent>
            </UnifiedCard>
          </TabsContent>
        </Tabs>
        </div>
    </>
  );
}