"""
Simple in-memory cache service for PipLinePro
"""
import time
import threading
import logging
from typing import Any, Optional, Dict
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class SimpleCacheService:
    """
    Simple in-memory cache service with TTL support
    """
    
    def __init__(self, default_ttl: int = 300):
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.RLock()
        self.default_ttl = default_ttl
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        with self._lock:
            if key not in self._cache:
                return None
            
            cache_entry = self._cache[key]
            
            # Check if expired
            if time.time() > cache_entry['expires_at']:
                del self._cache[key]
                return None
            
            # Update access time
            cache_entry['last_accessed'] = time.time()
            return cache_entry['value']
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        with self._lock:
            ttl = ttl or self.default_ttl
            expires_at = time.time() + ttl
            
            self._cache[key] = {
                'value': value,
                'created_at': time.time(),
                'expires_at': expires_at,
                'last_accessed': time.time(),
                'ttl': ttl
            }
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        with self._lock:
            keys_to_delete = []
            for key in self._cache.keys():
                if pattern in key:
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self._cache[key]
            
            return len(keys_to_delete)
    
    def cleanup_expired(self) -> int:
        """Remove expired entries from cache"""
        with self._lock:
            current_time = time.time()
            keys_to_delete = []
            
            for key, entry in self._cache.items():
                if current_time > entry['expires_at']:
                    keys_to_delete.append(key)
            
            for key in keys_to_delete:
                del self._cache[key]
            
            return len(keys_to_delete)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            current_time = time.time()
            total_entries = len(self._cache)
            expired_entries = 0
            
            for entry in self._cache.values():
                if current_time > entry['expires_at']:
                    expired_entries += 1
            
            return {
                'total_entries': total_entries,
                'expired_entries': expired_entries,
                'active_entries': total_entries - expired_entries,
                'cache_size_mb': sum(len(str(entry['value'])) for entry in self._cache.values()) / (1024 * 1024)
            }
    
    def get_entry_info(self, key: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a cache entry"""
        with self._lock:
            if key not in self._cache:
                return None
            
            entry = self._cache[key]
            current_time = time.time()
            
            return {
                'key': key,
                'created_at': datetime.fromtimestamp(entry['created_at']).isoformat(),
                'last_accessed': datetime.fromtimestamp(entry['last_accessed']).isoformat(),
                'expires_at': datetime.fromtimestamp(entry['expires_at']).isoformat(),
                'ttl': entry['ttl'],
                'is_expired': current_time > entry['expires_at'],
                'age_seconds': current_time - entry['created_at'],
                'time_to_expire': entry['expires_at'] - current_time
            }

# Global cache instance
cache_service = SimpleCacheService()

def get_cache_service() -> SimpleCacheService:
    """Get the global cache service instance"""
    return cache_service

def cache_result(ttl: int = 300, key_prefix: str = ""):
    """
    Decorator to cache function results
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{hash(str(args) + str(kwargs))}"
            
            # Try to get from cache
            cached_result = cache_service.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_service.set(cache_key, result, ttl)
            logger.debug(f"Cached result for {func.__name__}")
            
            return result
        return wrapper
    return decorator
