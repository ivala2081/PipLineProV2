"""
Performance monitoring utilities for PipLinePro
"""
import time
import logging
from functools import wraps
from flask import request, g

logger = logging.getLogger(__name__)

def monitor_performance(operation_name=None):
    """
    Decorator to monitor function performance
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            operation = operation_name or func.__name__
            
            try:
                result = func(*args, **kwargs)
                execution_time = time.time() - start_time
                
                # Log performance metrics
                logger.info(f"Performance: {operation} completed in {execution_time:.3f}s")
                
                # Add performance data to Flask g object for response headers
                if hasattr(g, 'performance_metrics'):
                    g.performance_metrics[operation] = execution_time
                else:
                    g.performance_metrics = {operation: execution_time}
                
                # Log slow operations
                if execution_time > 1.0:  # More than 1 second
                    logger.warning(f"Slow operation detected: {operation} took {execution_time:.3f}s")
                
                return result
                
            except Exception as e:
                execution_time = time.time() - start_time
                logger.error(f"Performance: {operation} failed after {execution_time:.3f}s - {str(e)}")
                raise
                
        return wrapper
    return decorator

def log_database_query_performance():
    """
    Log database query performance metrics
    """
    def log_query(query, parameters=None, duration=None):
        if duration and duration > 0.5:  # Log queries taking more than 500ms
            logger.warning(f"Slow database query detected: {duration:.3f}s - {str(query)}")
        elif duration:
            logger.debug(f"Database query: {duration:.3f}s - {str(query)}")
    
    return log_query

def get_performance_summary():
    """
    Get performance summary for current request
    """
    if hasattr(g, 'performance_metrics'):
        total_time = sum(g.performance_metrics.values())
        return {
            'total_time': total_time,
            'operations': g.performance_metrics,
            'slow_operations': {k: v for k, v in g.performance_metrics.items() if v > 1.0}
        }
    return None

def add_performance_headers(response):
    """
    Add performance headers to response
    """
    if hasattr(g, 'performance_metrics'):
        total_time = sum(g.performance_metrics.values())
        response.headers['X-Response-Time'] = f"{total_time:.3f}s"
        response.headers['X-Performance-Operations'] = str(len(g.performance_metrics))
    
    return response
