"""
Error recovery utilities for PipLinePro
"""
import logging
from functools import wraps
from flask import jsonify

logger = logging.getLogger(__name__)

def safe_database_operation(operation_name="Database operation"):
    """
    Decorator to safely handle database operations with automatic recovery
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(f"Error in {operation_name}: {str(e)}")
                logger.error(f"Error type: {type(e).__name__}")
                
                # Try to rollback database session
                try:
                    from app import db
                    db.session.rollback()
                    logger.info("Database session rolled back successfully")
                except Exception as rollback_error:
                    logger.error(f"Failed to rollback database session: {rollback_error}")
                
                # Return appropriate error response
                if hasattr(func, '__name__') and 'api' in func.__name__:
                    return jsonify({
                        'error': f'Failed to {operation_name.lower()}',
                        'message': str(e),
                        'operation': operation_name
                    }), 500
                else:
                    raise e
        return wrapper
    return decorator

def safe_import(module_name, fallback_value=None):
    """
    Safely import a module with fallback handling
    """
    try:
        module = __import__(module_name, fromlist=['*'])
        return module
    except ImportError as e:
        logger.warning(f"Failed to import {module_name}: {e}")
        return fallback_value
    except Exception as e:
        logger.error(f"Unexpected error importing {module_name}: {e}")
        return fallback_value

def validate_date_range(start_date, end_date, max_days=365):
    """
    Validate date range parameters
    """
    if start_date and end_date:
        if start_date > end_date:
            raise ValueError("Start date cannot be after end date")
        
        days_diff = (end_date - start_date).days
        if days_diff > max_days:
            raise ValueError(f"Date range cannot exceed {max_days} days")
    
    return True

def safe_float_conversion(value, default=0.0):
    """
    Safely convert value to float with fallback
    """
    try:
        if value is None:
            return default
        return float(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to convert {value} to float: {e}")
        return default

def safe_int_conversion(value, default=0):
    """
    Safely convert value to int with fallback
    """
    try:
        if value is None:
            return default
        return int(value)
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to convert {value} to int: {e}")
        return default
