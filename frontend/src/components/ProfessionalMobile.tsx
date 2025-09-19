import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Grid,
  List,
  Maximize2,
  Minimize2,
  RotateCcw,
  Smartphone,
  Tablet,
  Monitor,
  Wifi,
  WifiOff,
  Battery,
  BatteryCharging,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  Settings,
  User,
  Bell,
  Home,
  CreditCard,
  Calculator,
  BarChart3,
  Cog,
  MoreHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Hand,
  MousePointer,
  Move,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Download,
  Upload,
  Share2,
  Bookmark,
  Heart,
  Star,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';

// ===== PROFESSIONAL MOBILE & RESPONSIVE COMPONENTS =====
// These provide business-ready mobile features with responsive design

// ===== RESPONSIVE BREAKPOINT HOOK =====
export function useBreakpoint() {
  const [breakpoint, setBreakpoint] = useState<'sm' | 'md' | 'lg' | 'xl' | '2xl'>('lg');
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width < 640) {
        setBreakpoint('sm');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width < 768) {
        setBreakpoint('sm');
        setIsMobile(true);
        setIsTablet(false);
        setIsDesktop(false);
      } else if (width < 1024) {
        setBreakpoint('md');
        setIsMobile(false);
        setIsTablet(true);
        setIsDesktop(false);
      } else if (width < 1280) {
        setBreakpoint('lg');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      } else {
        setBreakpoint('xl');
        setIsMobile(false);
        setIsTablet(false);
        setIsDesktop(true);
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return { breakpoint, isMobile, isTablet, isDesktop };
}

// ===== MOBILE NAVIGATION DRAWER =====
interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function MobileDrawer({ isOpen, onClose, children, className = '' }: MobileDrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={handleBackdropClick}
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        className={`relative w-80 max-w-[90vw] h-full bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-semibold text-gray-900">Navigation</h3>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ===== RESPONSIVE GRID COMPONENT =====
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: string;
}

export function ResponsiveGrid({ 
  children, 
  className = '', 
  cols = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 'gap-4'
}: ResponsiveGridProps) {
  const getGridCols = () => {
    return `grid-cols-1 sm:grid-cols-${cols.sm || 1} md:grid-cols-${cols.md || 2} lg:grid-cols-${cols.lg || 3} xl:grid-cols-${cols.xl || 4}`;
  };

  return (
    <div className={`grid ${getGridCols()} ${gap} ${className}`}>
      {children}
    </div>
  );
}

// ===== TOUCH-FRIENDLY BUTTON COMPONENT =====
interface TouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function TouchButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = ''
}: TouchButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800';
      case 'secondary':
        return 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400';
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700 active:bg-green-800';
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800';
      case 'error':
        return 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800';
      case 'ghost':
        return 'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200';
      default:
        return 'bg-gray-600 text-white hover:bg-gray-700 active:bg-gray-800';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-2 text-sm min-h-[44px]';
      case 'md':
        return 'px-4 py-3 text-base min-h-[48px]';
      case 'lg':
        return 'px-6 py-4 text-lg min-h-[56px]';
      default:
        return 'px-4 py-3 text-base min-h-[48px]';
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${getVariantClasses()}
        ${getSizeClasses()}
        font-medium rounded-lg
        transition-all duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-95 touch-manipulation
        ${className}
      `}
    >
      <div className="flex items-center justify-center space-x-2">
        {loading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}
        {icon && !loading && <span>{icon}</span>}
        <span>{children}</span>
      </div>
    </button>
  );
}

// ===== RESPONSIVE TABLE COMPONENT =====
interface ResponsiveTableProps {
  headers: string[];
  children: React.ReactNode;
  className?: string;
  mobileView?: 'cards' | 'scroll' | 'stack';
}

