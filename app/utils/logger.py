"""
Comprehensive Logging System for PipLinePro
Provides structured logging for debugging, monitoring, and error tracking
"""
import logging
import logging.handlers
import os
import sys
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import json
import traceback
from functools import wraps
import time
import platform
import psutil

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


# Configure base logging
def setup_logging(app_name: str = "PipLinePro", log_level: str = "INFO", 
                  log_dir: str = "logs", max_log_size: int = 10 * 1024 * 1024,  # 10MB
                  backup_count: int = 10):
    """
    Setup comprehensive logging system
    
    Args:
        app_name: Name of the application
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_dir: Directory to store log files
        max_log_size: Maximum size of log files before rotation
        backup_count: Number of backup log files to keep
    """
    
    # Create logs directory if it doesn't exist
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)
    
    # Configure logging level
    level = getattr(logging, log_level.upper(), logging.INFO)
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s '
        '[%(filename)s:%(funcName)s]'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s - %(message)s'
    )
    
    json_formatter = logging.Formatter(
        '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", '
        '"message": "%(message)s", "file": "%(filename)s", "line": %(lineno)d, '
        '"function": "%(funcName)s"}'
    )
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Console handler for development
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)
    console_handler.setFormatter(simple_formatter)
    root_logger.addHandler(console_handler)
    
    # File handlers
    handlers = []
    
    # Main application log - with proper file handle management
    app_log_file = os.path.join(log_dir, f"{app_name.lower()}.log")
    app_handler = logging.handlers.RotatingFileHandler(
        app_log_file, 
        maxBytes=2*1024*1024,  # Reduced to 2MB
        backupCount=3,
        encoding='utf-8',
        delay=True  # Delay file opening to prevent permission issues
    )
    app_handler.setLevel(level)
    app_handler.setFormatter(detailed_formatter)
    handlers.append(app_handler)
    
    # Error log - with proper file handle management
    error_log_file = os.path.join(log_dir, f"{app_name.lower()}_errors.log")
    error_handler = logging.handlers.RotatingFileHandler(
        error_log_file, 
        maxBytes=2*1024*1024,  # Reduced to 2MB
        backupCount=3,
        encoding='utf-8',
        delay=True  # Delay file opening to prevent permission issues
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    handlers.append(error_handler)
    
    # Debug log - with proper file handle management
    if level <= logging.DEBUG:
        debug_log_file = os.path.join(log_dir, f"{app_name.lower()}_debug.log")
        debug_handler = logging.handlers.RotatingFileHandler(
            debug_log_file, 
            maxBytes=2*1024*1024,  # Reduced to 2MB
            backupCount=2,  # Minimal backup count
            encoding='utf-8',
            delay=True  # Delay file opening to prevent permission issues
        )
        debug_handler.setLevel(logging.DEBUG)
        debug_handler.setFormatter(detailed_formatter)
        handlers.append(debug_handler)
    
    # Performance log - with proper file handle management
    perf_log_file = os.path.join(log_dir, f"{app_name.lower()}_performance.log")
    perf_handler = logging.handlers.RotatingFileHandler(
        perf_log_file, 
        maxBytes=2*1024*1024,  # Reduced to 2MB
        backupCount=2,  # Minimal backup count
        encoding='utf-8',
        delay=True  # Delay file opening to prevent permission issues
    )
    perf_handler.setLevel(logging.INFO)
    perf_handler.setFormatter(json_formatter)
    handlers.append(perf_handler)
    
    # Add all handlers to root logger
    for handler in handlers:
        root_logger.addHandler(handler)
    
    # Create application logger
    app_logger = logging.getLogger(app_name)
    
    # Log system information
    log_system_info(app_logger)
    
    return app_logger

def log_system_info(logger):
    """Log system information for debugging - only in production or with SHOW_SYSTEM_INFO=True"""
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

class PerformanceLogger:
    """Context manager for performance logging"""
    
    def __init__(self, logger, operation_name: str, context: Dict[str, Any] = None):
        self.logger = logger
        self.operation_name = operation_name
        self.context = context or {}
        self.start_time = None
    
    def __enter__(self):
        self.start_time = time.time()
        self.logger.debug(f"Starting operation: {self.operation_name}", extra=self.context)
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        duration = time.time() - self.start_time
        status = "SUCCESS" if exc_type is None else "FAILED"
        
        log_data = {
            "operation": self.operation_name,
            "duration": duration,
            "status": status,
            "context": self.context
        }
        
        if exc_type is not None:
            log_data["error"] = str(exc_val)
            log_data["traceback"] = traceback.format_exc()
            self.logger.error(f"Operation failed: {self.operation_name} ({duration:.3f}s)", 
                            extra=log_data)
        else:
            self.logger.info(f"Operation completed: {self.operation_name} ({duration:.3f}s)", 
                           extra=log_data)

def performance_log(operation_name: str = None, context: Dict[str, Any] = None):
    """Decorator for performance logging"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            logger = logging.getLogger(func.__module__)
            
            with PerformanceLogger(logger, op_name, context):
                return func(*args, **kwargs)
        return wrapper
    return decorator

class DatabaseLogger:
    """Database query logging"""
    
    def __init__(self, logger):
        self.logger = logger
        self.query_count = 0
        self.total_time = 0.0
        self.slow_query_threshold = 1.0  # seconds
    
    def log_query(self, query: str, params: tuple = None, duration: float = 0.0):
        """Log database query with performance metrics"""
        self.query_count += 1
        self.total_time += duration
        
        log_data = {
            "query": query,
            "params": params,
            "duration": duration,
            "query_count": self.query_count,
            "total_time": self.total_time
        }
        
        if duration > self.slow_query_threshold:
            self.logger.warning(f"Slow query detected ({duration:.3f}s): {query[:100]}...", 
                              extra=log_data)
        else:
            self.logger.debug(f"Database query ({duration:.3f}s): {query[:100]}...", 
                            extra=log_data)
    
    def get_stats(self):
        """Get database query statistics"""
        return {
            "total_queries": self.query_count,
            "total_time": self.total_time,
            "average_time": self.total_time / self.query_count if self.query_count > 0 else 0
        }

class SecurityLogger:
    """Security event logging"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def log_login_attempt(self, username: str, ip_address: str, success: bool, 
                         failure_reason: str = None):
        """Log login attempts"""
        log_data = {
            "event": "login_attempt",
            "username": username,
            "ip_address": ip_address,
            "success": success,
            "failure_reason": failure_reason,
            "user_agent": "N/A"  # Will be filled by request context
        }
        
        if success:
            self.logger.info(f"Successful login: {username} from {ip_address}", extra=log_data)
        else:
            self.logger.warning(f"Failed login: {username} from {ip_address} - {failure_reason}", 
                              extra=log_data)
    
    def log_access_attempt(self, user_id: int, resource: str, action: str, 
                          success: bool, ip_address: str = None):
        """Log access attempts to resources"""
        log_data = {
            "event": "access_attempt",
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "success": success,
            "ip_address": ip_address
        }
        
        if success:
            self.logger.info(f"Access granted: User {user_id} {action} {resource}", extra=log_data)
        else:
            self.logger.warning(f"Access denied: User {user_id} {action} {resource}", extra=log_data)
    
    def log_suspicious_activity(self, activity_type: str, details: Dict[str, Any], 
                               ip_address: str = None):
        """Log suspicious activities"""
        log_data = {
            "event": "suspicious_activity",
            "activity_type": activity_type,
            "details": details,
            "ip_address": ip_address,
            "severity": "HIGH"
        }
        
        self.logger.error(f"Suspicious activity detected: {activity_type}", extra=log_data)

