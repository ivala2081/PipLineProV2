"""
Simple Development Logger
Minimal logging for clean development experience
"""
import logging
import sys
from typing import Optional


class DevLogger:
    """Simple logger for development with minimal output"""
    
    def __init__(self, name: str = "PipLinePro"):
        self.logger = logging.getLogger(name)
        self._setup_logger()
    
    def _setup_logger(self):
        """Setup minimal logging for development"""
        if self.logger.handlers:
            return  # Already configured
        
        # Set level to WARNING for minimal output (errors + warnings only)
        self.logger.setLevel(logging.WARNING)
        
        # Create simple console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.WARNING)
        
        # Clean, minimal format
        formatter = logging.Formatter('%(levelname)s: %(message)s')
        handler.setFormatter(formatter)
        
        self.logger.addHandler(handler)
        self.logger.propagate = False
    
    def error(self, message: str, *args, **kwargs):
        """Log error message"""
        self.logger.error(message, *args, **kwargs)
    
    def warning(self, message: str, *args, **kwargs):
        """Log warning message"""
        self.logger.warning(message, *args, **kwargs)
    
    def info(self, message: str, *args, **kwargs):
        """Log info message - suppressed in dev mode"""
        pass  # Suppress all info logs in development
    
    def debug(self, message: str, *args, **kwargs):
        """Log debug message - suppressed in dev mode"""
        pass  # Suppress all debug logs in development


def get_dev_logger(name: str = "PipLinePro") -> DevLogger:
    """Get a development logger instance"""
    return DevLogger(name)


def setup_dev_logging():
    """Setup minimal development logging"""
    # Suppress SQLAlchemy logs
    logging.getLogger('sqlalchemy.engine').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.dialects').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.ERROR)
    logging.getLogger('sqlalchemy.orm').setLevel(logging.ERROR)
    
    # Suppress Flask logs
    logging.getLogger('werkzeug').setLevel(logging.ERROR)
    logging.getLogger('flask.app').setLevel(logging.ERROR)
    
    # Suppress other noisy loggers
    logging.getLogger('urllib3').setLevel(logging.ERROR)
    logging.getLogger('requests').setLevel(logging.ERROR)
    
    return get_dev_logger()
