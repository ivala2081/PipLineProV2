import React from 'react';

// Icon Component with Business Styles
export interface BusinessIconProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'light' | 'white';
  withBackground?: boolean;
  withBorder?: boolean;
  className?: string;
}

export function BusinessIcon({ 
  children, 
  size = 'md', 
  variant = 'default',
  withBackground = false,
  withBorder = false,
  className = '' 
}: BusinessIconProps) {
  const sizeClasses = {
    sm: 'business-icon-sm',
    md: 'business-icon-md',
    lg: 'business-icon-lg',
    xl: 'business-icon-xl',
    '2xl': 'business-icon-2xl'
  };

  const variantClasses = {
    default: '',
    primary: 'business-icon-primary',
    success: 'business-icon-success',
    warning: 'business-icon-warning',
    error: 'business-icon-error',
    neutral: 'business-icon-neutral',
    light: 'business-icon-light',
    white: 'business-icon-white'
  };

  const backgroundClasses = {
    primary: 'business-icon-bg-primary',
    success: 'business-icon-bg-success',
    warning: 'business-icon-bg-warning',
    error: 'business-icon-bg-error',
    neutral: 'business-icon-bg-neutral',
    light: 'business-icon-bg-light'
  };

  const borderClasses = {
    primary: 'business-icon-border-primary',
    success: 'business-icon-border-success',
    warning: 'business-icon-border-warning',
    error: 'business-icon-border-error',
    neutral: 'business-icon-border-neutral'
  };

  let finalClasses = `${sizeClasses[size]} ${variantClasses[variant]}`;
  
  if (withBackground && variant !== 'default' && variant !== 'white') {
    finalClasses = `${sizeClasses[size]} ${backgroundClasses[variant as keyof typeof backgroundClasses]}`;
  }
  
  if (withBorder && variant !== 'default') {
    finalClasses = `${sizeClasses[size]} ${borderClasses[variant as keyof typeof borderClasses]}`;
  }

  return (
    <div className={`${finalClasses} ${className}`}>
      {children}
    </div>
  );
}

// Status Indicator Component
export interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away' | 'dnd';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function StatusIndicator({ 
  status, 
  size = 'md', 
  className = '' 
}: StatusIndicatorProps) {
  const statusClasses = {
    online: 'business-status-online',
    offline: 'business-status-offline',
    busy: 'business-status-busy',
    away: 'business-status-away',
    dnd: 'business-status-dnd'
  };

  const sizeClasses = {
    sm: 'business-indicator-sm',
    md: 'business-indicator-md',
    lg: 'business-indicator-lg',
    xl: 'business-indicator-xl'
  };

  return (
    <div className={`${sizeClasses[size]} ${statusClasses[status]} ${className}`} />
  );
}

// Progress Ring Component
export interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function ProgressRing({ 
  progress, 
  size = 60, 
  strokeWidth = 4, 
  variant = 'default',
  className = '' 
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const variantClasses = {
    default: 'business-progress-ring-progress',
    primary: 'business-progress-ring-progress business-progress-ring-primary',
    success: 'business-progress-ring-progress business-progress-ring-success',
    warning: 'business-progress-ring-progress business-progress-ring-warning',
    error: 'business-progress-ring-progress business-progress-ring-error'
  };

  return (
    <div className={`business-progress-ring ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="business-progress-ring-circle">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="business-progress-ring-bg"
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className={variantClasses[variant]}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          style={{ transformOrigin: 'center' }}
        />
      </svg>
    </div>
  );
}

// Badge Component
export interface BusinessBadgeProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'light';
  className?: string;
}

export function BusinessBadge({ 
  children, 
  size = 'md', 
  variant = 'primary',
  className = '' 
}: BusinessBadgeProps) {
  const sizeClasses = {
    sm: 'business-badge-sm',
    md: 'business-badge-md',
    lg: 'business-badge-lg'
  };

  const variantClasses = {
    primary: 'business-badge-primary',
    success: 'business-badge-success',
    warning: 'business-badge-warning',
    error: 'business-badge-error',
    neutral: 'business-badge-neutral',
    light: 'business-badge-light'
  };

  return (
    <span className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
}

// Dot Indicator Component
export interface DotIndicatorProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'light';
  className?: string;
}

export function DotIndicator({ 
  size = 'md', 
  variant = 'primary',
  className = '' 
}: DotIndicatorProps) {
  const sizeClasses = {
    sm: 'business-dot-sm',
    md: 'business-dot-md',
    lg: 'business-dot-lg'
  };

  const variantClasses = {
    primary: 'business-dot-primary',
    success: 'business-dot-success',
    warning: 'business-dot-warning',
    error: 'business-dot-error',
    neutral: 'business-dot-neutral',
    light: 'business-dot-light'
  };

  return (
    <span className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`} />
  );
}

// Line Indicator Component
export interface LineIndicatorProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'light';
  className?: string;
}

