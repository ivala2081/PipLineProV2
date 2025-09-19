"""
Logging Configuration for PipLinePro
Centralized configuration for all logging settings
"""

import os
from typing import Dict, Any

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


# Base logging configuration
LOGGING_CONFIG = {
    'development': {
        'log_level': 'INFO',  # Changed from DEBUG to INFO
        'log_dir': 'logs',
        'max_log_size': 10 * 1024 * 1024,  # 10MB
        'backup_count': 10,
        'console_output': True,
        'detailed_formatting': False,  # Changed from True to False
        'performance_logging': False,  # Changed from True to False
        'security_logging': True,
        'database_logging': False,  # Changed from True to False
        'request_logging': True,
        'memory_logging': False,  # Changed from True to False
        'slow_query_threshold': 0.5,  # seconds
    },
    'production': {
        'log_level': 'INFO',
        'log_dir': 'logs',
        'max_log_size': 50 * 1024 * 1024,  # 50MB
        'backup_count': 20,
        'console_output': False,
        'detailed_formatting': False,
        'performance_logging': True,
        'security_logging': True,
        'database_logging': False,  # Changed from True to False
        'request_logging': True,
        'memory_logging': False,
        'slow_query_threshold': 1.0,  # seconds
    },
    'testing': {
        'log_level': 'WARNING',  # Changed from DEBUG to WARNING
        'log_dir': 'logs/test',
        'max_log_size': 5 * 1024 * 1024,  # 5MB
        'backup_count': 5,
        'console_output': True,
        'detailed_formatting': False,  # Changed from True to False
        'performance_logging': False,
        'security_logging': False,
        'database_logging': False,
        'request_logging': False,
        'memory_logging': False,
        'slow_query_threshold': 0.1,  # seconds
    }
}

def get_logging_config(environment: str = None) -> Dict[str, Any]:
    """
    Get logging configuration for the specified environment
    
    Args:
        environment: Environment name (development, production, testing)
        
    Returns:
        Dictionary with logging configuration
    """
    if environment is None:
        environment = os.environ.get('FLASK_ENV', 'development')
    
    # Get base config for environment
    config = LOGGING_CONFIG.get(environment, LOGGING_CONFIG['development']).copy()
    
    # Override with environment variables if present
    config['log_level'] = os.environ.get('LOG_LEVEL', config['log_level'])
    config['log_dir'] = os.environ.get('LOG_DIR', config['log_dir'])
    config['max_log_size'] = int(os.environ.get('LOG_MAX_SIZE', config['max_log_size']))
    config['backup_count'] = int(os.environ.get('LOG_BACKUP_COUNT', config['backup_count']))
    config['slow_query_threshold'] = float(os.environ.get('LOG_SLOW_QUERY_THRESHOLD', config['slow_query_threshold']))
    
    # Boolean overrides
    config['console_output'] = os.environ.get('LOG_CONSOLE_OUTPUT', str(config['console_output'])).lower() == 'true'
    config['detailed_formatting'] = os.environ.get('LOG_DETAILED_FORMATTING', str(config['detailed_formatting'])).lower() == 'true'
    config['performance_logging'] = os.environ.get('LOG_PERFORMANCE', str(config['performance_logging'])).lower() == 'true'
    config['security_logging'] = os.environ.get('LOG_SECURITY', str(config['security_logging'])).lower() == 'true'
    config['database_logging'] = os.environ.get('LOG_DATABASE', str(config['database_logging'])).lower() == 'true'
    config['request_logging'] = os.environ.get('LOG_REQUESTS', str(config['request_logging'])).lower() == 'true'
    config['memory_logging'] = os.environ.get('LOG_MEMORY', str(config['memory_logging'])).lower() == 'true'
    
    return config

# Log file names
LOG_FILES = {
    'main': 'pipelinepro.log',
    'errors': 'pipelinepro_errors.log',
    'debug': 'pipelinepro_debug.log',
    'performance': 'pipelinepro_performance.log',
    'security': 'pipelinepro_security.log',
    'database': 'pipelinepro_database.log',
    'requests': 'pipelinepro_requests.log'
}

# Log formats
LOG_FORMATS = {
    'detailed': '%(asctime)s [%(levelname)s] %(name)s:%(lineno)d - %(message)s [%(filename)s:%(funcName)s]',
    'simple': '%(asctime)s [%(levelname)s] %(name)s - %(message)s',
    'json': '{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s", "file": "%(filename)s", "line": %(lineno)d, "function": "%(funcName)s"}',
    'compact': '%(asctime)s [%(levelname)s] %(message)s'
}

