"""
System Monitoring API Endpoints
Provides comprehensive system health and performance monitoring
"""

from flask import Blueprint, jsonify, request
from flask_login import login_required
from functools import wraps
import logging
from datetime import datetime, timedelta

from app.services.system_monitoring_service import get_system_monitor
from app.utils.advanced_cache import cached, monitor_performance
from app.utils.response_optimizer import optimized_response

logger = logging.getLogger(__name__)

# Create monitoring API blueprint
monitoring_api = Blueprint('monitoring', __name__, url_prefix='/monitoring')

def admin_required(f):
    """Decorator to require admin privileges for monitoring endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # TODO: Implement admin check
        # For now, just require login
        return f(*args, **kwargs)
    return decorated_function

@monitoring_api.route('/health')
@login_required
@cached(ttl=60, key_prefix="system_health")
@monitor_performance
@optimized_response(cache_type='system', compress=True)
def system_health():
    """Get current system health status"""
    try:
        monitor = get_system_monitor()
        health_summary = monitor.get_health_summary()
        
        return jsonify({
            'status': 'success',
            'data': health_summary,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system health',
            'error': str(e)
        }), 500

@monitoring_api.route('/metrics')
@login_required
@admin_required
@cached(ttl=30, key_prefix="system_metrics")
@monitor_performance
@optimized_response(cache_type='system', compress=True)
def system_metrics():
    """Get current system and application metrics"""
    try:
        monitor = get_system_monitor()
        metrics = monitor.get_current_metrics()
        
        return jsonify({
            'status': 'success',
            'data': metrics,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system metrics',
            'error': str(e)
        }), 500

@monitoring_api.route('/metrics/history')
@login_required
@admin_required
@cached(ttl=300, key_prefix="metrics_history")
@monitor_performance
def metrics_history():
    """Get historical metrics data"""
    try:
        hours = request.args.get('hours', 24, type=int)
        hours = min(hours, 168)  # Limit to 1 week max
        
        monitor = get_system_monitor()
        history = monitor.get_metrics_history(hours=hours)
        
        return jsonify({
            'status': 'success',
            'data': {
                'history': history,
                'period_hours': hours,
                'data_points': {
                    'system': len(history['system']),
                    'application': len(history['application'])
                }
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting metrics history: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get metrics history',
            'error': str(e)
        }), 500

@monitoring_api.route('/status')
@login_required
@cached(ttl=10, key_prefix="system_status")
@monitor_performance
@optimized_response(cache_type='system', compress=True)
def system_status():
    """Get quick system status check"""
    try:
        monitor = get_system_monitor()
        current_metrics = monitor.get_current_metrics()
        health = current_metrics.get('health', {})
        
        # Quick status check
        status = {
            'status': health.get('status', 'unknown'),
            'score': health.get('score', 0),
            'monitoring_active': current_metrics.get('monitoring_active', False),
            'uptime': monitor._get_uptime_string(),
            'last_check': datetime.now().isoformat()
        }
        
        return jsonify({
            'status': 'success',
            'data': status
        })
    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system status',
            'error': str(e)
        }), 500

@monitoring_api.route('/alerts')
@login_required
@admin_required
@cached(ttl=60, key_prefix="system_alerts")
@monitor_performance
def system_alerts():
    """Get current system alerts and issues"""
    try:
        monitor = get_system_monitor()
        health = monitor.health_status
        
        alerts = []
        
        # Convert issues to alerts
        for issue in health.issues:
            severity = 'critical' if health.score < 50 else 'warning'
            alerts.append({
                'id': f"alert_{len(alerts)}",
                'severity': severity,
                'message': issue,
                'timestamp': health.last_updated.isoformat(),
                'resolved': False
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'alerts': alerts,
                'total_alerts': len(alerts),
                'critical_alerts': len([a for a in alerts if a['severity'] == 'critical']),
                'warning_alerts': len([a for a in alerts if a['severity'] == 'warning'])
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting system alerts: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system alerts',
            'error': str(e)
        }), 500

@monitoring_api.route('/recommendations')
@login_required
@admin_required
@cached(ttl=300, key_prefix="system_recommendations")
@monitor_performance
def system_recommendations():
    """Get system optimization recommendations"""
    try:
        monitor = get_system_monitor()
        health = monitor.health_status
        
        recommendations = []
        for rec in health.recommendations:
            priority = 'high' if health.score < 50 else 'medium'
            recommendations.append({
                'id': f"rec_{len(recommendations)}",
                'priority': priority,
                'recommendation': rec,
                'timestamp': health.last_updated.isoformat(),
                'implemented': False
            })
        
        return jsonify({
            'status': 'success',
            'data': {
                'recommendations': recommendations,
                'total_recommendations': len(recommendations),
                'high_priority': len([r for r in recommendations if r['priority'] == 'high']),
                'medium_priority': len([r for r in recommendations if r['priority'] == 'medium'])
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error getting system recommendations: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get system recommendations',
            'error': str(e)
        }), 500

@monitoring_api.route('/start')
@login_required
@admin_required
def start_monitoring():
    """Start system monitoring"""
    try:
        interval = request.args.get('interval', 30, type=int)
        interval = max(10, min(interval, 300))  # Between 10s and 5m
        
        monitor = get_system_monitor()
        monitor.start_monitoring(interval=interval)
        
        return jsonify({
            'status': 'success',
            'message': f'System monitoring started with {interval}s interval',
            'data': {
                'interval': interval,
                'monitoring_active': monitor.monitoring_active
            }
        })
    except Exception as e:
        logger.error(f"Error starting monitoring: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to start monitoring',
            'error': str(e)
        }), 500

@monitoring_api.route('/stop')
@login_required
@admin_required
def stop_monitoring():
    """Stop system monitoring"""
    try:
        monitor = get_system_monitor()
        monitor.stop_monitoring()
        
        return jsonify({
            'status': 'success',
            'message': 'System monitoring stopped',
            'data': {
                'monitoring_active': monitor.monitoring_active
            }
        })
    except Exception as e:
        logger.error(f"Error stopping monitoring: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to stop monitoring',
            'error': str(e)
        }), 500

@monitoring_api.route('/config')
@login_required
@admin_required
def monitoring_config():
    """Get or update monitoring configuration"""
    try:
        monitor = get_system_monitor()
        
        if request.method == 'GET':
            return jsonify({
                'status': 'success',
                'data': monitor.monitoring_config,
                'timestamp': datetime.now().isoformat()
            })
        
        elif request.method == 'POST':
            config_data = request.get_json()
            if config_data:
                # Update configuration
                for key, value in config_data.items():
                    if key in monitor.monitoring_config:
                        monitor.monitoring_config[key] = value
                
                return jsonify({
                    'status': 'success',
                    'message': 'Monitoring configuration updated',
                    'data': monitor.monitoring_config
                })
            else:
                return jsonify({
                    'status': 'error',
                    'message': 'No configuration data provided'
                }), 400
                
    except Exception as e:
        logger.error(f"Error with monitoring config: {e}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to handle monitoring config',
            'error': str(e)
        }), 500

# Add both GET and POST methods to the config route
monitoring_api.route('/config', methods=['GET', 'POST'])(monitoring_config)
