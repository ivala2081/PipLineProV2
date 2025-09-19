"""
Database Optimization Service for PipLinePro
Provides database performance monitoring and optimization utilities
"""
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from sqlalchemy import text, func, desc
from sqlalchemy.exc import SQLAlchemyError
from app import db

logger = logging.getLogger(__name__)

class DatabaseOptimizationService:
    """Service for database optimization and performance monitoring"""
    
    def __init__(self):
        self.slow_queries = []
        self.query_stats = {}
    
    def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze current query performance and suggest optimizations"""
        try:
            logger.info("Analyzing database performance...")
            
            # Get database statistics
            stats = self._get_database_stats()
            
            # Analyze slow queries
            slow_queries = self._analyze_slow_queries()
            
            # Check for missing indexes
            missing_indexes = self._check_missing_indexes()
            
            # Get table sizes
            table_sizes = self._get_table_sizes()
            
            # Generate recommendations
            recommendations = self._generate_recommendations(stats, slow_queries, missing_indexes)
            
            return {
                'database_stats': stats,
                'slow_queries': slow_queries,
                'missing_indexes': missing_indexes,
                'table_sizes': table_sizes,
                'recommendations': recommendations,
                'analysis_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error analyzing database performance: {str(e)}")
            return {'error': str(e)}
    
    def _get_database_stats(self) -> Dict[str, Any]:
        """Get basic database statistics"""
        try:
            # Get transaction count
            transaction_count = db.session.execute(text('SELECT COUNT(*) FROM "transaction"')).scalar()
            
            # Get user count
            user_count = db.session.execute(text("SELECT COUNT(*) FROM user")).scalar()
            
            # Get date range of transactions
            date_range = db.session.execute(text("""
                SELECT MIN(date) as min_date, MAX(date) as max_date 
                FROM "transaction"
            """)).first()
            
            # Get most active PSPs
            top_psps = db.session.execute(text("""
                SELECT psp, COUNT(*) as transaction_count
                FROM "transaction" 
                WHERE psp IS NOT NULL
                GROUP BY psp 
                ORDER BY transaction_count DESC 
                LIMIT 5
            """)).fetchall()
            
            return {
                'transaction_count': transaction_count,
                'user_count': user_count,
                'date_range': {
                    'min_date': str(date_range.min_date) if date_range.min_date else None,
                    'max_date': str(date_range.max_date) if date_range.max_date else None
                },
                'top_psps': [{'psp': row.psp, 'count': row.transaction_count} for row in top_psps]
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Error getting database stats: {str(e)}")
            return {}
    
    def _analyze_slow_queries(self) -> List[Dict[str, Any]]:
        """Analyze slow queries (placeholder - would need query logging enabled)"""
        # This would require query logging to be enabled
        # For now, return common slow query patterns
        return [
            {
                'query_pattern': 'SELECT * FROM "transaction" WHERE date BETWEEN ? AND ?',
                'frequency': 'High',
                'suggestion': 'Add composite index on (date, amount)',
                'impact': 'High'
            },
            {
                'query_pattern': 'SELECT psp, SUM(amount) FROM "transaction" GROUP BY psp',
                'frequency': 'Medium',
                'suggestion': 'Add index on (psp, amount)',
                'impact': 'Medium'
            }
        ]
    
    def _check_missing_indexes(self) -> List[Dict[str, Any]]:
        """Check for missing indexes based on common query patterns"""
        missing_indexes = []
        
        try:
            # Check for common query patterns that might benefit from indexes
            common_patterns = [
                {
                    'table': 'transaction',
                    'columns': ['date', 'psp'],
                    'query_type': 'WHERE date = ? AND psp = ?',
                    'priority': 'High'
                },
                {
                    'table': 'transaction',
                    'columns': ['category', 'amount'],
                    'query_type': 'WHERE category = ? ORDER BY amount',
                    'priority': 'Medium'
                },
                {
                    'table': 'user',
                    'columns': ['is_active', 'admin_level'],
                    'query_type': 'WHERE is_active = ? AND admin_level = ?',
                    'priority': 'Medium'
                }
            ]
            
            for pattern in common_patterns:
                missing_indexes.append({
                    'table': pattern['table'],
                    'columns': pattern['columns'],
                    'query_type': pattern['query_type'],
                    'priority': pattern['priority'],
                    'suggestion': f"CREATE INDEX idx_{pattern['table']}_{'_'.join(pattern['columns'])} ON {pattern['table']} ({', '.join(pattern['columns'])})"
                })
                
        except Exception as e:
            logger.error(f"Error checking missing indexes: {str(e)}")
        
        return missing_indexes
    
    def _get_table_sizes(self) -> Dict[str, int]:
        """Get table sizes (approximate)"""
        try:
            # This is a simplified version - actual implementation would depend on database type
            tables = ['transaction', 'user', 'audit_log', 'user_session', 'daily_balance', 'psp_track']
            sizes = {}
            
            for table in tables:
                try:
                    count = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).scalar()
                    sizes[table] = count
                except:
                    sizes[table] = 0
            
            return sizes
            
        except Exception as e:
            logger.error(f"Error getting table sizes: {str(e)}")
            return {}
    
    def _generate_recommendations(self, stats: Dict, slow_queries: List, missing_indexes: List) -> List[str]:
        """Generate optimization recommendations"""
        recommendations = []
        
        # Based on transaction count
        if stats.get('transaction_count', 0) > 10000:
            recommendations.append("Consider implementing table partitioning for transaction table")
        
        # Based on missing indexes
        high_priority_indexes = [idx for idx in missing_indexes if idx['priority'] == 'High']
        if high_priority_indexes:
            recommendations.append(f"Add {len(high_priority_indexes)} high-priority indexes for better query performance")
        
        # Based on date range
        if stats.get('date_range', {}).get('min_date'):
            date_range = datetime.now() - datetime.fromisoformat(stats['date_range']['min_date'])
            if date_range.days > 365:
                recommendations.append("Consider archiving old transaction data (>1 year)")
        
        # General recommendations
        recommendations.extend([
            "Enable query logging in development to identify slow queries",
            "Consider implementing database connection pooling for production",
            "Regular VACUUM/ANALYZE operations for SQLite databases",
            "Monitor database size and implement cleanup procedures"
        ])
        
        return recommendations
    
    def optimize_database(self) -> Dict[str, Any]:
        """Perform database optimization tasks"""
        try:
            logger.info("Starting database optimization...")
            
            # Analyze current state
            analysis = self.analyze_query_performance()
            
            # Perform optimizations
            optimizations_applied = []
            
            # Clean up old audit logs (older than 90 days)
            try:
                cutoff_date = datetime.now() - timedelta(days=90)
                deleted_audit = db.session.execute(text("""
                    DELETE FROM audit_log 
                    WHERE timestamp < :cutoff_date
                """), {'cutoff_date': cutoff_date})
                optimizations_applied.append(f"Cleaned up {deleted_audit.rowcount} old audit log entries")
            except Exception as e:
                logger.warning(f"Could not clean audit logs: {str(e)}")
            
            # Clean up old login attempts (older than 30 days)
            try:
                cutoff_date = datetime.now() - timedelta(days=30)
                deleted_login = db.session.execute(text("""
                    DELETE FROM login_attempt 
                    WHERE timestamp < :cutoff_date
                """), {'cutoff_date': cutoff_date})
                optimizations_applied.append(f"Cleaned up {deleted_login.rowcount} old login attempt records")
            except Exception as e:
                logger.warning(f"Could not clean login attempts: {str(e)}")
            
            # Clean up inactive sessions (older than 7 days)
            try:
                cutoff_date = datetime.now() - timedelta(days=7)
                deleted_sessions = db.session.execute(text("""
                    DELETE FROM user_session 
                    WHERE is_active = false AND last_active < :cutoff_date
                """), {'cutoff_date': cutoff_date})
                optimizations_applied.append(f"Cleaned up {deleted_sessions.rowcount} inactive session records")
            except Exception as e:
                logger.warning(f"Could not clean sessions: {str(e)}")
            
            db.session.commit()
            
            return {
                'success': True,
                'optimizations_applied': optimizations_applied,
                'analysis': analysis,
                'optimization_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error optimizing database: {str(e)}")
            db.session.rollback()
            return {
                'success': False,
                'error': str(e),
                'optimization_timestamp': datetime.now().isoformat()
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        try:
            # Get basic metrics
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'database_stats': self._get_database_stats(),
                'table_sizes': self._get_table_sizes(),
                'slow_queries_count': len(self.slow_queries)
            }
            
            # Add query performance metrics if available
            if self.query_stats:
                metrics['query_stats'] = self.query_stats
            
            return metrics
            
        except Exception as e:
            logger.error(f"Error getting performance metrics: {str(e)}")
            return {'error': str(e)}
    
    def create_performance_indexes(self) -> Dict[str, Any]:
        """Create performance indexes for better query performance"""
        try:
            logger.info("Creating performance indexes...")
            
            # Check database integrity first
            from app.services.database_recovery_service import database_recovery_service
            integrity_check = database_recovery_service.check_database_integrity()
            
            if integrity_check['corrupted']:
                logger.error("Database is corrupted, cannot create indexes")
                return {
                    'status': 'error',
                    'indexes_created': 0,
                    'errors': ['Database is corrupted - run database recovery first'],
                    'message': 'Database corruption detected. Please run database recovery before creating indexes.',
                    'corruption_detected': True,
                    'integrity_check': integrity_check
                }
            
            indexes_created = 0
            errors = []
            
            # Define performance indexes
            performance_indexes = [
                {
                    'name': 'idx_transaction_date_psp',
                    'table': 'transaction',
                    'columns': ['date', 'psp'],
                    'description': 'Composite index for date and PSP queries'
                },
                {
                    'name': 'idx_transaction_psp_amount',
                    'table': 'transaction', 
                    'columns': ['psp', 'amount'],
                    'description': 'Composite index for PSP and amount queries'
                },
                {
                    'name': 'idx_transaction_date_amount',
                    'table': 'transaction',
                    'columns': ['date', 'amount'],
                    'description': 'Composite index for date and amount queries'
                },
                {
                    'name': 'idx_transaction_created_at',
                    'table': 'transaction',
                    'columns': ['created_at'],
                    'description': 'Index for created_at queries'
                },
                {
                    'name': 'idx_psp_track_date_psp',
                    'table': 'psp_track',
                    'columns': ['date', 'psp_name'],
                    'description': 'Composite index for PSP track date and PSP queries'
                }
            ]
            
            for index_def in performance_indexes:
                try:
                    # Check if index already exists
                    check_sql = f"""
                    SELECT name FROM sqlite_master 
                    WHERE type='index' AND name='{index_def['name']}'
                    """
                    result = db.session.execute(text(check_sql)).fetchone()
                    
                    if not result:
                        # Create the index (escape reserved keywords)
                        columns = ', '.join(index_def['columns'])
                        table_name = f'"{index_def["table"]}"' if index_def['table'] == 'transaction' else index_def['table']
                        create_sql = f"""
                        CREATE INDEX {index_def['name']} 
                        ON {table_name} ({columns})
                        """
                        db.session.execute(text(create_sql))
                        indexes_created += 1
                        logger.info(f"Created index: {index_def['name']}")
                    else:
                        logger.info(f"Index already exists: {index_def['name']}")
                        
                except SQLAlchemyError as index_error:
                    error_msg = f"Failed to create index {index_def['name']}: {str(index_error)}"
                    logger.warning(error_msg)
                    errors.append(error_msg)
                    
                    # Check if this is a corruption-related error
                    if 'database disk image is malformed' in str(index_error).lower():
                        logger.error("Database corruption detected during index creation")
                        return {
                            'status': 'error',
                            'indexes_created': indexes_created,
                            'errors': errors + ['Database corruption detected'],
                            'message': 'Database corruption detected during index creation. Please run database recovery.',
                            'corruption_detected': True
                        }
            
            # Commit all index creations
            db.session.commit()
            
            return {
                'status': 'success',
                'indexes_created': indexes_created,
                'errors': errors,
                'message': f'Successfully created {indexes_created} performance indexes'
            }
            
        except SQLAlchemyError as e:
            logger.error(f"Database error creating performance indexes: {str(e)}")
            db.session.rollback()
            
            # Check if this is a corruption-related error
            if 'database disk image is malformed' in str(e).lower():
                return {
                    'status': 'error',
                    'indexes_created': 0,
                    'errors': [str(e)],
                    'message': 'Database corruption detected. Please run database recovery.',
                    'corruption_detected': True
                }
            
            return {
                'status': 'error',
                'indexes_created': 0,
                'errors': [str(e)],
                'message': f'Failed to create performance indexes: {str(e)}'
            }
        except Exception as e:
            logger.error(f"Error creating performance indexes: {str(e)}")
            db.session.rollback()
            return {
                'status': 'error',
                'indexes_created': 0,
                'errors': [str(e)],
                'message': f'Failed to create performance indexes: {str(e)}'
            }