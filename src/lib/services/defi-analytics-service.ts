// DeFi Analytics Integration Service
// Combines DeFiLlama revenue data with CoinGecko market cap data

import { DeFiLlamaAPI } from '../api-wrappers/defillama-api-wrapper';
import { CoinGeckoAPI, ProtocolMappingResult, CombinedProtocolData } from '../api-wrappers/coingecko-api-wrapper';

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

interface ProgressCallback {
  (progress: {
    phase: 'loading_revenue' | 'mapping_protocols' | 'fetching_market_caps' | 'complete';
    percentage: number;
    current_protocol?: string;
    protocols_mapped?: number;
    total_protocols?: number;
  }): void;
}

export class DeFiAnalyticsService {
  private defiLlamaAPI: DeFiLlamaAPI;
  private coinGeckoAPI: CoinGeckoAPI;

  constructor(defiLlamaAPI?: DeFiLlamaAPI, coinGeckoAPI?: CoinGeckoAPI) {
    this.defiLlamaAPI = defiLlamaAPI || new DeFiLlamaAPI();
    this.coinGeckoAPI = coinGeckoAPI || new CoinGeckoAPI();
  }

  /**
   * Get top 25 protocols by revenue with market cap data
   */
  async getTop25ProtocolsByRevenue(
    progressCallback?: ProgressCallback
  ): Promise<DeFiAnalyticsResult> {
    try {
      // Phase 1: Load revenue data from DeFiLlama
      progressCallback?.({
        phase: 'loading_revenue',
        percentage: 5,
      });

      console.log('📊 Fetching top protocols by revenue from DeFiLlama...');
      const revenueData = await this.defiLlamaAPI.getRevenueOverview();
      const top25 = revenueData.slice(0, 25);

      console.log(`✅ Found ${top25.length} top revenue protocols`);

      // Phase 2: Map protocols to CoinGecko tokens
      progressCallback?.({
        phase: 'mapping_protocols',
        percentage: 15,
        total_protocols: 25,
        protocols_mapped: 0,
      });

      const mappingResults: Array<{
        protocol: any;
        mapping: ProtocolMappingResult;
      }> = [];

      console.log('🔍 Starting protocol mapping to CoinGecko...');

      for (let i = 0; i < top25.length; i++) {
        const protocol = top25[i];
        
        progressCallback?.({
          phase: 'mapping_protocols',
          percentage: 15 + (i / top25.length) * 60,
          current_protocol: protocol.name,
          protocols_mapped: i,
          total_protocols: 25,
        });

        console.log(`\n🔎 [${i + 1}/25] Mapping protocol: ${protocol.name}`);

        // Map protocol with confidence scoring
        const mapping = await this.coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocol.name);
        mappingResults.push({ protocol, mapping });

        // Rate limiting: 2 seconds between requests to stay under 30/minute
        if (i < top25.length - 1) {
          await this.delay(2000);
        }
      }

      // Phase 3: Batch fetch market caps for successful mappings
      progressCallback?.({
        phase: 'fetching_market_caps',
        percentage: 80,
      });

      console.log('\n💰 Fetching market caps for mapped protocols...');

      const successfulMappings = mappingResults
        .filter(result => result.mapping.coin && result.mapping.confidence >= 0.4)
        .map(result => result.mapping.coin!.id);

      console.log(`📈 Getting market caps for ${successfulMappings.length} protocols`);

      const marketCaps = successfulMappings.length > 0 
        ? await this.coinGeckoAPI.getMarketCapByIds(successfulMappings)
        : {};

      // Phase 4: Combine all data
      progressCallback?.({
        phase: 'complete',
        percentage: 100,
      });

      const combinedData = this.combineData(mappingResults, marketCaps);

      console.log('✅ DeFi Analytics processing complete!');
      console.log(`📊 Results: ${combinedData.protocols.length} protocols, ${combinedData.metadata.successful_mappings} successful mappings`);

      return combinedData;

    } catch (error) {
      console.error('❌ Error in DeFi Analytics Service:', error);
      throw error;
    }
  }

  /**
   * Combine revenue data, protocol mappings, and market caps
   */
  private combineData(
    mappingResults: Array<{ protocol: any; mapping: ProtocolMappingResult }>,
    marketCaps: Record<string, number>
  ): DeFiAnalyticsResult {
    const protocols: CombinedProtocolData[] = [];
    const failedMappings: Array<{ protocol: string; revenue: number; variations_tried: string[] }> = [];

    let totalRevenue = 0;
    let totalMarketCap = 0;
    let successfulMappings = 0;

    mappingResults.forEach((result, index) => {
      const { protocol, mapping } = result;
      const revenue = Number(protocol.totalAllTime) || 0;
      totalRevenue += revenue;

      let marketCap: number | null = null;
      let mappingStatus: 'success' | 'partial' | 'failed' = 'failed';

      if (mapping.coin && mapping.confidence >= 0.4) {
        marketCap = marketCaps[mapping.coin.id] || null;
        if (marketCap) {
          mappingStatus = 'success';
          totalMarketCap += marketCap;
          successfulMappings++;
        } else {
          mappingStatus = 'partial';
        }
      } else {
        // Check if this is a known tokenless protocol
        const isTokenless = this.isTokenlessProtocol(protocol.name);
        if (isTokenless) {
          mappingStatus = 'success'; // Consider tokenless protocols as successfully identified
        } else {
          failedMappings.push({
            protocol: protocol.name,
            revenue,
            variations_tried: mapping.searchVariations,
          });
        }
      }

      // Don't show token symbol for tokenless protocols
      const isTokenless = this.isTokenlessProtocol(protocol.name);
      const tokenSymbol = isTokenless ? undefined : mapping.coin?.symbol?.toUpperCase();

      protocols.push({
        rank: index + 1,
        protocol: protocol.name,
        token: tokenSymbol,
        revenue,
        marketCap,
        marketCapPercentage: marketCap && totalMarketCap > 0 
          ? (marketCap / totalMarketCap) * 100 
          : null,
        mappingStatus,
        confidence: mapping.confidence,
        matchMethod: mapping.matchMethod,
      });
    });

    // Recalculate market cap percentages based on total
    if (totalMarketCap > 0) {
      protocols.forEach(protocol => {
        if (protocol.marketCap) {
          protocol.marketCapPercentage = (protocol.marketCap / totalMarketCap) * 100;
        }
      });
    }

    return {
      protocols,
      metadata: {
        total_protocols: protocols.length,
        successful_mappings: successfulMappings,
        mapping_success_rate: (successfulMappings / protocols.length) * 100,
        total_revenue: totalRevenue,
        total_market_cap: totalMarketCap,
        generated_at: new Date().toISOString(),
      },
      failed_mappings: failedMappings,
    };
  }

  /**
   * Test protocol mapping for a single protocol
   */
  async testProtocolMapping(protocolName: string): Promise<ProtocolMappingResult> {
    console.log(`🧪 Testing protocol mapping for: ${protocolName}`);
    const result = await this.coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocolName);
    
    console.log('📋 Test Results:', {
      protocol: protocolName,
      found: !!result.coin,
      confidence: result.confidence,
      method: result.matchMethod,
      coin: result.coin ? `${result.coin.name} (${result.coin.symbol})` : 'None',
      variations: result.searchVariations,
    });

    return result;
  }

  /**
   * Test the mapping accuracy for multiple protocols
   */
  async testMappingAccuracy(protocolNames: string[]): Promise<Array<{
    protocol: string;
    success: boolean;
    confidence: number;
    method: string;
    coin?: string;
  }>> {
    const results = [];

    for (const protocolName of protocolNames) {
      const mapping = await this.testProtocolMapping(protocolName);
      results.push({
        protocol: protocolName,
        success: !!mapping.coin && mapping.confidence >= 0.4,
        confidence: mapping.confidence,
        method: mapping.matchMethod,
        coin: mapping.coin ? `${mapping.coin.name} (${mapping.coin.symbol})` : undefined,
      });

      // Rate limiting
      await this.delay(1000);
    }

    return results;
  }

  /**
   * Check if a protocol is known to not have a token
   */
  private isTokenlessProtocol(protocolName: string): boolean {
    const tokenlessProtocols = new Set([
      'axiom',
      'hyperliquid spot orderbook',
      'aerodrome slipstream',
      'uniswap labs',
      // Add more protocols without tokens here
    ]);
    
    const normalizedName = protocolName.toLowerCase();
    return tokenlessProtocols.has(normalizedName) ||
           Array.from(tokenlessProtocols).some(excluded => normalizedName.includes(excluded));
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Format market cap for display
   */
  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(2)}`;
  }

  /**
   * Format revenue for display
   */
  formatRevenue(revenue: number): string {
    return this.formatMarketCap(revenue);
  }
}

// Export default instance
export const defiAnalyticsService = new DeFiAnalyticsService();
export default DeFiAnalyticsService;