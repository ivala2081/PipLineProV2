"""
PipLine Treasury System - Application Factory
"""
# Configure comprehensive logging to reduce verbosity FIRST - before any imports
import logging
import sys
import os

# Add the app directory to the Python path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Completely silence SQLAlchemy logging
logging.getLogger('sqlalchemy.engine').disabled = True
logging.getLogger('sqlalchemy.pool').disabled = True
logging.getLogger('sqlalchemy.dialects').disabled = True
logging.getLogger('sqlalchemy.orm').disabled = True
logging.getLogger('sqlalchemy').disabled = True

# Reduce werkzeug logging
logging.getLogger('werkzeug').setLevel(logging.WARNING)

# Reduce other verbose loggers
logging.getLogger('urllib3').setLevel(logging.WARNING)
logging.getLogger('requests').setLevel(logging.WARNING)
logging.getLogger('flask_limiter').setLevel(logging.WARNING)

from flask import Flask, render_template, redirect, url_for, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, login_required
from flask_migrate import Migrate
from flask_socketio import SocketIO
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_wtf import CSRFProtect
from flask_babel import Babel, get_locale, gettext, ngettext
from flask_cors import CORS
from flask_compress import Compress
from datetime import timedelta
import os
import traceback
import time

# Initialize extensions
db = SQLAlchemy()
login_manager = LoginManager()
migrate = Migrate()
socketio = SocketIO()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["5000 per day", "1000 per hour", "200 per minute"],
    storage_uri="memory://",  # Use in-memory storage by default
    storage_options={"cluster": False}
)
csrf = CSRFProtect()
babel = Babel()
compress = Compress()

# Advanced caching system
class AdvancedCache:
    """Advanced in-memory caching system with performance monitoring"""
    
    def __init__(self):
        self._cache = {}
        self._stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'total_requests': 0
        }
        self._max_size = 1000  # Maximum cache entries
        self._cleanup_interval = 300  # Cleanup every 5 minutes
        self._last_cleanup = time.time()
    
    def get(self, key, default=None):
        """Get value from cache with hit tracking"""
        self._stats['total_requests'] += 1
        
        if key in self._cache:
            value, expiry = self._cache[key]
            if time.time() < expiry:
                self._stats['hits'] += 1
                return value
            else:
                # Expired, remove it
                del self._cache[key]
        
        self._stats['misses'] += 1
        return default
    
    def set(self, key, value, ttl=300):
        """Set value in cache with TTL"""
        # Cleanup if needed
        self._cleanup_if_needed()
        
        # Check if we need to make space
        if len(self._cache) >= self._max_size:
            self._remove_oldest()
        
        expiry = time.time() + ttl
        self._cache[key] = (value, expiry)
        self._stats['sets'] += 1
    
    def delete(self, key):
        """Delete key from cache"""
        if key in self._cache:
            del self._cache[key]
            self._stats['deletes'] += 1
    
    def clear(self):
        """Clear all cache"""
        self._cache.clear()
        self._stats = {
            'hits': 0, 'misses': 0, 'sets': 0, 'deletes': 0, 'total_requests': 0
        }
    
    def get_stats(self):
        """Get cache statistics"""
        total = self._stats['hits'] + self._stats['misses']
        hit_rate = (self._stats['hits'] / total * 100) if total > 0 else 0
        
        return {
            'hits': self._stats['hits'],
            'misses': self._stats['misses'],
            'sets': self._stats['sets'],
            'deletes': self._stats['deletes'],
            'total_requests': self._stats['total_requests'],
            'hit_rate': round(hit_rate, 2),
            'cache_size': len(self._cache),
            'max_size': self._max_size
        }
    
    def _cleanup_if_needed(self):
        """Clean up expired entries if cleanup interval has passed"""
        current_time = time.time()
        if current_time - self._last_cleanup > self._cleanup_interval:
            self._cleanup_expired()
            self._last_cleanup = current_time
    
    def _cleanup_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, (value, expiry) in self._cache.items()
            if current_time >= expiry
        ]
        for key in expired_keys:
            del self._cache[key]
    
    def _remove_oldest(self):
        """Remove oldest cache entry to make space"""
        if self._cache:
            oldest_key = min(self._cache.keys(), 
                           key=lambda k: self._cache[k][1])
            del self._cache[oldest_key]

