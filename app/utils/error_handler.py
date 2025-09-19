"""
Comprehensive Error Handling Module for PipLinePro
Provides centralized error handling utilities, custom exceptions, and consistent error responses
"""
import logging
import traceback
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Union
from flask import jsonify, render_template, request, current_app
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError, OperationalError
from decimal import InvalidOperation
import json
from functools import wraps

# Configure logging
logger = logging.getLogger(__name__)

class PipLineError(Exception):
    """Base exception class for PipLinePro application"""
    def __init__(self, message: str, error_code: str = None, status_code: int = 500, 
                 details: Dict[str, Any] = None, user_message: str = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code or "INTERNAL_ERROR"
        self.status_code = status_code
        self.details = details or {}
        self.user_message = user_message or "An unexpected error occurred. Please try again."
        self.timestamp = datetime.now(timezone.utc)

class ValidationError(PipLineError):
    """Exception for validation errors"""
    def __init__(self, message: str, field: str = None, value: Any = None):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            status_code=400,
            details={"field": field, "value": value},
            user_message=f"Validation error: {message}"
        )

class AuthenticationError(PipLineError):
    """Exception for authentication errors"""
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            error_code="AUTHENTICATION_ERROR",
            status_code=401,
            user_message="Please log in to access this resource."
        )

class AuthorizationError(PipLineError):
    """Exception for authorization errors"""
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_code="AUTHORIZATION_ERROR",
            status_code=403,
            user_message="You don't have permission to perform this action."
        )

class ResourceNotFoundError(PipLineError):
    """Exception for resource not found errors"""
    def __init__(self, resource_type: str, resource_id: Any):
        super().__init__(
            message=f"{resource_type} with id {resource_id} not found",
            error_code="RESOURCE_NOT_FOUND",
            status_code=404,
            details={"resource_type": resource_type, "resource_id": resource_id},
            user_message=f"The requested {resource_type.lower()} was not found."
        )

class DatabaseError(PipLineError):
    """Exception for database errors"""
    def __init__(self, message: str, original_error: Exception = None):
        super().__init__(
            message=message,
            error_code="DATABASE_ERROR",
            status_code=500,
            details={"original_error": str(original_error) if original_error else None},
            user_message="A database error occurred. Please try again later."
        )

class RateLimitError(PipLineError):
    """Exception for rate limiting errors"""
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_ERROR",
            status_code=429,
            user_message="Too many requests. Please try again later."
        )

class FileUploadError(PipLineError):
    """Exception for file upload errors"""
    def __init__(self, message: str, file_type: str = None):
        super().__init__(
            message=message,
            error_code="FILE_UPLOAD_ERROR",
            status_code=400,
            details={"file_type": file_type},
            user_message=f"File upload error: {message}"
        )

class JSONParsingError(PipLineError):
    """Exception for JSON parsing errors"""
    def __init__(self, message: str, data: str = None):
        super().__init__(
            message=message,
            error_code="JSON_PARSING_ERROR",
            status_code=400,
            details={"data": data[:100] if data else None},
            user_message="Data format error. Please try again."
        )

class CSRFError(PipLineError):
    """Exception for CSRF token errors"""
    def __init__(self, message: str = "CSRF token validation failed"):
        super().__init__(
            message=message,
            error_code="CSRF_ERROR",
            status_code=400,
            user_message="Security validation failed. Please refresh the page and try again."
        )

def log_error(error: Exception, context: Dict[str, Any] = None):
    """Log error with context information"""
    from app.utils.logger import get_logger, log_exception
    
    logger = get_logger("PipLinePro")
    
    error_context = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "request_method": request.method if request else None,
        "request_url": request.url if request else None,
        "user_agent": request.headers.get('User-Agent') if request else None,
        "ip_address": request.remote_addr if request else None,
        "user_id": getattr(request, 'user_id', None) if request else None,
    }
    
    if context:
        error_context.update(context)
    
    if hasattr(error, 'details'):
        error_context['error_details'] = error.details
    
    # Use the enhanced logging system
    log_exception(logger, error, error_context)

