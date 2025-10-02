import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchClientAnalytics } from '../../store/slices/dashboardSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  UnifiedCard, 
  UnifiedButton, 
  UnifiedBadge, 
  UnifiedSection, 
  UnifiedGrid 
} from '../../design-system';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { RevenueChart } from './RevenueChart';
import { DataTable } from './DataTable';
import { SkeletonLoader } from './SkeletonLoader';
import { dashboardService, DashboardData } from '../../services/dashboardService';
import { ExcelExportService } from '../../services/excelExportService';
import { getStatusColor, getHealthColor, getPerformanceColor, getUsageColor, getPriorityColor, statusText } from '../../utils/colorUtils';
import { getCardSpacing, getSectionSpacing, getGridSpacing, getComponentSpacing, getTextSpacing, getRadius } from '../../utils/spacingUtils';
import { getHeadingStyles, getBodyStyles, getUIStyles, getDataStyles, getTypographyStyles } from '../../utils/typographyUtils';
import '../../styles/dashboard-modern.css';
import { 
  Users, 
  DollarSign, 
  Activity, 
  BarChart3, 
  Building2, 
  Target, 
  Calendar, 
  RefreshCw, 
  Settings, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  AlertTriangle, 
  Info, 
  Clock, 
  Database, 
  Shield, 
  Zap,
  Globe,
  Plus,
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  Filter,
  ChevronLeft,
  ChevronRight,
  Search,
  ChevronDown,
  MoreHorizontal,
  Bell,
  Star,
  PieChart,
  LineChart,
  BarChart,
  Layers,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Unlock,
  Server,
  Network,
  Award,
  Sparkles,
  CreditCard
} from 'lucide-react';

interface ModernDashboardProps {
  user?: {
    username?: string;
  };
}

