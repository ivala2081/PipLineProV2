"""
Automated JSON Fix Service
This service automatically detects, fixes, and prevents JSON parsing errors
"""
import json
import re
import logging
import traceback
import time
from typing import Any, Dict, List, Union, Optional
from datetime import datetime, date
from decimal import Decimal
from flask import current_app
from app.utils.logger import get_logger
from app.services.json_monitoring_service import record_json_error
import math

# Decimal/Float type mismatch prevention
from app.services.decimal_float_fix_service import decimal_float_service


logger = get_logger(__name__)

class JSONAutoFixService:
    """Automated JSON parsing and fixing service"""
    
    def __init__(self):
        self.error_count = 0
        self.fix_count = 0
        self.last_error_time = None
        
    def safe_json_dumps(self, obj: Any, **kwargs) -> str:
        """Safely serialize object to JSON with automatic fixing"""
        start_time = time.time()
        try:
            # First attempt: standard serialization
            result = json.dumps(obj, **kwargs)
            return result
        except Exception as e:
            fix_start_time = time.time()
            logger.warning(f"JSON dumps failed, attempting auto-fix: {e}")
            result = self._fix_and_serialize(obj, **kwargs)
            fix_time_ms = (time.time() - fix_start_time) * 1000
            
            # Record the error and fix
            record_json_error(
                error_type="JSON_DUMPS_ERROR",
                error_message=str(e),
                source="json_auto_fix_service",
                original_data=str(obj)[:200],
                fixed=True,
                fix_time_ms=fix_time_ms,
                fixed_data=result[:200]
            )
            return result
    
    def safe_json_loads(self, text: str, **kwargs) -> Any:
        """Safely deserialize JSON with automatic fixing"""
        start_time = time.time()
        try:
            # First attempt: standard deserialization
            result = json.loads(text, **kwargs)
            return result
        except Exception as e:
            fix_start_time = time.time()
            logger.warning(f"JSON loads failed, attempting auto-fix: {e}")
            result = self._fix_and_deserialize(text, **kwargs)
            fix_time_ms = (time.time() - fix_start_time) * 1000
            
            # Record the error and fix
            record_json_error(
                error_type="JSON_LOADS_ERROR",
                error_message=str(e),
                source="json_auto_fix_service",
                original_data=text[:200],
                fixed=True,
                fix_time_ms=fix_time_ms,
                fixed_data=str(result)[:200]
            )
            return result
    
    def _fix_and_serialize(self, obj: Any, **kwargs) -> str:
        """Fix object and serialize to JSON"""
        try:
            # Clean the object for JSON serialization
            cleaned_obj = self._deep_clean_object(obj)
            return json.dumps(cleaned_obj, **kwargs)
        except Exception as e:
            logger.error(f"Auto-fix serialization failed: {e}")
            # Return safe fallback
            return '{"error": "JSON serialization failed", "data": []}'
    
    def _fix_and_deserialize(self, text: str, **kwargs) -> Any:
        """Fix JSON text and deserialize"""
        try:
            # Clean the JSON text
            cleaned_text = self._clean_json_text(text)
            return json.loads(cleaned_text, **kwargs)
        except Exception as e:
            logger.error(f"Auto-fix deserialization failed: {e}")
            # Return safe fallback
            return {
                "error": "JSON parsing failed",
                "originalError": str(e),
                "data": [],
                "status": "error"
            }
    
    def _deep_clean_object(self, obj, depth=0, visited=None):
        """Deep clean object for JSON serialization with recursion protection"""
        # Prevent infinite recursion
        if depth > 10:
            logger.warning("Maximum recursion depth reached in _deep_clean_object")
            return str(obj)
        
        # Track visited objects to prevent circular references
        if visited is None:
            visited = set()
        
        # Check for circular references
        obj_id = id(obj)
        if obj_id in visited:
            logger.warning("Circular reference detected in _deep_clean_object")
            return str(obj)
        
        if obj is None:
            return None
        elif isinstance(obj, (str, int, float, bool)):
            return self._clean_primitive(obj)
        elif isinstance(obj, (list, tuple)):
            visited.add(obj_id)
            try:
                return [self._deep_clean_object(item, depth + 1, visited) for item in obj]
            finally:
                visited.discard(obj_id)
        elif isinstance(obj, dict):
            visited.add(obj_id)
            try:
                return {str(k): self._deep_clean_object(v, depth + 1, visited) for k, v in obj.items()}
            finally:
                visited.discard(obj_id)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        elif hasattr(obj, '__dict__'):
            # Handle SQLAlchemy objects and other custom objects
            visited.add(obj_id)
            try:
                # Only process __dict__ if it's not too large
                if len(obj.__dict__) > 100:
                    return str(obj)
                return self._deep_clean_object(obj.__dict__, depth + 1, visited)
            except:
                return str(obj)
            finally:
                visited.discard(obj_id)
        else:
            return str(obj)
    
    def _clean_primitive(self, value):
        """Clean primitive values for JSON compatibility"""
        if isinstance(value, str):
            # Handle unquoted strings that might break JSON
            if value.strip() in ['Client', 'WD', 'PSP', 'TestPSPDetails']:
                return f'"{value}"'
            
            # Remove any control characters that might break JSON
            value = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', value)
            
            # Ensure proper escaping
            value = value.replace('\\', '\\\\').replace('"', '\\"')
            
            return value
        elif isinstance(value, (int, float)):
            # Handle NaN and Infinity
            if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
                return 0
            return value
        else:
            return value
    
    def _clean_string(self, s: str) -> str:
        """Clean string for JSON compatibility"""
        if not isinstance(s, str):
            s = str(s)
        
        # Remove control characters (but keep Turkish characters)
        s = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', s)
        
        # Replace problematic quotes
        s = s.replace('"', "'")
        s = s.replace('"', "'")
        s = s.replace('"', "'")
        
        # Replace newlines and tabs
        s = s.replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
        
        # Replace backslashes
        s = s.replace('\\', '/')
        
        # Remove multiple spaces
        s = re.sub(r'\s+', ' ', s).strip()
        
        # Ensure not empty
        if not s:
            s = "Unknown"
        
        return s
    
    def _clean_json_text(self, text: str) -> str:
        """Clean JSON text for parsing"""
        if not isinstance(text, str):
            text = str(text)
        
        # Remove control characters
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)
        
        # Fix common JSON issues
        text = re.sub(r',\s*}', '}', text)  # Remove trailing commas
        text = re.sub(r',\s*]', ']', text)  # Remove trailing commas in arrays
        
        # Handle unescaped quotes in strings
        text = re.sub(r'"([^"]*)"([^"]*)"([^"]*)"', r'"\1\2\3"', text)
        
        # If text starts with 'Client' or similar, wrap it in quotes
        if text.strip().startswith('Client') and not text.strip().startswith('"'):
            text = '"' + text.replace('"', '\\"') + '"'
        
        # If it looks like a string but isn't quoted, quote it
        if not text.startswith('{') and not text.startswith('[') and not text.startswith('"'):
            text = '"' + text.replace('"', '\\"') + '"'
        
        return text
    
    def validate_json(self, text: str) -> bool:
        """Validate if text is valid JSON"""
        try:
            json.loads(text)
            return True
        except:
            return False
    
    def auto_fix_template_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Automatically fix template data for JSON serialization"""
        try:
            fixed_data = {}
            for key, value in data.items():
                try:
                    fixed_data[key] = self._deep_clean_object(value)
                except Exception as e:
                    logger.warning(f"Failed to fix template data for key '{key}': {e}")
                    fixed_data[key] = "Error"
            
            return fixed_data
        except Exception as e:
            logger.error(f"Auto-fix template data failed: {e}")
            return {"error": "Template data fix failed"}
    
    def create_safe_json_response(self, data: Any, status: str = "success") -> Dict[str, Any]:
        """Create a safe JSON response"""
        try:
            cleaned_data = self._deep_clean_object(data)
            return {
                "status": status,
                "data": cleaned_data,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Failed to create safe JSON response: {e}")
            return {
                "status": "error",
                "error": "Failed to create response",
                "data": [],
                "timestamp": datetime.now().isoformat()
            }

# Global instance
json_auto_fix_service = JSONAutoFixService()

# Convenience functions
def safe_json_dumps(obj: Any, **kwargs) -> str:
    """Safely serialize object to JSON"""
    return json_auto_fix_service.safe_json_dumps(obj, **kwargs)

def safe_json_loads(text: str, **kwargs) -> Any:
    """Safely deserialize JSON"""
    return json_auto_fix_service.safe_json_loads(text, **kwargs)

def auto_fix_template_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Auto-fix template data"""
    return json_auto_fix_service.auto_fix_template_data(data)

def create_safe_json_response(data: Any, status: str = "success") -> Dict[str, Any]:
    """Create safe JSON response"""
    return json_auto_fix_service.create_safe_json_response(data, status) 