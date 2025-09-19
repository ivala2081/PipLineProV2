"""
Security Service for PipLine Treasury System
Handles rate limiting, authentication, and security enhancements
"""
import logging
import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from functools import wraps
from flask import request, current_app, g, jsonify, make_response
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import redis
import jwt

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


logger = logging.getLogger(__name__)

class SecurityService:
    """Comprehensive security service for PipLine"""
    
    def __init__(self, app=None):
        """Initialize security service"""
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize security service with Flask app"""
        self.app = app
        
        # Initialize Redis for rate limiting
        self.redis_client = self._init_redis()
        
        # Initialize rate limiter
        self.limiter = Limiter(
            app=app,
            key_func=get_remote_address,
            storage_uri=self._get_redis_url(),
            default_limits=["200 per day", "50 per hour"],
            strategy="fixed-window"
        )
        
        # Register security middleware
        self._register_middleware()
        
        logger.info("Security service initialized successfully")
    
    def _init_redis(self) -> Optional[redis.Redis]:
        """Initialize Redis connection for rate limiting"""
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                return redis.from_url(redis_url)
            else:
                logger.warning("Redis URL not configured, using in-memory storage")
                return None
        except RuntimeError:
            # Not in application context
            logger.warning("Not in application context, using in-memory storage")
            return None
        except Exception as e:
            logger.error(f"Redis connection failed: {e}")
            return None
    
    def _get_redis_url(self) -> str:
        """Get Redis URL for rate limiter"""
        try:
            redis_url = current_app.config.get('REDIS_URL')
            if redis_url:
                return redis_url
        except RuntimeError:
            # Not in application context
            pass
        return "memory://"
    
    def _register_middleware(self):
        """Register security middleware"""
        @self.app.before_request
        def security_headers():
            """Add security headers to all responses"""
            response = make_response()
            
            # Security headers
            response.headers['X-Content-Type-Options'] = 'nosniff'
            response.headers['X-Frame-Options'] = 'DENY'
            response.headers['X-XSS-Protection'] = '1; mode=block'
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
            response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
            response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
            response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
            
            # Cache control for sensitive endpoints
            if request.endpoint and 'api' in request.endpoint:
                response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
                response.headers['Pragma'] = 'no-cache'
                response.headers['Expires'] = '0'
            
            return response
    
    def rate_limit(self, limits: str, key_func=None):
        """Decorator for rate limiting endpoints"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Custom rate limiting logic
                if key_func:
                    key = key_func()
                else:
                    key = get_remote_address()
                
                # Check rate limit
                if not self._check_rate_limit(key, limits):
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'message': 'Too many requests. Please try again later.'
                    }), 429
                
                return f(*args, **kwargs)
            return decorated_function
        return decorator
    
    def _check_rate_limit(self, key: str, limits: str) -> bool:
        """Check if request is within rate limits"""
        try:
            if not self.redis_client:
                return True  # Allow if no Redis
            
            # Parse limits (e.g., "100 per hour")
            limit_parts = limits.split()
            if len(limit_parts) >= 3:
                max_requests = int(limit_parts[0])
                time_window = limit_parts[2]
                
                # Convert time window to seconds
                if 'second' in time_window:
                    window = 1
                elif 'minute' in time_window:
                    window = 60
                elif 'hour' in time_window:
                    window = 3600
                elif 'day' in time_window:
                    window = 86400
                else:
                    window = 3600  # Default to hour
                
                # Check current count
                current_count = self.redis_client.get(f"rate_limit:{key}")
                if current_count and int(current_count) >= max_requests:
                    return False
                
                # Increment counter
                pipe = self.redis_client.pipeline()
                pipe.incr(f"rate_limit:{key}")
                pipe.expire(f"rate_limit:{key}", window)
                pipe.execute()
                
                return True
                
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return True  # Allow on error
        
        return True
    
    def generate_api_key(self, user_id: int) -> str:
        """Generate API key for user"""
        timestamp = str(int(time.time()))
        random_part = secrets.token_urlsafe(16)
        key_data = f"{user_id}:{timestamp}:{random_part}"
        
        # Hash the key
        api_key = hashlib.sha256(key_data.encode()).hexdigest()
        
        # Store in Redis with expiration
        if self.redis_client:
            self.redis_client.setex(
                f"api_key:{api_key}",
                86400 * 30,  # 30 days
                user_id
            )
        
        return api_key
    
    def validate_api_key(self, api_key: str) -> Optional[int]:
        """Validate API key and return user ID"""
        try:
            if not self.redis_client:
                return None
            
            user_id = self.redis_client.get(f"api_key:{api_key}")
            if user_id:
                return int(user_id)
            
        except Exception as e:
            logger.error(f"API key validation failed: {e}")
        
        return None
    
    def generate_jwt_token(self, user_id: int, username: str, role: str) -> str:
        """Generate JWT token for user"""
        payload = {
            'user_id': user_id,
            'username': username,
            'role': role,
            'exp': datetime.utcnow() + timedelta(hours=24),
            'iat': datetime.utcnow()
        }
        
        secret = current_app.config.get('SECRET_KEY', 'default-secret')
        return jwt.encode(payload, secret, algorithm='HS256')
    
    def validate_jwt_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return payload"""
        try:
            secret = current_app.config.get('SECRET_KEY', 'default-secret')
            payload = jwt.decode(token, secret, algorithms=['HS256'])
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning("JWT token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token: {e}")
            return None
    
    def require_auth(self, f):
        """Decorator to require authentication"""
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check for API key in header
            api_key = request.headers.get('X-API-Key')
            if api_key:
                user_id = self.validate_api_key(api_key)
                if user_id:
                    g.current_user_id = user_id
                    return f(*args, **kwargs)
            
            # Check for JWT token in header
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                payload = self.validate_jwt_token(token)
                if payload:
                    g.current_user_id = payload['user_id']
                    g.current_user_role = payload['role']
                    return f(*args, **kwargs)
            
            # Check session authentication
            if hasattr(g, 'user') and g.user:
                return f(*args, **kwargs)
            
            return jsonify({'error': 'Authentication required'}), 401
        
        return decorated_function
    
    def require_role(self, required_role: str):
        """Decorator to require specific role"""
        def decorator(f):
            @wraps(f)
            def decorated_function(*args, **kwargs):
                # Check role from JWT token
                if hasattr(g, 'current_user_role'):
                    if g.current_user_role == required_role or g.current_user_role == 'admin':
                        return f(*args, **kwargs)
                
                # Check role from session
                if hasattr(g, 'user') and g.user:
                    if g.user.role == required_role or g.user.role == 'admin':
                        return f(*args, **kwargs)
                
                return jsonify({'error': 'Insufficient permissions'}), 403
            
            return decorated_function
        return decorator

# Global security service instance
security_service = SecurityService() 