#!/usr/bin/env python3
"""
Script to populate company data for transactions that don't have company information.
This is a temporary solution to demonstrate the company field functionality.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app
from app.models.transaction import Transaction

def populate_company_data():
    """Populate company data for transactions"""
    app = create_app()
    
    with app.app_context():
        try:
            # Get all transactions without company data
            transactions_without_company = Transaction.query.filter(
                (Transaction.company.is_(None)) | (Transaction.company == '')
            ).all()
            
            print(f"Found {len(transactions_without_company)} transactions without company data")
            
            # Sample company names to use
            sample_companies = [
                "Acme Corp",
                "Tech Solutions Ltd",
                "Global Enterprises",
                "Innovation Inc",
                "Business Partners",
                "Strategic Group",
                "Professional Services",
                "Consulting Co",
                "Development Corp",
                "Management Ltd"
            ]
            
            # Update transactions with sample company data
            updated_count = 0
            for i, transaction in enumerate(transactions_without_company):
                # Assign company based on client name hash for consistency
                company_index = hash(transaction.client_name) % len(sample_companies)
                transaction.company = sample_companies[company_index]
                updated_count += 1
                
                if updated_count % 100 == 0:
                    print(f"Updated {updated_count} transactions...")
            
            # Commit changes
            from app import db
            db.session.commit()
            
            print(f"Successfully updated {updated_count} transactions with company data")
            
            # Verify the update
            transactions_with_company = Transaction.query.filter(
                Transaction.company.isnot(None),
                Transaction.company != ''
            ).count()
            
            print(f"Total transactions with company data: {transactions_with_company}")
            
        except Exception as e:
            print(f"Error populating company data: {e}")
            return False
    
    return True

if __name__ == "__main__":
    success = populate_company_data()
    if success:
        print("Company data population completed successfully!")
    else:
        print("Company data population failed!")
        sys.exit(1)
