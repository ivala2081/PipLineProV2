#!/usr/bin/env python3
"""
Financial Calculator Script
Calculates comprehensive financial metrics for BANK, CC, and TETHER transactions
in both USD and TL currencies.

This script provides detailed analysis of:
- Total amounts by payment method and currency
- Daily, monthly, and annual breakdowns
- Commission analysis
- Net amounts and trends
- Exchange rate impact analysis
"""

import sys
import os
from datetime import datetime, date, timedelta
from decimal import Decimal
from typing import Dict, List, Tuple, Optional
import json

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models.transaction import Transaction
from app.models.exchange_rate import ExchangeRate
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import sessionmaker

class FinancialCalculator:
    """Comprehensive financial calculator for transaction analysis"""
    
    def __init__(self):
        """Initialize the calculator with database connection"""
        self.app = create_app()
        self.app_context = self.app.app_context()
        self.app_context.push()
        self.session = db.session
        
        # Payment method mappings
        self.payment_methods = {
            'BANK': ['BANK', 'BANK_TRANSFER', 'WIRE_TRANSFER', 'ACH'],
            'CC': ['CREDIT_CARD', 'CC', 'CARD', 'VISA', 'MASTERCARD'],
            'TETHER': ['TETHER', 'USDT', 'USDC', 'CRYPTO', 'CRYPTOCURRENCY']
        }
        
        # Currency mappings
        self.currencies = ['USD', 'TL', 'TRY']
        
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
                # Fallback rate if no rate available
                print("⚠️  No exchange rate found, using fallback rate: 48.0")
                return Decimal('48.0')
        except Exception as e:
            print(f"⚠️  Error getting exchange rate: {e}, using fallback: 48.0")
            return Decimal('48.0')
    
    def normalize_payment_method(self, payment_method: str) -> str:
        """Normalize payment method to standard categories"""
        if not payment_method:
            return 'UNKNOWN'
        
        payment_method_upper = payment_method.upper()
        
        for category, methods in self.payment_methods.items():
            if any(method in payment_method_upper for method in methods):
                return category
        
        return 'OTHER'
    
    def get_transactions_by_period(self, start_date: date, end_date: date) -> List[Transaction]:
        """Get all transactions within date range"""
        return self.session.query(Transaction).filter(
            and_(
                Transaction.date >= start_date,
                Transaction.date <= end_date
            )
        ).all()
    
    def calculate_payment_method_totals(self, transactions: List[Transaction]) -> Dict:
        """Calculate totals by payment method and currency"""
        results = {
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
            
            # Calculate amounts
            amount = Decimal(str(transaction.amount or 0))
            commission = Decimal(str(transaction.commission or 0))
            net_amount = Decimal(str(transaction.net_amount or 0))
            
            # Add to totals
            results[payment_method][currency] += amount
            results[payment_method]['count'] += 1
            
            commission_totals[payment_method][currency] += commission
            net_totals[payment_method][currency] += net_amount
        
        return {
            'amounts': results,
            'commissions': commission_totals,
            'net_amounts': net_totals
        }
    
    def calculate_daily_breakdown(self, start_date: date, end_date: date) -> Dict:
        """Calculate daily financial breakdown"""
        daily_data = {}
        current_date = start_date
        
        while current_date <= end_date:
            transactions = self.get_transactions_by_period(current_date, current_date)
            totals = self.calculate_payment_method_totals(transactions)
            daily_data[current_date.isoformat()] = totals
            current_date += timedelta(days=1)
        
        return daily_data
    
    def calculate_monthly_breakdown(self, start_date: date, end_date: date) -> Dict:
        """Calculate monthly financial breakdown"""
        monthly_data = {}
        current_date = start_date.replace(day=1)
        
        while current_date <= end_date:
            # Get last day of current month
            if current_date.month == 12:
                next_month = current_date.replace(year=current_date.year + 1, month=1)
            else:
                next_month = current_date.replace(month=current_date.month + 1)
            
            month_end = next_month - timedelta(days=1)
            
            transactions = self.get_transactions_by_period(current_date, month_end)
            totals = self.calculate_payment_method_totals(transactions)
            monthly_data[current_date.strftime('%Y-%m')] = totals
            
            current_date = next_month
        
        return monthly_data
    
    def calculate_annual_breakdown(self, start_date: date, end_date: date) -> Dict:
        """Calculate annual financial breakdown"""
        annual_data = {}
        current_year = start_date.year
        
        while current_year <= end_date.year:
            year_start = date(current_year, 1, 1)
            year_end = date(current_year, 12, 31)
            
            # Adjust for actual date range
            actual_start = max(start_date, year_start)
            actual_end = min(end_date, year_end)
            
            transactions = self.get_transactions_by_period(actual_start, actual_end)
            totals = self.calculate_payment_method_totals(transactions)
            annual_data[str(current_year)] = totals
            
            current_year += 1
        
        return annual_data
    
    def format_currency(self, amount: Decimal, currency: str) -> str:
        """Format currency amount for display"""
        if currency == 'USD':
            return f"${amount:,.2f}"
        else:
            return f"₺{amount:,.2f}"
    
    def print_summary_table(self, data: Dict, title: str):
        """Print a formatted summary table"""
        print(f"\n{'='*60}")
        print(f"{title:^60}")
        print(f"{'='*60}")
        
        # Header
        print(f"{'Payment Method':<15} {'Currency':<8} {'Amount':<15} {'Commission':<12} {'Net':<15} {'Count':<8}")
        print("-" * 80)
        
        for method in ['BANK', 'CC', 'TETHER', 'OTHER']:
            for currency in ['USD', 'TL']:
                amount = data['amounts'][method][currency]
                commission = data['commissions'][method][currency]
                net = data['net_amounts'][method][currency]
                count = data['amounts'][method]['count'] if currency == 'USD' else ''
                
                if amount > 0 or commission > 0 or net > 0:
                    print(f"{method:<15} {currency:<8} {self.format_currency(amount, currency):<15} "
                          f"{self.format_currency(commission, currency):<12} "
                          f"{self.format_currency(net, currency):<15} {count:<8}")
    
    def calculate_totals(self, data: Dict) -> Dict:
        """Calculate grand totals from breakdown data"""
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
        
        for period_data in data.values():
            for method in ['BANK', 'CC', 'TETHER', 'OTHER']:
                for currency in ['USD', 'TL']:
                    totals[method][currency] += period_data['amounts'][method][currency]
                    commission_totals[method][currency] += period_data['commissions'][method][currency]
                    net_totals[method][currency] += period_data['net_amounts'][method][currency]
                
                totals[method]['count'] += period_data['amounts'][method]['count']
        
        return {
            'amounts': totals,
            'commissions': commission_totals,
            'net_amounts': net_totals
        }
    
    def generate_report(self, start_date: date, end_date: date):
        """Generate comprehensive financial report"""
        print(f"\n🏦 FINANCIAL CALCULATOR REPORT")
        print(f"📅 Period: {start_date.isoformat()} to {end_date.isoformat()}")
        print(f"🔄 Current USD/TRY Rate: {self.get_current_exchange_rate()}")
        
        # Get all transactions in period
        all_transactions = self.get_transactions_by_period(start_date, end_date)
        print(f"📊 Total Transactions: {len(all_transactions)}")
        
        # Calculate overall totals
        overall_totals = self.calculate_payment_method_totals(all_transactions)
        self.print_summary_table(overall_totals, "OVERALL TOTALS")
        
        # Daily breakdown
        print(f"\n📈 DAILY BREAKDOWN")
        daily_data = self.calculate_daily_breakdown(start_date, end_date)
        
        # Show last 7 days
        recent_days = list(daily_data.keys())[-7:]
        for day in recent_days:
            print(f"\n📅 {day}")
            self.print_summary_table(daily_data[day], f"Daily Summary - {day}")
        
        # Monthly breakdown
        print(f"\n📅 MONTHLY BREAKDOWN")
        monthly_data = self.calculate_monthly_breakdown(start_date, end_date)
        for month, data in monthly_data.items():
            self.print_summary_table(data, f"Monthly Summary - {month}")
        
        # Annual breakdown
        print(f"\n📅 ANNUAL BREAKDOWN")
        annual_data = self.calculate_annual_breakdown(start_date, end_date)
        for year, data in annual_data.items():
            self.print_summary_table(data, f"Annual Summary - {year}")
        
        # Summary statistics
        print(f"\n📊 SUMMARY STATISTICS")
        print(f"{'='*60}")
        
        total_usd = sum(overall_totals['amounts'][method]['USD'] for method in ['BANK', 'CC', 'TETHER'])
        total_tl = sum(overall_totals['amounts'][method]['TL'] for method in ['BANK', 'CC', 'TETHER'])
        total_count = sum(overall_totals['amounts'][method]['count'] for method in ['BANK', 'CC', 'TETHER'])
        
        print(f"Total USD Amount: {self.format_currency(total_usd, 'USD')}")
        print(f"Total TL Amount: {self.format_currency(total_tl, 'TL')}")
        print(f"Total Transactions: {total_count}")
        
        # Payment method distribution
        print(f"\n💳 PAYMENT METHOD DISTRIBUTION")
        for method in ['BANK', 'CC', 'TETHER']:
            usd_amount = overall_totals['amounts'][method]['USD']
            tl_amount = overall_totals['amounts'][method]['TL']
            count = overall_totals['amounts'][method]['count']
            
            if count > 0:
                usd_pct = (usd_amount / total_usd * 100) if total_usd > 0 else 0
                tl_pct = (tl_amount / total_tl * 100) if total_tl > 0 else 0
                
                print(f"{method}: {count} transactions ({usd_pct:.1f}% USD, {tl_pct:.1f}% TL)")
        
        return {
            'overall_totals': overall_totals,
            'daily_data': daily_data,
            'monthly_data': monthly_data,
            'annual_data': annual_data
        }

def main():
    """Main function to run the financial calculator"""
    try:
        # Default date range (last 30 days)
        end_date = date.today()
        start_date = end_date - timedelta(days=30)
        
        # Allow command line arguments for date range
        if len(sys.argv) >= 3:
            try:
                start_date = datetime.strptime(sys.argv[1], '%Y-%m-%d').date()
                end_date = datetime.strptime(sys.argv[2], '%Y-%m-%d').date()
            except ValueError:
                print("❌ Invalid date format. Use YYYY-MM-DD")
                sys.exit(1)
        
        with FinancialCalculator() as calculator:
            report_data = calculator.generate_report(start_date, end_date)
            
            # Save report to JSON file
            output_file = f"financial_report_{start_date}_{end_date}.json"
            with open(output_file, 'w') as f:
                # Convert Decimal to float for JSON serialization
                def convert_decimals(obj):
                    if isinstance(obj, dict):
                        return {k: convert_decimals(v) for k, v in obj.items()}
                    elif isinstance(obj, list):
                        return [convert_decimals(item) for item in obj]
                    elif isinstance(obj, Decimal):
                        return float(obj)
                    else:
                        return obj
                
                json_data = convert_decimals(report_data)
                json.dump(json_data, f, indent=2, default=str)
            
            print(f"\n💾 Report saved to: {output_file}")
            print(f"✅ Financial calculation completed successfully!")
            
    except Exception as e:
        print(f"❌ Error running financial calculator: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
