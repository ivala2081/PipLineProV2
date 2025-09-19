"""
Enhanced Logging System for PipLinePro
Provides comprehensive debugging, monitoring, and error tracking capabilities
"""
import logging
import logging.handlers
import os
import sys
import json
import traceback
import time
import platform
import psutil
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Union
from functools import wraps
from flask import request, g, current_app
import jinja2
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


class EnhancedJSONFormatter(logging.Formatter):
    """Enhanced JSON formatter with structured logging"""
    
    def format(self, record):
        """Format log record as JSON with enhanced context"""
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
            "filename": record.filename,
            "process_id": record.process,
            "thread_id": record.thread,
        }
        
        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_entry.update(record.extra_data)
        
        # Add request context if available
        if hasattr(record, 'request_context'):
            log_entry['request_context'] = record.request_context
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = {
                'type': record.exc_info[0].__name__ if record.exc_info[0] else None,
                'message': str(record.exc_info[1]) if record.exc_info[1] else None,
                'traceback': self.formatException(record.exc_info)
            }
        
        return json.dumps(log_entry, ensure_ascii=False, default=str)

class DetailedFormatter(logging.Formatter):
    """Detailed text formatter for human-readable logs"""
    
    def format(self, record):
        """Format log record with detailed information"""
        # Base format
        formatted = super().format(record)
        
        # Add extra context if available
        if hasattr(record, 'extra_data'):
            extra_str = " | ".join([f"{k}={v}" for k, v in record.extra_data.items()])
            formatted += f" | {extra_str}"
        
        # Add request context if available
        if hasattr(record, 'request_context'):
            req_ctx = record.request_context
            formatted += f" | REQ: {req_ctx.get('method', 'N/A')} {req_ctx.get('url', 'N/A')}"
            if 'user_id' in req_ctx:
                formatted += f" | User: {req_ctx['user_id']}"
        
        # Add exception info if present
        if record.exc_info:
            formatted += f"\nException: {self.formatException(record.exc_info)}"
        
        return formatted

