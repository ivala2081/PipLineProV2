"""
Transactions API endpoints for Flask
"""
from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from sqlalchemy import func, text, case
from datetime import datetime, timedelta, timezone
from app.models.transaction import Transaction
from app.models.financial import PspTrack
from app import db
from decimal import Decimal, InvalidOperation
import logging
from app.services.advanced_cache_service import get_cache_service, cached
from app.services.query_optimization_service import monitor_query_performance
from app.utils.structured_logger import get_structured_logger

logger = logging.getLogger(__name__)
api_logger = get_structured_logger('app.api.transactions')
cache_service = get_cache_service()

transactions_api = Blueprint('transactions_api', __name__)

# Temporarily disable CSRF protection for transactions API
from app import csrf
csrf.exempt(transactions_api)

@transactions_api.route("", methods=['POST'])
@transactions_api.route("/", methods=['POST'])
@login_required
def create_transaction():
    """Create a new transaction with enhanced error handling"""
    try:
        # Enhanced authentication check
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please log in to create transactions'
            }), 401
        
        # Log the request for debugging
        logger.info(f"Transaction creation request from user {current_user.username}")
        
        # Validate request content type
        if not request.is_json:
            return jsonify({
                'error': 'Invalid content type',
                'message': 'Request must be JSON'
            }), 400
        data = request.get_json()
        
        # Validate required fields
        client_name = data.get('client_name', '').strip()
        if not client_name:
            return jsonify({
                'error': 'Client name is required'
            }), 400
        
        # Validate amount
        amount_str = data.get('amount', '')
        try:
            amount = Decimal(str(amount_str))
            if amount <= 0:
                return jsonify({
                    'error': 'Amount must be positive'
                }), 400
        except (InvalidOperation, ValueError):
            return jsonify({
                'error': 'Invalid amount format'
            }), 400
        
        # Get other fields
        currency = data.get('currency', 'TL').strip()
        payment_method = data.get('payment_method', '').strip()
        category = data.get('category', '').strip()
        psp = data.get('psp', '').strip()
        company = data.get('company', '').strip()
        
        # Handle both 'description' and 'notes' fields for backward compatibility
        description = data.get('description', data.get('notes', '')).strip()
        
        # Currency is already in correct format (TL, USD, EUR)
        
        # Handle both 'transaction_date' and 'date' fields for backward compatibility
        transaction_date_str = data.get('transaction_date', data.get('date', ''))
        
        # Parse transaction date
        try:
            if transaction_date_str:
                transaction_date = datetime.strptime(transaction_date_str, '%Y-%m-%d').date()
            else:
                transaction_date = datetime.now().date()
        except ValueError:
            return jsonify({
                'error': 'Invalid transaction date format. Use YYYY-MM-DD'
            }), 400
        
        # Check for manual commission override first
        use_manual_commission = data.get('use_manual_commission', False)
        manual_commission_rate = data.get('manual_commission_rate')
        
        # Calculate commission strictly based on PSP rate when available (no defaults)
        commission_rate: Decimal | None = None
        
        if use_manual_commission and manual_commission_rate is not None:
            # Use manual commission rate (convert percentage to decimal)
            commission_rate = Decimal(str(manual_commission_rate)) / Decimal('100')
            logger.info(f"Using manual commission rate: {manual_commission_rate}% (decimal: {commission_rate})")
        elif psp:
            try:
                from app.services.psp_options_service import PspOptionsService
                from app.services.company_options_service import CompanyOptionsService
                commission_rate = PspOptionsService.get_psp_commission_rate(psp)
                logger.info(f"Using PSP '{psp}' commission rate: {commission_rate}")
            except Exception as e:
                logger.warning(f"Error fetching PSP commission rate for '{psp}': {e}")

        # Calculate commission based on category
        if category == 'WD':
            # WD transactions always have 0 commission and should be stored as negative amounts
            commission = Decimal('0')
            amount = -amount  # Store withdrawal amounts as negative values
            logger.info(f"WD transaction - setting commission to 0 and amount to negative: {amount}")
        elif commission_rate is not None:
            # Calculate commission for DEP transactions
            commission = amount * commission_rate
            logger.info(f"Calculated commission: {commission} for amount: {amount}")
        else:
            commission = Decimal('0')
            logger.info(f"No commission rate available, setting commission to 0")
        net_amount = amount - commission

        # Handle TRY amount calculations
        exchange_rate_value = (
            data.get('exchange_rate')
            or data.get('usd_rate')
            or data.get('eur_rate')
        )

        exchange_rate_decimal = None
        amount_try = None
        commission_try = None
        net_amount_try = None

        if currency and currency.upper() in ('USD', 'EUR') and exchange_rate_value not in (None, ""):
            try:
                exchange_rate_decimal = Decimal(str(exchange_rate_value))
                if exchange_rate_decimal > 0:
                    amount_try = (amount * exchange_rate_decimal)
                    commission_try = (commission * exchange_rate_decimal)
                    net_amount_try = (net_amount * exchange_rate_decimal)
            except (InvalidOperation, ValueError):
                # If provided exchange rate is invalid, keep TRY fields as None
                logger.warning("Invalid exchange rate provided; skipping TRY calculations")
        elif currency and currency.upper() == 'TL':
            # For TL transactions, TL amounts are the same as original amounts
            exchange_rate_decimal = Decimal('1.0')
            amount_try = amount
            commission_try = commission
            net_amount_try = net_amount
        
        # Create transaction
        transaction = Transaction(
            client_name=client_name,
            company=company,
            payment_method=payment_method,
            date=transaction_date,
            category=category,
            amount=amount,
            commission=commission,
            net_amount=net_amount,
            currency=currency,
            psp=psp,
            notes=description,
            created_by=current_user.id,
            # TRY amounts and exchange rate
            amount_try=amount_try,
            commission_try=commission_try,
            net_amount_try=net_amount_try,
            exchange_rate=exchange_rate_decimal
        )
        
        db.session.add(transaction)
        db.session.flush()  # Ensure the transaction gets an ID
        db.session.commit()
        
        # Force WAL checkpoint to ensure transaction is immediately visible
        db.session.execute(text("PRAGMA wal_checkpoint(FULL)"))
        db.session.commit()
        
        # Invalidate cache after transaction creation
        try:
            from app.services.query_service import QueryService
            QueryService.invalidate_transaction_cache()
            logger.info("Cache invalidated after API transaction creation")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate cache after API transaction creation: {cache_error}")
        
        # Force a small delay to ensure transaction is fully committed
        import time
        time.sleep(0.1)
        
        return jsonify({
            'success': True,
            'message': 'Transaction created successfully',
            'transaction': {
                'id': transaction.id,
                'client_name': transaction.client_name,
                'amount': float(transaction.amount),
                'commission': float(transaction.commission),
                'net_amount': float(transaction.net_amount),
                'currency': transaction.currency,
                'date': transaction.date.isoformat() if transaction.date else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to create transaction',
            'message': str(e)
        }), 500

@transactions_api.route("/debug/company-data")
@login_required
def debug_company_data():
    """Debug endpoint to check company data in database"""
    try:
        # Get sample transactions with company data
        sample_transactions = db.session.query(
            Transaction.client_name,
            Transaction.company,
            Transaction.created_at
        ).filter(
            Transaction.client_name.isnot(None),
            Transaction.client_name != ''
        ).order_by(Transaction.created_at.desc()).limit(10).all()
        
        result = []
        for t in sample_transactions:
            result.append({
                'client_name': t.client_name,
                'company': t.company,
                'created_at': t.created_at.isoformat() if t.created_at else None
            })
        
        return jsonify({
            'total_transactions': Transaction.query.count(),
            'transactions_with_company': db.session.query(Transaction.company).filter(
                Transaction.company.isnot(None),
                Transaction.company != ''
            ).count(),
            'sample_transactions': result
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@transactions_api.route("/clients")
@login_required
def get_clients():
    """Get clients data (grouped transactions by client)"""
    try:
        # Get transactions grouped by client with additional data including commission and company
        # First get the basic stats - use converted amounts (amount_try) for proper currency conversion
        client_stats = db.session.query(
            Transaction.client_name,
            func.count(Transaction.id).label('transaction_count'),
            # Use amount_try (converted to TRY) if available, otherwise fallback to amount
            func.sum(
                func.coalesce(Transaction.amount_try, Transaction.amount)
            ).label('total_amount'),
            # Use commission_try (converted to TRY) if available, otherwise fallback to commission
            func.sum(
                func.coalesce(Transaction.commission_try, Transaction.commission)
            ).label('total_commission'),
            # Use net_amount_try (converted to TRY) if available, otherwise fallback to net_amount
            func.sum(
                func.coalesce(Transaction.net_amount_try, Transaction.net_amount)
            ).label('total_net'),
            # For average, use converted amounts as well
            func.avg(
                func.coalesce(Transaction.amount_try, Transaction.amount)
            ).label('average_amount'),
            func.min(Transaction.created_at).label('first_transaction'),
            func.max(Transaction.created_at).label('last_transaction')
        ).filter(
            Transaction.client_name.isnot(None),
            Transaction.client_name != ''
        ).group_by(Transaction.client_name).all()
        
        # Get company data separately for each client
        client_companies = {}
        for client in client_stats:
            # Get the most recent company for this client
            recent_company = db.session.query(Transaction.company).filter(
                Transaction.client_name == client.client_name,
                Transaction.company.isnot(None),
                Transaction.company != ''
            ).order_by(Transaction.created_at.desc()).first()
            
            client_companies[client.client_name] = recent_company.company if recent_company else None
        
        # Debug: Check if we have any company data
        company_count = db.session.query(Transaction.company).filter(
            Transaction.company.isnot(None),
            Transaction.company != ''
        ).count()
        print(f"DEBUG: Found {company_count} transactions with company data")
        
        # Check if we're getting any data
        if len(client_stats) == 0:
            total_transactions = Transaction.query.count()
        
        clients_data = []
        for client in client_stats:
            # Fix: Ensure proper type conversion and handle NULL values
            total_amount = float(client.total_amount) if client.total_amount is not None else 0.0
            total_commission = float(client.total_commission) if client.total_commission is not None else 0.0
            total_net = float(client.total_net) if client.total_net is not None else 0.0
            
            # Get currencies and PSPs for this client
            client_transactions = Transaction.query.filter(
                Transaction.client_name == client.client_name
            ).all()
            
            currencies = list(set([t.currency for t in client_transactions if t.currency]))
            psps = list(set([t.psp for t in client_transactions if t.psp]))
            
            # Get payment method and category for this client (get the most recent one)
            latest_transaction = Transaction.query.filter(
                Transaction.client_name == client.client_name
            ).order_by(Transaction.created_at.desc()).first()
            
            payment_method = latest_transaction.payment_method if latest_transaction else None
            category = latest_transaction.category if latest_transaction else None
            
            # Fix: Ensure all numeric values are properly converted
            avg_transaction = float(client.average_amount) if client.average_amount is not None else 0.0
            
            # Calculate final values for client
            
            # Get company name from our dictionary
            company_name = client_companies.get(client.client_name)
            
            # Debug: Log company data for first few clients
            if len(clients_data) < 3:
                print(f"DEBUG: Client {client.client_name} - company_name: {company_name}")
            
            clients_data.append({
                'client_name': client.client_name,
                'company_name': company_name,  # Add company name to response
                'payment_method': payment_method,
                'category': category,
                'total_amount': total_amount,
                'total_commission': total_commission,
                'total_net': total_net,
                'transaction_count': client.transaction_count,
                'first_transaction': client.first_transaction.isoformat() if client.first_transaction else None,
                'last_transaction': client.last_transaction.isoformat() if client.last_transaction else None,
                'currencies': currencies,
                'psps': psps,
                'avg_transaction': avg_transaction
            })
        
        # Sort by total amount descending
        clients_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        # If no data found, try alternative method
        if len(clients_data) == 0:
            # No data from aggregation, trying alternative method
            try:
                # Get all unique client names
                unique_clients = db.session.query(Transaction.client_name).filter(
                    Transaction.client_name.isnot(None),
                    Transaction.client_name != ''
                ).distinct().all()
                
                # Found unique clients for alternative calculation
                
                for client_row in unique_clients:
                    client_name = client_row.client_name
                    if not client_name:
                        continue
                        
                    # Get all transactions for this client
                    client_transactions = Transaction.query.filter(
                        Transaction.client_name == client_name
                    ).all()
                    
                    if not client_transactions:
                        continue
                    
                    # Calculate manually using converted amounts (amount_try) for proper currency conversion
                    total_amount = sum(
                        float(t.amount_try) if t.amount_try is not None else float(t.amount) 
                        for t in client_transactions if (t.amount_try is not None or t.amount is not None)
                    )
                    total_commission = sum(
                        float(t.commission_try) if t.commission_try is not None else float(t.commission) 
                        for t in client_transactions if (t.commission_try is not None or t.commission is not None)
                    )
                    # For net amount, use net_amount_try if available, otherwise calculate from converted amounts
                    total_net = sum(
                        float(t.net_amount_try) if t.net_amount_try is not None else (float(t.amount_try) if t.amount_try is not None else float(t.amount)) - (float(t.commission_try) if t.commission_try is not None else float(t.commission) if t.commission is not None else 0)
                        for t in client_transactions if (t.net_amount_try is not None or t.amount_try is not None or t.amount is not None)
                    )
                    
                    # Alternative calculation for client data
                    
                    # Get other data
                    latest_transaction = max(client_transactions, key=lambda x: x.created_at if x.created_at else datetime.min)
                    
                    # Handle company name in fallback method
                    company_name = latest_transaction.company
                    if not company_name or company_name.strip() == '':
                        # Try to find any transaction with company data for this client
                        company_transaction = next((t for t in client_transactions if t.company and t.company.strip() != ''), None)
                        if company_transaction:
                            company_name = company_transaction.company
                        else:
                            company_name = None
                    
                    clients_data.append({
                        'client_name': client_name,
                        'company_name': company_name,  # Add company name from latest transaction
                        'payment_method': latest_transaction.payment_method,
                        'category': latest_transaction.category,
                        'total_amount': total_amount,
                        'total_commission': total_commission,
                        'total_net': total_net,
                        'transaction_count': len(client_transactions),
                        'first_transaction': min(t.created_at for t in client_transactions if t.created_at).isoformat() if any(t.created_at for t in client_transactions) else None,
                        'last_transaction': latest_transaction.created_at.isoformat() if latest_transaction.created_at else None,
                        'currencies': list(set(t.currency for t in client_transactions if t.currency)),
                        'psps': list(set(t.psp for t in client_transactions if t.psp)),
                        'avg_transaction': total_amount / len(client_transactions) if client_transactions else 0.0
                    })
                
                # Sort again
                clients_data.sort(key=lambda x: x['total_amount'], reverse=True)
                
            except Exception as fallback_error:
                # Fallback method failed, continuing with empty data
                pass
        
        return jsonify(clients_data)
        
    except Exception as e:
        # Log error to system logger instead of print
        import traceback
        return jsonify({
            'error': 'Failed to retrieve clients data',
            'message': str(e)
        }), 500

@transactions_api.route("/psp_summary_stats")
@login_required
def get_psp_summary_stats():
    """Get PSP summary statistics including allocations with caching"""
    try:
        api_logger.log_api_request("/psp_summary_stats", "GET", current_user.id)
        logger.info("Starting PSP summary stats query...")
        
        # Check cache first
        cache_key = f"psp_summary:{current_user.id}"
        cached_result = cache_service.get(cache_key)
        if cached_result is not None:
            api_logger.log_cache_operation("get", cache_key, hit=True)
            return jsonify(cached_result), 200
        
        # Get PSP statistics from actual transactions using TRY amounts
        # Calculate deposits and withdrawals separately, then compute net total
        # Use separate queries to avoid SQLAlchemy case function issues
        psp_stats = db.session.query(
            Transaction.psp,
            func.count(Transaction.id).label('transaction_count'),
            func.sum(func.coalesce(Transaction.amount_try, Transaction.amount)).label('total_amount_try'),
            func.avg(func.coalesce(Transaction.amount_try, Transaction.amount)).label('average_amount_try')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != ''
        ).group_by(Transaction.psp).all()
        
        # Get deposits separately
        psp_deposits = db.session.query(
            Transaction.psp,
            func.sum(func.coalesce(Transaction.amount_try, Transaction.amount)).label('total_deposits_try')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != '',
            func.upper(Transaction.category).in_(['DEP', 'DEPOSIT', 'INVESTMENT'])
        ).group_by(Transaction.psp).all()
        
        # Get withdrawals separately
        psp_withdrawals = db.session.query(
            Transaction.psp,
            func.sum(func.coalesce(Transaction.amount_try, Transaction.amount)).label('total_withdrawals_try')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != '',
            func.upper(Transaction.category).in_(['WD', 'WITHDRAW', 'WITHDRAWAL'])
        ).group_by(Transaction.psp).all()
        
        # Get allocations from PSPAllocation table
        from app.models.financial import PSPAllocation
        psp_allocations = db.session.query(
            PSPAllocation.psp_name,
            func.sum(PSPAllocation.allocation_amount).label('total_allocations')
        ).group_by(PSPAllocation.psp_name).all()
        
        # Create lookup dictionaries
        deposits_dict = {psp.psp: float(psp.total_deposits_try) if psp.total_deposits_try else 0.0 for psp in psp_deposits}
        withdrawals_dict = {psp.psp: float(psp.total_withdrawals_try) if psp.total_withdrawals_try else 0.0 for psp in psp_withdrawals}
        allocations_dict = {psp.psp_name: float(psp.total_allocations) if psp.total_allocations else 0.0 for psp in psp_allocations}
        
        logger.info(f"PSP stats query completed, found {len(psp_stats)} PSPs")
        
        psp_data = []
        for psp in psp_stats:
            # Calculate net total: deposits - withdrawals using lookup dictionaries
            total_deposits = deposits_dict.get(psp.psp, 0.0)
            total_withdrawals = withdrawals_dict.get(psp.psp, 0.0)
            total_amount = total_deposits + total_withdrawals  # Net total (deposits + withdrawals, since withdrawals are negative)
            
            # Get total allocations for this PSP
            total_allocations = allocations_dict.get(psp.psp, 0.0)
            
            # Get the actual commission rate for this PSP from options (no defaults)
            commission_rate = None
            try:
                from app.models.config import Option
                psp_option = Option.query.filter_by(
                    field_name='psp',
                    value=psp.psp,
                    is_active=True
                ).first()
                
                if psp_option and psp_option.commission_rate is not None:
                    commission_rate = float(psp_option.commission_rate) * 100  # Convert to percentage
            except Exception:
                pass  # Skip if error occurs
            
            # Calculate commission based on total deposits only (not net total)
            # Tether is company's own KASA, so no commission calculations
            if psp.psp.upper() == 'TETHER':
                total_commission = 0.0
                total_net = total_amount
                total_allocations = 0.0  # No allocations for internal company KASA
                logger.info(f"Summary PSP {psp.psp}: internal company KASA, deposits={total_deposits}, commission=0")
            elif commission_rate is not None:
                total_commission = total_deposits * (commission_rate / 100)
                total_net = total_amount - total_commission
                logger.info(f"Summary PSP {psp.psp}: deposits={total_deposits}, rate={commission_rate}%, commission={total_commission}")
            else:
                total_commission = 0.0
                total_net = total_amount
                logger.info(f"Summary PSP {psp.psp}: no commission rate found, deposits={total_deposits}, commission=0")
            
            psp_data.append({
                'psp': psp.psp,
                'total_amount': total_amount,
                'total_deposits': total_deposits,
                'total_withdrawals': total_withdrawals,
                'total_commission': total_commission,
                'total_net': total_net,
                'total_allocations': total_allocations,
                'transaction_count': psp.transaction_count,
                'commission_rate': commission_rate
            })
        
        # Sort by total amount descending
        psp_data.sort(key=lambda x: x['total_amount'], reverse=True)
        
        logger.info(f"PSP summary stats completed successfully, returning {len(psp_data)} PSPs")
        
        # Cache the result
        cache_service.set(cache_key, psp_data, ttl=300)
        api_logger.log_cache_operation("set", cache_key, hit=False)
        
        # Invalidate cache to ensure fresh data
        try:
            from app.services.query_service import QueryService
            QueryService.invalidate_transaction_cache()
            logger.info("Cache invalidated after PSP summary stats")
        except Exception as cache_error:
            logger.warning(f"Failed to invalidate cache after PSP summary stats: {cache_error}")
        
        return jsonify(psp_data)
        
    except Exception as e:
        logger.error(f"Error in PSP summary stats: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'error': 'Failed to retrieve PSP summary statistics',
            'message': str(e)
        }), 500

@transactions_api.route("/psp_monthly_stats")
@login_required
def get_psp_monthly_stats():
    """Get PSP monthly statistics with date filtering and caching"""
    try:
        api_logger.log_api_request("/psp_monthly_stats", "GET", current_user.id)
        logger.info("Starting PSP monthly stats query...")
        
        # Get query parameters with validation
        year = request.args.get('year', datetime.now().year, type=int)
        month = request.args.get('month', datetime.now().month, type=int)
        
        # Validate year and month
        if not (1 <= month <= 12):
            return jsonify({'error': 'Invalid month. Must be between 1 and 12.'}), 400
        if year < 2020 or year > 2030:
            return jsonify({'error': 'Invalid year. Must be between 2020 and 2030.'}), 400
        
        logger.info(f"Fetching monthly stats for {year}-{month:02d}")
        
        # Calculate date range for the month
        try:
            start_date = datetime(year, month, 1).date()
            if month == 12:
                end_date = datetime(year + 1, 1, 1).date() - timedelta(days=1)
            else:
                end_date = datetime(year, month + 1, 1).date() - timedelta(days=1)
        except ValueError as e:
            logger.error(f"Invalid date range: {e}")
            return jsonify({'error': 'Invalid date range'}), 400
        
        logger.info(f"Date range: {start_date} to {end_date}")
        
        # Get PSP statistics for the specific month
        # For Tether, use USD amounts; for others, use TRY amounts
        psp_stats = db.session.query(
            Transaction.psp,
            func.count(Transaction.id).label('transaction_count'),
            func.sum(
                case(
                    (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                    else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                )
            ).label('total_amount'),
            func.avg(
                case(
                    (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                    else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                )
            ).label('average_amount')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != '',
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).group_by(Transaction.psp).all()
        
        # Get deposits for the month
        # For Tether, use USD amounts; for others, use TRY amounts
        psp_deposits = db.session.query(
            Transaction.psp,
            func.sum(
                case(
                    (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                    else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                )
            ).label('total_deposits')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != '',
            func.upper(Transaction.category).in_(['DEP', 'DEPOSIT', 'INVESTMENT']),
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).group_by(Transaction.psp).all()
        
        # Get withdrawals for the month
        # For Tether, use USD amounts; for others, use TRY amounts
        psp_withdrawals = db.session.query(
            Transaction.psp,
            func.sum(
                case(
                    (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                    else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                )
            ).label('total_withdrawals')
        ).filter(
            Transaction.psp.isnot(None),
            Transaction.psp != '',
            func.upper(Transaction.category).in_(['WD', 'WITHDRAW', 'WITHDRAWAL']),
            Transaction.date >= start_date,
            Transaction.date <= end_date
        ).group_by(Transaction.psp).all()
        
        # Get allocations for the month from PSPAllocation table
        try:
            from app.models.financial import PSPAllocation
            psp_allocations = db.session.query(
                PSPAllocation.psp_name,
                func.sum(PSPAllocation.allocation_amount).label('total_allocations')
            ).filter(
                PSPAllocation.date >= start_date,
                PSPAllocation.date <= end_date
            ).group_by(PSPAllocation.psp_name).all()
        except ImportError as e:
            logger.warning(f"PSPAllocation import failed: {e}. Using empty allocations.")
            psp_allocations = []
        except Exception as e:
            logger.warning(f"Error querying PSPAllocation: {e}. Using empty allocations.")
            psp_allocations = []
        
        # Create lookup dictionaries
        deposits_dict = {psp.psp: float(psp.total_deposits) if psp.total_deposits else 0.0 for psp in psp_deposits}
        withdrawals_dict = {psp.psp: float(psp.total_withdrawals) if psp.total_withdrawals else 0.0 for psp in psp_withdrawals}
        allocations_dict = {psp.psp_name: float(psp.total_allocations) if psp.total_allocations else 0.0 for psp in psp_allocations}
        
        # Load manual DEVIR overrides for first day of month only
        devir_overrides_cache = {}
        try:
            from app.models.financial import PSPDevir
            # Get all DEVIR overrides
            devir_overrides = PSPDevir.query.all()
            for override in devir_overrides:
                if override.psp_name not in devir_overrides_cache:
                    devir_overrides_cache[override.psp_name] = {}
                devir_overrides_cache[override.psp_name][override.date] = override.devir_amount
            logger.info(f"Loaded {len(devir_overrides)} DEVIR overrides for first day of month")
        except Exception as e:
            logger.warning(f"Failed to load DEVIR overrides: {e}")
            devir_overrides_cache = {}
        
        calculated_devirs_to_store = []
        
        logger.info(f"Monthly PSP stats query completed, found {len(psp_stats)} PSPs")
        
        # Get daily breakdown for each PSP
        daily_breakdown = {}
        for psp in psp_stats:
            # Get daily transactions for this PSP - deposits
            daily_deposits = db.session.query(
                Transaction.date,
                func.sum(
                    case(
                        (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                        else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                    )
                ).label('daily_deposits'),
                func.count(Transaction.id).label('deposit_count')
            ).filter(
                Transaction.psp == psp.psp,
                func.upper(Transaction.category).in_(['DEP', 'DEPOSIT', 'INVESTMENT']),
                Transaction.date >= start_date,
                Transaction.date <= end_date
            ).group_by(Transaction.date).all()
            
            # Get daily transactions for this PSP - withdrawals
            daily_withdrawals = db.session.query(
                Transaction.date,
                func.sum(
                    case(
                        (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                        else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                    )
                ).label('daily_withdrawals'),
                func.count(Transaction.id).label('withdrawal_count')
            ).filter(
                Transaction.psp == psp.psp,
                func.upper(Transaction.category).in_(['WD', 'WITHDRAW', 'WITHDRAWAL']),
                Transaction.date >= start_date,
                Transaction.date <= end_date
            ).group_by(Transaction.date).all()
            
            # Get daily transactions for this PSP - total
            daily_totals = db.session.query(
                Transaction.date,
                func.sum(
                    case(
                        (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                        else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                    )
                ).label('daily_total'),
                func.count(Transaction.id).label('transaction_count')
            ).filter(
                Transaction.psp == psp.psp,
                Transaction.date >= start_date,
                Transaction.date <= end_date
            ).group_by(Transaction.date).all()
            
            # Get daily allocations for this PSP
            daily_allocations = db.session.query(
                PSPAllocation.date,
                func.sum(PSPAllocation.allocation_amount).label('daily_allocations')
            ).filter(
                PSPAllocation.psp_name == psp.psp,
                PSPAllocation.date >= start_date,
                PSPAllocation.date <= end_date
            ).group_by(PSPAllocation.date).all()
            
            allocations_by_date = {alloc.date: float(alloc.daily_allocations) if alloc.daily_allocations else 0.0 for alloc in daily_allocations}
            
            # Create lookup dictionaries for deposits and withdrawals
            deposits_by_date = {dep.date: float(dep.daily_deposits) if dep.daily_deposits else 0.0 for dep in daily_deposits}
            withdrawals_by_date = {wd.date: float(wd.daily_withdrawals) if wd.daily_withdrawals else 0.0 for wd in daily_withdrawals}
            totals_by_date = {tot.date: (float(tot.daily_total) if tot.daily_total else 0.0, tot.transaction_count) for tot in daily_totals}
            
            # Build daily breakdown
            daily_data = []
            # Get all unique dates from all queries (transactions AND allocations)
            all_dates = set()
            for dep in daily_deposits:
                all_dates.add(dep.date)
            for wd in daily_withdrawals:
                all_dates.add(wd.date)
            for tot in daily_totals:
                all_dates.add(tot.date)
            # Include dates that have allocations even if no transactions
            for alloc in daily_allocations:
                all_dates.add(alloc.date)
            
            # Always use formula calculations - no manual overrides needed
            
            # CRITICAL: Process ALL days in the month for continuous calculations
            # This ensures every day has DEVIR and KASA TOP values, just like the Excel file
            current_date = start_date
            while current_date <= end_date:
                all_dates.add(current_date)
                current_date += timedelta(days=1)
            
            logger.info(f"Processing ALL {len(all_dates)} days for {psp.psp} in {year}-{month:02d}")
            
            # Filter dates to only include those within the current month
            filtered_dates = [date for date in sorted(all_dates) if start_date <= date <= end_date]
            
            # Ensure the last day of the month is always included, even if there's no data
            if filtered_dates and filtered_dates[-1] != end_date:
                logger.info(f"Adding last day of month {end_date} for {psp.psp} (ensuring complete month coverage)")
                filtered_dates.append(end_date)
                filtered_dates.sort()
            
            # Log the date range and filtering results for debugging
            logger.info(f"Date filtering for {psp.psp}: {len(all_dates)} total dates, {len(filtered_dates)} filtered dates")
            logger.info(f"Date range: {start_date} to {end_date}")
            if filtered_dates:
                logger.info(f"First filtered date: {filtered_dates[0]}, Last filtered date: {filtered_dates[-1]}")
            
            # Process dates in chronological order to ensure previous day data is available
            for date in sorted(filtered_dates):
                daily_deposits_amount = deposits_by_date.get(date, 0.0)
                daily_withdrawals_amount = withdrawals_by_date.get(date, 0.0)
                daily_total_amount, transaction_count = totals_by_date.get(date, (0.0, 0))
                daily_total = daily_deposits_amount + daily_withdrawals_amount  # deposits + withdrawals (since withdrawals are negative)
                daily_allocations = allocations_by_date.get(date, 0.0)
                
                # Initialize daily_rollover to prevent UnboundLocalError
                daily_rollover = 0.0
                
                # Log allocation-only dates for debugging
                if daily_allocations > 0 and transaction_count == 0:
                    logger.info(f"Allocation-only date for {psp.psp} on {date}: {daily_allocations} TRY")
                
                # Get commission rate for this PSP using time-based system
                commission_rate = None
                try:
                    from app.services.commission_rate_service import CommissionRateService
                    # Get rate for the specific date
                    target_date = date
                    commission_rate = CommissionRateService.get_commission_rate_percentage(psp.psp, target_date)
                except Exception as e:
                    logger.warning(f"Error getting daily commission rate for {psp.psp} on {date}: {e}")
                    pass
                
                if commission_rate is not None:
                    daily_commission = daily_deposits_amount * (commission_rate / 100)
                    daily_net = daily_total - daily_commission
                    logger.info(f"Daily {psp.psp} {date}: deposits={daily_deposits_amount}, rate={commission_rate}%, commission={daily_commission}")
                else:
                    daily_commission = 0.0
                    daily_net = daily_total
                    logger.info(f"Daily {psp.psp} {date}: no commission rate, deposits={daily_deposits_amount}, commission=0")
                
                # Calculate daily KASA TOP (revenue = NET + previous day's DEVİR)
                # For the first day of the month, check for previous month's last day DEVİR
                # For subsequent days, use NET + previous day's DEVİR
                
                # Check if this is the first day of the month
                is_first_day_of_month = (date.day == 1)
                
                # Debug logging
                logger.info(f"Processing {psp.psp} on {date}: is_first_day={is_first_day_of_month}, daily_data_count={len(daily_data)}")
                
                # KASA TOP calculation moved to after DEVIR calculation
                # This ensures we use current day NET + current day DEVIR
                
                # Calculate daily rollover (DEVİR = previous day KASA_TOP - previous day TAHS_TUTARI)
                # For first day of month, try to get previous month's DEVİR
                # For subsequent days, DEVİR = previous day's KASA_TOP - previous day's TAHS_TUTARI
                if is_first_day_of_month:
                    # For first day of month, check for manual override first
                    if date in devir_overrides_cache.get(psp.psp, {}):
                        daily_rollover = float(devir_overrides_cache[psp.psp][date])
                        logger.info(f"FIRST DAY DEVIR OVERRIDE: {psp.psp} on {date} - Using manual override: {daily_rollover:,.2f}")
                    else:
                        # For first day of month, DEVIR starts at 0 (no previous day)
                        daily_rollover = 0.0
                        logger.info(f"FIRST DAY DEVIR: {psp.psp} on {date} - Starting with 0.0 (first day of month)")
                else:
                    # CORRECT FORMULA: DEVIR = PREVIOUS DAY KASA TOP - PREVIOUS DAY TAHS TUTARI
                    # Get previous day's KASA TOP and TAHS TUTARI
                    previous_day_kasa_top = 0.0
                    previous_day_tahs_tutari = 0.0
                    
                    # Calculate previous day
                    previous_date = date - timedelta(days=1)
                    
                    # Get previous day's KASA TOP from daily breakdown if available
                    if psp.psp in daily_breakdown and daily_breakdown[psp.psp]:
                        # Look for previous day in the daily breakdown
                        for day_data in daily_breakdown[psp.psp]:
                            if day_data.get('date') == previous_date:
                                previous_day_kasa_top = day_data.get('kasa_top', 0.0)
                                previous_day_tahs_tutari = day_data.get('allocations', 0.0)
                                break
                    
                    # If not found in daily breakdown, try to get from database
                    if previous_day_kasa_top == 0.0 and previous_day_tahs_tutari == 0.0:
                        try:
                            # Get previous day's transactions
                            prev_day_deposits = db.session.query(
                                func.sum(
                                    case(
                                        (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                                        else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                                    )
                                )
                            ).filter(
                                Transaction.psp == psp.psp,
                                func.upper(Transaction.category).in_(['DEP', 'DEPOSIT', 'INVESTMENT']),
                                Transaction.date == previous_date
                            ).scalar() or 0.0
                            
                            prev_day_withdrawals = db.session.query(
                                func.sum(
                                    case(
                                        (func.upper(Transaction.psp) == 'TETHER', func.coalesce(Transaction.amount, 0)),
                                        else_=func.coalesce(Transaction.amount_try, Transaction.amount)
                                    )
                                )
                            ).filter(
                                Transaction.psp == psp.psp,
                                func.upper(Transaction.category).in_(['WD', 'WITHDRAW', 'WITHDRAWAL']),
                                Transaction.date == previous_date
                            ).scalar() or 0.0
                            
                            prev_day_total = float(prev_day_deposits) + float(prev_day_withdrawals)
                            prev_day_commission = float(prev_day_deposits) * (commission_rate / 100) if commission_rate else 0.0
                            prev_day_net = prev_day_total - prev_day_commission
                            
                            # Get previous day's allocations (TAHS TUTARI)
                            try:
                                from app.models.financial import PSPAllocation
                                prev_day_allocations = db.session.query(
                                    func.sum(PSPAllocation.allocation_amount)
                                ).filter(
                                    PSPAllocation.psp_name == psp.psp,
                                    PSPAllocation.date == previous_date
                                ).scalar() or 0.0
                            except ImportError:
                                prev_day_allocations = 0.0
                            
                            # For previous day's KASA TOP, we need to get it from the database properly
                            # Since KASA TOP = NET + DEVIR, we need to find the previous day's DEVIR
                            
                            # Calculate previous day's KASA TOP by looking at the daily breakdown
                            # This ensures we get the actual calculated KASA TOP from previous day
                            previous_day_kasa_top = 0.0
                            
                            # First, try to get from daily_data (already processed days in chronological order)
                            if daily_data:
                                # Get the last processed day's KASA TOP (skip summary rows)
                                last_day_data = daily_data[-1]
                                if last_day_data.get('date') == 'MONTHLY_SUMMARY':
                                    # If the last entry is a summary row, get the second-to-last entry
                                    if len(daily_data) > 1:
                                        last_day_data = daily_data[-2]
                                    else:
                                        last_day_data = None
                                
                                if last_day_data:
                                    previous_day_kasa_top = last_day_data.get('kasa_top', 0.0)
                                    logger.info(f"Found previous day KASA TOP from daily_data for {psp.psp} on {previous_date}: {previous_day_kasa_top}")
                                else:
                                    logger.info(f"No valid previous day data available in daily_data for {psp.psp} on {previous_date}")
                            else:
                                logger.info(f"No previous day data available in daily_data for {psp.psp} on {previous_date}")
                            
                            # If not found in daily breakdown, use NET as KASA TOP (no manual overrides)
                            if previous_day_kasa_top == 0.0:
                                previous_day_kasa_top = prev_day_net
                                logger.info(f"No previous day data found for {psp.psp} on {previous_date}, using NET as KASA TOP: {previous_day_kasa_top}")
                            
                            previous_day_tahs_tutari = float(prev_day_allocations)
                            
                        except Exception as e:
                            logger.warning(f"Could not get previous day data for {psp.psp} on {previous_date}: {e}")
                            previous_day_kasa_top = 0.0
                            previous_day_tahs_tutari = 0.0
                    
                    # Calculate DEVIR using previous day's values
                    # Ensure both values are floats to avoid type mismatch
                    previous_day_kasa_top_float = float(previous_day_kasa_top)
                    previous_day_tahs_tutari_float = float(previous_day_tahs_tutari)
                    daily_rollover = previous_day_kasa_top_float - previous_day_tahs_tutari_float
                    # Reduced logging for performance
                    if date.day % 5 == 0:  # Only log every 5th day
                        logger.info(f"CORRECT DEVIR: {psp.psp} on {date} - PREVIOUS DAY KASA TOP {previous_day_kasa_top_float:,.2f} - PREVIOUS DAY TAHS TUTARI {previous_day_tahs_tutari_float:,.2f} = DEVIR {daily_rollover:,.2f}")
                
                # Store the calculated DEVIR value for future use (batch operation)
                # Only store if it's not a manual override for first day of month
                is_manual_override = is_first_day_of_month and date in devir_overrides_cache.get(psp.psp, {})
                if not is_manual_override:
                    calculated_devirs_to_store.append({
                        'psp_name': psp.psp,
                        'date': date,
                        'devir_amount': daily_rollover
                    })
                
                # CORRECT FORMULA: KASA TOP = CURRENT DAY DEVIR + CURRENT DAY NET
                daily_kasa_top = daily_rollover + daily_net
                # Reduced logging for performance
                if date.day % 5 == 0:  # Only log every 5th day
                    logger.info(f"KASA TOP CALCULATION: {psp.psp} on {date} - DEVIR {daily_rollover:,.2f} + NET {daily_net:,.2f} = KASA TOP {daily_kasa_top:,.2f}")
                
                daily_data.append({
                    'date': date.isoformat(),
                    'yatimim': daily_deposits_amount,
                    'cekme': daily_withdrawals_amount,
                    'toplam': daily_total,
                    'komisyon': daily_commission,
                    'net': daily_net,
                    'tahs_tutari': daily_allocations,
                    'kasa_top': daily_kasa_top,
                    'devir': daily_rollover,
                    'transaction_count': transaction_count
                })
                
                daily_breakdown[psp.psp] = daily_data
        
        # Note: Summary rows will be added after all calculations are complete
        
        # Build PSP data for monthly summary (after daily breakdown is complete)
        psp_data = []
        for psp in psp_stats:
            # Calculate net total: deposits - withdrawals using lookup dictionaries
            total_deposits = deposits_dict.get(psp.psp, 0.0)
            total_withdrawals = withdrawals_dict.get(psp.psp, 0.0)
            total_amount = total_deposits + total_withdrawals  # Net total (deposits + withdrawals, since withdrawals are negative)
            
            # Get total allocations for this PSP in the month
            total_allocations = allocations_dict.get(psp.psp, 0.0)
            
            # Get the actual commission rate for this PSP using time-based system
            commission_rate = None
            try:
                from app.services.commission_rate_service import CommissionRateService
                # Get rate for the first day of the month being calculated
                target_date = datetime(year, month, 1).date()
                commission_rate = CommissionRateService.get_commission_rate_percentage(psp.psp, target_date)
            except Exception as e:
                logger.warning(f"Error getting commission rate for {psp.psp}: {e}")
                pass  # Skip if error occurs
            
            # Calculate commission based on total deposits only (not net total)
            # Tether is company's own KASA, so no commission calculations
            if psp.psp.upper() == 'TETHER':
                total_commission = 0.0
                total_net = total_amount
                total_allocations = 0.0  # No allocations for internal company KASA
                logger.info(f"Monthly PSP {psp.psp}: internal company KASA, deposits={total_deposits}, commission=0")
            elif commission_rate is not None and commission_rate > 0:
                total_commission = total_deposits * (commission_rate / 100)
                total_net = total_amount - total_commission
                logger.info(f"Monthly PSP {psp.psp}: deposits={total_deposits}, rate={commission_rate}%, commission={total_commission}")
            else:
                total_commission = 0.0
                total_net = total_amount
                logger.info(f"Monthly PSP {psp.psp}: no commission rate found, deposits={total_deposits}, commission=0")
            
            # Calculate rollover (KASA TOP - TAHS TUTARI)
            # Tether is company's own KASA, so no allocations or devir calculations
            if psp.psp.upper() == 'TETHER':
                rollover = 0.0  # No devir for internal company KASA
                total_allocations = 0.0  # No allocations for internal company KASA
                kasa_top = total_net  # KASA TOP = NET for internal KASA (no rollover)
                logger.info(f"TETHER is internal KASA - no DEVIR/rollover calculations, KASA TOP = NET: {total_net}")
            else:
                rollover = total_net - total_allocations
                
                # Check for Devir overrides for this PSP in this month
                try:
                    from app.models.financial import PSPDevir
                    
                    # IMPORTANT: For monthly rollover, use the LAST day's DEVIR, not the sum
                    # DEVIR represents cumulative carryover - only the last day matters for month-end
                    
                    # Calculate DEVIR using the correct formula: LAST KASA TOP - LAST TAHS TUTARI
                    if psp.psp in daily_breakdown and daily_breakdown[psp.psp]:
                        # Get the last day's KASA TOP and TAHS TUTARI (skip summary rows)
                        daily_data = daily_breakdown[psp.psp]
                        last_day_data = daily_data[-1]
                        
                        # If the last entry is a summary row, get the second-to-last entry
                        if last_day_data.get('date') == 'MONTHLY_SUMMARY':
                            if len(daily_data) > 1:
                                last_day_data = daily_data[-2]
                            else:
                                last_day_data = None
                        
                        if last_day_data:
                            last_day_kasa_top = float(last_day_data.get('kasa_top', 0.0))
                            last_day_tahs_tutari = float(last_day_data.get('tahs_tutari', 0.0))
                            
                            # Calculate DEVIR using the formula: LAST KASA TOP - LAST TAHS TUTARI
                            rollover = last_day_kasa_top - last_day_tahs_tutari
                            logger.info(f"Calculated DEVIR for {psp.psp} in {year}-{month:02d}: LAST KASA TOP {last_day_kasa_top:,.2f} - LAST TAHS TUTARI {last_day_tahs_tutari:,.2f} = DEVIR {rollover:,.2f}")
                        else:
                            logger.warning(f"No valid last day data found for {psp.psp} in {year}-{month:02d}")
                        
                except Exception as e:
                    logger.warning(f"Could not get last day's DEVIR for {psp.psp}: {e}")
                    # Continue with calculated rollover if fetch fails
                
                # Calculate KASA TOP using correct formula: DEVIR + NET
                # For monthly, use the last day's KASA TOP from daily breakdown
                kasa_top = total_net  # Default fallback
                
                # Get the last day's KASA TOP from the daily breakdown (calculated with correct formula)
                if psp.psp in daily_breakdown and daily_breakdown[psp.psp]:
                    last_day_kasa_top = daily_breakdown[psp.psp][-1].get('kasa_top', kasa_top)
                    kasa_top = last_day_kasa_top
                    logger.info(f"Using last day's KASA TOP for {psp.psp} in {year}-{month:02d}: {last_day_kasa_top}")
                
                # KASA TOP is now calculated automatically using the formula: DEVIR + NET
                # No manual overrides needed - the formula is fixed
            
            psp_data.append({
                'psp': psp.psp,
                'yatimim': total_deposits,  # YATIRIM (deposits)
                'cekme': total_withdrawals,  # ÇEKME (withdrawals)
                'toplam': total_amount,  # TOPLAM (deposits - withdrawals)
                'komisyon': total_commission,  # KOMİSYON (commission)
                'net': total_net,  # NET (toplam - komisyon)
                'tahs_tutari': total_allocations,  # TAHS TUTARI (allocation amount)
                'kasa_top': kasa_top,  # KASA TOP (revenue = NET + rollover, with overrides)
                'devir': rollover,  # DEVİR (rollover = kasa_top - tahs_tutari)
                'transaction_count': psp.transaction_count,
                'commission_rate': commission_rate,
                'month': month,
                'year': year,
                'daily_breakdown': daily_breakdown.get(psp.psp, [])
            })
        
        # Sort by total amount descending
        psp_data.sort(key=lambda x: x['toplam'], reverse=True)
        
        logger.info(f"Monthly PSP stats completed successfully, returning {len(psp_data)} PSPs")
        
        # PERFORMANCE OPTIMIZATION: Batch store calculated DEVIR values
        if calculated_devirs_to_store:
            try:
                from app.models.financial import PSPDevir
                logger.info(f"Storing {len(calculated_devirs_to_store)} calculated DEVIR values...")
                
                for devir_data in calculated_devirs_to_store:
                    # Check if record already exists
                    existing = PSPDevir.query.filter_by(
                        psp_name=devir_data['psp_name'],
                        date=devir_data['date']
                    ).first()
                    
                    if not existing:
                        # Create new record
                        new_devir = PSPDevir(
                            psp_name=devir_data['psp_name'],
                            date=devir_data['date'],
                            devir_amount=devir_data['devir_amount']
                        )
                        db.session.add(new_devir)
                    else:
                        # Update existing record if significantly different
                        if abs(float(existing.devir_amount) - devir_data['devir_amount']) > 0.01:
                            existing.devir_amount = devir_data['devir_amount']
                
                db.session.commit()
                logger.info(f"Successfully stored {len(calculated_devirs_to_store)} DEVIR values")
            except Exception as e:
                logger.warning(f"Could not batch store DEVIR values: {e}")
                db.session.rollback()
        
        # Add monthly summary rows for each PSP after all calculations are complete
        for psp_data_item in psp_data:
            psp_name = psp_data_item['psp']
            if psp_name in daily_breakdown and daily_breakdown[psp_name]:
                daily_data = daily_breakdown[psp_name]
                last_day_data = daily_data[-1]  # Get the last day's data
                final_kasa_top = last_day_data['kasa_top']
                final_devir = last_day_data['devir']
                
                # Add summary row
                summary_row = {
                    'date': 'MONTHLY_SUMMARY',
                    'yatimim': '---',
                    'cekme': '---', 
                    'toplam': '---',
                    'komisyon': '---',
                    'net': '---',
                    'tahs_tutari': '---',
                    'kasa_top': f'FINAL: {final_kasa_top:,.2f}',
                    'devir': f'FINAL: {final_devir:,.2f}',
                    'transaction_count': '---',
                    'formulas': {
                        'kasa_top_formula': 'KASA TOP = CURRENT DAY DEVIR + CURRENT DAY NET',
                        'devir_formula': 'DEVIR = PREVIOUS DAY KASA TOP - PREVIOUS DAY TAHS TUTARI'
                    }
                }
                daily_data.append(summary_row)
                daily_breakdown[psp_name] = daily_data
                
                # Update the PSP data with the modified daily breakdown
                psp_data_item['daily_breakdown'] = daily_data
        
        return jsonify({
            'data': psp_data,
            'month': month,
            'year': year,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        })
        
    except Exception as e:
        logger.error(f"Error in PSP monthly stats: {str(e)}")
        logger.error(f"Error type: {type(e).__name__}")
        import traceback
        logger.error(f"Traceback: {traceback.format_exc()}")
        
        return jsonify({
            'error': 'Failed to retrieve PSP monthly statistics',
            'message': str(e)
        }), 500

@transactions_api.route("/")
@login_required
def get_transactions():
    """Get all transactions"""
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 25, type=int)
        category = request.args.get('category')
        
        # Get filter parameters
        client = request.args.get('client')
        payment_method = request.args.get('payment_method')
        psp = request.args.get('psp')
        currency = request.args.get('currency')
        
        # Log all query parameters for debugging
        logger.debug(f"Query parameters: page={page}, per_page={per_page}, category={category}, client={client}, payment_method={payment_method}, psp={psp}, currency={currency}")
        
        # Build query
        query = Transaction.query
        
        # Log total transactions before any filters
        total_before_filters = query.count()
        logger.debug(f"Total transactions before filters: {total_before_filters}")
        
        if category:
            query = query.filter(Transaction.category == category)
            logger.info(f"Applied category filter: {category}")
        
        # Apply additional filters
        if client:
            query = query.filter(Transaction.client_name.ilike(f'%{client}%'))
            logger.info(f"Applied client filter: {client}")
        
        if payment_method:
            query = query.filter(Transaction.payment_method.ilike(f'%{payment_method}%'))
            logger.info(f"Applied payment_method filter: {payment_method}")
        
        if psp:
            query = query.filter(Transaction.psp.ilike(f'%{psp}%'))
            logger.info(f"Applied psp filter: {psp}")
        
        if currency:
            query = query.filter(Transaction.currency == currency)
            logger.info(f"Applied currency filter: {currency}")
        
        # Log total transactions after all filters
        total_after_filters = query.count()
        logger.debug(f"Total transactions after filters: {total_after_filters}")
        
        # Paginate
        try:
            # Force WAL checkpoint to ensure we see latest transactions
            db.session.execute(text("PRAGMA wal_checkpoint(FULL)"))
            db.session.commit()
            
            # Add debugging to see what transactions are being returned
            total_count = query.count()
            logger.debug(f"Total transactions in database: {total_count}")
            
            # Check specifically for LEVENT ÇEVİK transactions
            levents = query.filter(Transaction.client_name.ilike('%LEVENT ÇEVİK%')).order_by(Transaction.created_at.desc()).all()
            logger.debug(f"LEVENT ÇEVİK transactions found: {len(levents)}")
            for lev in levents:
                logger.debug(f"LEVENT: ID={lev.id}, Amount={lev.amount}, Created={lev.created_at}")
            
            # Check what's in the pagination results
            pagination = query.order_by(Transaction.created_at.desc()).paginate(
                page=page, per_page=per_page, error_out=False
            )
            
            # Log the first 10 transactions in pagination to see what's being returned
            logger.debug(f"First 10 transactions in pagination:")
            for i, trans in enumerate(pagination.items[:10]):
                logger.debug(f"  {i+1}. ID={trans.id}, Client={trans.client_name}, Amount={trans.amount}, Created={trans.created_at}")
            
            logger.debug(f"Returning {len(pagination.items)} transactions for page {page}")
            if pagination.items:
                latest_transaction = pagination.items[0]
                logger.debug(f"Latest transaction: ID={latest_transaction.id}, Client={latest_transaction.client_name}, Amount={latest_transaction.amount}, Created={latest_transaction.created_at}")
        except Exception as pagination_error:
            # Handle pagination error gracefully
            # Fallback to simple query without pagination
            transactions_data = query.order_by(Transaction.created_at.desc()).all()
            pagination = type('obj', (object,), {
                'items': transactions_data,
                'total': len(transactions_data),
                'pages': 1
            })
        
        transactions = []
        for transaction in pagination.items:
            try:
                # Debug logging for specific transactions
                # Process special transactions without debug output
                
                # Calculate commission if not set, using PSP-specific rate but always 0 for WD
                if transaction.commission:
                    commission = float(transaction.commission)
                    net_amount = float(transaction.net_amount) if transaction.net_amount else float(transaction.amount) - commission
                else:
                    # IMPORTANT: WD (Withdraw) transactions have ZERO commission
                    if transaction.category and transaction.category.upper() == 'WD':
                        commission = 0.0
                        net_amount = float(transaction.amount)
                    else:
                        # Try to get PSP-specific commission rate for non-WD transactions
                        commission_rate = None
                        if transaction.psp:
                            try:
                                from app.models.config import Option
                                psp_option = Option.query.filter_by(
                                    field_name='psp',
                                    value=transaction.psp,
                                    is_active=True
                                ).first()
                                
                                if psp_option and psp_option.commission_rate is not None:
                                    commission_rate = psp_option.commission_rate
                            except Exception:
                                pass  # Use 0 rate if error occurs
                        
                        if commission_rate is not None:
                            commission = float(transaction.amount) * float(commission_rate)
                            net_amount = float(transaction.amount) - commission
                        else:
                            commission = 0.0
                            net_amount = float(transaction.amount)
                
                transactions.append({
                    'id': transaction.id,
                    'client_name': transaction.client_name,
                    'company': transaction.company,
                    'payment_method': transaction.payment_method,
                    'category': transaction.category,
                    'amount': float(transaction.amount),
                    'commission': commission,
                    'net_amount': net_amount,
                    'currency': transaction.currency,
                    'psp': transaction.psp,
                    'date': transaction.date.strftime('%Y-%m-%d') if transaction.date else None,
                    'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                    'notes': transaction.notes,
                    'exchange_rate': float(transaction.exchange_rate) if transaction.exchange_rate else None,
                    'amount_tl': float(transaction.amount_try) if transaction.amount_try else None,
                    'commission_tl': float(transaction.commission_try) if transaction.commission_try else None,
                    'net_amount_tl': float(transaction.net_amount_try) if transaction.net_amount_try else None
                })
            except Exception as transaction_error:
                # Skip problematic transaction
                continue
        
        # Return processed transactions
        
        return jsonify({
            'transactions': transactions,
            'pagination': {
                'page': page,
                'per_page': per_page,
                'total': pagination.total,
                'pages': pagination.pages
            }
        })
        
    except Exception as e:
        # Log error to system logger instead of print
        import traceback
        return jsonify({
            'error': 'Failed to retrieve transactions',
            'message': str(e)
        }), 500

@transactions_api.route("/dropdown-options")
@login_required
def get_dropdown_options():
    """Get static dropdown options - fixed values that cannot be changed"""
    try:
        # Static dropdown options - these cannot be modified through the UI
        static_options = {
            'payment_method': [
                {'id': 1, 'value': 'Bank', 'commission_rate': None, 'created_at': None},
                {'id': 2, 'value': 'Credit card', 'commission_rate': None, 'created_at': None},
                {'id': 3, 'value': 'Tether', 'commission_rate': None, 'created_at': None}
            ],
            'currency': [
                {'id': 1, 'value': 'TL', 'commission_rate': None, 'created_at': None},
                {'id': 2, 'value': 'USD', 'commission_rate': None, 'created_at': None},
                {'id': 3, 'value': 'EUR', 'commission_rate': None, 'created_at': None}
            ],
            'currencies': [  # Add this for frontend compatibility
                {'id': 1, 'value': 'TL', 'commission_rate': None, 'created_at': None},
                {'id': 2, 'value': 'USD', 'commission_rate': None, 'created_at': None},
                {'id': 3, 'value': 'EUR', 'commission_rate': None, 'created_at': None}
            ],
            'category': [
                {'id': 1, 'value': 'DEP', 'commission_rate': None, 'created_at': None},
                {'id': 2, 'value': 'WD', 'commission_rate': None, 'created_at': None}
            ]
        }
        
        # Get fixed PSP options from database
        from app.services.psp_options_service import PspOptionsService
        from app.services.company_options_service import CompanyOptionsService
        
        # Add PSP options
        psp_options = PspOptionsService.create_fixed_psp_options()
        static_options['psp'] = []
        for i, psp in enumerate(psp_options, 1):
            static_options['psp'].append({
                'id': i,
                'value': psp['value'],
                'commission_rate': psp['commission_rate'],
                'created_at': None
            })
        
        # Add Company options
        company_options = CompanyOptionsService.create_fixed_company_options()
        static_options['company'] = []
        for i, company in enumerate(company_options, 1):
            static_options['company'].append({
                'id': i,
                'value': company['value'],
                'commission_rate': None,
                'created_at': None
            })
        
        return jsonify(static_options)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve dropdown options',
            'message': str(e)
        }), 500

@transactions_api.route("/dropdown-options", methods=['POST'])
@login_required
def add_dropdown_option():
    """Add a new dropdown option (only for dynamic fields)"""
    # Import CSRF protection here to avoid circular imports
    from flask_wtf.csrf import validate_csrf
    from flask import request
    
    # Check if field is static (not modifiable)
    static_fields = ['payment_method', 'currency', 'category']
    data = request.get_json()
    field_name = data.get('field_name', '').lower()
    
    if field_name in static_fields:
        return jsonify({
            'error': 'Cannot modify static field',
            'message': f'The {field_name} field has fixed values and cannot be modified'
        }), 400
    
    # Validate CSRF token only if CSRF is enabled
    from flask import current_app
    if current_app.config.get('WTF_CSRF_ENABLED', True):
        try:
            csrf_token = request.headers.get('X-CSRFToken')
            if csrf_token:
                validate_csrf(csrf_token)
            else:
                return jsonify({
                    'error': 'CSRF token is required',
                    'message': 'Missing X-CSRFToken header'
                }), 400
        except Exception as e:
            return jsonify({
                'error': 'CSRF validation failed',
                'message': str(e)
            }), 400
    try:
        from app.models.config import Option
        from decimal import Decimal, InvalidOperation
        field_name = data.get('field_name', '').strip()
        value = data.get('value', '').strip()
        commission_rate = data.get('commission_rate')
        
        # Convert commission_rate to string if it's a number
        if commission_rate is not None:
            commission_rate = str(commission_rate).strip()
        
        if not field_name or not value:
            return jsonify({
                'error': 'Field name and value are required'
            }), 400
        
        # Validate commission rate if provided
        commission_decimal = None
        if commission_rate:
            try:
                commission_decimal = Decimal(commission_rate)
                if commission_decimal < 0 or commission_decimal > 1:
                    return jsonify({
                        'error': 'Commission rate must be between 0 and 1'
                    }), 400
            except (InvalidOperation, ValueError):
                return jsonify({
                    'error': 'Invalid commission rate format'
                }), 400
        
        # Commission rate is only required for PSP options
        if field_name == 'psp' and not commission_rate:
            return jsonify({
                'error': 'Commission rate is required for PSP options'
            }), 400
        
        # Check if option already exists
        existing = Option.query.filter_by(
            field_name=field_name,
            value=value,
            is_active=True
        ).first()
        
        if existing:
            return jsonify({
                'error': 'This option already exists'
            }), 400
        
        # Create new option
        option = Option(
            field_name=field_name,
            value=value,
            commission_rate=commission_decimal
        )
        
        db.session.add(option)
        db.session.commit()
        
        return jsonify({
            'message': 'Option added successfully',
            'option': {
                'id': option.id,
                'field_name': option.field_name,
                'value': option.value,
                'commission_rate': float(option.commission_rate) if option.commission_rate else None
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to add dropdown option',
            'message': str(e)
        }), 500

@transactions_api.route("/dropdown-options/<int:option_id>", methods=['PUT'])
@login_required
def update_dropdown_option(option_id):
    """Update a dropdown option (only for dynamic fields)"""
    # Import CSRF protection here to avoid circular imports
    from flask_wtf.csrf import validate_csrf
    from flask import request
    
    # Check if this option belongs to a static field
    try:
        from app.models.config import Option
        option = Option.query.get(option_id)
        if option and option.field_name.lower() in ['payment_method', 'currency', 'category']:
            return jsonify({
                'error': 'Cannot modify static field',
                'message': f'The {option.field_name} field has fixed values and cannot be modified'
            }), 400
    except Exception as e:
        pass  # Continue with validation if check fails
    
    # Validate CSRF token only if CSRF is enabled
    from flask import current_app
    if current_app.config.get('WTF_CSRF_ENABLED', True):
        try:
            csrf_token = request.headers.get('X-CSRFToken')
            if csrf_token:
                validate_csrf(csrf_token)
            else:
                return jsonify({
                    'error': 'CSRF token is required',
                    'message': 'Missing X-CSRFToken header'
                }), 400
        except Exception as e:
            return jsonify({
                'error': 'CSRF validation failed',
                'message': str(e)
            }), 400
    try:
        from app.models.config import Option
        from decimal import Decimal, InvalidOperation
        
        option = Option.query.get(option_id)
        if not option:
            return jsonify({
                'error': 'Option not found'
            }), 404
        
        data = request.get_json()
        value = data.get('value', '').strip()
        commission_rate = data.get('commission_rate')
        
        # Debug logging
        print(f"DEBUG: Updating option {option_id}, field_name: {option.field_name}")
        print(f"DEBUG: Received value: '{value}', commission_rate: '{commission_rate}'")
        
        # Convert commission_rate to string if it's a number
        if commission_rate is not None:
            commission_rate = str(commission_rate).strip()
            # Convert empty string to None
            if not commission_rate:
                commission_rate = None
        
        if not value:
            return jsonify({
                'error': 'Value is required'
            }), 400
        
        # Validate commission rate if provided
        commission_decimal = None
        if commission_rate:
            try:
                commission_decimal = Decimal(commission_rate)
                if commission_decimal < 0 or commission_decimal > 1:
                    return jsonify({
                        'error': 'Commission rate must be between 0 and 1'
                    }), 400
            except (InvalidOperation, ValueError):
                return jsonify({
                    'error': 'Invalid commission rate format'
                }), 400
        
        # Commission rate is only required for PSP options
        if option.field_name == 'psp' and commission_rate is None:
            print(f"DEBUG: PSP option missing commission rate")
            return jsonify({
                'error': 'Commission rate is required for PSP options'
            }), 400
        
        # Check if option already exists (excluding current option)
        # Only check for duplicates if the value is actually changing
        if option.value != value:
            existing = Option.query.filter(
                Option.field_name == option.field_name,
                Option.value == value,
                Option.id != option_id,
                Option.is_active == True
            ).first()
            
            if existing:
                print(f"DEBUG: Duplicate option found: {existing.id}")
                return jsonify({
                    'error': f'An option with the value "{value}" already exists for {option.field_name} field'
                }), 400
        
        # Update option
        option.value = value
        option.commission_rate = commission_decimal
        
        db.session.commit()
        
        return jsonify({
            'message': 'Option updated successfully',
            'option': {
                'id': option.id,
                'field_name': option.field_name,
                'value': option.value,
                'commission_rate': float(option.commission_rate) if option.commission_rate else None
            }
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to update dropdown option',
            'message': str(e)
        }), 500

@transactions_api.route("/dropdown-options/<int:option_id>", methods=['DELETE'])
@login_required
def delete_dropdown_option(option_id):
    """Delete a dropdown option (only for dynamic fields)"""
    # Import CSRF protection here to avoid circular imports
    from flask_wtf.csrf import validate_csrf
    from flask import request
    
    # Check if this option belongs to a static field
    try:
        from app.models.config import Option
        option = Option.query.get(option_id)
        if option and option.field_name.lower() in ['payment_method', 'currency', 'category']:
            return jsonify({
                'error': 'Cannot delete static field option',
                'message': f'The {option.field_name} field has fixed values and cannot be modified'
            }), 400
    except Exception as e:
        pass  # Continue with validation if check fails
    
    # Validate CSRF token only if CSRF is enabled
    from flask import current_app
    if current_app.config.get('WTF_CSRF_ENABLED', True):
        try:
            csrf_token = request.headers.get('X-CSRFToken')
            if csrf_token:
                validate_csrf(csrf_token)
            else:
                return jsonify({
                    'error': 'CSRF token is required',
                    'message': 'Missing X-CSRFToken header'
                }), 400
        except Exception as e:
            return jsonify({
                'error': 'CSRF validation failed',
                'message': str(e)
            }), 400
    try:
        from app.models.config import Option
        
        option = Option.query.get(option_id)
        if not option:
            return jsonify({
                'error': 'Option not found'
            }), 404
        
        # Soft delete
        option.is_active = False
        db.session.commit()
        
        return jsonify({
            'message': 'Option deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': 'Failed to delete dropdown option',
            'message': str(e)
        }), 500

@transactions_api.route("/<int:transaction_id>", methods=['DELETE'])
@login_required
def delete_transaction(transaction_id):
    """Delete a transaction with improved CSRF handling"""
    try:
        from flask import request, session
        
        # Enhanced CSRF token validation with multiple fallback methods
        csrf_token = request.headers.get('X-CSRFToken')
        
        if not csrf_token:
            return jsonify({
                'error': 'CSRF token missing',
                'message': 'Security token is required for this operation'
            }), 400
        
        # Try multiple validation approaches
        token_valid = False
        
        # Method 1: Try Flask-WTF validation
        try:
            from flask_wtf.csrf import validate_csrf
            validate_csrf(csrf_token)
            token_valid = True
        except Exception as e:
            logger.debug(f"Flask-WTF validation failed: {str(e)}")
        
        # Method 2: Direct session comparison
        if not token_valid:
            session_token = session.get('csrf_token') or session.get('api_csrf_token')
            if session_token and csrf_token == session_token:
                token_valid = True
                logger.debug("Token validated via direct session comparison")
        
        # Method 3: Generate new token and compare
        if not token_valid:
            try:
                from flask_wtf.csrf import generate_csrf
                new_token = generate_csrf()
                if csrf_token == new_token:
                    token_valid = True
                    logger.debug("Token validated via new token generation")
            except Exception as e:
                logger.debug(f"New token generation failed: {str(e)}")
        
        if not token_valid:
            # Log the CSRF error for debugging
            logger.warning(f"CSRF validation failed for transaction {transaction_id}. Token: {csrf_token[:20]}...")
            logger.warning(f"Session tokens: csrf_token={session.get('csrf_token', 'None')[:20] if session.get('csrf_token') else 'None'}..., api_csrf_token={session.get('api_csrf_token', 'None')[:20] if session.get('api_csrf_token') else 'None'}...")
            
            return jsonify({
                'error': 'CSRF validation failed',
                'message': 'Security token validation failed. Please refresh the page and try again.',
                'csrf_error': True,
                'new_token': None
            }), 400
        
        # Find the transaction
        transaction = Transaction.query.get_or_404(transaction_id)
        
        # Store transaction info for response
        transaction_info = {
            'id': transaction.id,
            'client_name': transaction.client_name,
            'amount': float(transaction.amount),
            'currency': transaction.currency,
            'date': transaction.date.isoformat() if transaction.date else None
        }
        
        # Delete transaction using service (includes automatic PSP sync)
        from app.services.transaction_service import TransactionService
        TransactionService.delete_transaction(transaction.id, current_user.id)
        
        return jsonify({
            'success': True,
            'message': 'Transaction deleted successfully',
            'transaction': transaction_info
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting transaction {transaction_id}: {str(e)}")
        
        return jsonify({
            'success': False,
            'error': 'Failed to delete transaction',
            'message': str(e)
        }), 500

@transactions_api.route("/<int:transaction_id>", methods=['GET'])
@login_required
def get_transaction(transaction_id):
    """Get a single transaction by ID"""
    try:
        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return jsonify({
                'error': 'Transaction not found',
                'message': f'Transaction with ID {transaction_id} does not exist'
            }), 404
        
        # Convert to dictionary for JSON response
        transaction_data = {
            'id': transaction.id,
            'client_name': transaction.client_name,
            'company': transaction.company,
            'payment_method': transaction.payment_method,
            'category': transaction.category,
            'amount': float(transaction.amount),
            'commission': float(transaction.commission),
            'net_amount': float(transaction.net_amount),
            'currency': transaction.currency,
            'psp': transaction.psp,
            'notes': transaction.notes,
            'date': transaction.date.isoformat() if transaction.date else None,
            'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
            'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
            # TL Amount fields for foreign currency transactions
            'amount_tl': float(transaction.amount_try) if transaction.amount_try else None,
            'commission_tl': float(transaction.commission_try) if transaction.commission_try else None,
            'net_amount_tl': float(transaction.net_amount_try) if transaction.net_amount_try else None,
            'exchange_rate': float(transaction.exchange_rate) if transaction.exchange_rate else None,
        }
        
        return jsonify({
            'status': 'success',
            'transaction': transaction_data
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting transaction {transaction_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to retrieve transaction'
        }), 500

@transactions_api.route("/<int:transaction_id>", methods=['PUT'])
@login_required
def update_transaction(transaction_id):
    """Update an existing transaction"""
    try:
        # Enhanced authentication check
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please log in to update transactions'
            }), 401
        
        # Log the request for debugging
        logger.info(f"Transaction update request from user {current_user.username} for transaction {transaction_id}")
        
        # Validate request content type
        if not request.is_json:
            return jsonify({
                'error': 'Invalid content type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        
        # Get the transaction to update
        transaction = Transaction.query.get(transaction_id)
        if not transaction:
            return jsonify({
                'error': 'Transaction not found',
                'message': f'Transaction with ID {transaction_id} does not exist'
            }), 404
        
        # Validate required fields
        client_name = data.get('client_name', '').strip()
        if not client_name:
            return jsonify({
                'error': 'Client name is required'
            }), 400
        
        # Validate amount
        amount_str = data.get('amount', '')
        try:
            amount = Decimal(str(amount_str))
            if amount <= 0:
                return jsonify({
                    'error': 'Amount must be positive'
                }), 400
        except (InvalidOperation, ValueError):
            return jsonify({
                'error': 'Invalid amount format'
            }), 400
        
        # Get other fields
        currency = data.get('currency', 'TL').strip()
        payment_method = data.get('payment_method', '').strip()
        category = data.get('category', '').strip()
        psp = data.get('psp', '').strip()
        company = data.get('company', '').strip()
        notes = data.get('notes', '').strip()
        
        # Currency is already in correct format (TL, USD, EUR)
        
        # Handle both 'transaction_date' and 'date' fields for backward compatibility
        transaction_date_str = data.get('transaction_date', data.get('date', ''))
        
        # Parse transaction date
        try:
            if transaction_date_str:
                transaction_date = datetime.strptime(transaction_date_str, '%Y-%m-%d').date()
            else:
                transaction_date = datetime.now().date()
        except ValueError:
            return jsonify({
                'error': 'Invalid transaction date format. Use YYYY-MM-DD'
            }), 400
        
        # Check for manual commission override first
        use_manual_commission = data.get('use_manual_commission', False)
        manual_commission_rate = data.get('manual_commission_rate')
        
        # Calculate commission strictly based on PSP rate when available (no defaults)
        commission_rate: Decimal | None = None
        
        if use_manual_commission and manual_commission_rate is not None:
            # Use manual commission rate (convert percentage to decimal)
            commission_rate = Decimal(str(manual_commission_rate)) / Decimal('100')
            logger.info(f"Using manual commission rate: {manual_commission_rate}% (decimal: {commission_rate})")
        elif psp:
            try:
                from app.models.config import Option
                psp_option = Option.query.filter_by(
                    field_name='psp',
                    value=psp,
                    is_active=True
                ).first()
                if psp_option and psp_option.commission_rate:
                    commission_rate = psp_option.commission_rate
                    logger.info(f"Using PSP '{psp}' commission rate: {commission_rate}")
            except Exception as e:
                logger.warning(f"Error getting PSP commission rate: {e}")
        
        # Calculate commission based on category
        if category == 'WD':
            # WD transactions always have 0 commission
            commission = Decimal('0')
            logger.info(f"WD transaction - setting commission to 0 for amount: {amount}")
        elif commission_rate is not None:
            # Calculate commission for DEP transactions
            commission = amount * commission_rate
            logger.info(f"Calculated commission: {commission} for amount: {amount}")
        else:
            commission = Decimal('0')
            logger.info(f"No commission rate available, setting commission to 0")
        net_amount = amount - commission
        
        # Handle foreign currency calculations
        amount_try = None
        commission_try = None
        net_amount_try = None
        exchange_rate = None
        
        if currency in ['USD', 'EUR']:
            # Check for custom exchange rates from frontend
            custom_rate = None
            if currency == 'USD' and data.get('usd_rate'):
                try:
                    custom_rate = Decimal(str(data.get('usd_rate')))
                    logger.info(f"Using custom USD rate from frontend: {custom_rate}")
                except (InvalidOperation, ValueError):
                    logger.warning(f"Invalid custom USD rate provided: {data.get('usd_rate')}")
            elif currency == 'EUR' and data.get('eur_rate'):
                try:
                    custom_rate = Decimal(str(data.get('eur_rate')))
                    logger.info(f"Using custom EUR rate from frontend: {custom_rate}")
                except (InvalidOperation, ValueError):
                    logger.warning(f"Invalid custom EUR rate provided: {data.get('eur_rate')}")
            
            # Use custom rate if provided, otherwise get from database/service
            if custom_rate:
                exchange_rate = custom_rate
            else:
                # Get exchange rate from database for the transaction date
                try:
                    from app.models.exchange_rate import ExchangeRate
                    if currency == 'USD':
                        db_rate = ExchangeRate.get_current_rate('USDTRY')
                        if db_rate:
                            exchange_rate = db_rate.rate
                            logger.info(f"Using database USD rate: {exchange_rate}")
                        else:
                            # Fallback to a default rate
                            exchange_rate = Decimal('27.0')
                            logger.warning(f"No USD rate found, using fallback rate: {exchange_rate}")
                    elif currency == 'EUR':
                        # For EUR, use a default rate or similar logic
                        exchange_rate = Decimal('30.0')  # Approximate EUR/TRY rate
                        logger.warning(f"Using default EUR rate: {exchange_rate}")
                except Exception as e:
                    logger.error(f"Error getting exchange rate from database: {e}")
                    # Use default fallback rates
                    exchange_rate = Decimal('27.0') if currency == 'USD' else Decimal('30.0')
                    logger.warning(f"Using fallback rate for {currency}: {exchange_rate}")
                
            if exchange_rate:
                amount_try = amount * exchange_rate
                commission_try = commission * exchange_rate
                net_amount_try = net_amount * exchange_rate
                logger.info(f"Calculated TL amounts for {currency}: Amount={amount_try}, Commission={commission_try}, Net={net_amount_try}")
            else:
                logger.warning(f"Could not get exchange rate for {currency} on {transaction_date}")
        elif currency == 'TL':
            # For TL transactions, TL amounts are the same as original amounts
            exchange_rate = Decimal('1.0')
            amount_try = amount
            commission_try = commission
            net_amount_try = net_amount
            logger.info(f"Set TL amounts for TL transaction: Amount={amount_try}, Commission={commission_try}, Net={net_amount_try}")
        
        # Update transaction fields
        transaction.client_name = client_name
        transaction.company = company
        transaction.payment_method = payment_method
        transaction.category = category
        transaction.amount = amount
        transaction.commission = commission
        transaction.net_amount = net_amount
        transaction.currency = currency
        transaction.psp = psp
        transaction.notes = notes
        transaction.date = transaction_date
        transaction.updated_at = datetime.now(timezone.utc)
        
        # Update TRY amount fields
        transaction.amount_try = amount_try
        transaction.commission_try = commission_try
        transaction.net_amount_try = net_amount_try
        transaction.exchange_rate = exchange_rate
        
        # Save to database
        db.session.commit()
        
        # Save custom exchange rate after transaction update
        if currency in ['USD', 'EUR'] and custom_rate:
            try:
                from app.models.exchange_rate import ExchangeRate
                currency_pair = 'USDTRY' if currency == 'USD' else 'EURTRY'
                
                # Check if rate already exists for this date
                existing_rate = ExchangeRate.query.filter_by(
                    date=transaction_date,
                    currency_pair=currency_pair
                ).first()
                
                if existing_rate:
                    # Update existing rate
                    existing_rate.rate = custom_rate
                    existing_rate.updated_at = datetime.now(timezone.utc)
                    logger.info(f"Updated existing {currency} rate for {transaction_date} to {custom_rate}")
                else:
                    # Create new rate entry
                    new_rate = ExchangeRate(
                        currency_pair=currency_pair,
                        rate=custom_rate,
                        date=transaction_date,
                        created_at=datetime.now(timezone.utc),
                        updated_at=datetime.now(timezone.utc)
                    )
                    db.session.add(new_rate)
                    logger.info(f"Created new {currency} rate for {transaction_date}: {custom_rate}")
                
                db.session.commit()
                logger.info(f"Exchange rate saved successfully for {currency}")
            except Exception as e:
                logger.error(f"Error saving custom exchange rate to database: {e}")
                # Don't fail the transaction update if rate saving fails
        
        logger.info(f"Transaction {transaction_id} updated successfully by user {current_user.username}")
        
        return jsonify({
            'status': 'success',
            'message': 'Transaction updated successfully',
            'transaction': {
                'id': transaction.id,
                'client_name': transaction.client_name,
                'company': transaction.company,
                'payment_method': transaction.payment_method,
                'category': transaction.category,
                'amount': float(transaction.amount),
                'commission': float(transaction.commission),
                'net_amount': float(transaction.net_amount),
                'currency': transaction.currency,
                'psp': transaction.psp,
                'notes': transaction.notes,
                'date': transaction.date.isoformat() if transaction.date else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                'amount_try': float(transaction.amount_try) if transaction.amount_try else None,
                'commission_try': float(transaction.commission_try) if transaction.commission_try else None,
                'net_amount_try': float(transaction.net_amount_try) if transaction.net_amount_try else None,
                'exchange_rate': float(transaction.exchange_rate) if transaction.exchange_rate else None,
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating transaction {transaction_id}: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': 'Failed to update transaction'
        }), 500

@transactions_api.route("/clients-by-date")
@login_required
def get_clients_by_date():
    """Get clients data grouped by transaction date"""
    try:
        # Get transactions grouped by client and date - use converted amounts for proper currency conversion
        client_date_stats = db.session.query(
            Transaction.client_name,
            Transaction.date,
            func.count(Transaction.id).label('transaction_count'),
            # Use amount_try (converted to TRY) if available, otherwise fallback to amount
            func.sum(
                func.coalesce(Transaction.amount_try, Transaction.amount)
            ).label('total_amount'),
            func.avg(
                func.coalesce(Transaction.amount_try, Transaction.amount)
            ).label('average_amount'),
            # Use commission_try (converted to TRY) if available, otherwise fallback to commission
            func.sum(
                func.coalesce(Transaction.commission_try, Transaction.commission)
            ).label('total_commission'),
            # Use net_amount_try (converted to TRY) if available, otherwise fallback to net_amount
            func.sum(
                func.coalesce(Transaction.net_amount_try, Transaction.net_amount)
            ).label('total_net')
        ).filter(
            Transaction.client_name.isnot(None),
            Transaction.client_name != ''
        ).group_by(Transaction.client_name, Transaction.date).all()
        
        # Group by date
        grouped_by_date = {}
        for stat in client_date_stats:
            date_str = stat.date.isoformat() if stat.date else None
            if date_str not in grouped_by_date:
                grouped_by_date[date_str] = []
            
            # Calculate commission if not available
            total_amount = float(stat.total_amount) if stat.total_amount else 0.0
            # Use actual commission from database or 0 if not available (no defaults)
            total_commission = float(stat.total_commission) if stat.total_commission else 0.0
            total_net = total_amount - total_commission
            
            # Get additional client info
            latest_transaction = Transaction.query.filter(
                Transaction.client_name == stat.client_name
            ).order_by(Transaction.created_at.desc()).first()
            
            # Get currencies and PSPs for this client on this date
            date_transactions = Transaction.query.filter(
                Transaction.client_name == stat.client_name,
                Transaction.date == stat.date
            ).all()
            
            currencies = list(set([t.currency for t in date_transactions if t.currency]))
            psps = list(set([t.psp for t in date_transactions if t.psp]))
            
            grouped_by_date[date_str].append({
                'client_name': stat.client_name,
                'company_name': latest_transaction.company if latest_transaction else None,  # Add company name
                'payment_method': latest_transaction.payment_method if latest_transaction else None,
                'category': latest_transaction.category if latest_transaction else None,
                'date': date_str,
                'total_amount': total_amount,
                'total_commission': total_commission,
                'total_net': total_net,
                'transaction_count': stat.transaction_count,
                'avg_transaction': float(stat.average_amount) if stat.average_amount else 0.0,
                'currencies': currencies,
                'psps': psps
            })
        
        # Sort dates and clients within each date
        for date_str in grouped_by_date:
            grouped_by_date[date_str].sort(key=lambda x: x['total_amount'], reverse=True)
        
        # Convert to sorted list
        result = []
        for date_str in sorted(grouped_by_date.keys(), reverse=True):
            result.append({
                'date': date_str,
                'clients': grouped_by_date[date_str]
            })
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({
            'error': 'Failed to retrieve clients data by date',
            'message': str(e)
        }), 500

@transactions_api.route("/bulk-import", methods=['POST'])
@login_required
def bulk_import_transactions():
    """Bulk import transactions from CSV/Excel data with improved duplicate handling"""
    try:
        # Enhanced authentication check
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please log in to import transactions'
            }), 401
        
        # Log the request for debugging
        logger.info(f"Bulk import request from user {current_user.username}")
        
        # Validate request content type
        if not request.is_json:
            return jsonify({
                'error': 'Invalid content type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        transactions_data = data.get('transactions', [])
        
        if not transactions_data or not isinstance(transactions_data, list):
            return jsonify({
                'error': 'Invalid data format',
                'message': 'transactions must be a non-empty array'
            }), 400
        
        if len(transactions_data) == 0:
            return jsonify({
                'error': 'No transactions to import',
                'message': 'transactions array is empty'
            }), 400
        
        # Limit to prevent abuse
        if len(transactions_data) > 1000:
            return jsonify({
                'error': 'Too many transactions',
                'message': 'Maximum 1000 transactions per import'
            }), 400
        
        successful_imports = 0
        failed_imports = 0
        skipped_duplicates = 0
        errors = []
        warnings = []
        
        # Track processed transactions to handle duplicates
        processed_transactions = set()
        
        for i, transaction_data in enumerate(transactions_data):
            try:
                # Enhanced debug logging for ALL transactions
                logger.info(f"Processing transaction row {i+1}: client='{transaction_data.get('client_name', '')}', amount='{transaction_data.get('amount', '')}', category='{transaction_data.get('category', '')}'")
                
                # Debug logging for specific transactions
                if transaction_data.get('client_name', '').strip() in ['TETHER ALIM', 'KUR FARKI MALİYETİ']:
                    logger.info(f"Processing special transaction row {i+1}: {transaction_data}")
                
                # Create a unique identifier for duplicate detection
                client_name = transaction_data.get('client_name', '').strip()
                amount = transaction_data.get('amount', '')
                date_str = transaction_data.get('date', '')
                
                # DISABLED: Duplicate detection for bulk imports
                # All rows from CSV will be imported without skipping
                # This ensures complete data import as requested by user
                
                # Get other fields for processing
                psp = transaction_data.get('psp', '').strip()
                payment_method = transaction_data.get('payment_method', '').strip()
                category = transaction_data.get('category', '').strip()
                company = transaction_data.get('company', '').strip()
                
                # Validate required fields with more flexible rules
                if not client_name:
                    # Try to generate a client name if missing
                    client_name = f"Unknown_Client_{i+1}"
                    warnings.append(f"Row {i+1}: Generated client name '{client_name}' for missing client")
                
                # Get other fields with improved defaults FIRST (before validation)
                currency = transaction_data.get('currency', 'TL').strip()
                notes = transaction_data.get('notes', '').strip()
                
                # Improved category handling - accept both DEP and WD
                if category:
                    category = category.strip().upper()
                    if category not in ['DEP', 'WD']:
                        # Try to map common variations
                        category_mapping = {
                            'DEPOSIT': 'DEP',
                            'WITHDRAW': 'WD',
                            'WITHDRAWAL': 'WD',
                            'ÇEKME': 'WD',
                            'YATIRMA': 'DEP'
                        }
                        if category in category_mapping:
                            category = category_mapping[category]
                            warnings.append(f"Row {i+1}: Mapped category '{category}' to '{category}'")
                        else:
                            # Default to DEP for unknown categories
                            category = 'DEP'
                            warnings.append(f"Row {i+1}: Unknown category '{category}', defaulting to 'DEP'")
                else:
                    # Default to DEP if no category specified
                    category = 'DEP'
                    warnings.append(f"Row {i+1}: No category specified, defaulting to 'DEP'")
                
                # Validate amount with more flexible rules (NOW category is defined)
                logger.info(f"Row {i+1}: Validating amount '{amount}' for category '{category}'")
                try:
                    amount_decimal = Decimal(str(amount))
                    logger.info(f"Row {i+1}: Amount parsed successfully: {amount_decimal}")
                    
                    # Allow negative amounts for WD (withdraw) transactions
                    if category == 'WD':
                        logger.info(f"Row {i+1}: Processing WD transaction with amount {amount_decimal}")
                        if amount_decimal == 0:
                            if client_name in ['TETHER ALIM', 'KUR FARKI MALİYETİ']:
                                logger.warning(f"Special transaction {client_name} has zero amount - this might be intentional")
                                warnings.append(f"Row {i+1}: Special transaction {client_name} has zero amount")
                            else:
                                logger.error(f"Row {i+1}: WD transaction cannot have zero amount for {client_name}")
                                errors.append(f"Row {i+1}: Amount cannot be zero for {client_name}")
                                failed_imports += 1
                                continue
                        # For WD transactions, negative amounts are valid (representing money going out)
                        elif amount_decimal > 0:
                            # Convert positive WD amounts to negative (money going out)
                            amount_decimal = -amount_decimal
                            logger.info(f"Row {i+1}: Converted positive WD amount {amount} to negative {amount_decimal}")
                    else:
                        # For DEP transactions, amounts must be positive
                        logger.info(f"Row {i+1}: Processing DEP transaction with amount {amount_decimal}")
                        if amount_decimal <= 0:
                            if client_name in ['TETHER ALIM', 'KUR FARKI MALİYETİ']:
                                logger.warning(f"Special transaction {client_name} has non-positive amount - this might be intentional")
                                warnings.append(f"Row {i+1}: Special transaction {client_name} has non-positive amount")
                            else:
                                logger.error(f"Row {i+1}: DEP transaction must have positive amount for {client_name}")
                                errors.append(f"Row {i+1}: DEP transactions must have positive amounts for {client_name}")
                                failed_imports += 1
                                continue
                        
                except (InvalidOperation, ValueError) as e:
                    logger.error(f"Row {i+1}: Amount parsing error: {e} for amount '{amount}'")
                    if client_name in ['TETHER ALIM', 'KUR FARKI MALİYETİ']:
                        logger.error(f"Special transaction {client_name} has invalid amount format: {amount}")
                        errors.append(f"Row {i+1}: Special transaction {client_name} has invalid amount format: {amount}")
                        failed_imports += 1
                        continue
                    else:
                        # Try to fix common amount format issues
                        try:
                            # Remove common non-numeric characters
                            cleaned_amount = str(amount).replace(',', '').replace('₺', '').replace('$', '').replace('€', '').strip()
                            amount_decimal = Decimal(cleaned_amount)
                            logger.info(f"Row {i+1}: Fixed amount format from '{amount}' to '{amount_decimal}'")
                        except (InvalidOperation, ValueError) as e2:
                            logger.error(f"Row {i+1}: Failed to fix amount format: {e2}")
                            errors.append(f"Row {i+1}: Invalid amount format '{amount}' for {client_name}")
                            failed_imports += 1
                            continue
                
                # Currency is already in correct format (TL, USD, EUR)
                
                # Parse transaction date with more flexible formats
                try:
                    if date_str:
                        # Handle multiple date formats
                        date_formats = ['%d.%m.%Y', '%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%d-%m-%Y']
                        transaction_date = None
                        
                        for date_format in date_formats:
                            try:
                                transaction_date = datetime.strptime(date_str, date_format).date()
                                break
                            except ValueError:
                                continue
                        
                        if not transaction_date:
                            # If all formats fail, use current date
                            transaction_date = datetime.now().date()
                            warnings.append(f"Row {i+1}: Invalid date format '{date_str}', using current date")
                    else:
                        transaction_date = datetime.now().date()
                        warnings.append(f"Row {i+1}: No date specified, using current date")
                except Exception as e:
                    transaction_date = datetime.now().date()
                    warnings.append(f"Row {i+1}: Date parsing error, using current date: {str(e)}")
                
                # Calculate commission and net amount with improved logic
                commission = transaction_data.get('commission', 0)
                net_amount = transaction_data.get('net_amount', 0)
                
                # If commission not provided or is 0, derive using PSP-specific rate when available
                if not commission or commission == 0:
                    commission_rate: Decimal | None = None
                    if psp:
                        try:
                            from app.models.config import Option
                            psp_option = Option.query.filter_by(
                                field_name='psp',
                                value=psp,
                                is_active=True
                            ).first()
                            if psp_option and psp_option.commission_rate is not None:
                                commission_rate = psp_option.commission_rate
                                logger.info(f"Using PSP '{psp}' commission rate: {commission_rate} for amount: {amount_decimal}")
                            else:
                                logger.warning(f"No commission rate found for PSP '{psp}'")
                        except Exception as e:
                            logger.warning(f"Error fetching PSP commission rate for '{psp}': {e}")
                    
                    if category == 'WD':
                        # WD transactions always have 0 commission and should be stored as negative amounts
                        commission = Decimal('0')
                        amount_decimal = -amount_decimal  # Store withdrawal amounts as negative values
                        logger.info(f"WD transaction - setting commission to 0 and amount to negative: {amount_decimal}")
                    elif commission_rate is not None:
                        # Calculate commission based on absolute amount for DEP transactions
                        commission = abs(amount_decimal) * commission_rate
                        logger.info(f"Calculated commission: {commission} for amount: {amount_decimal}")
                    else:
                        commission = Decimal('0')
                        logger.warning(f"No commission rate available for PSP '{psp}', setting commission to 0")
                
                # Always calculate net amount as amount - commission
                net_amount = amount_decimal - commission
                logger.info(f"Final values - Amount: {amount_decimal}, Commission: {commission}, Net: {net_amount}")
                
                # Add import timestamp to notes to distinguish from existing transactions
                import_note = f"Imported on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                if notes:
                    notes = f"{notes} | {import_note}"
                else:
                    notes = import_note
                
                # Create transaction with improved data
                logger.info(f"Row {i+1}: Creating transaction object for {client_name} with amount {amount_decimal}")
                transaction = Transaction(
                    client_name=client_name,
                    company=company or 'Unknown',
                    payment_method=payment_method or 'Unknown',
                    category=category,
                    amount=amount_decimal,
                    commission=commission,
                    net_amount=net_amount,
                    currency=currency,
                    psp=psp or 'Unknown',
                    notes=notes,
                    date=transaction_date,
                    created_by=current_user.id,
                    created_at=datetime.now(),
                    updated_at=datetime.now()
                )
                
                logger.info(f"Row {i+1}: Adding transaction to session")
                db.session.add(transaction)
                successful_imports += 1
                logger.info(f"Row {i+1}: Transaction added successfully, total successful: {successful_imports}")
                
                # DISABLED: No longer tracking processed transactions since duplicate detection is disabled
                # processed_transactions.add(duplicate_key)
                
            except Exception as e:
                logger.error(f"Row {i+1}: Exception during processing: {type(e).__name__}: {str(e)}")
                logger.error(f"Row {i+1}: Full error details: {e}")
                if hasattr(e, '__traceback__'):
                    import traceback
                    logger.error(f"Row {i+1}: Traceback: {traceback.format_exc()}")
                errors.append(f"Row {i+1}: {str(e)}")
                failed_imports += 1
                continue
        
        # Commit all successful transactions
        logger.info(f"Import processing complete. Attempting to commit {successful_imports} transactions to database")
        if successful_imports > 0:
            try:
                db.session.commit()
                logger.info(f"Successfully committed {successful_imports} transactions to database")
                
                # Invalidate cache after bulk import
                try:
                    from app.services.query_service import QueryService
                    QueryService.invalidate_transaction_cache()
                    logger.info("Cache invalidated after API bulk import")
                except Exception as cache_error:
                    logger.warning(f"Failed to invalidate cache after API bulk import: {cache_error}")
                    
            except Exception as commit_error:
                logger.error(f"Database commit failed: {commit_error}")
                db.session.rollback()
                return jsonify({
                    'error': 'Database commit failed',
                    'message': f'Import failed during database commit: {str(commit_error)}'
                }), 500
        else:
            logger.warning("No transactions to commit - all failed validation")
        
        # Prepare response with detailed information
        logger.info(f"Preparing response: {successful_imports} successful, {failed_imports} failed, 0 duplicates (duplicate detection disabled)")
        response_data = {
            'success': True,
            'message': f'Import completed: {successful_imports} successful, {failed_imports} failed (all CSV rows imported)',
            'data': {
                'total_rows': len(transactions_data),
                'successful_imports': successful_imports,
                'failed_imports': failed_imports,
                'skipped_duplicates': 0,  # Always 0 since duplicate detection is disabled
                'errors': errors[:20],  # Limit errors to first 20
                'warnings': warnings[:20]  # Limit warnings to first 20
            }
        }
        
        # Add summary statistics
        if successful_imports > 0:
            response_data['data']['summary'] = {
                'total_amount': sum(t.amount for t in db.session.query(Transaction).filter(
                    Transaction.created_by == current_user.id,
                    Transaction.created_at >= datetime.now() - timedelta(minutes=5)
                ).all()),
                'categories_imported': list(set(t.category for t in db.session.query(Transaction).filter(
                    Transaction.created_by == current_user.id,
                    Transaction.created_at >= datetime.now() - timedelta(minutes=5)
                ).all()))
            }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"CRITICAL ERROR in bulk import: {type(e).__name__}: {str(e)}")
        if hasattr(e, '__traceback__'):
            import traceback
            logger.error(f"Full traceback: {traceback.format_exc()}")
        return jsonify({
            'error': 'Internal server error',
            'message': f'Import failed: {str(e)}'
        }), 500

@transactions_api.route("/bulk-delete", methods=['POST'])
@login_required
def bulk_delete_transactions():
    """Bulk delete all transactions with confirmation code"""
    try:
        # Enhanced authentication check
        if not current_user.is_authenticated:
            return jsonify({
                'error': 'Authentication required',
                'message': 'Please log in to delete transactions'
            }), 401
        
        # Log the request for debugging
        logger.info(f"Bulk delete request from user {current_user.username}")
        
        # Validate request content type
        if not request.is_json:
            return jsonify({
                'error': 'Invalid content type',
                'message': 'Request must be JSON'
            }), 400
        
        data = request.get_json()
        confirmation_code = data.get('confirmation_code', '').strip()
        
        # Validate confirmation code
        from flask import current_app
        expected_code = current_app.config.get('BULK_DELETE_CONFIRMATION_CODE', '4561')
        if confirmation_code != expected_code:
            return jsonify({
                'error': 'Invalid confirmation code',
                'message': 'Please enter the correct 4-digit confirmation code'
            }), 400
        
        # Get count of transactions before deletion
        transaction_count = Transaction.query.count()
        
        if transaction_count == 0:
            return jsonify({
                'error': 'No transactions to delete',
                'message': 'Database is already empty'
            }), 400
        
        # Delete all transactions
        Transaction.query.delete()
        db.session.commit()
        
        logger.info(f"Successfully deleted {transaction_count} transactions by user {current_user.username}")
        
        return jsonify({
            'success': True,
            'message': f'Successfully deleted {transaction_count} transactions',
            'data': {
                'deleted_count': transaction_count
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error in bulk delete: {str(e)}")
        return jsonify({
            'error': 'Internal server error',
            'message': f'Bulk delete failed: {str(e)}'
        }), 500
