#!/bin/bash
# Health check script for PipLinePro

set -e

# Check if the application is responding
curl -f http://localhost:8000/health || exit 1

# Check if database is accessible
python -c "
import sys
sys.path.append('/app')
from app import create_app
from app.models import db

app = create_app()
with app.app_context():
    try:
        db.engine.execute('SELECT 1')
        print('Database health check passed')
    except Exception as e:
        print(f'Database health check failed: {e}')
        sys.exit(1)
"

# Check if Redis is accessible
redis-cli -h redis -p 6379 -a "${REDIS_PASSWORD}" ping || exit 1

echo "All health checks passed"
exit 0
