// CoinGecko API TypeScript Client
// A comprehensive wrapper for the CoinGecko API (free tier v3)

interface CoinGeckoMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  fully_diluted_valuation?: number;
  total_volume: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  market_cap_change_24h: number;
  market_cap_change_percentage_24h: number;
  circulating_supply: number;
  total_supply?: number;
  max_supply?: number;
}

export interface CoinGeckoCoinInfo {
  id: string;
  symbol: string;
  name: string;
  platforms: Record<string, string>;
}

export interface ProtocolMappingResult {
  coin: CoinGeckoCoinInfo | null;
  confidence: number; // 0.0 to 1.0
  matchMethod: 'exact_name' | 'exact_id' | 'symbol' | 'partial' | 'fuzzy' | 'failed';
  searchVariations: string[];
}

export interface CombinedProtocolData {
  rank: number;
  protocol: string;
  token?: string;
  revenue: number;
  marketCap: number | null;
  marketCapPercentage: number | null;
  mappingStatus: 'success' | 'partial' | 'failed';
  confidence: number;
  matchMethod?: string;
}

interface CoinGeckoGlobalData {
  active_cryptocurrencies: number;
  upcoming_icos: number;
  ongoing_icos: number;
  ended_icos: number;
  markets: number;
  total_market_cap: Record<string, number>;
  total_volume: Record<string, number>;
  market_cap_percentage: Record<string, number>;
}

interface CoinGeckoApiOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
  rateLimit?: number; // requests per minute
}

export class CoinGeckoAPI {
  private baseUrl: string;
  private apiKey?: string;
  private apiKeyHeader: string;
  private timeout: number;
  private rateLimit: number;
  private lastRequestTime: number = 0;
  private requestQueue: Promise<any> = Promise.resolve();

