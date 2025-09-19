"""
Data Validation Utilities for PipLinePro
Provides validation functions for transaction data completeness and security
"""

from typing import Dict, List, Optional, Tuple
import re
from datetime import datetime, date

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service



class TransactionValidator:
    """Validates transaction data for completeness and security"""
    
    @staticmethod
    def validate_transaction(transaction) -> Dict[str, any]:
        """
        Validates a transaction object and returns validation results
        
        Args:
            transaction: Transaction object from database
            
        Returns:
            Dict containing validation results
        """
        validation_result = {
            'is_complete': True,
            'missing_fields': [],
            'warnings': [],
            'security_issues': [],
            'data_quality_score': 100
        }
        
        # Check required fields
        required_fields = ['client_name', 'amount', 'date', 'currency']
        for field in required_fields:
            if not getattr(transaction, field, None):
                validation_result['missing_fields'].append(field)
                validation_result['is_complete'] = False
        
        # Check optional but important fields
        optional_fields = ['iban', 'payment_method', 'company_order', 'category', 'psp']
        for field in optional_fields:
            if not getattr(transaction, field, None):
                validation_result['warnings'].append(f"Missing {field.replace('_', ' ').title()}")
        
        # Security checks
        if transaction.iban:
            if not TransactionValidator._is_valid_iban(transaction.iban):
                validation_result['security_issues'].append("Invalid IBAN format")
        
        # Data quality checks
        if transaction.amount:
            if not isinstance(transaction.amount, (int, float)):
                validation_result['warnings'].append("Amount should be numeric")
        
        if transaction.date:
            if not isinstance(transaction.date, (datetime, date)):
                validation_result['warnings'].append("Invalid date format")
        
        # Calculate data quality score
        total_fields = len(required_fields) + len(optional_fields)
        missing_count = len(validation_result['missing_fields']) + len(validation_result['warnings'])
        validation_result['data_quality_score'] = max(0, 100 - (missing_count / total_fields * 100))
        
        return validation_result
    
    @staticmethod
    def _is_valid_iban(iban: str) -> bool:
        """Validates IBAN format"""
        if not iban:
            return False
        
        # Basic IBAN validation (simplified)
        iban = iban.replace(' ', '').upper()
        
        # Check length (most IBANs are 15-34 characters)
        if len(iban) < 15 or len(iban) > 34:
            return False
        
        # Check if it starts with 2 letters (country code)
        if not re.match(r'^[A-Z]{2}', iban):
            return False
        
        # Check if rest contains only alphanumeric characters
        if not re.match(r'^[A-Z]{2}[0-9A-Z]+$', iban):
            return False
        
        return True
    
    @staticmethod
    def mask_sensitive_data(data: str, data_type: str = 'iban') -> str:
        """
        Masks sensitive data for display
        
        Args:
            data: The data to mask
            data_type: Type of data (iban, credit_card, etc.)
            
        Returns:
            Masked data string
        """
        if not data:
            return data
        
        if data_type == 'iban':
            if len(data) <= 8:
                return '*' * len(data)
            return data[:4] + '*' * (len(data) - 8) + data[-4:]
        
        elif data_type == 'credit_card':
            if len(data) <= 4:
                return '*' * len(data)
            return '*' * (len(data) - 4) + data[-4:]
        
        else:
            # Default masking
            if len(data) <= 4:
                return '*' * len(data)
            return data[:2] + '*' * (len(data) - 4) + data[-2:]
    
    @staticmethod
    def get_validation_class(validation_result: Dict) -> str:
        """
        Returns CSS class based on validation result
        
        Args:
            validation_result: Validation result from validate_transaction
            
        Returns:
            CSS class name
        """
        if not validation_result['is_complete']:
            return 'data-incomplete'
        elif validation_result['warnings']:
            return 'data-warning'
        elif validation_result['data_quality_score'] < 70:
            return 'data-poor-quality'
        else:
            return 'data-complete'
    
    @staticmethod
    def get_validation_message(validation_result: Dict) -> str:
        """
        Returns user-friendly validation message
        
        Args:
            validation_result: Validation result from validate_transaction
            
        Returns:
            User-friendly message
        """
        if not validation_result['is_complete']:
            missing = ', '.join(validation_result['missing_fields'])
            return f"Missing required fields: {missing}"
        elif validation_result['warnings']:
            warnings = ', '.join(validation_result['warnings'][:3])  # Show first 3 warnings
            return f"Data quality issues: {warnings}"
        elif validation_result['security_issues']:
            issues = ', '.join(validation_result['security_issues'])
            return f"Security issues: {issues}"
        else:
            return "Data complete and valid"


