import React from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Calendar } from 'lucide-react';

interface RevenueChartProps {
  data?: any[];
  type?: 'line' | 'area' | 'bar' | 'pie';
  height?: number;
}

const mockData = [
  { month: 'Jan', revenue: 400000, transactions: 120, clients: 45 },
  { month: 'Feb', revenue: 300000, transactions: 98, clients: 42 },
  { month: 'Mar', revenue: 500000, transactions: 156, clients: 48 },
  { month: 'Apr', revenue: 450000, transactions: 134, clients: 46 },
  { month: 'May', revenue: 600000, transactions: 178, clients: 52 },
  { month: 'Jun', revenue: 550000, transactions: 165, clients: 50 },
  { month: 'Jul', revenue: 700000, transactions: 201, clients: 58 },
  { month: 'Aug', revenue: 650000, transactions: 189, clients: 55 },
  { month: 'Sep', revenue: 800000, transactions: 234, clients: 62 },
  { month: 'Oct', revenue: 750000, transactions: 221, clients: 60 },
  { month: 'Nov', revenue: 900000, transactions: 267, clients: 68 },
  { month: 'Dec', revenue: 850000, transactions: 245, clients: 65 }
];

const pieData = [
  { name: 'Stripe', value: 45, color: '#3b82f6' },
  { name: 'PayPal', value: 30, color: '#059669' },
  { name: 'Square', value: 15, color: '#d97706' },
  { name: 'Other', value: 10, color: '#64748b' }
];

