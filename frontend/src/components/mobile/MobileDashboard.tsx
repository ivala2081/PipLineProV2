/**
 * Mobile-First Dashboard Component
 * Professional, business-oriented mobile dashboard
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Users, Activity, AlertCircle } from 'lucide-react';

interface MobileDashboardProps {
  data?: {
    totalRevenue: number;
    totalTransactions: number;
    activeClients: number;
    conversionRate: number;
    revenueChange: number;
    transactionChange: number;
    clientChange: number;
    conversionChange: number;
  };
  loading?: boolean;
  error?: string;
}

interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  format: 'currency' | 'number' | 'percentage';
  trend: 'up' | 'down' | 'neutral';
}

const MobileDashboard: React.FC<MobileDashboardProps> = ({ 
  data, 
  loading = false, 
  error 
}) => {
  const [refreshing, setRefreshing] = useState(false);

  // Format values based on type
  const formatValue = (value: number | string, format: string) => {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'number':
        return new Intl.NumberFormat('en-US').format(value);
      default:
        return value.toString();
    }
  };

  // Generate metrics from data
  const metrics: MetricCard[] = data ? [
    {
      id: 'revenue',
      title: 'Total Revenue',
      value: data.totalRevenue,
      change: data.revenueChange,
      icon: DollarSign,
      format: 'currency',
      trend: data.revenueChange >= 0 ? 'up' : 'down'
    },
    {
      id: 'transactions',
      title: 'Transactions',
      value: data.totalTransactions,
      change: data.transactionChange,
      icon: Activity,
      format: 'number',
      trend: data.transactionChange >= 0 ? 'up' : 'down'
    },
    {
      id: 'clients',
      title: 'Active Clients',
      value: data.activeClients,
      change: data.clientChange,
      icon: Users,
      format: 'number',
      trend: data.clientChange >= 0 ? 'up' : 'down'
    },
    {
      id: 'conversion',
      title: 'Conversion Rate',
      value: data.conversionRate,
      change: data.conversionChange,
      icon: TrendingUp,
      format: 'percentage',
      trend: data.conversionChange >= 0 ? 'up' : 'down'
    }
  ] : [];

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="mobile-spinner"></div>
        <span>Loading dashboard...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mobile-card">
        <div className="flex items-center space-x-2 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">Error loading dashboard</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mobile-form-button mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="mobile-professional-spacing">
      {/* Header */}
      <div className="mobile-header">
        <div className="flex items-center justify-between w-full">
          <div>
            <h1 className="mobile-header-title">Dashboard</h1>
            <p className="text-sm text-gray-600 mt-1">Business Overview</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="mobile-nav-item"
            aria-label="Refresh dashboard"
          >
            <Activity 
              className={`mobile-nav-icon ${refreshing ? 'animate-spin' : ''}`} 
            />
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="mobile-metrics-grid">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          const isPositive = metric.trend === 'up';
          const isNegative = metric.trend === 'down';
          
          return (
            <div key={metric.id} className="mobile-metric-card">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-gray-400" />
                {metric.trend !== 'neutral' && (
                  isPositive ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  )
                )}
              </div>
              
              <div className="mobile-metric-value">
                {formatValue(metric.value, metric.format)}
              </div>
              
              <div className="mobile-metric-label">
                {metric.title}
              </div>
              
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h3 className="mobile-card-title">Revenue Trend</h3>
          <select className="text-sm border border-gray-300 rounded px-2 py-1">
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
        </div>
        <div className="mobile-chart-container">
          <div className="mobile-chart-placeholder">
            <div className="text-center">
              <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p>Revenue chart will be displayed here</p>
              <p className="text-xs text-gray-500 mt-1">Interactive charts coming soon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h3 className="mobile-card-title">Recent Activity</h3>
          <button className="text-sm text-blue-600 hover:text-blue-800">
            View All
          </button>
        </div>
        <div className="space-y-3">
          {[
            { action: 'New transaction', amount: '$2,450', time: '2 min ago', type: 'success' },
            { action: 'Client registered', amount: 'New client', time: '15 min ago', type: 'info' },
            { action: 'Payment processed', amount: '$1,200', time: '1 hour ago', type: 'success' },
            { action: 'System update', amount: 'v1.2.3', time: '2 hours ago', type: 'info' }
          ].map((activity, index) => (
            <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
              <div className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.type === 'success' ? 'bg-green-500' : 'bg-blue-500'
                }`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-900">{activity.amount}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mobile-card">
        <div className="mobile-card-header">
          <h3 className="mobile-card-title">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button className="mobile-form-button bg-green-600 hover:bg-green-700">
            Add Transaction
          </button>
          <button className="mobile-form-button bg-blue-600 hover:bg-blue-700">
            View Reports
          </button>
          <button className="mobile-form-button bg-purple-600 hover:bg-purple-700">
            Manage Clients
          </button>
          <button className="mobile-form-button bg-gray-600 hover:bg-gray-700">
            Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDashboard;
