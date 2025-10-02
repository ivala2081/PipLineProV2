"""
Financial Performance API Endpoints
Provides real transaction data for dashboard financial performance section
"""

from flask import Blueprint, jsonify, request
from app import db
from app.models.transaction import Transaction
from app.models.exchange_rate import ExchangeRate
from app.services.historical_exchange_service import historical_exchange_service
from datetime import date, timedelta, datetime
from decimal import Decimal
import logging
import time
from functools import lru_cache

logger = logging.getLogger(__name__)

financial_performance_bp = Blueprint('financial_performance', __name__)

# Simple in-memory cache for financial performance data
_financial_performance_cache = {}
_cache_duration = 30  # 30 seconds cache

def normalize_payment_method(payment_method):
    """Normalize payment method to standard categories"""
    if not payment_method:
        return 'OTHER'
    
    pm_lower = payment_method.lower()
    
    if 'bank' in pm_lower or 'banka' in pm_lower:
        return 'BANK'
    elif 'kk' in pm_lower or 'credit' in pm_lower or 'card' in pm_lower:
        return 'CC'
    elif 'tether' in pm_lower:
        return 'TETHER'  # Company's internal KASA in USD
    else:
        return 'OTHER'

def calculate_financial_metrics(start_date, end_date):
    """Calculate financial metrics for a given date range"""
    # Get all transactions in the period
    transactions = Transaction.query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).all()
    
    logger.debug(f"Calculating financial metrics for {start_date} to {end_date}: {len(transactions)} transactions")
    
    # Initialize totals
    totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0}
    }
    
    commission_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    net_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    # Initialize deposit/withdrawal totals
    deposit_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    withdrawal_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    # Process each transaction
    for transaction in transactions:
        payment_method = normalize_payment_method(transaction.payment_method)
        currency = transaction.currency.upper() if transaction.currency else 'TL'
        
        # Normalize currency
        if currency in ['TRY', 'TL']:
            currency = 'TL'
        elif currency == 'USD':
            currency = 'USD'
        else:
            continue  # Skip unsupported currencies
        
        # Get amounts
        amount = Decimal(str(transaction.amount or 0))
        commission = Decimal(str(transaction.commission or 0))
        net_amount = Decimal(str(transaction.net_amount or 0))
        
        # Add to totals - USE NET AMOUNT (excluding commissions)
        totals[payment_method][currency] += net_amount
        totals[payment_method]['count'] += 1
        
        commission_totals[payment_method][currency] += commission
        net_totals[payment_method][currency] += net_amount
        
        # Categorize as deposit or withdrawal based on category
        if transaction.category == 'DEP':
            # Deposit - positive amount
            deposit_totals[payment_method][currency] += amount
        elif transaction.category == 'WD':
            # Withdrawal - positive amount (for display)
            withdrawal_totals[payment_method][currency] += amount
        else:
            # Fallback: use amount sign for backward compatibility
            if amount > 0:
                deposit_totals[payment_method][currency] += amount
            else:
                withdrawal_totals[payment_method][currency] += abs(amount)
    
    return {
        'amounts': totals,
        'commissions': commission_totals,
        'net_amounts': net_totals,
        'deposits': deposit_totals,
        'withdrawals': withdrawal_totals,
        'total_transactions': len(transactions)
    }

