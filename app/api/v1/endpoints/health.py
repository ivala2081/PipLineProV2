"""
Health check endpoints
"""
from flask import Blueprint, jsonify
from datetime import datetime
from sqlalchemy import text
import psutil

health_api = Blueprint('health_api', __name__)

@health_api.route("/")
def health_check():
    """Basic health check"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "PipLine API"
    })

@health_api.route("/detailed")
def detailed_health_check():
    """Detailed health check with system metrics"""
    try:
        # Test database connection
        from app import db
        db.session.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        db_status = f"unhealthy: {str(e)}"
    
    # Get system metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return jsonify({
        "status": "healthy" if db_status == "healthy" else "unhealthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "PipLine API",
        "database": db_status,
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "disk_percent": disk.percent
        }
    })