export function ResponsiveTable({ 
  headers, 
  children, 
  className = '', 
  mobileView = 'cards' 
}: ResponsiveTableProps) {
  const { isMobile } = useBreakpoint();

  if (isMobile && mobileView === 'cards') {
    return (
      <div className={`space-y-4 ${className}`}>
        {children}
      </div>
    );
  }

  if (isMobile && mobileView === 'scroll') {
    return (
      <div className={`overflow-x-auto ${className}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {headers.map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {children}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {headers.map((header, index) => (
              <th
                key={index}
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {children}
        </tbody>
      </table>
    </div>
  );
}

// ===== MOBILE BOTTOM SHEET =====
interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function BottomSheet({ isOpen, onClose, children, title, className = '' }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);

  const handleTouchStart = (event: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(event.touches[0].clientY);
    setCurrentY(event.touches[0].clientY);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!isDragging) return;
    setCurrentY(event.touches[0].clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const deltaY = currentY - startY;
    if (deltaY > 100) {
      onClose();
    }
    
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl transform transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        } ${className}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>
        
        {/* Header */}
        {title && (
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
        )}
        
        {/* Content */}
        <div className="max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

// ===== RESPONSIVE CARDS COMPONENT =====
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function ResponsiveCard({ 
  children, 
  className = '', 
  variant = 'default',
  padding = 'md'
}: ResponsiveCardProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'elevated':
        return 'bg-white shadow-lg hover:shadow-xl';
      case 'outlined':
        return 'bg-white border-2 border-gray-200';
      default:
        return 'bg-white border border-gray-200 shadow-sm';
    }
  };

  const getPaddingClasses = () => {
    switch (padding) {
      case 'none':
        return '';
      case 'sm':
        return 'p-3';
      case 'md':
        return 'p-4 sm:p-6';
      case 'lg':
        return 'p-6 sm:p-8';
      default:
        return 'p-4 sm:p-6';
    }
  };

  return (
    <div className={`rounded-lg transition-all duration-200 ${getVariantClasses()} ${getPaddingClasses()} ${className}`}>
      {children}
    </div>
  );
}

// ===== MOBILE GESTURE HANDLER =====
interface GestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  className?: string;
}

export function GestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  className = ''
}: GestureHandlerProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startDistance, setStartDistance] = useState(0);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (event.touches.length === 1) {
      setStartX(event.touches[0].clientX);
      setStartY(event.touches[0].clientY);
    } else if (event.touches.length === 2 && onPinch) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      setStartDistance(distance);
    }
  };

  const handleTouchEnd = (event: React.TouchEvent) => {
    if (event.touches.length === 0) {
      const deltaX = event.changedTouches[0].clientX - startX;
      const deltaY = event.changedTouches[0].clientY - startY;
      const minSwipeDistance = 50;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else if (Math.abs(deltaY) > minSwipeDistance) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (event.touches.length === 2 && onPinch) {
      const distance = Math.hypot(
        event.touches[0].clientX - event.touches[1].clientX,
        event.touches[0].clientY - event.touches[1].clientY
      );
      const scale = distance / startDistance;
      onPinch(scale);
    }
  };

  return (
    <div
      className={`touch-pan-y ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}

// ===== DEMO MOBILE SYSTEM =====
export function DemoMobileSystem() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const sampleData = [
    { id: 1, name: 'Transaction A', amount: '₺1,250', status: 'Completed' },
    { id: 2, name: 'Transaction B', amount: '₺890', status: 'Pending' },
    { id: 3, name: 'Transaction C', amount: '₺2,100', status: 'Completed' },
    { id: 4, name: 'Transaction D', amount: '₺750', status: 'Failed' },
  ];

  const navigationItems = [
    { icon: <Home className="w-5 h-5" />, label: 'Dashboard', href: '/dashboard' },
    { icon: <CreditCard className="w-5 h-5" />, label: 'Clients', href: '/clients' },
    { icon: <Calculator className="w-5 h-5" />, label: 'Accounting', href: '/accounting' },
    { icon: <BarChart3 className="w-5 h-5" />, label: 'Analytics', href: '/analytics' },
    { icon: <Cog className="w-5 h-5" />, label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Professional Mobile & Responsive Features</h3>
          <p className="business-chart-subtitle">Mobile-optimized components with responsive design</p>
        </div>
        <div className="flex items-center space-x-2">
          <TouchButton
            variant="secondary"
            size="sm"
            onClick={() => setDrawerOpen(true)}
            icon={<Menu className="w-4 h-4" />}
          >
            Menu
          </TouchButton>
          <TouchButton
            variant="secondary"
            size="sm"
            onClick={() => setBottomSheetOpen(true)}
            icon={<MoreHorizontal className="w-4 h-4" />}
          >
            Actions
          </TouchButton>
        </div>
      </div>

      <div className="space-y-8">
        {/* Device Detection Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Responsive Breakpoint Detection</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <Smartphone className="w-8 h-8 mx-auto mb-2 text-gray-600" />
              <p className="text-sm font-medium text-gray-900">Mobile</p>
              <p className="text-xs text-gray-600">{isMobile ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <Tablet className="w-8 h-8 mx-auto mb-2 text-green-600" />
              <p className="text-sm font-medium text-gray-900">Tablet</p>
              <p className="text-xs text-gray-600">{isTablet ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <Monitor className="w-8 h-8 mx-auto mb-2 text-purple-600" />
              <p className="text-sm font-medium text-gray-900">Desktop</p>
              <p className="text-xs text-gray-600">{isDesktop ? 'Active' : 'Inactive'}</p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg border border-gray-200">
              <Settings className="w-8 h-8 mx-auto mb-2 text-orange-600" />
              <p className="text-sm font-medium text-gray-900">Current</p>
              <p className="text-xs text-gray-600">{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</p>
            </div>
          </div>
        </div>

        {/* Touch-Friendly Buttons Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Touch-Friendly Buttons</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <TouchButton variant="primary" size="lg" icon={<Download className="w-5 h-5" />}>
              Download Report
            </TouchButton>
            <TouchButton variant="success" size="lg" icon={<CheckCircle className="w-5 h-5" />}>
              Approve
            </TouchButton>
            <TouchButton variant="warning" size="lg" icon={<AlertCircle className="w-5 h-5" />}>
              Review
            </TouchButton>
          </div>
        </div>

        {/* Responsive Grid Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Responsive Grid Layout</h4>
          <div className="flex items-center space-x-4 mb-4">
            <TouchButton
              variant={viewMode === 'grid' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('grid')}
              icon={<Grid className="w-4 h-4" />}
            >
              Grid
            </TouchButton>
            <TouchButton
              variant={viewMode === 'list' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setViewMode('list')}
              icon={<List className="w-4 h-4" />}
            >
              List
            </TouchButton>
          </div>
          
          <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3, xl: 4 }} gap="gap-4">
            {sampleData.map((item) => (
              <ResponsiveCard key={item.id} variant="elevated" padding="md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">{item.name}</h5>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{item.amount}</p>
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <span>ID: {item.id}</span>
                  </div>
                </div>
              </ResponsiveCard>
            ))}
          </ResponsiveGrid>
        </div>

        {/* Responsive Table Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Responsive Table</h4>
          <ResponsiveTable 
            headers={['ID', 'Name', 'Amount', 'Status']}
            mobileView="cards"
          >
            {sampleData.map((item) => (
              <ResponsiveCard key={item.id} variant="outlined" padding="sm">
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">ID</p>
                    <p className="text-sm font-medium text-gray-900">{item.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Name</p>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Amount</p>
                    <p className="text-sm font-medium text-gray-900">{item.amount}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Status</p>
                    <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${
                      item.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      item.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </ResponsiveCard>
            ))}
          </ResponsiveTable>
        </div>

        {/* Gesture Handler Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Touch Gestures</h4>
          <GestureHandler
            onSwipeLeft={() => console.log('Swiped Left')}
            onSwipeRight={() => console.log('Swiped Right')}
            onSwipeUp={() => console.log('Swiped Up')}
            onSwipeDown={() => console.log('Swiped Down')}
            onPinch={(scale) => console.log('Pinch scale:', scale)}
          >
            <ResponsiveCard variant="elevated" padding="lg" className="text-center">
              <div className="space-y-4">
                                 <div className="flex justify-center space-x-4">
                   <Move className="w-8 h-8 text-gray-600" />
                   <MousePointer className="w-8 h-8 text-green-600" />
                   <Hand className="w-8 h-8 text-purple-600" />
                 </div>
                <h5 className="text-lg font-medium text-gray-900">Touch Gesture Area</h5>
                <p className="text-sm text-gray-600">
                  Try swiping in different directions, pinching, or tapping on this area.
                  Check the console for gesture events.
                </p>
                <div className="flex justify-center space-x-2 text-xs text-gray-500">
                  <span>← Swipe Left</span>
                  <span>→ Swipe Right</span>
                  <span>↑ Swipe Up</span>
                  <span>↓ Swipe Down</span>
                </div>
              </div>
            </ResponsiveCard>
          </GestureHandler>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <nav className="p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </a>
            ))}
          </div>
        </nav>
      </MobileDrawer>

      {/* Mobile Bottom Sheet */}
      <BottomSheet isOpen={bottomSheetOpen} onClose={() => setBottomSheetOpen(false)} title="Quick Actions">
        <div className="p-4 space-y-4">
          <TouchButton variant="primary" size="lg" icon={<Download className="w-5 h-5" />}>
            Download Report
          </TouchButton>
          <TouchButton variant="secondary" size="lg" icon={<Share2 className="w-5 h-5" />}>
            Share Data
          </TouchButton>
          <TouchButton variant="success" size="lg" icon={<CheckCircle className="w-5 h-5" />}>
            Approve All
          </TouchButton>
          <TouchButton variant="warning" size="lg" icon={<RefreshCw className="w-5 h-5" />}>
            Refresh
          </TouchButton>
        </div>
      </BottomSheet>
    </div>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalMobileShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Mobile & Responsive Features
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Mobile-optimized components with responsive design, touch-friendly interactions, 
          and perfect cross-device compatibility for modern business applications.
        </p>
      </div>

      {/* Demo System */}
      <DemoMobileSystem />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Smartphone className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Responsive Breakpoints</h4>
          <p className="text-sm text-gray-600">Automatic device detection with responsive behavior</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
                     <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
             <Hand className="w-6 h-6 text-green-600" />
           </div>
           <h4 className="font-semibold text-gray-900 mb-2">Touch-Friendly UI</h4>
          <p className="text-sm text-gray-600">Optimized buttons and interactions for mobile devices</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Menu className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Mobile Navigation</h4>
          <p className="text-sm text-gray-600">Drawer navigation and bottom sheets for mobile</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Grid className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Responsive Layouts</h4>
          <p className="text-sm text-gray-600">Adaptive grids and tables for all screen sizes</p>
        </div>
        
                 <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
           <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
             <Move className="w-6 h-6 text-red-600" />
           </div>
           <h4 className="font-semibold text-gray-900 mb-2">Touch Gestures</h4>
           <p className="text-sm text-gray-600">Swipe, pinch, and touch gesture support</p>
         </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Monitor className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Cross-Device</h4>
          <p className="text-sm text-gray-600">Perfect experience on mobile, tablet, and desktop</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Mobile Components
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Responsive Breakpoints:</strong> Use useBreakpoint hook for device detection</p>
          <p><strong>2. Touch-Friendly Buttons:</strong> Use TouchButton for mobile-optimized interactions</p>
          <p><strong>3. Mobile Navigation:</strong> Use MobileDrawer and BottomSheet for mobile navigation</p>
          <p><strong>4. Responsive Layouts:</strong> Use ResponsiveGrid and ResponsiveCard for adaptive layouts</p>
          <p><strong>5. Touch Gestures:</strong> Use GestureHandler for swipe and pinch interactions</p>
          <p><strong>6. Responsive Tables:</strong> Use ResponsiveTable with mobile-optimized views</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalMobileShowcase;