def calculate_financial_metrics_with_daily_conversion(start_date, end_date):
    """Calculate financial metrics with day-by-day conversion for more accurate Conv calculations"""
    # Get all transactions in the period
    transactions = Transaction.query.filter(
        Transaction.date >= start_date,
        Transaction.date <= end_date
    ).all()
    
    logger.debug(f"Calculating financial metrics with daily conversion for {start_date} to {end_date}: {len(transactions)} transactions")
    
    # Initialize totals
    totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0'), 'count': 0}
    }
    
    commission_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    net_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    # Initialize deposit/withdrawal totals
    deposit_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    withdrawal_totals = {
        'BANK': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'CC': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'TETHER': {'USD': Decimal('0'), 'TL': Decimal('0')},
        'OTHER': {'USD': Decimal('0'), 'TL': Decimal('0')}
    }
    
    # Group transactions by date for daily conversion
    transactions_by_date = {}
    for transaction in transactions:
        transaction_date = transaction.date
        if transaction_date not in transactions_by_date:
            transactions_by_date[transaction_date] = []
        transactions_by_date[transaction_date].append(transaction)
    
    # Process each day's transactions with that day's exchange rate
    daily_converted_usd = Decimal('0')
    
    for transaction_date, day_transactions in transactions_by_date.items():
        # Get the exchange rate for this specific day
        try:
            daily_rate = historical_exchange_service.get_daily_rate(transaction_date)
            logger.debug(f"Using rate {daily_rate} for {transaction_date}")
        except Exception as e:
            logger.error(f"Error fetching rate for {transaction_date}: {e}")
            # Fallback to current rate
            try:
                current_rate = ExchangeRate.get_current_rate('USDTRY')
                daily_rate = float(current_rate.rate) if current_rate else 48.0
            except Exception:
                daily_rate = 48.0
        
        # Process transactions for this day
        for transaction in day_transactions:
            payment_method = normalize_payment_method(transaction.payment_method)
            currency = transaction.currency.upper() if transaction.currency else 'TL'
            
            # Normalize currency
            if currency in ['TRY', 'TL']:
                currency = 'TL'
            elif currency == 'USD':
                currency = 'USD'
            else:
                continue  # Skip unsupported currencies
            
            # Get amounts
            amount = Decimal(str(transaction.amount or 0))
            commission = Decimal(str(transaction.commission or 0))
            net_amount = Decimal(str(transaction.net_amount or 0))
            
            # Add to totals - USE NET AMOUNT (excluding commissions)
            totals[payment_method][currency] += net_amount
            totals[payment_method]['count'] += 1
            
            commission_totals[payment_method][currency] += commission
            net_totals[payment_method][currency] += net_amount
            
            # Categorize as deposit or withdrawal based on category
            if transaction.category == 'DEP':
                # Deposit - positive amount
                deposit_totals[payment_method][currency] += amount
            elif transaction.category == 'WD':
                # Withdrawal - positive amount (for display)
                withdrawal_totals[payment_method][currency] += amount
            else:
                # Fallback: use amount sign for backward compatibility
                if amount > 0:
                    deposit_totals[payment_method][currency] += amount
                else:
                    withdrawal_totals[payment_method][currency] += abs(amount)
            
            # Convert TL amounts to USD using the specific day's rate
            if currency == 'TL' and payment_method in ['BANK', 'CC']:
                converted_usd = net_amount / Decimal(str(daily_rate))
                daily_converted_usd += converted_usd
                logger.debug(f"Converted {net_amount} TL to {converted_usd} USD using rate {daily_rate} on {transaction_date}")
    
    # Add Tether amounts (already in USD) to the converted total
    tether_usd = totals['TETHER']['USD']
    daily_converted_usd += tether_usd
    
    return {
        'amounts': totals,
        'commissions': commission_totals,
        'net_amounts': net_totals,
        'deposits': deposit_totals,
        'withdrawals': withdrawal_totals,
        'total_transactions': len(transactions),
        'daily_converted_usd': daily_converted_usd
    }

