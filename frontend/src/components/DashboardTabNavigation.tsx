import React, { memo } from 'react';
import { BarChart3, LineChart, TrendingUp, Shield, DollarSign, RefreshCw } from 'lucide-react';
import { CardTabs, CardTabItem } from './ui/professional-tabs';

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
    <CardTabs className="w-full">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        
        return (
          <div key={tab.id} className="flex items-center gap-2">
            <CardTabItem
              id={tab.id}
              label={tab.label}
              icon={Icon}
              active={isActive}
              onClick={() => onTabChange(tab.id)}
              className="relative"
            />
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
    </CardTabs>
  );
});

DashboardTabNavigation.displayName = 'DashboardTabNavigation';

export default DashboardTabNavigation;
