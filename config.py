"""
Configuration settings for PipLine Treasury System
"""
import os
import secrets
from datetime import timedelta

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


class Config:
    """Base configuration class"""
    # Enhanced SECRET_KEY generation
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_urlsafe(64)
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.path.join('static', 'uploads')
    
    # Security settings
    BULK_DELETE_CONFIRMATION_CODE = os.environ.get('BULK_DELETE_CONFIRMATION_CODE', '4561')
    
    # Enhanced security settings
    PERMANENT_SESSION_LIFETIME = timedelta(hours=8)  # Extended session lifetime
    REMEMBER_COOKIE_DURATION = timedelta(days=30)  # Remember me cookie duration
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'  # Changed back to 'Lax' for better compatibility
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development, will be overridden per environment
    
    # Enhanced file upload security
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'jpg', 'jpeg', 'png'}
    
    # Enhanced rate limiting
    RATELIMIT_STORAGE_URL = "memory://"
    RATELIMIT_DEFAULT = "200 per day; 50 per hour; 10 per minute"
    RATELIMIT_STORAGE_OPTIONS = {
        'key_prefix': 'pipeline_ratelimit'
    }
    
    # Enhanced logging
    LOG_LEVEL = 'INFO'
    LOG_FILE = 'logs/pipeline.log'
    
    # Redis Configuration for Caching
    REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
    REDIS_CACHE_TTL = 300  # 5 minutes default cache TTL
    REDIS_SESSION_TTL = 14400  # 4 hours session TTL
    
    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or secrets.token_urlsafe(32)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Babel Configuration for Internationalization
    BABEL_DEFAULT_LOCALE = 'en'
    BABEL_DEFAULT_TIMEZONE = 'UTC'
    BABEL_TRANSLATION_DIRECTORIES = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'babel', 'locale')
    LANGUAGES = {
        'en': 'English',
        'tr': 'Türkçe'
    }
    
    # PostgreSQL Configuration - Use environment variables only
    POSTGRES_HOST = os.environ.get('POSTGRES_HOST')
    POSTGRES_PORT = os.environ.get('POSTGRES_PORT', '5432')
    POSTGRES_DB = os.environ.get('POSTGRES_DB')
    POSTGRES_USER = os.environ.get('POSTGRES_USER')
    POSTGRES_PASSWORD = os.environ.get('POSTGRES_PASSWORD')
    POSTGRES_SSL_MODE = os.environ.get('POSTGRES_SSL_MODE', 'prefer')
    
    # Database engine options will be set per environment
    # Base configuration - no database-specific settings here
    
    # Database Query Logging
    DB_QUERY_LOGGING = False  # Set to True to log all SQL queries
    DB_SLOW_QUERY_THRESHOLD = 1.0  # Log queries taking longer than 1 second
    
    # Prepared Statements (enabled by default for security)
    SQLALCHEMY_USE_PREPARED_STATEMENTS = True
    
    # Database Backup Settings
    BACKUP_ENABLED = True
    BACKUP_RETENTION_DAYS = 30
    BACKUP_SCHEDULE_HOURS = 24  # Daily backups
    
    # Database Connection Monitoring
    DB_CONNECTION_MONITORING = True
    DB_HEALTH_CHECK_INTERVAL = 300  # 5 minutes
    
    # Enhanced Database Performance Monitoring
    DB_PERFORMANCE_MONITORING = True
    DB_SLOW_QUERY_THRESHOLD = 0.5  # 500ms threshold for slow queries
    DB_CONNECTION_POOL_MONITORING = True
    DB_QUERY_CACHE_ENABLED = True
    DB_QUERY_CACHE_TTL = 600  # 10 minutes cache TTL
    
    # Database Connection Pool Metrics
    DB_POOL_METRICS_ENABLED = True
    DB_POOL_CHECKOUT_TIMEOUT = 5  # 5 seconds max wait for connection
    DB_POOL_OVERFLOW_RECOVERY = True  # Automatically recover from overflow
    
    # Redis Configuration for Advanced Caching
    REDIS_ENABLED = False  # Disabled by default, enable per environment
    REDIS_HOST = 'localhost'
    REDIS_PORT = 6379
    REDIS_DB = 0
    REDIS_PASSWORD = None
    REDIS_SSL = False
    REDIS_CACHE_TTL = 3600  # 1 hour default cache TTL
    REDIS_SESSION_TTL = 28800  # 8 hours session TTL
    
    # Background Task Processing
    CELERY_ENABLED = True
    CELERY_BROKER_URL = 'redis://localhost:6379/1'
    CELERY_RESULT_BACKEND = 'redis://localhost:6379/2'
    CELERY_TASK_SERIALIZER = 'json'
    CELERY_RESULT_SERIALIZER = 'json'
    CELERY_ACCEPT_CONTENT = ['json']
    CELERY_TIMEZONE = 'UTC'
    CELERY_ENABLE_UTC = True
    CELERY_TASK_TRACK_STARTED = True
    CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes
    CELERY_TASK_SOFT_TIME_LIMIT = 25 * 60  # 25 minutes
    
    # Enhanced Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.socket.io; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self' https://cdn.socket.io; frame-ancestors 'none';",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
    }
    
    # CSRF Protection
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 3600  # 1 hour
    
    # Password Security
    PASSWORD_MIN_LENGTH = 12
    PASSWORD_REQUIRE_UPPERCASE = True
    PASSWORD_REQUIRE_LOWERCASE = True
    PASSWORD_REQUIRE_DIGITS = True
    PASSWORD_REQUIRE_SPECIAL = True
    
    # Session Security
    SESSION_TYPE = 'filesystem'
    SESSION_FILE_DIR = 'instance/sessions'
    SESSION_FILE_THRESHOLD = 500
    
    # Login Security
    MAX_LOGIN_ATTEMPTS = 5
    LOGIN_LOCKOUT_DURATION = 900  # 15 minutes
    PASSWORD_RESET_EXPIRY = 3600  # 1 hour

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    # Database configuration - use SQLite for development
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or f'sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "treasury_improved.db").replace(os.sep, "/")}'
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development
    
    # Development-specific settings
    LOG_LEVEL = 'INFO'  # Changed from DEBUG to reduce verbosity
    SQLALCHEMY_ECHO = False  # Changed from True to reduce SQL logging
    
    # SQLite-specific database settings for development
    SQLALCHEMY_ENGINE_OPTIONS = {
        'echo': False,  # Disabled SQL query logging to reduce verbosity
        'connect_args': {
            'check_same_thread': False,  # Allow multiple threads for SQLite
            'timeout': 30,  # Connection timeout
        },
        'isolation_level': 'SERIALIZABLE',  # SQLite-compatible isolation level
    }
    
    # Disable query logging in development to reduce verbosity
    DB_QUERY_LOGGING = False
    DB_SLOW_QUERY_THRESHOLD = 1.0  # Only log queries taking longer than 1 second
    
    # Relaxed security for development
    SESSION_COOKIE_SAMESITE = 'Lax'  # Allow cross-origin requests for React frontend
    SESSION_COOKIE_DOMAIN = None  # Allow localhost
    SESSION_COOKIE_SECURE = False  # Allow HTTP in development
    
    # CSRF Configuration for development - more lenient
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = 7200  # 2 hours for development
    WTF_CSRF_SSL_STRICT = False  # Don't require HTTPS in development
    
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-XSS-Protection': '1; mode=block',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.socket.io https://cdnjs.cloudflare.com https://cdn.datatables.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.datatables.net; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self' https://cdn.socket.io;",
    }
    
    # Development Redis settings (disabled by default)
    REDIS_ENABLED = False  # Disable Redis in development by default
    REDIS_URL = os.environ.get('REDIS_URL') or None  # Use in-memory cache if Redis not available

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # Database configuration - use PostgreSQL for production
    def get_database_uri():
        """Get database URI based on environment variables"""
        if os.environ.get('DATABASE_URL'):
            return os.environ.get('DATABASE_URL')
        
        # Build PostgreSQL URI from components - require environment variables
        host = os.environ.get('POSTGRES_HOST')
        port = os.environ.get('POSTGRES_PORT', '5432')
        db = os.environ.get('POSTGRES_DB')
        user = os.environ.get('POSTGRES_USER')
        password = os.environ.get('POSTGRES_PASSWORD')
        ssl_mode = os.environ.get('POSTGRES_SSL_MODE', 'prefer')
        
        # Validate required environment variables
        if not all([host, db, user, password]):
            # In development, fall back to SQLite if PostgreSQL is not configured
            if os.environ.get('FLASK_ENV') == 'development':
                return f'sqlite:///{os.path.join(os.path.dirname(os.path.abspath(__file__)), "instance", "treasury_improved.db").replace(os.sep, "/")}'
            else:
                raise ValueError("Missing required PostgreSQL environment variables: POSTGRES_HOST, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD")
        
        return f"postgresql://{user}:{password}@{host}:{port}/{db}?sslmode={ssl_mode}"
    
    SQLALCHEMY_DATABASE_URI = get_database_uri()
    SESSION_COOKIE_SECURE = True
    SESSION_COOKIE_SAMESITE = 'Strict'
    
    # Production security
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SECURE = True  # Force HTTPS in production
    SESSION_COOKIE_SAMESITE = 'Strict'  # Strict same-site policy for production
    PERMANENT_SESSION_LIFETIME = timedelta(hours=4)  # Reasonable session time
    
    # Redis for rate limiting and caching (enabled in production)
    REDIS_ENABLED = True  # Enable Redis in production
    REDIS_URL = os.environ.get('REDIS_URL') or "redis://localhost:6379/0"
    RATELIMIT_STORAGE_URL = os.environ.get('REDIS_URL') or "memory://"
    
    # Production logging
    LOG_LEVEL = 'WARNING'
    LOG_FILE = '/var/log/pipeline/pipeline.log'
    
    # Production database settings - optimized for PostgreSQL
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,  # Larger pool for production
        'pool_timeout': 30,
        'pool_recycle': 3600,  # 1 hour
        'pool_pre_ping': True,
        'max_overflow': 30,
        'echo': False,  # No SQL logging in production
        'isolation_level': 'READ_COMMITTED',  # PostgreSQL-optimized isolation level
        'connect_args': {
            'application_name': 'PipLinePro',
            'options': '-c timezone=utc'
        }
    }
    
    # Disable query logging in production for performance
    DB_QUERY_LOGGING = False
    DB_SLOW_QUERY_THRESHOLD = 2.0  # Log queries taking longer than 2 seconds
    
    # Enhanced backup settings for production
    BACKUP_ENABLED = True
    BACKUP_RETENTION_DAYS = 90  # Keep backups for 3 months
    BACKUP_SCHEDULE_HOURS = 12  # Twice daily backups
    
    # Enhanced security headers for production
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdn.socket.io https://cdnjs.cloudflare.com https://cdn.datatables.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://cdn.datatables.net; img-src 'self' data:; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; connect-src 'self' https://cdn.socket.io; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';",
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Permitted-Cross-Domain-Policies': 'none',
        'X-Download-Options': 'noopen',
        'X-DNS-Prefetch-Control': 'off'
    }
    
    # Enhanced rate limiting for production
    RATELIMIT_DEFAULT = "1000 per day; 100 per hour; 20 per minute"
    RATELIMIT_LOGIN = "5 per minute"
    RATELIMIT_API = "100 per hour"

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False
    
    # Test-specific settings
    LOG_LEVEL = 'ERROR'
    
    # Testing database settings (SQLite doesn't support pooling)
    SQLALCHEMY_ENGINE_OPTIONS = {
        'echo': False,
    }
    
    # Disable backup for testing
    BACKUP_ENABLED = False
    DB_CONNECTION_MONITORING = False
    
    # Relaxed security for testing
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # No Redis for testing (use in-memory cache)
    REDIS_URL = None

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
} 