class EnhancedLogger:
    """Enhanced logger with comprehensive debugging capabilities"""
    
    def __init__(self, name: str, app=None):
        self.logger = logging.getLogger(name)
        self.app = app
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup logger with enhanced capabilities"""
        # Don't add handlers if they already exist
        if self.logger.handlers:
            return
        
        # Prevent propagation to avoid duplicate logs
        self.logger.propagate = False
        
        # Create handlers
        handlers = self._create_handlers()
        
        # Add handlers to logger
        for handler in handlers:
            self.logger.addHandler(handler)
        
        # Set level - WARNING for development, DEBUG for production
        import os
        if os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'True':
            self.logger.setLevel(logging.WARNING)
        else:
            self.logger.setLevel(logging.DEBUG)
    
    def _create_handlers(self):
        """Create logging handlers"""
        handlers = []
        log_dir = "logs"
        
        # Ensure log directory exists
        if not os.path.exists(log_dir):
            os.path.makedirs(log_dir, exist_ok=True)
        
        # Console handler (development)
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        console_handler.setFormatter(DetailedFormatter(
            '%(asctime)s [%(levelname)s] %(name)s - %(message)s'  # Simplified format
        ))
        handlers.append(console_handler)
        
        # Main application log - with proper file handle management
        app_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "pipelinepro_enhanced.log"),
            maxBytes=2*1024*1024,  # Reduced to 2MB to prevent rotation issues
            backupCount=3,
            encoding='utf-8',
            delay=True  # Delay file opening to prevent permission issues
        )
        app_handler.setLevel(logging.INFO)
        app_handler.setFormatter(DetailedFormatter(
            '%(asctime)s [%(levelname)s] %(name)s - %(message)s'  # Simplified format
        ))
        handlers.append(app_handler)
        
        # Error log - with proper file handle management
        error_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "pipelinepro_errors_enhanced.log"),
            maxBytes=2*1024*1024,  # Reduced to 2MB
            backupCount=3,
            encoding='utf-8',
            delay=True  # Delay file opening to prevent permission issues
        )
        error_handler.setLevel(logging.ERROR)
        error_handler.setFormatter(DetailedFormatter(
            '%(asctime)s [%(levelname)s] %(name)s - %(message)s'  # Simplified format
        ))
        handlers.append(error_handler)
        
        # Debug log - with proper file handle management
        debug_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "pipelinepro_debug_enhanced.log"),
            maxBytes=2*1024*1024,  # Reduced to 2MB
            backupCount=2,  # Minimal backup count
            encoding='utf-8',
            delay=True  # Delay file opening to prevent permission issues
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.setFormatter(DetailedFormatter(
            '%(asctime)s [%(levelname)s] %(name)s - %(message)s'  # Simplified format
        ))
        handlers.append(debug_handler)
        
        # JSON log for structured logging - with proper file handle management
        json_handler = logging.handlers.RotatingFileHandler(
            os.path.join(log_dir, "pipelinepro_structured.log"),
            maxBytes=2*1024*1024,  # Reduced to 2MB
            backupCount=2,
            encoding='utf-8',
            delay=True  # Delay file opening to prevent permission issues
        )
        json_handler.setLevel(logging.INFO)
        json_handler.setFormatter(EnhancedJSONFormatter())
        handlers.append(json_handler)
        
        return handlers
    
    def _get_request_context(self):
        """Get current request context"""
        if not request:
            return {}
        
        context = {
            'method': request.method,
            'url': request.url,
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent', 'Unknown'),
            'referrer': request.headers.get('Referer', 'None'),
            'content_type': request.headers.get('Content-Type', 'None'),
            'content_length': request.content_length,
        }
        
        # Add user information if available
        if hasattr(g, 'user_id'):
            context['user_id'] = g.user_id
        elif hasattr(request, 'user_id'):
            context['user_id'] = request.user_id
        
        # Add form data (sanitized)
        if request.form:
            context['form_data'] = {k: v for k, v in request.form.items() 
                                  if k not in ['password', 'csrf_token']}
        
        # Add query parameters
        if request.args:
            context['query_params'] = dict(request.args)
        
        return context
    
    def _log_with_context(self, level: int, message: str, extra_data: Dict[str, Any] = None, 
                         include_request_context: bool = True):
        """Log message with enhanced context"""
        record = self.logger.makeRecord(
            self.logger.name, level, "", 0, message, (), None
        )
        
        # Add extra data
        if extra_data:
            record.extra_data = extra_data
        
        # Add request context
        if include_request_context:
            record.request_context = self._get_request_context()
        
        self.logger.handle(record)
    
    def debug(self, message: str, extra_data: Dict[str, Any] = None, 
              include_request_context: bool = True):
        """Log debug message with context"""
        self._log_with_context(logging.DEBUG, message, extra_data, include_request_context)
    
    def info(self, message: str, extra_data: Dict[str, Any] = None, 
             include_request_context: bool = True):
        """Log info message with context"""
        self._log_with_context(logging.INFO, message, extra_data, include_request_context)
    
    def warning(self, message: str, extra_data: Dict[str, Any] = None, 
                include_request_context: bool = True):
        """Log warning message with context"""
        self._log_with_context(logging.WARNING, message, extra_data, include_request_context)
    
    def error(self, message: str, extra_data: Dict[str, Any] = None, 
              include_request_context: bool = True):
        """Log error message with context"""
        self._log_with_context(logging.ERROR, message, extra_data, include_request_context)
    
    def critical(self, message: str, extra_data: Dict[str, Any] = None, 
                 include_request_context: bool = True):
        """Log critical message with context"""
        self._log_with_context(logging.CRITICAL, message, extra_data, include_request_context)
    
    def log_exception(self, exception: Exception, context: Dict[str, Any] = None, 
                      include_traceback: bool = True):
        """Log exception with full context and traceback"""
        extra_data = {
            'exception_type': type(exception).__name__,
            'exception_message': str(exception),
            'context': context or {}
        }
        
        if include_traceback:
            extra_data['traceback'] = traceback.format_exc()
        
        # Add specific context for different exception types
        if isinstance(exception, jinja2.TemplateError):
            extra_data['template_error'] = {
                'filename': getattr(exception, 'filename', 'Unknown'),
                'lineno': getattr(exception, 'lineno', 'Unknown'),
                'name': getattr(exception, 'name', 'Unknown')
            }
        elif isinstance(exception, SQLAlchemyError):
            extra_data['database_error'] = {
                'error_type': type(exception).__name__,
                'sql': getattr(exception, 'sql', 'Unknown'),
                'params': getattr(exception, 'params', 'Unknown')
            }
        elif isinstance(exception, HTTPException):
            extra_data['http_error'] = {
                'status_code': exception.code,
                'description': exception.description
            }
        
        self.error(f"Exception: {type(exception).__name__}: {exception}", extra_data)
    
    def log_function_call(self, func_name: str, args: tuple = None, kwargs: dict = None, 
                         result: Any = None, duration: float = None):
        """Log function call details"""
        extra_data = {
            'function_name': func_name,
            'duration': duration
        }
        
        if args:
            extra_data['args'] = str(args)
        if kwargs:
            # Sanitize kwargs to remove sensitive data
            sanitized_kwargs = {k: v for k, v in kwargs.items() 
                              if k not in ['password', 'token', 'secret']}
            extra_data['kwargs'] = str(sanitized_kwargs)
        if result is not None:
            extra_data['result'] = str(result)
        
        self.debug(f"Function call: {func_name}", extra_data)
    
    def log_database_query(self, query: str, params: tuple = None, duration: float = None, 
                          slow_query_threshold: float = 1.0):
        """Log database query with performance metrics"""
        extra_data = {
            'query_type': 'database',
            'query': query[:200] + "..." if len(query) > 200 else query,
            'params': str(params) if params else None,
            'duration': duration
        }
        
        if duration and duration > slow_query_threshold:
            self.warning(f"Slow database query detected ({duration:.3f}s)", extra_data)
        else:
            self.debug(f"Database query executed ({duration:.3f}s)", extra_data)
    
    def log_template_rendering(self, template_name: str, context: Dict[str, Any] = None, 
                              duration: float = None):
        """Log template rendering details"""
        extra_data = {
            'template_name': template_name,
            'context_keys': list(context.keys()) if context else [],
            'duration': duration
        }
        
        self.debug(f"Template rendered: {template_name}", extra_data)
    
    def log_security_event(self, event_type: str, details: Dict[str, Any], 
                          severity: str = "INFO"):
        """Log security-related events"""
        extra_data = {
            'security_event': event_type,
            'severity': severity,
            'details': details
        }
        
        if severity.upper() == "HIGH":
            self.critical(f"High severity security event: {event_type}", extra_data)
        elif severity.upper() == "MEDIUM":
            self.warning(f"Medium severity security event: {event_type}", extra_data)
        else:
            self.info(f"Security event: {event_type}", extra_data)
    
    def log_performance_metrics(self, operation: str, duration: float, 
                               additional_metrics: Dict[str, Any] = None):
        """Log performance metrics"""
        # Only log if operation is significant or slow
        if duration < 0.1 and 'error' not in operation.lower():
            return  # Skip logging for fast operations
        
        extra_data = {
            'performance_operation': operation,
            'duration': duration,
            'metrics': additional_metrics or {}
        }
        
        # Only add memory usage for slow operations or errors
        if duration > 1.0 or 'error' in operation.lower():
            try:
                process = psutil.Process()
                memory_info = process.memory_info()
                extra_data['memory_usage'] = {
                    'rss_mb': memory_info.rss / (1024 * 1024),
                    'vms_mb': memory_info.vms / (1024 * 1024),
                    'percent': process.memory_percent()
                }
            except Exception:
                pass
        
        # Use different log levels based on duration
        if duration > 2.0:
            self.warning(f"Slow operation: {operation} completed in {duration:.3f}s", extra_data)
        elif duration > 0.5:
            self.info(f"Performance: {operation} completed in {duration:.3f}s", extra_data)
        else:
            self.debug(f"Performance: {operation} completed in {duration:.3f}s", extra_data)

class PerformanceLogger:
    """Context manager for performance logging"""
    
    def __init__(self, logger: EnhancedLogger, operation: str, 
                 additional_context: Dict[str, Any] = None):
        self.logger = logger
        self.operation = operation
        self.additional_context = additional_context or {}
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.debug(f"Starting operation: {self.operation}", self.additional_context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        
        if exc_type is not None:
            self.logger.log_exception(exc_val, {
                'operation': self.operation,
                'duration': duration,
                **self.additional_context
            })
        else:
            self.logger.log_performance_metrics(self.operation, duration, self.additional_context)

def performance_log(operation: str = None, additional_context: Dict[str, Any] = None):
    """Decorator for performance logging"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            op_name = operation or f"{func.__module__}.{func.__name__}"
            logger = EnhancedLogger(func.__module__)
            
            with PerformanceLogger(logger, op_name, additional_context):
                return func(*args, **kwargs)
        return wrapper
    return decorator