# Initialize advanced cache
advanced_cache = AdvancedCache()

# Pagination utilities
class PaginationHelper:
    """Helper class for API pagination"""
    
    @staticmethod
    def paginate_query(query, page=1, per_page=25, max_per_page=100):
        """Paginate a SQLAlchemy query safely"""
        # Ensure page is valid
        page = max(1, page)
        per_page = min(max(1, per_page), max_per_page)
        
        # Get total count
        total = query.count()
        
        # Calculate pagination info
        total_pages = (total + per_page - 1) // per_page
        page = min(page, total_pages) if total_pages > 0 else 1
        
        # Get paginated results
        offset = (page - 1) * per_page
        items = query.offset(offset).limit(per_page).all()
        
        return {
            'items': items,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': total_pages,
                'has_prev': page > 1,
                'has_next': page < total_pages,
                'prev_page': page - 1 if page > 1 else None,
                'next_page': page + 1 if page < total_pages else None
            }
        }
    
    @staticmethod
    def create_pagination_links(base_url, page, total_pages, per_page):
        """Create pagination links for API responses"""
        links = {
            'first': f"{base_url}?page=1&per_page={per_page}",
            'last': f"{base_url}?page={total_pages}&per_page={per_page}" if total_pages > 0 else None,
            'self': f"{base_url}?page={page}&per_page={per_page}",
            'prev': f"{base_url}?page={page-1}&per_page={per_page}" if page > 1 else None,
            'next': f"{base_url}?page={page+1}&per_page={per_page}" if page < total_pages else None
        }
        
        # Remove None values
        return {k: v for k, v in links.items() if v is not None}