export const RevenueChart: React.FC<RevenueChartProps> = ({ 
  data = mockData, 
  type = 'area',
  height = 300 
}) => {
  // Transform API data to chart format
  const chartData = data && data.length > 0 ? data.map(item => {
    // Handle different date formats from API
    let date = null;
    let formattedDate = 'Unknown';
    
    // Try different date field names and formats
    if (item.date) {
      date = new Date(item.date);
    } else if (item.created_at) {
      date = new Date(item.created_at);
    } else if (item.transaction_date) {
      date = new Date(item.transaction_date);
    }
    
    if (date && !isNaN(date.getTime())) {
      // Format based on data density - if we have many data points, show shorter format
      if (data.length > 30) {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (data.length > 7) {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else {
        formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } else if (item.month) {
      // Fallback to month field if available
      formattedDate = item.month;
    }
    
    return {
      month: formattedDate,
      revenue: item.amount || item.revenue || item.total_amount || 0,
      amount: item.amount || item.revenue || item.total_amount || 0,
      deposits: item.deposits || 0,
      withdrawals: item.withdrawals || 0,
      transactions: item.transactions || item.transaction_count || 0,
      transaction_count: item.transaction_count || item.transactions || 0,
      clients: item.clients || 0,
      date: date // Keep original date for sorting
    };
  }).sort((a, b) => {
    // Sort by date if available
    if (a.date && b.date) {
      return a.date.getTime() - b.date.getTime();
    }
    return 0;
  }) : mockData;

  // Debug logging
  console.log('RevenueChart - Raw data length:', data?.length || 0);
  console.log('RevenueChart - Sample raw data:', data?.slice(0, 5));
  console.log('RevenueChart - Chart data length:', chartData.length);
  console.log('RevenueChart - Sample chart data:', chartData.slice(0, 5));
  console.log('RevenueChart - Date range:', {
    first: chartData[0]?.month,
    last: chartData[chartData.length - 1]?.month,
    firstDate: (chartData[0] as any)?.date,
    lastDate: (chartData[chartData.length - 1] as any)?.date
  });


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const amount = data.amount || data.revenue || 0;
      const isZero = amount === 0;
      
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-[200px]">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isZero ? 'bg-gray-400' : 'bg-blue-500'}`}></div>
              <span className="font-semibold text-gray-900">{label}</span>
              {isZero && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">No Activity</span>}
            </div>
            
            <div className="border-t border-gray-100 pt-2 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Net Revenue:</span>
                <span className={`font-semibold ${isZero ? 'text-gray-500' : amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {isZero ? '₺0' : formatCurrency(amount)}
                </span>
              </div>
              
              {data.deposits !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Deposits:</span>
                  <span className={`text-sm font-medium ${isZero ? 'text-gray-500' : 'text-green-600'}`}>
                    +{formatCurrency(data.deposits)}
                  </span>
                </div>
              )}
              
              {data.withdrawals !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Withdrawals:</span>
                  <span className={`text-sm font-medium ${isZero ? 'text-gray-500' : 'text-red-600'}`}>
                    -{formatCurrency(data.withdrawals)}
                  </span>
                </div>
              )}
              
              {data.transaction_count !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transactions:</span>
                  <span className={`text-sm font-medium ${isZero ? 'text-gray-500' : 'text-gray-700'}`}>
                    {data.transaction_count}
                  </span>
                </div>
              )}
              
              {data.clients !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Clients:</span>
                  <span className={`text-sm font-medium ${isZero ? 'text-gray-500' : 'text-gray-700'}`}>
                    {data.clients}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (type === 'pie') {
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={5}
            dataKey="value"
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value}%`} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  // Show message if no data
  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex items-center justify-center" style={{ height: `${height}px` }}>
        <div className="text-center">
          <p className="text-sm text-gray-500">No revenue data available</p>
          <p className="text-xs mt-1">Data will appear when transactions are available</p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === 'line' ? (
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            stroke="#64748b"
            fontSize={12}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickFormatter={formatCurrency}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
          />
        </LineChart>
      ) : type === 'bar' ? (
        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <defs>
          <linearGradient id="revenueBarGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
            <stop offset="25%" stopColor="#60A5FA" stopOpacity={0.95} />
            <stop offset="50%" stopColor="#93C5FD" stopOpacity={0.9} />
            <stop offset="75%" stopColor="#BFDBFE" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#E0F2FE" stopOpacity={0.8} />
          </linearGradient>
            <linearGradient id="depositsBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
              <stop offset="25%" stopColor="#34D399" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#6EE7B7" stopOpacity={0.9} />
              <stop offset="75%" stopColor="#A7F3D0" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#D1FAE5" stopOpacity={0.8} />
            </linearGradient>
            <linearGradient id="withdrawalsBarGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#EF4444" stopOpacity={1} />
              <stop offset="25%" stopColor="#F87171" stopOpacity={0.95} />
              <stop offset="50%" stopColor="#FCA5A5" stopOpacity={0.9} />
              <stop offset="75%" stopColor="#FECACA" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#FEE2E2" stopOpacity={0.8} />
            </linearGradient>
            <filter id="barShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.15"/>
            </filter>
            <filter id="barGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
        <CartesianGrid 
          strokeDasharray="1 3" 
          stroke="#f1f5f9" 
          strokeWidth={1}
          vertical={false}
          opacity={0.8}
        />
          <XAxis 
            dataKey="month" 
            stroke="#475569"
            fontSize={12}
            fontWeight={600}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            tick={{ fill: '#475569' }}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#475569"
            fontSize={12}
            fontWeight={600}
            tickFormatter={formatCurrency}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
            tick={{ fill: '#475569' }}
            width={80}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                // Parse the date properly - it might be in YYYY-MM-DD format
                const dateStr = data.month;
                const date = new Date(dateStr + 'T00:00:00'); // Add time to avoid timezone issues
                
                return (
                  <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-4 min-w-[200px] backdrop-blur-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="font-semibold text-gray-900">
                          {date.toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </span>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-2 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Net Cash:</span>
                          <span className="font-semibold text-blue-600">
                            {formatCurrency(data.amount || 0)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Transactions:</span>
                          <span className="text-sm font-medium text-gray-700">
                            {data.transaction_count || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            }}
            cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
          />
          <Bar 
            dataKey="amount" 
            fill="url(#revenueBarGradient)"
            radius={[6, 6, 0, 0]}
            stroke="none"
            filter="url(#barShadow)"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(59, 130, 246, 0.15))',
            }}
          />
        </BarChart>
      ) : (
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRevenueZero" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis 
            dataKey="month" 
            stroke="#64748b"
            fontSize={12}
            interval="preserveStartEnd"
            tick={{ fontSize: 11 }}
          />
          <YAxis 
            stroke="#64748b"
            fontSize={12}
            tickFormatter={formatCurrency}
            domain={['dataMin - 100000', 'dataMax + 100000']}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#3b82f6"
            strokeWidth={2}
            fill="url(#colorRevenue)"
            dot={false}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
};

export default RevenueChart;
