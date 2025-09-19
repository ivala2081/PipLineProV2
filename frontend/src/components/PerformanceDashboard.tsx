/**
 * Performance Monitoring Dashboard
 * Real-time performance metrics and optimization insights
 */

import React, { useState, useEffect } from 'react';
import { performanceOptimizer } from '../utils/performanceOptimizer';

interface PerformanceMetrics {
  apiRequests: {
    total: number;
    avgResponseTime: number;
    slowRequests: number;
    cacheHitRate: number;
  };
  bundleSize: {
    total: number;
    chunks: number;
    largestChunk: number;
  };
  memoryUsage: {
    used: number;
    total: number;
    peak: number;
  };
  renderPerformance: {
    avgRenderTime: number;
    slowRenders: number;
    reRenders: number;
  };
}

const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    apiRequests: {
      total: 0,
      avgResponseTime: 0,
      slowRequests: 0,
      cacheHitRate: 0
    },
    bundleSize: {
      total: 0,
      chunks: 0,
      largestChunk: 0
    },
    memoryUsage: {
      used: 0,
      total: 0,
      peak: 0
    },
    renderPerformance: {
      avgRenderTime: 0,
      slowRenders: 0,
      reRenders: 0
    }
  });

  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      // Get API performance stats
      const apiStats = performanceOptimizer.getPerformanceStats();
      
      // Calculate bundle size (mock data - in real app, get from build stats)
      const bundleSize = {
        total: 1024 * 1024, // 1MB
        chunks: 8,
        largestChunk: 256 * 1024 // 256KB
      };

      // Get memory usage (if available)
      const memoryUsage = (performance as any).memory ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        peak: (performance as any).memory.jsHeapSizeLimit
      } : {
        used: 0,
        total: 0,
        peak: 0
      };

      setMetrics({
        apiRequests: {
          total: (apiStats.total_requests as any)?.count || 0,
          avgResponseTime: (apiStats.avg_query_time as any)?.avgTime || 0,
          slowRequests: (apiStats.slow_queries as any)?.count || 0,
          cacheHitRate: (apiStats.cache_hit_rate as any)?.percentage || 0
        },
        bundleSize,
        memoryUsage,
        renderPerformance: {
          avgRenderTime: 0, // Would be tracked by React DevTools
          slowRenders: 0,
          reRenders: 0
        }
      });
    };

    // Update metrics every 5 seconds
    const interval = setInterval(updateMetrics, 5000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-2 rounded-full shadow-lg hover:bg-blue-700 transition-colors z-50"
        title="Show Performance Dashboard"
      >
        📊
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-80 max-h-96 overflow-y-auto z-50">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">Performance Dashboard</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* API Performance */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">API Performance</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Total Requests</div>
            <div className="font-semibold">{metrics.apiRequests.total}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Avg Response</div>
            <div className="font-semibold">{metrics.apiRequests.avgResponseTime.toFixed(1)}ms</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Slow Requests</div>
            <div className="font-semibold text-red-600">{metrics.apiRequests.slowRequests}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Cache Hit Rate</div>
            <div className="font-semibold text-green-600">
              {metrics.apiRequests.cacheHitRate > 80 ? 'Excellent' : metrics.apiRequests.cacheHitRate > 60 ? 'Good' : 'Poor'}
            </div>
          </div>
        </div>
      </div>

      {/* Bundle Size */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Bundle Size</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Total Size</div>
            <div className="font-semibold">{(metrics.bundleSize.total / 1024 / 1024).toFixed(1)}MB</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Chunks</div>
            <div className="font-semibold">{metrics.bundleSize.chunks}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Largest Chunk</div>
            <div className="font-semibold">{(metrics.bundleSize.largestChunk / 1024).toFixed(0)}KB</div>
          </div>
        </div>
      </div>

      {/* Memory Usage */}
      {metrics.memoryUsage.used > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Memory Usage</h4>
          <div className="bg-gray-50 p-2 rounded text-xs">
            <div className="flex justify-between mb-1">
              <span>Used: {(metrics.memoryUsage.used / 1024 / 1024).toFixed(1)}MB</span>
              <span>Peak: {(metrics.memoryUsage.peak / 1024 / 1024).toFixed(1)}MB</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{
                  width: `${Math.min(100, (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100)}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="text-xs text-gray-600">
        <h4 className="font-medium mb-1">Optimization Tips:</h4>
        <ul className="space-y-1">
          {metrics.apiRequests.cacheHitRate < 80 && (
            <li>• Consider increasing cache duration</li>
          )}
          {metrics.apiRequests.slowRequests > 5 && (
            <li>• Some API requests are slow - check network</li>
          )}
          {metrics.bundleSize.total > 2 * 1024 * 1024 && (
            <li>• Bundle size is large - consider code splitting</li>
          )}
          {metrics.memoryUsage.used > 100 * 1024 * 1024 && (
            <li>• High memory usage - check for memory leaks</li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default PerformanceDashboard;
