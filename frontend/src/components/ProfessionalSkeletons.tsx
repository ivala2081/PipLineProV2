import React from 'react';

// Skeleton Text Component
export interface SkeletonTextProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  width?: 'short' | 'medium' | 'long' | 'full';
  className?: string;
}

export function SkeletonText({ 
  size = 'md', 
  width = 'full', 
  className = '' 
}: SkeletonTextProps) {
  const sizeClasses = {
    sm: 'business-skeleton-text-sm',
    md: 'business-skeleton-text',
    lg: 'business-skeleton-text-lg',
    xl: 'business-skeleton-text-xl',
    '2xl': 'business-skeleton-text-2xl',
    '3xl': 'business-skeleton-text-3xl'
  };

  const widthClasses = {
    short: 'business-skeleton-text-short',
    medium: 'business-skeleton-text-medium',
    long: 'business-skeleton-text-long',
    full: ''
  };

  return (
    <div className={`${sizeClasses[size]} ${widthClasses[width]} ${className}`} />
  );
}

// Skeleton Avatar Component
export interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function SkeletonAvatar({ 
  size = 'md', 
  className = '' 
}: SkeletonAvatarProps) {
  const sizeClasses = {
    sm: 'business-skeleton-avatar-sm',
    md: 'business-skeleton-avatar-md',
    lg: 'business-skeleton-avatar-lg',
    xl: 'business-skeleton-avatar-xl'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton Button Component
export interface SkeletonButtonProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonButton({ 
  size = 'md', 
  className = '' 
}: SkeletonButtonProps) {
  const sizeClasses = {
    sm: 'business-skeleton-button-sm',
    md: 'business-skeleton-button',
    lg: 'business-skeleton-button-lg'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton Input Component
export interface SkeletonInputProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonInput({ 
  size = 'md', 
  className = '' 
}: SkeletonInputProps) {
  const sizeClasses = {
    sm: 'business-skeleton-input-sm',
    md: 'business-skeleton-input',
    lg: 'business-skeleton-input-lg'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton Card Component
export interface SkeletonCardProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonCard({ 
  size = 'md', 
  className = '' 
}: SkeletonCardProps) {
  const sizeClasses = {
    sm: 'business-skeleton-card-sm',
    md: 'business-skeleton-card',
    lg: 'business-skeleton-card-lg'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton Circle Component
export interface SkeletonCircleProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonCircle({ 
  size = 'md', 
  className = '' 
}: SkeletonCircleProps) {
  const sizeClasses = {
    sm: 'business-skeleton-circle-sm',
    md: 'business-skeleton-circle-md',
    lg: 'business-skeleton-circle-lg'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`} />
  );
}

// Skeleton Table Component
export interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
  className?: string;
}

export function SkeletonTable({ 
  rows = 5, 
  columns = 4, 
  showHeader = true, 
  className = '' 
}: SkeletonTableProps) {
  return (
    <div className={`business-skeleton-table ${className}`}>
      {showHeader && (
        <div className="business-skeleton-table-header">
          {Array.from({ length: columns }).map((_, index) => (
            <div key={index} className="business-skeleton-table-cell" />
          ))}
        </div>
      )}
      
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="business-skeleton-table-row">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="business-skeleton-table-cell" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton Form Component
export interface SkeletonFormProps {
  fields?: number;
  showActions?: boolean;
  className?: string;
}

export function SkeletonForm({ 
  fields = 3, 
  showActions = true, 
  className = '' 
}: SkeletonFormProps) {
  return (
    <div className={`business-skeleton-form ${className}`}>
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="business-skeleton-form-group">
          <div className="business-skeleton-form-label" />
          <div className="business-skeleton-form-input" />
        </div>
      ))}
      
      {showActions && (
        <div className="business-skeleton-form-actions">
          <div className="business-skeleton-button" />
          <div className="business-skeleton-button" />
        </div>
      )}
    </div>
  );
}

// Skeleton List Component
export interface SkeletonListProps {
  items?: number;
  showAvatars?: boolean;
  showActions?: boolean;
  className?: string;
}

export function SkeletonList({ 
  items = 5, 
  showAvatars = true, 
  showActions = true, 
  className = '' 
}: SkeletonListProps) {
  return (
    <div className={`business-skeleton-list ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="business-skeleton-list-item">
          {showAvatars && (
            <div className="business-skeleton-list-item-avatar" />
          )}
          
          <div className="business-skeleton-list-item-content">
            <div className="business-skeleton-list-item-title" />
            <div className="business-skeleton-list-item-subtitle" />
          </div>
          
          {showActions && (
            <div className="business-skeleton-list-item-action" />
          )}
        </div>
      ))}
    </div>
  );
}

// Skeleton Grid Component
export interface SkeletonGridProps {
  columns?: 2 | 3 | 4;
  items?: number;
  itemSize?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function SkeletonGrid({ 
  columns = 3, 
  items = 6, 
  itemSize = 'md', 
  className = '' 
}: SkeletonGridProps) {
  const gridClasses = {
    2: 'business-skeleton-grid-2',
    3: 'business-skeleton-grid-3',
    4: 'business-skeleton-grid-4'
  };

  const itemClasses = {
    sm: 'business-skeleton-grid-item-sm',
    md: 'business-skeleton-grid-item',
    lg: 'business-skeleton-grid-item-lg'
  };

  return (
    <div className={`${gridClasses[columns]} ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className={itemClasses[itemSize]} />
      ))}
    </div>
  );
}

// Skeleton Chart Component
export interface SkeletonChartProps {
  size?: 'sm' | 'md' | 'lg';
  showHeader?: boolean;
  showLegend?: boolean;
  className?: string;
}

export function SkeletonChart({ 
  size = 'md', 
  showHeader = true, 
  showLegend = true, 
  className = '' 
}: SkeletonChartProps) {
  const sizeClasses = {
    sm: 'business-skeleton-chart-sm',
    md: 'business-skeleton-chart',
    lg: 'business-skeleton-chart-lg'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      {showHeader && (
        <div className="business-skeleton-chart-header">
          <div className="business-skeleton-chart-title" />
          <div className="business-skeleton-chart-actions">
            <div className="business-skeleton-chart-action" />
            <div className="business-skeleton-chart-action" />
          </div>
        </div>
      )}
      
      {showLegend && (
        <div className="business-skeleton-chart-legend">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="business-skeleton-chart-legend-item">
              <div className="business-skeleton-chart-legend-color" />
              <div className="business-skeleton-chart-legend-label" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Skeleton Navigation Component
export interface SkeletonNavigationProps {
  items?: number;
  showIcons?: boolean;
  showBadges?: boolean;
  className?: string;
}

export function SkeletonNavigation({ 
  items = 6, 
  showIcons = true, 
  showBadges = true, 
  className = '' 
}: SkeletonNavigationProps) {
  return (
    <div className={`business-skeleton-nav ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="business-skeleton-nav-item">
          {showIcons && (
            <div className="business-skeleton-nav-icon" />
          )}
          
          <div className="business-skeleton-nav-text" />
          
          {showBadges && (
            <div className="business-skeleton-nav-badge" />
          )}
        </div>
      ))}
    </div>
  );
}

// Skeleton Sidebar Component
export interface SkeletonSidebarProps {
  className?: string;
}

export function SkeletonSidebar({ className = '' }: SkeletonSidebarProps) {
  return (
    <div className={`business-skeleton-sidebar ${className}`}>
      <div className="business-skeleton-sidebar-header">
        <div className="business-skeleton-sidebar-logo" />
        <div className="business-skeleton-sidebar-title" />
      </div>
      
      <div className="business-skeleton-sidebar-body">
        <SkeletonNavigation items={8} />
      </div>
      
      <div className="business-skeleton-sidebar-footer">
        <div className="business-skeleton-avatar-md" />
        <div className="business-skeleton-text w-32" />
      </div>
    </div>
  );
}

// Skeleton Dashboard Component
export interface SkeletonDashboardProps {
  className?: string;
}

export function SkeletonDashboard({ className = '' }: SkeletonDashboardProps) {
  return (
    <div className={`business-skeleton-dashboard ${className}`}>
      <div className="business-skeleton-dashboard-header">
        <div className="business-skeleton-dashboard-title" />
        <div className="business-skeleton-dashboard-subtitle" />
        <div className="business-skeleton-dashboard-actions">
          <div className="business-skeleton-dashboard-action" />
          <div className="business-skeleton-dashboard-action" />
        </div>
      </div>
      
      <div className="business-skeleton-dashboard-stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="business-skeleton-dashboard-stat" />
        ))}
      </div>
      
      <div className="business-skeleton-dashboard-content">
        <div className="business-skeleton-dashboard-chart" />
        <div className="business-skeleton-dashboard-table" />
      </div>
    </div>
  );
}

// Demo Component to showcase all skeleton types
export function SkeletonShowcase() {
  return (
    <div className="space-business-md">
      <div className="business-card">
        <div className="business-card-header">
          <h2 className="text-xl font-semibold text-gray-900">Skeleton Loader Showcase</h2>
          <p className="text-gray-600">Professional business skeleton components</p>
        </div>
        <div className="business-card-body">
          <div className="space-business-lg">
            
            {/* Text Skeletons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Text Skeletons</h3>
              <div className="space-business-sm">
                <SkeletonText size="3xl" />
                <SkeletonText size="2xl" />
                <SkeletonText size="xl" />
                <SkeletonText size="lg" />
                <SkeletonText size="md" />
                <SkeletonText size="sm" />
              </div>
              <div className="space-business-sm mt-4">
                <SkeletonText size="md" width="short" />
                <SkeletonText size="md" width="medium" />
                <SkeletonText size="md" width="long" />
                <SkeletonText size="md" width="full" />
              </div>
            </div>

            {/* Avatar Skeletons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Avatar Skeletons</h3>
              <div className="flex items-center space-business-x-sm">
                <SkeletonAvatar size="sm" />
                <SkeletonAvatar size="md" />
                <SkeletonAvatar size="lg" />
                <SkeletonAvatar size="xl" />
              </div>
            </div>

            {/* Button Skeletons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Button Skeletons</h3>
              <div className="flex items-center space-business-x-sm">
                <SkeletonButton size="sm" />
                <SkeletonButton size="md" />
                <SkeletonButton size="lg" />
              </div>
            </div>

            {/* Input Skeletons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Input Skeletons</h3>
              <div className="space-business-sm">
                <SkeletonInput size="sm" />
                <SkeletonInput size="md" />
                <SkeletonInput size="lg" />
              </div>
            </div>

            {/* Card Skeletons */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Card Skeletons</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SkeletonCard size="sm" />
                <SkeletonCard size="md" />
                <SkeletonCard size="lg" />
              </div>
            </div>

            {/* Table Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Table Skeleton</h3>
              <SkeletonTable rows={4} columns={5} showHeader={true} />
            </div>

            {/* Form Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Form Skeleton</h3>
              <SkeletonForm fields={4} showActions={true} />
            </div>

            {/* List Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">List Skeleton</h3>
              <SkeletonList items={4} showAvatars={true} showActions={true} />
            </div>

            {/* Grid Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Grid Skeleton</h3>
              <SkeletonGrid columns={4} items={8} itemSize="md" />
            </div>

            {/* Chart Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Chart Skeleton</h3>
              <SkeletonChart size="lg" showHeader={true} showLegend={true} />
            </div>

            {/* Navigation Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Navigation Skeleton</h3>
              <SkeletonNavigation items={6} showIcons={true} showBadges={true} />
            </div>

            {/* Sidebar Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sidebar Skeleton</h3>
              <SkeletonSidebar />
            </div>

            {/* Dashboard Skeleton */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dashboard Skeleton</h3>
              <SkeletonDashboard />
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
