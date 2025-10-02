"""
Logging Configuration Utility
Provides easy control over logging verbosity
"""

import logging
import os

def configure_logging_level(level='INFO'):
    """
    Configure the logging level for the application
    
    Args:
        level (str): Logging level ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')
    """
    # Set the logging level
    numeric_level = getattr(logging, level.upper(), None)
    if not isinstance(numeric_level, int):
        raise ValueError(f'Invalid log level: {level}')
    
    # Configure root logger
    logging.basicConfig(level=numeric_level)
    
    # Configure specific loggers
    loggers = [
        'app.api.v1.endpoints.financial_performance',
        'app.services.historical_exchange_service',
        'app.api.v1.endpoints.analytics',
        'app.api.v1.endpoints.transactions',
        'app.services.exchange_rate_service',
        'app.services.psp_options_service'
    ]
    
    for logger_name in loggers:
        logger = logging.getLogger(logger_name)
        logger.setLevel(numeric_level)
    
    print(f"Logging level set to: {level.upper()}")

def set_quiet_mode():
    """Set logging to WARNING level for minimal output"""
    configure_logging_level('WARNING')

def set_normal_mode():
    """Set logging to INFO level for normal output"""
    configure_logging_level('INFO')

def set_debug_mode():
    """Set logging to DEBUG level for detailed output"""
    configure_logging_level('DEBUG')

# Environment variable control
if os.getenv('LOG_LEVEL'):
    configure_logging_level(os.getenv('LOG_LEVEL'))
elif os.getenv('QUIET_MODE', '').lower() in ['true', '1', 'yes']:
    set_quiet_mode()