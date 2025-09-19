/**
 * Frontend Performance Optimization Utilities
 * Provides request batching, debouncing, and performance monitoring
 */

import React, { useState, useEffect, useRef } from 'react';

interface RequestBatch {
  id: string;
  requests: Array<{
    url: string;
    options: RequestInit;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>;
  timeout: NodeJS.Timeout;
}

class PerformanceOptimizer {
  private requestBatches: Map<string, RequestBatch> = new Map();
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();
  private maxBatchSize = 10;
  private batchDelay = 100; // 100ms

  /**
   * Batch multiple API requests into a single request
   */
  async batchRequest<T>(
    id: string,
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      // Get or create batch
      let batch = this.requestBatches.get(id);
      
      if (!batch) {
        batch = {
          id,
          requests: [],
          timeout: setTimeout(() => this.executeBatch(id), this.batchDelay)
        };
        this.requestBatches.set(id, batch);
      }

      // Add request to batch
      batch.requests.push({ url, options, resolve, reject });

      // Execute immediately if batch is full
      if (batch.requests.length >= this.maxBatchSize) {
        clearTimeout(batch.timeout);
        this.executeBatch(id);
      }
    });
  }

  /**
   * Execute a batch of requests
   */
  private async executeBatch(batchId: string): Promise<void> {
    const batch = this.requestBatches.get(batchId);
    if (!batch || batch.requests.length === 0) return;

    // Clear the batch
    this.requestBatches.delete(batchId);
    clearTimeout(batch.timeout);

    try {
      // Execute all requests in parallel
      const promises = batch.requests.map(async ({ url, options, resolve, reject }) => {
        try {
          const startTime = performance.now();
          const response = await fetch(url, options);
          const endTime = performance.now();
          
          // Track performance
          this.trackPerformance(url, endTime - startTime);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const data = await response.json();
          resolve(data);
        } catch (error) {
          reject(error);
        }
      });

      await Promise.allSettled(promises);
    } catch (error) {
      console.error('Batch execution error:', error);
    }
  }

  /**
   * Debounce function calls
   */
  debounce<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = 300
  ): T {
    return ((...args: Parameters<T>) => {
      const existingTimer = this.debounceTimers.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        this.debounceTimers.delete(key);
      }, delay);

      this.debounceTimers.set(key, timer);
    }) as T;
  }

  /**
   * Throttle function calls
   */
  throttle<T extends (...args: any[]) => any>(
    key: string,
    func: T,
    delay: number = 1000
  ): T {
    let lastExecuted = 0;
    
    return ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastExecuted >= delay) {
        func(...args);
        lastExecuted = now;
      }
    }) as T;
  }

  /**
   * Track performance metrics
   */
  private trackPerformance(url: string, duration: number): void {
    if (!this.performanceMetrics.has(url)) {
      this.performanceMetrics.set(url, []);
    }
    
    const metrics = this.performanceMetrics.get(url)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): Record<string, {
    avgTime: number;
    maxTime: number;
    minTime: number;
    count: number;
  }> {
    const stats: Record<string, any> = {};
    
    for (const [url, metrics] of this.performanceMetrics) {
      if (metrics.length === 0) continue;
      
      const avgTime = metrics.reduce((sum, time) => sum + time, 0) / metrics.length;
      const maxTime = Math.max(...metrics);
      const minTime = Math.min(...metrics);
      
      stats[url] = {
        avgTime: Math.round(avgTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100,
        minTime: Math.round(minTime * 100) / 100,
        count: metrics.length
      };
    }
    
    return stats;
  }

  /**
   * Optimize component rendering
   */
  optimizeRender<T extends React.ComponentType<any>>(
    Component: T,
    options: {
      memo?: boolean;
      lazy?: boolean;
      preload?: boolean;
    } = {}
  ): T {
    let OptimizedComponent = Component;

    // Add React.memo for shallow comparison
    if (options.memo && React.memo) {
      OptimizedComponent = React.memo(Component) as unknown as T;
    }

    // Add lazy loading
    if (options.lazy && React.lazy) {
      OptimizedComponent = React.lazy(() => Promise.resolve({ default: Component })) as unknown as T;
    }

    return OptimizedComponent;
  }

  /**
   * Preload critical resources
   */
  preloadResource(url: string, type: 'script' | 'style' | 'image' = 'script'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = type;
    
    if (type === 'script') {
      link.as = 'script';
    } else if (type === 'style') {
      link.as = 'style';
    } else if (type === 'image') {
      link.as = 'image';
    }
    
    document.head.appendChild(link);
  }

  /**
   * Optimize images with lazy loading
   */
  setupLazyImages(selector: string = 'img[data-src]'): void {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src || '';
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });

      document.querySelectorAll(selector).forEach((img) => {
        imageObserver.observe(img);
      });
    }
  }

  /**
   * Clear all timers and cleanup
   */
  cleanup(): void {
    // Clear all batch timers
    for (const batch of this.requestBatches.values()) {
      clearTimeout(batch.timeout);
    }
    this.requestBatches.clear();

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();

    // Clear performance metrics
    this.performanceMetrics.clear();
  }
}

// Global performance optimizer instance
export const performanceOptimizer = new PerformanceOptimizer();

// Utility functions
export const debounce = performanceOptimizer.debounce.bind(performanceOptimizer);
export const throttle = performanceOptimizer.throttle.bind(performanceOptimizer);
export const batchRequest = performanceOptimizer.batchRequest.bind(performanceOptimizer);

// React hooks for performance optimization
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottle = <T>(value: T, delay: number): T => {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastExecuted = React.useRef<number>(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    
    if (now - lastExecuted.current >= delay) {
      setThrottledValue(value);
      lastExecuted.current = now;
      return;
    } else {
      const timer = setTimeout(() => {
        setThrottledValue(value);
        lastExecuted.current = Date.now();
      }, delay - (now - lastExecuted.current));

      return () => clearTimeout(timer);
    }
  }, [value, delay]);

  return throttledValue;
};

// Export the main class
export default PerformanceOptimizer;
