import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Info,
  HelpCircle,
  AlertTriangle,
  CheckCircle,
  X,
  MoreHorizontal,
  Settings,
  Edit,
  Trash2,
  Copy,
  Download,
  Share2,
  Star,
  Heart,
  Bookmark,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  RefreshCw,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Mail,
  Globe,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

// ===== PROFESSIONAL UTILITY & HELPER COMPONENTS =====
// These provide business-ready utility components with advanced functionality

// ===== TOOLTIP COMPONENT =====
interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: string;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 300,
  maxWidth = 'max-w-xs',
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback((event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    let x = 0;
    let y = 0;

    switch (position) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - 8;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + 8;
        break;
      case 'left':
        x = rect.left - 8;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + 8;
        y = rect.top + rect.height / 2;
        break;
    }

    setCoords({ x, y });
    timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
  }, [position, delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800';
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800';
      default:
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800';
    }
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
    >
      {children}
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${getPositionClasses()}`}
          style={{
            left: position === 'left' || position === 'right' ? 'auto' : coords.x,
            top: position === 'top' || position === 'bottom' ? 'auto' : coords.y,
          }}
        >
          <div className={`bg-gray-800 text-white text-sm rounded-lg px-3 py-2 shadow-lg ${maxWidth}`}>
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== POPOVER COMPONENT =====
interface PopoverProps {
  trigger: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  width?: string;
  className?: string;
}

export function Popover({
  trigger,
  content,
  position = 'bottom',
  width = 'w-80',
  className = ''
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-0 mb-2';
      case 'bottom':
        return 'top-full left-0 mt-2';
      case 'left':
        return 'right-full top-0 mr-2';
      case 'right':
        return 'left-full top-0 ml-2';
      default:
        return 'top-full left-0 mt-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'top':
        return 'top-full left-4 border-t-gray-200';
      case 'bottom':
        return 'bottom-full left-4 border-b-gray-200';
      case 'left':
        return 'left-full top-4 border-l-gray-200';
      case 'right':
        return 'right-full top-4 border-r-gray-200';
      default:
        return 'bottom-full left-4 border-b-gray-200';
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>
      
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 ${getPositionClasses()} ${width}`}
        >
          <div className="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {content}
            <div className={`absolute w-0 h-0 border-4 border-transparent ${getArrowClasses()}`} />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== CONTEXT MENU COMPONENT =====
interface ContextMenuItem {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  divider?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  className?: string;
}