const ModernDashboard: React.FC<ModernDashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { clientAnalytics } = useAppSelector((state) => state.dashboard);
  
  const [activeView, setActiveView] = useState('overview');
  const [timeRange, setTimeRange] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showZeroValues, setShowZeroValues] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [commissionAnalytics, setCommissionAnalytics] = useState<any>(null);
  const [exchangeRates, setExchangeRates] = useState<any>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'daily' | 'monthly' | 'annual'>('daily');
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [financialPerformanceData, setFinancialPerformanceData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date()); // Current month by default
  const [selectedMonthData, setSelectedMonthData] = useState<any>(null);
  const [selectedDay, setSelectedDay] = useState<Date>(new Date()); // Current day by default
  const [selectedDayData, setSelectedDayData] = useState<any>(null);

  // Month navigation functions
  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setSelectedMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setSelectedMonth(newMonth);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedMonth.getMonth() === now.getMonth() && selectedMonth.getFullYear() === now.getFullYear();
  };

  // Day navigation functions
  const goToPreviousDay = () => {
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() - 1);
    setSelectedDay(newDay);
  };

  const goToNextDay = () => {
    const newDay = new Date(selectedDay);
    newDay.setDate(newDay.getDate() + 1);
    setSelectedDay(newDay);
  };

  const isCurrentDay = () => {
    const now = new Date();
    return selectedDay.getDate() === now.getDate() && 
           selectedDay.getMonth() === now.getMonth() && 
           selectedDay.getFullYear() === now.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const formatDayDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Generate quick stats from real data
  const getQuickStats = () => {
    if (!dashboardData) return [];
    
    return [
      {
        label: 'Net Cash',
        value: `₺${((dashboardData.summary as any)?.total_net || 0).toLocaleString()}`,
        icon: DollarSign,
        change: '+12.5%',
        trend: 'up'
      },
      {
        label: 'Active Clients',
        value: dashboardData.stats.active_clients.value,
        icon: Users,
        change: '+8.2%',
        trend: 'up'
      },
      {
        label: 'Total Transactions',
        value: dashboardData.stats.total_transactions.value,
        icon: Activity,
        change: '+15.3%',
        trend: 'up'
      },
      {
        label: 'Success Rate',
        value: `${(dashboardData.stats as any).success_rate?.value || 95}%`,
        icon: CheckCircle,
        change: '+2.1%',
        trend: 'up'
      }
    ];
  };

  // Helper function to safely get numeric values with fallback
  const safeGetValue = (obj: any, key: string, fallback: number = 0): number => {
    const value = obj?.[key];
    return (typeof value === 'number' && !isNaN(value)) ? value : fallback;
  };

  // Generate financial performance breakdown data by time period using real data
  const getFinancialPerformanceBreakdown = () => {
    if (!financialPerformanceData) return [];
    
    const data = financialPerformanceData.data;
    
    // Use real data from API
    const dailyData = data.daily;
    const monthlyData = data.monthly;
    const annualData = data.annual;
    
    // Calculate daily metrics from real data (use selected day data if available)
    const currentDailyData = selectedDayData || dailyData;
    const dailyTotalBank = currentDailyData.total_bank_usd + (currentDailyData.total_bank_tl / (data.exchange_rate || 48));
    const dailyCreditCard = currentDailyData.total_cc_usd + (currentDailyData.total_cc_tl / (data.exchange_rate || 48));
    const dailyTether = currentDailyData.total_tether_usd + (currentDailyData.total_tether_tl / (data.exchange_rate || 48));
    const dailyConv = currentDailyData.conv_usd || 0; // Total revenue in USD
    
    // Calculate monthly metrics from real data (use selected month data if available)
    const currentMonthlyData = selectedMonthData || monthlyData;
    const monthlyTotalBank = currentMonthlyData.total_bank_usd + (currentMonthlyData.total_bank_tl / (data.exchange_rate || 48));
    const monthlyCreditCard = currentMonthlyData.total_cc_usd + (currentMonthlyData.total_cc_tl / (data.exchange_rate || 48));
    const monthlyTether = currentMonthlyData.total_tether_usd + (currentMonthlyData.total_tether_tl / (data.exchange_rate || 48));
    const monthlyConv = currentMonthlyData.conv_usd || 0; // Total revenue in USD
    
    // Calculate annual metrics from real data
    const annualTotalBank = annualData.total_bank_usd + (annualData.total_bank_tl / (data.exchange_rate || 48));
    const annualCreditCard = annualData.total_cc_usd + (annualData.total_cc_tl / (data.exchange_rate || 48));
    const annualTether = annualData.total_tether_usd + (annualData.total_tether_tl / (data.exchange_rate || 48));
    const annualConv = annualData.conv_usd || 0; // Total revenue in USD
    
    // Use real transaction counts for trends
    const dailyTrend = 0; // Could be calculated from previous day comparison
    const monthlyTrend = 0; // Could be calculated from previous month comparison
    const annualTrend = 0; // Could be calculated from previous year comparison
    
    return [
      // Daily metrics
      {
        timePeriod: 'Daily',
        metric: 'Total Bank',
        amount: currentDailyData.total_bank_usd + currentDailyData.total_bank_tl,
        usdAmount: currentDailyData.total_bank_usd,
        tlAmount: currentDailyData.total_bank_tl,
        count: currentDailyData.bank_count,
        trend: dailyTrend,
        icon: Building2,
        description: 'Today\'s bank transactions',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: dailyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'CC (Credit Card)',
        amount: currentDailyData.total_cc_usd + currentDailyData.total_cc_tl,
        usdAmount: currentDailyData.total_cc_usd,
        tlAmount: currentDailyData.total_cc_tl,
        count: currentDailyData.cc_count,
        trend: dailyTrend,
        icon: CreditCard,
        description: 'Today\'s credit card transactions',
        color: 'purple',
        bgColor: 'bg-purple-50',
        iconColor: 'text-gray-800',
        trendColor: dailyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'Tether',
        amount: currentDailyData.total_tether_usd + currentDailyData.total_tether_tl,
        usdAmount: currentDailyData.total_tether_usd,
        tlAmount: currentDailyData.total_tether_tl,
        count: currentDailyData.tether_count,
        trend: dailyTrend,
        icon: DollarSign,
        description: 'Today\'s tether transactions',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: dailyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'Conv',
        amount: dailyConv,
        usdAmount: dailyConv,
        tlAmount: 0,
        count: 0,
        trend: 0,
        icon: Activity,
        description: 'Total revenue in USD (all methods converted)',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: 'text-blue-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'Total Deposits',
        amount: safeGetValue(currentDailyData, 'total_deposits_usd') + safeGetValue(currentDailyData, 'total_deposits_tl'),
        usdAmount: safeGetValue(currentDailyData, 'total_deposits_usd'),
        tlAmount: safeGetValue(currentDailyData, 'total_deposits_tl'),
        count: 0,
        trend: dailyTrend,
        icon: TrendingUp,
        description: 'Today\'s total deposits',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: dailyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'Total Withdrawals',
        amount: safeGetValue(currentDailyData, 'total_withdrawals_usd') + safeGetValue(currentDailyData, 'total_withdrawals_tl'),
        usdAmount: safeGetValue(currentDailyData, 'total_withdrawals_usd'),
        tlAmount: safeGetValue(currentDailyData, 'total_withdrawals_tl'),
        count: 0,
        trend: dailyTrend,
        icon: TrendingDown,
        description: 'Today\'s total withdrawals',
        color: 'red',
        bgColor: 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: dailyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Daily',
        metric: 'Net Cash',
        amount: safeGetValue(currentDailyData, 'net_cash_usd') + safeGetValue(currentDailyData, 'net_cash_tl'),
        usdAmount: safeGetValue(currentDailyData, 'net_cash_usd'),
        tlAmount: safeGetValue(currentDailyData, 'net_cash_tl'),
        count: 0,
        trend: dailyTrend,
        icon: DollarSign,
        description: 'Today\'s net cash flow (deposits - withdrawals)',
        color: (safeGetValue(currentDailyData, 'net_cash_usd') + safeGetValue(currentDailyData, 'net_cash_tl')) >= 0 ? 'green' : 'red',
        bgColor: (safeGetValue(currentDailyData, 'net_cash_usd') + safeGetValue(currentDailyData, 'net_cash_tl')) >= 0 ? 'bg-green-50' : 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: (safeGetValue(currentDailyData, 'net_cash_usd') + safeGetValue(currentDailyData, 'net_cash_tl')) >= 0 ? 'text-green-600' : 'text-red-600'
      },
      // Monthly metrics
      {
        timePeriod: 'Monthly',
        metric: 'Total Bank',
        amount: currentMonthlyData.total_bank_usd + currentMonthlyData.total_bank_tl,
        usdAmount: currentMonthlyData.total_bank_usd,
        tlAmount: currentMonthlyData.total_bank_tl,
        count: currentMonthlyData.bank_count,
        trend: monthlyTrend,
        icon: Building2,
        description: 'This month\'s bank transactions',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'CC (Credit Card)',
        amount: currentMonthlyData.total_cc_usd + currentMonthlyData.total_cc_tl,
        usdAmount: currentMonthlyData.total_cc_usd,
        tlAmount: currentMonthlyData.total_cc_tl,
        count: currentMonthlyData.cc_count,
        trend: monthlyTrend,
        icon: CreditCard,
        description: 'This month\'s credit card transactions',
        color: 'purple',
        bgColor: 'bg-purple-50',
        iconColor: 'text-gray-800',
        trendColor: monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'Tether',
        amount: currentMonthlyData.total_tether_usd + currentMonthlyData.total_tether_tl,
        usdAmount: currentMonthlyData.total_tether_usd,
        tlAmount: currentMonthlyData.total_tether_tl,
        count: currentMonthlyData.tether_count,
        trend: monthlyTrend,
        icon: DollarSign,
        description: 'This month\'s tether transactions',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'Conv',
        amount: monthlyConv,
        usdAmount: monthlyConv,
        tlAmount: 0,
        count: 0,
        trend: 0,
        icon: Activity,
        description: 'Total revenue in USD (all methods converted)',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: 'text-blue-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'Total Deposits',
        amount: safeGetValue(currentMonthlyData, 'total_deposits_usd') + safeGetValue(currentMonthlyData, 'total_deposits_tl'),
        usdAmount: safeGetValue(currentMonthlyData, 'total_deposits_usd'),
        tlAmount: safeGetValue(currentMonthlyData, 'total_deposits_tl'),
        count: 0,
        trend: monthlyTrend,
        icon: TrendingUp,
        description: 'This month\'s total deposits',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'Total Withdrawals',
        amount: safeGetValue(currentMonthlyData, 'total_withdrawals_usd') + safeGetValue(currentMonthlyData, 'total_withdrawals_tl'),
        usdAmount: safeGetValue(currentMonthlyData, 'total_withdrawals_usd'),
        tlAmount: safeGetValue(currentMonthlyData, 'total_withdrawals_tl'),
        count: 0,
        trend: monthlyTrend,
        icon: TrendingDown,
        description: 'This month\'s total withdrawals',
        color: 'red',
        bgColor: 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Monthly',
        metric: 'Net Cash',
        amount: safeGetValue(currentMonthlyData, 'net_cash_usd') + safeGetValue(currentMonthlyData, 'net_cash_tl'),
        usdAmount: safeGetValue(currentMonthlyData, 'net_cash_usd'),
        tlAmount: safeGetValue(currentMonthlyData, 'net_cash_tl'),
        count: 0,
        trend: monthlyTrend,
        icon: DollarSign,
        description: 'This month\'s net cash flow (deposits - withdrawals)',
        color: (safeGetValue(currentMonthlyData, 'net_cash_usd') + safeGetValue(currentMonthlyData, 'net_cash_tl')) >= 0 ? 'green' : 'red',
        bgColor: (safeGetValue(currentMonthlyData, 'net_cash_usd') + safeGetValue(currentMonthlyData, 'net_cash_tl')) >= 0 ? 'bg-green-50' : 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: (safeGetValue(currentMonthlyData, 'net_cash_usd') + safeGetValue(currentMonthlyData, 'net_cash_tl')) >= 0 ? 'text-green-600' : 'text-red-600'
      },
      // Total metrics
      {
        timePeriod: 'Total',
        metric: 'Total Bank',
        amount: annualData.total_bank_usd + annualData.total_bank_tl,
        usdAmount: annualData.total_bank_usd,
        tlAmount: annualData.total_bank_tl,
        count: annualData.bank_count,
        trend: annualTrend,
        icon: Building2,
        description: 'This year\'s bank transactions',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: annualTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Total',
        metric: 'CC (Credit Card)',
        amount: annualData.total_cc_usd + annualData.total_cc_tl,
        usdAmount: annualData.total_cc_usd,
        tlAmount: annualData.total_cc_tl,
        count: annualData.cc_count,
        trend: annualTrend,
        icon: CreditCard,
        description: 'This year\'s credit card transactions',
        color: 'purple',
        bgColor: 'bg-purple-50',
        iconColor: 'text-gray-800',
        trendColor: annualTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Total',
        metric: 'Tether',
        amount: annualData.total_tether_usd + annualData.total_tether_tl,
        usdAmount: annualData.total_tether_usd,
        tlAmount: annualData.total_tether_tl,
        count: annualData.tether_count,
        trend: annualTrend,
        icon: DollarSign,
        description: 'This year\'s tether transactions',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: annualTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Total',
        metric: 'Conv',
        amount: annualConv,
        usdAmount: annualConv,
        tlAmount: 0,
        count: 0,
        trend: 0,
        icon: Activity,
        description: 'Total revenue in USD (all methods converted)',
        color: 'blue',
        bgColor: 'bg-blue-50',
        iconColor: 'text-gray-800',
        trendColor: 'text-blue-600'
      },
      {
        timePeriod: 'Total',
        metric: 'Total Deposits',
        amount: safeGetValue(annualData, 'total_deposits_usd') + safeGetValue(annualData, 'total_deposits_tl'),
        usdAmount: safeGetValue(annualData, 'total_deposits_usd'),
        tlAmount: safeGetValue(annualData, 'total_deposits_tl'),
        count: 0,
        trend: annualTrend,
        icon: TrendingUp,
        description: 'This year\'s total deposits',
        color: 'green',
        bgColor: 'bg-green-50',
        iconColor: 'text-gray-800',
        trendColor: annualTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Total',
        metric: 'Total Withdrawals',
        amount: safeGetValue(annualData, 'total_withdrawals_usd') + safeGetValue(annualData, 'total_withdrawals_tl'),
        usdAmount: safeGetValue(annualData, 'total_withdrawals_usd'),
        tlAmount: safeGetValue(annualData, 'total_withdrawals_tl'),
        count: 0,
        trend: annualTrend,
        icon: TrendingDown,
        description: 'This year\'s total withdrawals',
        color: 'red',
        bgColor: 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: annualTrend >= 0 ? 'text-green-600' : 'text-red-600'
      },
      {
        timePeriod: 'Total',
        metric: 'Net Cash',
        amount: safeGetValue(annualData, 'net_cash_usd') + safeGetValue(annualData, 'net_cash_tl'),
        usdAmount: safeGetValue(annualData, 'net_cash_usd'),
        tlAmount: safeGetValue(annualData, 'net_cash_tl'),
        count: 0,
        trend: annualTrend,
        icon: DollarSign,
        description: 'This year\'s net cash flow (deposits - withdrawals)',
        color: (safeGetValue(annualData, 'net_cash_usd') + safeGetValue(annualData, 'net_cash_tl')) >= 0 ? 'green' : 'red',
        bgColor: (safeGetValue(annualData, 'net_cash_usd') + safeGetValue(annualData, 'net_cash_tl')) >= 0 ? 'bg-green-50' : 'bg-red-50',
        iconColor: 'text-gray-800',
        trendColor: (safeGetValue(annualData, 'net_cash_usd') + safeGetValue(annualData, 'net_cash_tl')) >= 0 ? 'text-green-600' : 'text-red-600'
      }
    ];
  };

  // Transform chart data based on selected period
  const getTransformedChartData = () => {
    if (!dashboardData?.chart_data?.daily_revenue) return [];
    
    const dailyData = dashboardData.chart_data.daily_revenue;
    
    if (chartPeriod === 'daily') {
      return dailyData;
    } else if (chartPeriod === 'monthly') {
      // Group daily data by month
      const monthlyMap = new Map();
      
      dailyData.forEach(item => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
        
        if (monthlyMap.has(monthKey)) {
          monthlyMap.get(monthKey).amount += item.amount;
        } else {
          monthlyMap.set(monthKey, {
            date: monthKey,
            amount: item.amount
          });
        }
      });
      
      return Array.from(monthlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    } else if (chartPeriod === 'annual') {
      // Group daily data by year
      const yearlyMap = new Map();
      
      dailyData.forEach(item => {
        const date = new Date(item.date);
        const yearKey = date.getFullYear().toString();
        
        if (yearlyMap.has(yearKey)) {
          yearlyMap.get(yearKey).amount += item.amount;
        } else {
          yearlyMap.set(yearKey, {
            date: yearKey,
            amount: item.amount
          });
        }
      });
      
      return Array.from(yearlyMap.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
    
    return dailyData;
  };


  // Load dashboard data with debouncing
  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Use a single API call to get all data at once to reduce duplicate requests
        const [
          dashboardStats,
          commission,
          exchangeRates,
          financialPerformance
        ] = await Promise.all([
          dashboardService.getDashboardStats(timeRange),
          dashboardService.getCommissionAnalytics(timeRange),
          dashboardService.getExchangeRates(),
          fetchFinancialPerformanceData(timeRange)
        ]);

        setDashboardData(dashboardStats);
        setCommissionAnalytics(commission);
        setExchangeRates(exchangeRates);
        setFinancialPerformanceData(financialPerformance);
        
        // IMPORTANT: Initialize selected day/month data immediately with loaded data
        // This prevents showing zero values on initial load
        if (financialPerformance?.data) {
          // Set current day data immediately
          if (isCurrentDay() && financialPerformance.data.daily) {
            setSelectedDayData(financialPerformance.data.daily);
            console.log('✅ Current day data initialized:', financialPerformance.data.daily);
          }
          
          // Set current month data immediately
          if (isCurrentMonth() && financialPerformance.data.monthly) {
            setSelectedMonthData(financialPerformance.data.monthly);
            console.log('✅ Current month data initialized:', financialPerformance.data.monthly);
          }
        }
        
        console.log('✅ Dashboard data loaded successfully');
      } catch (error) {
        console.error('❌ Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    // Debounce the API calls to prevent excessive requests
    const timeoutId = setTimeout(loadDashboardData, 100);
    return () => clearTimeout(timeoutId);
  }, [timeRange]);

  // Load selected month data with debouncing (only when month changes)
  useEffect(() => {
    // Skip if we're still loading the main data or no financial performance data yet
    if (loading || !financialPerformanceData) return;
    
    const loadSelectedMonthData = async () => {
      if (isCurrentMonth()) {
        // Use the current month data from the main financial performance data
        if (financialPerformanceData?.data?.monthly) {
          setSelectedMonthData(financialPerformanceData.data.monthly);
          console.log('✅ Using cached current month data');
        }
      } else {
        // Fetch data for the selected month
        console.log('📥 Fetching data for selected month:', selectedMonth);
        const monthData = await fetchMonthlyDataForMonth(selectedMonth);
        setSelectedMonthData(monthData.data);
        console.log('✅ Selected month data loaded');
      }
    };

    // Debounce month data loading to prevent excessive requests
    const timeoutId = setTimeout(loadSelectedMonthData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedMonth, financialPerformanceData, loading]);

  // Load selected day data with debouncing (only when day changes)
  useEffect(() => {
    // Skip if we're still loading the main data or no financial performance data yet
    if (loading || !financialPerformanceData) return;
    
    const loadSelectedDayData = async () => {
      if (isCurrentDay()) {
        // Use the current day data from the main financial performance data
        if (financialPerformanceData?.data?.daily) {
          setSelectedDayData(financialPerformanceData.data.daily);
          console.log('✅ Using cached current day data');
        }
      } else {
        // Fetch data for the selected day
        console.log('📥 Fetching data for selected day:', selectedDay);
        const dayData = await fetchDailyDataForDay(selectedDay);
        setSelectedDayData(dayData.data);
        console.log('✅ Selected day data loaded');
      }
    };

    // Debounce day data loading to prevent excessive requests
    const timeoutId = setTimeout(loadSelectedDayData, 100);
    return () => clearTimeout(timeoutId);
  }, [selectedDay, financialPerformanceData, loading]);

  // Fetch financial performance data using dashboard service for caching
  const fetchFinancialPerformanceData = async (range: string) => {
    try {
      return await dashboardService.getFinancialPerformance(range);
    } catch (error) {
      console.error('Error fetching financial performance data:', error);
      // Return fallback data
      return {
        success: true,
        data: {
          daily: {
            total_bank_usd: 0,
            total_bank_tl: 0,
            total_cc_usd: 0,
            total_cc_tl: 0,
            total_tether_usd: 0,
            total_tether_tl: 0,
            conv_usd: 0,
            conv_tl: 0,
            total_transactions: 0,
            bank_count: 0,
            cc_count: 0,
            tether_count: 0
          },
          monthly: {
            total_bank_usd: 0,
            total_bank_tl: 0,
            total_cc_usd: 0,
            total_cc_tl: 0,
            total_tether_usd: 0,
            total_tether_tl: 0,
            conv_usd: 0,
            conv_tl: 0,
            total_transactions: 0,
            bank_count: 0,
            cc_count: 0,
            tether_count: 0
          },
          annual: {
            total_bank_usd: 0,
            total_bank_tl: 0,
            total_cc_usd: 0,
            total_cc_tl: 0,
            total_tether_usd: 0,
            total_tether_tl: 0,
            conv_usd: 0,
            conv_tl: 0,
            total_transactions: 0,
            bank_count: 0,
            cc_count: 0,
            tether_count: 0
          },
          exchange_rate: 48.0
        }
      };
    }
  };

  // Fetch monthly data for specific month
  const fetchMonthlyDataForMonth = async (month: Date) => {
    try {
      const year = month.getFullYear();
      const monthNum = month.getMonth() + 1; // JavaScript months are 0-based
      const response = await fetch(`/api/v1/financial-performance/monthly?year=${year}&month=${monthNum}`);
      if (!response.ok) {
        throw new Error('Failed to fetch monthly data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching monthly data for specific month:', error);
      // Return fallback data
      return {
        success: true,
        data: {
          total_bank_usd: 0, total_bank_tl: 0, total_cc_usd: 0, total_cc_tl: 0, 
          total_tether_usd: 0, total_tether_tl: 0, conv_usd: 0, 
          bank_count: 0, cc_count: 0, tether_count: 0
        }
      };
    }
  };

  // Fetch daily data for specific day
  const fetchDailyDataForDay = async (day: Date) => {
    try {
      const dateStr = day.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const response = await fetch(`/api/v1/financial-performance/daily?date=${dateStr}`);
      if (!response.ok) {
        throw new Error('Failed to fetch daily data');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching daily data for specific day:', error);
      // Return fallback data
      return {
        success: true,
        data: {
          total_bank_usd: 0, total_bank_tl: 0, total_cc_usd: 0, total_cc_tl: 0, 
          total_tether_usd: 0, total_tether_tl: 0, conv_usd: 0, 
          bank_count: 0, cc_count: 0, tether_count: 0
        }
      };
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    
    try {
      const [
        dashboardStats,
        commission,
        exchangeRates,
        financialPerformance
      ] = await Promise.all([
        dashboardService.refreshDashboard(timeRange),
        dashboardService.getCommissionAnalytics(timeRange),
        dashboardService.getExchangeRates(),
        fetchFinancialPerformanceData(timeRange)
      ]);

      setDashboardData(dashboardStats);
      setCommissionAnalytics(commission);
      setExchangeRates(exchangeRates);
      setFinancialPerformanceData(financialPerformance);
      
      // IMPORTANT: Initialize selected day/month data immediately with refreshed data
      // This prevents showing zero values after refresh
      if (financialPerformance?.data) {
        // Set current day data immediately
        if (isCurrentDay() && financialPerformance.data.daily) {
          setSelectedDayData(financialPerformance.data.daily);
          console.log('✅ Current day data refreshed:', financialPerformance.data.daily);
        }
        
        // Set current month data immediately
        if (isCurrentMonth() && financialPerformance.data.monthly) {
          setSelectedMonthData(financialPerformance.data.monthly);
          console.log('✅ Current month data refreshed:', financialPerformance.data.monthly);
        }
      }
      
      console.log('✅ Dashboard refreshed successfully');
    } catch (error) {
      console.error('❌ Error refreshing dashboard:', error);
      setError('Failed to refresh dashboard. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const handleGenerateReport = async () => {
    if (!dashboardData) return;
    
    setIsGeneratingReport(true);
    try {
      await ExcelExportService.generateComprehensiveReport(timeRange);
      console.log('✅ Report generated successfully');
    } catch (error) {
      console.error('❌ Error generating report:', error);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleMetricClick = (metric: string, period: string) => {
    setSelectedMetric(`${metric}-${period}`);
    console.log(`📊 Metric clicked: ${metric} (${period})`);
    
    // Navigate to detailed view based on metric type
    switch (metric.toLowerCase()) {
      case 'revenue':
        navigate('/analytics/revenue');
        break;
      case 'transactions':
        navigate('/transactions');
        break;
      case 'commission':
        navigate('/analytics/commission');
        break;
      case 'clients':
        navigate('/clients');
        break;
      default:
        navigate('/analytics');
    }
  };

  const handlePeriodHeaderClick = (period: string) => {
    console.log(`📅 Period header clicked: ${period}`);
    setChartPeriod(period as 'daily' | 'monthly' | 'annual');
  };

  if (loading) {
    return (
      <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-8">
              <div className="h-8 dashboard-skeleton rounded-lg w-1/3"></div>
              <div className="dashboard-grid">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 dashboard-skeleton rounded-xl"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 h-96 dashboard-skeleton rounded-xl"></div>
                <div className="h-96 dashboard-skeleton rounded-xl"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
        <div className="px-6 py-8">
          <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[400px]">
              <Card className="w-full max-w-md border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900 mb-3">Error Loading Dashboard</h2>
                  <p className="text-slate-600 mb-6">{error}</p>
                  <Button 
                    onClick={handleRefresh} 
                    disabled={refreshing}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:scale-105"
                  >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Try Again
              </Button>
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const quickStats = getQuickStats();

  return (
    <main className="flex-1 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen">
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <h1 className="dashboard-title text-4xl font-bold tracking-tight">
                Executive Dashboard
            </h1>
              <p className="dashboard-subtitle text-lg">
                Real-time business intelligence and performance metrics
              </p>
          </div>
            
            <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
                className="dashboard-focus px-4 py-2.5 dashboard-glass rounded-lg text-slate-700 font-medium shadow-sm hover:shadow-md transition-all duration-200"
          >
            <option value="all">All Time</option>
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="6m">Last 6 months</option>
            <option value="1y">Last year</option>
          </select>
              
              <Button 
            onClick={handleGenerateReport}
            disabled={isGeneratingReport}
                className="dashboard-button dashboard-focus bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 px-4 py-2.5 rounded-lg font-medium shadow-sm"
          >
                <Download className="w-4 h-4 mr-2" />
            {isGeneratingReport ? 'Generating...' : 'Export'}
              </Button>
              
              <Button 
            onClick={handleRefresh}
            disabled={refreshing}
                className="dashboard-button dashboard-focus bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-lg font-medium shadow-sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
        </div>
      </div>

          {/* Key Metrics Grid */}
          <div className="dashboard-grid">
            {quickStats.map((stat, index) => (
              <Card key={index} className="dashboard-card metric-card group border-0 shadow-lg hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors duration-200 floating">
                      <stat.icon className="w-6 h-6 text-slate-600" />
                </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${
                        stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stat.change}
                            </span>
                      </div>
                          </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-slate-600 font-medium">{stat.label}</p>
                          </div>
                </CardContent>
              </Card>
            ))}
                    </div>

          {/* Main Content - Full Width Daily Transactions Chart */}
          <div className="space-y-8">
            
            {/* Daily Transactions Chart - Full Width */}
              <Card className="dashboard-card dashboard-glass border-0 shadow-lg">
                <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl font-semibold text-slate-900">Daily Transactions Chart</CardTitle>
                    <CardDescription className="text-slate-600">Real-time revenue performance and trends</CardDescription>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Period Selector */}
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                      {(['daily', 'monthly', 'annual'] as const).map((period) => (
                        <button
                          key={period}
                          onClick={() => setChartPeriod(period)}
                          className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200 ${
                            chartPeriod === period
                              ? 'bg-white text-slate-900 shadow-sm'
                              : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                          }`}
                        >
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </button>
                      ))}
                    </div>
                        <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full pulse-live"></div>
                      <span className="text-sm text-slate-600">Live Data</span>
                          </div>
                          </div>
                        </div>
                </CardHeader>
                <CardContent>
                <div className="h-96 chart-container">
                  <RevenueChart 
                    data={getTransformedChartData()} 
                    type="area" 
                    height={350}
                  />
                      </div>
                </CardContent>
              </Card>

            {/* Financial Performance - 3 Separate Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Daily Financial Performance Card */}
              <Card className="dashboard-card dashboard-glass border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900">Daily Performance</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full pulse-live shadow-lg"></div>
                      <span className="text-xs text-slate-600 font-semibold">Live</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getFinancialPerformanceBreakdown().filter(item => item.timePeriod === 'Daily').map((breakdown, index) => (
                      <div key={index}>
                        <div 
                          className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded border hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <breakdown.icon className={`w-4 h-4 ${breakdown.iconColor} group-hover:scale-110 transition-transform duration-200`} />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-200">{breakdown.metric}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-600 transition-colors duration-200">
                              {(breakdown.metric === 'Tether' || breakdown.metric === 'Conv') ? '$' : '₺'}{breakdown.amount.toLocaleString()}
                            </div>
                            {breakdown.count > 0 && (
                              <div className="text-xs text-slate-500">
                                {breakdown.count} txns
                              </div>
                            )}
                          </div>
                        </div>
                        {breakdown.metric === 'Conv' && (
                          <div className="my-2 border-t border-slate-200"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Date Navigation Controls - Bottom */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-center w-full">
                      <div className="flex items-center gap-3 w-full max-w-md">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousDay}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 flex-1 text-center">
                          {formatDayDate(selectedDay)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextDay}
                          disabled={isCurrentDay()}
                          className="h-8 w-8 p-0 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      {!isCurrentDay() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDay(new Date())}
                          className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 ml-4"
                        >
                          Today
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Financial Performance Card */}
              <Card className="dashboard-card dashboard-glass border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <BarChart3 className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900">Monthly Performance</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full pulse-live shadow-lg"></div>
                      <span className="text-xs text-slate-600 font-semibold">Live</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {getFinancialPerformanceBreakdown().filter(item => item.timePeriod === 'Monthly').map((breakdown, index) => (
                      <div key={index}>
                        <div 
                          className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded border hover:bg-slate-100 hover:border-slate-300 hover:shadow-sm transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <breakdown.icon className={`w-4 h-4 ${breakdown.iconColor} group-hover:scale-110 transition-transform duration-200`} />
                            <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors duration-200">{breakdown.metric}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900 group-hover:text-green-600 transition-colors duration-200">
                              {(breakdown.metric === 'Tether' || breakdown.metric === 'Conv') ? '$' : '₺'}{breakdown.amount.toLocaleString()}
                            </div>
                            {breakdown.count > 0 && (
                              <div className="text-xs text-slate-500">
                                {breakdown.count} txns
                              </div>
                            )}
                          </div>
                        </div>
                        {breakdown.metric === 'Conv' && (
                          <div className="my-2 border-t border-slate-200"></div>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Month Navigation Controls - Bottom */}
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-center w-full">
                      <div className="flex items-center gap-3 w-full max-w-md">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPreviousMonth}
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm font-medium text-slate-700 flex-1 text-center">
                          {formatMonthYear(selectedMonth)}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextMonth}
                          disabled={isCurrentMonth()}
                          className="h-8 w-8 p-0 hover:bg-green-50 hover:border-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      {!isCurrentMonth() && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedMonth(new Date())}
                          className="h-8 px-3 text-xs hover:bg-green-50 hover:border-green-300 ml-4"
                        >
                          Current Month
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Total Financial Performance Card - Special Design */}
              <Card className="dashboard-card dashboard-glass border-2 border-gradient-to-r from-purple-500 to-blue-500 shadow-xl relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
                {/* Special gradient background overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-slate-200/40 via-slate-300/30 to-slate-400/20 pointer-events-none"></div>
                
                <CardHeader className="pb-4 relative z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <TrendingUp className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900">
                          Total Performance
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full pulse-live shadow-lg"></div>
                      <span className="text-xs text-slate-600 font-semibold">Live</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-3">
                    {getFinancialPerformanceBreakdown().filter(item => item.timePeriod === 'Total').map((breakdown, index) => (
                      <div key={index}>
                        <div 
                          className="flex items-center justify-between py-4 px-5 bg-gradient-to-r from-slate-200/90 to-slate-300/80 rounded-lg border border-slate-300/70 hover:bg-gradient-to-r hover:from-purple-100/90 hover:to-blue-100/90 hover:border-purple-300 hover:shadow-md transition-all duration-300 group backdrop-blur-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-200 transition-all duration-300">
                              <breakdown.icon className={`w-4 h-4 ${breakdown.iconColor} group-hover:scale-110 transition-transform duration-300`} />
                            </div>
                            <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900 transition-colors duration-300">{breakdown.metric}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-slate-900 group-hover:text-purple-700 transition-colors duration-300">
                              {(breakdown.metric === 'Tether' || breakdown.metric === 'Conv') ? '$' : '₺'}{breakdown.amount.toLocaleString()}
                            </div>
                            {breakdown.count > 0 && (
                              <div className="text-xs text-slate-500 font-medium">
                                {breakdown.count} txns
                              </div>
                            )}
                          </div>
                        </div>
                        {breakdown.metric === 'Conv' && (
                          <div className="my-3 border-t border-slate-300"></div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Professional Chart Cards - Full Width */}
            <div className="space-y-6">
              
              {/* Monthly Progress Analysis */}
              <Card className="dashboard-card dashboard-glass border-0 shadow-lg">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shadow-lg">
                        <PieChart className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-slate-900">Monthly Progress Analysis</CardTitle>
                        <CardDescription className="text-slate-600">Progress indicators with detailed metrics</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full pulse-live shadow-lg"></div>
                      <span className="text-xs text-slate-600 font-semibold">Live</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Progress Rings */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Monthly Progress</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {getFinancialPerformanceBreakdown().filter(item => item.timePeriod === 'Monthly').map((breakdown, index) => (
                          <div key={index} className="text-center">
                            <div className="relative w-16 h-16 mx-auto mb-2">
                              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                                <path
                                  className="text-gray-200"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className="text-gray-600"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  fill="none"
                                  strokeDasharray={`${Math.min(breakdown.amount / 1000, 100)}, 100`}
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <breakdown.icon className="w-5 h-5 text-gray-600" />
                              </div>
                            </div>
                            <div className="text-xs font-medium text-slate-600">{breakdown.metric}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Clean Metrics */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-slate-700 mb-3">Detailed Values</h4>
                      {getFinancialPerformanceBreakdown().filter(item => item.timePeriod === 'Monthly').map((breakdown, index) => (
                        <div key={index} className="flex items-center justify-between py-3 px-4 bg-white rounded border border-slate-200">
                          <div className="flex items-center gap-3">
                            <breakdown.icon className="w-4 h-4 text-gray-600" />
                            <span className="text-sm font-medium text-slate-700">{breakdown.metric}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-slate-900">
                              {(breakdown.metric === 'Tether' || breakdown.metric === 'Conv') ? '$' : '₺'}{breakdown.amount.toLocaleString()}
                            </div>
                            {breakdown.count > 0 && (
                              <div className="text-xs text-slate-500">{breakdown.count} txns</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

          </div>

          </div>
      </div>
    </main>
  );
};

export default ModernDashboard;
