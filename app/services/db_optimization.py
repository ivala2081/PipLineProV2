"""
Database Optimization Service
Provides safe database performance monitoring and optimization utilities
"""

import logging
import time
from datetime import datetime, timezone
from typing import Dict, List, Any
from sqlalchemy import text, inspect
from flask import current_app
from app import db

logger = logging.getLogger(__name__)


class DatabaseOptimizationService:
    """Service for safe database optimization and monitoring"""
    
    def __init__(self):
        self.slow_query_threshold = 1.0  # seconds
        
    def get_database_health(self) -> Dict[str, Any]:
        """Get database health status safely"""
        try:
            start_time = time.time()
            
            # Test connectivity
            db.session.execute(text("SELECT 1"))
            connectivity_ok = True
            
            # Get engine info
            engine = db.engine
            response_time = round((time.time() - start_time) * 1000, 2)
            
            health_info = {
                'connectivity': 'OK',
                'database_type': engine.name,
                'response_time_ms': response_time,
                'pool_size': getattr(engine.pool, 'size', 'Unknown'),
                'checked_out': getattr(engine.pool, 'checkedout', 'Unknown'),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
            # Health score
            score = 100
            if response_time > 100:
                score -= 20
            if response_time > 500:
                score -= 30
                
            health_info['health_score'] = max(0, score)
            health_info['status'] = 'HEALTHY' if score > 70 else 'WARNING' if score > 30 else 'CRITICAL'
            
            return health_info
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'connectivity': 'FAILED',
                'error': str(e),
                'status': 'CRITICAL',
                'health_score': 0,
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
    
    def analyze_tables(self) -> Dict[str, Any]:
        """Analyze database tables safely"""
        try:
            engine = db.engine
            inspector = inspect(engine)
            
            tables_info = []
            for table_name in inspector.get_table_names():
                try:
                    # Get row count safely
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    row_count = result.scalar()
                    
                    # Get indexes
                    indexes = inspector.get_indexes(table_name)
                    
                    tables_info.append({
                        'table_name': table_name,
                        'row_count': row_count,
                        'index_count': len(indexes),
                        'indexes': [idx['name'] for idx in indexes]
                    })
                except Exception as e:
                    logger.warning(f"Could not analyze table {table_name}: {e}")
                    
            return {
                'tables': tables_info,
                'total_tables': len(tables_info),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Table analysis failed: {e}")
            return {'error': str(e)}
    
    def optimize_sqlite_safely(self) -> Dict[str, Any]:
        """Safely optimize SQLite database"""
        if db.engine.name != 'sqlite':
            return {'error': 'This optimization is only for SQLite databases'}
        
        try:
            results = {}
            
            # Analyze tables for better query planning
            db.session.execute(text("ANALYZE"))
            results['analyze'] = 'completed'
            
            # Get database info
            result = db.session.execute(text("PRAGMA page_count"))
            page_count = result.scalar()
            result = db.session.execute(text("PRAGMA page_size"))
            page_size = result.scalar()
            results['database_size_mb'] = round((page_count * page_size) / (1024 * 1024), 2)
            
            results['timestamp'] = datetime.now(timezone.utc).isoformat()
            
            return results
            
        except Exception as e:
            logger.error(f"SQLite optimization failed: {e}")
            return {'error': str(e)}


# Global service instance
db_optimization_service = DatabaseOptimizationService()
