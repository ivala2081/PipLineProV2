"""
JSON Error Middleware
Automatically intercepts and fixes JSON parsing errors
"""
import json
import logging
from functools import wraps
from flask import request, jsonify, current_app, g
from app.services.json_auto_fix_service import json_auto_fix_service, safe_json_loads, safe_json_dumps
from app.utils.logger import get_logger

logger = get_logger(__name__)

class JSONErrorMiddleware:
    """Middleware to automatically handle JSON parsing errors"""
    
    def __init__(self, app=None):
        self.app = app
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with the Flask app"""
        # Override the default JSON encoder
        app.json_encoder = SafeJSONEncoder
        
        # Register before_request handler
        app.before_request(self.before_request)
        
        # Register after_request handler
        app.after_request(self.after_request)
        
        # Register error handlers
        app.register_error_handler(500, self.handle_500_error)
        app.register_error_handler(400, self.handle_400_error)
        
        # Override jsonify to use safe JSON serialization
        self._override_jsonify(app)
    
    def before_request(self):
        """Handle requests before processing"""
        # Store original JSON functions
        g.original_json_dumps = json.dumps
        g.original_json_loads = json.loads
        
        # Override JSON functions for this request
        json.dumps = safe_json_dumps
        json.loads = safe_json_loads
        
        # Check if request contains JSON data
        if request.is_json:
            try:
                # Try to parse JSON data safely
                request.get_json()
            except Exception as e:
                logger.warning(f"JSON parsing error in request, attempting auto-fix: {e}")
                # The error will be handled by the safe_json_loads function
    
    def after_request(self, response):
        """Handle responses after processing"""
        # Restore original JSON functions
        if hasattr(g, 'original_json_dumps'):
            json.dumps = g.original_json_dumps
        if hasattr(g, 'original_json_loads'):
            json.loads = g.original_json_loads
        
        # Check if response contains JSON data
        if response.mimetype == 'application/json':
            try:
                # Validate JSON response
                response.get_json()
            except Exception as e:
                logger.warning(f"JSON response error, attempting auto-fix: {e}")
                # Try to fix the response
                try:
                    fixed_data = safe_json_loads(response.get_data(as_text=True))
                    response.set_data(safe_json_dumps(fixed_data))
                except Exception as fix_error:
                    logger.error(f"Failed to fix JSON response: {fix_error}")
                    # Return safe error response
                    response.set_data(safe_json_dumps({
                        "error": "JSON response error",
                        "status": "error"
                    }))
        
        return response
    
    def handle_500_error(self, error):
        """Handle 500 errors that might be JSON-related"""
        if "JSON" in str(error) or "json" in str(error).lower():
            logger.error(f"JSON-related 500 error: {error}")
            return jsonify({
                "error": "JSON processing error",
                "status": "error",
                "message": "An error occurred while processing JSON data"
            }), 500
        return error
    
    def handle_400_error(self, error):
        """Handle 400 errors that might be JSON-related"""
        if "JSON" in str(error) or "json" in str(error).lower():
            logger.error(f"JSON-related 400 error: {error}")
            return jsonify({
                "error": "JSON parsing error",
                "status": "error",
                "message": "Invalid JSON data provided"
            }), 400
        return error
    
    def _override_jsonify(self, app):
        """Override Flask's jsonify to use safe JSON serialization"""
        original_jsonify = app.jsonify
        
        def safe_jsonify(*args, **kwargs):
            try:
                return original_jsonify(*args, **kwargs)
            except Exception as e:
                logger.warning(f"jsonify error, using safe fallback: {e}")
                # Return safe error response
                return original_jsonify({
                    "error": "JSON serialization error",
                    "status": "error"
                })
        
        app.jsonify = safe_jsonify

class SafeJSONEncoder(json.JSONEncoder):
    """Safe JSON encoder that handles problematic data types"""
    
    def default(self, obj):
        """Handle problematic data types"""
        try:
            # Try the parent encoder first
            return super().default(obj)
        except TypeError:
            # If that fails, convert to string
            return str(obj)
    
    def encode(self, obj):
        """Safely encode object to JSON"""
        try:
            return super().encode(obj)
        except Exception as e:
            logger.error(f"JSON encoding error: {e}")
            # Return safe fallback
            return '{"error": "JSON encoding failed", "data": []}'

def json_error_handler(f):
    """Decorator to handle JSON errors in route functions"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            if "JSON" in str(e) or "json" in str(e).lower():
                logger.error(f"JSON error in route {f.__name__}: {e}")
                return jsonify({
                    "error": "JSON processing error",
                    "status": "error",
                    "message": str(e)
                }), 500
            raise
    return decorated_function

def safe_template_render(template_name, **context):
    """Safely render template with auto-fixed data"""
    from flask import render_template

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service

    
    try:
        # Auto-fix template data
        fixed_context = json_auto_fix_service.auto_fix_template_data(context)
        return render_template(template_name, **fixed_context)
    except Exception as e:
        logger.error(f"Template rendering error: {e}")
        # Return safe error template
        return jsonify({'error': 'Internal Server Error', 'message': str(e)}), 500

# Global middleware instance
json_error_middleware = JSONErrorMiddleware() 