def handle_database_error(error: SQLAlchemyError, operation: str = "database operation") -> PipLineError:
    """Handle database errors and return appropriate PipLineError"""
    if isinstance(error, IntegrityError):
        return DatabaseError(
            f"Data integrity error during {operation}",
            original_error=error
        )
    elif isinstance(error, OperationalError):
        return DatabaseError(
            f"Database connection error during {operation}",
            original_error=error
        )
    else:
        return DatabaseError(
            f"Database error during {operation}",
            original_error=error
        )

def handle_validation_error(error: Exception, field: str = None) -> ValidationError:
    """Handle validation errors and return ValidationError"""
    if isinstance(error, InvalidOperation):
        return ValidationError(
            "Invalid numeric value provided",
            field=field,
            value=getattr(error, 'value', None)
        )
    elif isinstance(error, ValueError):
        return ValidationError(
            str(error),
            field=field
        )
    else:
        return ValidationError(
            str(error),
            field=field
        )

def create_error_response(error: PipLineError, request_format: str = None) -> tuple:
    """Create appropriate error response based on request format"""
    if request_format == 'json' or (hasattr(request, 'headers') and request.headers.get('Accept') == 'application/json'):
        response = jsonify({
            'error': {
                'code': error.error_code,
                'message': error.user_message,
                'details': error.details,
                'timestamp': error.timestamp.isoformat()
            }
        })
        return response, error.status_code
    else:
        # For HTML requests, return JSON error response
        response = jsonify({
            'error': 'Error',
            'message': str(error),
            'status_code': error.status_code
        })
        return response, error.status_code

def safe_execute(func, *args, **kwargs):
    """Safely execute a function with comprehensive error handling"""
    try:
        return func(*args, **kwargs)
    except PipLineError:
        # Re-raise PipLineError as-is
        raise
    except SQLAlchemyError as e:
        # Handle database errors
        db_error = handle_database_error(e, f"function {func.__name__}")
        log_error(db_error, {"function": func.__name__})
        raise db_error
    except ValidationError as e:
        # Re-raise validation errors
        log_error(e, {"function": func.__name__})
        raise e
    except Exception as e:
        # Handle unexpected errors
        unexpected_error = PipLineError(
            f"Unexpected error in {func.__name__}: {str(e)}",
            error_code="UNEXPECTED_ERROR",
            status_code=500
        )
        log_error(unexpected_error, {"function": func.__name__, "original_error": str(e)})
        raise unexpected_error

def validate_required_fields(data: Dict[str, Any], required_fields: list) -> None:
    """Validate that required fields are present and not empty"""
    missing_fields = []
    
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == '':
            missing_fields.append(field)
    
    if missing_fields:
        raise ValidationError(
            f"Missing required fields: {', '.join(missing_fields)}",
            field="required_fields",
            value=missing_fields
        )

def validate_numeric_field(value: Any, field_name: str, min_value: float = None, max_value: float = None) -> float:
    """Validate and convert numeric field"""
    try:
        numeric_value = float(value)
        
        if min_value is not None and numeric_value < min_value:
            raise ValidationError(
                f"{field_name} must be at least {min_value}",
                field=field_name,
                value=numeric_value
            )
        
        if max_value is not None and numeric_value > max_value:
            raise ValidationError(
                f"{field_name} must be at most {max_value}",
                field=field_name,
                value=numeric_value
            )
        
        return numeric_value
    except (ValueError, TypeError):
        raise ValidationError(
            f"{field_name} must be a valid number",
            field=field_name,
            value=value
        )

def validate_date_field(date_string: str, field_name: str) -> datetime:
    """Validate and parse date field"""
    try:
        from datetime import datetime
        return datetime.strptime(date_string, '%Y-%m-%d')
    except ValueError:
        raise ValidationError(
            f"{field_name} must be a valid date in YYYY-MM-DD format",
            field=field_name,
            value=date_string
        )

