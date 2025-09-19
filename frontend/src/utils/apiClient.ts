/**
 * Centralized API Client with automatic CSRF token handling
 * This ensures all API calls work consistently
 */

import { apiConfig, loggingConfig } from '../config/environment';
import { measureAsync } from './performance';
import { handleApiError, PipLineError } from './errorHandler';
import { performanceOptimizer, debounce, throttle } from './performanceOptimizer';
import { requestBatcher } from './requestBatcher';

class ApiClient {
  private csrfToken: string | null = null;
  private isGettingToken = false;
  private tokenPromise: Promise<string | null> | null = null;
  
  // Add caching and rate limiting
  private lastAuthCheck = 0;
  private lastTokenFetch = 0;
  private authCheckCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_DURATION = 30000; // 30 seconds
  private readonly RATE_LIMIT_DELAY = 2000; // 2 seconds between auth checks
  private readonly MAX_CACHE_SIZE = 100; // Maximum number of cached items

  // Request deduplication and batching
  private pendingRequests = new Map<string, Promise<any>>();
  private requestQueue: Array<{ id: string; request: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private isProcessingQueue = false;
  private readonly BATCH_DELAY = 50; // 50ms to batch requests
  
  // Request throttling
  private requestTimestamps = new Map<string, number[]>();
  private readonly MAX_REQUESTS_PER_SECOND = 10; // Maximum requests per second per endpoint

  /**
   * Get CSRF token with caching and deduplication
   */
  private async getCsrfToken(): Promise<string | null> {
    const now = Date.now();
    
    // Rate limiting: don't fetch token too frequently
    if (now - this.lastTokenFetch < this.RATE_LIMIT_DELAY) {
      return this.csrfToken;
    }

    // If we already have a token, return it
    if (this.csrfToken) {
      return this.csrfToken;
    }

    // If we're already getting a token, wait for that promise
    if (this.isGettingToken && this.tokenPromise) {
      return this.tokenPromise;
    }

    // Start getting a new token
    this.isGettingToken = true;
    this.lastTokenFetch = now;
    this.tokenPromise = this.fetchCsrfToken();

    try {
      this.csrfToken = await this.tokenPromise;
      return this.csrfToken;
    } finally {
      this.isGettingToken = false;
      this.tokenPromise = null;
    }
  }

  /**
   * Check if user is authenticated before making requests
   */
  private async ensureAuthenticated(): Promise<boolean> {
    try {
      const response = await fetch('/api/v1/auth/check', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.authenticated === true;
      }
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      return false;
    }
  }

  /**
   * Fetch CSRF token from server with enhanced session handling
   */
  private async fetchCsrfToken(): Promise<string | null> {
    try {
      // First check if user is authenticated
      const isAuthenticated = await this.ensureAuthenticated();
      if (!isAuthenticated) {
        return null;
      }

      // Get the CSRF token with enhanced handling
      const response = await fetch('/api/v1/auth/csrf-token', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const token = data.csrf_token;

        // Enhanced validation - check if token exists and has reasonable length
        if (token && token.length > 20) {
          return token;
        } else {
          return null;
        }
      } else {
        return null;
      }
    } catch (error) {
      console.error('CSRF token fetch failed:', error);
      return null;
    }
  }

  /**
   * Create a unique request key for deduplication
   */
  private createRequestKey(method: string, url: string, data?: any): string {
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${dataStr}`;
  }

  /**
   * Check if request should be throttled
   */
  private shouldThrottleRequest(url: string): boolean {
    const now = Date.now();
    const endpoint = url.split('?')[0]; // Remove query parameters for throttling
    
    if (!this.requestTimestamps.has(endpoint)) {
      this.requestTimestamps.set(endpoint, []);
    }
    
    const timestamps = this.requestTimestamps.get(endpoint)!;
    
    // Remove timestamps older than 1 second
    const oneSecondAgo = now - 1000;
    const recentTimestamps = timestamps.filter(timestamp => timestamp > oneSecondAgo);
    
    // Update the timestamps array
    this.requestTimestamps.set(endpoint, recentTimestamps);
    
    // Check if we've exceeded the rate limit
    if (recentTimestamps.length >= this.MAX_REQUESTS_PER_SECOND) {
      return true;
    }
    
    // Add current timestamp
    recentTimestamps.push(now);
    return false;
  }

  /**
   * Process the request queue to batch related requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    try {
      // Group requests by type for batching
      const analyticsRequests = this.requestQueue.filter(req => 
        req.id.includes('analytics') || req.id.includes('dashboard')
      );
      const otherRequests = this.requestQueue.filter(req => 
        !req.id.includes('analytics') && !req.id.includes('dashboard')
      );

      // Process analytics requests in parallel (they can be batched)
      if (analyticsRequests.length > 0) {
        const promises = analyticsRequests.map(req => req.request());
        
        try {
          const results = await Promise.all(promises);
          analyticsRequests.forEach((req, index) => {
            req.resolve(results[index]);
          });
        } catch (error) {
          analyticsRequests.forEach(req => {
            req.reject(error);
          });
        }
      }

      // Process other requests individually
      for (const req of otherRequests) {
        try {
          const result = await req.request();
          req.resolve(result);
        } catch (error) {
          req.reject(error);
        }
      }

    } finally {
      this.requestQueue = [];
      this.isProcessingQueue = false;
    }
  }

  /**
   * Add request to queue with batching
   */
  private async queueRequest<T>(
    id: string, 
    request: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.requestQueue.push({ id, request, resolve, reject });
      
      // Process queue after a short delay to allow batching
      setTimeout(() => {
        this.processQueue();
      }, this.BATCH_DELAY);
    });
  }

  /**
   * Make an optimized request with advanced performance features
   */
  async makeOptimizedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    batchId?: string
  ): Promise<T> {
    const url = `${apiConfig.baseURL}${endpoint}`;
    
    // Use batching if batchId is provided
    if (batchId) {
      return performanceOptimizer.batchRequest<T>(batchId, url, options);
    }
    
    // Otherwise use regular request with performance tracking
    return this.makeRequest<T>('GET', endpoint, undefined, options);
  }

  /**
   * Make a batched request to reduce API calls
   */
  async makeBatchedRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    batchKey?: string
  ): Promise<T> {
    const url = `${apiConfig.baseURL}${endpoint}`;
    
    // Add authentication headers
    const token = await this.getCsrfToken();
    const headers = {
      ...options.headers,
      ...(token && { 'X-CSRFToken': token }),
      'Content-Type': 'application/json',
    };

    const batchedOptions = {
      ...options,
      headers,
    };

    return requestBatcher.batchRequest<T>(url, batchedOptions, batchKey);
  }

  /**
   * Make a request with deduplication and batching
   */
  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    const requestKey = this.createRequestKey(method, url, data);
    
    // Check if we have a pending request for this key
    if (this.pendingRequests.has(requestKey)) {
      const originalResponse = await this.pendingRequests.get(requestKey)!;
      
      // Clone the response for each consumer to avoid "body stream already read" error
      if (originalResponse instanceof Response && typeof originalResponse.clone === 'function') {
        const clonedResponse = originalResponse.clone();
        // Ensure the cloned response has the same properties as the original
        if (clonedResponse && typeof clonedResponse.text === 'function') {
          return clonedResponse as T;
        }
      }
      
      // If we can't clone, return the original response if it's a proper Response object
      if (originalResponse instanceof Response) {
        return originalResponse as T;
      }
      
      // If it's not a Response object, something went wrong
      throw new Error('Invalid response object returned from pending request');
    }

    // Check throttling for GET requests
    if (method === 'GET' && this.shouldThrottleRequest(url)) {
      // Return cached data if available, otherwise wait
      const cacheKey = data ? `${url}?${new URLSearchParams(data).toString()}` : url;
      if (this.authCheckCache.has(cacheKey)) {
        const cached = this.authCheckCache.get(cacheKey)!;
        const now = Date.now();
        
        if (now - cached.timestamp < this.CACHE_DURATION) {
          // Create a mock Response object for cached data
          const mockResponse = new Response(JSON.stringify(cached.data), {
            status: 200,
            statusText: 'OK',
            headers: {
              'Content-Type': 'application/json'
            }
          });
          return mockResponse as T;
        }
      }
      
      // Wait a bit before making the request
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Create the request promise
    const requestPromise = this.executeRequest<T>(method, url, data, options);
    
    // Store it for deduplication
    this.pendingRequests.set(requestKey, requestPromise);
    
    // Clean up when done
    requestPromise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });

    return requestPromise;
  }

  /**
   * Execute the actual request
   */
  private async executeRequest<T>(
    method: string,
    url: string,
    data?: any,
    options?: RequestInit
  ): Promise<T> {
    try {
      // For non-auth endpoints, check authentication first
      if (!url.includes('/auth/')) {
        const isAuthenticated = await this.ensureAuthenticated();
        if (!isAuthenticated) {
          // Return a 401 response to match expected behavior
          const errorResponse = new Response(
            JSON.stringify({ error: 'Authentication required', message: 'Please log in to access this endpoint' }),
            { status: 401, statusText: 'Unauthorized' }
          );
          return errorResponse as T;
        }
      }

      const token = await this.getCsrfToken();
      
      const requestOptions: RequestInit = {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(token && { 'X-CSRFToken': token }),
          ...options?.headers,
        },
        ...options,
      };

      if (data && method !== 'GET') {
        requestOptions.body = JSON.stringify(data);
      }

      // Add query parameters for GET requests
      if (method === 'GET' && data) {
        const params = new URLSearchParams();
        Object.entries(data).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, String(value));
          }
        });
        const queryString = params.toString();
        if (queryString) {
          url += (url.includes('?') ? '&' : '?') + queryString;
        }
      }

      const response = await fetch(url, requestOptions);
      return response as T;
    } catch (error) {
      throw handleApiError(error, `API ${method} ${url}`);
    }
  }

  /**
   * GET request with deduplication and caching
   */
  async get<T = Response>(url: string, params?: Record<string, any>, useCache: boolean = true): Promise<T> {
    // Create cache key including params
    const cacheKey = params ? `${url}?${new URLSearchParams(params).toString()}` : url;
    
    // Check cache first for GET requests
    if (useCache && this.authCheckCache.has(cacheKey)) {
      const cached = this.authCheckCache.get(cacheKey)!;
      const now = Date.now();
      
      // Return cached data if it's still valid
      if (now - cached.timestamp < this.CACHE_DURATION) {
        // Create a mock Response object for cached data
        const mockResponse = new Response(JSON.stringify(cached.data), {
          status: 200,
          statusText: 'OK',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Ensure the mock response has all necessary methods
        if (typeof mockResponse.clone !== 'function') {
          mockResponse.clone = function() {
            return new Response(JSON.stringify(cached.data), {
              status: 200,
              statusText: 'OK',
              headers: {
                'Content-Type': 'application/json'
              }
            });
          };
        }
        
        return mockResponse as T;
      } else {
        // Remove expired cache entry
        this.authCheckCache.delete(cacheKey);
      }
    }
    
    const response = await this.makeRequest<T>('GET', url, params);
    
    // Cache successful GET responses
    if (useCache && response instanceof Response && response.ok) {
      try {
        // Clone the response for caching without consuming the original
        const responseToCache = response.clone();
        const data = await responseToCache.json();
        
        // Implement cache size limit
        if (this.authCheckCache.size >= this.MAX_CACHE_SIZE) {
          // Remove oldest entries
          const oldestKey = this.authCheckCache.keys().next().value;
          if (oldestKey) {
            this.authCheckCache.delete(oldestKey);
          }
        }
        
        // Store the parsed data instead of the response object
        this.authCheckCache.set(cacheKey, {
          data: data,
          timestamp: Date.now()
        });
      } catch {
        // If parsing fails, don't cache
      }
    }
    
    return response;
  }

  /**
   * POST request with deduplication
   */
  async post<T = Response>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>('POST', url, data);
  }

  /**
   * PUT request with deduplication
   */
  async put<T = Response>(url: string, data?: any): Promise<T> {
    return this.makeRequest<T>('PUT', url, data);
  }

  /**
   * DELETE request with deduplication
   */
  async delete<T = Response>(url: string): Promise<T> {
    return this.makeRequest<T>('DELETE', url);
  }

  /**
   * Batch multiple requests together for better performance
   */
  async batchRequests<T>(requests: Array<{ method: string; url: string; data?: any }>): Promise<T[]> {
    const promises = requests.map(req => 
      this.makeRequest<T>(req.method, req.url, req.data)
    );
    
    return Promise.all(promises);
  }

  /**
   * Parse response with better error handling and automatic cloning
   */
  async parseResponse<T = any>(response: Response): Promise<T> {
    // Ensure we have a valid Response object
    if (!response || typeof response.clone !== 'function') {
      throw new Error('Invalid response object provided to parseResponse');
    }
    
    // Clone the response to avoid "body stream already read" errors
    const clonedResponse = response.clone();
    
    // Validate that the cloned response has the required methods
    if (!clonedResponse || typeof clonedResponse.text !== 'function') {
      throw new Error('Cloned response is not a valid Response object');
    }
    
    if (!clonedResponse.ok) {
      const errorText = await clonedResponse.text();
      let errorData;
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || 'Unknown error occurred' };
      }
      
      throw new Error(errorData.message || `HTTP ${clonedResponse.status}: ${clonedResponse.statusText}`);
    }

    try {
      const contentType = clonedResponse.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await clonedResponse.json();
      } else {
        return await clonedResponse.text() as T;
      }
    } catch (error) {
      throw handleApiError(error, 'Response parsing');
    }
  }

  /**
   * Clear CSRF token and reset authentication state
   */
  clearToken(): void {
    this.csrfToken = null;
    this.lastTokenFetch = 0;
    this.isGettingToken = false;
    this.tokenPromise = null;
  }

  /**
   * Refresh the current session and get a new CSRF token
   */
  async refreshSession(): Promise<boolean> {
    try {
      // Clear current token
      this.clearToken();
      
      // Attempt to get a new token
      const newToken = await this.getCsrfToken();
      
      if (newToken) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return false;
    }
  }

  /**
   * Clear all caches and pending requests
   */
  clearCache(): void {
    this.authCheckCache.clear();
    this.pendingRequests.clear();
    this.requestQueue = [];
    this.requestTimestamps.clear();
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearCacheForUrl(urlPattern: string): void {
    const keysToDelete = Array.from(this.authCheckCache.keys()).filter(key => 
      key.includes(urlPattern)
    );
    keysToDelete.forEach(key => this.authCheckCache.delete(key));
    
    // Also clear throttling data for the pattern
    const throttlingKeysToDelete = Array.from(this.requestTimestamps.keys()).filter(key => 
      key.includes(urlPattern)
    );
    throttlingKeysToDelete.forEach(key => this.requestTimestamps.delete(key));
    
    this.csrfToken = null;
    this.lastAuthCheck = 0;
    this.lastTokenFetch = 0;
  }

  /**
   * Clear cache for PSP data specifically
   */
  clearPSPCache(): void {
    this.clearCacheForUrl('psp_summary_stats');
    console.log('🧹 PSP cache cleared');
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats(): {
    pendingRequests: number;
    queuedRequests: number;
    cacheSize: number;
    throttledEndpoints: number;
  } {
    return {
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      cacheSize: this.authCheckCache.size,
      throttledEndpoints: this.requestTimestamps.size,
    };
  }
}

// Export singleton instance
export const api = new ApiClient();

