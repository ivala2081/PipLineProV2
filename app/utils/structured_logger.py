"""
Structured logging utilities for PipLinePro
"""
import json
import logging
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path

class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging"""
    
    def format(self, record):
        log_entry = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, 'user_id'):
            log_entry['user_id'] = record.user_id
        if hasattr(record, 'request_id'):
            log_entry['request_id'] = record.request_id
        if hasattr(record, 'execution_time'):
            log_entry['execution_time'] = record.execution_time
        if hasattr(record, 'query_name'):
            log_entry['query_name'] = record.query_name
        if hasattr(record, 'cache_hit'):
            log_entry['cache_hit'] = record.cache_hit
        if hasattr(record, 'api_endpoint'):
            log_entry['api_endpoint'] = record.api_endpoint
        if hasattr(record, 'response_code'):
            log_entry['response_code'] = record.response_code
        
        return json.dumps(log_entry, ensure_ascii=False)

class PipLineLogger:
    """Enhanced logger for PipLinePro with structured logging"""
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup logger with structured formatting"""
        if not self.logger.handlers:
            # Create logs directory if it doesn't exist
            logs_dir = Path('logs')
            logs_dir.mkdir(exist_ok=True)
            
            # Console handler
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)
            console_formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
            )
            console_handler.setFormatter(console_formatter)
            
            # File handler for structured logs
            file_handler = logging.FileHandler('logs/pipelinepro_structured.log')
            file_handler.setLevel(logging.INFO)
            file_handler.setFormatter(StructuredFormatter())
            
            # Error file handler
            error_handler = logging.FileHandler('logs/pipelinepro_errors.log')
            error_handler.setLevel(logging.ERROR)
            error_handler.setFormatter(StructuredFormatter())
            
            # Performance file handler
            perf_handler = logging.FileHandler('logs/pipelinepro_performance.log')
            perf_handler.setLevel(logging.INFO)
            perf_handler.setFormatter(StructuredFormatter())
            
            # Add filters for different log types
            error_handler.addFilter(lambda record: record.levelno >= logging.ERROR)
            perf_handler.addFilter(lambda record: hasattr(record, 'execution_time'))
            
            self.logger.addHandler(console_handler)
            self.logger.addHandler(file_handler)
            self.logger.addHandler(error_handler)
            self.logger.addHandler(perf_handler)
            
            self.logger.setLevel(logging.INFO)
    
    def info(self, message: str, **kwargs):
        """Log info message with extra fields"""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with extra fields"""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, **kwargs):
        """Log error message with extra fields"""
        self.logger.error(message, extra=kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with extra fields"""
        self.logger.debug(message, extra=kwargs)
    
    def critical(self, message: str, **kwargs):
        """Log critical message with extra fields"""
        self.logger.critical(message, extra=kwargs)
    
    def log_api_request(self, endpoint: str, method: str, user_id: Optional[int] = None, 
                       response_code: int = 200, execution_time: float = 0.0, **kwargs):
        """Log API request with structured data"""
        self.info(
            f"API Request: {method} {endpoint}",
            api_endpoint=endpoint,
            method=method,
            user_id=user_id,
            response_code=response_code,
            execution_time=execution_time,
            **kwargs
        )
    
    def log_database_query(self, query_name: str, execution_time: float, 
                          success: bool = True, **kwargs):
        """Log database query with performance data"""
        level = logging.INFO if success else logging.ERROR
        message = f"Database Query: {query_name} ({'success' if success else 'failed'})"
        
        self.logger.log(
            level,
            message,
            extra={
                'query_name': query_name,
                'execution_time': execution_time,
                'success': success,
                **kwargs
            }
        )
    
    def log_cache_operation(self, operation: str, key: str, hit: bool = True, 
                           execution_time: float = 0.0, **kwargs):
        """Log cache operation with performance data"""
        self.info(
            f"Cache {operation}: {key} ({'hit' if hit else 'miss'})",
            cache_operation=operation,
            cache_key=key,
            cache_hit=hit,
            execution_time=execution_time,
            **kwargs
        )
    
    def log_business_event(self, event_type: str, description: str, 
                          user_id: Optional[int] = None, **kwargs):
        """Log business events with structured data"""
        self.info(
            f"Business Event: {event_type} - {description}",
            event_type=event_type,
            description=description,
            user_id=user_id,
            **kwargs
        )
    
    def log_security_event(self, event_type: str, description: str, 
                          severity: str = 'medium', **kwargs):
        """Log security events with structured data"""
        level = logging.CRITICAL if severity == 'high' else logging.WARNING
        self.logger.log(
            level,
            f"Security Event: {event_type} - {description}",
            extra={
                'event_type': event_type,
                'description': description,
                'severity': severity,
                **kwargs
            }
        )

def get_structured_logger(name: str) -> PipLineLogger:
    """Get a structured logger instance"""
    return PipLineLogger(name)

# Global loggers for different components
api_logger = get_structured_logger('app.api')
db_logger = get_structured_logger('app.database')
cache_logger = get_structured_logger('app.cache')
security_logger = get_structured_logger('app.security')
business_logger = get_structured_logger('app.business')
performance_logger = get_structured_logger('app.performance')
