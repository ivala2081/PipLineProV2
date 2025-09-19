import React, { useState } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity, 
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  Loader2
} from 'lucide-react';

// ===== CHART WRAPPER COMPONENTS =====
// These components automatically apply our business styles to any chart library

interface BusinessChartContainerProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'interactive';
  className?: string;
  onRefresh?: () => void;
  onDownload?: () => void;
  loading?: boolean;
  error?: string;
  empty?: boolean;
}

export function BusinessChartContainer({
  title,
  subtitle,
  children,
  variant = 'default',
  className = '',
  onRefresh,
  onDownload,
  loading = false,
  error,
  empty = false
}: BusinessChartContainerProps) {
  const containerClasses = {
    default: 'business-chart-container',
    elevated: 'business-chart-container-elevated',
    interactive: 'business-chart-container-interactive'
  };

  if (loading) {
    return (
      <div className={`${containerClasses[variant]} ${className}`}>
        <div className="business-chart-loading">
          <div className="business-chart-loading-spinner" />
          <div className="business-chart-loading-text">Loading chart data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${containerClasses[variant]} ${className}`}>
        <div className="business-chart-error">
          <AlertCircle className="business-chart-error-icon" />
          <div className="business-chart-error-text">{error}</div>
        </div>
      </div>
    );
  }

  if (empty) {
    return (
      <div className={`${containerClasses[variant]} ${className}`}>
        <div className="business-chart-empty">
          <BarChart3 className="business-chart-empty-icon" />
          <div className="business-chart-empty-text">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${containerClasses[variant]} ${className}`}>
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">{title}</h3>
          {subtitle && <p className="business-chart-subtitle">{subtitle}</p>}
        </div>
        <div className="business-chart-actions">
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="business-chart-filter-button"
              title="Refresh data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="business-chart-filter-button"
              title="Download chart"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

// ===== CHART LEGEND COMPONENT =====
interface ChartLegendItem {
  label: string;
  value?: string | number;
  color: string;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
}

interface BusinessChartLegendProps {
  items: ChartLegendItem[];
  className?: string;
}

export function BusinessChartLegend({ items, className = '' }: BusinessChartLegendProps) {
  return (
    <div className={`business-chart-legend ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="business-chart-legend-item">
          <div 
            className="business-chart-legend-color"
            style={{ backgroundColor: item.color }}
          />
          <span className="business-chart-legend-label">{item.label}</span>
          {item.value && (
            <span className="business-chart-legend-value">{item.value}</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ===== CHART FILTER CONTROLS =====
interface ChartFilterOption {
  value: string;
  label: string;
}

interface BusinessChartFiltersProps {
  filters: {
    label: string;
    value: string;
    options: ChartFilterOption[];
    onChange: (value: string) => void;
  }[];
  className?: string;
}

export function BusinessChartFilters({ filters, className = '' }: BusinessChartFiltersProps) {
  return (
    <div className={`business-chart-filters ${className}`}>
      {filters.map((filter, index) => (
        <div key={index} className="business-chart-filter-group">
          <label className="business-chart-filter-label">{filter.label}</label>
          <select
            value={filter.value}
            onChange={(e) => filter.onChange(e.target.value)}
            className="business-chart-filter-select"
          >
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

// ===== PERFORMANCE INDICATOR COMPONENT =====
interface BusinessPerformanceIndicatorProps {
  value: number;
  change: number;
  label: string;
  className?: string;
}

export function BusinessPerformanceIndicator({
  value,
  change,
  label,
  className = ''
}: BusinessPerformanceIndicatorProps) {
  const isPositive = change >= 0;
  const changeClass = isPositive 
    ? 'business-chart-performance-positive' 
    : 'business-chart-performance-negative';

  return (
    <div className={`text-center ${className}`}>
      <div className="business-chart-comparison-label">{label}</div>
      <div className="business-chart-comparison-value">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className={changeClass}>
        {isPositive ? '+' : ''}{change}%
      </div>
    </div>
  );
}

// ===== CHART COMPARISON COMPONENT =====
interface BusinessChartComparisonProps {
  items: {
    label: string;
    value: string | number;
    change: number;
  }[];
  className?: string;
}

export function BusinessChartComparison({ items, className = '' }: BusinessChartComparisonProps) {
  return (
    <div className={`business-chart-comparison ${className}`}>
      {items.map((item, index) => (
        <div key={index} className="business-chart-comparison-item">
          <div className="business-chart-comparison-label">{item.label}</div>
          <div className="business-chart-comparison-value">
            {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
          </div>
          <div className={
            item.change >= 0 
              ? 'business-chart-comparison-change-positive' 
              : 'business-chart-comparison-change-negative'
          }>
            {item.change >= 0 ? '+' : ''}{item.change}%
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== DEMO CHART COMPONENTS =====
// These show how to use the wrapper components with mock data

export function DemoLineChart() {
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  const handleDownload = () => {
    alert('Download functionality would be implemented here');
  };

  return (
    <BusinessChartContainer
      title="Revenue Trends"
      subtitle="Monthly revenue performance over time"
      variant="elevated"
      onRefresh={handleRefresh}
      onDownload={handleDownload}
      loading={isLoading}
    >
      {/* This is where you'd put your actual chart library component */}
      <div className="business-chart-responsive h-64 bg-gradient-to-br from-gray-50 to-indigo-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-600">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-500" />
          <p className="text-lg font-medium">Line Chart Placeholder</p>
          <p className="text-sm">Your chart library component goes here</p>
          <p className="text-xs mt-2">Time Range: {timeRange}</p>
        </div>
      </div>

      <BusinessChartFilters
        filters={[
          {
            label: 'Time Range',
            value: timeRange,
            options: [
              { value: '7d', label: '7 Days' },
              { value: '30d', label: '30 Days' },
              { value: '90d', label: '90 Days' },
              { value: '1y', label: '1 Year' }
            ],
            onChange: setTimeRange
          }
        ]}
        className="mt-6"
      />

      <BusinessChartLegend
        items={[
          { label: 'Revenue', value: '₺2.4M', color: '#3B82F6' },
          { label: 'Growth', value: '+12.5%', color: '#10B981' },
          { label: 'Target', value: '₺2.1M', color: '#F59E0B' }
        ]}
        className="mt-6"
      />
    </BusinessChartContainer>
  );
}

export function DemoBarChart() {
  const [chartType, setChartType] = useState('vertical');
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <BusinessChartContainer
      title="Transaction Volume"
      subtitle="Daily transaction counts by category"
      variant="interactive"
      onRefresh={handleRefresh}
      loading={isLoading}
    >
      {/* Chart placeholder */}
      <div className="business-chart-responsive h-64 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-600">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <p className="text-lg font-medium">Bar Chart Placeholder</p>
          <p className="text-sm">Your chart library component goes here</p>
          <p className="text-xs mt-2">Type: {chartType}</p>
        </div>
      </div>

      <BusinessChartFilters
        filters={[
          {
            label: 'Chart Type',
            value: chartType,
            options: [
              { value: 'vertical', label: 'Vertical Bars' },
              { value: 'horizontal', label: 'Horizontal Bars' },
              { value: 'stacked', label: 'Stacked Bars' }
            ],
            onChange: setChartType
          }
        ]}
        className="mt-6"
      />

      <BusinessChartLegend
        items={[
          { label: 'Payments', value: '1,234', color: '#10B981' },
          { label: 'Withdrawals', value: '567', color: '#F59E0B' },
          { label: 'Transfers', value: '890', color: '#EF4444' }
        ]}
        className="mt-6"
      />
    </BusinessChartContainer>
  );
}

export function DemoPieChart() {
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  return (
    <BusinessChartContainer
      title="Revenue Distribution"
      subtitle="Revenue breakdown by service type"
      variant="default"
      onRefresh={handleRefresh}
      loading={isLoading}
    >
      {/* Chart placeholder */}
      <div className="business-chart-responsive h-64 bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-600">
          <PieChart className="w-16 h-16 mx-auto mb-4 text-purple-500" />
          <p className="text-lg font-medium">Pie Chart Placeholder</p>
          <p className="text-sm">Your chart library component goes here</p>
        </div>
      </div>

      <BusinessChartLegend
        items={[
          { label: 'Payment Processing', value: '₺1.2M (50%)', color: '#8B5CF6' },
          { label: 'Currency Exchange', value: '₺720K (30%)', color: '#EC4899' },
          { label: 'Consulting', value: '₺480K (20%)', color: '#F59E0B' }
        ]}
        className="mt-6"
      />
    </BusinessChartContainer>
  );
}

export function DemoPerformanceMetrics() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <BusinessPerformanceIndicator
        label="Total Revenue"
        value={2450000}
        change={12.5}
      />
      <BusinessPerformanceIndicator
        label="Active Users"
        value={15420}
        change={8.3}
      />
      <BusinessPerformanceIndicator
        label="Transaction Volume"
        value={892340}
        change={-2.1}
      />
      <BusinessPerformanceIndicator
        label="Success Rate"
        value={98.7}
        change={1.2}
      />
    </div>
  );
}

export function DemoComparisonChart() {
  return (
    <BusinessChartContainer
      title="Performance Comparison"
      subtitle="This month vs. last month"
      variant="elevated"
    >
      <BusinessChartComparison
        items={[
          { label: 'Revenue', value: '₺2.4M', change: 12.5 },
          { label: 'Transactions', value: '89,234', change: 8.3 },
          { label: 'Users', value: '15,420', change: 15.7 },
          { label: 'Efficiency', value: '94.2%', change: -1.8 }
        ]}
      />
    </BusinessChartContainer>
  );
}

// ===== MAIN SHOWCASE COMPONENT =====
export function ProfessionalChartsShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Chart Components
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          These components automatically apply our business styling to any chart library you use. 
          They provide professional appearance, loading states, error handling, and interactive controls.
        </p>
      </div>

      {/* Performance Metrics */}
      <div>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h3>
        <DemoPerformanceMetrics />
      </div>

      {/* Chart Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DemoLineChart />
        <DemoBarChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <DemoPieChart />
        <DemoComparisonChart />
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How to Use with Your Chart Library</h3>
        <div className="text-gray-800 space-y-2 text-sm">
          <p><strong>1. Wrap your chart:</strong> Use <code>BusinessChartContainer</code> around any chart component</p>
          <p><strong>2. Add legends:</strong> Use <code>BusinessChartLegend</code> for consistent legend styling</p>
          <p><strong>3. Add filters:</strong> Use <code>BusinessChartFilters</code> for interactive controls</p>
          <p><strong>4. Apply styles:</strong> Our CSS classes automatically style chart elements</p>
        </div>
      </div>
    </div>
  );
}

export default ProfessionalChartsShowcase;