@financial_performance_bp.route('/financial-performance', methods=['GET'])
def get_financial_performance():
    """Get financial performance data for dashboard"""
    try:
        # Get time range from query parameters
        time_range = request.args.get('range', '30d')
        
        # Check cache first
        cache_key = f"financial_performance_{time_range}"
        current_time = time.time()
        
        if cache_key in _financial_performance_cache:
            cached_data, timestamp = _financial_performance_cache[cache_key]
            if current_time - timestamp < _cache_duration:
                logger.debug(f"Returning cached financial performance data for {time_range}")
                return jsonify(cached_data)
        
        # Calculate date range
        end_date = date.today()
        
        if time_range == 'daily':
            start_date = end_date
        elif time_range == '7d':
            start_date = end_date - timedelta(days=7)
        elif time_range == '30d':
            start_date = end_date - timedelta(days=30)
        elif time_range == '90d':
            start_date = end_date - timedelta(days=90)
        elif time_range == 'monthly':
            start_date = end_date.replace(day=1)
        elif time_range == 'annual':
            start_date = end_date.replace(month=1, day=1)
        else:  # 'all'
            start_date = date(2020, 1, 1)  # Far back date
        
        # Get historical exchange rates for accurate calculations
        try:
            # Get current rate for fallback
            current_rate = ExchangeRate.get_current_rate('USDTRY')
            current_exchange_rate = float(current_rate.rate) if current_rate else 48.0
        except Exception:
            current_exchange_rate = 48.0
        
        # Calculate different time periods
        # Daily metrics (today only) - use simple calculation
        daily_end = date.today()
        daily_start = daily_end
        daily_metrics = calculate_financial_metrics(daily_start, daily_end)
        
        # Monthly metrics (this month) - use daily conversion for accuracy
        monthly_end = date.today()
        monthly_start = monthly_end.replace(day=1)
        monthly_metrics = calculate_financial_metrics_with_daily_conversion(monthly_start, monthly_end)
        
        # Annual metrics (this year) - use daily conversion for accuracy
        annual_end = date.today()
        annual_start = annual_end.replace(month=1, day=1)
        annual_metrics = calculate_financial_metrics_with_daily_conversion(annual_start, annual_end)
        
        # Get historical exchange rates for accurate Conv calculations
        try:
            # Daily rate (for today's transactions)
            daily_rate = historical_exchange_service.get_daily_rate(daily_end)
            logger.debug(f"Using daily rate for {daily_end}: {daily_rate}")
            
            # Monthly average rate (for this month's transactions)
            monthly_rate = historical_exchange_service.get_monthly_average_rate(
                monthly_end.year, monthly_end.month
            )
            logger.debug(f"Using monthly average rate for {monthly_end.year}-{monthly_end.month:02d}: {monthly_rate}")
            
            # Annual average rate (for this year's transactions)
            annual_rate = historical_exchange_service.get_monthly_average_rate(
                annual_end.year, 1  # January average as proxy for annual
            )
            logger.debug(f"Using annual rate for {annual_end.year}: {annual_rate}")
            
        except Exception as e:
            logger.error(f"Error fetching historical rates: {e}")
            # Fallback to current rate
            daily_rate = monthly_rate = annual_rate = current_exchange_rate
        
        # Calculate Conv (Conversion) totals - Total revenue in USD
        def calculate_conv_total(metrics, rate):
            """Calculate total revenue in USD by converting TL amounts to USD"""
            bank_usd = float(metrics['amounts']['BANK']['USD'])
            bank_tl_to_usd = float(metrics['amounts']['BANK']['TL']) / rate
            cc_usd = float(metrics['amounts']['CC']['USD'])
            cc_tl_to_usd = float(metrics['amounts']['CC']['TL']) / rate
            tether_usd = float(metrics['amounts']['TETHER']['USD'])
            
            total_usd = bank_usd + bank_tl_to_usd + cc_usd + cc_tl_to_usd + tether_usd
            return total_usd
        
        # Calculate Conv totals for each period
        # Daily: use simple calculation with single rate
        daily_conv_usd = calculate_conv_total(daily_metrics, daily_rate)
        
        # Monthly and Annual: use daily converted amounts (more accurate)
        monthly_conv_usd = float(monthly_metrics.get('daily_converted_usd', 0))
        annual_conv_usd = float(annual_metrics.get('daily_converted_usd', 0))
        
        logger.debug(f"Conv calculations - Daily: {daily_conv_usd}, Monthly: {monthly_conv_usd}, Annual: {annual_conv_usd}")
        
        # Format response
        response_data = {
            'success': True,
            'data': {
                'daily': {
                    'total_bank_usd': float(daily_metrics['amounts']['BANK']['USD']),
                    'total_bank_tl': float(daily_metrics['amounts']['BANK']['TL']),
                    'total_cc_usd': float(daily_metrics['amounts']['CC']['USD']),
                    'total_cc_tl': float(daily_metrics['amounts']['CC']['TL']),
                    'total_tether_usd': float(daily_metrics['amounts']['TETHER']['USD']),
                    'total_tether_tl': float(daily_metrics['amounts']['TETHER']['TL']),
                    'conv_usd': daily_conv_usd,
                    'conv_tl': 0.0,   # Conv is always in USD
                    'total_transactions': daily_metrics['total_transactions'],
                    'bank_count': daily_metrics['amounts']['BANK']['count'],
                    'cc_count': daily_metrics['amounts']['CC']['count'],
                    'tether_count': daily_metrics['amounts']['TETHER']['count'],
                    # Deposit totals
                    'total_deposits_usd': float(daily_metrics['deposits']['BANK']['USD'] + daily_metrics['deposits']['CC']['USD'] + daily_metrics['deposits']['TETHER']['USD']),
                    'total_deposits_tl': float(daily_metrics['deposits']['BANK']['TL'] + daily_metrics['deposits']['CC']['TL'] + daily_metrics['deposits']['TETHER']['TL']),
                    # Withdrawal totals
                    'total_withdrawals_usd': float(daily_metrics['withdrawals']['BANK']['USD'] + daily_metrics['withdrawals']['CC']['USD'] + daily_metrics['withdrawals']['TETHER']['USD']),
                    'total_withdrawals_tl': float(daily_metrics['withdrawals']['BANK']['TL'] + daily_metrics['withdrawals']['CC']['TL'] + daily_metrics['withdrawals']['TETHER']['TL']),
                    # Net cash (deposits - withdrawals)
                    'net_cash_usd': float(daily_metrics['deposits']['BANK']['USD'] + daily_metrics['deposits']['CC']['USD'] + daily_metrics['deposits']['TETHER']['USD']) - float(daily_metrics['withdrawals']['BANK']['USD'] + daily_metrics['withdrawals']['CC']['USD'] + daily_metrics['withdrawals']['TETHER']['USD']),
                    'net_cash_tl': float(daily_metrics['deposits']['BANK']['TL'] + daily_metrics['deposits']['CC']['TL'] + daily_metrics['deposits']['TETHER']['TL']) - float(daily_metrics['withdrawals']['BANK']['TL'] + daily_metrics['withdrawals']['CC']['TL'] + daily_metrics['withdrawals']['TETHER']['TL'])
                },
                'monthly': {
                    'total_bank_usd': float(monthly_metrics['amounts']['BANK']['USD']),
                    'total_bank_tl': float(monthly_metrics['amounts']['BANK']['TL']),
                    'total_cc_usd': float(monthly_metrics['amounts']['CC']['USD']),
                    'total_cc_tl': float(monthly_metrics['amounts']['CC']['TL']),
                    'total_tether_usd': float(monthly_metrics['amounts']['TETHER']['USD']),
                    'total_tether_tl': float(monthly_metrics['amounts']['TETHER']['TL']),
                    'conv_usd': monthly_conv_usd,
                    'conv_tl': 0.0,
                    'total_transactions': monthly_metrics['total_transactions'],
                    'bank_count': monthly_metrics['amounts']['BANK']['count'],
                    'cc_count': monthly_metrics['amounts']['CC']['count'],
                    'tether_count': monthly_metrics['amounts']['TETHER']['count'],
                    # Deposit totals
                    'total_deposits_usd': float(monthly_metrics['deposits']['BANK']['USD'] + monthly_metrics['deposits']['CC']['USD'] + monthly_metrics['deposits']['TETHER']['USD']),
                    'total_deposits_tl': float(monthly_metrics['deposits']['BANK']['TL'] + monthly_metrics['deposits']['CC']['TL'] + monthly_metrics['deposits']['TETHER']['TL']),
                    # Withdrawal totals
                    'total_withdrawals_usd': float(monthly_metrics['withdrawals']['BANK']['USD'] + monthly_metrics['withdrawals']['CC']['USD'] + monthly_metrics['withdrawals']['TETHER']['USD']),
                    'total_withdrawals_tl': float(monthly_metrics['withdrawals']['BANK']['TL'] + monthly_metrics['withdrawals']['CC']['TL'] + monthly_metrics['withdrawals']['TETHER']['TL']),
                    # Net cash (deposits - withdrawals)
                    'net_cash_usd': float(monthly_metrics['deposits']['BANK']['USD'] + monthly_metrics['deposits']['CC']['USD'] + monthly_metrics['deposits']['TETHER']['USD']) - float(monthly_metrics['withdrawals']['BANK']['USD'] + monthly_metrics['withdrawals']['CC']['USD'] + monthly_metrics['withdrawals']['TETHER']['USD']),
                    'net_cash_tl': float(monthly_metrics['deposits']['BANK']['TL'] + monthly_metrics['deposits']['CC']['TL'] + monthly_metrics['deposits']['TETHER']['TL']) - float(monthly_metrics['withdrawals']['BANK']['TL'] + monthly_metrics['withdrawals']['CC']['TL'] + monthly_metrics['withdrawals']['TETHER']['TL'])
                },
                'annual': {
                    'total_bank_usd': float(annual_metrics['amounts']['BANK']['USD']),
                    'total_bank_tl': float(annual_metrics['amounts']['BANK']['TL']),
                    'total_cc_usd': float(annual_metrics['amounts']['CC']['USD']),
                    'total_cc_tl': float(annual_metrics['amounts']['CC']['TL']),
                    'total_tether_usd': float(annual_metrics['amounts']['TETHER']['USD']),
                    'total_tether_tl': float(annual_metrics['amounts']['TETHER']['TL']),
                    'conv_usd': annual_conv_usd,
                    'conv_tl': 0.0,
                    'total_transactions': annual_metrics['total_transactions'],
                    'bank_count': annual_metrics['amounts']['BANK']['count'],
                    'cc_count': annual_metrics['amounts']['CC']['count'],
                    'tether_count': annual_metrics['amounts']['TETHER']['count'],
                    # Deposit totals
                    'total_deposits_usd': float(annual_metrics['deposits']['BANK']['USD'] + annual_metrics['deposits']['CC']['USD'] + annual_metrics['deposits']['TETHER']['USD']),
                    'total_deposits_tl': float(annual_metrics['deposits']['BANK']['TL'] + annual_metrics['deposits']['CC']['TL'] + annual_metrics['deposits']['TETHER']['TL']),
                    # Withdrawal totals
                    'total_withdrawals_usd': float(annual_metrics['withdrawals']['BANK']['USD'] + annual_metrics['withdrawals']['CC']['USD'] + annual_metrics['withdrawals']['TETHER']['USD']),
                    'total_withdrawals_tl': float(annual_metrics['withdrawals']['BANK']['TL'] + annual_metrics['withdrawals']['CC']['TL'] + annual_metrics['withdrawals']['TETHER']['TL']),
                    # Net cash (deposits - withdrawals)
                    'net_cash_usd': float(annual_metrics['deposits']['BANK']['USD'] + annual_metrics['deposits']['CC']['USD'] + annual_metrics['deposits']['TETHER']['USD']) - float(annual_metrics['withdrawals']['BANK']['USD'] + annual_metrics['withdrawals']['CC']['USD'] + annual_metrics['withdrawals']['TETHER']['USD']),
                    'net_cash_tl': float(annual_metrics['deposits']['BANK']['TL'] + annual_metrics['deposits']['CC']['TL'] + annual_metrics['deposits']['TETHER']['TL']) - float(annual_metrics['withdrawals']['BANK']['TL'] + annual_metrics['withdrawals']['CC']['TL'] + annual_metrics['withdrawals']['TETHER']['TL'])
                },
                'exchange_rate': current_exchange_rate,
                'historical_rates': {
                    'daily_rate': daily_rate,
                    'monthly_rate': monthly_rate,
                    'annual_rate': annual_rate
                },
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'range': time_range
                }
            }
        }
        
        logger.debug(f"Financial performance data retrieved for range {time_range}: Daily={daily_metrics['total_transactions']}, Monthly={monthly_metrics['total_transactions']}, Annual={annual_metrics['total_transactions']} transactions")
        
        # Cache the response
        _financial_performance_cache[cache_key] = (response_data, current_time)
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error retrieving financial performance data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve financial performance data',
            'message': str(e)
        }), 500

