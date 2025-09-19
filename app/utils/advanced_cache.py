"""
Advanced Caching System for PipLinePro
Provides intelligent caching with TTL, invalidation, and performance monitoring
"""
import time
import json
import hashlib
import logging
from typing import Any, Optional, Dict, Callable, Union
from functools import wraps
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)

class AdvancedCache:
    """Advanced in-memory caching system with performance monitoring"""
    
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'expired': 0,
            'total_requests': 0
        }
        self._max_size = max_size
        self._default_ttl = default_ttl
        self._lock = threading.RLock()
        self._cleanup_interval = 60  # Cleanup every minute
        self._last_cleanup = time.time()
        
    def _cleanup_expired(self):
        """Remove expired entries from cache"""
        current_time = time.time()
        expired_keys = []
        
        for key, entry in self._cache.items():
            if current_time >= entry['expires_at']:
                expired_keys.append(key)
                self._stats['expired'] += 1
        
        for key in expired_keys:
            del self._cache[key]
            
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def _cleanup_if_needed(self):
        """Cleanup expired entries if needed"""
        current_time = time.time()
        if current_time - self._last_cleanup > self._cleanup_interval:
            self._cleanup_expired()
            self._last_cleanup = current_time
    
    def _make_space(self):
        """Remove oldest entries if cache is full"""
        if len(self._cache) >= self._max_size:
            # Remove oldest entries (LRU-like behavior)
            sorted_items = sorted(
                self._cache.items(),
                key=lambda x: x[1]['created_at']
            )
            
            # Remove 10% of oldest entries
            remove_count = max(1, len(sorted_items) // 10)
            for i in range(remove_count):
                key = sorted_items[i][0]
                del self._cache[key]
                
            logger.debug(f"Removed {remove_count} old cache entries to make space")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache with hit tracking"""
        with self._lock:
            self._stats['total_requests'] += 1
            self._cleanup_if_needed()
            
            if key in self._cache:
                entry = self._cache[key]
                current_time = time.time()
                
                if current_time < entry['expires_at']:
                    # Update access time for LRU
                    entry['last_accessed'] = current_time
                    self._stats['hits'] += 1
                    logger.debug(f"Cache HIT for key: {key}")
                    return entry['value']
                else:
                    # Expired, remove it
                    del self._cache[key]
                    self._stats['expired'] += 1
                    logger.debug(f"Cache EXPIRED for key: {key}")
            
            self._stats['misses'] += 1
            logger.debug(f"Cache MISS for key: {key}")
            return default
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        with self._lock:
            self._cleanup_if_needed()
            self._make_space()
            
            ttl = ttl or self._default_ttl
            current_time = time.time()
            
            self._cache[key] = {
                'value': value,
                'created_at': current_time,
                'last_accessed': current_time,
                'expires_at': current_time + ttl
            }
            
            self._stats['sets'] += 1
            logger.debug(f"Cache SET for key: {key} (TTL: {ttl}s)")
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self._stats['deletes'] += 1
                logger.debug(f"Cache DELETE for key: {key}")
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
            logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache performance statistics"""
        with self._lock:
            hit_rate = (self._stats['hits'] / max(self._stats['total_requests'], 1)) * 100
            return {
                **self._stats,
                'hit_rate': round(hit_rate, 2),
                'current_size': len(self._cache),
                'max_size': self._max_size
            }
    
    def generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate consistent cache key from arguments"""
        # Create a hash from all arguments
        key_data = {
            'prefix': prefix,
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        
        key_string = json.dumps(key_data, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()
        
        return f"{prefix}:{key_hash}"

# Global cache instance
cache = AdvancedCache(max_size=2000, default_ttl=300)

def cached(ttl: int = 300, key_prefix: str = "default"):
    """Decorator for caching function results"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = cache.generate_key(key_prefix, func.__name__, *args, **kwargs)
            
            # Try to get from cache
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def cache_invalidate(pattern: str):
    """Invalidate cache entries matching pattern"""
    with cache._lock:
        keys_to_delete = [key for key in cache._cache.keys() if pattern in key]
        for key in keys_to_delete:
            del cache._cache[key]
        
        logger.info(f"Invalidated {len(keys_to_delete)} cache entries matching pattern: {pattern}")

# Performance monitoring decorator
def monitor_performance(func: Callable) -> Callable:
    """Decorator to monitor function performance"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            if execution_time > 1.0:  # Log slow functions
                logger.warning(f"Slow function {func.__name__} took {execution_time:.2f}s")
            
            return result
        except Exception as e:
            execution_time = time.time() - start_time
            logger.error(f"Function {func.__name__} failed after {execution_time:.2f}s: {e}")
            raise
    
    return wrapper

# Export commonly used functions
__all__ = ['cache', 'cached', 'cache_invalidate', 'monitor_performance', 'AdvancedCache']
