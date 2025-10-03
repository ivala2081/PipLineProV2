import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Menu, 
  X, 
  Home, 
  BarChart3, 
  FileText, 
  Users, 
  Settings, 
  LogOut, 
  User,
  Bell,
  ChevronDown,
  TrendingUp,
  Building2,
  Calculator,
  ClipboardList,
  PieChart,
  Shield,
  Globe
} from 'lucide-react';
// import MobileBottomNavigation from './MobileBottomNavigation'; // Component not found
import WorldClocks from './WorldClock';
import { GlobalSearch } from './modern/GlobalSearch';

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { logout } = useAuth();
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'info',
      title: 'System Update',
      message: 'New features have been added to the dashboard',
      time: '2 minutes ago',
      read: false
    },
    {
      id: 2,
      type: 'warning',
      title: 'Transaction Alert',
      message: 'Large transaction detected in your account',
      time: '5 minutes ago',
      read: false
    },
    {
      id: 3,
      type: 'success',
      title: 'Import Complete',
      message: 'CSV file import completed successfully',
      time: '10 minutes ago',
      read: true
    }
  ]);
  const location = useLocation();
  const navigate = useNavigate();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: location.pathname === '/dashboard' || location.pathname === '/' },
    { name: 'Clients', href: '/clients', icon: FileText, current: location.pathname === '/clients' },
    { name: 'Accounting', href: '/accounting', icon: Calculator, current: location.pathname === '/accounting' },
    { name: 'Ledger', href: '/ledger', icon: ClipboardList, current: location.pathname === '/ledger' },
    { name: 'Reports', href: '/reports', icon: FileText, current: location.pathname === '/reports' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, current: location.pathname === '/analytics' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: clear local state and redirect
      navigate('/login');
    }
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  // Close notifications and user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsOpen && !(event.target as Element).closest('.notifications-container')) {
        setNotificationsOpen(false);
      }
      if (userMenuOpen && !(event.target as Element).closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notificationsOpen, userMenuOpen]);

  // Update mobile clock times
  useEffect(() => {
    const updateMobileClocks = () => {
      const now = new Date();
      
      // Turkey time
      const turkeyTime = now.toLocaleTimeString('en-US', {
        timeZone: 'Europe/Istanbul',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      
      // New York time
      const nyTime = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });

      const turkeyElement = document.getElementById('mobile-turkey-time');
      const nyElement = document.getElementById('mobile-ny-time');
      
      if (turkeyElement) turkeyElement.textContent = turkeyTime;
      if (nyElement) nyElement.textContent = nyTime;
    };

    // Update immediately
    updateMobileClocks();
    
    // Update every second
    const interval = setInterval(updateMobileClocks, 1000);
    
    return () => clearInterval(interval);
  }, []);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 lg:hidden"
          style={{ zIndex: 'var(--z-modal-backdrop)' }}
          onClick={closeSidebar}
        >
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" />
        </div>
      )}

      {/* Mobile sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 sidebar bg-white shadow-xl transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ zIndex: 'var(--z-modal)' }}
      >
        <div className="bg-white border-b" style={{ borderColor: 'var(--border-light)', padding: 'var(--space-4)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/plogo.png" 
                alt="PipeLine Pro Logo" 
                className="w-10 h-10 object-contain"
              />
              <h1 className="enterprise-section-header">PipLinePro</h1>
            </div>
            <button
              onClick={closeSidebar}
              className="enterprise-btn-secondary enterprise-btn-sm"
              style={{ padding: 'var(--space-2)' }}
            >
              <X style={{ width: 'var(--icon-default)', height: 'var(--icon-default)' }} />
            </button>
          </div>
        </div>
        
        <nav style={{ padding: 'var(--space-3)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={closeSidebar}
                className={`enterprise-nav-item ${
                  item.current ? 'enterprise-nav-item-active' : ''
                } nav-item-hover`}
              >
                <item.icon style={{ width: 'var(--icon-default)', height: 'var(--icon-default)' }} />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>

        <div className="business-card-footer">
          <div className="flex items-center gap-4 spacing-sm">
            <div className="relative user-avatar">
              <div className="w-12 h-12 bg-gradient-to-br from-gray-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20 ring-offset-1 ring-offset-gray-100">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full status-indicator shadow-sm"></div>
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">Admin User</p>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="w-2 h-2 bg-emerald-400 rounded-full status-indicator shadow-sm"></div>
                <span className="text-xs text-emerald-600 font-medium">Online</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
                              <button 
                  onClick={() => {
                    navigate('/settings');
                    closeSidebar();
                  }}
                  className="spacing-sm text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm hover:scale-105 transform"
                  title="Settings"
                >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex sidebar lg:flex-col">
        <div className="flex flex-col flex-grow enterprise-nav shadow-xl">
          <div className="bg-white border-b" style={{ borderColor: 'var(--border-light)', padding: 'var(--space-4)' }}>
            <div className="flex items-center gap-3">
              <img 
                src="/plogo.png" 
                alt="PipeLine Pro Logo" 
                className="w-10 h-10 object-contain"
              />
              <h1 className="enterprise-section-header">PipLinePro</h1>
            </div>
          </div>
          
          <nav className="flex-1" style={{ padding: 'var(--space-3)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`enterprise-nav-item ${
                    item.current ? 'enterprise-nav-item-active' : ''
                  } nav-item-hover`}
                >
                  <item.icon style={{ width: 'var(--icon-default)', height: 'var(--icon-default)' }} />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>

          <div className="business-card-footer">
            <div className="flex items-center gap-4 spacing-sm">
              <div className="relative user-avatar user-avatar-hover">
                <div className="w-12 h-12 bg-gradient-to-br from-gray-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg ring-2 ring-white/20 ring-offset-1 ring-offset-gray-100">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full status-indicator shadow-sm"></div>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate leading-tight">Admin User</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full status-indicator shadow-sm"></div>
                  <span className="text-xs text-emerald-600 font-medium">Online</span>
                </div>
              </div>
              
              <div className="flex flex-col gap-1">
                <button 
                  onClick={() => navigate('/settings')}
                  className="spacing-sm text-gray-500 hover:text-gray-700 hover:bg-white/60 rounded-lg transition-all duration-200 hover:shadow-sm hover:scale-105 transform settings-button-hover"
                  title="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="main-content">
        {/* Top header */}
        <header className="business-container flex items-center justify-between header">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-50/30 border border-gray-200/50 hover:border-gray-300/70 transition-all duration-300 hover:shadow-md hover:shadow-gray-200/50 hover:-translate-y-0.5 group mobile-menu-button"
            >
              <Menu className="h-6 w-6 group-hover:scale-110 transition-transform duration-300" />
            </button>
            
            {/* Logo for mobile header */}
            <div className="lg:hidden flex items-center gap-2">
              <img 
                src="/plogo.png" 
                alt="PipeLine Pro Logo" 
                className="w-8 h-8 object-contain"
              />
              <span className="font-semibold text-gray-800">PipLinePro</span>
            </div>
          </div>

          {/* World Clocks - Desktop */}
          <div className="hidden lg:flex items-center">
            <WorldClocks />
          </div>

          {/* World Clocks - Mobile */}
          <div className="lg:hidden flex items-center">
            <div className="relative flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-white/95 to-gray-50/90 backdrop-blur-md rounded-xl border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300 group">
              {/* Animated background */}
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              {/* Turkey Clock */}
              <div className="relative flex items-center gap-2">
                <div className="relative">
                  <span className="text-xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">🇹🇷</span>
                  <div className="absolute -inset-1 bg-gradient-to-r from-red-400/20 to-yellow-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-red-600 transition-colors duration-300">Istanbul</span>
                  <span className="text-xs font-mono font-semibold text-gray-600 group-hover:text-red-500 transition-colors duration-300 animate-pulse" id="mobile-turkey-time">--:--</span>
                </div>
              </div>
              
              {/* Divider with gradient */}
              <div className="w-px h-8 bg-gradient-to-b from-gray-200 via-gray-200 to-gray-200 group-hover:from-gray-300 group-hover:via-purple-300 group-hover:to-gray-300 transition-colors duration-300"></div>
              
              {/* New York Clock */}
              <div className="relative flex items-center gap-2">
                <div className="relative">
                  <span className="text-xl drop-shadow-sm group-hover:scale-110 transition-transform duration-300">🇺🇸</span>
                  <div className="absolute -inset-1 bg-gradient-to-r from-gray-400/20 to-red-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-gray-600 transition-colors duration-300">New York</span>
                  <span className="text-xs font-mono font-semibold text-gray-600 group-hover:text-gray-500 transition-colors duration-300 animate-pulse" id="mobile-ny-time">--:--</span>
                </div>
              </div>
              
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-gray-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>

          <div className="flex items-center space-business-x-md">
            {/* Global Search */}
            <div className="relative">
              <GlobalSearch />
            </div>

            {/* Admin Panel Button */}
            <div className="relative">
              <button 
                onClick={() => navigate('/admin/users')}
                className="relative p-3 text-gray-600 hover:text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md group header-nav-button"
                title="Admin Panel"
              >
                <Building2 className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
              </button>
            </div>

            {/* Notifications */}
            <div className="relative notifications-container">
              <button 
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-3 text-gray-600 hover:text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md group header-nav-button"
              >
                <Bell className="h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                {getUnreadCount() > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 border-2 border-white rounded-full shadow-sm notification-badge flex items-center justify-center">
                    <span className="text-xs text-white font-bold">{getUnreadCount()}</span>
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200/50 backdrop-blur-sm z-50 notifications-dropdown">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                      <button 
                        onClick={() => setNotificationsOpen(false)}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p>No notifications</p>
                      </div>
                    ) : (
                      notifications.map((notification) => (
                        <div 
                          key={notification.id}
                          className={`p-4 border-b border-gray-50 last:border-b-0 hover:bg-gray-50/50 transition-colors duration-200 cursor-pointer notification-item ${
                            !notification.read ? 'bg-gray-50/30' : ''
                          }`}
                          onClick={() => markNotificationAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              notification.type === 'info' ? 'bg-gray-400' :
                              notification.type === 'warning' ? 'bg-yellow-400' :
                              notification.type === 'success' ? 'bg-green-400' : 'bg-gray-400'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-gray-900">{notification.title}</h4>
                                <span className="text-xs text-gray-400">{notification.time}</span>
                              </div>
                              <p className="text-sm text-gray-600 leading-relaxed">{notification.message}</p>
                              {!notification.read && (
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    New
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {notifications.length > 0 && (
                    <div className="p-3 border-t border-gray-100 bg-gray-50/30">
                      <button 
                        onClick={markAllAsRead}
                        className="w-full text-center text-sm text-gray-600 hover:text-gray-700 font-medium py-2 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        Mark all as read
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg text-gray-700 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md group"
              >
                <div className="relative">
                  <div className="w-9 h-9 bg-gradient-to-br from-gray-500 to-purple-600 rounded-lg flex items-center justify-center shadow-md group-hover:scale-105 transition-transform duration-200">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-white rounded-full shadow-sm"></div>
                </div>
                <span className="hidden md:block font-semibold text-gray-800 group-hover:text-gray-900 transition-colors duration-300">Admin</span>
                <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 group-hover:bg-gray-200 transition-colors duration-300">
                  <ChevronDown className="h-3.5 w-3.5 text-gray-600 group-hover:text-gray-700 transition-colors duration-300 group-hover:rotate-180 transform duration-300" />
                </div>
              </button>

              {userMenuOpen && (
                <div className="business-dropdown">
                  <div 
                    className="business-dropdown-item cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </div>
                  <div 
                    className="business-dropdown-item cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </div>
                  <div className="business-divider-thin"></div>
                  <div 
                    className="business-dropdown-item cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      navigate('/admin/users');
                      setUserMenuOpen(false);
                    }}
                  >
                    <Building2 className="h-4 w-4 mr-2" />
                    Admin Panel
                  </div>
                  <div 
                    className="business-dropdown-item cursor-pointer hover:bg-gray-50"
                    onClick={() => {
                      navigate('/admin/monitoring');
                      setUserMenuOpen(false);
                    }}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    System Monitor
                  </div>
                  <div className="business-divider-thin"></div>
                  <button
                    onClick={handleLogout}
                    className="business-dropdown-item w-full text-left hover:bg-red-50 hover:text-red-600"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="business-section pb-24 lg:pb-12">
          <div className="business-container">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      {/* <MobileBottomNavigation /> */} {/* Component not found */}
    </div>
  );
};

export default Layout;