export function ContextMenu({ items, className = '' }: ContextMenuProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-48 ${className}`}>
      {items.map((item, index) => (
        <div key={item.id}>
          {item.divider ? (
            <div className="border-t border-gray-200 my-1" />
          ) : (
            <button
              onClick={item.onClick}
              disabled={item.disabled}
              className={`
                w-full px-4 py-2 text-left text-sm flex items-center space-x-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200
                ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'}
              `}
            >
              {item.icon && (
                <div className="flex-shrink-0 text-gray-500">
                  {item.icon}
                </div>
              )}
              <span>{item.label}</span>
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== COPY TO CLIPBOARD COMPONENT =====
interface CopyToClipboardProps {
  text: string;
  children: React.ReactNode;
  successMessage?: string;
  className?: string;
}

export function CopyToClipboard({
  text,
  children,
  successMessage = 'Copied to clipboard!',
  className = ''
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div onClick={handleCopy} className="cursor-pointer">
        {children}
      </div>
      
      {copied && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-1 bg-green-600 text-white text-sm rounded-md shadow-lg z-50">
          {successMessage}
        </div>
      )}
    </div>
  );
}

// ===== LOADING OVERLAY COMPONENT =====
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  message?: string;
  className?: string;
}

export function LoadingOverlay({
  isLoading,
  children,
  message = 'Loading...',
  className = ''
}: LoadingOverlayProps) {
  if (!isLoading) return <>{children}</>;

  return (
    <div className={`relative ${className}`}>
      {children}
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">{message}</p>
        </div>
      </div>
    </div>
  );
}

// ===== ERROR BOUNDARY COMPONENT =====
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  className?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return (
        <div className={`bg-red-50 border border-red-200 rounded-lg p-6 text-center ${this.props.className || ''}`}>
          <div className="text-red-600 mb-4">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
          <p className="text-red-700 mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <button
            onClick={this.resetError}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ===== DEMO UTILITY SYSTEM =====
export function DemoUtilitySystem() {
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });

  const contextMenuItems: ContextMenuItem[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => console.log('View clicked')
    },
    {
      id: 'edit',
      label: 'Edit',
      icon: <Edit className="w-4 h-4" />,
      onClick: () => console.log('Edit clicked')
    },
    {
      id: 'divider1',
      divider: true
    },
    {
      id: 'copy',
      label: 'Copy Link',
      icon: <Copy className="w-4 h-4" />,
      onClick: () => console.log('Copy clicked')
    },
    {
      id: 'share',
      label: 'Share',
      icon: <Share2 className="w-4 h-4" />,
      onClick: () => console.log('Share clicked')
    },
    {
      id: 'divider2',
      divider: true
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => console.log('Delete clicked'),
      danger: true
    }
  ];

  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuVisible(true);
  };

  useEffect(() => {
    const handleClickOutside = () => setContextMenuVisible(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Professional Utility Components</h3>
          <p className="business-chart-subtitle">Essential helper components with business styling</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Tooltip Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Tooltip Components</h4>
          <div className="flex items-center space-x-4">
            <Tooltip content="This is a helpful tooltip" position="top">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200">
                Hover for Tooltip (Top)
              </button>
            </Tooltip>
            
            <Tooltip content="Information tooltip with icon" position="bottom">
              <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-md transition-colors duration-200">
                <Info className="w-5 h-5" />
              </button>
            </Tooltip>
            
            <Tooltip content="Left positioned tooltip" position="left">
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200">
                Left Tooltip
              </button>
            </Tooltip>
            
            <Tooltip content="Right positioned tooltip" position="right">
              <button className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200">
                Right Tooltip
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Popover Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Popover Components</h4>
          <div className="flex items-center space-x-4">
            <Popover
              trigger={
                <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors duration-200">
                  Click for Popover
                </button>
              }
              content={
                <div className="p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Popover Content</h5>
                  <p className="text-sm text-gray-600 mb-3">
                    This is a popover with custom content. You can put anything here.
                  </p>
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 transition-colors duration-200">
                      Action
                    </button>
                    <button className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors duration-200">
                      Cancel
                    </button>
                  </div>
                </div>
              }
            />
            
            <Popover
              trigger={
                <button className="p-2 text-orange-600 hover:bg-orange-50 rounded-md transition-colors duration-200">
                  <Settings className="w-5 h-5" />
                </button>
              }
              content={
                <div className="p-4">
                  <h5 className="font-semibold text-gray-900 mb-2">Settings</h5>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="notifications" className="rounded" />
                      <label htmlFor="notifications" className="text-sm text-gray-700">Enable notifications</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input type="checkbox" id="darkMode" className="rounded" />
                      <label htmlFor="darkMode" className="text-sm text-gray-700">Dark mode</label>
                    </div>
                  </div>
                </div>
              }
              position="bottom"
            />
          </div>
        </div>

        {/* Context Menu Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Context Menu</h4>
          <div className="relative">
            <button
              onContextMenu={handleContextMenu}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200"
            >
              Right-click for Context Menu
            </button>
            
            {contextMenuVisible && (
              <div
                className="fixed z-50"
                style={{
                  left: contextMenuPosition.x,
                  top: contextMenuPosition.y
                }}
              >
                <ContextMenu items={contextMenuItems} />
              </div>
            )}
          </div>
        </div>

        {/* Copy to Clipboard Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Copy to Clipboard</h4>
          <div className="flex items-center space-x-4">
            <CopyToClipboard text="https://example.com/important-link">
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200 flex items-center space-x-2">
                <Copy className="w-4 h-4" />
                <span>Copy Link</span>
              </button>
            </CopyToClipboard>
            
            <CopyToClipboard text="user@example.com">
              <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>Copy Email</span>
              </button>
            </CopyToClipboard>
          </div>
        </div>

        {/* Loading Overlay Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Loading Overlay</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LoadingOverlay isLoading={false}>
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-900 mb-2">Content Without Loading</h5>
                <p className="text-sm text-gray-600">This content is visible and interactive.</p>
              </div>
            </LoadingOverlay>
            
            <LoadingOverlay isLoading={true} message="Processing data...">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-900 mb-2">Content With Loading</h5>
                <p className="text-sm text-gray-600">This content is hidden behind a loading overlay.</p>
              </div>
            </LoadingOverlay>
          </div>
        </div>

        {/* Error Boundary Demo */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Error Boundary</h4>
          <ErrorBoundary
            fallback={({ error, resetError }) => (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h5 className="font-medium text-red-800 mb-2">Custom Error Fallback</h5>
                <p className="text-sm text-red-700 mb-3">{error.message}</p>
                <button
                  onClick={resetError}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors duration-200"
                >
                  Reset
                </button>
              </div>
            )}
          >
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-2">Protected Content</h5>
              <p className="text-sm text-gray-600">This content is protected by an error boundary.</p>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalUtilitiesShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Utility & Helper Components
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Essential utility components with business styling and smooth interactions. 
          Perfect for enhancing user experience.
        </p>
      </div>

      {/* Demo System */}
      <DemoUtilitySystem />

      {/* Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-gray-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Info className="w-6 h-6 text-gray-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Smart Tooltips</h4>
          <p className="text-sm text-gray-600">Position-aware tooltips with smooth animations and custom content</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Settings className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Interactive Popovers</h4>
          <p className="text-sm text-gray-600">Rich content popovers with positioning and click-outside handling</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <MoreHorizontal className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Context Menus</h4>
          <p className="text-sm text-gray-600">Right-click context menus with icons, dividers, and danger states</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-orange-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <Copy className="w-6 h-6 text-orange-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Copy to Clipboard</h4>
          <p className="text-sm text-gray-600">One-click copy functionality with success feedback and error handling</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-red-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <RefreshCw className="w-6 h-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Loading Overlays</h4>
          <p className="text-sm text-gray-600">Professional loading states with customizable messages and animations</p>
        </div>
        
        <div className="text-center p-6 bg-white rounded-lg border border-gray-200">
          <div className="bg-indigo-100 w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-6 h-6 text-indigo-600" />
          </div>
          <h4 className="font-semibold text-gray-900 mb-2">Error Boundaries</h4>
          <p className="text-sm text-gray-600">Graceful error handling with fallback UI and recovery options</p>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use Professional Utility Components
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Tooltips:</strong> Use Tooltip for contextual help and information display</p>
          <p><strong>2. Popovers:</strong> Use Popover for rich content overlays and interactive elements</p>
          <p><strong>3. Context Menus:</strong> Use ContextMenu for right-click functionality and actions</p>
          <p><strong>4. Copy to Clipboard:</strong> Use CopyToClipboard for easy text copying with feedback</p>
          <p><strong>5. Loading Overlays:</strong> Use LoadingOverlay for loading states and user feedback</p>
          <p><strong>6. Error Boundaries:</strong> Use ErrorBoundary for graceful error handling</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalUtilitiesShowcase;
