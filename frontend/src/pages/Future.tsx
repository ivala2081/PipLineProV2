import React, { useState } from 'react';
import ChatGPTInterface from '../components/modern/ChatGPTInterface';
import { CHATGPT_CONFIG } from '../config/chatgpt';
import { 
  Bot, 
  BarChart3, 
  Zap, 
  Shield, 
  Globe, 
  TrendingUp,
  MessageSquare,
  Settings,
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  Activity,
  Target,
  Brain,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Lightbulb,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import './Future.css';

const Future: React.FC = () => {
  const [activeTab, setActiveTab] = useState('assistant');
  const [isPaused, setIsPaused] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const strategyInsights = [
    {
      id: 'monday-analysis',
      title: 'Monday Performance Analysis',
      description: 'Monday\'s are the worst day with 80% lower revenue',
      icon: Calendar,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      recommendation: 'Implement Monday Motivation campaigns with special offers and incentives to boost engagement',
      impact: 'High',
      priority: 'Urgent',
      trend: 'down'
    },
    {
      id: 'peak-hours',
      title: 'Peak Hours Optimization',
      description: 'Revenue spikes between 2-4 PM on weekdays',
      icon: Clock,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      recommendation: 'Increase marketing efforts and staff during peak hours to maximize revenue potential',
      impact: 'High',
      priority: 'High',
      trend: 'up'
    },
    {
      id: 'weekend-opportunity',
      title: 'Weekend Revenue Opportunity',
      description: 'Weekends show 40% higher conversion rates',
      icon: TrendingUp,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      recommendation: 'Expand weekend operations and launch weekend-specific promotions to capitalize on higher conversion rates',
      impact: 'Medium',
      priority: 'Medium',
      trend: 'up'
    },
    {
      id: 'psp-performance',
      title: 'PSP Performance Insights',
      description: 'CRYPPAY shows 25% higher success rates than others',
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      recommendation: 'Prioritize CRYPPAY for high-value transactions and consider negotiating better rates',
      impact: 'High',
      priority: 'High',
      trend: 'up'
    }
  ];

  const quickActions = [
    { id: 'boost-monday', title: 'Boost Monday Revenue', icon: TrendingUp, description: 'Implement Monday-specific strategies' },
    { id: 'optimize-peak', title: 'Optimize Peak Hours', icon: Clock, description: 'Maximize revenue during peak times' },
    { id: 'weekend-expansion', title: 'Weekend Expansion', icon: Calendar, description: 'Capitalize on weekend opportunities' },
    { id: 'psp-optimization', title: 'PSP Optimization', icon: DollarSign, description: 'Optimize payment processor performance' }
  ];

  // Handler functions
  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsPaused(false);
    setSelectedStrategy(null);
    setSelectedAction(null);
  };

  const handleStrategyClick = (strategyId: string) => {
    setSelectedStrategy(selectedStrategy === strategyId ? null : strategyId);
  };

  const handleActionClick = (actionId: string) => {
    setSelectedAction(selectedAction === actionId ? null : actionId);
    // Here you would typically trigger the actual action
    console.log(`Executing action: ${actionId}`);
  };

  const handleImplementStrategy = async (strategyId: string) => {
    try {
      const response = await fetch('/api/strategy/implement', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('meta[name=csrf-token]')?.getAttribute('content') || ''
        },
        body: JSON.stringify({
          strategy_id: strategyId,
          user_id: 1 // You might want to get this from user context
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Show success message
        alert(`✅ ${result.message}`);
        console.log('Strategy implementation details:', result.details);
        
        // Optionally refresh strategy status
        // You could call getStrategyStatus() here if needed
      } else {
        alert(`❌ ${result.message}`);
      }
    } catch (error) {
      console.error('Error implementing strategy:', error);
      alert('❌ Failed to implement strategy. Please try again.');
    }
  };

  return (
    <div className="future-page business-container">
      {/* Header Section */}
      <div className="future-header">
        <div className="header-content">
          <div className="header-badge">
            <Bot className="w-4 h-4" />
            <span>AI Assistant</span>
          </div>
          <h1 className="header-title">Intelligent Business Solutions</h1>
          <p className="header-description">
            Leverage advanced AI capabilities to optimize your business operations, 
            analyze data patterns, and make informed decisions.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="future-content">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="assistant" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </TabsTrigger>
            <TabsTrigger value="strategy" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Strategy
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assistant" className="space-y-6">
            {/* AI Chat Interface */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">AI Business Assistant</CardTitle>
                      <CardDescription>Ask questions and get intelligent insights about your business</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handlePauseToggle}
                      className={isPaused ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : ''}
                    >
                      {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="chat-container">
                  <ChatGPTInterface 
                    apiKey={CHATGPT_CONFIG.API_KEY}
                    className="future-chat-interface"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            {/* Real-time Strategy Analysis */}
            <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Real-time Revenue Strategy</CardTitle>
                    <CardDescription>AI-powered insights to boost your revenue with actionable recommendations</CardDescription>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Strategy Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {strategyInsights.map((insight) => {
                const Icon = insight.icon;
                return (
                  <Card 
                    key={insight.id} 
                    className={`hover:shadow-md transition-all cursor-pointer group strategy-insight-card ${
                      selectedStrategy === insight.id 
                        ? 'ring-2 ring-primary-500 bg-primary-50 selected' 
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => handleStrategyClick(insight.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 ${insight.bgColor} rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform ${
                          selectedStrategy === insight.id ? 'scale-105' : ''
                        }`}>
                          <Icon className={`w-6 h-6 ${insight.color}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{insight.title}</h3>
                            <Badge 
                              variant={insight.priority === 'Urgent' ? 'destructive' : insight.priority === 'High' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {insight.priority}
                            </Badge>
                            {insight.trend === 'up' ? (
                              <ArrowUp className="w-4 h-4 text-green-600" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-red-600" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{insight.description}</p>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-medium text-gray-500">Impact:</span>
                            <Badge variant="outline" className="text-xs">
                              {insight.impact}
                            </Badge>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-0 h-auto text-primary-600 hover:text-primary-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStrategyClick(insight.id);
                            }}
                          >
                            {selectedStrategy === insight.id ? 'Hide strategy' : 'View strategy'} 
                            <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${
                              selectedStrategy === insight.id ? 'rotate-90' : ''
                            }`} />
                          </Button>
                        </div>
                      </div>
                      {selectedStrategy === insight.id && (
                        <div className="mt-4 p-6 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 shadow-lg strategy-detail-view">
                          <div className="flex items-start gap-3 mb-4">
                            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Lightbulb className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900 text-lg">Revenue Boost Strategy</h4>
                              <p className="text-sm text-gray-600">Detailed implementation plan</p>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                              <h5 className="font-medium text-blue-900 mb-2">Strategy Recommendation</h5>
                              <p className="text-sm text-blue-800">{insight.recommendation}</p>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="p-3 bg-green-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="font-medium text-green-900">Expected Impact</span>
                                </div>
                                <p className="text-sm text-green-700">
                                  {insight.impact === 'High' ? 'Significant revenue increase expected' : 
                                   insight.impact === 'Medium' ? 'Moderate revenue improvement' : 
                                   'Minor revenue boost'}
                                </p>
                              </div>
                              
                              <div className="p-3 bg-orange-50 rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <Clock className="w-4 h-4 text-orange-600" />
                                  <span className="font-medium text-orange-900">Priority Level</span>
                                </div>
                                <p className="text-sm text-orange-700">
                                  {insight.priority === 'Urgent' ? 'Immediate action required' : 
                                   insight.priority === 'High' ? 'Should be addressed soon' : 
                                   'Can be planned for later'}
                                </p>
                              </div>
                            </div>
                            
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <h5 className="font-medium text-gray-900 mb-2">Implementation Steps</h5>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {insight.id === 'monday-analysis' && (
                                  <>
                                    <li>• Create Monday-specific promotional campaigns</li>
                                    <li>• Offer special discounts or incentives for Monday transactions</li>
                                    <li>• Send targeted marketing emails on Sunday evenings</li>
                                    <li>• Implement "Monday Motivation" messaging in your app</li>
                                  </>
                                )}
                                {insight.id === 'peak-hours' && (
                                  <>
                                    <li>• Increase staff availability during 2-4 PM window</li>
                                    <li>• Boost marketing spend during peak hours</li>
                                    <li>• Optimize server capacity for high-traffic periods</li>
                                    <li>• Create time-sensitive offers for peak hours</li>
                                  </>
                                )}
                                {insight.id === 'weekend-opportunity' && (
                                  <>
                                    <li>• Launch weekend-specific product promotions</li>
                                    <li>• Extend customer support hours on weekends</li>
                                    <li>• Create weekend-themed marketing campaigns</li>
                                    <li>• Offer weekend-only special features or services</li>
                                  </>
                                )}
                                {insight.id === 'psp-performance' && (
                                  <>
                                    <li>• Route high-value transactions through CRYPPAY</li>
                                    <li>• Negotiate better rates with CRYPPAY</li>
                                    <li>• Analyze CRYPPAY's success factors</li>
                                    <li>• Apply CRYPPAY's best practices to other PSPs</li>
                                  </>
                                )}
                              </ul>
                            </div>
                            
                            <div className="flex items-center justify-between pt-2">
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-green-600" />
                                  Revenue Optimization
                                </span>
                                <span className="flex items-center gap-1">
                                  <Target className="w-3 h-3 text-blue-600" />
                                  Strategic Focus
                                </span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleImplementStrategy(insight.id);
                                }}
                                className="text-xs"
                              >
                                Implement Strategy
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Revenue Boost Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Revenue Boost Actions</CardTitle>
                <CardDescription>Quick actions to implement revenue optimization strategies</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Button
                        key={action.id}
                        variant="outline"
                        className={`h-auto p-4 flex flex-col items-center gap-3 hover:bg-gray-50 transition-all ${
                          selectedAction === action.id 
                            ? 'bg-primary-50 border-primary-300 text-primary-700' 
                            : ''
                        }`}
                        onClick={() => handleActionClick(action.id)}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                          selectedAction === action.id 
                            ? 'bg-primary-200' 
                            : 'bg-primary-100'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            selectedAction === action.id 
                              ? 'text-primary-700' 
                              : 'text-primary-600'
                          }`} />
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-sm">{action.title}</div>
                          <div className="text-xs text-gray-500 mt-1">{action.description}</div>
                        </div>
                        {selectedAction === action.id && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Status Indicators */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isPaused ? 'bg-yellow-100' : 'bg-green-100'
                    }`}>
                      <Activity className={`w-4 h-4 ${
                        isPaused ? 'text-yellow-600' : 'text-green-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-sm">AI Status</div>
                      <div className={`text-xs ${
                        isPaused ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {isPaused ? 'Paused' : 'Online & Ready'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Data Processing</div>
                      <div className="text-xs text-blue-600">
                        {isPaused ? 'Paused' : 'Real-time Analysis'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Shield className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm">Security</div>
                      <div className="text-xs text-purple-600">Protected & Secure</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Action Feedback */}
            {selectedAction && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-green-800">
                        Action Executed: {quickActions.find(a => a.id === selectedAction)?.title}
                      </div>
                      <div className="text-xs text-green-600">
                        Your request has been processed successfully
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Future;