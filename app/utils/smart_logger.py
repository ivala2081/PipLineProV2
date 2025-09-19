"""
Smart Logger - Automatically chooses between development and production logging
"""
import os
from app.utils.dev_logger import get_dev_logger
from app.utils.enhanced_logger import get_enhanced_logger as get_production_logger


def get_smart_logger(name: str = "PipLinePro"):
    """
    Get appropriate logger based on environment
    - Development: Minimal logging (errors only)
    - Production: Full enhanced logging
    """
    is_development = (
        os.environ.get('FLASK_ENV') == 'development' or 
        os.environ.get('DEBUG') == 'True'
    )
    
    if is_development:
        return get_dev_logger(name)
    else:
        return get_production_logger(name)


# Alias for backward compatibility
get_enhanced_logger = get_smart_logger
