#!/bin/bash
set -e

# Production entrypoint script for PipLinePro

echo "🚀 Starting PipLinePro Production Environment..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
while ! pg_isready -h db -p 5432 -U pipelinepro; do
  echo "Database is unavailable - sleeping"
  sleep 2
done
echo "✅ Database connection established"

# Wait for Redis to be ready
echo "⏳ Waiting for Redis connection..."
while ! redis-cli -h redis -p 6379 -a "${REDIS_PASSWORD}" ping; do
  echo "Redis is unavailable - sleeping"
  sleep 2
done
echo "✅ Redis connection established"

# Run database migrations
echo "🔄 Running database migrations..."
python -m flask db upgrade || echo "⚠️  Migration failed, continuing..."

# Initialize application data
echo "🔧 Initializing application..."
python -c "
import sys
sys.path.append('/app')
from app import create_app
from app.services.database_optimization_service import DatabaseOptimizationService
from app.services.system_monitoring_service import SystemMonitoringService
from app.services.scalability_service import ScalabilityService

app = create_app()
with app.app_context():
    # Initialize database optimization
    db_optimizer = DatabaseOptimizationService()
    db_optimizer.create_performance_indexes()
    print('✅ Database optimization initialized')
    
    # Initialize system monitoring
    monitor = SystemMonitoringService()
    monitor.start_monitoring(interval=60)
    print('✅ System monitoring initialized')
    
    # Initialize scalability services
    scalability = ScalabilityService()
    scalability.start_services()
    print('✅ Scalability services initialized')
"

# Create necessary directories
mkdir -p /app/logs /app/instance /app/backups

# Set proper permissions
chown -R pipeline:pipeline /app/logs /app/instance /app/backups

# Start supervisord to manage all services
echo "🎯 Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
