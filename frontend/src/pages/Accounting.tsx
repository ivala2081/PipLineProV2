import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  RefreshCw,
  CheckCircle,
  Clock,
  PieChart,
  MoreHorizontal,
  Upload,
  Info,
  Calculator,
  Receipt,
  Banknote,
  Wallet
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../utils/apiClient';
import { formatCurrency as formatCurrencyUtil } from '../utils/currencyUtils';
import { 
  UnifiedCard, 
  UnifiedButton, 
  UnifiedBadge, 
  UnifiedSection, 
  UnifiedGrid 
} from '../design-system';
import { Breadcrumb } from '../components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import StandardMetricsCard from '../components/StandardMetricsCard';
import MetricCard from '../components/MetricCard';

interface AccountingEntry {
  id: number;
  account_name: string;
  account_type: string;
  amount: number;
  currency: string;
  description: string;
  date: string;
  category: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export default function Accounting() {
  const { t } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'analytics' | 'clients' | 'accounting'>('overview');
  const [accountingEntries, setAccountingEntries] = useState<AccountingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Mock data for demonstration
  const mockAccountingEntries: AccountingEntry[] = [
    {
      id: 1,
      account_name: 'Cash Account',
      account_type: 'Asset',
      amount: 150000,
      currency: 'TL',
      description: 'Initial cash deposit',
      date: '2025-01-01',
      category: 'Revenue',
      status: 'approved',
      created_at: '2025-01-01T10:00:00Z',
      updated_at: '2025-01-01T10:00:00Z'
    },
    {
      id: 2,
      account_name: 'Bank Account',
      account_type: 'Asset',
      amount: 250000,
      currency: 'TL',
      description: 'Bank transfer received',
      date: '2025-01-02',
      category: 'Revenue',
      status: 'approved',
      created_at: '2025-01-02T10:00:00Z',
      updated_at: '2025-01-02T10:00:00Z'
    },
    {
      id: 3,
      account_name: 'Commission Expense',
      account_type: 'Expense',
      amount: -15000,
      currency: 'TL',
      description: 'PSP commission payment',
      date: '2025-01-03',
      category: 'Expense',
      status: 'pending',
      created_at: '2025-01-03T10:00:00Z',
      updated_at: '2025-01-03T10:00:00Z'
    }
  ];

  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      // For now, use mock data since the API endpoints don't exist yet
      setAccountingEntries(mockAccountingEntries);
      setLoading(false);
    }
  }, [isAuthenticated, authLoading]);

  const filteredEntries = accountingEntries.filter(entry => {
    const matchesSearch = entry.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || entry.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || entry.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const totalAssets = accountingEntries
    .filter(entry => entry.account_type === 'Asset')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const totalLiabilities = accountingEntries
    .filter(entry => entry.account_type === 'Liability')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const totalRevenue = accountingEntries
    .filter(entry => entry.category === 'Revenue')
    .reduce((sum, entry) => sum + entry.amount, 0);

  const totalExpenses = accountingEntries
    .filter(entry => entry.category === 'Expense')
    .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

  const netIncome = totalRevenue - totalExpenses;

  if (authLoading) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-gray-50'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto'></div>
          <p className='mt-4 text-gray-600'>Loading accounting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">

      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Calculator className="h-8 w-8 text-gray-600" />
              Accounting
            </h1>
            <p className="text-gray-600">Financial records and accounting management</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              onClick={() => {/* Add new accounting entry */}}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'overview' | 'transactions' | 'analytics' | 'clients' | 'accounting')} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Clients
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Transactions
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <LineChart className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="accounting" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Accounting
          </TabsTrigger>
        </TabsList>

        {/* Tab Content */}
        <TabsContent value="overview" className="mt-8 space-y-8">
          <div className="p-6">
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <UnifiedCard variant="elevated" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <UnifiedBadge variant="success" size="sm">ASSETS</UnifiedBadge>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-600">Total Assets</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrencyUtil(totalAssets, '₺')}
                    </p>
                  </div>
                </CardContent>
              </UnifiedCard>

              <UnifiedCard variant="elevated" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-500/10 to-rose-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg">
                      <CreditCard className="h-6 w-6 text-white" />
                    </div>
                    <UnifiedBadge variant="destructive" size="sm">LIABILITIES</UnifiedBadge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Total Liabilities</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrencyUtil(totalLiabilities, '₺')}
                    </p>
                  </div>
                </CardContent>
              </UnifiedCard>

              <UnifiedCard variant="elevated" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <UnifiedBadge variant="secondary" size="sm">REVENUE</UnifiedBadge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrencyUtil(totalRevenue, '₺')}
                    </p>
                  </div>
                </CardContent>
              </UnifiedCard>

              <UnifiedCard variant="elevated" className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-violet-500/10 rounded-full -translate-y-16 translate-x-16"></div>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg">
                      <Calculator className="h-6 w-6 text-white" />
                    </div>
                    <UnifiedBadge variant="outline" size="sm">NET INCOME</UnifiedBadge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-600">Net Income</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {formatCurrencyUtil(netIncome, '₺')}
                    </p>
                  </div>
                </CardContent>
              </UnifiedCard>
            </div>

            {/* Recent Accounting Entries */}
            <UnifiedCard variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-blue-600" />
                  Recent Accounting Entries
                </CardTitle>
                <CardDescription>
                  Latest financial transactions and accounting records
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEntries.slice(0, 5).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Banknote className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.account_name}</p>
                          <p className="text-sm text-gray-500">{entry.description}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrencyUtil(entry.amount, entry.currency)}
                        </p>
                        <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                          {entry.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UnifiedCard>
          </div>
        </TabsContent>

        <TabsContent value="clients" className="mt-8 space-y-8">
          <div className="p-6">
            <UnifiedCard variant="elevated">
              <CardHeader>
                <CardTitle>Clients Overview</CardTitle>
                <CardDescription>Client-related accounting information</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Client accounting data will be displayed here.</p>
              </CardContent>
            </UnifiedCard>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="mt-8 space-y-8">
          <div className="p-6">
            <UnifiedCard variant="elevated">
              <CardHeader>
                <CardTitle>Transaction Records</CardTitle>
                <CardDescription>Detailed transaction accounting records</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Transaction accounting data will be displayed here.</p>
              </CardContent>
            </UnifiedCard>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-8 space-y-8">
          <div className="p-6">
            <UnifiedCard variant="elevated">
              <CardHeader>
                <CardTitle>Accounting Analytics</CardTitle>
                <CardDescription>Financial analytics and reporting</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Accounting analytics will be displayed here.</p>
              </CardContent>
            </UnifiedCard>
          </div>
        </TabsContent>

        <TabsContent value="accounting" className="mt-8 space-y-8">
          <div className="p-6">
            <UnifiedCard variant="elevated">
              <CardHeader>
                <CardTitle>Accounting Management</CardTitle>
                <CardDescription>Complete accounting system management</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredEntries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <Wallet className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{entry.account_name}</p>
                          <p className="text-sm text-gray-500">{entry.description}</p>
                          <p className="text-xs text-gray-400">{entry.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${entry.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrencyUtil(entry.amount, entry.currency)}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{entry.account_type}</Badge>
                          <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'}>
                            {entry.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </UnifiedCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
