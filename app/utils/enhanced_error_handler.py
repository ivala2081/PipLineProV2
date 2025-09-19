"""
Enhanced Error Handling Module for PipLinePro
Provides comprehensive error handling with detailed logging and debugging capabilities
"""
import logging
import traceback
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union, Tuple
from flask import jsonify, render_template, request, current_app, g
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from decimal import InvalidOperation
import json
from functools import wraps
import jinja2

from .enhanced_logger import get_enhanced_logger, PerformanceLogger

# Get enhanced logger
logger = get_enhanced_logger("ErrorHandler")

class EnhancedPipLineError(Exception):
    """Enhanced base exception class for PipLinePro application"""
    def __init__(self, message: str, error_code: str = None, status_code: int = 500, 
                 details: Dict[str, Any] = None, user_message: str = None,
                 context: Dict[str, Any] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "INTERNAL_ERROR"
        self.status_code = status_code
        self.details = details or {}
        self.user_message = user_message or "An unexpected error occurred. Please try again."
        self.timestamp = datetime.now(timezone.utc)
        self.context = context or {}
        self.request_id = getattr(request, 'request_id', None) if request else None

class EnhancedValidationError(EnhancedPipLineError):
    """Enhanced exception for validation errors"""
    def __init__(self, message: str, field: str = None, value: Any = None, 
                 validation_type: str = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details={
                "field": field, 
                "value": value,
                "validation_type": validation_type
            },
            user_message=f"Validation error: {message}"
        )

class EnhancedAuthenticationError(EnhancedPipLineError):
    """Enhanced exception for authentication errors"""
    def __init__(self, message: str = "Authentication required", 
                 auth_method: str = None, ip_address: str = None):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            details={
                "auth_method": auth_method,
                "ip_address": ip_address
            },
            user_message="Please log in to access this resource."
        )

class EnhancedAuthorizationError(EnhancedPipLineError):
    """Enhanced exception for authorization errors"""
    def __init__(self, message: str = "Insufficient permissions", 
                 resource: str = None, action: str = None, user_id: int = None):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            details={
                "resource": resource,
                "action": action,
                "user_id": user_id
            },
            user_message="You don't have permission to perform this action."
        )

class EnhancedResourceNotFoundError(EnhancedPipLineError):
    """Enhanced exception for resource not found errors"""
    def __init__(self, resource_type: str, resource_id: Any, 
                 search_criteria: Dict[str, Any] = None):
        super().__init__(
            message=f"{resource_type} with id {resource_id} not found",
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={
                "resource_type": resource_type, 
                "resource_id": resource_id,
                "search_criteria": search_criteria
            },
            user_message=f"The requested {resource_type.lower()} was not found."
        )

class EnhancedDatabaseError(EnhancedPipLineError):
    """Enhanced exception for database errors"""
    def __init__(self, message: str, original_error: Exception = None, 
                 operation: str = None, table: str = None):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details={
                "original_error": str(original_error) if original_error else None,
                "operation": operation,
                "table": table,
                "error_type": type(original_error).__name__ if original_error else None
            },
            user_message="A database error occurred. Please try again later."
        )

class EnhancedTemplateError(EnhancedPipLineError):
    """Enhanced exception for template errors"""
    def __init__(self, message: str, template_name: str = None, 
                 template_context: Dict[str, Any] = None, jinja_error: jinja2.TemplateError = None):
        super().__init__(
            message=message,
            error_code="TEMPLATE_ERROR",
            status_code=500,
            details={
                "template_name": template_name,
                "template_context": template_context,
                "jinja_error_type": type(jinja_error).__name__ if jinja_error else None,
                "jinja_error_message": str(jinja_error) if jinja_error else None
            },
            user_message="A template rendering error occurred. Please try again later."
        )

def log_enhanced_error(error: Exception, context: Dict[str, Any] = None, 
                      include_traceback: bool = True):
    """Log error with enhanced context and debugging information"""
    error_context = context or {}
    
    # Add request context if available
    if request:
        error_context.update({
            'request_method': request.method,
            'request_url': request.url,
            'request_ip': request.remote_addr,
            'request_user_agent': request.headers.get('User-Agent', 'Unknown'),
            'request_referrer': request.headers.get('Referer', 'None'),
            'request_content_type': request.headers.get('Content-Type', 'None'),
            'request_content_length': request.content_length,
        })
        
        # Add user information if available
        if hasattr(g, 'user_id'):
            error_context['user_id'] = g.user_id
        elif hasattr(request, 'user_id'):
            error_context['user_id'] = request.user_id
        
        # Add form data (sanitized)
        if request.form:
            sanitized_form = {k: v for k, v in request.form.items() 
                            if k not in ['password', 'csrf_token', 'token']}
            error_context['form_data'] = sanitized_form
        
        # Add query parameters
        if request.args:
            error_context['query_params'] = dict(request.args)
    
    # Add system information
    try:
        import psutil
        process = psutil.Process()
        error_context['system_info'] = {
            'memory_usage_mb': process.memory_info().rss / (1024 * 1024),
            'cpu_percent': process.cpu_percent(),
            'memory_percent': process.memory_percent()
        }
    except Exception:
        pass
    
    # Log the error with enhanced context
    logger.log_exception(error, error_context, include_traceback)

