import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  RefreshCw,
  Filter,
  Calendar,
  Download
} from 'lucide-react';
import { ModernCard } from './ModernCard';
import { MetricCard, ProgressRing, MiniChart } from './DataVisualization';
import { ModernBreadcrumbs, QuickSearch, NotificationBadge, UserMenu } from './ModernNavigation';

interface DashboardData {
  totalRevenue: number;
  totalTransactions: number;
  activeClients: number;
  conversionRate: number;
  recentActivity: Array<{
    id: string;
    type: 'transaction' | 'client' | 'system';
    title: string;
    description: string;
    timestamp: string;
    amount?: number;
  }>;
  chartData: number[];
}

interface EnhancedDashboardProps {
  data?: DashboardData;
  loading?: boolean;
  user?: {
    name: string;
    email: string;
    role: string;
    avatar?: string;
  };
}

export const EnhancedDashboard: React.FC<EnhancedDashboardProps> = ({
  data,
  loading = false,
  user = { name: 'John Doe', email: 'john@example.com', role: 'Administrator' }
}) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  // Mock data for demonstration
  const mockData: DashboardData = {
    totalRevenue: 2547890,
    totalTransactions: 1247,
    activeClients: 89,
    conversionRate: 12.5,
    recentActivity: [
      {
        id: '1',
        type: 'transaction',
        title: 'New Transaction',
        description: 'Payment received from Client ABC',
        timestamp: '2 minutes ago',
        amount: 15000
      },
      {
        id: '2',
        type: 'client',
        title: 'New Client Registration',
        description: 'XYZ Corporation joined',
        timestamp: '15 minutes ago'
      },
      {
        id: '3',
        type: 'system',
        title: 'System Update',
        description: 'Exchange rates updated',
        timestamp: '1 hour ago'
      }
    ],
    chartData: [65, 78, 66, 44, 56, 67, 75, 82, 94, 89, 76, 91]
  };

  const dashboardData = data || mockData;

  const breadcrumbItems = [
    { label: 'Home', href: '/', icon: BarChart3 },
    { label: 'Dashboard' }
  ];

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    setRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Enhanced Header */}
      <header className="bg-white border-b border-gray-200/60 sticky top-0 z-40 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
                  Dashboard
                </h1>
                <ModernBreadcrumbs items={breadcrumbItems} className="mt-1" />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-4">
              <QuickSearch
                placeholder="Search transactions, clients..."
                className="w-80"
              />
              
              <div className="flex items-center gap-3">
                {/* Time Range Selector */}
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm focus:ring-2 focus:ring-gray-500 focus:border-transparent"
                >
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>

                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
                  title="Refresh Dashboard"
                >
                  <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                {/* Notifications */}
                <div className="relative">
                  <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200">
                    <div className="relative">
                      <Activity className="h-5 w-5" />
                      <NotificationBadge count={3} variant="danger" size="sm" />
                    </div>
                  </button>
                </div>

                {/* User Menu */}
                <UserMenu user={user} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total Revenue"
            value={dashboardData.totalRevenue}
            format="currency"
            trend="up"
            trendValue={12.5}
            previousValue={2245670}
          />
          
          <MetricCard
            title="Total Transactions"
            value={dashboardData.totalTransactions}
            trend="up"
            trendValue={8.3}
            previousValue={1156}
          />
          
          <MetricCard
            title="Active Clients"
            value={dashboardData.activeClients}
            trend="up"
            trendValue={5.7}
            previousValue={84}
          />
          
          <MetricCard
            title="Conversion Rate"
            value={dashboardData.conversionRate}
            format="percentage"
            trend="down"
            trendValue={-2.1}
            previousValue={12.8}
          />
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Revenue Trend Chart */}
          <div className="lg:col-span-2">
            <ModernCard
              title="Revenue Trend"
              value="₺2,547,890"
              subtitle="Total revenue this month"
              icon={TrendingUp}
              variant="gradient"
              color="gray"
              size="lg"
            >
              <div className="mt-6">
                <MiniChart
                  data={dashboardData.chartData}
                  type="line"
                  color="#3b82f6"
                  height={200}
                  showGrid
                />
              </div>
            </ModernCard>
          </div>

          {/* Performance Metrics */}
          <div className="space-y-6">
            <ModernCard
              title="Completion Rate"
              value="94%"
              subtitle="Transaction success rate"
              variant="glass"
              size="md"
            >
              <div className="flex justify-center mt-4">
                <ProgressRing
                  percentage={94}
                  color="green"
                  size="lg"
                  label="Success"
                />
              </div>
            </ModernCard>

            <ModernCard
              title="Processing Time"
              value="2.3s"
              subtitle="Average transaction time"
              variant="elevated"
              color="purple"
            >
              <div className="mt-4">
                <MiniChart
                  data={[12, 15, 18, 14, 16, 13, 11, 9, 8, 10]}
                  type="bar"
                  color="#8b5cf6"
                  height={60}
                />
              </div>
            </ModernCard>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Activity Feed */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Recent Activity
                </h3>
                <button className="text-sm text-gray-600 hover:text-gray-700 font-medium">
                  View All
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <div className={`
                      w-2 h-2 rounded-full mt-2 flex-shrink-0
                      ${activity.type === 'transaction' ? 'bg-green-500' : 
                        activity.type === 'client' ? 'bg-gray-500' : 'bg-gray-400'}
                    `} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">
                          {activity.title}
                        </h4>
                        {activity.amount && (
                          <span className="text-sm font-semibold text-green-600">
                            +₺{activity.amount.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-200/60 shadow-sm">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Actions
              </h3>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                  <DollarSign className="h-6 w-6 text-gray-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-900">
                    New Transaction
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                  <Users className="h-6 w-6 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-900">
                    Add Client
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                  <BarChart3 className="h-6 w-6 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-900">
                    View Reports
                  </div>
                </button>
                
                <button className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all duration-200 group">
                  <Download className="h-6 w-6 text-amber-600 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-gray-900">
                    Export Data
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EnhancedDashboard;
