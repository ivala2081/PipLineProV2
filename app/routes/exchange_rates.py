"""
Exchange Rates Routes for PipLine Treasury System
Provides API endpoints for managing exchange rates with yfinance integration
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from datetime import date, datetime
import logging
from typing import Dict, List, Optional

from app.services.exchange_rate_service import ExchangeRateService
from app.models.exchange_rate import ExchangeRate
from app import db
from app.utils.error_handler import handle_api_errors

logger = logging.getLogger(__name__)

# Create blueprint
exchange_rates_bp = Blueprint('exchange_rates', __name__)

# Temporarily disable CSRF protection for exchange rates API
from app import csrf
csrf.exempt(exchange_rates_bp)

# Initialize service
exchange_rate_service = ExchangeRateService()

@exchange_rates_bp.route('/api/exchange-rates/status', methods=['GET'])
@login_required
@handle_api_errors
def get_exchange_rates_status():
    """Get status of exchange rates system"""
    try:
        return jsonify({
            'status': 'success',
            'message': 'Exchange rates system is operational',
            'supported_pairs': list(exchange_rate_service.supported_pairs.keys()),
            'service_status': 'active'
        }), 200
    except Exception as e:
        logger.error(f"Error getting exchange rates status: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Failed to get exchange rates status'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/fetch', methods=['POST'])
@login_required
@handle_api_errors
def fetch_exchange_rate():
    """Fetch exchange rate for a specific date and currency pair"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        target_date_str = data.get('date')
        currency_pair = data.get('currency_pair')
        
        if not target_date_str or not currency_pair:
            return jsonify({
                'status': 'error',
                'message': 'Date and currency_pair are required'
            }), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate currency pair
        if currency_pair not in exchange_rate_service.supported_pairs:
            return jsonify({
                'status': 'error',
                'message': f'Unsupported currency pair. Supported: {list(exchange_rate_service.supported_pairs.keys())}'
            }), 400
        
        # Extract base currency from pair (e.g., "USD/TRY" -> "USD")
        base_currency = currency_pair.split('/')[0]
        
        # Fetch or get rate
        rate = exchange_rate_service.get_or_fetch_rate(base_currency, target_date)
        
        if rate:
            # Create a mock ExchangeRate object for the response
            rate_data = {
                'id': 0,  # Will be set by database when saved
                'date': target_date_str,
                'currency_pair': currency_pair,
                'rate': float(rate),
                'source': 'yfinance',
                'is_manual_override': False,
                'data_quality': 'closing_price',
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat()
            }
            
            return jsonify({
                'status': 'success',
                'rate': rate_data,
                'message': f'Successfully retrieved rate for {currency_pair} on {target_date_str}'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to fetch rate for {currency_pair} on {target_date_str}'
            }), 404
            
    except Exception as e:
        logger.error(f"Error fetching exchange rate: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/daily-summary', methods=['POST'])
@login_required
def get_daily_summary_rates():
    """Get all exchange rates needed for daily summary calculations"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        target_date_str = data.get('date')
        
        if not target_date_str:
            return jsonify({
                'status': 'error',
                'message': 'Date is required'
            }), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Get all rates for daily summary
        rates = exchange_rate_service.get_rates_for_daily_summary(target_date)
        
        # Convert to ExchangeRate objects format
        rates_dict = {}
        for currency_pair, rate in rates.items():
            if rate is not None:
                # Create ExchangeRate object structure with proper currency pair format
                full_currency_pair = f"{currency_pair}/TRY"
                rates_dict[full_currency_pair] = {
                    'id': 0,  # Will be set by database if exists
                    'date': target_date_str,
                    'currency_pair': full_currency_pair,
                    'rate': float(rate),
                    'source': 'yfinance',
                    'is_manual_override': False,
                    'data_quality': 'good',
                    'created_at': datetime.now().isoformat(),
                    'updated_at': datetime.now().isoformat()
                }
            else:
                full_currency_pair = f"{currency_pair}/TRY"
                rates_dict[full_currency_pair] = None
        
        return jsonify({
            'status': 'success',
            'date': target_date_str,
            'rates': rates_dict,
            'message': f'Successfully retrieved {len(rates)} rates for {target_date_str}'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting daily summary rates: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/manual-update', methods=['POST'])
@login_required
def update_manual_rate():
    """Update exchange rate manually with override"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        target_date_str = data.get('date')
        currency_pair = data.get('currency_pair')
        new_rate = data.get('rate')
        reason = data.get('reason', 'Manual override by user')
        
        if not all([target_date_str, currency_pair, new_rate]):
            return jsonify({
                'status': 'error',
                'message': 'Date, currency_pair, and rate are required'
            }), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate currency pair
        if currency_pair not in exchange_rate_service.supported_pairs:
            return jsonify({
                'status': 'error',
                'message': f'Unsupported currency pair. Supported: {list(exchange_rate_service.supported_pairs.keys())}'
            }), 400
        
        # Validate rate
        try:
            new_rate = float(new_rate)
        except (ValueError, TypeError):
            return jsonify({
                'status': 'error',
                'message': 'Rate must be a valid number'
            }), 400
        
        # Update rate
        updated_rate = exchange_rate_service.update_manual_rate(
            target_date, currency_pair, new_rate, reason
        )
        
        if updated_rate:
            return jsonify({
                'status': 'success',
                'rate': updated_rate.to_dict(),
                'message': f'Successfully updated rate for {currency_pair} on {target_date_str}'
            }), 200
        else:
            return jsonify({
                'status': 'error',
                'message': f'Failed to update rate for {currency_pair} on {target_date_str}'
            }), 400
            
    except Exception as e:
        logger.error(f"Error updating manual rate: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/refresh', methods=['POST'])
@login_required
def refresh_exchange_rates():
    """Force refresh exchange rates for a specific date"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        target_date_str = data.get('date')
        currency_pairs = data.get('currency_pairs')  # Optional, defaults to all
        
        if not target_date_str:
            return jsonify({
                'status': 'error',
                'message': 'Date is required'
            }), 400
        
        # Parse date
        try:
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate currency pairs if provided
        if currency_pairs:
            for pair in currency_pairs:
                if pair not in exchange_rate_service.supported_pairs:
                    return jsonify({
                        'status': 'error',
                        'message': f'Unsupported currency pair: {pair}'
                    }), 400
        
        # Refresh rates
        results = exchange_rate_service.refresh_rates_for_date(target_date, currency_pairs)
        
        # Count successes and failures
        success_count = sum(1 for success in results.values() if success)
        total_count = len(results)
        
        return jsonify({
            'status': 'success',
            'date': target_date_str,
            'results': results,
            'summary': {
                'total': total_count,
                'successful': success_count,
                'failed': total_count - success_count
            },
            'message': f'Refreshed {success_count}/{total_count} rates for {target_date_str}'
        }), 200
        
    except Exception as e:
        logger.error(f"Error refreshing exchange rates: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/history', methods=['GET'])
@login_required
def get_exchange_rate_history():
    """Get exchange rate history for a date range"""
    try:
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        currency_pair = request.args.get('currency_pair')
        
        if not all([start_date_str, end_date_str]):
            return jsonify({
                'status': 'error',
                'message': 'start_date and end_date are required'
            }), 400
        
        # Parse dates
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate date range
        if start_date > end_date:
            return jsonify({
                'status': 'error',
                'message': 'start_date must be before or equal to end_date'
            }), 400
        
        # Validate currency pair if provided
        currency_pairs = None
        if currency_pair:
            if currency_pair not in exchange_rate_service.supported_pairs:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported currency pair: {currency_pair}'
                }), 400
            currency_pairs = [currency_pair]
        
        # Get rates from database
        rates = ExchangeRate.get_rates_for_date_range(start_date, end_date, currency_pairs)
        
        # Convert to dictionary format
        rates_list = [rate.to_dict() for rate in rates]
        
        return jsonify({
            'status': 'success',
            'start_date': start_date_str,
            'end_date': end_date_str,
            'currency_pair': currency_pair,
            'rates': rates_list,
            'count': len(rates_list),
            'message': f'Retrieved {len(rates_list)} rates for the specified period'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting exchange rate history: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500

@exchange_rates_bp.route('/api/exchange-rates/missing', methods=['POST'])
@login_required
def get_missing_rates():
    """Find dates with missing exchange rates"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({
                'status': 'error',
                'message': 'No data provided'
            }), 400
        
        start_date_str = data.get('start_date')
        end_date_str = data.get('end_date')
        currency_pairs = data.get('currency_pairs')
        
        if not all([start_date_str, end_date_str, currency_pairs]):
            return jsonify({
                'status': 'error',
                'message': 'start_date, end_date, and currency_pairs are required'
            }), 400
        
        # Parse dates
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return jsonify({
                'status': 'error',
                'message': 'Invalid date format. Use YYYY-MM-DD'
            }), 400
        
        # Validate currency pairs
        for pair in currency_pairs:
            if pair not in exchange_rate_service.supported_pairs:
                return jsonify({
                    'status': 'error',
                    'message': f'Unsupported currency pair: {pair}'
                }), 400
        
        # Find missing dates
        missing_dates = ExchangeRate.get_missing_dates(start_date, end_date, currency_pairs)
        
        return jsonify({
            'status': 'success',
            'start_date': start_date_str,
            'end_date': end_date_str,
            'currency_pairs': currency_pairs,
            'missing_dates': missing_dates,
            'count': len(missing_dates),
            'message': f'Found {len(missing_dates)} missing rate entries'
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting missing rates: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': 'Internal server error'
        }), 500
