/**
 * Dashboard API Service
 * Handles all dashboard-related API calls to the backend
 */

export interface DashboardStats {
  total_revenue: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
  total_transactions: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
  active_clients: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
  growth_rate: {
    value: string;
    change: string;
    changeType: 'positive' | 'negative';
  };
}

export interface RecentTransaction {
  id: number;
  client_name: string;
  amount: number;
  currency: string;
  date: string;
  status: string;
  created_at: string;
}

export interface DashboardSummary {
  total_revenue: number;
  total_commission: number;
  total_net: number;
  transaction_count: number;
  active_clients: number;
  growth_rate: number;
}

export interface ChartData {
  daily_revenue: Array<{
    date: string;
    amount: number;
  }>;
  client_distribution: Array<{
    name: string;
    value: number;
  }>;
}

export interface ClientSegment {
  client_name: string;
  transaction_count: number;
  total_volume: number;
  avg_transaction: number;
  last_transaction: string;
  volume_percentage: number;
  segment: 'VIP' | 'Premium' | 'Regular' | 'Standard';
}

export interface ClientAnalytics {
  client_analytics: ClientSegment[];
  segment_distribution: {
    [key: string]: {
      count: number;
      volume: number;
      percentage: number;
    };
  };
  metrics: {
    total_clients: number;
    total_volume: number;
    avg_volume_per_client: number;
    top_client_volume: number;
  };
}

export interface DashboardData {
  stats: DashboardStats;
  recent_transactions: RecentTransaction[];
  summary: DashboardSummary;
  chart_data: ChartData;
}

export interface SystemPerformance {
  api_response_time: number;
  database_response_time: number;
  uptime_percentage: number;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  system_health: string;
}

export interface DataQuality {
  overall_quality_score: number;
  client_completeness: number;
  amount_completeness: number;
  date_completeness: number;
  potential_duplicates: number;
  total_records: number;
  data_freshness: string;
  validation_status: string;
}

export interface SecurityMetrics {
  failed_logins: {
    today: number;
    this_week: number;
    this_month: number;
    trend: string;
  };
  suspicious_activities: {
    total_alerts: number;
    high_priority: number;
    medium_priority: number;
    low_priority: number;
    last_alert: string;
  };
  session_management: {
    active_sessions: number;
    expired_sessions: number;
    average_session_duration: string;
  };
  access_patterns: {
    normal_access: number;
    unusual_access: number;
    last_analysis: string;
  };
  security_incidents: {
    total_incidents: number;
    resolved_incidents: number;
    open_incidents: number;
  };
}

class DashboardService {
  private baseUrl = '/api/v1';

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(timeRange: string = 'all'): Promise<DashboardData> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/dashboard/stats?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   */
  async getSystemPerformance(): Promise<SystemPerformance> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/system/performance`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching system performance:', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics
   */
  async getDataQuality(): Promise<DataQuality> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/data/quality`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching data quality:', error);
      throw error;
    }
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/security/metrics`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching security metrics:', error);
      throw error;
    }
  }

  /**
   * Get consolidated dashboard data (all metrics in one call)
   */
  async getConsolidatedDashboard(timeRange: string = 'all'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/consolidated-dashboard?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching consolidated dashboard:', error);
      throw error;
    }
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrends(timeRange: string = 'all'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/revenue/trends?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching revenue trends:', error);
      throw error;
    }
  }

  /**
   * Get top performers
   */
  async getTopPerformers(timeRange: string = 'all'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/top-performers?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching top performers:', error);
      throw error;
    }
  }


  /**
   * Get commission analytics
   */
  async getCommissionAnalytics(timeRange: string = 'all'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/commission/analytics?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching commission analytics:', error);
      throw error;
    }
  }

  /**
   * Get current exchange rates
   */
  async getExchangeRates(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/exchange-rates/rates`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      throw error;
    }
  }

  /**
   * Get transaction volume analysis
   */
  async getTransactionVolumeAnalysis(timeRange: string = 'all'): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/transactions/volume-analysis?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching transaction volume analysis:', error);
      throw error;
    }
  }

  /**
   * Get client analytics and segmentation
   */
  async getClientAnalytics(timeRange: string = 'all'): Promise<ClientAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/clients/analytics?range=${timeRange}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error fetching client analytics:', error);
      throw error;
    }
  }

  /**
   * Get PSP rollover summary
   */
  async getPspRolloverSummary(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/psp-rollover-summary`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching PSP rollover summary:', error);
      throw error;
    }
  }

  /**
   * Refresh dashboard data
   */
  async refreshDashboard(timeRange: string = 'all'): Promise<DashboardData> {
    // Clear any cached data and fetch fresh
    return this.getDashboardStats(timeRange);
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
export default dashboardService;
