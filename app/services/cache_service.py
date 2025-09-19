"""
Caching Service
Provides in-memory caching for improved performance
"""

import time
import logging
import threading
from typing import Any, Optional, Dict
from functools import wraps
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class MemoryCache:
    """Simple in-memory cache implementation"""
    
    def __init__(self, default_ttl: int = 300):  # 5 minutes default
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.default_ttl = default_ttl
        self.lock = threading.RLock()
        self.hits = 0
        self.misses = 0
        
        # Start cleanup thread
        self._start_cleanup_thread()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self.lock:
            if key not in self.cache:
                self.misses += 1
                return None
            
            entry = self.cache[key]
            
            # Check if expired
            if time.time() > entry['expires']:
                del self.cache[key]
                self.misses += 1
                return None
            
            self.hits += 1
            return entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        if ttl is None:
            ttl = self.default_ttl
        
        with self.lock:
            self.cache[key] = {
                'value': value,
                'expires': time.time() + ttl,
                'created': time.time()
            }
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self.lock:
            self.cache.clear()
            self.hits = 0
            self.misses = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self.lock:
            total_requests = self.hits + self.misses
            hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'entries': len(self.cache),
                'hits': self.hits,
                'misses': self.misses,
                'hit_rate': round(hit_rate, 2),
                'total_requests': total_requests
            }
    
    def _cleanup_expired(self) -> None:
        """Remove expired entries"""
        current_time = time.time()
        expired_keys = []
        
        with self.lock:
            for key, entry in self.cache.items():
                if current_time > entry['expires']:
                    expired_keys.append(key)
            
            for key in expired_keys:
                del self.cache[key]
        
        if expired_keys:
            logger.debug(f"Cache cleanup: removed {len(expired_keys)} expired entries")
    
    def _start_cleanup_thread(self) -> None:
        """Start background cleanup thread"""
        def cleanup_loop():
            while True:
                try:
                    time.sleep(60)  # Cleanup every minute
                    self._cleanup_expired()
                except Exception as e:
                    logger.error(f"Cache cleanup error: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        cleanup_thread.start()


class CacheService:
    """Main caching service"""
    
    def __init__(self):
        self.memory_cache = MemoryCache()
        self.enabled = True
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        if not self.enabled:
            return None
        return self.memory_cache.get(key)
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache"""
        if self.enabled:
            self.memory_cache.set(key, value, ttl)
    
    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        return self.memory_cache.delete(key)
    
    def clear(self) -> None:
        """Clear all cache"""
        self.memory_cache.clear()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return self.memory_cache.get_stats()
    
    def enable(self) -> None:
        """Enable caching"""
        self.enabled = True
    
    def disable(self) -> None:
        """Disable caching"""
        self.enabled = False


# Global cache service instance
cache_service = CacheService()


def cached(ttl: int = 300, key_prefix: str = ''):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}{func.__name__}:{hash(str(args) + str(sorted(kwargs.items())))}"
            
            # Try to get from cache
            cached_result = cache_service.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # Call function and cache result
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl)
            
            return result
        return wrapper
    return decorator


def cache_exchange_rates(func):
    """Specific caching for exchange rates"""
    return cached(ttl=900, key_prefix='exchange_rates:')(func)  # 15 minutes


def cache_analytics(func):
    """Specific caching for analytics data"""
    return cached(ttl=600, key_prefix='analytics:')(func)  # 10 minutes


def cache_user_data(func):
    """Specific caching for user data"""
    return cached(ttl=300, key_prefix='user:')(func)  # 5 minutes