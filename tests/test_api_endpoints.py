"""
Comprehensive API endpoint tests for PipLinePro
"""
import pytest
import json
from datetime import datetime, timedelta
from app import create_app, db
from app.models.user import User
from app.models.transaction import Transaction

@pytest.fixture
def app():
    """Create test application"""
    app = create_app('testing')
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()

@pytest.fixture
def client(app):
    """Create test client"""
    return app.test_client()

@pytest.fixture
def auth_headers(client):
    """Get authentication headers"""
    # Create test user
    user = User(
        username='testuser',
        email='test@example.com',
        password_hash='hashed_password'
    )
    db.session.add(user)
    db.session.commit()
    
    # Login to get session
    response = client.post('/api/v1/auth/login', json={
        'username': 'testuser',
        'password': 'testpassword'
    })
    
    # Return headers for authenticated requests
    return {
        'Content-Type': 'application/json',
        'Cookie': response.headers.get('Set-Cookie', '')
    }

class TestTransactionEndpoints:
    """Test transaction API endpoints"""
    
    def test_get_transactions_unauthorized(self, client):
        """Test getting transactions without authentication"""
        response = client.get('/api/v1/transactions/')
        assert response.status_code == 401
    
    def test_get_transactions_authorized(self, client, auth_headers):
        """Test getting transactions with authentication"""
        # Create test transaction
        transaction = Transaction(
            amount=1000.00,
            currency='TRY',
            psp='SİPAY',
            client_name='Test Client',
            date=datetime.now().date()
        )
        db.session.add(transaction)
        db.session.commit()
        
        response = client.get('/api/v1/transactions/', headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'transactions' in data
        assert len(data['transactions']) == 1
        assert data['transactions'][0]['amount'] == 1000.00
    
    def test_create_transaction(self, client, auth_headers):
        """Test creating a new transaction"""
        transaction_data = {
            'amount': 2500.00,
            'currency': 'TRY',
            'psp': 'SİPAY',
            'client_name': 'New Client',
            'date': datetime.now().date().isoformat(),
            'category': 'Payment',
            'description': 'Test transaction'
        }
        
        response = client.post('/api/v1/transactions/', 
                             json=transaction_data,
                             headers=auth_headers)
        assert response.status_code == 201
        
        data = json.loads(response.data)
        assert 'transaction' in data
        assert data['transaction']['amount'] == 2500.00
    
    def test_get_psp_summary_stats(self, client, auth_headers):
        """Test PSP summary statistics endpoint"""
        # Create test transactions
        transactions = [
            Transaction(amount=1000.00, currency='TRY', psp='SİPAY', 
                       client_name='Client A', date=datetime.now().date()),
            Transaction(amount=2000.00, currency='TRY', psp='SİPAY', 
                       client_name='Client B', date=datetime.now().date()),
            Transaction(amount=1500.00, currency='TRY', psp='PAYTR', 
                       client_name='Client C', date=datetime.now().date())
        ]
        
        for transaction in transactions:
            db.session.add(transaction)
        db.session.commit()
        
        response = client.get('/api/v1/transactions/psp_summary_stats', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) == 2  # Two unique PSPs
    
    def test_get_psp_monthly_stats(self, client, auth_headers):
        """Test PSP monthly statistics endpoint"""
        # Create test transactions for current month
        current_date = datetime.now().date()
        transaction = Transaction(
            amount=5000.00,
            currency='TRY',
            psp='SİPAY',
            client_name='Test Client',
            date=current_date
        )
        db.session.add(transaction)
        db.session.commit()
        
        response = client.get('/api/v1/transactions/psp_monthly_stats', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)

class TestAnalyticsEndpoints:
    """Test analytics API endpoints"""
    
    def test_get_dashboard_stats(self, client, auth_headers):
        """Test dashboard statistics endpoint"""
        response = client.get('/api/v1/analytics/dashboard/stats', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'revenue' in data or 'transactions' in data
    
    def test_get_system_performance(self, client, auth_headers):
        """Test system performance endpoint"""
        response = client.get('/api/v1/analytics/system/performance', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'timestamp' in data
    
    def test_get_data_quality(self, client, auth_headers):
        """Test data quality endpoint"""
        response = client.get('/api/v1/analytics/data/quality', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'completeness' in data or 'accuracy' in data

class TestPerformanceEndpoints:
    """Test performance monitoring endpoints"""
    
    def test_get_performance_metrics(self, client, auth_headers):
        """Test performance metrics endpoint"""
        response = client.get('/api/v1/performance/metrics', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'system' in data
        assert 'cache' in data
    
    def test_get_cache_stats(self, client, auth_headers):
        """Test cache statistics endpoint"""
        response = client.get('/api/v1/performance/cache/stats', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'redis_available' in data
    
    def test_clear_cache(self, client, auth_headers):
        """Test cache clear endpoint"""
        response = client.post('/api/v1/performance/cache/clear', 
                             headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'message' in data
    
    def test_get_health_status(self, client, auth_headers):
        """Test health status endpoint"""
        response = client.get('/api/v1/performance/health', 
                            headers=auth_headers)
        assert response.status_code in [200, 503]  # Can be healthy or degraded
        
        data = json.loads(response.data)
        assert 'status' in data
        assert 'timestamp' in data

class TestRealtimeAnalyticsEndpoints:
    """Test real-time analytics endpoints"""
    
    def test_get_realtime_metrics(self, client, auth_headers):
        """Test real-time metrics endpoint"""
        response = client.get('/api/v1/realtime/metrics', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'timestamp' in data
    
    def test_get_realtime_dashboard(self, client, auth_headers):
        """Test real-time dashboard endpoint"""
        response = client.get('/api/v1/realtime/dashboard', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'summary' in data
        assert 'charts' in data
    
    def test_get_revenue_stream(self, client, auth_headers):
        """Test revenue stream endpoint"""
        response = client.get('/api/v1/realtime/revenue/stream', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'revenue_stream' in data
        assert 'hours' in data
    
    def test_get_alerts(self, client, auth_headers):
        """Test alerts endpoint"""
        response = client.get('/api/v1/realtime/alerts', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'alerts' in data
        assert 'count' in data

class TestDocumentationEndpoints:
    """Test API documentation endpoints"""
    
    def test_get_api_documentation(self, client):
        """Test main API documentation endpoint"""
        response = client.get('/api/v1/docs/')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'title' in data
        assert 'version' in data
        assert 'endpoints' in data
    
    def test_get_transactions_docs(self, client):
        """Test transactions documentation endpoint"""
        response = client.get('/api/v1/docs/transactions')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'endpoint' in data
        assert 'methods' in data
    
    def test_get_analytics_docs(self, client):
        """Test analytics documentation endpoint"""
        response = client.get('/api/v1/docs/analytics')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'endpoint' in data
        assert 'endpoints' in data
    
    def test_get_openapi_spec(self, client):
        """Test OpenAPI specification endpoint"""
        response = client.get('/api/v1/docs/openapi')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'openapi' in data
        assert 'info' in data
        assert 'paths' in data

class TestErrorHandling:
    """Test error handling and edge cases"""
    
    def test_invalid_endpoint(self, client):
        """Test invalid endpoint returns 404"""
        response = client.get('/api/v1/invalid-endpoint')
        assert response.status_code == 404
    
    def test_invalid_json(self, client, auth_headers):
        """Test invalid JSON in request body"""
        response = client.post('/api/v1/transactions/', 
                             data='invalid json',
                             headers=auth_headers)
        assert response.status_code == 400
    
    def test_missing_required_fields(self, client, auth_headers):
        """Test missing required fields in transaction creation"""
        response = client.post('/api/v1/transactions/', 
                             json={'amount': 1000.00},  # Missing required fields
                             headers=auth_headers)
        assert response.status_code == 400
    
    def test_invalid_date_format(self, client, auth_headers):
        """Test invalid date format"""
        response = client.post('/api/v1/transactions/', 
                             json={
                                 'amount': 1000.00,
                                 'currency': 'TRY',
                                 'psp': 'SİPAY',
                                 'client_name': 'Test',
                                 'date': 'invalid-date'
                             },
                             headers=auth_headers)
        assert response.status_code == 400

class TestCaching:
    """Test caching functionality"""
    
    def test_psp_summary_caching(self, client, auth_headers):
        """Test that PSP summary stats are cached"""
        # First request
        response1 = client.get('/api/v1/transactions/psp_summary_stats', 
                             headers=auth_headers)
        assert response1.status_code == 200
        
        # Second request should be faster (cached)
        response2 = client.get('/api/v1/transactions/psp_summary_stats', 
                             headers=auth_headers)
        assert response2.status_code == 200
        
        # Both responses should be identical
        data1 = json.loads(response1.data)
        data2 = json.loads(response2.data)
        assert data1 == data2

class TestPagination:
    """Test pagination functionality"""
    
    def test_transaction_pagination(self, client, auth_headers):
        """Test transaction pagination"""
        # Create multiple test transactions
        for i in range(25):
            transaction = Transaction(
                amount=1000.00 + i,
                currency='TRY',
                psp='SİPAY',
                client_name=f'Client {i}',
                date=datetime.now().date()
            )
            db.session.add(transaction)
        db.session.commit()
        
        # Test first page
        response = client.get('/api/v1/transactions/?page=1&per_page=10', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'pagination' in data
        assert data['pagination']['page'] == 1
        assert data['pagination']['per_page'] == 10
        assert len(data['transactions']) == 10
        
        # Test second page
        response = client.get('/api/v1/transactions/?page=2&per_page=10', 
                            headers=auth_headers)
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert data['pagination']['page'] == 2
        assert len(data['transactions']) == 10

if __name__ == '__main__':
    pytest.main([__file__])
