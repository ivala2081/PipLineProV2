"""
Decimal/Float Type Mismatch Automation Service
Comprehensive solution for preventing and fixing type comparison errors
"""
import re
import logging
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Union, Optional
from datetime import datetime, date
import traceback

logger = logging.getLogger(__name__)

class DecimalFloatAutomationService:
    """Comprehensive service for automating decimal/float type mismatch fixes"""
    
    def __init__(self):
        self.fix_count = 0
        self.error_count = 0
        self.fixes_applied = []
        
    def safe_compare(self, value1: Any, operator: str, value2: Any) -> bool:
        """
        Safely compare two values with automatic type conversion
        
        Args:
            value1: First value to compare
            operator: Comparison operator ('>=', '<=', '>', '<', '==', '!=')
            value2: Second value to compare
            
        Returns:
            bool: Result of the comparison
        """
        try:
            # Convert both values to appropriate numeric types
            converted_value1 = self._convert_to_numeric(value1)
            converted_value2 = self._convert_to_numeric(value2)
            
            # Perform the comparison
            if operator == '>=':
                return converted_value1 >= converted_value2
            elif operator == '<=':
                return converted_value1 <= converted_value2
            elif operator == '>':
                return converted_value1 > converted_value2
            elif operator == '<':
                return converted_value1 < converted_value2
            elif operator == '==':
                return converted_value1 == converted_value2
            elif operator == '!=':
                return converted_value1 != converted_value2
            else:
                logger.warning(f"Unsupported operator: {operator}")
                return False
                
        except Exception as e:
            logger.error(f"Error in safe_compare: {e}")
            self.error_count += 1
            return False
    
    def _convert_to_numeric(self, value: Any) -> Union[Decimal, int, float]:
        """Convert any value to appropriate numeric type"""
        if value is None:
            return Decimal('0')
        
        if isinstance(value, (int, float, Decimal)):
            return Decimal(str(value))
        
        if isinstance(value, str):
            # Remove currency symbols and commas
            cleaned = re.sub(r'[^\d.-]', '', value.strip())
            if cleaned:
                try:
                    return Decimal(cleaned)
                except (ValueError, InvalidOperation):
                    pass
        
        # Try to convert to float first, then to Decimal
        try:
            return Decimal(str(float(value)))
        except (ValueError, TypeError, InvalidOperation):
            logger.warning(f"Could not convert {value} to numeric")
            return Decimal('0')
    
    def fix_template_comparisons(self, template_content: str) -> str:
        """
        Fix template comparison issues by replacing unsafe comparisons
        
        Args:
            template_content: Raw template content
            
        Returns:
            str: Fixed template content
        """
        try:
            # Pattern to match template comparisons like {% if amount >= 0 %}
            comparison_pattern = r'({%\s*if\s+)(\w+)\s*(>=|<=|>|<|==|!=)\s*([^%}]+)(\s*%})'
            
            def replace_comparison(match):
                prefix = match.group(1)
                variable = match.group(2)
                operator = match.group(3)
                value = match.group(4).strip()
                suffix = match.group(5)
                
                # Create safe comparison using our service
                safe_comparison = f"{prefix}decimal_float_service.safe_compare({variable}, '{operator}', {value}){suffix}"
                
                self.fix_count += 1
                self.fixes_applied.append({
                    'type': 'template_comparison',
                    'original': match.group(0),
                    'fixed': safe_comparison,
                    'variable': variable,
                    'operator': operator,
                    'value': value
                })
                
                return safe_comparison
            
            # Apply the fix
            fixed_content = re.sub(comparison_pattern, replace_comparison, template_content)
            
            if fixed_content != template_content:
                logger.info(f"Fixed {self.fix_count} template comparisons")
            
            return fixed_content
            
        except Exception as e:
            logger.error(f"Error fixing template comparisons: {e}")
            self.error_count += 1
            return template_content
    
    def fix_database_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fix database filter values to ensure proper type conversion
        
        Args:
            filters: Dictionary of filter values
            
        Returns:
            Dict[str, Any]: Fixed filters with proper types
        """
        try:
            fixed_filters = {}
            
            for key, value in filters.items():
                if value is None:
                    fixed_filters[key] = None
                    continue
                
                # Handle different filter types
                if key in ['amount_min', 'amount_max', 'commission_min', 'commission_max']:
                    fixed_filters[key] = self._convert_to_numeric(value)
                elif key in ['date_from', 'date_to']:
                    fixed_filters[key] = self._convert_to_date(value)
                elif key in ['page', 'per_page']:
                    fixed_filters[key] = self._convert_to_int(value)
                else:
                    fixed_filters[key] = value
            
            return fixed_filters
            
        except Exception as e:
            logger.error(f"Error fixing database filters: {e}")
            self.error_count += 1
            return filters
    
    def _convert_to_date(self, value: Any) -> Optional[date]:
        """Convert value to date object"""
        if value is None:
            return None
        
        if isinstance(value, date):
            return value
        
        if isinstance(value, datetime):
            return value.date()
        
        if isinstance(value, str):
            try:
                return datetime.strptime(value, '%Y-%m-%d').date()
            except ValueError:
                logger.warning(f"Could not convert {value} to date")
                return None
        
        return None
    
    def _convert_to_int(self, value: Any) -> int:
        """Convert value to integer"""
        if value is None:
            return 0
        
        if isinstance(value, int):
            return value
        
        try:
            return int(float(value))
        except (ValueError, TypeError):
            logger.warning(f"Could not convert {value} to int")
            return 0
    
    def fix_query_parameters(self, query_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Fix SQLAlchemy query parameters to prevent type mismatches
        
        Args:
            query_params: Dictionary of query parameters
            
        Returns:
            Dict[str, Any]: Fixed parameters with proper types
        """
        try:
            fixed_params = {}
            
            for key, value in query_params.items():
                if key.endswith('_amount') or key.endswith('_value'):
                    fixed_params[key] = self._convert_to_numeric(value)
                elif key.endswith('_date'):
                    fixed_params[key] = self._convert_to_date(value)
                elif key.endswith('_count') or key.endswith('_id'):
                    fixed_params[key] = self._convert_to_int(value)
                else:
                    fixed_params[key] = value
            
            return fixed_params
            
        except Exception as e:
            logger.error(f"Error fixing query parameters: {e}")
            self.error_count += 1
            return query_params
    
    def create_template_filter(self, filter_name: str) -> str:
        """
        Create a Jinja2 template filter for safe numeric operations
        
        Args:
            filter_name: Name of the filter to create
            
        Returns:
            str: Jinja2 filter code
        """
        if filter_name == 'safe_compare':
            return """
def safe_compare(value, operator, compare_value):
    \"\"\"Safely compare values with automatic type conversion\"\"\"
    try:
        from decimal import Decimal
        import re
        
        def convert_to_numeric(val):
            if val is None:
                return Decimal('0')
            if isinstance(val, (int, float)):
                return Decimal(str(val))
            if isinstance(val, str):
                cleaned = re.sub(r'[^\\d.-]', '', val.strip())
                if cleaned:
                    return Decimal(cleaned)
            return Decimal('0')
        
        val1 = convert_to_numeric(value)
        val2 = convert_to_numeric(compare_value)
        
        if operator == '>=':
            return val1 >= val2
        elif operator == '<=':
            return val1 <= val2
        elif operator == '>':
            return val1 > val2
        elif operator == '<':
            return val1 < val2
        elif operator == '==':
            return val1 == val2
        elif operator == '!=':
            return val1 != val2
        return False
    except:
        return False
"""
        elif filter_name == 'safe_float':
            return """
def safe_float(value):
    \"\"\"Safely convert value to float\"\"\"
    try:
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            import re
            cleaned = re.sub(r'[^\\d.-]', '', value.strip())
            if cleaned:
                return float(cleaned)
        return 0.0
    except:
        return 0.0
"""
        else:
            return ""
    
    def get_fix_statistics(self) -> Dict[str, Any]:
        """Get statistics about fixes applied"""
        return {
            'total_fixes': self.fix_count,
            'total_errors': self.error_count,
            'fixes_applied': self.fixes_applied,
            'success_rate': (self.fix_count / (self.fix_count + self.error_count)) * 100 if (self.fix_count + self.error_count) > 0 else 0
        }
    
    def reset_statistics(self):
        """Reset fix statistics"""
        self.fix_count = 0
        self.error_count = 0
        self.fixes_applied = []

# Global service instance
decimal_float_automation_service = DecimalFloatAutomationService() 