def handle_api_error(error: Exception) -> tuple:
    """Handle errors for API routes and return JSON response"""
    if isinstance(error, PipLineError):
        return create_error_response(error, 'json')
    else:
        # Convert unexpected errors to PipLineError
        pipeline_error = PipLineError(
            str(error),
            error_code="API_ERROR",
            status_code=500
        )
        log_error(pipeline_error)
        return create_error_response(pipeline_error, 'json')

def handle_web_error(error: Exception) -> tuple:
    """Handle errors for web routes and return HTML response"""
    if isinstance(error, PipLineError):
        return create_error_response(error, 'html')
    else:
        # Convert unexpected errors to PipLineError
        pipeline_error = PipLineError(
            str(error),
            error_code="WEB_ERROR",
            status_code=500
        )
        log_error(pipeline_error)
        return create_error_response(pipeline_error, 'html')

# Route decorators for consistent error handling
def handle_errors(f):
    """Decorator to handle errors in web routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except PipLineError as e:
            log_error(e, {"route": f.__name__})
            return handle_web_error(e)
        except Exception as e:
            # Check if it's a CSRF error
            if "CSRF" in str(e) or "csrf" in str(e).lower():
                csrf_error = CSRFError(str(e))
                log_error(csrf_error, {"route": f.__name__, "original_error": str(e)})
                return handle_web_error(csrf_error)
            
            pipeline_error = PipLineError(
                f"Unexpected error in {f.__name__}: {str(e)}",
                error_code="ROUTE_ERROR",
                status_code=500
            )
            log_error(pipeline_error, {"route": f.__name__, "original_error": str(e)})
            return handle_web_error(pipeline_error)
    return decorated_function

def handle_api_errors(f):
    """Decorator to handle errors in API routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except PipLineError as e:
            log_error(e, {"api_route": f.__name__})
            return handle_api_error(e)
        except Exception as e:
            # Check if it's a CSRF error
            if "CSRF" in str(e) or "csrf" in str(e).lower():
                csrf_error = CSRFError(str(e))
                log_error(csrf_error, {"api_route": f.__name__, "original_error": str(e)})
                return handle_api_error(csrf_error)
            
            pipeline_error = PipLineError(
                f"Unexpected error in API {f.__name__}: {str(e)}",
                error_code="API_ROUTE_ERROR",
                status_code=500
            )
            log_error(pipeline_error, {"api_route": f.__name__, "original_error": str(e)})
            return handle_api_error(pipeline_error)
    return decorated_function

def validate_request_data(required_fields: list = None, optional_fields: list = None):
    """Decorator to validate request data"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get request data
                if request.method == 'GET':
                    data = request.args.to_dict()
                else:
                    data = request.get_json() or request.form.to_dict()
                
                # Validate required fields
                if required_fields:
                    validate_required_fields(data, required_fields)
                
                # Store validated data in request for use in route
                request.validated_data = data
                
                return f(*args, **kwargs)
            except ValidationError as e:
                log_error(e, {"route": f.__name__})
                if request.headers.get('Accept') == 'application/json':
                    return handle_api_error(e)
                else:
                    return handle_web_error(e)
        return decorated_function
    return decorator

def require_permissions(*permissions):
    """Decorator to check user permissions"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                from flask_login import current_user
                
                if not current_user.is_authenticated:
                    raise AuthenticationError("Login required")
                
                # Check if user has required permissions
                user_permissions = getattr(current_user, 'permissions', [])
                if not all(perm in user_permissions for perm in permissions):
                    raise AuthorizationError(f"Insufficient permissions. Required: {', '.join(permissions)}")
                
                return f(*args, **kwargs)
            except (AuthenticationError, AuthorizationError) as e:
                log_error(e, {"route": f.__name__})
                if request.headers.get('Accept') == 'application/json':
                    return handle_api_error(e)
                else:
                    return handle_web_error(e)
        return decorated_function
    return decorator 