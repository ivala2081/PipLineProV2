"""
Performance monitoring endpoints for PipLinePro
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
import logging
import time
import psutil
from datetime import datetime, timezone
from app.services.advanced_cache_service import get_cache_service
from app.services.query_optimization_service import get_query_optimizer
from app.services.security_service import get_security_service
from app.utils.structured_logger import get_structured_logger

logger = logging.getLogger(__name__)
api_logger = get_structured_logger('app.api.performance')

performance_api = Blueprint('performance_api', __name__)

@performance_api.route('/metrics')
@login_required
def get_performance_metrics():
    """Get comprehensive performance metrics"""
    try:
        api_logger.log_api_request("/performance/metrics", "GET", current_user.id)
        
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Cache metrics
        cache_service = get_cache_service()
        cache_stats = cache_service.get_stats()
        
        # Query performance metrics
        query_optimizer = get_query_optimizer()
        query_stats = query_optimizer.get_query_stats()
        
        # Security metrics
        security_service = get_security_service()
        security_metrics = security_service.get_security_metrics()
        
        # Database performance
        try:
            from app.services.database_optimization_service import DatabaseOptimizationService
            db_stats = DatabaseOptimizationService.get_database_stats()
        except Exception as e:
            logger.warning(f"Failed to get database stats: {e}")
            db_stats = {"error": str(e)}
        
        metrics = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'system': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'memory_used_gb': round(memory.used / (1024**3), 2),
                'disk_percent': disk.percent,
                'disk_free_gb': round(disk.free / (1024**3), 2),
                'disk_used_gb': round(disk.used / (1024**3), 2)
            },
            'cache': cache_stats,
            'queries': query_stats,
            'security': security_metrics,
            'database': db_stats
        }
        
        api_logger.log_api_request("/performance/metrics", "GET", current_user.id, 200)
        return jsonify(metrics), 200
        
    except Exception as e:
        logger.error(f"Error getting performance metrics: {str(e)}")
        api_logger.log_api_request("/performance/metrics", "GET", current_user.id, 500)
        return jsonify({
            'error': 'Failed to retrieve performance metrics',
            'message': str(e)
        }), 500

@performance_api.route('/cache/stats')
@login_required
def get_cache_stats():
    """Get detailed cache statistics"""
    try:
        api_logger.log_api_request("/performance/cache/stats", "GET", current_user.id)
        
        cache_service = get_cache_service()
        stats = cache_service.get_stats()
        
        api_logger.log_api_request("/performance/cache/stats", "GET", current_user.id, 200)
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {str(e)}")
        api_logger.log_api_request("/performance/cache/stats", "GET", current_user.id, 500)
        return jsonify({
            'error': 'Failed to retrieve cache statistics',
            'message': str(e)
        }), 500

@performance_api.route('/cache/clear', methods=['POST'])
@login_required
def clear_cache():
    """Clear all cache entries"""
    try:
        api_logger.log_api_request("/performance/cache/clear", "POST", current_user.id)
        
        cache_service = get_cache_service()
        success = cache_service.clear()
        
        if success:
            api_logger.log_business_event("cache_clear", "All cache entries cleared", current_user.id)
            api_logger.log_api_request("/performance/cache/clear", "POST", current_user.id, 200)
            return jsonify({'message': 'Cache cleared successfully'}), 200
        else:
            api_logger.log_api_request("/performance/cache/clear", "POST", current_user.id, 500)
            return jsonify({'error': 'Failed to clear cache'}), 500
        
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        api_logger.log_api_request("/performance/cache/clear", "POST", current_user.id, 500)
        return jsonify({
            'error': 'Failed to clear cache',
            'message': str(e)
        }), 500

@performance_api.route('/queries/stats')
@login_required
def get_query_stats():
    """Get query performance statistics"""
    try:
        api_logger.log_api_request("/performance/queries/stats", "GET", current_user.id)
        
        query_optimizer = get_query_optimizer()
        stats = query_optimizer.get_query_stats()
        
        api_logger.log_api_request("/performance/queries/stats", "GET", current_user.id, 200)
        return jsonify(stats), 200
        
    except Exception as e:
        logger.error(f"Error getting query stats: {str(e)}")
        api_logger.log_api_request("/performance/queries/stats", "GET", current_user.id, 500)
        return jsonify({
            'error': 'Failed to retrieve query statistics',
            'message': str(e)
        }), 500

@performance_api.route('/queries/optimize', methods=['POST'])
@login_required
def optimize_queries():
    """Run query optimization"""
    try:
        api_logger.log_api_request("/performance/queries/optimize", "POST", current_user.id)
        
        query_optimizer = get_query_optimizer()
        result = query_optimizer.optimize_transaction_queries()
        
        api_logger.log_business_event("query_optimization", f"Query optimization completed: {result} views created", current_user.id)
        api_logger.log_api_request("/performance/queries/optimize", "POST", current_user.id, 200)
        return jsonify({
            'message': 'Query optimization completed',
            'views_created': result
        }), 200
        
    except Exception as e:
        logger.error(f"Error optimizing queries: {str(e)}")
        api_logger.log_api_request("/performance/queries/optimize", "POST", current_user.id, 500)
        return jsonify({
            'error': 'Failed to optimize queries',
            'message': str(e)
        }), 500

@performance_api.route('/security/metrics')
@login_required
def get_security_metrics():
    """Get security metrics"""
    try:
        api_logger.log_api_request("/performance/security/metrics", "GET", current_user.id)
        
        security_service = get_security_service()
        metrics = security_service.get_security_metrics()
        
        api_logger.log_api_request("/performance/security/metrics", "GET", current_user.id, 200)
        return jsonify(metrics), 200
        
    except Exception as e:
        logger.error(f"Error getting security metrics: {str(e)}")
        api_logger.log_api_request("/performance/security/metrics", "GET", current_user.id, 500)
        return jsonify({
            'error': 'Failed to retrieve security metrics',
            'message': str(e)
        }), 500

@performance_api.route('/health')
@login_required
def get_health_status():
    """Get detailed health status"""
    try:
        api_logger.log_api_request("/performance/health", "GET", current_user.id)
        
        # Check system health
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        # Determine health status
        health_status = "healthy"
        issues = []
        
        if cpu_percent > 80:
            health_status = "warning"
            issues.append(f"High CPU usage: {cpu_percent}%")
        
        if memory.percent > 85:
            health_status = "warning"
            issues.append(f"High memory usage: {memory.percent}%")
        
        if cpu_percent > 95 or memory.percent > 95:
            health_status = "critical"
        
        # Check cache health
        cache_service = get_cache_service()
        cache_stats = cache_service.get_stats()
        
        if not cache_stats.get('redis_available', False):
            issues.append("Redis cache not available")
        
        # Check database health
        try:
            from app import db
            db.session.execute('SELECT 1')
            db_status = "healthy"
        except Exception as e:
            db_status = "unhealthy"
            issues.append(f"Database error: {str(e)}")
            health_status = "critical"
        
        health_data = {
            'status': health_status,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'issues': issues,
            'components': {
                'database': db_status,
                'cache': 'healthy' if cache_stats.get('redis_available', False) else 'degraded',
                'system': health_status
            },
            'metrics': {
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'cache_entries': cache_stats.get('memory_cache_entries', 0)
            }
        }
        
        status_code = 200 if health_status == "healthy" else 503
        api_logger.log_api_request("/performance/health", "GET", current_user.id, status_code)
        return jsonify(health_data), status_code
        
    except Exception as e:
        logger.error(f"Error getting health status: {str(e)}")
        api_logger.log_api_request("/performance/health", "GET", current_user.id, 500)
        return jsonify({
            'status': 'error',
            'error': 'Failed to retrieve health status',
            'message': str(e),
            'timestamp': datetime.now(timezone.utc).isoformat()
        }), 500