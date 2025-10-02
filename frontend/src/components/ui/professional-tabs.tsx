import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

// Base tab types
export type TabVariant = 'card' | 'underline' | 'segmented' | 'pill' | 'minimal';
export type TabSize = 'sm' | 'md' | 'lg';
export type TabOrientation = 'horizontal' | 'vertical';

interface BaseTabProps {
  variant?: TabVariant;
  size?: TabSize;
  orientation?: TabOrientation;
  className?: string;
  children: React.ReactNode;
}

interface TabItemProps {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

// Professional Tab Container
export const ProfessionalTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ variant = 'card', size = 'md', orientation = 'horizontal', className, children }, ref) => {
    const baseClasses = 'flex gap-1';
    const orientationClasses = orientation === 'vertical' ? 'flex-col' : 'flex-row';
    const sizeClasses = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base'
    };

    const variantClasses = {
      card: 'bg-white rounded-xl shadow-sm border border-gray-200 p-1',
      underline: 'border-b border-gray-200',
      segmented: 'bg-gray-100 rounded-lg p-1',
      pill: 'bg-gray-100 rounded-full p-1',
      minimal: 'space-x-6'
    };

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          orientationClasses,
          sizeClasses[size],
          variantClasses[variant],
          className
        )}
      >
        {children}
      </div>
    );
  }
);

ProfessionalTabs.displayName = 'ProfessionalTabs';

// Professional Tab Item
export const ProfessionalTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ 
    id, 
    label, 
    icon: Icon, 
    badge, 
    disabled = false, 
    active = false, 
    onClick, 
    className 
  }, ref) => {
    const baseClasses = 'relative inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
    
    const stateClasses = active
      ? 'text-blue-600 bg-white shadow-sm'
      : 'text-gray-600 hover:text-gray-800 hover:bg-white/50';

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base'
    };

    const variantClasses = {
      card: 'rounded-lg border border-gray-200',
      underline: 'border-b-2 border-transparent hover:border-gray-300 rounded-none',
      segmented: 'rounded-md',
      pill: 'rounded-full',
      minimal: 'border-b-2 border-transparent hover:border-gray-300 rounded-none'
    };

    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          baseClasses,
          stateClasses,
          sizeClasses.md, // Default to medium size
          variantClasses.card, // Default to card variant
          className
        )}
      >
        {Icon && <Icon className="w-4 h-4 mr-2" />}
        <span>{label}</span>
        {badge && (
          <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
            {badge}
          </span>
        )}
      </button>
    );
  }
);

ProfessionalTabItem.displayName = 'ProfessionalTabItem';

// Card-based Tabs (Primary Navigation)
export const CardTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ size = 'md', className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden',
          className
        )}
      >
        <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 px-6 py-2">
          <div className="flex space-x-1">
            {children}
          </div>
        </div>
      </div>
    );
  }
);

CardTabs.displayName = 'CardTabs';

export const CardTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ id, label, icon: Icon, badge, disabled = false, active = false, onClick, className }, ref) => {
    return (
      <div className="flex items-center gap-2">
        <button
          ref={ref}
          id={id}
          onClick={onClick}
          disabled={disabled}
          className={cn(
            'px-6 py-3 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2',
            active
              ? 'bg-white text-blue-600 shadow-md border border-gray-200'
              : 'text-gray-600 hover:text-gray-800 hover:bg-white/50',
            disabled && 'opacity-50 cursor-not-allowed',
            className
          )}
        >
          {Icon && <Icon className="h-4 w-4" />}
          {label}
          {badge && (
            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">
              {badge}
            </span>
          )}
        </button>
      </div>
    );
  }
);

CardTabItem.displayName = 'CardTabItem';

// Underline Tabs (Secondary Navigation)
export const UnderlineTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'border-b border-gray-200',
          className
        )}
      >
        <nav className="flex space-x-8">
          {children}
        </nav>
      </div>
    );
  }
);

UnderlineTabs.displayName = 'UnderlineTabs';

export const UnderlineTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ id, label, icon: Icon, disabled = false, active = false, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'py-4 px-1 text-sm font-medium border-b-2 transition-colors duration-200 flex items-center gap-2',
          active
            ? 'border-blue-500 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </button>
    );
  }
);

UnderlineTabItem.displayName = 'UnderlineTabItem';

// Segmented Control Tabs (Data Tables)
export const SegmentedTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex bg-gray-100 rounded-lg p-1',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

SegmentedTabs.displayName = 'SegmentedTabs';

export const SegmentedTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ id, label, icon: Icon, disabled = false, active = false, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 flex items-center gap-2',
          active
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </button>
    );
  }
);

SegmentedTabItem.displayName = 'SegmentedTabItem';

// Pill Tabs (Compact Navigation)
export const PillTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex bg-gray-100 rounded-full p-1',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

PillTabs.displayName = 'PillTabs';

export const PillTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ id, label, icon: Icon, disabled = false, active = false, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 flex items-center gap-2',
          active
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-600 hover:text-gray-800',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </button>
    );
  }
);

PillTabItem.displayName = 'PillTabItem';

// Minimal Tabs (Clean Text Navigation)
export const MinimalTabs = forwardRef<HTMLDivElement, BaseTabProps>(
  ({ className, children }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex space-x-6',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

MinimalTabs.displayName = 'MinimalTabs';

export const MinimalTabItem = forwardRef<HTMLButtonElement, TabItemProps>(
  ({ id, label, icon: Icon, disabled = false, active = false, onClick, className }, ref) => {
    return (
      <button
        ref={ref}
        id={id}
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'py-2 text-sm font-medium transition-colors duration-200 flex items-center gap-2 border-b-2 border-transparent',
          active
            ? 'text-blue-600 border-blue-500'
            : 'text-gray-500 hover:text-gray-700 hover:border-gray-300',
          disabled && 'opacity-50 cursor-not-allowed',
          className
        )}
      >
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </button>
    );
  }
);

MinimalTabItem.displayName = 'MinimalTabItem';

// Tab Content Container
export const TabContent = forwardRef<HTMLDivElement, { 
  children: React.ReactNode; 
  className?: string;
  active?: boolean;
}>(
  ({ children, className, active = true }, ref) => {
    if (!active) return null;
    
    return (
      <div
        ref={ref}
        className={cn(
          'mt-4 animate-in fade-in-0 slide-in-from-top-2 duration-300',
          className
        )}
      >
        {children}
      </div>
    );
  }
);

TabContent.displayName = 'TabContent';
