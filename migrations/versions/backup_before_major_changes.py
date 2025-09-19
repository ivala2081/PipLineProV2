"""Backup data before major changes

Revision ID: backup_before_major_changes
Revises: b206f1fa6c54
Create Date: 2025-09-05 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = 'backup_before_major_changes'
down_revision = 'b206f1fa6c54'
branch_labels = None
depends_on = None


def upgrade():
    """Backup data before making changes"""
    # Create backup tables
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS employee_backup AS 
        SELECT * FROM employee WHERE 1=0
    """))
    
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS reconciliation_backup AS 
        SELECT * FROM reconciliation WHERE 1=0
    """))
    
    op.execute(text("""
        CREATE TABLE IF NOT EXISTS translation_backup AS 
        SELECT * FROM translation WHERE 1=0
    """))
    
    # Copy data to backup tables
    op.execute(text("""
        INSERT INTO employee_backup 
        SELECT * FROM employee
    """))
    
    op.execute(text("""
        INSERT INTO reconciliation_backup 
        SELECT * FROM reconciliation
    """))
    
    op.execute(text("""
        INSERT INTO translation_backup 
        SELECT * FROM translation
    """))


def downgrade():
    """Remove backup tables"""
    op.execute(text("DROP TABLE IF EXISTS employee_backup"))
    op.execute(text("DROP TABLE IF EXISTS reconciliation_backup"))
    op.execute(text("DROP TABLE IF EXISTS translation_backup"))
