"""
Commission Rate Service for PipLine Treasury System
Handles time-based commission rate retrieval and management
"""
from datetime import date
from decimal import Decimal
from app.models.psp_commission_rate import PSPCommissionRate
from app.models.config import Option
import logging

logger = logging.getLogger(__name__)

class CommissionRateService:
    """Service for managing PSP commission rates"""
    
    @staticmethod
    def get_commission_rate(psp_name: str, target_date: date = None) -> Decimal:
        """
        Get commission rate for a PSP on a specific date
        
        Args:
            psp_name: Name of the PSP
            target_date: Date to get rate for (defaults to today)
            
        Returns:
            Commission rate as decimal (0.15 = 15%)
        """
        if target_date is None:
            target_date = date.today()
        
        try:
            # First try the new time-based system
            rate = PSPCommissionRate.get_rate_for_date(psp_name, target_date)
            if rate > 0:
                logger.debug(f"Found time-based rate for {psp_name} on {target_date}: {rate}")
                return rate
        except Exception as e:
            logger.warning(f"Error getting time-based rate for {psp_name}: {e}")
        
        # Fallback to old system for backward compatibility
        try:
            from app.models.config import Option
            psp_option = Option.query.filter_by(
                field_name='psp',
                value=psp_name,
                is_active=True
            ).first()
            
            if psp_option and psp_option.commission_rate is not None:
                rate = psp_option.commission_rate
                logger.debug(f"Found legacy rate for {psp_name}: {rate}")
                return rate
        except Exception as e:
            logger.warning(f"Error getting legacy rate for {psp_name}: {e}")
        
        # No rate found
        logger.warning(f"No commission rate found for {psp_name} on {target_date}")
        return Decimal('0.0')
    
    @staticmethod
    def get_commission_rate_percentage(psp_name: str, target_date: date = None) -> float:
        """
        Get commission rate as percentage for a PSP on a specific date
        
        Args:
            psp_name: Name of the PSP
            target_date: Date to get rate for (defaults to today)
            
        Returns:
            Commission rate as percentage (15.0 = 15%)
        """
        rate = CommissionRateService.get_commission_rate(psp_name, target_date)
        return float(rate * 100)
    
    @staticmethod
    def set_commission_rate(psp_name: str, new_rate: Decimal, effective_from: date, effective_until: date = None):
        """
        Set a new commission rate for a PSP
        
        Args:
            psp_name: Name of the PSP
            new_rate: New commission rate as decimal (0.15 = 15%)
            effective_from: When this rate becomes effective
            effective_until: When this rate expires (None = current)
        """
        try:
            rate_record = PSPCommissionRate.set_new_rate(
                psp_name=psp_name,
                new_rate=new_rate,
                effective_from=effective_from,
                effective_until=effective_until
            )
            logger.info(f"Set new commission rate for {psp_name}: {new_rate} from {effective_from}")
            return rate_record
        except Exception as e:
            logger.error(f"Error setting commission rate for {psp_name}: {e}")
            raise
    
    @staticmethod
    def get_rate_history(psp_name: str):
        """
        Get commission rate history for a PSP
        
        Args:
            psp_name: Name of the PSP
            
        Returns:
            List of rate records
        """
        try:
            return PSPCommissionRate.get_rate_history(psp_name)
        except Exception as e:
            logger.error(f"Error getting rate history for {psp_name}: {e}")
            return []
    
    @staticmethod
    def migrate_legacy_rates():
        """
        Migrate legacy commission rates to time-based system
        This should be run once during system upgrade
        """
        try:
            from app.models.config import Option
            
            # Get all PSP options with commission rates
            psp_options = Option.query.filter_by(
                field_name='psp', 
                is_active=True
            ).filter(Option.commission_rate.isnot(None)).all()
            
            migrated_count = 0
            for option in psp_options:
                # Check if already migrated
                existing = PSPCommissionRate.query.filter_by(psp_name=option.value).first()
                if existing:
                    continue
                
                # Create rate record
                effective_from = option.created_at.date() if option.created_at else date(2024, 1, 1)
                
                PSPCommissionRate(
                    psp_name=option.value,
                    commission_rate=option.commission_rate,
                    effective_from=effective_from,
                    effective_until=None,
                    is_active=True
                )
                migrated_count += 1
            
            logger.info(f"Migrated {migrated_count} legacy commission rates")
            return migrated_count
            
        except Exception as e:
            logger.error(f"Error migrating legacy rates: {e}")
            raise