@financial_performance_bp.route('/financial-performance/daily', methods=['GET'])
def get_daily_financial_performance():
    """Get daily financial performance data for a specific date"""
    try:
        # Get date from query parameters
        date_str = request.args.get('date')
        
        if date_str:
            # Parse the specific date
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        else:
            # Default to today
            target_date = date.today()
        
        logger.info(f"Daily endpoint called for {target_date}")
        
        # Calculate metrics for the specific date
        metrics = calculate_financial_metrics(target_date, target_date)
        
        logger.info(f"Daily metrics calculated: Bank TL={metrics['amounts']['BANK']['TL']}, CC TL={metrics['amounts']['CC']['TL']}, Tether USD={metrics['amounts']['TETHER']['USD']}")
        
        # Get historical exchange rate for the specific date
        try:
            exchange_rate = historical_exchange_service.get_daily_rate(target_date)
            logger.debug(f"Using historical rate for {target_date}: {exchange_rate}")
        except Exception as e:
            logger.error(f"Error fetching historical rate for {target_date}: {e}")
            # Fallback to current rate
            try:
                current_rate = ExchangeRate.get_current_rate('USDTRY')
                exchange_rate = float(current_rate.rate) if current_rate else 48.0
            except Exception:
                exchange_rate = 48.0
        
        # Calculate Conv total
        def calculate_conv_total(metrics, rate):
            """Calculate total revenue in USD by converting TL amounts to USD"""
            bank_usd = float(metrics['amounts']['BANK']['USD'])
            bank_tl_to_usd = float(metrics['amounts']['BANK']['TL']) / rate
            cc_usd = float(metrics['amounts']['CC']['USD'])
            cc_tl_to_usd = float(metrics['amounts']['CC']['TL']) / rate
            tether_usd = float(metrics['amounts']['TETHER']['USD'])
            
            total_usd = bank_usd + bank_tl_to_usd + cc_usd + cc_tl_to_usd + tether_usd
            return total_usd
        
        conv_usd = calculate_conv_total(metrics, exchange_rate)
        
        # Format response
        response_data = {
            'success': True,
            'data': {
                'total_bank_usd': float(metrics['amounts']['BANK']['USD']),
                'total_bank_tl': float(metrics['amounts']['BANK']['TL']),
                'total_cc_usd': float(metrics['amounts']['CC']['USD']),
                'total_cc_tl': float(metrics['amounts']['CC']['TL']),
                'total_tether_usd': float(metrics['amounts']['TETHER']['USD']),
                'total_tether_tl': float(metrics['amounts']['TETHER']['TL']),
                'conv_usd': conv_usd,
                'conv_tl': 0.0,
                'total_transactions': metrics['total_transactions'],
                'bank_count': metrics['amounts']['BANK']['count'],
                'cc_count': metrics['amounts']['CC']['count'],
                'tether_count': metrics['amounts']['TETHER']['count'],
                # Deposit totals
                'total_deposits_usd': float(metrics['deposits']['BANK']['USD'] + metrics['deposits']['CC']['USD'] + metrics['deposits']['TETHER']['USD']),
                'total_deposits_tl': float(metrics['deposits']['BANK']['TL'] + metrics['deposits']['CC']['TL'] + metrics['deposits']['TETHER']['TL']),
                # Withdrawal totals
                'total_withdrawals_usd': float(metrics['withdrawals']['BANK']['USD'] + metrics['withdrawals']['CC']['USD'] + metrics['withdrawals']['TETHER']['USD']),
                'total_withdrawals_tl': float(metrics['withdrawals']['BANK']['TL'] + metrics['withdrawals']['CC']['TL'] + metrics['withdrawals']['TETHER']['TL']),
                # Net cash (deposits - withdrawals)
                'net_cash_usd': float(metrics['deposits']['BANK']['USD'] + metrics['deposits']['CC']['USD'] + metrics['deposits']['TETHER']['USD']) - float(metrics['withdrawals']['BANK']['USD'] + metrics['withdrawals']['CC']['USD'] + metrics['withdrawals']['TETHER']['USD']),
                'net_cash_tl': float(metrics['deposits']['BANK']['TL'] + metrics['deposits']['CC']['TL'] + metrics['deposits']['TETHER']['TL']) - float(metrics['withdrawals']['BANK']['TL'] + metrics['withdrawals']['CC']['TL'] + metrics['withdrawals']['TETHER']['TL']),
                'exchange_rate': exchange_rate,
                'period': {
                    'date': target_date.isoformat(),
                    'year': target_date.year,
                    'month': target_date.month,
                    'day': target_date.day
                }
            }
        }
        
        logger.info(f"Daily financial performance data retrieved for {target_date}: {metrics['total_transactions']} transactions")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error retrieving daily financial performance data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve daily financial performance data',
            'message': str(e)
        }), 500