# Log levels for different components
COMPONENT_LOG_LEVELS = {
    'auth': 'INFO',
    'api': 'INFO',
    'database': 'INFO',
    'security': 'WARNING',
    'performance': 'INFO',
    'requests': 'INFO',
    'errors': 'ERROR'
}

def get_component_log_level(component: str) -> str:
    """Get log level for a specific component"""
    return COMPONENT_LOG_LEVELS.get(component, 'INFO')

# Performance monitoring thresholds
PERFORMANCE_THRESHOLDS = {
    'slow_request': 2.0,  # seconds
    'slow_database_query': 1.0,  # seconds
    'high_memory_usage': 80.0,  # percentage
    'high_cpu_usage': 90.0,  # percentage
    'max_request_size': 10 * 1024 * 1024,  # 10MB
}

# Security logging events
SECURITY_EVENTS = {
    'login_attempt': 'INFO',
    'login_success': 'INFO',
    'login_failure': 'WARNING',
    'logout': 'INFO',
    'access_denied': 'WARNING',
    'suspicious_activity': 'ERROR',
    'rate_limit_exceeded': 'WARNING',
    'session_timeout': 'INFO',
    'password_change': 'INFO',
    'account_lockout': 'WARNING'
}

def get_security_event_level(event: str) -> str:
    """Get log level for a security event"""
    return SECURITY_EVENTS.get(event, 'INFO')

# Database query logging
DATABASE_LOGGING = {
    'log_all_queries': False,  # Keep False
    'log_slow_queries': True,
    'log_errors': True,
    'log_connections': False,  # Changed from True to False
    'log_transactions': False,  # Changed from True to False
    'include_query_params': False,  # Security: don't log sensitive data
    'max_query_length': 200,  # characters
    'slow_query_threshold': 0.5,  # seconds - only log queries slower than this
}

# Request logging
REQUEST_LOGGING = {
    'log_all_requests': False,  # Changed from True to False
    'log_request_body': False,  # Security: don't log sensitive data
    'log_response_body': False,  # Security: don't log sensitive data
    'log_headers': False,  # Security: don't log sensitive headers
    'exclude_paths': ['/health', '/static', '/favicon.ico', '/robots.txt', '/sitemap.xml'],  # Added more exclusions
    'exclude_methods': ['OPTIONS', 'HEAD'],  # Added HEAD to exclusions
    'log_user_agent': False,  # Changed from True to False
    'log_ip_address': False,  # Changed from True to False
    'log_referrer': False,  # Changed from True to False
    'log_duration': True,
    'log_status_code': True,
    'log_content_length': False,  # Changed from True to False
    'min_duration_to_log': 0.1,  # Only log requests taking more than 100ms
}

# Memory and system monitoring
SYSTEM_MONITORING = {
    'log_memory_usage': True,
    'log_cpu_usage': True,
    'log_disk_usage': True,
    'log_network_usage': False,
    'monitoring_interval': 300,  # seconds
    'high_usage_threshold': 80.0,  # percentage
}

# Error tracking
ERROR_TRACKING = {
    'log_full_traceback': True,
    'log_error_context': True,
    'log_request_context': True,
    'log_user_context': True,
    'group_similar_errors': True,
    'error_sampling_rate': 1.0,  # 100% in development, lower in production
}

# Log rotation settings
LOG_ROTATION = {
    'when': 'midnight',
    'interval': 1,
    'backup_count': 10,
    'encoding': 'utf-8',
    'delay': False
}

def validate_logging_config(config: Dict[str, Any]) -> bool:
    """
    Validate logging configuration
    
    Args:
        config: Configuration dictionary
        
    Returns:
        True if configuration is valid
    """
    required_keys = ['log_level', 'log_dir', 'max_log_size', 'backup_count']
    
    for key in required_keys:
        if key not in config:
            raise ValueError(f"Missing required logging configuration key: {key}")
    
    # Validate log level
    valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
    if config['log_level'] not in valid_levels:
        raise ValueError(f"Invalid log level: {config['log_level']}. Must be one of {valid_levels}")
    
    # Validate numeric values
    if config['max_log_size'] <= 0:
        raise ValueError("max_log_size must be positive")
    
    if config['backup_count'] < 0:
        raise ValueError("backup_count must be non-negative")
    
    return True 