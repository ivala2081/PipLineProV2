import React, { useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  Target,
  Zap
} from 'lucide-react';

// ===== INTERACTIVE CHART DEMOS =====
// These demonstrate real functionality with animations and user interactions

// ===== ANIMATED LINE CHART DEMO =====
export function AnimatedLineChartDemo() {
  const [data, setData] = useState<Array<{ month: string; revenue: number; transactions: number }>>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationSpeed, setAnimationSpeed] = useState(1000);

  const generateData = useCallback(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const newData = months.map((month, index) => ({
      month,
      revenue: Math.floor(Math.random() * 50000) + 10000,
      transactions: Math.floor(Math.random() * 1000) + 100
    }));
    setData(newData);
  }, []);

  const animateData = useCallback(() => {
    if (!isAnimating) return;
    
    setData(prevData => 
      prevData.map(item => ({
        ...item,
        revenue: Math.floor(Math.random() * 50000) + 10000,
        transactions: Math.floor(Math.random() * 1000) + 100
      }))
    );
  }, [isAnimating]);

  useEffect(() => {
    generateData();
  }, [generateData]);

  useEffect(() => {
    if (isAnimating) {
      const interval = setInterval(animateData, animationSpeed);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isAnimating, animateData, animationSpeed]);

  const toggleAnimation = () => setIsAnimating(!isAnimating);
  const resetData = () => generateData();

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Live Revenue Dashboard</h3>
          <p className="business-chart-subtitle">Real-time revenue and transaction monitoring</p>
        </div>
        <div className="business-chart-actions space-x-2">
          <button
            onClick={toggleAnimation}
            className={`business-chart-filter-button ${isAnimating ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}
            title={isAnimating ? 'Pause animation' : 'Start animation'}
          >
            {isAnimating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={resetData}
            className="business-chart-filter-button"
            title="Reset data"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="business-chart-responsive h-80 bg-gradient-to-br from-gray-50 to-indigo-100 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
          {/* Revenue Chart */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h4 className="font-semibold text-gray-900">Revenue Trend</h4>
            </div>
            <div className="space-y-2">
              {data.slice(-6).map((item, index) => (
                <div key={item.month} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-gray-500 to-gray-600 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(item.revenue / 60000) * 100}%`,
                        transform: isAnimating ? 'scaleX(1.05)' : 'scaleX(1)'
                      }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    ₺{(item.revenue / 1000).toFixed(0)}K
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transactions Chart */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-600" />
              <h4 className="font-semibold text-gray-900">Transaction Volume</h4>
            </div>
            <div className="space-y-2">
              {data.slice(-6).map((item, index) => (
                <div key={item.month} className="flex items-center gap-3">
                  <div className="w-16 text-sm text-gray-600">{item.month}</div>
                  <div className="flex-1 bg-white rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-green-600 h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ 
                        width: `${(item.transactions / 1100) * 100}%`,
                        transform: isAnimating ? 'scaleX(1.05)' : 'scaleX(1)'
                      }}
                    />
                  </div>
                  <div className="w-20 text-right text-sm font-medium text-gray-900">
                    {item.transactions.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 space-y-4">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Animation Speed:</label>
          <input
            type="range"
            min="500"
            max="3000"
            step="100"
            value={animationSpeed}
            onChange={(e) => setAnimationSpeed(Number(e.target.value))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <span className="text-sm text-gray-600 w-16">{animationSpeed}ms</span>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Transactions</span>
          </div>
          {isAnimating && (
            <div className="flex items-center gap-2 text-green-600">
              <Zap className="w-4 h-4 animate-pulse" />
              <span>Live</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== INTERACTIVE METRICS DASHBOARD =====
export function InteractiveMetricsDashboard() {
  const [metrics, setMetrics] = useState({
    revenue: 2450000,
    users: 15420,
    transactions: 892340,
    successRate: 98.7
  });
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMetrics = useCallback(() => {
    setIsUpdating(true);
    setTimeout(() => {
      setMetrics({
        revenue: Math.floor(Math.random() * 1000000) + 2000000,
        users: Math.floor(Math.random() * 5000) + 12000,
        transactions: Math.floor(Math.random() * 200000) + 700000,
        successRate: Math.random() * 5 + 95
      });
      setIsUpdating(false);
    }, 1000);
  }, []);

  const getMetricIcon = (key: string) => {
    switch (key) {
      case 'revenue': return <DollarSign className="w-6 h-6" />;
      case 'users': return <Users className="w-6 h-6" />;
      case 'transactions': return <Activity className="w-6 h-6" />;
      case 'successRate': return <Target className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  const getMetricColor = (key: string) => {
    switch (key) {
      case 'revenue': return 'text-gray-600 bg-gray-100';
      case 'users': return 'text-green-600 bg-green-100';
      case 'transactions': return 'text-purple-600 bg-purple-100';
      case 'successRate': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatMetricValue = (key: string, value: number) => {
    switch (key) {
      case 'revenue': return `₺${(value / 1000000).toFixed(1)}M`;
      case 'users': return value.toLocaleString();
      case 'transactions': return value.toLocaleString();
      case 'successRate': return `${value.toFixed(1)}%`;
      default: return value.toString();
    }
  };

  return (
    <div className="business-chart-container-interactive">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Real-Time Metrics</h3>
          <p className="business-chart-subtitle">Click any metric to see detailed information</p>
        </div>
        <div className="business-chart-actions">
          <button
            onClick={updateMetrics}
            disabled={isUpdating}
            className="business-chart-filter-button disabled:opacity-50"
            title="Update metrics"
          >
            <RotateCcw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          <div
            key={key}
            onClick={() => setSelectedMetric(selectedMetric === key ? null : key)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all duration-300
              ${selectedMetric === key 
                ? 'border-gray-500 bg-gray-50 shadow-lg scale-105' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }
            `}
          >
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${getMetricColor(key)}`}>
              {getMetricIcon(key)}
            </div>
            <div className="text-2xl font-bold text-gray-900 mb-1">
              {formatMetricValue(key, value)}
            </div>
            <div className="text-sm text-gray-600 capitalize">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View */}
      {selectedMetric && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-900 capitalize">
              {selectedMetric.replace(/([A-Z])/g, ' $1').trim()} Details
            </h4>
            <button
              onClick={() => setSelectedMetric(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Current Value:</span>
              <span className="font-medium">{formatMetricValue(selectedMetric, metrics[selectedMetric as keyof typeof metrics])}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span className="font-medium">{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="text-green-600 font-medium">Active</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== ANIMATED PROGRESS CHART =====
export function AnimatedProgressChart() {
  const [progress, setProgress] = useState(0);
  const [target, setTarget] = useState(100);
  const [isAnimating, setIsAnimating] = useState(false);

  const startProgress = () => {
    setIsAnimating(true);
    setProgress(0);
    
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= target) {
          setIsAnimating(false);
          clearInterval(interval);
          return target;
        }
        return prev + 1;
      });
    }, 50);
  };

  const resetProgress = () => {
    setIsAnimating(false);
    setProgress(0);
  };

  const updateTarget = (newTarget: number) => {
    setTarget(newTarget);
    if (progress > newTarget) {
      setProgress(newTarget);
    }
  };

  const percentage = (progress / target) * 100;
  const isComplete = progress >= target;

  return (
    <div className="business-chart-container-elevated">
      <div className="business-chart-header">
        <div>
          <h3 className="business-chart-title">Progress Tracking</h3>
          <p className="business-chart-subtitle">Animated progress visualization with customizable targets</p>
        </div>
        <div className="business-chart-actions space-x-2">
          <button
            onClick={startProgress}
            disabled={isAnimating}
            className="business-chart-filter-button disabled:opacity-50"
            title="Start progress"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={resetProgress}
            className="business-chart-filter-button"
            title="Reset progress"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Progress Ring */}
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Background Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#E5E7EB"
                strokeWidth="8"
                fill="none"
              />
              {/* Progress Circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke="#3B82F6"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 40}`}
                strokeDashoffset={`${2 * Math.PI * 40 * (1 - percentage / 100)}`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-gray-900">{Math.round(percentage)}%</div>
              <div className="text-sm text-gray-600">{progress} / {target}</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(percentage)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-gray-500 to-gray-600 h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Value
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={target}
              onChange={(e) => updateTarget(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={startProgress}
              disabled={isAnimating}
              className={`
                w-full px-4 py-2 rounded-md font-medium transition-colors
                ${isAnimating 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-600 text-white hover:bg-gray-700'
                }
              `}
            >
              {isAnimating ? 'Running...' : 'Start Progress'}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {isComplete && (
            <div className="inline-flex items-center gap-2 text-green-600 font-medium">
              <Target className="w-5 h-5" />
              Target achieved!
            </div>
          )}
          {isAnimating && (
            <div className="inline-flex items-center gap-2 text-gray-600 font-medium">
              <Activity className="w-5 h-5 animate-pulse" />
              Progressing...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN INTERACTIVE DEMOS SHOWCASE =====
export function InteractiveChartDemosShowcase() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Interactive Chart Demonstrations
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto">
          Experience our business chart system in action with real interactive demos, 
          animations, and user interactions. These demonstrate the full potential of our system.
        </p>
      </div>

      {/* Interactive Demos */}
      <div className="space-y-8">
        <AnimatedLineChartDemo />
        <InteractiveMetricsDashboard />
        <AnimatedProgressChart />
      </div>

      {/* Features Highlight */}
      <div className="bg-gradient-to-r from-gray-50 to-indigo-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎯 Interactive Features Demonstrated
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-800 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Real-time data updates with animations</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Interactive controls and user input</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Smooth transitions and hover effects</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Responsive design for all screen sizes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Professional business appearance</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Accessible and user-friendly controls</span>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          💡 How to Use These Interactive Features
        </h3>
        <div className="text-gray-700 space-y-2 text-sm">
          <p><strong>1. Animated Charts:</strong> Click play/pause to control real-time data updates</p>
          <p><strong>2. Interactive Metrics:</strong> Click any metric card to see detailed information</p>
          <p><strong>3. Progress Tracking:</strong> Set custom targets and watch animated progress</p>
          <p><strong>4. Responsive Controls:</strong> All interactions work on desktop and mobile</p>
        </div>
      </div>
    </div>
  );
}

export default InteractiveChartDemosShowcase;