# Removed duplicate route - using the one with year/month parameters below

@financial_performance_bp.route('/financial-performance/annual', methods=['GET'])
def get_annual_financial_performance():
    """Get annual financial performance data"""
    return get_financial_performance_with_range('annual')

def get_financial_performance_with_range(time_range):
    """Helper function to get financial performance for specific range"""
    try:
        # Calculate date range
        end_date = date.today()
        
        if time_range == 'daily':
            start_date = end_date
        elif time_range == 'monthly':
            start_date = end_date.replace(day=1)
        elif time_range == 'annual':
            start_date = end_date.replace(month=1, day=1)
        else:
            start_date = end_date - timedelta(days=30)
        
        # Calculate metrics
        metrics = calculate_financial_metrics(start_date, end_date)
        
        # Get current exchange rate
        try:
            current_rate = ExchangeRate.get_current_rate('USDTRY')
            exchange_rate = float(current_rate.rate) if current_rate else 48.0
        except Exception:
            exchange_rate = 48.0
        
        # Format response
        response_data = {
            'success': True,
            'data': {
                'total_bank_usd': float(metrics['amounts']['BANK']['USD']),
                'total_bank_tl': float(metrics['amounts']['BANK']['TL']),
                'total_cc_usd': float(metrics['amounts']['CC']['USD']),
                'total_cc_tl': float(metrics['amounts']['CC']['TL']),
                'total_tether_usd': float(metrics['amounts']['TETHER']['USD']),
                'total_tether_tl': float(metrics['amounts']['TETHER']['TL']),
                'conv_usd': 0.0,
                'conv_tl': 0.0,
                'total_transactions': metrics['total_transactions'],
                'bank_count': metrics['amounts']['BANK']['count'],
                'cc_count': metrics['amounts']['CC']['count'],
                'tether_count': metrics['amounts']['TETHER']['count'],
                'exchange_rate': exchange_rate,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'range': time_range
                }
            }
        }
        
        logger.info(f"{time_range.capitalize()} financial performance data retrieved: {metrics['total_transactions']} transactions")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error retrieving {time_range} financial performance data: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to retrieve {time_range} financial performance data',
            'message': str(e)
        }), 500

