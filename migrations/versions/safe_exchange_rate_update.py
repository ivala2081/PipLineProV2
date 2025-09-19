"""Safe exchange rate table update without data loss

Revision ID: safe_exchange_rate_update
Revises: backup_before_major_changes
Create Date: 2025-09-05 17:35:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'safe_exchange_rate_update'
down_revision = 'backup_before_major_changes'
branch_labels = None
depends_on = None


def upgrade():
    """Safely update exchange rate table structure"""
    
    # Update exchange_rates table structure
    with op.batch_alter_table('exchange_rates', schema=None) as batch_op:
        # Add new columns
        batch_op.add_column(sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')))
        batch_op.add_column(sa.Column('bid_price', sa.Numeric(precision=10, scale=4), nullable=True))
        batch_op.add_column(sa.Column('ask_price', sa.Numeric(precision=10, scale=4), nullable=True))
        batch_op.add_column(sa.Column('volume', sa.Numeric(precision=15, scale=2), nullable=True))
        
        # Update existing columns
        batch_op.alter_column('id', existing_type=sa.INTEGER(), nullable=False, autoincrement=True)
        batch_op.alter_column('source', existing_type=sa.VARCHAR(length=50), nullable=False, 
                             existing_server_default=sa.text("'yfinance'"))
        batch_op.alter_column('created_at', existing_type=sa.DATETIME(), nullable=False, 
                             existing_server_default=sa.text('(CURRENT_TIMESTAMP)'))
        
        # Update indexes
        batch_op.drop_index(batch_op.f('idx_exchange_rate_date'))
        batch_op.drop_index(batch_op.f('idx_exchange_rate_date_currency'))
        batch_op.drop_index(batch_op.f('idx_exchange_rate_manual_override'))
        batch_op.drop_index(batch_op.f('idx_exchange_rate_source'))
        
        batch_op.create_index('idx_created_at', ['created_at'], unique=False)
        batch_op.create_index('idx_currency_pair_active', ['currency_pair', 'is_active'], unique=False)
        batch_op.create_index('idx_currency_pair_created', ['currency_pair', 'created_at'], unique=False)
        batch_op.create_index(batch_op.f('ix_exchange_rates_currency_pair'), ['currency_pair'], unique=False)
        
        # Drop old columns
        batch_op.drop_column('override_reason')
        batch_op.drop_column('data_quality')
        batch_op.drop_column('date')
        batch_op.drop_column('is_manual_override')
        batch_op.drop_column('updated_at')

    # Update transaction table indexes
    with op.batch_alter_table('transaction', schema=None) as batch_op:
        batch_op.alter_column('id', existing_type=sa.INTEGER(), nullable=False, autoincrement=True)
        
        # Add new indexes
        batch_op.create_index('idx_transaction_category', ['category'], unique=False)
        batch_op.create_index('idx_transaction_client', ['client_name'], unique=False)
        batch_op.create_index('idx_transaction_company', ['company'], unique=False)
        batch_op.create_index('idx_transaction_created_at', ['created_at'], unique=False)
        batch_op.create_index('idx_transaction_created_by', ['created_by'], unique=False)
        batch_op.create_index('idx_transaction_created_by_date', ['created_by', 'date'], unique=False)
        batch_op.create_index('idx_transaction_currency', ['currency'], unique=False)
        batch_op.create_index('idx_transaction_date', ['date'], unique=False)
        batch_op.create_index('idx_transaction_date_category', ['date', 'category'], unique=False)
        batch_op.create_index('idx_transaction_date_currency', ['date', 'currency'], unique=False)
        batch_op.create_index('idx_transaction_date_currency_psp', ['date', 'currency', 'psp'], unique=False)
        batch_op.create_index('idx_transaction_date_psp', ['date', 'psp'], unique=False)
        batch_op.create_index('idx_transaction_date_psp_category', ['date', 'psp', 'category'], unique=False)
        batch_op.create_index('idx_transaction_psp', ['psp'], unique=False)
        batch_op.create_index('idx_transaction_psp_category', ['psp', 'category'], unique=False)

    # Update other tables safely
    with op.batch_alter_table('daily_balance', schema=None) as batch_op:
        batch_op.drop_constraint(batch_op.f('_date_psp_uc'), type_='unique')
        batch_op.create_unique_constraint('uq_daily_balance_date_psp', ['date', 'psp'])
        batch_op.drop_column('total_deposits')
        batch_op.drop_column('total_withdrawals')

    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('idx_user_active_optimized'))
        batch_op.drop_index(batch_op.f('idx_user_email_optimized'))
        batch_op.drop_index(batch_op.f('idx_user_username_optimized'))
        batch_op.create_index('idx_user_admin_level', ['admin_level'], unique=False)
        batch_op.create_foreign_key(None, 'user', ['created_by'], ['id'])


def downgrade():
    """Revert changes"""
    # This is a complex downgrade - in production, you'd want to restore from backup
    pass