def log_function_calls(func_name: str = None, include_args: bool = True, 
                      include_result: bool = False):
    """Decorator to log function calls with detailed context"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = EnhancedLogger(func.__module__)
            op_name = func_name or f"{func.__module__}.{func.__name__}"
            
            start_time = time.time()
            
            # Log function entry
            logger.log_function_call(op_name, args if include_args else None, 
                                   kwargs if include_args else None)
            
            try:
                result = func(*args, **kwargs)
                duration = time.time() - start_time
                
                # Log function exit
                logger.log_function_call(op_name, result=result if include_result else None, 
                                       duration=duration)
                
                return result
                
            except Exception as e:
                duration = time.time() - start_time
                logger.log_exception(e, {
                    'function': op_name,
                    'duration': duration
                })
                raise
        
        return wrapper
    return decorator

# Global logger instance
_enhanced_logger = None

def get_enhanced_logger(name: str = "PipLinePro") -> EnhancedLogger:
    """Get enhanced logger instance"""
    global _enhanced_logger
    if _enhanced_logger is None:
        _enhanced_logger = EnhancedLogger(name)
    return _enhanced_logger

def setup_enhanced_logging(app):
    """Setup enhanced logging for Flask app"""
    logger = get_enhanced_logger("PipLinePro")
    
    # Log application startup information
    # Only show initialization info in production or with SHOW_SYSTEM_INFO=True
    import os
    if os.environ.get('SHOW_SYSTEM_INFO') == 'True' or not (os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'True'):
        logger.info("=== Enhanced Logging System Initialized ===")
        logger.info(f"Application: {app.name}")
        logger.info(f"Environment: {app.config.get('ENV', 'development')}")
        logger.info(f"Debug Mode: {app.config.get('DEBUG', False)}")
        logger.info(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    
    # Log system information only in production or with SHOW_SYSTEM_INFO=True
    import os
    if os.environ.get('SHOW_SYSTEM_INFO') == 'True' or not (os.environ.get('FLASK_ENV') == 'development' or os.environ.get('DEBUG') == 'True'):
        try:
            logger.info("=== System Information ===")
            logger.info(f"Platform: {platform.platform()}")
            logger.info(f"Python Version: {sys.version}")
            logger.info(f"CPU Count: {psutil.cpu_count()}")
            logger.info(f"Memory: {psutil.virtual_memory().total / (1024**3):.2f} GB")
            logger.info(f"Disk Usage: {psutil.disk_usage('/').percent:.1f}%")
            logger.info("=== End System Information ===")
        except Exception as e:
            logger.warning(f"Could not log system information: {e}")
    
    return logger 