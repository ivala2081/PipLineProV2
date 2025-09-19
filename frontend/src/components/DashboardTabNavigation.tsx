import React, { memo } from 'react';
import { BarChart3, LineChart, TrendingUp, Shield, DollarSign, RefreshCw } from 'lucide-react';

type TabType = 'overview' | 'analytics' | 'performance' | 'monitoring' | 'financial';

interface DashboardTabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

const DashboardTabNavigation = memo<DashboardTabNavigationProps>(({
  activeTab,
  onTabChange,
  onRefresh,
  refreshing = false
}) => {
  const tabs = [
    {
      id: 'overview' as TabType,
      label: 'Overview',
      icon: BarChart3,
      description: 'Dashboard overview and key metrics'
    },
    {
      id: 'analytics' as TabType,
      label: 'Analytics',
      icon: LineChart,
      description: 'Data analysis and insights'
    },
    {
      id: 'performance' as TabType,
      label: 'Performance',
      icon: TrendingUp,
      description: 'System and business performance'
    },
    {
      id: 'monitoring' as TabType,
      label: 'Monitoring',
      icon: Shield,
      description: 'System monitoring and security'
    },
    {
      id: 'financial' as TabType,
      label: 'Financial Analytics',
      icon: DollarSign,
      description: 'Financial data and trends'
    }
  ];

  return (
    <div className='bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden'>
      <div className='bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-2'>
        <nav className='flex space-x-1'>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <div key={tab.id} className="flex items-center gap-2">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? 'bg-white text-blue-600 shadow-md border border-gray-200'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50'
                  }`}
                  title={tab.description}
                >
                  <Icon className='h-4 w-4' />
                  {tab.label}
                </button>
                {isActive && (
                  <button
                    onClick={onRefresh}
                    disabled={refreshing}
                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={refreshing ? 'Refreshing...' : `Refresh ${tab.label} data`}
                  >
                    <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
});

DashboardTabNavigation.displayName = 'DashboardTabNavigation';

export default DashboardTabNavigation;