def handle_enhanced_database_error(error: SQLAlchemyError, operation: str = "database operation") -> EnhancedDatabaseError:
    """Handle database errors with enhanced logging"""
    error_details = {
        'operation': operation,
        'error_type': type(error).__name__,
        'error_message': str(error)
    }
    
    # Add specific details for different database error types
    if isinstance(error, IntegrityError):
        error_details['integrity_error'] = {
            'sql': getattr(error, 'sql', 'Unknown'),
            'params': getattr(error, 'params', 'Unknown')
        }
    elif isinstance(error, OperationalError):
        error_details['operational_error'] = {
            'sql': getattr(error, 'sql', 'Unknown'),
            'params': getattr(error, 'params', 'Unknown')
        }
    
    # Log the database error
    logger.log_exception(error, error_details)
    
    return EnhancedDatabaseError(
        message=f"Database error during {operation}: {error}",
        original_error=error,
        operation=operation
    )

def handle_enhanced_template_error(error: jinja2.TemplateError, template_name: str = None, 
                                  context: Dict[str, Any] = None) -> EnhancedTemplateError:
    """Handle template errors with enhanced logging"""
    error_details = {
        'template_name': template_name,
        'template_context': context,
        'jinja_error_type': type(error).__name__,
        'jinja_error_message': str(error)
    }
    
    # Add specific template error details
    if hasattr(error, 'filename'):
        error_details['template_filename'] = error.filename
    if hasattr(error, 'lineno'):
        error_details['template_line'] = error.lineno
    if hasattr(error, 'name'):
        error_details['template_name_from_error'] = error.name
    
    # Log the template error
    logger.log_exception(error, error_details)
    
    return EnhancedTemplateError(
        message=f"Template error: {error}",
        template_name=template_name,
        template_context=context,
        jinja_error=error
    )

def create_enhanced_error_response(error: EnhancedPipLineError, 
                                 request_format: str = None) -> Tuple[Union[str, Dict], int]:
    """Create enhanced error response with detailed information"""
    if not request_format:
        request_format = 'json' if request.headers.get('Accept') == 'application/json' else 'html'
    
    error_data = {
        'error': {
            'code': error.error_code,
            'message': error.message,
            'user_message': error.user_message,
            'status_code': error.status_code,
            'timestamp': error.timestamp.isoformat(),
            'request_id': error.request_id
        }
    }
    
    # Add details in development mode
    if current_app.config.get('DEBUG', False):
        error_data['error']['details'] = error.details
        error_data['error']['context'] = error.context
    
    if request_format == 'json':
        return jsonify(error_data), error.status_code
    else:
        return jsonify({'error': 'Error', 'message': error_data['error']}), error.status_code

def handle_enhanced_api_error(error: Exception) -> Tuple[Dict, int]:
    """Handle API errors with enhanced logging"""
    if isinstance(error, EnhancedPipLineError):
        log_enhanced_error(error, {'api_request': True})
        return create_enhanced_error_response(error, 'json')
    
    # Handle unexpected errors
    enhanced_error = EnhancedPipLineError(
        message=f"Unexpected API error: {error}",
        error_code="UNEXPECTED_API_ERROR",
        status_code=500,
        user_message="An unexpected error occurred. Please try again later."
    )
    
    log_enhanced_error(enhanced_error, {'api_request': True})
    return create_enhanced_error_response(enhanced_error, 'json')

def handle_enhanced_web_error(error: Exception) -> Tuple[str, int]:
    """Handle web errors with enhanced logging"""
    if isinstance(error, EnhancedPipLineError):
        log_enhanced_error(error, {'web_request': True})
        return create_enhanced_error_response(error, 'html')
    
    # Handle unexpected errors
    enhanced_error = EnhancedPipLineError(
        message=f"Unexpected web error: {error}",
        error_code="UNEXPECTED_WEB_ERROR",
        status_code=500,
        user_message="An unexpected error occurred. Please try again later."
    )
    
    log_enhanced_error(enhanced_error, {'web_request': True})
    return create_enhanced_error_response(enhanced_error, 'html')

