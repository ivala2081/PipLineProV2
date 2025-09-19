import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  FileText,
  BarChart3,
  Settings,
  TrendingUp,
  Plus,
} from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  mobilePriority: 'high' | 'medium' | 'low';
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, mobilePriority: 'high' },
  { name: 'Clients', href: '/clients', icon: FileText, mobilePriority: 'high' },
  { name: 'Analytics', href: '/analytics', icon: BarChart3, mobilePriority: 'medium' },
  { name: 'Settings', href: '/settings', icon: Settings, mobilePriority: 'low' },
];

export const MobileBottomNavigation: React.FC = () => {
  const location = useLocation();

  // Only show high priority items on mobile
  const mobileNavigation = navigation.filter(item => item.mobilePriority === 'high');

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-2">
        {mobileNavigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx(
                'flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-[64px] min-h-[64px]',
                isActive
                  ? 'text-gray-900 bg-gray-100'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <div className="relative">
                <Icon className={clsx(
                  'h-6 w-6 transition-transform duration-200',
                  isActive && 'scale-105'
                )} />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className={clsx(
                'text-xs font-medium mt-1 text-center',
                isActive ? 'text-gray-900' : 'text-gray-600'
              )}>
                {item.name}
              </span>
            </Link>
          );
        })}
        
        {/* Quick Actions Button */}
        <div className="flex flex-col items-center justify-center px-3 py-2 min-w-[64px] min-h-[64px]">
          <button className="flex flex-col items-center justify-center w-full h-full text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-all duration-200">
            <div className="relative">
              <Plus className="h-6 w-6 transition-transform duration-200 hover:scale-105" />
            </div>
            <span className="text-xs font-medium mt-1 text-center">
              Quick Actions
            </span>
          </button>
        </div>
      </div>
      
      {/* Safe Area for devices with home indicators */}
      <div className="h-1 bg-gradient-to-r from-gray-400 to-gray-500" />
    </div>
  );
};

export default MobileBottomNavigation;
