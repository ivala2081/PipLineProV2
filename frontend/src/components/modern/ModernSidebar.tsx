import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Home, 
  BarChart3, 
  FileText, 
  Settings, 
  LogOut, 
  User,
  Calculator,
  ClipboardList,
  Building2,
  Shield,
  Clock,
  Server,
  ChevronDown,
  Bell,
  HelpCircle,
  Activity
} from 'lucide-react';

interface ModernSidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
}

export const ModernSidebar: React.FC<ModernSidebarProps> = ({ 
  currentPage, 
  onPageChange, 
  onLogout 
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('online');
  const [notifications, setNotifications] = useState(3);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // System status simulation
  useEffect(() => {
    const statusTimer = setInterval(() => {
      setSystemStatus(Math.random() > 0.1 ? 'online' : 'maintenance');
    }, 30000); // Check every 30 seconds

    return () => clearInterval(statusTimer);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-user-menu]')) {
          setUserMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home, current: location.pathname === '/dashboard' || location.pathname === '/' },
    { name: 'Clients', href: '/clients', icon: FileText, current: location.pathname === '/clients' },
    { name: 'Accounting', href: '/accounting', icon: Calculator, current: location.pathname === '/accounting' },
    { name: 'Ledger', href: '/ledger', icon: ClipboardList, current: location.pathname === '/ledger' },
    { name: 'Analytics', href: '/analytics', icon: BarChart3, current: location.pathname === '/analytics' },
    { name: 'Settings', href: '/settings', icon: Settings, current: location.pathname === '/settings' },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Logo Section */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <img 
            src="/plogo.png" 
            alt="PipeLine Pro Logo" 
            className="w-8 h-8 object-contain"
          />
          <div>
            <h1 className="text-lg font-semibold text-gray-900">PipLinePro</h1>
            <p className="text-xs text-gray-500">Treasury System</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            onClick={() => onPageChange(item.name.toLowerCase())}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ease-out ${
              item.current
                ? 'bg-gray-800 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100/80'
            }`}
          >
            {/* Subtle hover background */}
            <div className={`absolute inset-0 rounded-lg transition-all duration-200 ease-out ${
              item.current 
                ? 'bg-gray-800' 
                : 'bg-transparent group-hover:bg-gray-100/80'
            }`} />
            
            {/* Icon with subtle animation */}
            <item.icon className={`relative z-10 w-4 h-4 transition-all duration-200 ease-out ${
              item.current 
                ? 'text-white' 
                : 'text-gray-500 group-hover:text-gray-700'
            }`} />
            
            {/* Text with subtle animation */}
            <span className={`relative z-10 transition-all duration-200 ease-out ${
              item.current 
                ? 'text-white' 
                : 'text-gray-600 group-hover:text-gray-800'
            }`}>
              {item.name}
            </span>
            
            {/* Minimal hover indicator */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-0 rounded-r-full transition-all duration-200 ease-out ${
              item.current 
                ? 'bg-white h-5' 
                : 'bg-transparent group-hover:bg-gray-400 group-hover:h-3'
            }`} />
          </Link>
        ))}
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        {/* User Profile */}
        <div className="group bg-white border border-gray-200 rounded-lg p-3 transition-all duration-200 ease-out hover:bg-gray-50/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center transition-all duration-200 ease-out group-hover:bg-gray-700">
                <User className="w-4 h-4 text-white transition-all duration-200 ease-out" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 transition-all duration-200 ease-out group-hover:text-gray-800">Admin User</p>
                <p className="text-xs text-gray-500 transition-all duration-200 ease-out group-hover:text-gray-600">Administrator</p>
              </div>
            </div>
            
            <div className="relative" data-user-menu>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="h-6 w-6 p-0 hover:bg-gray-100 transition-all duration-200 ease-out"
              >
                <ChevronDown className={`w-3 h-3 transition-all duration-200 ease-out ${userMenuOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              {/* User Menu Dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <button
                    onClick={() => {
                      navigate('/settings');
                      setUserMenuOpen(false);
                    }}
                    className="group flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 ease-out"
                  >
                    <Settings className="w-3 h-3 transition-all duration-200 ease-out group-hover:text-gray-900" />
                    <span className="transition-all duration-200 ease-out group-hover:text-gray-900">Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setUserMenuOpen(false);
                    }}
                    className="group flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 ease-out"
                  >
                    <LogOut className="w-3 h-3 transition-all duration-200 ease-out group-hover:text-red-700" />
                    <span className="transition-all duration-200 ease-out group-hover:text-red-700">Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* System Status */}
          <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1 group/status">
              <div className={`w-2 h-2 rounded-full transition-all duration-200 ease-out ${
                systemStatus === 'online' ? 'bg-green-500 group-hover/status:bg-green-400' : 'bg-amber-500 group-hover/status:bg-amber-400'
              }`}></div>
              <span className="transition-all duration-200 ease-out group-hover/status:text-gray-600">
                {systemStatus === 'online' ? 'Online' : 'Maintenance'}
              </span>
            </div>
            <div className="flex items-center gap-1 group/time">
              <Clock className="w-3 h-3 transition-all duration-200 ease-out group-hover/time:text-gray-600" />
              <span className="transition-all duration-200 ease-out group-hover/time:text-gray-600">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  hour12: false 
                })}
              </span>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
};
