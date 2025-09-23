"""
Pytest configuration and fixtures for PipLinePro tests
"""
import pytest
import os
import tempfile
from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction

@pytest.fixture(scope='session')
def app():
    """Create test application for the entire test session"""
    # Set testing environment
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['TESTING'] = 'true'
    
    # Create temporary database
    db_fd, db_path = tempfile.mkstemp()
    
    app = create_app('testing')
    app.config.update({
        'TESTING': True,
        'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_path}',
        'WTF_CSRF_ENABLED': False,
        'LOGIN_DISABLED': False
    })
    
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()
    
    os.close(db_fd)
    os.unlink(db_path)

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def runner(app):
    """Create test CLI runner"""
    return app.test_cli_runner()

@pytest.fixture
def auth_headers(client):
    """Get authentication headers for testing"""
    # Create test user
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash='hashed_password'
    )
    db.session.add(user)
    db.session.commit()
    
    # For testing, we'll use a simple auth mechanism
    # In real implementation, this would involve proper login
    return {
        'Content-Type': 'application/json',
        'X-Test-User': 'testuser'
    }

@pytest.fixture
def sample_transactions(app):
    """Create sample transactions for testing"""
    with app.app_context():
        transactions = [
            Transaction(
                amount=1000.00,
                currency='TRY',
                psp='SİPAY',
                client_name='Client A',
                date='2025-09-23',
                category='Payment'
            ),
            Transaction(
                amount=2000.00,
                currency='TRY',
                psp='PAYTR',
                client_name='Client B',
                date='2025-09-23',
                category='Payment'
            ),
            Transaction(
                amount=1500.00,
                currency='USD',
                psp='SİPAY',
                client_name='Client C',
                date='2025-09-22',
                category='Refund'
            )
        ]
        
        for transaction in transactions:
            db.session.add(transaction)
        db.session.commit()
        
        return transactions

@pytest.fixture
def sample_user(app):
    """Create sample user for testing"""
    with app.app_context():
        user = User(
            username='testuser',
            email='test@example.com',
            password_hash='hashed_password',
            is_active=True
        )
        db.session.add(user)
        db.session.commit()
        return user

# Test configuration
def pytest_configure(config):
    """Configure pytest"""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests"
    )

def pytest_collection_modifyitems(config, items):
    """Modify test collection"""
    for item in items:
        # Mark tests based on their location
        if "test_api_endpoints" in item.nodeid:
            item.add_marker(pytest.mark.integration)
        elif "test_services" in item.nodeid:
            item.add_marker(pytest.mark.unit)
        
        # Mark slow tests
        if "performance" in item.nodeid or "load" in item.nodeid:
            item.add_marker(pytest.mark.slow)