def enhanced_error_handler(f):
    """Enhanced decorator for error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except EnhancedPipLineError:
            # Re-raise custom errors
            raise
        except SQLAlchemyError as e:
            # Handle database errors
            operation = f"{f.__module__}.{f.__name__}"
            enhanced_error = handle_enhanced_database_error(e, operation)
            raise enhanced_error
        except jinja2.TemplateError as e:
            # Handle template errors
            enhanced_error = handle_enhanced_template_error(e)
            raise enhanced_error
        except Exception as e:
            # Handle unexpected errors
            enhanced_error = EnhancedPipLineError(
                message=f"Unexpected error in {f.__name__}: {e}",
                error_code="UNEXPECTED_ERROR",
                status_code=500,
                user_message="An unexpected error occurred. Please try again later.",
                context={'function': f.__name__, 'module': f.__module__}
            )
            log_enhanced_error(enhanced_error)
            raise enhanced_error
    
    return decorated_function

def enhanced_api_error_handler(f):
    """Enhanced decorator for API error handling"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            return handle_enhanced_api_error(e)
    
    return decorated_function

def validate_enhanced_request_data(required_fields: list = None, optional_fields: list = None,
                                 validation_rules: Dict[str, Dict[str, Any]] = None):
    """Enhanced decorator for request data validation"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                raise EnhancedValidationError(
                    "Request must be JSON",
                    validation_type="content_type"
                )
            
            data = request.get_json()
            if not data:
                raise EnhancedValidationError(
                    "No JSON data provided",
                    validation_type="empty_data"
                )
            
            # Validate required fields
            if required_fields:
                for field in required_fields:
                    if field not in data:
                        raise EnhancedValidationError(
                            f"Required field '{field}' is missing",
                            field=field,
                            validation_type="missing_required"
                        )
            
            # Validate field types and rules
            if validation_rules:
                for field, rules in validation_rules.items():
                    if field in data:
                        value = data[field]
                        
                        # Type validation
                        if 'type' in rules:
                            expected_type = rules['type']
                            if not isinstance(value, expected_type):
                                raise EnhancedValidationError(
                                    f"Field '{field}' must be of type {expected_type.__name__}",
                                    field=field,
                                    value=value,
                                    validation_type="type_mismatch"
                                )
                        
                        # Range validation for numbers
                        if isinstance(value, (int, float)) and 'min' in rules:
                            if value < rules['min']:
                                raise EnhancedValidationError(
                                    f"Field '{field}' must be at least {rules['min']}",
                                    field=field,
                                    value=value,
                                    validation_type="below_minimum"
                                )
                        
                        if isinstance(value, (int, float)) and 'max' in rules:
                            if value > rules['max']:
                                raise EnhancedValidationError(
                                    f"Field '{field}' must be at most {rules['max']}",
                                    field=field,
                                    value=value,
                                    validation_type="above_maximum"
                                )
                        
                        # Length validation for strings
                        if isinstance(value, str) and 'min_length' in rules:
                            if len(value) < rules['min_length']:
                                raise EnhancedValidationError(
                                    f"Field '{field}' must be at least {rules['min_length']} characters",
                                    field=field,
                                    value=value,
                                    validation_type="too_short"
                                )
                        
                        if isinstance(value, str) and 'max_length' in rules:
                            if len(value) > rules['max_length']:
                                raise EnhancedValidationError(
                                    f"Field '{field}' must be at most {rules['max_length']} characters",
                                    field=field,
                                    value=value,
                                    validation_type="too_long"
                                )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

def require_enhanced_permissions(*permissions):
    """Enhanced decorator for permission checking"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # This would integrate with your permission system
            # For now, just log the permission check
            user_id = getattr(g, 'user_id', None)
            logger.info(f"Permission check for user {user_id}: {permissions}")
            
            # Add your permission checking logic here
            # if not has_permissions(user_id, permissions):
            #     raise EnhancedAuthorizationError(
            #         "Insufficient permissions",
            #         resource=f.__name__,
            #         action="execute",
            #         user_id=user_id
            #     )
            
            return f(*args, **kwargs)
        
        return decorated_function
    return decorator

# Performance monitoring decorator
def monitor_performance(operation_name: str = None):
    """Decorator to monitor function performance"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            op_name = operation_name or f"{f.__module__}.{f.__name__}"
            
            with PerformanceLogger(logger, op_name, {
                'function': f.__name__,
                'module': f.__module__,
                'args_count': len(args),
                'kwargs_count': len(kwargs)
            }):
                return f(*args, **kwargs)
        
        return decorated_function
    return decorator 