@financial_performance_bp.route('/financial-performance/monthly', methods=['GET'])
def get_monthly_financial_performance_by_date():
    """Get monthly financial performance data for a specific month"""
    try:
        # Get year and month from query parameters
        year = request.args.get('year', type=int)
        month = request.args.get('month', type=int)
        
        if not year or not month:
            return jsonify({
                'success': False,
                'error': 'Year and month parameters are required'
            }), 400
        
        # Validate month
        if month < 1 or month > 12:
            return jsonify({
                'success': False,
                'error': 'Month must be between 1 and 12'
            }), 400
        
        # Calculate date range for the specific month
        start_date = date(year, month, 1)
        
        # Get last day of the month
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
        
        logger.info(f"Monthly endpoint called for {year}-{month:02d}: {start_date} to {end_date}")
        
        # Calculate metrics for the specific month using daily conversion
        metrics = calculate_financial_metrics_with_daily_conversion(start_date, end_date)
        
        logger.info(f"Monthly metrics calculated: Bank TL={metrics['amounts']['BANK']['TL']}, CC TL={metrics['amounts']['CC']['TL']}, Tether USD={metrics['amounts']['TETHER']['USD']}")
        
        # Use daily converted amount for more accurate Conv calculation
        conv_usd = float(metrics.get('daily_converted_usd', 0))
        logger.info(f"Monthly Conv using daily conversion: {conv_usd} USD")
        
        # Format response
        response_data = {
            'success': True,
            'data': {
                'total_bank_usd': float(metrics['amounts']['BANK']['USD']),
                'total_bank_tl': float(metrics['amounts']['BANK']['TL']),
                'total_cc_usd': float(metrics['amounts']['CC']['USD']),
                'total_cc_tl': float(metrics['amounts']['CC']['TL']),
                'total_tether_usd': float(metrics['amounts']['TETHER']['USD']),
                'total_tether_tl': float(metrics['amounts']['TETHER']['TL']),
                'conv_usd': conv_usd,
                'conv_tl': 0.0,
                'total_transactions': metrics['total_transactions'],
                'bank_count': metrics['amounts']['BANK']['count'],
                'cc_count': metrics['amounts']['CC']['count'],
                'tether_count': metrics['amounts']['TETHER']['count'],
                # Deposit totals
                'total_deposits_usd': float(metrics['deposits']['BANK']['USD'] + metrics['deposits']['CC']['USD'] + metrics['deposits']['TETHER']['USD']),
                'total_deposits_tl': float(metrics['deposits']['BANK']['TL'] + metrics['deposits']['CC']['TL'] + metrics['deposits']['TETHER']['TL']),
                # Withdrawal totals
                'total_withdrawals_usd': float(metrics['withdrawals']['BANK']['USD'] + metrics['withdrawals']['CC']['USD'] + metrics['withdrawals']['TETHER']['USD']),
                'total_withdrawals_tl': float(metrics['withdrawals']['BANK']['TL'] + metrics['withdrawals']['CC']['TL'] + metrics['withdrawals']['TETHER']['TL']),
                # Net cash (deposits - withdrawals)
                'net_cash_usd': float(metrics['deposits']['BANK']['USD'] + metrics['deposits']['CC']['USD'] + metrics['deposits']['TETHER']['USD']) - float(metrics['withdrawals']['BANK']['USD'] + metrics['withdrawals']['CC']['USD'] + metrics['withdrawals']['TETHER']['USD']),
                'net_cash_tl': float(metrics['deposits']['BANK']['TL'] + metrics['deposits']['CC']['TL'] + metrics['deposits']['TETHER']['TL']) - float(metrics['withdrawals']['BANK']['TL'] + metrics['withdrawals']['CC']['TL'] + metrics['withdrawals']['TETHER']['TL']),
                'exchange_rate': 0.0,  # Not used with daily conversion
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'year': year,
                    'month': month
                }
            }
        }
        
        logger.info(f"Monthly financial performance data retrieved for {year}-{month:02d}: {metrics['total_transactions']} transactions")
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error retrieving monthly financial performance data: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to retrieve monthly financial performance data',
            'message': str(e)
        }), 500
