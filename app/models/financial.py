"""
Financial models for PipLine Treasury System
"""
from app import db
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from sqlalchemy.orm import validates

class PspTrack(db.Model):
    """PSP tracking model"""
    __tablename__ = 'psp_track'
    
    id = db.Column(db.Integer, primary_key=True)
    psp_name = db.Column(db.String(100), nullable=False)
    date = db.Column(db.Date, nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=True)
    commission_rate = db.Column(db.Numeric(5, 4), nullable=True)
    commission_amount = db.Column(db.Numeric(15, 2), nullable=True)
    difference = db.Column(db.Numeric(15, 2), nullable=True)
    withdraw = db.Column(db.Numeric(15, 2), nullable=True)
    allocation = db.Column(db.Numeric(15, 2), nullable=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Database constraints and indexes
    __table_args__ = (
        db.Index('idx_psp_track_psp_name', 'psp_name'),
        db.Index('idx_psp_track_date', 'date'),
        db.Index('idx_psp_track_psp_date', 'psp_name', 'date'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'psp_name': self.psp_name,
            'date': self.date.isoformat() if self.date else None,
            'amount': float(self.amount) if self.amount else 0.0,
            'commission_rate': float(self.commission_rate) if self.commission_rate else 0.0,
            'commission_amount': float(self.commission_amount) if self.commission_amount else 0.0,
            'difference': float(self.difference) if self.difference else 0.0,
            'withdraw': float(self.withdraw) if self.withdraw else 0.0,
            'allocation': float(self.allocation) if self.allocation else 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<PspTrack {self.psp_name}:{self.date}:{self.amount}>'

class DailyBalance(db.Model):
    """Daily balance tracking model"""
    __tablename__ = 'daily_balance'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    psp = db.Column(db.String(50), nullable=False)
    opening_balance = db.Column(db.Numeric(15, 2), default=0.0)
    total_inflow = db.Column(db.Numeric(15, 2), default=0.0)
    total_outflow = db.Column(db.Numeric(15, 2), default=0.0)
    total_commission = db.Column(db.Numeric(15, 2), default=0.0)
    net_amount = db.Column(db.Numeric(15, 2), default=0.0)
    closing_balance = db.Column(db.Numeric(15, 2), default=0.0)
    allocation = db.Column(db.Numeric(15, 2), default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Database constraints and indexes
    __table_args__ = (
        db.UniqueConstraint('date', 'psp', name='uq_daily_balance_date_psp'),
        db.Index('idx_daily_balance_date', 'date'),
        db.Index('idx_daily_balance_psp', 'psp'),
        db.Index('idx_daily_balance_date_psp', 'date', 'psp'),
    )
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'psp': self.psp,
            'opening_balance': float(self.opening_balance) if self.opening_balance else 0.0,
            'total_inflow': float(self.total_inflow) if self.total_inflow else 0.0,
            'total_outflow': float(self.total_outflow) if self.total_outflow else 0.0,
            'total_commission': float(self.total_commission) if self.total_commission else 0.0,
            'net_amount': float(self.net_amount) if self.net_amount else 0.0,
            'closing_balance': float(self.closing_balance) if self.closing_balance else 0.0,
            'allocation': float(self.allocation) if self.allocation else 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<DailyBalance {self.date}:{self.psp}:{self.net_amount}>'

class PSPAllocation(db.Model):
    """PSP allocation model for storing allocation data by date"""
    __tablename__ = 'psp_allocation'
    
    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False)
    psp_name = db.Column(db.String(100), nullable=False)
    allocation_amount = db.Column(db.Numeric(15, 2), default=0.0)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Composite unique constraint to ensure one allocation per PSP per date
    __table_args__ = (
        db.UniqueConstraint('date', 'psp_name', name='uq_psp_allocation_date_psp'),
        db.Index('idx_psp_allocation_date', 'date'),
        db.Index('idx_psp_allocation_psp', 'psp_name'),
        db.Index('idx_psp_allocation_date_psp', 'date', 'psp_name'),
    )
    
    @validates('allocation_amount')
    def validate_allocation_amount(self, key, value):
        """Validate allocation amount"""
        try:
            amount = Decimal(str(value))
            if amount < 0:
                raise ValueError('Allocation amount cannot be negative')
            if amount > 999999999.99:
                raise ValueError('Allocation amount too large')
            return amount
        except (InvalidOperation, ValueError) as e:
            raise ValueError(f'Invalid allocation amount: {e}')
    
    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'date': self.date.isoformat() if self.date else None,
            'psp_name': self.psp_name,
            'allocation_amount': float(self.allocation_amount) if self.allocation_amount else 0.0,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
    
    def __repr__(self):
        return f'<PSPAllocation {self.date}:{self.psp_name}:{self.allocation_amount}>' 