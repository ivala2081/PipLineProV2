import axios from 'axios';

export const testBackendConnection = async () => {
  try {
    console.log('🧪 Testing backend connection...');
    
    // Test health endpoint
    const healthResponse = await axios.get('/api/v1/health/');
    console.log('✅ Health check:', healthResponse.data);
    
    // Test auth check endpoint
    const authResponse = await axios.get('/api/v1/auth/check');
    console.log('✅ Auth check:', authResponse.data);
    
    // Test analytics dashboard stats
    const dashboardResponse = await axios.get('/api/v1/analytics/dashboard/stats');
    console.log('✅ Dashboard stats:', dashboardResponse.data);
    
    return {
      status: 'success',
      message: 'All API endpoints are working correctly',
      endpoints: {
        health: healthResponse.status,
        auth: authResponse.status,
        dashboard: dashboardResponse.status
      }
    };
    
  } catch (error: any) {
    console.error('❌ API test failed:', error);
    return {
      status: 'error',
      message: error.message,
      details: error.response?.data || 'No response data'
    };
  }
};

// Auto-run test when this module is imported
if (typeof window !== 'undefined') {
  testBackendConnection().then(result => {
    console.log('🔍 Backend connection test result:', result);
  });
}