def create_app(config_name=None):
    """Application factory pattern"""
    # Set template folder to the templates directory in the project root
    # Use absolute path to ensure templates are found regardless of app root path
    template_dir = os.path.abspath('templates')
    static_dir = os.path.abspath('static')
    # Set template and static folders
    app = Flask(__name__, template_folder=template_dir, static_folder=static_dir)
    
    # Check if we're in development mode for simplified logging
    is_development = (os.environ.get('FLASK_ENV') == 'development' or 
                     os.environ.get('DEBUG') == 'True' or 
                     app.config.get('DEBUG', False))
    
    # Load configuration - automatically select based on environment
    from config import config
    
    if config_name is None:
        # Auto-select config based on environment
        if os.environ.get('FLASK_ENV') == 'production':
            config_name = 'production'
        elif os.environ.get('FLASK_ENV') == 'testing':
            config_name = 'testing'
        else:
            config_name = 'development'
    
    app.config.from_object(config[config_name])
    
    # Initialize CORS for React frontend - Enhanced for better compatibility
    CORS(app, 
         resources={r"/api/*": {"origins": ["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"]}},
         supports_credentials=True,
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRFToken", "Accept"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
         expose_headers=["Content-Type", "Authorization"]
    )
    
    # Initialize extensions
    db.init_app(app)
    login_manager.init_app(app)
    migrate.init_app(app, db)
    socketio.init_app(app, cors_allowed_origins="*")
    limiter.init_app(app)
    csrf.init_app(app)
    compress.init_app(app)
    
    # Add advanced cache to app context
    app.advanced_cache = advanced_cache
    
    # Initialize Redis service
    from app.services.redis_service import redis_service
    redis_service.init_app(app)
    app.redis_service = redis_service
    
    # Initialize background task service
    from app.services.background_service import background_task_service
    background_task_service.init_app(app)
    app.background_task_service = background_task_service
    
    # Initialize enhanced services
    from app.services.event_service import event_service
    from app.services.enhanced_cache_service import cache_service
    from app.services.microservice_service import microservice_service
    from app.services.real_time_service import init_real_time_service
    
    # Initialize real-time service with SocketIO
    real_time_service = init_real_time_service(socketio, event_service)
    app.real_time_service = real_time_service
    app.event_service = event_service
    app.cache_service = cache_service
    app.microservice_service = microservice_service
    
    # Performance monitoring context
    @app.context_processor
    def inject_performance_data():
        """Inject performance data into template context"""
        return {
            'cache_stats': advanced_cache.get_stats(),
            'redis_stats': redis_service.get_stats() if redis_service.is_connected() else {},
            'background_stats': background_task_service.get_queue_stats() if background_task_service.is_connected() else {},
            'db_pool_size': db.engine.pool.size() if hasattr(db.engine, 'pool') else 0,
            'db_pool_checked_in': db.engine.pool.checkedin() if hasattr(db.engine, 'pool') else 0,
            'db_pool_checked_out': db.engine.pool.checkedout() if hasattr(db.engine, 'pool') else 0,
        }
    
    # Configure session for cross-origin requests in development
    if app.config.get('DEBUG', False):
        app.config['SESSION_COOKIE_DOMAIN'] = None  # Allow localhost
        app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'  # Allow cross-origin requests for React frontend
        app.config['SESSION_COOKIE_SECURE'] = False  # Allow HTTP in development
        app.config['SESSION_COOKIE_HTTPONLY'] = True  # Keep HTTPOnly for security, CSRF tokens are handled via API
        app.config['SESSION_COOKIE_PATH'] = '/'  # Ensure cookie is set for all paths
        app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=8)  # Extended session lifetime
        
        # Enhanced session configuration for React frontend
        app.config['SESSION_REFRESH_EACH_REQUEST'] = True  # Refresh session on each request
        app.config['SESSION_COOKIE_NAME'] = 'pipelinepro_session'  # Custom session cookie name
        app.config['SESSION_COOKIE_MAX_AGE'] = 8 * 60 * 60  # 8 hours in seconds
        
        # Temporarily disable CSRF for development to fix allocation issues
        app.config['WTF_CSRF_ENABLED'] = False
        # CSRF protection disabled for development
    
    # Initialize security service
    # from app.services.security_service import security_service
    # security_service.init_app(app)
    
    # Initialize error handling and monitoring services
    # from app.services.error_service import error_service
    # from app.services.monitoring_service import monitoring_service
    
    # Start monitoring
    # monitoring_service.start_monitoring()
    
    # Configure login manager
    login_manager.login_view = 'auth.login'
    login_manager.login_message = 'Please log in to access this page.'
    login_manager.login_message_category = 'info'
    
    # Configure remember me functionality
    login_manager.remember_cookie_duration = timedelta(days=30)
    login_manager.remember_cookie_secure = False  # Set to True in production
    login_manager.remember_cookie_httponly = True
    login_manager.remember_cookie_samesite = 'Lax'  # Allow cross-origin in development
    
    # Custom unauthorized handler for API endpoints
    @login_manager.unauthorized_handler
    def unauthorized():
        """Handle unauthorized access - return JSON for API endpoints, redirect for web pages"""
        from flask import request, jsonify
        
        # Public API endpoints that don't require authentication
        public_endpoints = [
            '/api/v1/exchange-rates/current',
            '/api/v1/health/',
        ]
        
        # Check if this is a public endpoint
        for public_endpoint in public_endpoints:
            if request.path.startswith(public_endpoint):
                # Let the request proceed without authentication
                return None
        
        # Check if this is an API request
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please log in to access this endpoint'
            }), 401
        else:
            # For web pages, redirect to login
            return redirect(url_for('auth.login'))
    
    # Configure user loader
    @login_manager.user_loader
    def load_user(user_id):
        """Load user for Flask-Login"""
        from app.models.user import User
        try:
            user = User.query.get(int(user_id))
            if user and user.is_active:
                return user
            else:
                return None
        except Exception as e:
            print(f"Error loading user {user_id}: {str(e)}")
            return None
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.transactions import transactions_bp
    from app.routes.analytics import analytics_bp
    from app.routes.api import api_bp
    from app.routes.settings import settings_bp
    from app.routes.health import health_bp
    from app.routes.responsive import responsive_bp
    from app.routes.font_analytics import font_analytics_bp
    from app.routes.admin_management import admin_management_bp
    from app.routes.admin_permissions import admin_permissions_bp
    from app.routes.color_enhancement import init_color_enhancement_routes
    from app.routes.simple_auth import simple_auth
    from app.routes.exchange_rates import exchange_rates_bp
    
    # Import API blueprints
    from app.api.v1.endpoints.auth import auth_api
    from app.api.v1.endpoints.transactions import transactions_api
    from app.api.v1.endpoints.users import users_api
    from app.api.v1.endpoints.analytics import analytics_api
    from app.api.v1.endpoints.health import health_api
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(transactions_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(responsive_bp)
    app.register_blueprint(font_analytics_bp)
    app.register_blueprint(admin_management_bp)
    app.register_blueprint(admin_permissions_bp)
    app.register_blueprint(simple_auth)
    
    # Register API blueprints
    from app.api.v1 import api_v1
    from app.api.v2 import api_v2
    app.register_blueprint(api_v1)
    app.register_blueprint(api_v2)
    app.register_blueprint(auth_api, url_prefix='/api/v1/auth')
    app.register_blueprint(transactions_api, url_prefix='/api/v1/transactions')
    app.register_blueprint(users_api, url_prefix='/api/v1/users')
    app.register_blueprint(analytics_api, url_prefix='/api/v1/analytics')
    app.register_blueprint(health_api, url_prefix='/api/v1/health')
    
    # Register commission rates API
    from app.api.v1.endpoints.commission_rates import commission_rates_api
    app.register_blueprint(commission_rates_api, url_prefix='/api/v1/commission-rates')
    
    # Register performance monitoring blueprint
    from app.api.v1.endpoints.performance import performance_api
    app.register_blueprint(performance_api, url_prefix='/api/v1/performance')
    
    # Register system monitoring blueprint
    from app.api.v1.endpoints.monitoring import monitoring_api
    app.register_blueprint(monitoring_api, url_prefix='/api/v1')
    
    # Initialize color enhancement routes
    init_color_enhancement_routes(app)
    
    # Unified logging system
    from app.utils.unified_logger import setup_logging, get_logger
    from app.utils.safe_logging import setup_safe_logging
    enhanced_logger = setup_logging(app)
    setup_safe_logging()  # Setup safe logging for Unicode handling
    print("SUCCESS: Unified logging system enabled")
    
    # Error handling (always enabled)
    from app.utils.enhanced_error_handler import (
        EnhancedPipLineError, EnhancedValidationError, EnhancedAuthenticationError,
        EnhancedAuthorizationError, EnhancedResourceNotFoundError, EnhancedDatabaseError,
        EnhancedTemplateError, log_enhanced_error, handle_enhanced_api_error, 
        handle_enhanced_web_error, enhanced_error_handler
    )
    
    # Root route - redirect to React frontend
    @app.route('/')
    @login_required
    def root():
        """Root route - redirect to React frontend"""
        # Redirect to React frontend (localhost:3000 in development)
        return redirect('http://localhost:3000')
    
    # Note: format_number filter is now registered in template_helpers.py
    
    # Note: strftime filter is now registered in template_helpers.py as 'safe_strftime'
    
    # Register context processors
    @app.context_processor
    def inject_csrf_token():
        """Inject CSRF token function into templates - ENHANCED VERSION"""
        from app.services.csrf_fix_service import get_csrf_token
        
        # Return the function directly for template use
        return {'csrf_token': get_csrf_token}
    
    @app.context_processor
    def inject_user_settings():
        """Inject user settings into templates"""
        from flask_login import current_user
        if current_user and current_user.is_authenticated:
            from app.models.config import UserSettings
            user_settings = UserSettings.query.filter_by(user_id=current_user.id).first()
            return dict(user_settings=user_settings)
        return dict(user_settings=None)
    
    @app.context_processor
    def inject_translation_functions():
        """Inject translation functions into templates"""
        return dict(
            _=gettext,
            ngettext=ngettext,
            get_locale=get_locale
        )
    
    @app.context_processor
    def inject_now():
        """Inject current datetime into templates"""
        from datetime import datetime
        return dict(now=datetime.now())
    
    @app.context_processor
    def inject_float():
        """Inject float function into templates"""
        return dict(float=float)
    
    @app.context_processor
    def inject_math_functions():
        """Inject math functions into templates"""
        import math
        return dict(
            abs=abs,
            round=round,
            min=min,
            max=max,
            sum=sum
        )
    
    @app.context_processor
    def track_current_page():
        """Track the current page in session for reload functionality"""
        from flask import session, request
        from flask_login import current_user
        
        # Only track pages for authenticated users
        if current_user and current_user.is_authenticated:
            # Get the current request path
            current_path = request.path
            
            # Don't track certain paths (static files, API endpoints, etc.)
            excluded_paths = ['/static/', '/api/', '/health/', '/favicon.ico']
            should_track = True
            
            for excluded in excluded_paths:
                if current_path.startswith(excluded):
                    should_track = False
                    break
            
            # Store the current page in session if it should be tracked
            if should_track and current_path != '/':
                session['current_page'] = current_path
        
        return {}
    
    # Configure template filters for safe numeric operations
    from app.utils.template_helpers import (
        legacy_ultimate_tojson, safe_template_data, safe_compare, safe_float, 
        safe_decimal, format_number, format_currency, safe_multiply, 
        safe_add, safe_subtract, safe_divide
    )
    
    @app.template_filter('ultimate_tojson')
    def ultimate_tojson(obj):
        return legacy_ultimate_tojson(obj)
    
    @app.template_filter('safe_template_data')
    def safe_template_data_filter(data):
        return safe_template_data(data)
    
    @app.template_filter('safe_compare')
    def safe_compare_filter(value, operator, compare_value):
        return safe_compare(value, operator, compare_value)
    
    @app.template_filter('safe_float')
    def safe_float_filter(value):
        return safe_float(value)
    
    @app.template_filter('safe_decimal')
    def safe_decimal_filter(value):
        return safe_decimal(value)
    
    @app.template_filter('format_number')
    def format_number_filter(value, decimal_places=2):
        return format_number(value, decimal_places)
    
    @app.template_filter('format_currency')
    def format_currency_filter(value, currency="₺", decimal_places=2):
        return format_currency(value, currency, decimal_places)
    
    @app.template_filter('safe_multiply')
    def safe_multiply_filter(value1, value2, result_type="float"):
        return safe_multiply(value1, value2, result_type)
    
    @app.template_filter('safe_add')
    def safe_add_filter(value1, value2, result_type="float"):
        return safe_add(value1, value2, result_type)
    
    @app.template_filter('safe_subtract')
    def safe_subtract_filter(value1, value2, result_type="float"):
        return safe_subtract(value1, value2, result_type)
    
    @app.template_filter('safe_divide')
    def safe_divide_filter(value1, value2, result_type="float"):
        return safe_divide(value1, value2, result_type)
    
    @app.template_filter('format_date')
    def format_date_filter(value, format_str="%Y-%m-%d"):
        """Format date value"""
        try:
            if value is None:
                return 'N/A'
            if isinstance(value, str):
                from datetime import datetime
                # Try to parse the string date
                try:
                    date_obj = datetime.strptime(value, '%Y-%m-%d')
                    return date_obj.strftime(format_str)
                except ValueError:
                    return value
            elif hasattr(value, 'strftime'):
                return value.strftime(format_str)
            else:
                return str(value)
        except Exception:
            return 'N/A'
    
    # Babel locale selector
    def get_locale():
        """Get the locale for the current request"""
        from flask_login import current_user
        if current_user and current_user.is_authenticated:
            from app.models.config import UserSettings
            user_settings = UserSettings.query.filter_by(user_id=current_user.id).first()
            if user_settings and user_settings.language:
                return user_settings.language
        return 'en'  # Default to English
    
    # Initialize Babel with locale selector
    babel.init_app(app, locale_selector=get_locale)
    
    # Request timing and logging middleware
    import time
    
    @app.before_request
    def before_request():
        """Log request start and store start time"""
        request.start_time = time.time()
        
        # Generate unique request ID for tracking
        import uuid
        request.request_id = str(uuid.uuid4())
        
        # Ensure session is properly initialized
        from flask import session
        if 'csrf_token' not in session:
            # Initialize session if needed
            session.permanent = True
        
        # Skip logging for static files and excluded paths
        excluded_paths = ['/static/', '/health/', '/favicon.ico', '/robots.txt', '/sitemap.xml']
        should_log = True
        
        for excluded in excluded_paths:
            if request.path.startswith(excluded):
                should_log = False
                break
        
        # Only log non-static requests (skip in development for cleaner output)
        if should_log and request.method not in ['OPTIONS', 'HEAD'] and not is_development:
            enhanced_logger = get_logger("RequestHandler")
            enhanced_logger.info(f"Request started: {request.method} {request.path}", {
                'request_id': request.request_id,
                'operation': 'request_start'
            })

    @app.after_request
    def after_request(response):
        """Log request completion and add security headers"""
        # Calculate request duration
        duration = time.time() - getattr(request, 'start_time', time.time())
        
        # Skip logging for static files and excluded paths
        excluded_paths = ['/static/', '/health/', '/favicon.ico', '/robots.txt', '/sitemap.xml']
        should_log = True
        
        for excluded in excluded_paths:
            if request.path.startswith(excluded):
                should_log = False
                break
        
        # Only log non-static requests and slow requests (skip in development for cleaner output)
        if should_log and request.method not in ['OPTIONS', 'HEAD'] and not is_development:
            # Only log if request took more than 100ms or had an error
            if duration > 0.1 or response.status_code >= 400:
                enhanced_logger = get_logger("RequestHandler")
                enhanced_logger.log_performance(
                    operation=f"HTTP {response.status_code}",
                    duration=duration,
                    extra_data={
                        'request_id': getattr(request, 'request_id', 'Unknown'),
                        'method': request.method,
                        'url': request.path,  # Use path instead of full URL
                        'status_code': response.status_code
                    }
                )
        
        # Add security headers
        security_headers = app.config.get('SECURITY_HEADERS', {})
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response
    
    # Enhanced Error handlers with comprehensive error handling
    from app.utils.error_handler import (
        PipLineError, ValidationError, AuthenticationError, AuthorizationError,
        ResourceNotFoundError, DatabaseError, RateLimitError, FileUploadError,
        log_error, handle_api_error, handle_web_error
    )
    
    @app.errorhandler(404)
    def not_found_error(error):
        return jsonify({'error': 'Not Found', 'message': 'The requested resource was not found'}), 404

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return jsonify({'error': 'Internal Server Error', 'message': 'An internal server error occurred'}), 500

    @app.errorhandler(403)
    def forbidden_error(error):
        return jsonify({'error': 'Forbidden', 'message': 'Access to this resource is forbidden'}), 403

    @app.errorhandler(401)
    def unauthorized_error(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401

    @app.errorhandler(429)
    def rate_limit_error(error):
        return jsonify({'error': 'Too Many Requests', 'message': 'Rate limit exceeded'}), 429

    @app.errorhandler(PipLineError)
    def handle_pipeline_error(error):
        return jsonify({'error': 'Pipeline Error', 'message': str(error)}), 400

    # CSRF Error Handler - Enhanced
    @app.errorhandler(400)
    def handle_csrf_error(error):
        """Handle CSRF errors automatically"""
        from app.services.csrf_fix_service import handle_csrf_error_safe, is_csrf_protection_enabled
        from app.utils.unified_logger import get_logger
        from flask import jsonify
        
        # Get logger
        logger = get_logger("CSRFHandler")
        
        # Check if this is a CSRF error
        if hasattr(error, 'description') and 'CSRF' in str(error.description):
            logger.warning(f"CSRF error detected: {error.description}")
            
            # Handle the CSRF error
            result = handle_csrf_error_safe(error)
            
            # Check if this is an API request
            if request.path.startswith('/api/'):
                if result.get('disabled', False):
                    # CSRF protection temporarily disabled
                    logger.warning("CSRF protection temporarily disabled due to repeated errors")
                    return jsonify({
                        'error': 'CSRF protection temporarily disabled',
                        'message': 'Please try again in a few moments',
                        'csrf_disabled': True
                    }), 200
                
                # Return JSON response for API requests
                return jsonify({
                    'error': 'CSRF validation failed',
                    'message': 'Security token is invalid or expired. Please refresh the page and try again.',
                    'csrf_error': True,
                    'new_token': result.get('token', '')
                }), 400
            
            # For web requests, return JSON response
            if result.get('disabled', False):
                # CSRF protection temporarily disabled
                logger.warning("CSRF protection temporarily disabled due to repeated errors")
                return jsonify({
                    'error': 'CSRF Protection Disabled',
                    'message': result.get('error', 'CSRF protection disabled')
                }), 200
            
            # Return a JSON error response with new token
            return jsonify({
                'error': 'CSRF Validation Failed',
                'message': result.get('error', 'CSRF validation failed'),
                'new_token': result.get('token', '')
            }), 400
        
        # Handle other 400 errors
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Bad request',
                'message': str(error) if hasattr(error, 'description') else 'Invalid request'
            }), 400
        
        return render_template('errors/400.html', error=error), 400

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        """Handle unexpected errors with unified logging"""
        from flask import jsonify
        from app.utils.unified_logger import get_logger
        error_logger = get_logger("ErrorHandler")
        error_logger.error(f"Unexpected error: {type(error).__name__}: {error}")
        
        # Check if this is a CSRF-related error
        if 'CSRF' in str(error) or 'csrf' in str(error).lower():
            from app.services.csrf_fix_service import handle_csrf_error_safe

            result = handle_csrf_error_safe(error)
            
            # Check if this is an API request
            if request.path.startswith('/api/'):
                return jsonify({
                    'error': 'CSRF error occurred',
                    'message': 'Security token validation failed. Please refresh the page and try again.',
                    'csrf_error': True,
                    'new_token': result.get('token', '')
                }), 400
            
            return render_template('errors/csrf_error.html', 
                                 error=result.get('error', 'CSRF error occurred'),
                                 new_token=result.get('token', '')), 400
        
        # Handle other unexpected errors
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Internal server error',
                'message': 'An unexpected error occurred. Please try again.'
            }), 500
        
        return jsonify({'error': 'Internal Server Error', 'message': 'An unexpected error occurred'}), 500
    
        # Initialize Exchange Rate Service for automatic updates
    try:
        from app.services.exchange_rate_service import exchange_rate_service
        exchange_rate_service.start_auto_update(app)
        app.logger.info("Exchange rate auto-update service started")
    except Exception as e:
        app.logger.error(f"Failed to start exchange rate service: {e}")

    # Initialize CLI commands
    try:
        from app.cli_commands import init_cli_commands
        init_cli_commands(app)
        app.logger.info("CLI commands initialized")
    except Exception as e:
        app.logger.error(f"Failed to initialize CLI commands: {e}")

    # Initialize Database Optimization Service
    try:
        from app.services.database_optimization_service import DatabaseOptimizationService
        with app.app_context():
            db_optimizer = DatabaseOptimizationService()
            result = db_optimizer.create_performance_indexes()
            if result['status'] == 'success':
                app.logger.info(f"Database optimization completed: {result['indexes_created']} indexes created")
            else:
                app.logger.warning(f"Database optimization failed: {result.get('error', 'Unknown error')}")
    except Exception as e:
        app.logger.error(f"Failed to initialize database optimization: {e}")

    # Initialize system monitoring
    try:
        from app.services.system_monitoring_service import get_system_monitor
        with app.app_context():
            system_monitor = get_system_monitor()
            system_monitor.start_monitoring(interval=60)  # Monitor every minute
            app.logger.info("System monitoring initialized")
    except Exception as e:
        app.logger.error(f"Failed to initialize system monitoring: {e}")

    # Initialize scalability services
    try:
        from app.services.scalability_service import get_scalability_service
        with app.app_context():
            scalability_service = get_scalability_service()
            scalability_service.start_services()
            app.logger.info("Scalability services initialized")
    except Exception as e:
        app.logger.error(f"Failed to initialize scalability services: {e}")

    return app 