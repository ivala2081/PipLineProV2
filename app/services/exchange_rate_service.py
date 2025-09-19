"""
Exchange Rate Service
Fetches and manages USD/TRY exchange rates using yfinance
Provides automatic updates every 15 minutes and fallback mechanisms
"""

import yfinance as yf
import logging
from datetime import datetime, timezone, timedelta, date
from decimal import Decimal
from typing import Optional, Dict, Any
import threading
import time
from app.models.exchange_rate import ExchangeRate
from app import db
import requests

logger = logging.getLogger(__name__)


class ExchangeRateService:
    """
    Service for managing USD/TRY exchange rates
    
    Features:
    - Fetches rates from yfinance every 15 minutes
    - Provides fallback mechanisms if yfinance fails
    - Stores historical rates in database
    - Sends notifications on significant rate changes
    """
    
    def __init__(self):
        self.currency_pairs = {
            'USD': 'USDTRY=X',  # Yahoo Finance format for USD/TRY
            'EUR': 'EURTRY=X'   # Yahoo Finance format for EUR/TRY
        }
        self.update_interval = 15 * 60  # 15 minutes in seconds
        self.is_running = False
        self.update_thread = None
        self.last_rates = {}
        self.notification_threshold = 0.5  # 0.5 TRY change triggers notification
        
    def get_current_rate_from_api(self, currency='USD') -> Optional[Dict[str, Any]]:
        """
        Fetch current exchange rate from yfinance
        
        Args:
            currency (str): Currency code (USD, EUR)
        
        Returns:
            Dict with rate data or None if failed
        """
        try:
            if currency not in self.currency_pairs:
                logger.error(f"Unsupported currency: {currency}")
                return None
                
            currency_pair = self.currency_pairs[currency]
            logger.debug(f"Fetching {currency}/TRY rate from yfinance...")
            
            # Create ticker object
            ticker = yf.Ticker(currency_pair)
            
            # Get current data
            info = ticker.info
            history = ticker.history(period="1d", interval="1m")
            
            if history.empty:
                logger.warning(f"No recent data available from yfinance for {currency}")
                return None
            
            # Get the latest price
            latest_data = history.iloc[-1]
            current_rate = float(latest_data['Close'])
            
            # Extract additional data if available
            bid_price = info.get('bid', None)
            ask_price = info.get('ask', None)
            volume = float(latest_data['Volume']) if 'Volume' in latest_data else None
            
            rate_data = {
                'currency': currency,
                'rate': current_rate,
                'bid_price': bid_price,
                'ask_price': ask_price,
                'volume': volume,
                'source': 'yfinance',
                'timestamp': datetime.now(timezone.utc)
            }
            
            logger.debug(f"Successfully fetched {currency}/TRY rate: {current_rate}")
            return rate_data
            
        except Exception as e:
            logger.error(f"Error fetching {currency} rate from yfinance: {e}")
            return None
    
    def get_fallback_rate(self, app=None, currency='USD') -> Optional[Dict[str, Any]]:
        """
        Get fallback rate from alternative sources or database
        
        Returns:
            Dict with rate data or None if failed
        """
        try:
            # Try alternative API (example: exchangerate-api.com)
            logger.info("Trying fallback rate source...")
            
            # First, try to get the most recent rate from database
            def _get_db_rate():
                recent_rate = ExchangeRate.get_current_rate('USDTRY')
                if recent_rate and not recent_rate.is_stale(max_age_minutes=60):
                    logger.info(f"Using recent database rate: {recent_rate.rate}")
                    return {
                        'rate': float(recent_rate.rate),
                        'source': 'database_recent',
                        'timestamp': datetime.now(timezone.utc)
                    }
                return None
            
            # Try to get from database with proper context
            db_rate = None
            if app:
                try:
                    with app.app_context():
                        db_rate = _get_db_rate()
                except Exception as db_error:
                    logger.warning(f"Could not access database: {db_error}")
            else:
                try:
                    from flask import current_app
                    with current_app.app_context():
                        db_rate = _get_db_rate()
                except (RuntimeError, Exception) as db_error:
                    logger.warning(f"Could not access database: {db_error}")
            
            if db_rate:
                return db_rate
            
            # Try exchangerate-api.com as fallback
            try:
                response = requests.get(
                    'https://api.exchangerate-api.com/v4/latest/USD',
                    timeout=10
                )
                if response.status_code == 200:
                    data = response.json()
                    try_rate = data['rates'].get('TRY')
                    if try_rate:
                        logger.info(f"Fallback rate from exchangerate-api: {try_rate}")
                        return {
                            'rate': float(try_rate),
                            'source': 'exchangerate-api',
                            'timestamp': datetime.now(timezone.utc)
                        }
                        
            except Exception as api_error:
                logger.warning(f"Fallback API failed: {api_error}")
            
            # Last resort: use a reasonable default based on recent trends
            default_rates = {
                'USD': 27.5,  # Update this periodically based on market conditions
                'EUR': 30.0   # Update this periodically based on market conditions
            }
            default_rate = default_rates.get(currency, 27.5)
            logger.warning(f"Using default fallback rate for {currency}: {default_rate}")
            return {
                'currency': currency,
                'rate': default_rate,
                'source': 'fallback_default',
                'timestamp': datetime.now(timezone.utc)
            }
            
        except Exception as e:
            logger.error(f"Error getting fallback rate: {e}")
            return None
    
    def update_exchange_rate(self, app=None, currency='USD') -> bool:
        """
        Update exchange rate in database
        
        Args:
            app: Flask app instance for context (optional)
            currency: Currency to update (USD, EUR)
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            # Try to get rate from yfinance first
            rate_data = self.get_current_rate_from_api(currency)
            
            # If yfinance fails, try fallback
            if not rate_data:
                rate_data = self.get_fallback_rate(app, currency)
            
            if not rate_data:
                logger.error(f"Failed to get {currency} exchange rate from any source")
                return False
            
            # Database operations need app context
            def _update_in_context():
                # Create new rate in database
                currency_pair = f"{currency}TRY"
                new_rate = ExchangeRate.create_new_rate(
                    rate=rate_data['rate'],
                    currency_pair=currency_pair,
                    source=rate_data['source'],
                    bid_price=rate_data.get('bid_price'),
                    ask_price=rate_data.get('ask_price'),
                    volume=rate_data.get('volume')
                )
                
                # Check for significant changes and send notifications
                self.check_rate_change_notification(new_rate)
                
                # Update last rate for comparison
                self.last_rates[currency] = new_rate.rate
                
                logger.debug(f"Exchange rate updated successfully: {new_rate.rate} TRY/{currency}")
                return True
            
            # Try to use provided app context or current context
            if app:
                with app.app_context():
                    return _update_in_context()
            else:
                try:
                    from flask import current_app
                    with current_app.app_context():
                        return _update_in_context()
                except RuntimeError:
                    # No app context available, try without it
                    logger.warning("No Flask app context available for database operations")
                    return _update_in_context()
            
        except Exception as e:
            logger.error(f"Error updating {currency} exchange rate: {e}")
            return False
    
    def check_rate_change_notification(self, new_rate: ExchangeRate):
        """
        Check if rate change is significant and send notification
        
        Args:
            new_rate (ExchangeRate): Newly created rate
        """
        try:
            # Get previous rate for comparison
            previous_rates = ExchangeRate.get_rate_history('USDTRY', limit=2)
            
            if len(previous_rates) < 2:
                return  # Not enough data for comparison
            
            previous_rate = previous_rates[1]  # Second most recent (first is current)
            rate_change = float(new_rate.rate - previous_rate.rate)
            percentage_change = (rate_change / float(previous_rate.rate)) * 100
            
            # Check if change is significant
            if abs(rate_change) >= self.notification_threshold:
                direction = "increased" if rate_change > 0 else "decreased"
                message = (
                    f"USD/TRY rate {direction} significantly: "
                    f"{previous_rate.rate:.4f} -> {new_rate.rate:.4f} "
                    f"({rate_change:+.4f} TRY, {percentage_change:+.2f}%)"
                )
                
                logger.info(f"Rate change notification: {message}")
                
                # Here you can implement actual notification sending
                # (email, websocket, push notification, etc.)
                self.send_rate_notification(message, rate_change, percentage_change)
                
        except Exception as e:
            logger.error(f"Error checking rate change notification: {e}")
    
    def send_rate_notification(self, message: str, rate_change: float, percentage_change: float):
        """
        Send rate change notification
        
        Args:
            message (str): Notification message
            rate_change (float): Absolute rate change
            percentage_change (float): Percentage change
        """
        try:
            # Implementation for sending notifications
            # This could be websocket, email, SMS, etc.
            
            # For now, just log the notification
            logger.info(f"RATE NOTIFICATION: {message}")
            
            # You can extend this to send actual notifications:
            # - WebSocket to frontend
            # - Email alerts
            # - Slack/Discord webhooks
            # - Push notifications
            
        except Exception as e:
            logger.error(f"Error sending rate notification: {e}")
    
    def start_auto_update(self, app=None):
        """Start automatic rate updates every 15 minutes"""
        if self.is_running:
            logger.warning("Exchange rate auto-update is already running")
            return
        
        self.is_running = True
        self.app = app  # Store app reference for context
        self.update_thread = threading.Thread(target=self._auto_update_loop, daemon=True)
        self.update_thread.start()
        logger.debug("Started automatic exchange rate updates (every 15 minutes)")
    
    def stop_auto_update(self):
        """Stop automatic rate updates"""
        self.is_running = False
        if self.update_thread:
            self.update_thread.join(timeout=5)
        logger.info("Stopped automatic exchange rate updates")
    
    def _auto_update_loop(self):
        """Internal loop for automatic updates"""
        while self.is_running:
            try:
                # Update both USD and EUR rates
                usd_success = self.update_exchange_rate(self.app, 'USD')
                eur_success = self.update_exchange_rate(self.app, 'EUR')
                
                if usd_success and eur_success:
                    logger.debug("Successfully updated both USD and EUR exchange rates")
                elif usd_success or eur_success:
                    logger.warning("Partially updated exchange rates")
                else:
                    logger.error("Failed to update any exchange rates")
                
                # Wait for next update
                time.sleep(self.update_interval)
                
            except Exception as e:
                logger.error(f"Error in auto-update loop: {e}")
                # Wait a bit before retrying
                time.sleep(60)
    
    def get_current_rate(self) -> Optional[ExchangeRate]:
        """
        Get current exchange rate from database
        
        Returns:
            ExchangeRate: Current rate or None if not available
        """
        return ExchangeRate.get_current_rate('USDTRY')
    
    def get_eur_rate(self) -> Optional[ExchangeRate]:
        """
        Get current EUR/TRY exchange rate from database
        
        Returns:
            ExchangeRate: Current EUR rate or None if not available
        """
        return ExchangeRate.get_current_rate('EURTRY')
    
    def get_rate_for_date(self, date: datetime) -> Optional[ExchangeRate]:
        """
        Get exchange rate for a specific date
        
        Args:
            date (datetime): Target date
            
        Returns:
            ExchangeRate: Rate for the date or None if not available
        """
        return ExchangeRate.get_rate_at_date(date, 'USDTRY')
    
    def convert_usd_to_try(self, usd_amount: Decimal, rate: Optional[Decimal] = None) -> Decimal:
        """
        Convert USD amount to TRY
        
        Args:
            usd_amount (Decimal): Amount in USD
            rate (Decimal, optional): Specific rate to use
            
        Returns:
            Decimal: Amount in TRY
        """
        if not rate:
            current_rate = self.get_current_rate()
            if current_rate:
                rate = current_rate.rate
            else:
                # Fallback rate
                rate = Decimal('27.5')
        
        return Decimal(str(usd_amount)) * Decimal(str(rate))
    
    def is_rate_stale(self, max_age_minutes: int = 15) -> bool:
        """
        Check if current rate is stale
        
        Args:
            max_age_minutes (int): Maximum age in minutes
            
        Returns:
            bool: True if rate is stale or missing
        """
        current_rate = self.get_current_rate()
        if not current_rate:
            return True
        
        return current_rate.is_stale(max_age_minutes)
    
    def force_update(self) -> bool:
        """
        Force an immediate rate update
        
        Returns:
            bool: True if successful
        """
        logger.info("Forcing exchange rate update...")
        return self.update_exchange_rate()
    
    def get_or_fetch_rate(self, currency: str, date_obj) -> Optional[Decimal]:
        """
        Get exchange rate for a specific currency and date, fetch if not available
        
        Args:
            currency (str): Currency code (USD, EUR)
            date_obj (date): Date for the rate
            
        Returns:
            Decimal: Exchange rate or None if not available
        """
        try:
            from app.models.exchange_rate import ExchangeRate
            
            # Try to get rate from database first
            if currency == 'USD':
                db_rate = ExchangeRate.get_current_rate('USDTRY')
                if db_rate and not db_rate.is_stale(max_age_minutes=60):
                    return db_rate.rate
            
            # If not available or stale, try to fetch fresh rate
            rate_data = self.get_current_rate_from_api()
            if rate_data and currency == 'USD':
                return Decimal(str(rate_data['rate']))
            
            # Fallback rates
            fallback_rates = {
                'USD': Decimal('27.0'),
                'EUR': Decimal('30.0')
            }
            
            return fallback_rates.get(currency, Decimal('1.0'))
            
        except Exception as e:
            logger.error(f"Error getting exchange rate for {currency}: {e}")
            # Return fallback rates
            fallback_rates = {
                'USD': Decimal('27.0'),
                'EUR': Decimal('30.0')
            }
            return fallback_rates.get(currency, Decimal('1.0'))


# Global service instance
exchange_rate_service = ExchangeRateService()