class RequestLogger:
    """HTTP request logging"""
    
    def __init__(self, logger):
        self.logger = logger
    
    def log_request(self, request, response=None, duration: float = 0.0):
        """Log HTTP request details"""
        log_data = {
            "method": request.method,
            "url": request.url,
            "ip_address": request.remote_addr,
            "user_agent": request.headers.get('User-Agent', 'Unknown'),
            "duration": duration,
            "status_code": response.status_code if response else None,
            "content_length": response.content_length if response else None
        }
        
        # Add user information if available
        if hasattr(request, 'user_id'):
            log_data["user_id"] = request.user_id
        
        # Determine log level based on status code
        if response and response.status_code >= 400:
            self.logger.warning(f"HTTP {response.status_code}: {request.method} {request.url}", 
                              extra=log_data)
        else:
            self.logger.info(f"HTTP {response.status_code if response else 'N/A'}: "
                           f"{request.method} {request.url} ({duration:.3f}s)", extra=log_data)

def log_function_call(func_name: str = None, include_args: bool = True, 
                     include_result: bool = False, log_level: str = "DEBUG"):
    """Decorator to log function calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            logger = logging.getLogger(func.__module__)
            level = getattr(logging, log_level.upper(), logging.DEBUG)
            
            func_name_to_log = func_name or f"{func.__module__}.{func.__name__}"
            
            # Log function entry
            log_data = {"function": func_name_to_log}
            if include_args:
                log_data["args"] = str(args)
                log_data["kwargs"] = str(kwargs)
            
            logger.log(level, f"Entering function: {func_name_to_log}", extra=log_data)
            
            try:
                result = func(*args, **kwargs)
                
                # Log function exit
                exit_log_data = {"function": func_name_to_log, "status": "SUCCESS"}
                if include_result:
                    exit_log_data["result"] = str(result)
                
                logger.log(level, f"Exiting function: {func_name_to_log}", extra=exit_log_data)
                return result
                
            except Exception as e:
                # Log function error
                error_log_data = {
                    "function": func_name_to_log,
                    "status": "ERROR",
                    "error": str(e),
                    "traceback": traceback.format_exc()
                }
                logger.error(f"Function error: {func_name_to_log} - {e}", extra=error_log_data)
                raise
        
        return wrapper
    return decorator

def log_exception(logger, exception: Exception, context: Dict[str, Any] = None):
    """Log exception with full context"""
    log_data = {
        "exception_type": type(exception).__name__,
        "exception_message": str(exception),
        "traceback": traceback.format_exc(),
        "context": context or {}
    }
    
    logger.error(f"Exception occurred: {type(exception).__name__}: {exception}", extra=log_data)

def log_memory_usage(logger, operation: str = "Memory Check"):
    """Log current memory usage"""
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        memory_percent = process.memory_percent()
        
        log_data = {
            "operation": operation,
            "rss_mb": memory_info.rss / (1024 * 1024),
            "vms_mb": memory_info.vms / (1024 * 1024),
            "memory_percent": memory_percent,
            "cpu_percent": process.cpu_percent()
        }
        
        logger.info(f"Memory usage: {log_data['rss_mb']:.1f}MB RSS, "
                   f"{log_data['memory_percent']:.1f}% of system", extra=log_data)
        
    except Exception as e:
        logger.warning(f"Could not log memory usage: {e}")

def log_database_stats(logger, db_stats: Dict[str, Any]):
    """Log database statistics"""
    log_data = {
        "event": "database_stats",
        "stats": db_stats
    }
    
    logger.info(f"Database stats: {db_stats.get('total_queries', 0)} queries, "
               f"avg time: {db_stats.get('average_time', 0):.3f}s", extra=log_data)

# Global logger instance
_app_logger = None

def get_logger(name: str = None) -> logging.Logger:
    """Get logger instance"""
    global _app_logger
    if _app_logger is None:
        _app_logger = setup_logging()
    
    if name:
        return logging.getLogger(name)
    return _app_logger

def configure_app_logging(app):
    """Configure logging for Flask app"""
    logger = get_logger("PipLinePro")
    
    # Log application startup
    logger.info("=== Application Startup ===")
    logger.info(f"Application: {app.name}")
    logger.info(f"Environment: {app.config.get('ENV', 'development')}")
    logger.info(f"Debug Mode: {app.config.get('DEBUG', False)}")
    logger.info(f"Database URI: {app.config.get('SQLALCHEMY_DATABASE_URI', 'Not set')}")
    
    # Log configuration
    config_to_log = {
        'SECRET_KEY': '***' if app.config.get('SECRET_KEY') else 'Not set',
        'SQLALCHEMY_TRACK_MODIFICATIONS': app.config.get('SQLALCHEMY_TRACK_MODIFICATIONS'),
        'SESSION_COOKIE_SECURE': app.config.get('SESSION_COOKIE_SECURE'),
        'PERMANENT_SESSION_LIFETIME': str(app.config.get('PERMANENT_SESSION_LIFETIME')),
    }
    
    for key, value in config_to_log.items():
        logger.info(f"Config {key}: {value}")
    
    logger.info("=== End Application Startup ===")
    
    return logger 