export function LineIndicator({ 
  size = 'md', 
  variant = 'primary',
  className = '' 
}: LineIndicatorProps) {
  const sizeClasses = {
    sm: 'business-line-sm',
    md: 'business-line-md',
    lg: 'business-line-lg',
    xl: 'business-line-xl'
  };

  const variantClasses = {
    primary: 'business-line-primary',
    success: 'business-line-success',
    warning: 'business-line-warning',
    error: 'business-line-error',
    neutral: 'business-line-neutral',
    light: 'business-line-light'
  };

  return (
    <span className={`${sizeClasses[size]} ${variantClasses[variant]} ${className}`} />
  );
}

// Divider Component
export interface BusinessDividerProps {
  variant?: 'solid' | 'dashed' | 'dotted';
  color?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function BusinessDivider({ 
  variant = 'solid', 
  color = 'default',
  orientation = 'horizontal',
  className = '' 
}: BusinessDividerProps) {
  const variantClasses = {
    solid: '',
    dashed: orientation === 'horizontal' ? 'business-divider-dashed' : 'business-divider-vertical-dashed',
    dotted: orientation === 'horizontal' ? 'business-divider-dotted' : 'business-divider-vertical-dotted'
  };

  const colorClasses = {
    default: orientation === 'horizontal' ? 'business-divider' : 'business-divider-vertical',
    primary: 'business-divider-primary',
    success: 'business-divider-success',
    warning: 'business-divider-warning',
    error: 'business-divider-error',
    neutral: 'business-divider-neutral'
  };

  const baseClass = color === 'default' ? colorClasses[color] : colorClasses[color];
  const finalClass = variant === 'solid' ? baseClass : variantClasses[variant];

  return (
    <div className={`${finalClass} ${className}`} />
  );
}

// Corner Indicator Component
export interface CornerIndicatorProps {
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

export function CornerIndicator({ 
  variant = 'primary',
  className = '' 
}: CornerIndicatorProps) {
  const variantClasses = {
    primary: 'business-corner-primary',
    success: 'business-corner-success',
    warning: 'business-corner-warning',
    error: 'business-corner-error',
    neutral: 'business-corner-neutral'
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`} />
  );
}

// Ribbon Component
export interface BusinessRibbonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function BusinessRibbon({ 
  children, 
  variant = 'primary',
  className = '' 
}: BusinessRibbonProps) {
  const variantClasses = {
    primary: 'business-ribbon',
    success: 'business-ribbon-success',
    warning: 'business-ribbon-warning',
    error: 'business-ribbon-error'
  };

  return (
    <div className={`${variantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

// Pattern Background Component
export interface PatternBackgroundProps {
  pattern: 'dots' | 'grid' | 'diagonal' | 'waves';
  className?: string;
}

export function PatternBackground({ 
  pattern, 
  className = '' 
}: PatternBackgroundProps) {
  const patternClasses = {
    dots: 'business-pattern-dots',
    grid: 'business-pattern-grid',
    diagonal: 'business-pattern-diagonal',
    waves: 'business-pattern-waves'
  };

  return (
    <div className={`${patternClasses[pattern]} ${className}`} />
  );
}

// Animated Icon Component
export interface AnimatedIconProps {
  children: React.ReactNode;
  animation?: 'pulse' | 'bounce' | 'spin' | 'ping' | 'wiggle' | 'shake';
  className?: string;
}

export function AnimatedIcon({ 
  children, 
  animation = 'pulse',
  className = '' 
}: AnimatedIconProps) {
  const animationClasses = {
    pulse: 'business-icon-pulse',
    bounce: 'business-icon-bounce',
    spin: 'business-icon-spin',
    ping: 'business-icon-ping',
    wiggle: 'business-icon-wiggle',
    shake: 'business-icon-shake'
  };

  return (
    <div className={`${animationClasses[animation]} ${className}`}>
      {children}
    </div>
  );
}

// Demo Component to showcase all iconography types
export function IconographyShowcase() {
  return (
    <div className="space-business-md">
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="text-xl font-semibold text-gray-900">Business Iconography Showcase</h2>
          <p className="text-gray-600">Professional business icons and visual elements</p>
        </div>
        <div className="business-card-body">
          <div className="space-business-lg">
            
            {/* Icon Sizes */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Icon Sizes</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessIcon size="sm">📊</BusinessIcon>
                <BusinessIcon size="md">📊</BusinessIcon>
                <BusinessIcon size="lg">📊</BusinessIcon>
                <BusinessIcon size="xl">📊</BusinessIcon>
                <BusinessIcon size="2xl">📊</BusinessIcon>
              </div>
            </div>

            {/* Icon Variants */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Icon Variants</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessIcon variant="primary">📊</BusinessIcon>
                <BusinessIcon variant="success">📊</BusinessIcon>
                <BusinessIcon variant="warning">📊</BusinessIcon>
                <BusinessIcon variant="error">📊</BusinessIcon>
                <BusinessIcon variant="neutral">📊</BusinessIcon>
                <BusinessIcon variant="light">📊</BusinessIcon>
                <BusinessIcon variant="white" className="bg-gray-800">📊</BusinessIcon>
              </div>
            </div>

            {/* Icons with Backgrounds */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Icons with Backgrounds</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessIcon variant="primary" withBackground>📊</BusinessIcon>
                <BusinessIcon variant="success" withBackground>📊</BusinessIcon>
                <BusinessIcon variant="warning" withBackground>📊</BusinessIcon>
                <BusinessIcon variant="error" withBackground>📊</BusinessIcon>
                <BusinessIcon variant="neutral" withBackground>📊</BusinessIcon>
                <BusinessIcon variant="light" withBackground>📊</BusinessIcon>
              </div>
            </div>

            {/* Icons with Borders */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Icons with Borders</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessIcon variant="primary" withBorder>📊</BusinessIcon>
                <BusinessIcon variant="success" withBorder>📊</BusinessIcon>
                <BusinessIcon variant="warning" withBorder>📊</BusinessIcon>
                <BusinessIcon variant="error" withBorder>📊</BusinessIcon>
                <BusinessIcon variant="neutral" withBorder>📊</BusinessIcon>
              </div>
            </div>

            {/* Status Indicators */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Indicators</h3>
              <div className="flex items-center space-business-x-sm">
                <div className="flex items-center space-business-x-sm">
                  <StatusIndicator status="online" />
                  <span className="text-sm text-gray-600">Online</span>
                </div>
                <div className="flex items-center space-business-x-sm">
                  <StatusIndicator status="offline" />
                  <span className="text-sm text-gray-600">Offline</span>
                </div>
                <div className="flex items-center space-business-x-sm">
                  <StatusIndicator status="busy" />
                  <span className="text-sm text-gray-600">Busy</span>
                </div>
                <div className="flex items-center space-business-x-sm">
                  <StatusIndicator status="away" />
                  <span className="text-sm text-gray-600">Away</span>
                </div>
                <div className="flex items-center space-business-x-sm">
                  <StatusIndicator status="dnd" />
                  <span className="text-sm text-gray-600">Do Not Disturb</span>
                </div>
              </div>
            </div>

            {/* Progress Rings */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress Rings</h3>
              <div className="flex items-center space-business-x-sm">
                <div className="text-center">
                  <ProgressRing progress={25} variant="primary" />
                  <p className="text-sm text-gray-600 mt-2">25%</p>
                </div>
                <div className="text-center">
                  <ProgressRing progress={50} variant="success" />
                  <p className="text-sm text-gray-600 mt-2">50%</p>
                </div>
                <div className="text-center">
                  <ProgressRing progress={75} variant="warning" />
                  <p className="text-sm text-gray-600 mt-2">75%</p>
                </div>
                <div className="text-center">
                  <ProgressRing progress={100} variant="error" />
                  <p className="text-sm text-gray-600 mt-2">100%</p>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Badges</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessBadge size="sm" variant="primary">New</BusinessBadge>
                <BusinessBadge size="md" variant="success">Active</BusinessBadge>
                <BusinessBadge size="lg" variant="warning">Pending</BusinessBadge>
                <BusinessBadge variant="error">Error</BusinessBadge>
                <BusinessBadge variant="neutral">Info</BusinessBadge>
                <BusinessBadge variant="light">Light</BusinessBadge>
              </div>
            </div>

            {/* Dot Indicators */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dot Indicators</h3>
              <div className="flex items-center space-business-x-sm">
                <DotIndicator size="sm" variant="primary" />
                <DotIndicator size="md" variant="success" />
                <DotIndicator size="lg" variant="warning" />
                <DotIndicator variant="error" />
                <DotIndicator variant="neutral" />
                <DotIndicator variant="light" />
              </div>
            </div>

            {/* Line Indicators */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Indicators</h3>
              <div className="flex items-center space-business-x-sm">
                <LineIndicator size="sm" variant="primary" />
                <LineIndicator size="md" variant="success" />
                <LineIndicator size="lg" variant="warning" />
                <LineIndicator size="xl" variant="error" />
                <LineIndicator variant="neutral" />
                <LineIndicator variant="light" />
              </div>
            </div>

            {/* Dividers */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dividers</h3>
              <div className="space-business-sm">
                <BusinessDivider variant="solid" color="default" />
                <BusinessDivider variant="dashed" color="primary" />
                <BusinessDivider variant="dotted" color="success" />
                <BusinessDivider variant="solid" color="warning" />
                <BusinessDivider variant="solid" color="error" />
                <BusinessDivider variant="solid" color="neutral" />
              </div>
            </div>

            {/* Corner Indicators */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Corner Indicators</h3>
              <div className="grid grid-cols-5 gap-4">
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                  <CornerIndicator variant="primary" />
                </div>
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                  <CornerIndicator variant="success" />
                </div>
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                  <CornerIndicator variant="warning" />
                </div>
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                  <CornerIndicator variant="error" />
                </div>
                <div className="relative w-20 h-20 bg-gray-100 rounded-lg">
                  <CornerIndicator variant="neutral" />
                </div>
              </div>
            </div>

            {/* Ribbons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ribbons</h3>
              <div className="grid grid-cols-4 gap-4">
                <div className="relative w-32 h-24 bg-gray-100 rounded-lg">
                  <BusinessRibbon variant="primary">New</BusinessRibbon>
                </div>
                <div className="relative w-32 h-24 bg-gray-100 rounded-lg">
                  <BusinessRibbon variant="success">Active</BusinessRibbon>
                </div>
                <div className="relative w-32 h-24 bg-gray-100 rounded-lg">
                  <BusinessRibbon variant="warning">Pending</BusinessRibbon>
                </div>
                <div className="relative w-32 h-24 bg-gray-100 rounded-lg">
                  <BusinessRibbon variant="error">Error</BusinessRibbon>
                </div>
              </div>
            </div>

            {/* Pattern Backgrounds */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Pattern Backgrounds</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-24 rounded-lg business-pattern-dots" />
                <div className="h-24 rounded-lg business-pattern-grid" />
                <div className="h-24 rounded-lg business-pattern-diagonal" />
                <div className="h-24 rounded-lg business-pattern-waves" />
              </div>
            </div>

            {/* Animated Icons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Animated Icons</h3>
              <div className="flex items-center space-business-x-sm">
                <AnimatedIcon animation="pulse">
                  <BusinessIcon variant="primary">📊</BusinessIcon>
                </AnimatedIcon>
                <AnimatedIcon animation="bounce">
                  <BusinessIcon variant="success">📊</BusinessIcon>
                </AnimatedIcon>
                <AnimatedIcon animation="spin">
                  <BusinessIcon variant="warning">📊</BusinessIcon>
                </AnimatedIcon>
                <AnimatedIcon animation="ping">
                  <BusinessIcon variant="error">📊</BusinessIcon>
                </AnimatedIcon>
                <AnimatedIcon animation="wiggle">
                  <BusinessIcon variant="neutral">📊</BusinessIcon>
                </AnimatedIcon>
                <AnimatedIcon animation="shake">
                  <BusinessIcon variant="primary">📊</BusinessIcon>
                </AnimatedIcon>
              </div>
            </div>

            {/* Responsive Icons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Responsive Icons</h3>
              <div className="flex items-center space-business-x-sm">
                <BusinessIcon className="business-icon-responsive" variant="primary">📊</BusinessIcon>
                <span className="text-sm text-gray-600">Resizes based on screen size</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
