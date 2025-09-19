"""
Unified Logging System for PipLinePro
Consolidates all logging functionality into a single, efficient system
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


class UnifiedLogger:
    """Unified logging system that handles all logging needs"""
    
    def __init__(self, name: str = "PipLinePro"):
        self.name = name
        self.logger = logging.getLogger(name)
        self.is_development = self._is_development()
        self._setup_logger()
    
    def _is_development(self) -> bool:
        """Check if we're in development mode"""
        return (os.environ.get('FLASK_ENV') == 'development' or 
                os.environ.get('DEBUG') == 'True' or 
                os.environ.get('FLASK_DEBUG') == '1')
    
    def _setup_logger(self):
        """Setup the logger based on environment"""
        # Clear existing handlers to prevent duplicates
        self.logger.handlers.clear()
        
        # Set level based on environment
        if self.is_development:
            self.logger.setLevel(logging.INFO)
        else:
            self.logger.setLevel(logging.WARNING)
        
        # Create console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(logging.INFO)
        
        # Create formatter
        if self.is_development:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%H:%M:%S'
            )
        else:
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
        
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)
        
        # Always add file handler (both development and production)
        self._setup_file_handler()
    
    def _setup_file_handler(self):
        """Setup file handler for both development and production"""
        try:
            # Ensure logs directory exists
            os.makedirs('logs', exist_ok=True)
            
            # Create rotating file handler for main log
            main_file_handler = logging.handlers.RotatingFileHandler(
                'logs/pipelinepro_enhanced.log',
                maxBytes=5*1024*1024,  # 5MB
                backupCount=3,
                encoding='utf-8',
                delay=True
            )
            main_file_handler.setLevel(logging.INFO)
            
            # Create formatter
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            main_file_handler.setFormatter(formatter)
            self.logger.addHandler(main_file_handler)
            
            # Create error file handler
            error_file_handler = logging.handlers.RotatingFileHandler(
                'logs/pipelinepro_errors_enhanced.log',
                maxBytes=5*1024*1024,  # 5MB
                backupCount=3,
                encoding='utf-8',
                delay=True
            )
            error_file_handler.setLevel(logging.ERROR)
            error_file_handler.setFormatter(formatter)
            self.logger.addHandler(error_file_handler)
            
            # Create debug file handler for development
            if self.is_development:
                debug_file_handler = logging.handlers.RotatingFileHandler(
                    'logs/pipelinepro_debug_enhanced.log',
                    maxBytes=5*1024*1024,  # 5MB
                    backupCount=2,
                    encoding='utf-8',
                    delay=True
                )
                debug_file_handler.setLevel(logging.DEBUG)
                debug_file_handler.setFormatter(formatter)
                self.logger.addHandler(debug_file_handler)
                
        except Exception as e:
            # Use print since logger might not be available
            print(f"Failed to setup file handler: {e}")
    
    def info(self, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """Log info message"""
        if extra_data:
            message = f"{message} | {json.dumps(extra_data)}"
        self.logger.info(message)
    
    def warning(self, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """Log warning message"""
        if extra_data:
            message = f"{message} | {json.dumps(extra_data)}"
        self.logger.warning(message)
    
    def error(self, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """Log error message"""
        if extra_data:
            message = f"{message} | {json.dumps(extra_data)}"
        self.logger.error(message)
    
    def debug(self, message: str, extra_data: Optional[Dict[str, Any]] = None):
        """Log debug message (only in development)"""
        if self.is_development:
            if extra_data:
                message = f"{message} | {json.dumps(extra_data)}"
            self.logger.debug(message)
    
    def log_performance(self, operation: str, duration: float, extra_data: Optional[Dict[str, Any]] = None):
        """Log performance metrics"""
        if duration > 1.0 or not self.is_development:  # Log slow operations or in production
            data = {'operation': operation, 'duration': duration}
            if extra_data:
                data.update(extra_data)
            self.warning(f"Performance: {operation} took {duration:.2f}s", data)
    
    def log_request(self, method: str, path: str, status_code: int, duration: float):
        """Log HTTP request"""
        if status_code >= 400 or duration > 0.5:  # Log errors or slow requests
            self.warning(f"Request: {method} {path} - {status_code} ({duration:.2f}s)")
        elif not self.is_development:  # Log all requests in production
            self.info(f"Request: {method} {path} - {status_code} ({duration:.2f}s)")
    
    def log_database_operation(self, operation: str, duration: float, query_count: int = 1):
        """Log database operations"""
        if duration > 0.1 or query_count > 10:  # Log slow operations or high query count
            self.warning(f"Database: {operation} - {duration:.2f}s ({query_count} queries)")
    
    def log_security_event(self, event_type: str, details: str, extra_data: Optional[Dict[str, Any]] = None):
        """Log security events"""
        data = {'event_type': event_type, 'details': details}
        if extra_data:
            data.update(extra_data)
        self.warning(f"Security: {event_type} - {details}", data)


# Global logger instance
_logger_instance = None

def get_logger(name: str = "PipLinePro") -> UnifiedLogger:
    """Get or create a logger instance"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = UnifiedLogger(name)
    return _logger_instance

def setup_logging(app):
    """Setup logging for Flask app"""
    logger = get_logger("PipLinePro")
    
    # Configure Flask's logger
    app.logger.setLevel(logging.INFO)
    
    # Remove default handlers
    for handler in app.logger.handlers[:]:
        app.logger.removeHandler(handler)
    
    # Add our unified logger
    app.logger.addHandler(logger.logger.handlers[0])
    
    return logger

def log_function_call(func):
    """Decorator to log function calls"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger("FunctionCall")
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.debug(f"Function {func.__name__} completed in {duration:.2f}s")
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"Function {func.__name__} failed after {duration:.2f}s: {str(e)}")
            raise
    
    return wrapper

def log_api_call(func):
    """Decorator to log API calls"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        logger = get_logger("APICall")
        start_time = time.time()
        
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            logger.log_performance(f"API {func.__name__}", duration)
            return result
        except Exception as e:
            duration = time.time() - start_time
            logger.error(f"API {func.__name__} failed after {duration:.2f}s: {str(e)}")
            raise
    
    return wrapper
