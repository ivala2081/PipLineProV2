"""
Simple pytest configuration for PipLinePro unit tests
"""
import os
import sys
import pytest
from unittest.mock import Mock, patch
from decimal import Decimal
from datetime import datetime, date, timezone

# Add the app directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'app'))

# Set up test environment
os.environ['TESTING'] = 'true'
os.environ['MOCK_NETWORK'] = 'true'

# Freeze time for deterministic tests
os.environ['FREEZE_TIME'] = '2025-01-01 12:00:00'

@pytest.fixture(scope="session")
def app():
    """Create a test Flask application"""
    try:
        from app import create_app
        app = create_app()
        app.config['TESTING'] = True
        app.config['WTF_CSRF_ENABLED'] = False
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        return app
    except ImportError:
        # Fallback for when app module is not available
        from flask import Flask
        app = Flask(__name__)
        app.config['TESTING'] = True
        return app

@pytest.fixture
def mock_request():
    """Mock Flask request object"""
    request_mock = Mock()
    request_mock.method = 'GET'
    request_mock.args = {}
    request_mock.json = {}
    request_mock.form = {}
    request_mock.files = {}
    return request_mock

@pytest.fixture
def mock_current_user():
    """Mock current user for authentication"""
    user_mock = Mock()
    user_mock.id = 1
    user_mock.username = 'test_user'
    user_mock.is_authenticated = True
    user_mock.is_active = True
    return user_mock

@pytest.fixture
def sample_transaction_data():
    """Sample transaction data for testing"""
    return {
        'amount': Decimal('1000.00'),
        'currency': 'USD',
        'psp': 'Test PSP',
        'client': 'Test Client',
        'date': date(2025, 1, 15),
        'description': 'Test transaction',
        'commission_rate': Decimal('0.025'),
        'commission_amount': Decimal('25.00')
    }

@pytest.fixture
def sample_exchange_rate_data():
    """Sample exchange rate data for testing"""
    return {
        'from_currency': 'USD',
        'to_currency': 'TRY',
        'rate': Decimal('30.50'),
        'date': date(2025, 1, 15)
    }

@pytest.fixture(autouse=True)
def mock_network_calls():
    """Mock all network calls"""
    with patch('requests.get'), \
         patch('requests.post'), \
         patch('urllib.request.urlopen'):
        yield

@pytest.fixture(autouse=True)
def freeze_time():
    """Freeze time for deterministic tests"""
    with patch('datetime.datetime') as mock_datetime, \
         patch('datetime.date') as mock_date:
        
        # Set fixed time
        fixed_time = datetime(2025, 1, 1, 12, 0, 0, tzinfo=timezone.utc)
        fixed_date = date(2025, 1, 1)
        
        mock_datetime.now.return_value = fixed_time
        mock_datetime.utcnow.return_value = fixed_time
        mock_date.today.return_value = fixed_date
        
        yield

@pytest.fixture(autouse=True)
def fix_random_seed():
    """Fix random seed for deterministic tests"""
    import random
    random.seed(42)
    yield
