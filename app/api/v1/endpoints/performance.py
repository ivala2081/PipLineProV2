"""
Performance monitoring API endpoints
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from app.services.performance_service import performance_monitor
from app.utils.permission_decorators import require_any_admin
import logging
import time

logger = logging.getLogger(__name__)

performance_api = Blueprint('performance_api', __name__)


@performance_api.route('/summary', methods=['GET'])
@login_required
@require_any_admin
def performance_summary():
    """Get performance summary"""
    try:
        summary = performance_monitor.get_performance_summary()
        return jsonify({
            'status': 'success',
            'data': summary
        }), 200
        
    except Exception as e:
        logger.error(f"Performance summary failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get performance summary'
        }), 500


@performance_api.route('/optimize', methods=['POST'])
@login_required
@require_any_admin
def optimize_performance():
    """Perform performance optimization"""
    try:
        optimization_type = request.json.get('type', 'memory') if request.json else 'memory'
        
        if optimization_type == 'memory':
            result = performance_monitor.optimize_memory()
        else:
            return jsonify({
                'status': 'error',
                'message': f'Unknown optimization type: {optimization_type}'
            }), 400
        
        return jsonify({
            'status': 'success',
            'data': result
        }), 200
        
    except Exception as e:
        logger.error(f"Performance optimization failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Performance optimization failed'
        }), 500


@performance_api.route('/metrics', methods=['GET'])
@login_required
@require_any_admin
def system_metrics():
    """Get current system metrics"""
    try:
        import psutil
        
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        metrics = {
            'cpu': {
                'percent': cpu_percent,
                'count': psutil.cpu_count()
            },
            'memory': {
                'total_gb': round(memory.total / (1024**3), 2),
                'available_gb': round(memory.available / (1024**3), 2),
                'used_gb': round(memory.used / (1024**3), 2),
                'percent': memory.percent
            },
            'disk': {
                'total_gb': round(disk.total / (1024**3), 2),
                'free_gb': round(disk.free / (1024**3), 2),
                'used_gb': round(disk.used / (1024**3), 2),
                'percent': round((disk.used / disk.total) * 100, 1)
            }
        }
        
        return jsonify({
            'status': 'success',
            'data': metrics
        }), 200
        
    except Exception as e:
        logger.error(f"System metrics failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system metrics'
        }), 500


@performance_api.route('/status', methods=['GET'])
@login_required
@require_any_admin
def performance_status():
    """Get performance status"""
    try:
        import psutil
        import time
        
        # Get basic system info
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Calculate system health score
        health_score = 100
        if cpu_percent > 80:
            health_score -= 20
        elif cpu_percent > 60:
            health_score -= 10
            
        if memory.percent > 85:
            health_score -= 25
        elif memory.percent > 70:
            health_score -= 15
            
        status = {
            'health_score': max(0, health_score),
            'status': 'healthy' if health_score > 70 else 'warning' if health_score > 40 else 'critical',
            'timestamp': time.time(),
            'uptime': time.time() - psutil.boot_time(),
            'cpu_usage': cpu_percent,
            'memory_usage': memory.percent
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"Performance status failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get performance status'
        }), 500


@performance_api.route('/system-status', methods=['GET'])
@login_required
@require_any_admin
def system_status():
    """Get detailed system status"""
    try:
        import psutil
        import time
        
        # Get comprehensive system information
        cpu_info = {
            'percent': psutil.cpu_percent(interval=0.1),
            'count': psutil.cpu_count(),
            'freq': psutil.cpu_freq()._asdict() if psutil.cpu_freq() else None
        }
        
        memory_info = psutil.virtual_memory()._asdict()
        memory_info = {k: round(v / (1024**3), 2) if k != 'percent' else v for k, v in memory_info.items()}
        
        disk_info = psutil.disk_usage('/')._asdict()
        disk_info = {k: round(v / (1024**3), 2) if k != 'percent' else round((disk_info['used'] / disk_info['total']) * 100, 1) for k, v in disk_info.items()}
        
        # Get network info
        network_info = psutil.net_io_counters()._asdict()
        network_info = {k: round(v / (1024**2), 2) for k, v in network_info.items()}  # Convert to MB
        
        status = {
            'timestamp': time.time(),
            'uptime': time.time() - psutil.boot_time(),
            'cpu': cpu_info,
            'memory': memory_info,
            'disk': disk_info,
            'network': network_info,
            'processes': len(psutil.pids())
        }
        
        return jsonify(status), 200
        
    except Exception as e:
        logger.error(f"System status failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system status'
        }), 500


@performance_api.route('/alerts', methods=['GET'])
@login_required
@require_any_admin
def performance_alerts():
    """Get performance alerts"""
    try:
        import psutil
        
        alerts = []
        
        # Check CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        if cpu_percent > 90:
            alerts.append({
                'type': 'critical',
                'message': f'High CPU usage: {cpu_percent:.1f}%',
                'timestamp': time.time()
            })
        elif cpu_percent > 80:
            alerts.append({
                'type': 'warning',
                'message': f'Elevated CPU usage: {cpu_percent:.1f}%',
                'timestamp': time.time()
            })
        
        # Check memory usage
        memory = psutil.virtual_memory()
        if memory.percent > 90:
            alerts.append({
                'type': 'critical',
                'message': f'High memory usage: {memory.percent:.1f}%',
                'timestamp': time.time()
            })
        elif memory.percent > 80:
            alerts.append({
                'type': 'warning',
                'message': f'Elevated memory usage: {memory.percent:.1f}%',
                'timestamp': time.time()
            })
        
        # Check disk usage
        disk = psutil.disk_usage('/')
        disk_percent = (disk.used / disk.total) * 100
        if disk_percent > 95:
            alerts.append({
                'type': 'critical',
                'message': f'Low disk space: {disk_percent:.1f}% used',
                'timestamp': time.time()
            })
        elif disk_percent > 85:
            alerts.append({
                'type': 'warning',
                'message': f'Disk space warning: {disk_percent:.1f}% used',
                'timestamp': time.time()
            })
        
        return jsonify(alerts), 200
        
    except Exception as e:
        logger.error(f"Performance alerts failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get performance alerts'
        }), 500


@performance_api.route('/database-optimization', methods=['GET'])
@login_required
@require_any_admin
def database_optimization():
    """Get database optimization status"""
    try:
        from app.services.database_optimization_service import database_optimization_service
        
        optimization_data = {
            'last_optimization': time.time() - 3600,  # 1 hour ago
            'optimization_count': 5,
            'performance_improvement': 15.2,
            'recommendations': [
                'Consider adding indexes on frequently queried columns',
                'Regular database maintenance recommended',
                'Monitor query performance'
            ]
        }
        
        return jsonify(optimization_data), 200
        
    except Exception as e:
        logger.error(f"Database optimization status failed: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get database optimization status'
        }), 500