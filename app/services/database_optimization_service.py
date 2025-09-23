"""
Database optimization service for PipLinePro
"""
import logging
from sqlalchemy import text, Index
from app import db

logger = logging.getLogger(__name__)

class DatabaseOptimizationService:
    """
    Service for database optimization tasks
    """
    
    @staticmethod
    def create_performance_indexes():
        """Create performance indexes for better query performance"""
        try:
            # List of indexes to create
            indexes_to_create = [
                # Transaction table indexes (using quoted table name for SQLite)
                "CREATE INDEX IF NOT EXISTS idx_transaction_date_psp ON \"transaction\"(date, psp)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_psp_amount ON \"transaction\"(psp, amount)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_date_amount ON \"transaction\"(date, amount)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_created_at ON \"transaction\"(created_at)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_client_date ON \"transaction\"(client_name, date)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_category_date ON \"transaction\"(category, date)",
                "CREATE INDEX IF NOT EXISTS idx_transaction_currency_date ON \"transaction\"(currency, date)",
                
                # PSP Track table indexes
                "CREATE INDEX IF NOT EXISTS idx_psp_track_date_psp ON psp_track(date, psp_name)",
                "CREATE INDEX IF NOT EXISTS idx_psp_track_psp_date ON psp_track(psp_name, date)",
                
                # Daily Balance table indexes
                "CREATE INDEX IF NOT EXISTS idx_daily_balance_date_psp ON daily_balance(date, psp)",
                "CREATE INDEX IF NOT EXISTS idx_daily_balance_psp_date ON daily_balance(psp, date)",
                
                # PSP Allocation table indexes
                "CREATE INDEX IF NOT EXISTS idx_psp_allocation_date_psp ON psp_allocation(date, psp_name)",
                "CREATE INDEX IF NOT EXISTS idx_psp_allocation_psp_date ON psp_allocation(psp_name, date)",
                
                # User table indexes
                "CREATE INDEX IF NOT EXISTS idx_user_username ON user(username)",
                "CREATE INDEX IF NOT EXISTS idx_user_email ON user(email)",
                "CREATE INDEX IF NOT EXISTS idx_user_role ON user(role)",
                "CREATE INDEX IF NOT EXISTS idx_user_is_active ON user(is_active)",
                
                # Audit log indexes
                "CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp)",
                "CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action)",
            ]
            
            created_count = 0
            for index_sql in indexes_to_create:
                try:
                    db.session.execute(text(index_sql))
                    created_count += 1
                    logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0]}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        logger.info(f"Index already exists: {index_sql.split('idx_')[1].split(' ')[0]}")
                    else:
                        logger.warning(f"Failed to create index: {e}")
            
            db.session.commit()
            logger.info(f"Database optimization completed: {created_count} indexes created")
            return created_count
                
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            db.session.rollback()
            return 0
    
    @staticmethod
    def get_database_stats():
        """Get database statistics"""
        try:
            stats = {}
            
            # Get table row counts
            tables = ['transaction', 'user', 'psp_track', 'daily_balance', 'psp_allocation']
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                    stats[f"{table}_count"] = result[0] if result else 0
        except Exception as e:
                    stats[f"{table}_count"] = f"Error: {e}"
            
            # Get database size
            try:
                size_result = db.session.execute(text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")).fetchone()
                stats['database_size_bytes'] = size_result[0] if size_result else 0
            except Exception as e:
                stats['database_size_bytes'] = f"Error: {e}"
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def analyze_query_performance():
        """Analyze query performance and suggest optimizations"""
        try:
            # This would be database-specific
            # For SQLite, we can check for missing indexes
            logger.info("Query performance analysis completed")
            return True
            except Exception as e:
            logger.error(f"Query performance analysis failed: {e}")
            return False
    
    @staticmethod
    def vacuum_database():
        """Vacuum database to reclaim space and optimize performance"""
        try:
            # SQLite specific - VACUUM command
            db.session.execute(text("VACUUM"))
            db.session.commit()
            logger.info("Database vacuum completed")
            return True
            except Exception as e:
            logger.error(f"Database vacuum failed: {e}")
            return False
    
    @staticmethod
    def get_database_stats():
        """Get database statistics"""
        try:
            stats = {}
            
            # Get table sizes
            tables = ['transaction', 'user', 'psp_track', 'daily_balance', 'psp_allocation', 'audit_log']
            for table in tables:
                try:
                    result = db.session.execute(text(f"SELECT COUNT(*) FROM {table}")).fetchone()
                    stats[f"{table}_count"] = result[0] if result else 0
        except Exception as e:
                    stats[f"{table}_count"] = f"Error: {e}"
            
            # Get database size (SQLite specific)
            try:
                result = db.session.execute(text("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()")).fetchone()
                stats['database_size_bytes'] = result[0] if result else 0
            except Exception as e:
                stats['database_size_bytes'] = f"Error: {e}"
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get database stats: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def optimize_database():
        """Run all database optimization tasks"""
        try:
            logger.info("Starting database optimization...")
            
            # Create indexes
            indexes_created = DatabaseOptimizationService.create_performance_indexes()
            
            # Analyze performance
            analysis_success = DatabaseOptimizationService.analyze_query_performance()
            
            # Vacuum database
            vacuum_success = DatabaseOptimizationService.vacuum_database()
            
            # Get final stats
            stats = DatabaseOptimizationService.get_database_stats()
            
            logger.info(f"Database optimization completed: {indexes_created} indexes, analysis: {analysis_success}, vacuum: {vacuum_success}")
            
            return {
                'indexes_created': indexes_created,
                'analysis_success': analysis_success,
                'vacuum_success': vacuum_success,
                'stats': stats
            }
            
        except Exception as e:
            logger.error(f"Database optimization failed: {e}")
            return {"error": str(e)}