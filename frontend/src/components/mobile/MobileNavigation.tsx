/**
 * Mobile-First Navigation Component
 * Professional, business-oriented mobile navigation
 */

import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  BarChart3, 
  Users, 
  FileText, 
  Settings, 
  Menu,
  X,
  ChevronDown
} from 'lucide-react';

interface MobileNavigationProps {
  className?: string;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  badge?: string | number;
  children?: NavItem[];
}

const navigationItems: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: Home,
    path: '/dashboard'
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
    children: [
      { id: 'overview', label: 'Overview', icon: BarChart3, path: '/analytics/overview' },
      { id: 'reports', label: 'Reports', icon: FileText, path: '/analytics/reports' }
    ]
  },
  {
    id: 'clients',
    label: 'Clients',
    icon: Users,
    path: '/clients'
  },
  {
    id: 'transactions',
    label: 'Transactions',
    icon: FileText,
    path: '/transactions'
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    path: '/settings'
  }
];

const MobileNavigation: React.FC<MobileNavigationProps> = ({ className = '' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
    setExpandedItems(new Set());
  }, [location.pathname]);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (isMenuOpen && !target.closest('.mobile-navigation')) {
        setIsMenuOpen(false);
        setExpandedItems(new Set());
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleItemClick = (item: NavItem) => {
    if (item.children) {
      // Toggle expansion for items with children
      const newExpanded = new Set(expandedItems);
      if (newExpanded.has(item.id)) {
        newExpanded.delete(item.id);
      } else {
        newExpanded.add(item.id);
      }
      setExpandedItems(newExpanded);
    } else {
      // Navigate to the path
      navigate(item.path);
      setIsMenuOpen(false);
    }
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isParentActive = (item: NavItem) => {
    if (item.children) {
      return item.children.some(child => isActive(child.path));
    }
    return isActive(item.path);
  };

  return (
    <>
      {/* Mobile Header with Menu Button */}
      <header className="mobile-header lg:hidden">
        <div className="flex items-center justify-between w-full">
          <h1 className="mobile-header-title">PipLinePro</h1>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="mobile-nav-item"
            aria-label="Toggle navigation menu"
          >
            {isMenuOpen ? (
              <X className="mobile-nav-icon" />
            ) : (
              <Menu className="mobile-nav-icon" />
            )}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Menu */}
      <nav className={`mobile-navigation fixed inset-0 bg-white z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } ${className}`}>
        {/* Header */}
        <div className="mobile-header">
          <h2 className="mobile-header-title">Navigation</h2>
          <button
            onClick={() => setIsMenuOpen(false)}
            className="mobile-modal-close"
            aria-label="Close navigation"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <ul className="p-4 space-y-2">
            {navigationItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    isParentActive(item)
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && (
                      <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {item.children && (
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        expandedItems.has(item.id) ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Submenu */}
                {item.children && expandedItems.has(item.id) && (
                  <ul className="ml-8 mt-2 space-y-1">
                    {item.children.map((child) => (
                      <li key={child.id}>
                        <button
                          onClick={() => handleItemClick(child)}
                          className={`w-full flex items-center space-x-3 p-2 rounded-lg transition-colors text-sm ${
                            isActive(child.path)
                              ? 'bg-blue-50 text-blue-700'
                              : 'text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          <child.icon className="w-4 h-4" />
                          <span>{child.label}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="text-xs text-gray-500 text-center">
            PipLinePro v1.0.0
          </div>
        </div>
      </nav>

      {/* Bottom Navigation (for larger mobile screens) */}
      <nav className="mobile-nav lg:hidden">
        {navigationItems.slice(0, 5).map((item) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item)}
            className={`mobile-nav-item ${isActive(item.path) ? 'active' : ''}`}
            aria-label={item.label}
          >
            <item.icon className="mobile-nav-icon" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  );
};

export default MobileNavigation;
