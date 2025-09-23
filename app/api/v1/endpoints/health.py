"""
Health check endpoints for PipLinePro
"""
from flask import Blueprint, jsonify
from datetime import datetime, timezone
import logging
import psutil
import os

logger = logging.getLogger(__name__)

health_api = Blueprint('health_api', __name__)

@health_api.route('/health')
@health_api.route('/')
def health_check():
    """Basic health check endpoint"""
    try:
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'service': 'PipLinePro API',
            'version': '1.0.0'
        }), 200
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@health_api.route('/health/detailed')
def detailed_health_check():
    """Detailed health check with system metrics"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Check database connection
        db_status = "unknown"
        try:
            from app import db
            db.session.execute('SELECT 1')
            db_status = "healthy"
        except Exception as e:
            db_status = f"unhealthy: {str(e)}"
        
        # Check Redis connection (if enabled)
        redis_status = "disabled"
        try:
            from app import redis_client
            if redis_client:
                redis_client.ping()
                redis_status = "healthy"
        except Exception as e:
            redis_status = f"unhealthy: {str(e)}"
        except ImportError:
            redis_status = "not_configured"
        
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'service': 'PipLinePro API',
            'version': '1.0.0',
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / (1024**3), 2)
            },
            'services': {
                'database': db_status,
                'redis': redis_status
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Detailed health check failed: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500

@health_api.route('/health/ready')
def readiness_check():
    """Kubernetes readiness probe"""
    try:
        # Check if all critical services are ready
        from app import db
        
        # Test database connection
        db.session.execute('SELECT 1')
        
        return jsonify({
            'status': 'ready',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return jsonify({
            'status': 'not_ready',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 503

@health_api.route('/health/live')
def liveness_check():
    """Kubernetes liveness probe"""
    try:
        # Simple check to see if the application is responding
        return jsonify({
            'status': 'alive',
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Liveness check failed: {str(e)}")
        return jsonify({
            'status': 'dead',
            'error': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500