"""
Query optimization service for PipLinePro
"""
import logging
import time
from typing import Dict, Any, List, Optional, Callable
from sqlalchemy import text, func
from sqlalchemy.orm import Query
from app import db

logger = logging.getLogger(__name__)

class QueryOptimizationService:
    """
    Service for optimizing database queries and providing query analytics
    """
    
    def __init__(self):
        self._query_stats = {}
        self._slow_queries = []
        self._slow_query_threshold = 1.0  # 1 second
    
    def monitor_query(self, query_name: str, query_func: Callable, *args, **kwargs):
        """Monitor and optimize a database query"""
        start_time = time.time()
        
        try:
            result = query_func(*args, **kwargs)
            execution_time = time.time() - start_time
            
            # Record query statistics
            self._record_query_stats(query_name, execution_time, True)
            
            # Log slow queries
            if execution_time > self._slow_query_threshold:
                self._record_slow_query(query_name, execution_time, str(query_func))
                logger.warning(f"Slow query detected: {query_name} took {execution_time:.3f}s")
            
            return result
            
        except Exception as e:
            execution_time = time.time() - start_time
            self._record_query_stats(query_name, execution_time, False)
            logger.error(f"Query {query_name} failed after {execution_time:.3f}s: {e}")
            raise
    
    def _record_query_stats(self, query_name: str, execution_time: float, success: bool):
        """Record query statistics"""
        if query_name not in self._query_stats:
            self._query_stats[query_name] = {
                'total_calls': 0,
                'total_time': 0.0,
                'successful_calls': 0,
                'failed_calls': 0,
                'avg_time': 0.0,
                'max_time': 0.0,
                'min_time': float('inf')
            }
        
        stats = self._query_stats[query_name]
        stats['total_calls'] += 1
        stats['total_time'] += execution_time
        stats['avg_time'] = stats['total_time'] / stats['total_calls']
        stats['max_time'] = max(stats['max_time'], execution_time)
        stats['min_time'] = min(stats['min_time'], execution_time)
        
        if success:
            stats['successful_calls'] += 1
        else:
            stats['failed_calls'] += 1
    
    def _record_slow_query(self, query_name: str, execution_time: float, query_string: str):
        """Record slow query details"""
        self._slow_queries.append({
            'query_name': query_name,
            'execution_time': execution_time,
            'query_string': query_string,
            'timestamp': time.time()
        })
        
        # Keep only last 100 slow queries
        if len(self._slow_queries) > 100:
            self._slow_queries = self._slow_queries[-100:]
    
    def get_query_stats(self) -> Dict[str, Any]:
        """Get query performance statistics"""
        return {
            'query_stats': self._query_stats,
            'slow_queries': self._slow_queries[-10:],  # Last 10 slow queries
            'slow_query_threshold': self._slow_query_threshold
        }
    
    def optimize_transaction_queries(self):
        """Optimize common transaction queries"""
        try:
            # Create optimized views for common queries
            optimized_views = [
                # Daily summary view
                """
                CREATE VIEW IF NOT EXISTS daily_transaction_summary AS
                SELECT 
                    date,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    SUM(commission) as total_commission,
                    SUM(net_amount) as total_net,
                    COUNT(DISTINCT client_name) as unique_clients,
                    COUNT(DISTINCT psp) as unique_psps
                FROM "transaction"
                GROUP BY date
                """,
                
                # PSP summary view
                """
                CREATE VIEW IF NOT EXISTS psp_transaction_summary AS
                SELECT 
                    psp,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    SUM(commission) as total_commission,
                    SUM(net_amount) as total_net,
                    AVG(amount) as avg_amount,
                    COUNT(DISTINCT client_name) as unique_clients
                FROM "transaction"
                WHERE psp IS NOT NULL AND psp != ''
                GROUP BY psp
                """,
                
                # Monthly summary view
                """
                CREATE VIEW IF NOT EXISTS monthly_transaction_summary AS
                SELECT 
                    strftime('%Y-%m', date) as month,
                    COUNT(*) as transaction_count,
                    SUM(amount) as total_amount,
                    SUM(commission) as total_commission,
                    SUM(net_amount) as total_net,
                    COUNT(DISTINCT client_name) as unique_clients,
                    COUNT(DISTINCT psp) as unique_psps
                FROM "transaction"
                GROUP BY strftime('%Y-%m', date)
                """
            ]
            
            created_views = 0
            for view_sql in optimized_views:
                try:
                    db.session.execute(text(view_sql))
                    created_views += 1
                    logger.info(f"Created optimized view: {view_sql.split('daily_transaction_summary')[0].split('CREATE VIEW IF NOT EXISTS ')[-1].split(' AS')[0]}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info("Optimized view already exists")
                    else:
                        logger.warning(f"Failed to create optimized view: {e}")
            
            db.session.commit()
            logger.info(f"Query optimization completed: {created_views} views created")
            return created_views
            
        except Exception as e:
            logger.error(f"Query optimization failed: {e}")
            db.session.rollback()
            return 0
    
    def get_database_performance_metrics(self) -> Dict[str, Any]:
        """Get database performance metrics"""
        try:
            metrics = {}
            
            # Get table statistics
            tables = ['transaction', 'user', 'psp_track', 'daily_balance', 'psp_allocation']
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                    metrics[f"{table}_count"] = result[0] if result else 0
                except Exception as e:
                    metrics[f"{table}_count"] = f"Error: {e}"
            
            # Get index usage statistics (SQLite specific)
            try:
                index_info = db.session.execute(text("PRAGMA index_list('transaction')")).fetchall()
                metrics['transaction_indexes'] = len(index_info)
            except Exception as e:
                metrics['transaction_indexes'] = f"Error: {e}"
            
            # Get database size
            try:
                size_result = db.session.execute(text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")).fetchone()
                metrics['database_size_bytes'] = size_result[0] if size_result else 0
            except Exception as e:
                metrics['database_size_bytes'] = f"Error: {e}"
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get database performance metrics: {e}")
            return {"error": str(e)}
    
    def analyze_query_patterns(self) -> Dict[str, Any]:
        """Analyze query patterns and suggest optimizations"""
        try:
            suggestions = []
            
            # Analyze query statistics
            for query_name, stats in self._query_stats.items():
                if stats['avg_time'] > 0.5:  # Queries taking more than 500ms on average
                    suggestions.append({
                        'query': query_name,
                        'issue': 'High average execution time',
                        'avg_time': stats['avg_time'],
                        'recommendation': 'Consider adding indexes or optimizing the query'
                    })
                
                if stats['failed_calls'] > 0:
                    failure_rate = stats['failed_calls'] / stats['total_calls']
                    if failure_rate > 0.1:  # More than 10% failure rate
                        suggestions.append({
                            'query': query_name,
                            'issue': 'High failure rate',
                            'failure_rate': failure_rate,
                            'recommendation': 'Review error handling and query logic'
                        })
            
            return {
                'suggestions': suggestions,
                'total_queries_monitored': len(self._query_stats),
                'slow_queries_count': len(self._slow_queries)
            }
            
        except Exception as e:
            logger.error(f"Query pattern analysis failed: {e}")
            return {"error": str(e)}

# Global query optimization service
query_optimizer = QueryOptimizationService()

def get_query_optimizer() -> QueryOptimizationService:
    """Get the global query optimization service"""
    return query_optimizer

def monitor_query_performance(query_name: str):
    """Decorator to monitor query performance"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            return query_optimizer.monitor_query(query_name, func, *args, **kwargs)
        return wrapper
    return decorator
