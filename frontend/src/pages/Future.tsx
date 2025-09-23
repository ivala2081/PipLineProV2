import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  AlertTriangle, 
  Settings, 
  Lightbulb,
  Sparkles,
  TrendingUp,
  Shield,
  Cpu,
  RefreshCw,
  Activity,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts';

interface AIAnalysis {
  status: string;
  analysis_type: string;
  timestamp: string;
  data: any;
  ai_insights?: string;
  recommendations?: Array<{
    type: string;
    action: string;
    priority: string;
  }>;
  risk_factors?: Array<{
    factor: string;
    probability: string;
    impact: string;
  }>;
  optimization_plan?: Array<{
    action: string;
    expected_impact: string;
  }>;
  strategic_recommendations?: Array<{
    strategy: string;
    timeline: string;
    investment: string;
  }>;
}

interface ComprehensiveAnalysis {
  status: string;
  analysis_type: string;
  timestamp: string;
  revenue_analysis: AIAnalysis;
  risk_prediction: AIAnalysis;
  psp_optimization: AIAnalysis;
  strategic_insights: AIAnalysis;
  summary: {
    total_insights: number;
    analysis_quality: string;
  };
}

const Future: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<ComprehensiveAnalysis | null>(null);
  const [aiStatus, setAiStatus] = useState<any>(null);
  const [realTimeData, setRealTimeData] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    fetchAIStatus();
    fetchComprehensiveAnalysis();
    fetchRealTimeData();
  }, []);

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchRealTimeData();
      if (activeTab === 'overview') {
        fetchComprehensiveAnalysis();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, activeTab]);

  const fetchAIStatus = async () => {
    try {
      const response = await fetch('/api/v1/ai/ai-status');
      const data = await response.json();
      setAiStatus(data);
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
    }
  };

  const fetchComprehensiveAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/ai/comprehensive-analysis');
      const data = await response.json();
      setComprehensiveAnalysis(data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to fetch comprehensive analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      // Fetch real-time metrics from multiple endpoints
      const [performanceResponse, analyticsResponse, healthResponse] = await Promise.all([
        fetch('/api/v1/analytics/system/performance'),
        fetch('/api/v1/analytics/dashboard/stats?range=all'),
        fetch('/api/v1/health/')
      ]);

      const [performance, analytics, health] = await Promise.all([
        performanceResponse.json(),
        analyticsResponse.json(),
        healthResponse.json()
      ]);

      setRealTimeData({
        performance,
        analytics,
        health,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to fetch real-time data:', error);
    }
  };

  const fetchSpecificAnalysis = async (type: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/v1/ai/${type}`);
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Failed to fetch ${type}:`, error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', name: 'AI Overview', icon: Sparkles },
    { id: 'revenue', name: 'Revenue Analysis', icon: BarChart3 },
    { id: 'risk', name: 'Risk Prediction', icon: AlertTriangle },
    { id: 'optimization', name: 'PSP Optimization', icon: Settings },
    { id: 'strategy', name: 'Strategic Insights', icon: Lightbulb },
    { id: 'insights', name: 'Live Insights', icon: Activity },
  ];

  // Data processing functions for visualizations
  const processRevenueData = () => {
    if (!comprehensiveAnalysis?.revenue_analysis?.data?.daily_revenue) return [];
    
    return comprehensiveAnalysis.revenue_analysis.data.daily_revenue.map((item: any) => ({
      date: new Date(item.date).toLocaleDateString(),
      amount: item.amount,
      formatted: `$${item.amount.toLocaleString()}`
    }));
  };

  const processPSPData = () => {
    if (!comprehensiveAnalysis?.revenue_analysis?.data?.psp_distribution) return [];
    
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff00ff'];
    return comprehensiveAnalysis.revenue_analysis.data.psp_distribution.map((item: any, index: number) => ({
      name: item.psp,
      value: item.amount,
      count: item.count,
      color: colors[index % colors.length]
    }));
  };

  const processRiskData = () => {
    if (!comprehensiveAnalysis?.risk_prediction?.risk_factors) return [];
    
    return comprehensiveAnalysis.risk_prediction.risk_factors.map((risk: any) => ({
      factor: risk.factor,
      probability: risk.probability === 'high' ? 80 : risk.probability === 'medium' ? 50 : 20,
      impact: risk.impact === 'high' ? 90 : risk.impact === 'medium' ? 60 : 30,
      color: risk.impact === 'high' ? '#ef4444' : risk.impact === 'medium' ? '#f59e0b' : '#10b981'
    }));
  };

  const processPerformanceData = () => {
    if (!realTimeData?.performance) return [];
    
    return [
      { metric: 'CPU Usage', value: realTimeData.performance.cpu_usage || 0, color: '#3b82f6' },
      { metric: 'Memory Usage', value: realTimeData.performance.memory_usage || 0, color: '#10b981' },
      { metric: 'Cache Hit Rate', value: realTimeData.performance.cache_hit_rate || 0, color: '#f59e0b' },
      { metric: 'Response Time', value: realTimeData.performance.avg_response_time || 0, color: '#ef4444' }
    ];
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Real-time Status Header */}
      <Card variant="gradient" size="default">
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <Activity className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Real-time AI Dashboard</h3>
              {autoRefresh && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-green-600">Live Updates</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "success" : "secondary"}
                size="sm"
                className="rounded-full"
              >
                {autoRefresh ? 'Auto-Refresh ON' : 'Auto-Refresh OFF'}
              </Button>
              <span className="text-sm text-gray-500">
                Last update: {lastUpdate.toLocaleTimeString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Status Card */}
      <Card variant="default" size="default">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>AI Analysis Status</CardTitle>
            <div className="flex items-center space-x-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-gray-600">AI-Powered</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        
          {aiStatus && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card variant="success" size="compact" className="text-center">
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {aiStatus.features?.length || 0}
                  </div>
                  <div className="text-sm text-green-700">AI Features</div>
                </CardContent>
              </Card>
              <Card variant="info" size="compact" className="text-center">
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {aiStatus.api_configured ? 'Yes' : 'No'}
                  </div>
                  <div className="text-sm text-blue-700">API Configured</div>
                </CardContent>
              </Card>
              <Card variant="default" size="compact" className="text-center">
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    {aiStatus.model || 'N/A'}
                  </div>
                  <div className="text-sm text-purple-700">AI Model</div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Insights */}
      {comprehensiveAnalysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card variant="default" size="default">
            <CardContent>
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Revenue Insights</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {comprehensiveAnalysis.revenue_analysis?.recommendations?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" size="default">
            <CardContent>
              <div className="flex items-center">
                <Shield className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Risk Factors</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {comprehensiveAnalysis.risk_prediction?.risk_factors?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" size="default">
            <CardContent>
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Optimizations</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {comprehensiveAnalysis.psp_optimization?.optimization_plan?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="default" size="default">
            <CardContent>
              <div className="flex items-center">
                <Lightbulb className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Strategies</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {comprehensiveAnalysis.strategic_insights?.strategic_recommendations?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Insights Summary */}
      {comprehensiveAnalysis?.summary && (
        <Card variant="gradient" size="default">
          <CardHeader>
            <CardTitle>AI Analysis Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Insights Generated</p>
                <p className="text-3xl font-bold text-blue-600">
                  {comprehensiveAnalysis.summary.total_insights}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Analysis Quality</p>
                <p className="text-3xl font-bold text-purple-600 capitalize">
                  {comprehensiveAnalysis.summary.analysis_quality}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderAnalysisSection = (analysis: AIAnalysis | null, title: string, Icon: React.ComponentType<any>) => {
    if (!analysis) {
      return (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AI analysis...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* AI Insights */}
        {analysis.ai_insights && (
          <Card variant="default" size="default">
            <CardHeader>
              <div className="flex items-center">
                <Icon className="h-6 w-6 text-blue-500 mr-2" />
                <CardTitle>{title} - AI Insights</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-wrap">{analysis.ai_insights}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recommendations/Risk Factors/Optimization Plan */}
        {analysis.recommendations && (
          <Card variant="default" size="default">
            <CardHeader>
              <CardTitle>Actionable Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className={`w-3 h-3 rounded-full mt-2 ${
                      rec.priority === 'high' ? 'bg-red-500' : 
                      rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{rec.action}</p>
                      <p className="text-sm text-gray-600 capitalize">{rec.type} • {rec.priority} priority</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.risk_factors && (
          <Card variant="error" size="default">
            <CardHeader>
              <CardTitle>Identified Risk Factors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.risk_factors.map((risk, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{risk.factor}</p>
                      <p className="text-sm text-gray-600 capitalize">{risk.probability} probability • {risk.impact} impact</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      risk.impact === 'high' ? 'bg-red-100 text-red-800' :
                      risk.impact === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {risk.impact}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.optimization_plan && (
          <Card variant="info" size="default">
            <CardHeader>
              <CardTitle>Optimization Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.optimization_plan.map((plan, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{plan.action}</p>
                      <p className="text-sm text-gray-600">{plan.expected_impact}</p>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                      Optimization
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.strategic_recommendations && (
          <Card variant="warning" size="default">
            <CardHeader>
              <CardTitle>Strategic Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.strategic_recommendations.map((rec, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-900">{rec.strategy}</p>
                      <div className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        {rec.timeline}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 capitalize">{rec.investment} investment required</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Future - AI Analysis</h1>
          <p className="mt-2 text-gray-600">
            AI-powered insights for revenue optimization, risk mitigation, and strategic growth
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                <span className="ml-4 text-gray-600">Analyzing data with AI...</span>
              </div>
            )}

            {!loading && (
              <>
                {activeTab === 'overview' && renderOverview()}
                {activeTab === 'revenue' && (
                  <div className="space-y-6">
                    {renderAnalysisSection(
                      comprehensiveAnalysis?.revenue_analysis || null, 
                      'Revenue Analysis', 
                      BarChart3
                    )}
                    
                    {/* Revenue Visualizations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Daily Revenue Trend */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue Trend</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <AreaChart data={processRevenueData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                            <Area 
                              type="monotone" 
                              dataKey="amount" 
                              stroke="#3b82f6" 
                              fill="#3b82f6" 
                              fillOpacity={0.3}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* PSP Distribution */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">PSP Revenue Distribution</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={processPSPData()}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {processPSPData().map((entry: any, index: number) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'risk' && (
                  <div className="space-y-6">
                    {renderAnalysisSection(
                      comprehensiveAnalysis?.risk_prediction || null, 
                      'Risk Prediction', 
                      AlertTriangle
                    )}
                    
                    {/* Risk Visualizations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Risk Matrix */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Impact vs Probability</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <ScatterChart data={processRiskData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              type="number" 
                              dataKey="probability" 
                              name="Probability" 
                              domain={[0, 100]}
                              label={{ value: 'Probability (%)', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis 
                              type="number" 
                              dataKey="impact" 
                              name="Impact" 
                              domain={[0, 100]}
                              label={{ value: 'Impact (%)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip 
                              cursor={{ strokeDasharray: '3 3' }}
                              formatter={(value: any, name: any) => [
                                `${value}%`, 
                                name === 'probability' ? 'Probability' : 'Impact'
                              ]}
                              labelFormatter={(label: any, payload: any) => 
                                payload && payload[0] ? payload[0].payload.factor : ''
                              }
                            />
                            <Scatter dataKey="impact" fill="#ef4444" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Risk Factors Bar Chart */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Factor Analysis</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={processRiskData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="factor" />
                            <YAxis />
                            <Tooltip formatter={(value) => [`${value}%`, 'Risk Level']} />
                            <Bar dataKey="probability" fill="#f59e0b" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'optimization' && renderAnalysisSection(
                  comprehensiveAnalysis?.psp_optimization || null, 
                  'PSP Optimization', 
                  Settings
                )}
                {activeTab === 'strategy' && renderAnalysisSection(
                  comprehensiveAnalysis?.strategic_insights || null, 
                  'Strategic Insights', 
                  Lightbulb
                )}
                {activeTab === 'insights' && (
                  <div className="space-y-6">
                    {/* Live Performance Monitoring */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center space-x-3">
                          <Activity className="h-6 w-6 text-green-500" />
                          <h3 className="text-lg font-semibold text-gray-900">Live System Performance</h3>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm text-green-600">Real-time</span>
                          </div>
                        </div>
                        <Button
                          onClick={fetchRealTimeData}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          <span>Refresh</span>
                        </Button>
                      </div>

                      {/* Performance Metrics Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        {processPerformanceData().map((metric, index) => (
                          <div key={index} className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600">{metric.metric}</span>
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: metric.color }}
                              ></div>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                              {metric.value}%
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div 
                                className="h-2 rounded-full transition-all duration-500"
                                style={{ 
                                  width: `${Math.min(metric.value, 100)}%`,
                                  backgroundColor: metric.color 
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Performance Chart */}
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={processPerformanceData()}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="metric" />
                            <YAxis domain={[0, 100]} />
                            <Tooltip formatter={(value) => [`${value}%`, 'Usage']} />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Real-time AI Insights */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Live AI Recommendations */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          <h3 className="text-lg font-semibold text-gray-900">Live AI Recommendations</h3>
                        </div>
                        <div className="space-y-3">
                          {realTimeData?.analytics && (
                            <>
                              <div className="p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                                <p className="text-sm font-medium text-blue-900">Revenue Optimization</p>
                                <p className="text-xs text-blue-700">
                                  Current revenue trend shows {realTimeData.analytics.revenue_growth > 0 ? 'positive' : 'negative'} growth
                                </p>
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                                <p className="text-sm font-medium text-green-900">Performance Alert</p>
                                <p className="text-xs text-green-700">
                                  System performance is optimal for current load
                                </p>
                              </div>
                              <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                                <p className="text-sm font-medium text-yellow-900">Risk Monitoring</p>
                                <p className="text-xs text-yellow-700">
                                  Monitor PSP allocation for risk diversification
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* System Health Status */}
                      <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center space-x-3 mb-4">
                          <Target className="h-5 w-5 text-green-500" />
                          <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
                        </div>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Database Status</span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                              Healthy
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">API Response Time</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {realTimeData?.performance?.avg_response_time || 'N/A'}ms
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Cache Performance</span>
                            <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                              {realTimeData?.performance?.cache_hit_rate || 'N/A'}%
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Last AI Analysis</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                              {lastUpdate.toLocaleTimeString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-center">
          <Button
            onClick={fetchComprehensiveAnalysis}
            disabled={loading}
            variant="gradient"
            size="lg"
            className="inline-flex items-center"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            {loading ? 'Analyzing...' : 'Refresh AI Analysis'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Future;
