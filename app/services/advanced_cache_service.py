"""
Advanced caching service for PipLinePro with Redis and fallback support
"""
import json
import time
import logging
from typing import Any, Optional, Dict, List, Callable
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)

class AdvancedCacheService:
    """
    Advanced caching service with Redis support and intelligent fallback
    """
    
    def __init__(self):
        self._memory_cache = {}
        self._lock = threading.RLock()
        self._redis_client = None
        self._redis_available = False
        self._default_ttl = 300  # 5 minutes
        
        # Try to initialize Redis
        self._init_redis()
    
    def _init_redis(self):
        """Initialize Redis connection if available"""
        try:
            import redis
            from flask import current_app
            
            # Check if we're in an application context
            try:
                redis_url = current_app.config.get('REDIS_URL', 'redis://localhost:6379/0')
                if redis_url and redis_url != 'redis://localhost:6379/0':
                    self._redis_client = redis.from_url(redis_url, decode_responses=True)
                    # Test connection
                    self._redis_client.ping()
                    self._redis_available = True
                    logger.info("Redis cache initialized successfully")
                else:
                    logger.info("Redis not configured, using memory cache only")
            except RuntimeError:
                # Not in application context, skip Redis initialization
                logger.info("Not in application context, using memory cache only")
                self._redis_available = False
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}. Using memory cache only.")
            self._redis_available = False
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache (Redis first, then memory)"""
        try:
            # Try Redis first
            if self._redis_available:
                try:
                    value = self._redis_client.get(key)
                    if value is not None:
                        return json.loads(value)
                except Exception as e:
                    logger.warning(f"Redis get failed: {e}")
            
            # Fallback to memory cache
            with self._lock:
                if key not in self._memory_cache:
                    return None
                
                cache_entry = self._memory_cache[key]
                
                # Check if expired
                if time.time() > cache_entry['expires_at']:
                    del self._memory_cache[key]
                    return None
                
                # Update access time
                cache_entry['last_accessed'] = time.time()
                return cache_entry['value']
                
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache (both Redis and memory)"""
        try:
            ttl = ttl or self._default_ttl
            expires_at = time.time() + ttl
            serialized_value = json.dumps(value, default=str)
            
            # Set in Redis
            if self._redis_available:
                try:
                    self._redis_client.setex(key, ttl, serialized_value)
                except Exception as e:
                    logger.warning(f"Redis set failed: {e}")
            
            # Set in memory cache as backup
            with self._lock:
                self._memory_cache[key] = {
                    'value': value,
                    'created_at': time.time(),
                    'expires_at': expires_at,
                    'last_accessed': time.time(),
                    'ttl': ttl
                }
            
            return True
            
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            # Delete from Redis
            if self._redis_available:
                try:
                    self._redis_client.delete(key)
                except Exception as e:
                    logger.warning(f"Redis delete failed: {e}")
            
            # Delete from memory cache
            with self._lock:
                if key in self._memory_cache:
                    del self._memory_cache[key]
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            return False
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        try:
            deleted_count = 0
            
            # Invalidate Redis keys
            if self._redis_available:
                try:
                    keys = self._redis_client.keys(f"*{pattern}*")
                    if keys:
                        deleted_count += self._redis_client.delete(*keys)
                except Exception as e:
                    logger.warning(f"Redis pattern invalidation failed: {e}")
            
            # Invalidate memory cache keys
            with self._lock:
                keys_to_delete = []
                for key in self._memory_cache.keys():
                    if pattern in key:
                        keys_to_delete.append(key)
                
                for key in keys_to_delete:
                    del self._memory_cache[key]
                    deleted_count += 1
            
            logger.info(f"Invalidated {deleted_count} cache entries matching pattern: {pattern}")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cache pattern invalidation error: {e}")
            return 0
    
    def clear(self) -> bool:
        """Clear all cache entries"""
        try:
            # Clear Redis
            if self._redis_available:
                try:
                    self._redis_client.flushdb()
                except Exception as e:
                    logger.warning(f"Redis clear failed: {e}")
            
            # Clear memory cache
            with self._lock:
                self._memory_cache.clear()
            
            logger.info("Cache cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"Cache clear error: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            stats = {
                'redis_available': self._redis_available,
                'memory_cache_entries': 0,
                'memory_cache_size_mb': 0,
                'redis_info': {}
            }
            
            # Memory cache stats
            with self._lock:
                current_time = time.time()
                stats['memory_cache_entries'] = len(self._memory_cache)
                
                total_size = 0
                for entry in self._memory_cache.values():
                    total_size += len(str(entry['value']))
                stats['memory_cache_size_mb'] = total_size / (1024 * 1024)
            
            # Redis stats
            if self._redis_available:
                try:
                    info = self._redis_client.info()
                    stats['redis_info'] = {
                        'used_memory_human': info.get('used_memory_human', 'N/A'),
                        'connected_clients': info.get('connected_clients', 0),
                        'keyspace_hits': info.get('keyspace_hits', 0),
                        'keyspace_misses': info.get('keyspace_misses', 0)
                    }
                except Exception as e:
                    stats['redis_info'] = {'error': str(e)}
            
            return stats
            
        except Exception as e:
            logger.error(f"Cache stats error: {e}")
            return {'error': str(e)}
    
    def cleanup_expired(self) -> int:
        """Remove expired entries from memory cache"""
        try:
            with self._lock:
                current_time = time.time()
                keys_to_delete = []
                
                for key, entry in self._memory_cache.items():
                    if current_time > entry['expires_at']:
                        keys_to_delete.append(key)
                
                for key in keys_to_delete:
                    del self._memory_cache[key]
                
                return len(keys_to_delete)
                
        except Exception as e:
            logger.error(f"Cache cleanup error: {e}")
            return 0

# Global cache service instance
cache_service = AdvancedCacheService()

def get_cache_service() -> AdvancedCacheService:
    """Get the global cache service instance"""
    return cache_service

def cached(ttl: int = 300, key_prefix: str = "", invalidate_on: List[str] = None):
    """
    Advanced caching decorator with pattern invalidation support
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

def invalidate_cache_patterns(patterns: List[str]):
    """Invalidate multiple cache patterns"""
    total_deleted = 0
    for pattern in patterns:
        total_deleted += cache_service.invalidate_pattern(pattern)
    return total_deleted
