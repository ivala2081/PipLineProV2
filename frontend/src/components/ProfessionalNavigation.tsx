import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  Home,
  Settings,
  User,
  Bell,
  Search,
  Menu,
  X,
  MoreHorizontal,
  ExternalLink,
  ArrowRight,
  MapPin,
  Clock,
  FileText,
  Folder,
  Database,
  Shield,
  Globe,
  Building,
  CreditCard,
  Calculator,
  BarChart3,
  PieChart,
  TrendingUp,
  Cog,
  LogOut,
  HelpCircle,
  Info
} from 'lucide-react';

// ===== PROFESSIONAL NAVIGATION & MENU COMPONENTS =====
// These provide business-ready navigation systems with advanced functionality

// ===== BREADCRUMB COMPONENT =====
interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  maxItems?: number;
  showHome?: boolean;
  className?: string;
}

export function Breadcrumb({
  items,
  separator = <ChevronRight className="w-4 h-4 text-gray-400" />,
  maxItems = 5,
  showHome = true,
  className = ''
}: BreadcrumbProps) {
  const [expanded, setExpanded] = useState(false);
  
  const allItems = showHome 
    ? [{ label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> }, ...items]
    : items;

  const visibleItems = expanded ? allItems : allItems.slice(-maxItems);
  const hiddenItems = expanded ? [] : allItems.slice(0, -maxItems);

  const renderBreadcrumbItem = (item: BreadcrumbItem, index: number, isLast: boolean) => (
    <li key={index} className="flex items-center">
      {index > 0 && <span className="mx-2">{separator}</span>}
      
      {item.href ? (
        <a
          href={item.href}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium transition-colors duration-200
            ${isLast 
              ? 'text-gray-900 bg-gray-100' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          {item.icon && <span className="text-gray-500">{item.icon}</span>}
          <span>{item.label}</span>
        </a>
      ) : (
        <button
          onClick={item.onClick}
          className={`
            flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium transition-colors duration-200
            ${isLast 
              ? 'text-gray-900 bg-gray-100' 
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }
          `}
        >
          {item.icon && <span className="text-gray-500">{item.icon}</span>}
          <span>{item.label}</span>
        </button>
      )}
    </li>
  );

  return (
    <nav className={`flex items-center ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {hiddenItems.length > 0 && (
          <li className="flex items-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center space-x-1 px-2 py-1 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
            >
              <span className="text-gray-500">...</span>
            </button>
            <span className="mx-2">{separator}</span>
          </li>
        )}
        
        {visibleItems.map((item, index) => 
          renderBreadcrumbItem(item, index, index === visibleItems.length - 1)
        )}
      </ol>
    </nav>
  );
}

// ===== ADVANCED MENU COMPONENT =====
interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  description?: string;
  badge?: string;
  badgeColor?: 'default' | 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
  children?: MenuItem[];
  disabled?: boolean;
  external?: boolean;
}

interface AdvancedMenuProps {
  items: MenuItem[];
  title?: string;
  subtitle?: string;
  searchable?: boolean;
  maxHeight?: string;
  className?: string;
}

export function AdvancedMenu({
  items,
  title,
  subtitle,
  searchable = false,
  maxHeight = 'max-h-96',
  className = ''
}: AdvancedMenuProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const filteredItems = searchable && searchTerm
    ? items.filter(item => 
        item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : items;

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderMenuItem = (item: MenuItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const indentClass = level > 0 ? `ml-${level * 4}` : '';

    return (
      <div key={item.id} className={`${indentClass}`}>
        <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors duration-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {item.icon && (
              <div className="flex-shrink-0 text-gray-500">
                {item.icon}
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${item.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                  {item.label}
                </span>
                {item.badge && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(item.badgeColor || 'default')}`}>
                    {item.badge}
                  </span>
                )}
                {item.external && (
                  <ExternalLink className="w-3 h-3 text-gray-400" />
                )}
              </div>
              
              {item.description && (
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {item.description}
                </p>
              )}
            </div>
          </div>
          
          {hasChildren && (
            <button
              onClick={() => toggleExpanded(item.id)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderMenuItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden ${className}`}>
      {(title || subtitle || searchable) && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          {title && (
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          )}
          {subtitle && (
            <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
          )}
          {searchable && (
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      <div className={`overflow-y-auto ${maxHeight}`}>
        <div className="py-2">
          {filteredItems.map(item => renderMenuItem(item))}
        </div>
      </div>
    </div>
  );
}

// ===== NAVIGATION BAR COMPONENT =====
interface NavBarProps {
  logo?: React.ReactNode;
  title?: string;
  leftItems?: React.ReactNode;
  centerItems?: React.ReactNode;
  rightItems?: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

export function NavigationBar({
  logo,
  title,
  leftItems,
  centerItems,
  rightItems,
  sticky = true,
  className = ''
}: NavBarProps) {
  return (
    <nav className={`
      bg-white border-b border-gray-200 px-4 py-3
      ${sticky ? 'sticky top-0 z-40' : ''}
      ${className}
    `}>
      <div className="flex items-center justify-between">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          {logo && <div className="flex-shrink-0">{logo}</div>}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          )}
          {leftItems && (
            <div className="flex items-center space-x-2">
              {leftItems}
            </div>
          )}
        </div>
        
        {/* Center Section */}
        {centerItems && (
          <div className="flex-1 flex items-center justify-center">
            {centerItems}
          </div>
        )}
        
        {/* Right Section */}
        {rightItems && (
          <div className="flex items-center space-x-2">
            {rightItems}
          </div>
        )}
      </div>
    </nav>
  );
}

// ===== SIDEBAR NAVIGATION COMPONENT =====
interface SidebarItem {
  id: string;
  label: string;
  href?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeColor?: 'default' | 'success' | 'warning' | 'error' | 'info';
  children?: SidebarItem[];
  onClick?: () => void;
  disabled?: boolean;
  external?: boolean;
}

interface SidebarNavigationProps {
  items: SidebarItem[];
  title?: string;
  subtitle?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  className?: string;
}

export function SidebarNavigation({
  items,
  title,
  subtitle,
  collapsed = false,
  onToggleCollapse,
  className = ''
}: SidebarNavigationProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getBadgeColor = (color: string) => {
    switch (color) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'info':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderSidebarItem = (item: SidebarItem, level: number = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.id);
    const indentClass = level > 0 && !collapsed ? `ml-${level * 4}` : '';

    return (
      <div key={item.id} className={`${indentClass}`}>
        <div className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {item.icon && (
              <div className="flex-shrink-0 text-gray-500">
                {item.icon}
              </div>
            )}
            
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${item.disabled ? 'text-gray-400' : 'text-gray-900'}`}>
                    {item.label}
                  </span>
                  {item.badge && (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeColor(item.badgeColor || 'default')}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.external && (
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  )}
                </div>
              </div>
            )}
          </div>
          
          {hasChildren && !collapsed && (
            <button
              onClick={() => toggleExpanded(item.id)}
              className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        
        {hasChildren && isExpanded && !collapsed && (
          <div className="mt-1 space-y-1">
            {item.children!.map(child => renderSidebarItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      {(title || subtitle || onToggleCollapse) && (
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="absolute right-2 top-3 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          )}
          
          {!collapsed && title && (
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
          )}
          {!collapsed && subtitle && (
            <p className="text-xs text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
      )}
      
      {/* Navigation Items */}
      <div className="py-2">
        {items.map(item => renderSidebarItem(item))}
      </div>
    </div>
  );
}

// ===== DEMO NAVIGATION SYSTEM =====
export function DemoNavigationSystem() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPath, setCurrentPath] = useState('/dashboard/analytics/reports');

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Analytics', href: '/dashboard/analytics' },
    { label: 'Reports', href: '/dashboard/analytics/reports' }
  ];

  const menuItems: MenuItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-4 h-4" />,
      description: 'Main dashboard overview',
      href: '/dashboard'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Manage all transactions',
      badge: 'New',
      badgeColor: 'success',
      href: '/clients'
    },
    {
      id: 'accounting',
      label: 'Accounting',
      icon: <Calculator className="w-4 h-4" />,
      description: 'Financial records and reports',
      children: [
        {
          id: 'ledger',
          label: 'Ledger',
          icon: <Database className="w-4 h-4" />,
          description: 'General ledger entries'
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText className="w-4 h-4" />,
          description: 'Financial reports'
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      description: 'Business analytics and insights',
      children: [
        {
          id: 'performance',
          label: 'Performance',
          icon: <TrendingUp className="w-4 h-4" />,
          description: 'Performance metrics'
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <PieChart className="w-4 h-4" />,
          description: 'Analytical reports'
        }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Cog className="w-4 h-4" />,
      description: 'System configuration',
      href: '/settings'
    }
  ];

  const sidebarItems: SidebarItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Home className="w-4 h-4" />,
      href: '/dashboard'
    },
    {
      id: 'transactions',
      label: 'Transactions',
      icon: <CreditCard className="w-4 h-4" />,
      badge: 'New',
      badgeColor: 'success',
      href: '/clients'
    },
    {
      id: 'accounting',
      label: 'Accounting',
      icon: <Calculator className="w-4 h-4" />,
      children: [
        {
          id: 'ledger',
          label: 'Ledger',
          icon: <Database className="w-4 h-4" />
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <FileText className="w-4 h-4" />
        }
      ]
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-4 h-4" />,
      children: [
        {
          id: 'performance',
          label: 'Performance',
          icon: <TrendingUp className="w-4 h-4" />
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: <PieChart className="w-4 h-4" />
        }
      ]
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Cog className="w-4 h-4" />,
      href: '/settings'
    }
  ];

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Professional Navigation System</h3>
          <p className="business-chart-subtitle">Advanced navigation components with business styling</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Breadcrumb Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Breadcrumb Navigation</h4>
          <Breadcrumb 
            items={breadcrumbItems}
            showHome={true}
            maxItems={5}
          />
          <div className="mt-4 text-sm text-gray-600">
            <p>Current path: {currentPath}</p>
            <p>Click breadcrumb items to navigate</p>
          </div>
        </div>

        {/* Navigation Bar Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Navigation Bar</h4>
          <NavigationBar
            logo={<img src="/plogo.png" alt="PipeLine Pro Logo" className="w-10 h-10 object-contain" />}
            title="PipLine Pro"
            leftItems={
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  <Search className="w-4 h-4" />
                </button>
              </div>
            }
            centerItems={
              <div className="flex items-center space-x-1">
                <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  Dashboard
                </button>
                <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  Analytics
                </button>
                <button className="px-3 py-1 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  Reports
                </button>
              </div>
            }
            rightItems={
              <div className="flex items-center space-x-2">
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  <Bell className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200">
                  <User className="w-4 h-4" />
                </button>
              </div>
            }
          />
        </div>

        {/* Advanced Menu Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Advanced Menu System</h4>
          <div className="max-w-md">
            <AdvancedMenu
              items={menuItems}
              title="Main Navigation"
              subtitle="Select a section to navigate"
              searchable={true}
              maxHeight="max-h-80"
            />
          </div>
        </div>

        {/* Sidebar Navigation Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Sidebar Navigation</h4>
          <div className="flex">
            <SidebarNavigation
              items={sidebarItems}
              title="Navigation"
              subtitle="Main application sections"
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-64"
            />
            <div className="flex-1 p-4">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-900 mb-2">Content Area</h5>
                <p className="text-sm text-gray-600">
                  This is the main content area. The sidebar can be collapsed to save space.
                </p>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className="mt-3 px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
                >
                  {sidebarCollapsed ? 'Expand' : 'Collapse'} Sidebar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalNavigationShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Navigation & Menu Systems
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Business-ready navigation components with advanced features and smooth interactions. 
          Perfect for creating intuitive user experiences.
        </p>
      </div>

      {/* Demo System */}
      <DemoNavigationSystem />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Breadcrumbs</h4>
          <p className="text-sm text-gray-600">Intelligent breadcrumb navigation with collapsible items and home support</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Menu className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Advanced Menus</h4>
          <p className="text-sm text-gray-600">Feature-rich menus with search, badges, descriptions, and nested items</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Navigation Bars</h4>
          <p className="text-sm text-gray-600">Professional top navigation with logo, title, and action items</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <ChevronLeft className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Sidebar Navigation</h4>
          <p className="text-sm text-gray-600">Collapsible sidebar with hierarchical navigation and badges</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Search className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Search & Filter</h4>
          <p className="text-sm text-gray-600">Built-in search functionality for large navigation structures</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Accessibility First</h4>
          <p className="text-sm text-gray-600">Built with ARIA labels, keyboard navigation, and screen reader support</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Navigation Components
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Breadcrumbs:</strong> Use Breadcrumb for page navigation with configurable separators and home support</p>
          <p><strong>2. Advanced Menus:</strong> Use AdvancedMenu for feature-rich navigation with search and nested items</p>
          <p><strong>3. Navigation Bars:</strong> Use NavigationBar for top-level navigation with logo and action items</p>
          <p><strong>4. Sidebar Navigation:</strong> Use SidebarNavigation for collapsible sidebar navigation</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalNavigationShowcase;
