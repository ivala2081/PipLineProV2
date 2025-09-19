import React, { useState, useRef, useEffect } from 'react';
import { clsx } from 'clsx';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, Download, Smartphone, Monitor } from 'lucide-react';

interface ChartData {
  [key: string]: any;
}

interface ChartConfig {
  type: 'line' | 'bar' | 'pie';
  dataKey: string;
  stroke?: string;
  fill?: string;
  color?: string;
}

interface MobileOptimizedChartProps {
  data: ChartData[];
  config: ChartConfig[];
  title?: string;
  subtitle?: string;
  height?: number;
  className?: string;
  showControls?: boolean;
  showLegend?: boolean;
  onDataPointClick?: (data: any) => void;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export const MobileOptimizedChart: React.FC<MobileOptimizedChartProps> = ({
  data,
  config,
  title,
  subtitle,
  height = 300,
  className = '',
  showControls = true,
  showLegend = true,
  onDataPointClick,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeDataPoint, setActiveDataPoint] = useState<any>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const handleZoom = () => {
    setIsZoomed(!isZoomed);
  };

  const handleReset = () => {
    setIsZoomed(false);
    setActiveDataPoint(null);
  };

  const handleDownload = () => {
    // Implement chart download functionality
    console.log('Downloading chart...');
  };

  const handleDataPointClick = (data: any) => {
    setActiveDataPoint(data);
    onDataPointClick?.(data);
  };

  const renderChart = () => {
    const chartHeight = isZoomed ? height * 1.5 : height;
    const isMobileView = isMobile || isZoomed;

    switch (config[0]?.type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <LineChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleDataPointClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280"
                fontSize={isMobileView ? 10 : 12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={isMobileView ? 10 : 12}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#374151' }}
              />
              {config.map((item, index) => (
                <Line
                  key={item.dataKey}
                  type="monotone"
                  dataKey={item.dataKey}
                  stroke={item.stroke || COLORS[index % COLORS.length]}
                  strokeWidth={isMobileView ? 3 : 2}
                  dot={{ 
                    r: isMobileView ? 4 : 3,
                    strokeWidth: 2,
                    fill: 'white',
                    stroke: item.stroke || COLORS[index % COLORS.length]
                  }}
                  activeDot={{ 
                    r: isMobileView ? 6 : 5,
                    strokeWidth: 3,
                    fill: item.stroke || COLORS[index % COLORS.length]
                  }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart
              data={data}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              onClick={handleDataPointClick}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="name" 
                stroke="#6B7280"
                fontSize={isMobileView ? 10 : 12}
                tick={{ fill: '#6B7280' }}
              />
              <YAxis 
                stroke="#6B7280"
                fontSize={isMobileView ? 10 : 12}
                tick={{ fill: '#6B7280' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
                labelStyle={{ fontWeight: 'bold', color: '#374151' }}
              />
              {config.map((item, index) => (
                <Bar
                  key={item.dataKey}
                  dataKey={item.dataKey}
                  fill={item.fill || COLORS[index % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                  onClick={handleDataPointClick}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pie':
        return (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart onClick={handleDataPointClick}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={isMobileView ? 80 : 100}
                fill="#8884d8"
                dataKey={config[0]?.dataKey || 'value'}
                onClick={handleDataPointClick}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #E5E7EB',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div>Unsupported chart type</div>;
    }
  };

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden', className)}>
      {/* Chart Header */}
      {(title || showControls) && (
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {title && (
                <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
            
            {showControls && (
              <div className="flex items-center space-x-2">
                {/* Device Indicator */}
                <div className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-lg">
                  {isMobile ? (
                    <Smartphone className="h-4 w-4 text-gray-600" />
                  ) : (
                    <Monitor className="h-4 w-4 text-gray-600" />
                  )}
                  <span className="text-xs text-gray-600">
                    {isMobile ? 'Mobile' : 'Desktop'}
                  </span>
                </div>

                {/* Zoom Control */}
                <button
                  onClick={handleZoom}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  title={isZoomed ? 'Zoom Out' : 'Zoom In'}
                >
                  {isZoomed ? (
                    <ZoomOut className="h-4 w-4" />
                  ) : (
                    <ZoomIn className="h-4 w-4" />
                  )}
                </button>

                {/* Reset Control */}
                <button
                  onClick={handleReset}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  title="Reset View"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>

                {/* Download Control */}
                <button
                  onClick={handleDownload}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-all duration-200"
                  title="Download Chart"
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="p-4" ref={chartRef}>
        {renderChart()}
      </div>

      {/* Legend */}
      {showLegend && config.length > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-center gap-4">
            {config.map((item, index) => (
              <div key={item.dataKey} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.stroke || item.fill || COLORS[index % COLORS.length] }}
                />
                <span className="text-sm text-gray-600">{item.dataKey}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Data Point Info */}
      {activeDataPoint && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
          <div className="text-sm">
            <span className="font-medium text-gray-900">Selected: </span>
            <span className="text-gray-700">
              {activeDataPoint.name}: {activeDataPoint[config[0]?.dataKey]}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileOptimizedChart;
