import { useCallback } from 'react';
import { api } from '../utils/apiClient';

interface PSPData {
  psp: string;
  total_amount: number;
  total_commission: number;
  total_net: number;
  transaction_count: number;
  commission_rate: number;
}

export const usePSPRefresh = () => {
  const refreshPSPData = useCallback(async (): Promise<PSPData[]> => {
    try {
      console.log('🔄 Starting PSP data refresh...');
      
      // Clear PSP cache first
      api.clearPSPCache();
      
      // Force refresh by disabling cache
      const response = await api.get('/api/v1/transactions/psp_summary_stats', {}, false);
      console.log('📡 PSP API response:', response);
      
      if (response.ok) {
        const pspData = await api.parseResponse(response);
        console.log('✅ PSP data refreshed successfully:', pspData);
        return pspData;
      } else {
        console.error('❌ PSP API response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch PSP data');
      }
    } catch (error) {
      console.error('❌ Error refreshing PSP data:', error);
      throw error;
    }
  }, []);

  const refreshPSPDataSilent = useCallback(async (): Promise<void> => {
    try {
      await refreshPSPData();
    } catch (error) {
      console.warn('Silent PSP refresh failed:', error);
      // Don't throw error for silent refresh
    }
  }, [refreshPSPData]);

  return {
    refreshPSPData,
    refreshPSPDataSilent,
  };
};
