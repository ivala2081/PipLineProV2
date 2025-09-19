"""
Monitoring Service for PipLine Treasury System
Provides real-time monitoring of application performance and health
"""
import logging
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from functools import wraps
from flask import request, current_app, g, jsonify
import psutil
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

class MonitoringService:
    """Comprehensive monitoring service for PipLine"""
    
    def __init__(self):
        """Initialize monitoring service"""
        self.request_metrics = defaultdict(lambda: {
            "count": 0,
            "total_time": 0,
            "avg_time": 0,
            "min_time": float('inf'),
            "max_time": 0,
            "error_count": 0,
            "last_request": None
        })
        
        self.database_metrics = defaultdict(lambda: {
            "query_count": 0,
            "total_time": 0,
            "avg_time": 0,
            "slow_queries": 0,
            "error_count": 0,
            "last_query": None
        })
        
        self.system_metrics = {
            "cpu_history": deque(maxlen=100),
            "memory_history": deque(maxlen=100),
            "disk_history": deque(maxlen=100),
            "network_history": deque(maxlen=100)
        }
        
        self.alert_thresholds = {
            "cpu_percent": 80,
            "memory_percent": 80,
            "disk_percent": 90,
            "response_time_ms": 5000,
            "database_query_time_ms": 1000
        }
        
        self._lock = threading.Lock()
        self._monitoring_active = False
        self._monitor_thread = None
    
    def start_monitoring(self):
        """Start background monitoring thread"""
        if not self._monitoring_active:
            self._monitoring_active = True
            self._monitor_thread = threading.Thread(target=self._monitor_system, daemon=True)
            self._monitor_thread.start()
            logger.info("System monitoring started")
    
    def stop_monitoring(self):
        """Stop background monitoring thread"""
        self._monitoring_active = False
        if self._monitor_thread:
            self._monitor_thread.join(timeout=1)
        logger.info("System monitoring stopped")
    
    def _monitor_system(self):
        """Background system monitoring"""
        while self._monitoring_active:
            try:
                # Collect system metrics
                cpu_percent = psutil.cpu_percent(interval=1)
                memory = psutil.virtual_memory()
                disk = psutil.disk_usage('/')
                
                # Network metrics
                net_io = psutil.net_io_counters()
                
                with self._lock:
                    self.system_metrics["cpu_history"].append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "value": cpu_percent
                    })
                    
                    self.system_metrics["memory_history"].append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "value": memory.percent
                    })
                    
                    self.system_metrics["disk_history"].append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "value": disk.percent
                    })
                    
                    self.system_metrics["network_history"].append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "bytes_sent": net_io.bytes_sent,
                        "bytes_recv": net_io.bytes_recv
                    })
                
                # Check for alerts
                self._check_alerts(cpu_percent, memory.percent, disk.percent)
                
                time.sleep(30)  # Monitor every 30 seconds
                
            except Exception as e:
                logger.error(f"Monitoring error: {e}")
                time.sleep(60)  # Wait longer on error
    
    def _check_alerts(self, cpu_percent: float, memory_percent: float, disk_percent: float):
        """Check for system alerts"""
        alerts = []
        
        if cpu_percent > self.alert_thresholds["cpu_percent"]:
            alerts.append(f"High CPU usage: {cpu_percent}%")
        
        if memory_percent > self.alert_thresholds["memory_percent"]:
            alerts.append(f"High memory usage: {memory_percent}%")
        
        if disk_percent > self.alert_thresholds["disk_percent"]:
            alerts.append(f"High disk usage: {disk_percent}%")
        
        if alerts:
            logger.warning(f"System alerts: {'; '.join(alerts)}")
    
    def monitor_request(self, endpoint: str = None):
        """Decorator to monitor request performance"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                endpoint_name = endpoint or func.__name__
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = (time.time() - start_time) * 1000  # Convert to milliseconds
                    
                    self._record_request_metrics(endpoint_name, execution_time, success=True)
                    
                    # Check for slow requests
                    if execution_time > self.alert_thresholds["response_time_ms"]:
                        logger.warning(f"Slow request detected: {endpoint_name} took {execution_time:.2f}ms")
                    
                    return result
                    
                except Exception as e:
                    execution_time = (time.time() - start_time) * 1000
                    self._record_request_metrics(endpoint_name, execution_time, success=False)
                    raise
            return wrapper
        return decorator
    
    def _record_request_metrics(self, endpoint: str, execution_time: float, success: bool):
        """Record request performance metrics"""
        with self._lock:
            metrics = self.request_metrics[endpoint]
            metrics["count"] += 1
            metrics["total_time"] += execution_time
            metrics["avg_time"] = metrics["total_time"] / metrics["count"]
            metrics["min_time"] = min(metrics["min_time"], execution_time)
            metrics["max_time"] = max(metrics["max_time"], execution_time)
            metrics["last_request"] = datetime.utcnow().isoformat()
            
            if not success:
                metrics["error_count"] += 1
    
    def monitor_database_query(self, query_name: str = None):
        """Decorator to monitor database query performance"""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                query_id = query_name or func.__name__
                
                try:
                    result = func(*args, **kwargs)
                    execution_time = (time.time() - start_time) * 1000
                    
                    self._record_database_metrics(query_id, execution_time, success=True)
                    
                    # Check for slow queries
                    if execution_time > self.alert_thresholds["database_query_time_ms"]:
                        logger.warning(f"Slow database query detected: {query_id} took {execution_time:.2f}ms")
                    
                    return result
                    
                except Exception as e:
                    execution_time = (time.time() - start_time) * 1000
                    self._record_database_metrics(query_id, execution_time, success=False)
                    raise
            return wrapper
        return decorator
    
    def _record_database_metrics(self, query_name: str, execution_time: float, success: bool):
        """Record database query performance metrics"""
        with self._lock:
            metrics = self.database_metrics[query_name]
            metrics["query_count"] += 1
            metrics["total_time"] += execution_time
            metrics["avg_time"] = metrics["total_time"] / metrics["query_count"]
            metrics["last_query"] = datetime.utcnow().isoformat()
            
            if execution_time > self.alert_thresholds["database_query_time_ms"]:
                metrics["slow_queries"] += 1
            
            if not success:
                metrics["error_count"] += 1
    
    def get_performance_summary(self) -> Dict:
        """Get comprehensive performance summary"""
        with self._lock:
            # Calculate request metrics
            total_requests = sum(m["count"] for m in self.request_metrics.values())
            total_errors = sum(m["error_count"] for m in self.request_metrics.values())
            
            # Calculate database metrics
            total_queries = sum(m["query_count"] for m in self.database_metrics.values())
            total_query_errors = sum(m["error_count"] for m in self.database_metrics.values())
            
            # Get latest system metrics
            latest_cpu = self.system_metrics["cpu_history"][-1] if self.system_metrics["cpu_history"] else None
            latest_memory = self.system_metrics["memory_history"][-1] if self.system_metrics["memory_history"] else None
            
            return {
                "summary": {
                    "total_requests": total_requests,
                    "total_errors": total_errors,
                    "error_rate": (total_errors / total_requests * 100) if total_requests > 0 else 0,
                    "total_queries": total_queries,
                    "total_query_errors": total_query_errors,
                    "query_error_rate": (total_query_errors / total_queries * 100) if total_queries > 0 else 0
                },
                "request_metrics": dict(self.request_metrics),
                "database_metrics": dict(self.database_metrics),
                "system_metrics": {
                    "current_cpu": latest_cpu,
                    "current_memory": latest_memory,
                    "history": {
                        "cpu": list(self.system_metrics["cpu_history"]),
                        "memory": list(self.system_metrics["memory_history"]),
                        "disk": list(self.system_metrics["disk_history"])
                    }
                },
                "alerts": {
                    "thresholds": self.alert_thresholds,
                    "active_alerts": self._get_active_alerts()
                }
            }
    
    def _get_active_alerts(self) -> List[str]:
        """Get currently active system alerts"""
        alerts = []
        
        try:
            cpu_percent = psutil.cpu_percent()
            memory_percent = psutil.virtual_memory().percent
            disk_percent = psutil.disk_usage('/').percent
            
            if cpu_percent > self.alert_thresholds["cpu_percent"]:
                alerts.append(f"High CPU usage: {cpu_percent}%")
            
            if memory_percent > self.alert_thresholds["memory_percent"]:
                alerts.append(f"High memory usage: {memory_percent}%")
            
            if disk_percent > self.alert_thresholds["disk_percent"]:
                alerts.append(f"High disk usage: {disk_percent}%")
                
        except Exception as e:
            alerts.append(f"Monitoring error: {str(e)}")
        
        return alerts
    
    def get_health_check(self) -> Dict:
        """Get detailed health check information"""
        try:
            # System health
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Database health
            from app import db
            db.session.execute("SELECT 1")
            db_healthy = True
            db_error = None
        except Exception as e:
            db_healthy = False
            db_error = str(e)
        
        return {
            "status": "healthy" if db_healthy and cpu_percent < 80 and memory.percent < 80 else "warning",
            "timestamp": datetime.utcnow().isoformat(),
            "system": {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / 1024 / 1024 / 1024,
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / 1024 / 1024 / 1024
            },
            "database": {
                "healthy": db_healthy,
                "error": db_error
            },
            "performance": {
                "total_requests": sum(m["count"] for m in self.request_metrics.values()),
                "avg_response_time_ms": sum(m["avg_time"] for m in self.request_metrics.values()) / len(self.request_metrics) if self.request_metrics else 0,
                "total_queries": sum(m["query_count"] for m in self.database_metrics.values()),
                "avg_query_time_ms": sum(m["avg_time"] for m in self.database_metrics.values()) / len(self.database_metrics) if self.database_metrics else 0
            }
        }
    
    def clear_metrics(self):
        """Clear all monitoring metrics"""
        with self._lock:
            self.request_metrics.clear()
            self.database_metrics.clear()
            for history in self.system_metrics.values():
                history.clear()

# Global monitoring service instance
monitoring_service = MonitoringService() 