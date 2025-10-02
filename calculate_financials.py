#!/usr/bin/env python3
"""
Simple Financial Calculator
Quick script to calculate BANK, CC, and TETHER totals in USD and TL

Usage:
    python calculate_financials.py [start_date] [end_date]
    
Examples:
    python calculate_financials.py
    python calculate_financials.py 2025-01-01 2025-01-31
    python calculate_financials.py 2025-09-01 2025-09-26
"""

import sys
import os
from datetime import datetime, date, timedelta

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.scripts.dashboard_financial_metrics import DashboardFinancialMetrics

def main():
    """Main function"""
    try:
        # Parse command line arguments
        start_date = None
        end_date = None
        
        if len(sys.argv) >= 3:
            try:
                start_date = datetime.strptime(sys.argv[1], '%Y-%m-%d').date()
                end_date = datetime.strptime(sys.argv[2], '%Y-%m-%d').date()
            except ValueError:
                print("❌ Invalid date format. Use YYYY-MM-DD")
                print("Example: python calculate_financials.py 2025-01-01 2025-01-31")
                sys.exit(1)
        else:
            # Default to last 30 days
            end_date = date.today()
            start_date = end_date - timedelta(days=30)
            print(f"📅 Using default date range: {start_date} to {end_date}")
        
        print("🏦 FINANCIAL CALCULATOR")
        print("=" * 50)
        print(f"📅 Period: {start_date} to {end_date}")
        
        with DashboardFinancialMetrics() as calculator:
            # Calculate metrics for the specified period
            period_metrics = calculator.calculate_metrics_for_period(start_date, end_date)
            
            print(f"\n📊 FINANCIAL BREAKDOWN")
            print(f"Exchange Rate: {period_metrics['exchange_rate']} USD/TRY")
            print(f"Total Transactions: {period_metrics['total_transactions']}")
            print()
            
            print(f"{'Method':<10} {'Currency':<8} {'Amount':<15} {'Commission':<12} {'Net':<15} {'Count':<6}")
            print("-" * 70)
            
            for method in ['BANK', 'CC', 'TETHER']:
                for currency in ['USD', 'TL']:
                    amount = period_metrics['amounts'][method][currency]
                    commission = period_metrics['commissions'][method][currency]
                    net = period_metrics['net_amounts'][method][currency]
                    count = period_metrics['amounts'][method]['count'] if currency == 'USD' else ''
                    
                    if amount > 0 or commission > 0 or net > 0:
                        print(f"{method:<10} {currency:<8} {calculator.format_currency(amount, currency):<15} "
                              f"{calculator.format_currency(commission, currency):<12} "
                              f"{calculator.format_currency(net, currency):<15} {count:<6}")
            
            # Summary
            print(f"\n📈 SUMMARY")
            total_usd = sum(period_metrics['amounts'][method]['USD'] for method in ['BANK', 'CC', 'TETHER'])
            total_tl = sum(period_metrics['amounts'][method]['TL'] for method in ['BANK', 'CC', 'TETHER'])
            total_count = sum(period_metrics['amounts'][method]['count'] for method in ['BANK', 'CC', 'TETHER'])
            
            print(f"Total USD: {calculator.format_currency(total_usd, 'USD')}")
            print(f"Total TL: {calculator.format_currency(total_tl, 'TL')}")
            print(f"Total Transactions: {total_count}")
            
            # Payment method breakdown
            print(f"\n💳 PAYMENT METHOD BREAKDOWN")
            for method in ['BANK', 'CC', 'TETHER']:
                usd_amount = period_metrics['amounts'][method]['USD']
                tl_amount = period_metrics['amounts'][method]['TL']
                count = period_metrics['amounts'][method]['count']
                
                if count > 0:
                    usd_pct = (usd_amount / total_usd * 100) if total_usd > 0 else 0
                    tl_pct = (tl_amount / total_tl * 100) if total_tl > 0 else 0
                    
                    print(f"{method}: {count} transactions")
                    print(f"  USD: {calculator.format_currency(usd_amount, 'USD')} ({usd_pct:.1f}%)")
                    print(f"  TL:  {calculator.format_currency(tl_amount, 'TL')} ({tl_pct:.1f}%)")
                    print()
            
            print("✅ Calculation completed successfully!")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
