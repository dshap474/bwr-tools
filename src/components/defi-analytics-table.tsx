'use client';

import React, { useState, useEffect } from 'react';
import { DeFiAnalyticsService } from '../lib/services/defi-analytics-service';
import { CoinGeckoAPI } from '../lib/api-wrappers/coingecko-api-wrapper';
import { DeFiLlamaAPI } from '../lib/api-wrappers/defillama-api-wrapper';
import type { CombinedProtocolData } from '../lib/api-wrappers/coingecko-api-wrapper';

interface DeFiAnalyticsResult {
  protocols: CombinedProtocolData[];
  metadata: {
    total_protocols: number;
    successful_mappings: number;
    mapping_success_rate: number;
    total_revenue: number;
    total_market_cap: number;
    generated_at: string;
  };
  failed_mappings: Array<{
    protocol: string;
    revenue: number;
    variations_tried: string[];
  }>;
}

interface LoadingState {
  phase: 'idle' | 'loading_revenue' | 'mapping_protocols' | 'fetching_market_caps' | 'complete' | 'error';
  percentage: number;
  current_protocol?: string;
  protocols_mapped?: number;
  total_protocols?: number;
  error?: string;
}

export default function DeFiAnalyticsTable() {
  const [data, setData] = useState<DeFiAnalyticsResult | null>(null);
  const [loading, setLoading] = useState<LoadingState>({ phase: 'idle', percentage: 0 });
  const [service] = useState(() => {
    // Ensure the API key is available in the browser environment
    const coinGeckoAPI = new CoinGeckoAPI({
      apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-9qjCJZMPjyJPJF7iw3hbhAkm'
    });
    const defiLlamaAPI = new DeFiLlamaAPI();
    return new DeFiAnalyticsService(defiLlamaAPI, coinGeckoAPI);
  });

  const loadAnalytics = async () => {
    try {
      setLoading({ phase: 'loading_revenue', percentage: 5 });
      
      const result = await service.getTop25ProtocolsByRevenue((progress) => {
        setLoading({
          phase: progress.phase,
          percentage: progress.percentage,
          current_protocol: progress.current_protocol,
          protocols_mapped: progress.protocols_mapped,
          total_protocols: progress.total_protocols,
        });
      });
      
      setData(result);
      setLoading({ phase: 'complete', percentage: 100 });
    } catch (error) {
      console.error('Failed to load DeFi analytics:', error);
      setLoading({ 
        phase: 'error', 
        percentage: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  };

  const formatCurrency = (value: number | null): string => {
    if (value === null || value === 0) return '$0';
    
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
  };

  const formatPercentage = (value: number | null): string => {
    if (value === null) return 'NaN%';
    return `${value.toFixed(1)}%`;
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    if (confidence >= 0.4) return 'text-orange-600';
    return 'text-red-600';
  };

  const ProgressIndicator = () => {
    if (loading.phase === 'idle') return null;

    return (
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              {loading.phase === 'loading_revenue' && 'Loading revenue data...'}
              {loading.phase === 'mapping_protocols' && 'Mapping protocols to tokens...'}
              {loading.phase === 'fetching_market_caps' && 'Fetching market cap data...'}
              {loading.phase === 'error' && 'Error occurred'}
            </h3>
            <span className="text-sm text-gray-600">{loading.percentage.toFixed(0)}%</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${loading.percentage}%` }}
            />
          </div>
          
          {loading.current_protocol && (
            <p className="text-sm text-gray-600">
              Mapping: {loading.current_protocol} ({loading.protocols_mapped}/{loading.total_protocols})
            </p>
          )}
          
          {loading.error && (
            <p className="text-sm text-red-600">Error: {loading.error}</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Top 25 Protocols</h1>
        <p className="text-gray-600 mb-4">Quarterly Revenue (90d) - Market Cap Weighted</p>
        
        <button
          onClick={loadAnalytics}
          disabled={loading.phase !== 'idle' && loading.phase !== 'complete' && loading.phase !== 'error'}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md transition-colors"
        >
          {loading.phase === 'idle' ? 'Load Analytics' : 
           loading.phase === 'complete' ? 'Refresh Data' : 
           loading.phase === 'error' ? 'Retry' : 'Loading...'}
        </button>
      </div>

      <ProgressIndicator />

      {data && loading.phase === 'complete' && (
        <>
          <div className="bg-white rounded-lg shadow-md mb-6 p-4">
            <h3 className="text-lg font-semibold mb-2">Analytics Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Total Protocols:</span>
                <span className="ml-2 font-semibold">{data.metadata.total_protocols}</span>
              </div>
              <div>
                <span className="text-gray-600">Successful Mappings:</span>
                <span className="ml-2 font-semibold">{data.metadata.successful_mappings}</span>
              </div>
              <div>
                <span className="text-gray-600">Success Rate:</span>
                <span className="ml-2 font-semibold">{data.metadata.mapping_success_rate.toFixed(1)}%</span>
              </div>
              <div>
                <span className="text-gray-600">Total Market Cap:</span>
                <span className="ml-2 font-semibold">{formatCurrency(data.metadata.total_market_cap)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Protocol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Token</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Cap</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">MC %</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.protocols.map((protocol, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {protocol.rank}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {protocol.protocol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {protocol.token || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(protocol.revenue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(protocol.marketCap)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(protocol.marketCapPercentage)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center space-x-2">
                          <span 
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              protocol.mappingStatus === 'success' 
                                ? 'bg-green-100 text-green-800' 
                                : protocol.mappingStatus === 'partial'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {protocol.mappingStatus}
                          </span>
                          <span className={`text-xs ${getConfidenceColor(protocol.confidence)}`}>
                            {(protocol.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {data.failed_mappings.length > 0 && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Failed Mappings</h3>
              <div className="space-y-2">
                {data.failed_mappings.map((failed, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    <span className="font-medium">{failed.protocol}</span> 
                    <span className="text-gray-600"> - Revenue: {formatCurrency(failed.revenue)}</span>
                    <div className="text-xs text-gray-500 ml-4">
                      Tried: {failed.variations_tried.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}