"""
Authentication utilities for the API
"""
from typing import Optional, Dict, Any
from flask import request, current_app
from app.services.security_service import SecurityService
from app.utils.logger import get_logger

logger = get_logger(__name__)

def verify_token(token: str) -> Optional[int]:
    """
    Verify JWT token and return user ID
    
    Args:
        token: JWT token string
        
    Returns:
        User ID if token is valid, None otherwise
    """
    try:
        security_service = SecurityService()
        payload = security_service.validate_jwt_token(token)
        
        if payload and 'user_id' in payload:
            return payload['user_id']
        return None
        
    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        return None

def get_current_user_id() -> Optional[int]:
    """
    Get current user ID from request headers
    
    Returns:
        User ID if authenticated, None otherwise
    """
    try:
        # Check for Authorization header
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return None
            
        # Extract token from "Bearer <token>" format
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove "Bearer " prefix
            return verify_token(token)
            
        return None
        
    except Exception as e:
        logger.error(f"Error getting current user: {e}")
        return None

def require_auth(func):
    """
    Decorator to require authentication for API endpoints
    """
    def wrapper(*args, **kwargs):
        user_id = get_current_user_id()
        if not user_id:
            return {"error": "Authentication required"}, 401
        return func(*args, **kwargs)
    return wrapper 