  constructor(options: CoinGeckoApiOptions = {}) {
    this.apiKey = options.apiKey || process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    this.timeout = options.timeout || 30000;
    this.rateLimit = options.rateLimit || 30; // Free tier: 30 calls/minute

    // Debug logging for API key detection (uncomment for debugging)
    // console.log('🔍 CoinGecko API Key Debug:', {
    //   providedKey: options.apiKey ? 'PROVIDED' : 'NOT_PROVIDED',
    //   envKey: process.env.COINGECKO_API_KEY ? 'FOUND' : 'NOT_FOUND',
    //   nextEnvKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY ? 'FOUND' : 'NOT_FOUND',
    //   finalKey: this.apiKey ? `${this.apiKey.substring(0, 5)}...` : 'NONE',
    //   startsWithCG: this.apiKey ? this.apiKey.startsWith('CG-') : false
    // });

    // Smart endpoint detection based on API key type
    if (options.baseUrl) {
      // User explicitly provided baseUrl, use it
      this.baseUrl = options.baseUrl;
      this.apiKeyHeader = 'x-cg-demo-api-key'; // Default to demo header
      console.log('CoinGecko using explicit baseUrl:', options.baseUrl);
    } else if (this.apiKey && this.apiKey.startsWith('CG-')) {
      // Demo API key - use free endpoint
      this.baseUrl = 'https://api.coingecko.com/api/v3';
      this.apiKeyHeader = 'x-cg-demo-api-key';
      console.log('CoinGecko initialized with Demo API key (free tier, 30 calls/minute)');
    } else if (this.apiKey) {
      // Pro API key - use pro endpoint
      this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
      this.apiKeyHeader = 'x-cg-pro-api-key';
      console.log('CoinGecko initialized with Pro API key');
    } else {
      // No API key - use free endpoint without key
      this.baseUrl = 'https://api.coingecko.com/api/v3';
      this.apiKeyHeader = 'x-cg-demo-api-key';
      console.warn('CoinGecko API key not provided. Using free tier with rate limits.');
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Only add Pro API keys to headers, Demo keys go in query params
    if (this.apiKey && !this.apiKey.startsWith('CG-')) {
      headers[this.apiKeyHeader] = this.apiKey;
    }
    
    return headers;
  }

  private async rateLimitDelay(): Promise<void> {
    const minInterval = 60000 / this.rateLimit; // milliseconds between requests
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    
    if (timeSinceLastRequest < minInterval) {
      const delay = minInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async fetchData<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    // Queue requests to respect rate limits
    return this.requestQueue = this.requestQueue.then(async () => {
      await this.rateLimitDelay();
      
      try {
        // Ensure baseUrl ends with slash for proper URL construction
        const baseUrlWithSlash = this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/';
        // Remove leading slash from endpoint to avoid double slashes
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        const url = new URL(cleanEndpoint, baseUrlWithSlash);
        
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              url.searchParams.append(key, value);
            }
          });
        }

        // Add API key as query parameter for Demo keys, header for Pro keys
        if (this.apiKey) {
          if (this.apiKey.startsWith('CG-')) {
            // Demo API key goes in query parameter
            url.searchParams.append('x_cg_demo_api_key', this.apiKey);
          } else {
            // Pro API key goes in header (handled in getHeaders())
          }
        }

        console.log(`🌐 CoinGecko API Call: ${url.toString()}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: this.getHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`CoinGecko API Error - URL: ${url.toString()}, Status: ${response.status}, Response: ${errorText}`);
          
          // For 404 errors, don't throw - just return empty data
          if (response.status === 404) {
            console.warn(`CoinGecko endpoint not found: ${url.toString()}`);
            return [] as any; // Return empty array for most endpoints
          }
          
          throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        return data;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        console.error(`Error fetching data from ${endpoint}:`, error);
        throw error;
      }
    });
  }

  // Core Market Data Methods
  async getCoinsMarkets(options: {
    vs_currency?: string;
    ids?: string[];
    category?: string;
    order?: string;
    per_page?: number;
    page?: number;
    sparkline?: boolean;
    price_change_percentage?: string;
  } = {}): Promise<CoinGeckoMarketData[]> {
    try {
      const params: Record<string, string> = {
        vs_currency: options.vs_currency || 'usd',
        order: options.order || 'market_cap_desc',
        per_page: options.per_page?.toString() || '250',
        page: options.page?.toString() || '1',
        sparkline: options.sparkline?.toString() || 'false',
      };

      if (options.ids && options.ids.length > 0) {
        params.ids = options.ids.join(',');
      }
      
      if (options.category) {
        params.category = options.category;
      }
      
      if (options.price_change_percentage) {
        params.price_change_percentage = options.price_change_percentage;
      }

      const data = await this.fetchData<CoinGeckoMarketData[]>('/coins/markets', params);
      return data;
    } catch (error) {
      console.error('Error fetching coins markets:', error);
      return [];
    }
  }

  async getCoinsList(include_platform: boolean = false): Promise<CoinGeckoCoinInfo[]> {
    try {
      const params = include_platform ? { include_platform: 'true' } : undefined;
      const data = await this.fetchData<CoinGeckoCoinInfo[]>('/coins/list', params);
      return data;
    } catch (error) {
      console.error('Error fetching coins list:', error);
      return [];
    }
  }

  async getGlobalData(): Promise<CoinGeckoGlobalData | null> {
    try {
      const response = await this.fetchData<{ data: CoinGeckoGlobalData }>('/global');
      return response.data;
    } catch (error) {
      console.error('Error fetching global data:', error);
      return null;
    }
  }

  // Market Cap Specific Methods
  async getMarketCapByIds(coinIds: string[]): Promise<Record<string, number>> {
    try {
      const marketData = await this.getCoinsMarkets({
        ids: coinIds,
        per_page: coinIds.length
      });

      const marketCapMap: Record<string, number> = {};
      marketData.forEach(coin => {
        marketCapMap[coin.id] = coin.market_cap || 0;
      });

      return marketCapMap;
    } catch (error) {
      console.error('Error fetching market caps by IDs:', error);
      return {};
    }
  }

  async getMarketCapBySymbols(symbols: string[]): Promise<Record<string, number>> {
    try {
      // First get all coins to map symbols to IDs
      const allCoins = await this.getCoinsList();
      const symbolToIdMap: Record<string, string> = {};
      
      allCoins.forEach(coin => {
        const normalizedSymbol = coin.symbol.toLowerCase();
        if (symbols.map(s => s.toLowerCase()).includes(normalizedSymbol)) {
          symbolToIdMap[coin.symbol.toUpperCase()] = coin.id;
        }
      });

      // Get market caps for found IDs
      const coinIds = Object.values(symbolToIdMap);
      if (coinIds.length === 0) return {};

      const marketData = await this.getCoinsMarkets({
        ids: coinIds,
        per_page: coinIds.length
      });

      const marketCapMap: Record<string, number> = {};
      marketData.forEach(coin => {
        // Find the symbol that maps to this coin ID
        const symbol = Object.keys(symbolToIdMap).find(sym => symbolToIdMap[sym] === coin.id);
        if (symbol) {
          marketCapMap[symbol] = coin.market_cap || 0;
        }
      });

      return marketCapMap;
    } catch (error) {
      console.error('Error fetching market caps by symbols:', error);
      return {};
    }
  }

  // Protocol to Token Mapping and Fuzzy Search
  async searchCoins(query: string): Promise<CoinGeckoCoinInfo[]> {
    try {
      const allCoins = await this.getCoinsList();
      const queryLower = query.toLowerCase();
      
      return allCoins.filter(coin => 
        coin.symbol.toLowerCase().includes(queryLower) ||
        coin.name.toLowerCase().includes(queryLower) ||
        coin.id.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('Error searching coins:', error);
      return [];
    }
  }

  async findCoinByProtocolName(protocolName: string): Promise<CoinGeckoCoinInfo | null> {
    const result = await this.findCoinByProtocolNameWithConfidence(protocolName);
    return result.coin;
  }

  async findCoinByProtocolNameWithConfidence(protocolName: string): Promise<ProtocolMappingResult> {
    try {
      // Check if this is a known tokenless protocol first
      if (this.isTokenlessProtocol(protocolName)) {
        console.log(`🚫 Protocol "${protocolName}" is known to be tokenless`);
        return {
          coin: null,
          confidence: 0.0,
          matchMethod: 'failed',
          searchVariations: []
        };
      }

      const allCoins = await this.getCoinsList();
      
      // Enhanced DeFi-specific cleaning rules
      const cleanProtocolName = this.cleanProtocolName(protocolName);
      const variations = this.generateProtocolVariations(protocolName, cleanProtocolName);

      console.log(`🔍 Searching for protocol: "${protocolName}" → cleaned: "${cleanProtocolName}"`);
      console.log(`📝 Generated variations:`, variations);

      // 1. Try exact name match (confidence: 1.0)
      let match = allCoins.find(coin => 
        variations.some(variant => coin.name.toLowerCase() === variant)
      );
      if (match) {
        console.log(`✅ Exact name match found: ${match.name} (${match.symbol})`);
        return {
          coin: match,
          confidence: 1.0,
          matchMethod: 'exact_name',
          searchVariations: variations
        };
      }

      // 2. Try exact ID match (confidence: 0.95)
      match = allCoins.find(coin => 
        variations.some(variant => coin.id.toLowerCase() === variant)
      );
      if (match) {
        console.log(`✅ Exact ID match found: ${match.name} (${match.symbol})`);
        return {
          coin: match,
          confidence: 0.95,
          matchMethod: 'exact_id',
          searchVariations: variations
        };
      }

      // 3. Try symbol match (confidence: 0.8)
      match = allCoins.find(coin => 
        variations.some(variant => coin.symbol.toLowerCase() === variant)
      );
      if (match) {
        console.log(`✅ Symbol match found: ${match.name} (${match.symbol})`);
        return {
          coin: match,
          confidence: 0.8,
          matchMethod: 'symbol',
          searchVariations: variations
        };
      }

      // 4. Try partial matching (confidence: 0.6)
      match = allCoins.find(coin => 
        variations.some(variant => 
          coin.name.toLowerCase().includes(variant) ||
          variant.includes(coin.name.toLowerCase()) ||
          coin.id.toLowerCase().includes(variant)
        )
      );
      if (match) {
        console.log(`✅ Partial match found: ${match.name} (${match.symbol})`);
        return {
          coin: match,
          confidence: 0.6,
          matchMethod: 'partial',
          searchVariations: variations
        };
      }

      // 5. Try fuzzy matching on words (confidence: 0.4)
      for (const variant of variations) {
        const protocolWords = variant.split(/\s+/).filter(word => word.length > 2);
        match = allCoins.find(coin => {
          const coinWords = coin.name.toLowerCase().split(/\s+/);
          const coinId = coin.id.toLowerCase();
          return protocolWords.some(pWord => 
            coinWords.some(cWord => 
              cWord.includes(pWord) || pWord.includes(cWord)
            ) || coinId.includes(pWord)
          );
        });
        if (match) {
          console.log(`✅ Fuzzy match found: ${match.name} (${match.symbol})`);
          return {
            coin: match,
            confidence: 0.4,
            matchMethod: 'fuzzy',
            searchVariations: variations
          };
        }
      }

      console.log(`❌ No match found for: ${protocolName}`);
      return {
        coin: null,
        confidence: 0.0,
        matchMethod: 'failed',
        searchVariations: variations
      };
    } catch (error) {
      console.error(`Error finding coin for protocol ${protocolName}:`, error);
      return {
        coin: null,
        confidence: 0.0,
        matchMethod: 'failed',
        searchVariations: []
      };
    }
  }

  // Enhanced protocol name cleaning with DeFi-specific patterns
  private cleanProtocolName(protocolName: string): string {
    return protocolName.toLowerCase()
      // Remove common DeFi descriptors
      .replace(/\s+(amm|v3|v2|v1|spot|orderbook|slipstream|labs|aggregator|trading bot|wallet|protocol|dao|finance|dex|defi|swap|bridge|lending|staking)$/i, '')
      // Remove .fun domains but keep the base name
      .replace(/\.fun$/i, '')
      // Handle "Launch Coin on X" patterns
      .replace(/^launch\s+coin\s+on\s+/i, '')
      // Remove "on" connectors
      .replace(/\s+on\s+\w+$/i, '')
      // Normalize spacing and special characters
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Generate multiple variations of the protocol name for better matching
  private generateProtocolVariations(original: string, cleaned: string): string[] {
    const variations = new Set<string>();
    
    // Add the original and cleaned versions
    variations.add(original.toLowerCase());
    variations.add(cleaned);
    
    // For .fun domains, try both with and without .fun
    if (original.toLowerCase().includes('.fun')) {
      const baseName = original.toLowerCase().replace(/\.fun$/i, '');
      variations.add(baseName);
    }
    
    // For multi-word protocols, try the first word only
    const firstWord = cleaned.split(/\s+/)[0];
    if (firstWord && firstWord.length > 2) {
      variations.add(firstWord);
    }
    
    // For protocols with "V2"/"V3", try without version
    if (cleaned.includes(' v')) {
      variations.add(cleaned.replace(/\s+v\d+$/i, ''));
    }
    
    // Special mappings for known DeFi protocols
    const specialMappings: Record<string, string[]> = {
      'pancakeswap': ['pancakeswap', 'cake'],
      'uniswap': ['uniswap', 'uni'],
      'hyperliquid': ['hyperliquid', 'hype'],
      'aerodrome': ['aerodrome', 'aero'],
      'pump': ['pump', 'pump-fun'],
      'bonk': ['bonk', 'bonk-meme'],
      'photon': ['photon'],
      'believe': ['believe'],
      'aave': ['aave'],
      'trojan': ['trojan'],
      'lido': ['lido', 'ldo'],
      'raydium': ['raydium', 'ray'],
      'gmgn': ['gmgn'],
    };
    
    // Check if any part of the cleaned name matches special mappings
    for (const [key, values] of Object.entries(specialMappings)) {
      if (cleaned.includes(key)) {
        values.forEach(v => variations.add(v));
      }
    }
    
    return Array.from(variations).filter(v => v.length > 0);
  }

  // Check if a protocol is known to not have a token
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

  async getProtocolMarketCaps(protocols: Array<{name: string, symbol?: string}>): Promise<Array<{
    protocolName: string;
    coinGeckoId?: string;
    symbol?: string;
    marketCap: number;
    matchMethod?: string;
  }>> {
    try {
      const results = [];
      
      for (const protocol of protocols) {
        let coinInfo: CoinGeckoCoinInfo | null = null;
        let matchMethod = '';

        // Try to find coin by protocol name
        coinInfo = await this.findCoinByProtocolName(protocol.name);
        if (coinInfo) {
          matchMethod = 'protocol_name';
        }

        // If no match and we have a symbol, try by symbol
        if (!coinInfo && protocol.symbol) {
          const allCoins = await this.getCoinsList();
          coinInfo = allCoins.find(coin => 
            coin.symbol.toLowerCase() === protocol.symbol!.toLowerCase()
          ) || null;
          if (coinInfo) {
            matchMethod = 'symbol';
          }
        }

        let marketCap = 0;
        if (coinInfo) {
          const marketData = await this.getCoinsMarkets({
            ids: [coinInfo.id],
            per_page: 1
          });
          
          if (marketData.length > 0) {
            marketCap = marketData[0].market_cap || 0;
          }
        }

        results.push({
          protocolName: protocol.name,
          coinGeckoId: coinInfo?.id,
          symbol: coinInfo?.symbol.toUpperCase(),
          marketCap,
          matchMethod
        });

        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      return results;
    } catch (error) {
      console.error('Error getting protocol market caps:', error);
      return [];
    }
  }

  // Batch operations for efficiency
  async batchGetMarketCaps(identifiers: Array<{type: 'id' | 'symbol', value: string}>): Promise<Record<string, number>> {
    try {
      const result: Record<string, number> = {};
      
      // Group by type for efficient batching
      const ids = identifiers.filter(item => item.type === 'id').map(item => item.value);
      const symbols = identifiers.filter(item => item.type === 'symbol').map(item => item.value);

      if (ids.length > 0) {
        const idMarketCaps = await this.getMarketCapByIds(ids);
        Object.assign(result, idMarketCaps);
      }

      if (symbols.length > 0) {
        const symbolMarketCaps = await this.getMarketCapBySymbols(symbols);
        Object.assign(result, symbolMarketCaps);
      }

      return result;
    } catch (error) {
      console.error('Error in batch get market caps:', error);
      return {};
    }
  }

  // Utility Methods
  formatMarketCap(marketCap: number): string {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    if (marketCap >= 1e3) return `$${(marketCap / 1e3).toFixed(2)}K`;
    return `$${marketCap.toFixed(2)}`;
  }

  // Print all available methods
  printAvailableMethods(): string[] {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => name !== 'constructor' && typeof (this as any)[name] === 'function');
    
    console.log('Available CoinGecko API methods:', methods);
    return methods;
  }
}

// Export default instance
export const coinGeckoAPI = new CoinGeckoAPI();
export default CoinGeckoAPI;