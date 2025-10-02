#!/usr/bin/env python3
"""
Dashboard Financial Metrics Calculator
Calculates BANK, CC, and TETHER totals for dashboard display
in both USD and TL currencies.

This script provides the exact data needed for the Financial Performance
section in the ModernDashboard component.
"""

import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Tuple

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.transaction import Transaction
from app.models.exchange_rate import ExchangeRate
from sqlalchemy import func, and_, or_

class DashboardFinancialMetrics:
    """Calculate financial metrics for dashboard display"""
    
    def __init__(self):
        """Initialize with database connection"""
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.session = db.session
        
        # Payment method mappings for categorization
        self.payment_methods = {
            'BANK': ['BANK', 'BANK_TRANSFER', 'WIRE_TRANSFER', 'ACH', 'TRANSFER'],
            'CC': ['CREDIT_CARD', 'CC', 'CARD', 'VISA', 'MASTERCARD', 'AMEX'],
            'TETHER': ['TETHER', 'USDT', 'USDC', 'CRYPTO', 'CRYPTOCURRENCY', 'CRYPTO_TRANSFER']
        }
    
    def __enter__(self):
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Clean up database connection"""
        if self.session:
            self.session.close()
        if self.app_context:
            self.app_context.pop()
    
    def get_current_exchange_rate(self) -> Decimal:
        """Get current USD/TRY exchange rate"""
        try:
            rate = ExchangeRate.get_current_rate('USDTRY')
            if rate:
                return rate.rate
            else:
                return Decimal('48.0')  # Fallback rate
        except Exception:
            return Decimal('48.0')
    
    def normalize_payment_method(self, payment_method: str) -> str:
        """Normalize payment method to standard categories"""
        if not payment_method:
            return 'OTHER'
        
        payment_method_upper = payment_method.upper()
        
        for category, methods in self.payment_methods.items():
            if any(method in payment_method_upper for method in methods):
                return category
        
        return 'OTHER'
    
    def calculate_metrics_for_period(self, start_date: date, end_date: date) -> Dict:
        """Calculate financial metrics for a specific period"""
        # Get all transactions in the period
        transactions = self.session.query(Transaction).filter(
            and_(
                Transaction.date >= start_date,
                Transaction.date <= end_date
            )
        ).all()
        
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
        
        current_rate = self.get_current_exchange_rate()
        
        # Process each transaction
        for transaction in transactions:
            payment_method = self.normalize_payment_method(transaction.payment_method)
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
            
            # Add to totals
            totals[payment_method][currency] += amount
            totals[payment_method]['count'] += 1
            
            commission_totals[payment_method][currency] += commission
            net_totals[payment_method][currency] += net_amount
        
        return {
            'amounts': totals,
            'commissions': commission_totals,
            'net_amounts': net_totals,
            'exchange_rate': current_rate,
            'total_transactions': len(transactions)
        }
    
    def calculate_daily_metrics(self) -> Dict:
        """Calculate daily metrics (today)"""
        today = date.today()
        return self.calculate_metrics_for_period(today, today)
    
    def calculate_monthly_metrics(self) -> Dict:
        """Calculate monthly metrics (current month)"""
        today = date.today()
        month_start = today.replace(day=1)
        return self.calculate_metrics_for_period(month_start, today)
    
    def calculate_annual_metrics(self) -> Dict:
        """Calculate annual metrics (current year)"""
        today = date.today()
        year_start = today.replace(month=1, day=1)
        return self.calculate_metrics_for_period(year_start, today)
    
    def get_all_metrics(self) -> Dict:
        """Get all financial metrics for dashboard"""
        return {
            'daily': self.calculate_daily_metrics(),
            'monthly': self.calculate_monthly_metrics(),
            'annual': self.calculate_annual_metrics()
        }
    
    def format_currency(self, amount: Decimal, currency: str) -> str:
        """Format currency amount for display"""
        if currency == 'USD':
            return f"${amount:,.2f}"
        else:
            return f"₺{amount:,.2f}"
    
    def print_metrics(self, metrics: Dict, period: str):
        """Print formatted metrics"""
        print(f"\n{'='*50}")
        print(f"{period.upper()} FINANCIAL METRICS")
        print(f"{'='*50}")
        
        data = metrics[period]
        print(f"Exchange Rate: {data['exchange_rate']} USD/TRY")
        print(f"Total Transactions: {data['total_transactions']}")
        print()
        
        print(f"{'Method':<10} {'Currency':<8} {'Amount':<15} {'Commission':<12} {'Net':<15} {'Count':<6}")
        print("-" * 70)
        
        for method in ['BANK', 'CC', 'TETHER']:
            for currency in ['USD', 'TL']:
                amount = data['amounts'][method][currency]
                commission = data['commissions'][method][currency]
                net = data['net_amounts'][method][currency]
                count = data['amounts'][method]['count'] if currency == 'USD' else ''
                
                if amount > 0 or commission > 0 or net > 0:
                    print(f"{method:<10} {currency:<8} {self.format_currency(amount, currency):<15} "
                          f"{self.format_currency(commission, currency):<12} "
                          f"{self.format_currency(net, currency):<15} {count:<6}")
    
    def generate_dashboard_data(self) -> Dict:
        """Generate data in format suitable for dashboard"""
        all_metrics = self.get_all_metrics()
        
        # Format for dashboard consumption
        dashboard_data = {
            'daily': {
                'total_bank_usd': float(all_metrics['daily']['amounts']['BANK']['USD']),
                'total_bank_tl': float(all_metrics['daily']['amounts']['BANK']['TL']),
                'total_cc_usd': float(all_metrics['daily']['amounts']['CC']['USD']),
                'total_cc_tl': float(all_metrics['daily']['amounts']['CC']['TL']),
                'total_tether_usd': float(all_metrics['daily']['amounts']['TETHER']['USD']),
                'total_tether_tl': float(all_metrics['daily']['amounts']['TETHER']['TL']),
                'conv_usd': 0.0,  # Empty as requested
                'conv_tl': 0.0,   # Empty as requested
                'total_transactions': all_metrics['daily']['total_transactions']
            },
            'monthly': {
                'total_bank_usd': float(all_metrics['monthly']['amounts']['BANK']['USD']),
                'total_bank_tl': float(all_metrics['monthly']['amounts']['BANK']['TL']),
                'total_cc_usd': float(all_metrics['monthly']['amounts']['CC']['USD']),
                'total_cc_tl': float(all_metrics['monthly']['amounts']['CC']['TL']),
                'total_tether_usd': float(all_metrics['monthly']['amounts']['TETHER']['USD']),
                'total_tether_tl': float(all_metrics['monthly']['amounts']['TETHER']['TL']),
                'conv_usd': 0.0,  # Empty as requested
                'conv_tl': 0.0,   # Empty as requested
                'total_transactions': all_metrics['monthly']['total_transactions']
            },
            'annual': {
                'total_bank_usd': float(all_metrics['annual']['amounts']['BANK']['USD']),
                'total_bank_tl': float(all_metrics['annual']['amounts']['BANK']['TL']),
                'total_cc_usd': float(all_metrics['annual']['amounts']['CC']['USD']),
                'total_cc_tl': float(all_metrics['annual']['amounts']['CC']['TL']),
                'total_tether_usd': float(all_metrics['annual']['amounts']['TETHER']['USD']),
                'total_tether_tl': float(all_metrics['annual']['amounts']['TETHER']['TL']),
                'conv_usd': 0.0,  # Empty as requested
                'conv_tl': 0.0,   # Empty as requested
                'total_transactions': all_metrics['annual']['total_transactions']
            },
            'exchange_rate': float(all_metrics['daily']['exchange_rate'])
        }
        
        return dashboard_data

def main():
    """Main function to run the dashboard financial metrics calculator"""
    try:
        with DashboardFinancialMetrics() as calculator:
            print("🏦 DASHBOARD FINANCIAL METRICS CALCULATOR")
            print("=" * 50)
            
            # Get all metrics
            all_metrics = calculator.get_all_metrics()
            
            # Print formatted output
            calculator.print_metrics(all_metrics, 'daily')
            calculator.print_metrics(all_metrics, 'monthly')
            calculator.print_metrics(all_metrics, 'annual')
            
            # Generate dashboard data
            dashboard_data = calculator.generate_dashboard_data()
            
            # Save to JSON file
            import json
            output_file = "dashboard_financial_metrics.json"
            with open(output_file, 'w') as f:
                json.dump(dashboard_data, f, indent=2)
            
            print(f"\n💾 Dashboard data saved to: {output_file}")
            print("✅ Financial metrics calculation completed!")
            
            # Print summary
            print(f"\n📊 SUMMARY")
            print(f"Daily Total Transactions: {dashboard_data['daily']['total_transactions']}")
            print(f"Monthly Total Transactions: {dashboard_data['monthly']['total_transactions']}")
            print(f"Annual Total Transactions: {dashboard_data['annual']['total_transactions']}")
            print(f"Current Exchange Rate: {dashboard_data['exchange_rate']} USD/TRY")
            
    except Exception as e:
        print(f"❌ Error calculating financial metrics: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
