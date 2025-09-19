"""Database performance optimization

Revision ID: database_performance_optimization
Revises: safe_exchange_rate_update
Create Date: 2025-09-05 17:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'database_performance_optimization'
down_revision = 'safe_exchange_rate_update'
branch_labels = None
depends_on = None


def upgrade():
    """Add performance optimizations"""
    
    # Add composite indexes for common query patterns
    with op.batch_alter_table('transaction', schema=None) as batch_op:
        # Add indexes for analytics queries
        batch_op.create_index('idx_transaction_date_amount', ['date', 'amount'], unique=False)
        batch_op.create_index('idx_transaction_psp_amount', ['psp', 'amount'], unique=False)
        batch_op.create_index('idx_transaction_category_amount', ['category', 'amount'], unique=False)
        batch_op.create_index('idx_transaction_currency_amount', ['currency', 'amount'], unique=False)
        
        # Add indexes for date range queries
        batch_op.create_index('idx_transaction_date_range', ['date', 'created_at'], unique=False)
        
        # Add partial indexes for active records (if supported)
        # Note: SQLite doesn't support partial indexes, but PostgreSQL does
        try:
            batch_op.create_index('idx_transaction_active_amount', ['amount'], 
                                postgresql_where=sa.text('amount > 0'), unique=False)
        except:
            pass  # Skip if not PostgreSQL
    
    # Add indexes for user-related queries
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.create_index('idx_user_active_admin', ['is_active', 'admin_level'], unique=False)
        batch_op.create_index('idx_user_created_at', ['created_at'], unique=False)
    
    # Add indexes for audit queries
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.create_index('idx_audit_user_action', ['user_id', 'action'], unique=False)
        batch_op.create_index('idx_audit_table_record', ['table_name', 'record_id'], unique=False)
        batch_op.create_index('idx_audit_timestamp_action', ['timestamp', 'action'], unique=False)
    
    # Add indexes for session queries
    with op.batch_alter_table('user_session', schema=None) as batch_op:
        batch_op.create_index('idx_session_user_active', ['user_id', 'is_active'], unique=False)
        batch_op.create_index('idx_session_last_active', ['last_active'], unique=False)
    
    # Add indexes for login attempt queries
    with op.batch_alter_table('login_attempt', schema=None) as batch_op:
        batch_op.create_index('idx_login_username_timestamp', ['username', 'timestamp'], unique=False)
        batch_op.create_index('idx_login_ip_timestamp', ['ip_address', 'timestamp'], unique=False)
        batch_op.create_index('idx_login_success_timestamp', ['success', 'timestamp'], unique=False)
    
    # Add indexes for exchange rate queries
    with op.batch_alter_table('exchange_rate', schema=None) as batch_op:
        batch_op.create_index('idx_exchange_rate_date_desc', ['date'], unique=False, 
                             postgresql_sort_order='DESC')
    
    # Add indexes for daily balance queries
    with op.batch_alter_table('daily_balance', schema=None) as batch_op:
        batch_op.create_index('idx_daily_balance_date_desc', ['date'], unique=False, 
                             postgresql_sort_order='DESC')
        batch_op.create_index('idx_daily_balance_psp_date', ['psp', 'date'], unique=False)
    
    # Add indexes for PSP track queries
    with op.batch_alter_table('psp_track', schema=None) as batch_op:
        batch_op.create_index('idx_psp_track_date_desc', ['date'], unique=False, 
                             postgresql_sort_order='DESC')
        batch_op.create_index('idx_psp_track_psp_date_desc', ['psp_name', 'date'], unique=False, 
                             postgresql_sort_order='DESC')


def downgrade():
    """Remove performance optimizations"""
    
    # Remove composite indexes
    with op.batch_alter_table('transaction', schema=None) as batch_op:
        batch_op.drop_index('idx_transaction_date_amount')
        batch_op.drop_index('idx_transaction_psp_amount')
        batch_op.drop_index('idx_transaction_category_amount')
        batch_op.drop_index('idx_transaction_currency_amount')
        batch_op.drop_index('idx_transaction_date_range')
        try:
            batch_op.drop_index('idx_transaction_active_amount')
        except:
            pass
    
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_index('idx_user_active_admin')
        batch_op.drop_index('idx_user_created_at')
    
    with op.batch_alter_table('audit_log', schema=None) as batch_op:
        batch_op.drop_index('idx_audit_user_action')
        batch_op.drop_index('idx_audit_table_record')
        batch_op.drop_index('idx_audit_timestamp_action')
    
    with op.batch_alter_table('user_session', schema=None) as batch_op:
        batch_op.drop_index('idx_session_user_active')
        batch_op.drop_index('idx_session_last_active')
    
    with op.batch_alter_table('login_attempt', schema=None) as batch_op:
        batch_op.drop_index('idx_login_username_timestamp')
        batch_op.drop_index('idx_login_ip_timestamp')
        batch_op.drop_index('idx_login_success_timestamp')
    
    with op.batch_alter_table('exchange_rate', schema=None) as batch_op:
        batch_op.drop_index('idx_exchange_rate_date_desc')
    
    with op.batch_alter_table('daily_balance', schema=None) as batch_op:
        batch_op.drop_index('idx_daily_balance_date_desc')
        batch_op.drop_index('idx_daily_balance_psp_date')
    
    with op.batch_alter_table('psp_track', schema=None) as batch_op:
        batch_op.drop_index('idx_psp_track_date_desc')
        batch_op.drop_index('idx_psp_track_psp_date_desc')