class DataQualityAnalyzer:
    """Analyzes overall data quality across transactions"""
    
    @staticmethod
    def analyze_dataset(transactions: List) -> Dict[str, any]:
        """
        Analyzes quality of entire transaction dataset
        
        Args:
            transactions: List of transaction objects
            
        Returns:
            Analysis results
        """
        if not transactions:
            return {
                'total_records': 0,
                'complete_records': 0,
                'incomplete_records': 0,
                'average_quality_score': 0,
                'common_issues': [],
                'recommendations': []
            }
        
        total_records = len(transactions)
        complete_records = 0
        incomplete_records = 0
        quality_scores = []
        all_issues = []
        
        for transaction in transactions:
            validation = TransactionValidator.validate_transaction(transaction)
            
            if validation['is_complete']:
                complete_records += 1
            else:
                incomplete_records += 1
            
            quality_scores.append(validation['data_quality_score'])
            all_issues.extend(validation['missing_fields'])
            all_issues.extend(validation['warnings'])
        
        # Calculate common issues
        issue_counts = {}
        for issue in all_issues:
            issue_counts[issue] = issue_counts.get(issue, 0) + 1
        
        common_issues = sorted(issue_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Generate recommendations
        recommendations = DataQualityAnalyzer._generate_recommendations(
            complete_records, total_records, common_issues
        )
        
        return {
            'total_records': total_records,
            'complete_records': complete_records,
            'incomplete_records': incomplete_records,
            'completion_rate': (complete_records / total_records) * 100 if total_records > 0 else 0,
            'average_quality_score': sum(quality_scores) / len(quality_scores) if quality_scores else 0,
            'common_issues': common_issues,
            'recommendations': recommendations
        }
    
    @staticmethod
    def _generate_recommendations(complete: int, total: int, common_issues: List) -> List[str]:
        """Generates data quality improvement recommendations"""
        recommendations = []
        
        completion_rate = (complete / total) * 100 if total > 0 else 0
        
        if completion_rate < 50:
            recommendations.append("Critical: Over 50% of records are incomplete. Review data entry process.")
        elif completion_rate < 80:
            recommendations.append("Warning: Data completion rate below 80%. Consider data validation.")
        elif completion_rate < 95:
            recommendations.append("Good: Data completion rate above 80%. Minor improvements needed.")
        else:
            recommendations.append("Excellent: Data completion rate above 95%.")
        
        if common_issues:
            top_issue = common_issues[0]
            recommendations.append(f"Most common issue: {top_issue[0]} ({top_issue[1]} occurrences)")
        
        return recommendations


class SecurityValidator:
    """Validates security aspects of transaction data"""
    
    @staticmethod
    def validate_security(transaction) -> Dict[str, any]:
        """
        Validates security aspects of transaction data
        
        Args:
            transaction: Transaction object
            
        Returns:
            Security validation results
        """
        security_result = {
            'has_sensitive_data': False,
            'sensitive_fields': [],
            'security_warnings': [],
            'recommendations': []
        }
        
        # Check for sensitive data
        sensitive_fields = ['iban', 'credit_card', 'ssn', 'passport']
        
        for field in sensitive_fields:
            if hasattr(transaction, field) and getattr(transaction, field):
                security_result['has_sensitive_data'] = True
                security_result['sensitive_fields'].append(field)
        
        # Check for potential security issues
        if transaction.iban and not TransactionValidator._is_valid_iban(transaction.iban):
            security_result['security_warnings'].append("Invalid IBAN format detected")
        
        # Generate security recommendations
        if security_result['has_sensitive_data']:
            security_result['recommendations'].append("Consider masking sensitive data in displays")
            security_result['recommendations'].append("Implement proper access controls")
        
        return security_result 