// CoinGecko Pro API TypeScript Client
// A comprehensive wrapper for the CoinGecko Pro API with full backward compatibility
// Optimized for Pro API users with enhanced features and intelligent plan detection

// ========================================
// PRO API INTERFACES & TYPES
// ========================================

export type CoinGeckoPlan = 'free' | 'demo' | 'analyst' | 'lite' | 'pro' | 'enterprise';

export interface CoinGeckoProApiOptions {
  apiKey?: string;
  timeout?: number;
  rateLimit?: number;
  plan?: CoinGeckoPlan | 'auto';
  preferProEndpoints?: boolean; // Default true if Pro key detected
  enableOnChainData?: boolean;  // Default true for Pro users
  cachingEnabled?: boolean;
  fallbackToFree?: boolean;     // Default false for Pro users
  baseUrl?: string;
}

export interface ApiCapabilities {
  hasOHLCData: boolean;
  hasSupplyCharts: boolean;
  hasCustomIntervals: boolean;
  hasOnChainAccess: boolean;
  hasMarketIntelligence: boolean;
  maxRateLimit: number;
  maxPerPage: number;
  hasTimeRangeQueries: boolean;
  hasProAnalytics: boolean;
}

// Pro-exclusive interfaces
export interface MarketMoverData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price_change_percentage: number;
  current_price: number;
  market_cap: number;
  volume_24h: number;
  market_cap_rank?: number;
}

export interface RecentCoinData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  activated_at: string;
  market_cap?: number;
  current_price?: number;
}

export interface HistoricalChartData {
  prices: [number, number][];     // [timestamp, price]
  market_caps: [number, number][]; // [timestamp, market_cap]
  total_volumes: [number, number][]; // [timestamp, volume]
}

export interface OHLCData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SupplyChartData {
  timestamp: number;
  circulating_supply: number;
  total_supply?: number;
}

export interface OnChainTokenPrice {
  [currency: string]: {
    value: number;
    last_updated_at: string;
  };
}

export interface TrendingPoolData {
  id: string;
  type: string;
  name: string;
  pool_address: string;
  base_token: {
    address: string;
    name: string;
    symbol: string;
  };
  quote_token: {
    address: string;
    name: string;
    symbol: string;
  };
  price_change_percentage: {
    h1: number;
    h6: number;
    h24: number;
  };
  volume_usd: {
    h1: number;
    h6: number;
    h24: number;
  };
}

export interface ApiUsageData {
  monthly_call_credit: number;
  current_total_monthly_calls: number;
  current_remaining_monthly_calls: number;
  current_total_daily_calls?: number;
  plan: string;
}

export interface GlobalMarketCapData {
  timestamp: number;
  market_cap: number;
}

export interface ExchangeVolumeData {
  timestamp: number;
  volume_btc: number;
}

// Enhanced existing interfaces
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
  // Pro-enhanced fields
  image?: string;
  last_updated?: string;
  price_change_percentage_1h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_14d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  price_change_percentage_200d_in_currency?: number;
  price_change_percentage_1y_in_currency?: number;
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

export class CoinGeckoAPI {
  private baseUrl: string;
  private apiKey?: string;
  private apiKeyHeader: string;
  private timeout: number;
  private rateLimit: number;
  private lastRequestTime: number = 0;
  private requestQueue: Promise<any> = Promise.resolve();
  
  // Pro API enhancement properties
  private plan: CoinGeckoPlan;
  private capabilities: ApiCapabilities;
  private preferProEndpoints: boolean;
  private enableOnChainData: boolean;
  private cachingEnabled: boolean;
  private fallbackToFree: boolean;
  private shouldUseProEndpoint: boolean = false;

  constructor(options: CoinGeckoProApiOptions = {}) {
    this.apiKey = options.apiKey || process.env.COINGECKO_API_KEY || process.env.NEXT_PUBLIC_COINGECKO_API_KEY;
    this.timeout = options.timeout || 30000;
    
    // Enhanced Pro API configuration
    this.plan = options.plan === 'auto' || !options.plan ? this.detectApiPlan() : options.plan;
    this.capabilities = this.getCapabilities();
    this.preferProEndpoints = options.preferProEndpoints ?? this.capabilities.hasProAnalytics;
    this.enableOnChainData = options.enableOnChainData ?? this.capabilities.hasOnChainAccess;
    this.cachingEnabled = options.cachingEnabled ?? true;
    this.fallbackToFree = options.fallbackToFree ?? !this.capabilities.hasProAnalytics;
    
    // Pro-optimized rate limiting
    this.rateLimit = options.rateLimit || this.capabilities.maxRateLimit;

    // Enhanced logging for Pro features
    if (this.apiKey) {
      console.log(`🚀 CoinGecko Pro API initialized - Plan: ${this.plan.toUpperCase()}, Rate Limit: ${this.rateLimit}/min`);
      if (this.capabilities.hasOHLCData) console.log('✅ OHLC Chart Data available');
      if (this.capabilities.hasSupplyCharts) console.log('✅ Supply Chain Analytics available');
      if (this.capabilities.hasOnChainAccess) console.log('✅ On-Chain DEX Data available');
      if (this.capabilities.hasMarketIntelligence) console.log('✅ Market Intelligence features available');
    }

    // Smart endpoint detection based on API key presence
    if (options.baseUrl) {
      // User explicitly provided baseUrl, use it
      this.baseUrl = options.baseUrl;
      this.apiKeyHeader = 'x-cg-pro-api-key'; // Default to pro header when baseUrl provided
      console.log('CoinGecko using explicit baseUrl:', options.baseUrl);
    } else if (this.apiKey) {
      // Smart detection: Demo keys are typically CG- with shorter length
      const isDemoKey = this.apiKey.startsWith('CG-') && this.apiKey.length < 40;
      
      if (isDemoKey) {
        this.baseUrl = 'https://api.coingecko.com/api/v3';
        this.apiKeyHeader = 'x-cg-demo-api-key';
        console.log(`🔑 CoinGecko initialized with Demo API key (${this.plan} plan) - using standard endpoint`);
      } else {
        this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
        this.apiKeyHeader = 'x-cg-pro-api-key';
        console.log(`🚀 CoinGecko initialized with Pro API key (${this.plan} plan) - using Pro endpoint`);
      }
    } else {
      // No API key - use free endpoint without key
      this.baseUrl = 'https://api.coingecko.com/api/v3';
      this.apiKeyHeader = 'x-cg-demo-api-key';
      console.warn('CoinGecko API key not provided. Using free tier with rate limits.');
    }
  }

  // ========================================
  // PRO API PLAN DETECTION & CAPABILITIES
  // ========================================

  private detectApiPlan(): CoinGeckoPlan {
    if (!this.apiKey) return 'free';
    
    // Don't rely on key prefix alone - CG- keys can be Pro keys too!
    // We'll validate the actual plan via API call in validateApiKey()
    // For now, assume appropriate plan based on key type
    const isProKey = this.detectProApiKey(this.apiKey);
    return isProKey ? 'pro' : 'demo';
  }

  private detectProApiKey(apiKey: string): boolean {
    // Smart detection: Demo keys are typically CG- with shorter length
    if (apiKey && apiKey.length > 0) {
      const isDemoKey = apiKey.startsWith('CG-') && apiKey.length < 40;
      
      if (isDemoKey) {
        console.log('🔑 Demo API key detected - using standard endpoint');
        return false;
      } else {
        console.log('🚀 Pro API key detected - using Pro endpoint');
        return true;
      }
    }
    
    console.log('🔍 No API key - using free endpoint');
    return false;
  }

  private getCapabilities(): ApiCapabilities {
    const planCapabilities: Record<CoinGeckoPlan, ApiCapabilities> = {
      free: {
        hasOHLCData: false,
        hasSupplyCharts: false,
        hasCustomIntervals: false,
        hasOnChainAccess: true, // Limited on-chain access
        hasMarketIntelligence: false,
        maxRateLimit: 30,
        maxPerPage: 100,
        hasTimeRangeQueries: false,
        hasProAnalytics: false
      },
      demo: {
        hasOHLCData: false,
        hasSupplyCharts: false,
        hasCustomIntervals: false,
        hasOnChainAccess: true,
        hasMarketIntelligence: false,
        maxRateLimit: 30,
        maxPerPage: 100,
        hasTimeRangeQueries: false,
        hasProAnalytics: false
      },
      analyst: {
        hasOHLCData: true,
        hasSupplyCharts: false,
        hasCustomIntervals: false,
        hasOnChainAccess: true,
        hasMarketIntelligence: true,
        maxRateLimit: 500,
        maxPerPage: 250,
        hasTimeRangeQueries: true,
        hasProAnalytics: true
      },
      lite: {
        hasOHLCData: true,
        hasSupplyCharts: false,
        hasCustomIntervals: false,
        hasOnChainAccess: true,
        hasMarketIntelligence: true,
        maxRateLimit: 1000,
        maxPerPage: 250,
        hasTimeRangeQueries: true,
        hasProAnalytics: true
      },
      pro: {
        hasOHLCData: true,
        hasSupplyCharts: true,
        hasCustomIntervals: false,
        hasOnChainAccess: true,
        hasMarketIntelligence: true,
        maxRateLimit: 2000,
        maxPerPage: 250,
        hasTimeRangeQueries: true,
        hasProAnalytics: true
      },
      enterprise: {
        hasOHLCData: true,
        hasSupplyCharts: true,
        hasCustomIntervals: true,
        hasOnChainAccess: true,
        hasMarketIntelligence: true,
        maxRateLimit: 10000,
        maxPerPage: 250,
        hasTimeRangeQueries: true,
        hasProAnalytics: true
      }
    };

    return planCapabilities[this.plan];
  }

  private requiresProPlan(feature: string): void {
    if (!this.capabilities.hasProAnalytics) {
      throw new Error(`${feature} requires a Pro API plan. Current plan: ${this.plan}. Upgrade at https://www.coingecko.com/en/api/pricing`);
    }
  }

  private warnDeprecatedForPro(method: string, alternative: string): void {
    if (this.capabilities.hasProAnalytics) {
      console.warn(`💡 ${method} has enhanced Pro alternative: ${alternative}`);
    }
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Always add API keys to headers when using Pro endpoint
    if (this.apiKey) {
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

        // Add API key to headers for Pro endpoint
        if (this.apiKey) {
          // All API keys go in headers for Pro endpoint
          // (If it's actually a demo key, the Pro endpoint will handle the error gracefully)
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
          
          // Special handling for Pro API key on standard endpoint error
          if (response.status === 400 && errorText.includes('change your root URL from api.coingecko.com to pro-api.coingecko.com')) {
            console.warn('🔄 Pro API key detected on standard endpoint - switching to Pro endpoint');
            // Switch to Pro endpoint for Pro keys
            this.baseUrl = 'https://pro-api.coingecko.com/api/v3';
            this.apiKeyHeader = 'x-cg-pro-api-key';
            this.shouldUseProEndpoint = true;
            
            // Retry the request with the correct endpoint
            const newUrl = new URL(cleanEndpoint, 'https://pro-api.coingecko.com/api/v3/');
            if (params) {
              Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  newUrl.searchParams.append(key, value);
                }
              });
            }
            
            console.log(`🔄 Retrying with Pro endpoint: ${newUrl.toString()}`);
            
            const retryResponse = await fetch(newUrl.toString(), {
              method: 'GET',
              headers: this.getHeaders(),
              signal: controller.signal
            });
            
            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              console.error(`Retry also failed - URL: ${newUrl.toString()}, Status: ${retryResponse.status}, Response: ${retryErrorText}`);
              throw new Error(`HTTP error after Pro endpoint switch! status: ${retryResponse.status}, message: ${retryErrorText}`);
            }
            
            const retryData = await retryResponse.json();
            return retryData;
          }
          
          // Special handling for demo key on pro endpoint error  
          if (response.status === 400 && (
            errorText.includes('Demo API key') || 
            errorText.includes('change your root URL  from pro-api.coingecko.com to api.coingecko.com')
          ) && this.baseUrl.includes('pro-api')) {
            console.warn('🔄 Demo API key detected on Pro endpoint - switching to standard endpoint');
            console.log(`   Original URL: ${url.toString()}`);
            // Switch to standard endpoint for demo keys
            this.baseUrl = 'https://api.coingecko.com/api/v3';
            this.apiKeyHeader = 'x-cg-demo-api-key';
            console.log(`   Switching to: ${this.baseUrl}`);
            
            // Retry the request with the correct endpoint
            const newUrl = new URL(cleanEndpoint, 'https://api.coingecko.com/api/v3/');
            if (params) {
              Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                  newUrl.searchParams.append(key, value);
                }
              });
            }
            
            console.log(`🔄 Retrying with standard endpoint: ${newUrl.toString()}`);
            
            const retryResponse = await fetch(newUrl.toString(), {
              method: 'GET',
              headers: this.getHeaders(),
              signal: controller.signal
            });
            
            if (!retryResponse.ok) {
              const retryErrorText = await retryResponse.text();
              console.error(`Retry also failed - URL: ${newUrl.toString()}, Status: ${retryResponse.status}, Response: ${retryErrorText}`);
              throw new Error(`HTTP error after endpoint switch! status: ${retryResponse.status}, message: ${retryErrorText}`);
            }
            
            const retryData = await retryResponse.json();
            return retryData;
          }
          
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

  // ========================================
  // ENHANCED CORE METHODS (PRO-OPTIMIZED)
  // ========================================

  // Core Market Data Methods - Enhanced for Pro
  async getCoinsMarkets(options: {
    vs_currency?: string;
    ids?: string[];
    category?: string;
    order?: string;
    per_page?: number;
    page?: number;
    sparkline?: boolean;
    price_change_percentage?: string;
    locale?: string;        // Pro feature
    precision?: number;     // Pro feature
  } = {}): Promise<CoinGeckoMarketData[]> {
    try {
      const params: Record<string, string> = {
        vs_currency: options.vs_currency || 'usd',
        order: options.order || 'market_cap_desc',
        per_page: options.per_page?.toString() || this.capabilities.maxPerPage.toString(),
        page: options.page?.toString() || '1',
        sparkline: options.sparkline?.toString() || 'false',
      };

      // Pro-enhanced features
      if (options.locale && this.capabilities.hasProAnalytics) {
        params.locale = options.locale;
      }
      
      if (options.precision && this.capabilities.hasProAnalytics) {
        params.precision = options.precision.toString();
      }

      if (options.ids && options.ids.length > 0) {
        params.ids = options.ids.join(',');
      }
      
      if (options.category) {
        params.category = options.category;
      }
      
      if (options.price_change_percentage) {
        params.price_change_percentage = options.price_change_percentage;
      }

      console.log(`📊 Fetching coins markets (${this.plan} plan, max ${this.capabilities.maxPerPage} per page)`);
      const data = await this.fetchData<CoinGeckoMarketData[]>('/coins/markets', params);
      return data;
    } catch (error) {
      console.error('Error fetching coins markets:', error);
      return [];
    }
  }

  async getCoinsList(options: {
    include_platform?: boolean;
    include_metadata?: boolean;  // Pro feature
    status?: 'active' | 'inactive';  // Pro filtering
  } = {}): Promise<CoinGeckoCoinInfo[]> {
    try {
      const params: Record<string, string> = {};
      
      if (options.include_platform) {
        params.include_platform = 'true';
      }

      // Pro-enhanced features
      if (options.include_metadata && this.capabilities.hasProAnalytics) {
        params.include_metadata = 'true';
      }
      
      if (options.status && this.capabilities.hasProAnalytics) {
        params.status = options.status;
      }

      const data = await this.fetchData<CoinGeckoCoinInfo[]>('/coins/list', params);
      return data;
    } catch (error) {
      console.error('Error fetching coins list:', error);
      return [];
    }
  }

  // ========================================
  // PRO-EXCLUSIVE MARKET INTELLIGENCE
  // ========================================

  async getTopGainersLosers(options: {
    vs_currency?: string;
    duration?: '1h' | '24h' | '7d' | '14d' | '30d' | '200d' | '1y';
    top_coins?: number;
    page?: number;
    locale?: string;
  } = {}): Promise<{
    top_gainers: MarketMoverData[];
    top_losers: MarketMoverData[];
  }> {
    this.requiresProPlan('Top gainers/losers data');
    
    try {
      const params: Record<string, string> = {
        vs_currency: options.vs_currency || 'usd',
        duration: options.duration || '24h',
        top_coins: options.top_coins?.toString() || '50',
        page: options.page?.toString() || '1'
      };

      if (options.locale) {
        params.locale = options.locale;
      }

      console.log(`📈 Fetching top gainers/losers (${options.duration || '24h'})`);
      const data = await this.fetchData<{
        top_gainers: MarketMoverData[];
        top_losers: MarketMoverData[];
      }>('/coins/top_gainers_losers', params);
      
      return data;
    } catch (error) {
      console.error('Error fetching top gainers/losers:', error);
      return { top_gainers: [], top_losers: [] };
    }
  }

  async getRecentlyAddedCoins(options: {
    limit?: number;
    page?: number;
  } = {}): Promise<RecentCoinData[]> {
    this.requiresProPlan('Recently added coins');
    
    try {
      const params: Record<string, string> = {
        limit: options.limit?.toString() || '50',
        page: options.page?.toString() || '1'
      };

      console.log(`🆕 Fetching recently added coins`);
      const data = await this.fetchData<RecentCoinData[]>('/coins/recently_added', params);
      return data;
    } catch (error) {
      console.error('Error fetching recently added coins:', error);
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

  async getGlobalMarketCapChart(options: {
    days?: number;
    vs_currency?: string;
  } = {}): Promise<GlobalMarketCapData[]> {
    this.requiresProPlan('Global market cap charts');
    
    try {
      const params: Record<string, string> = {
        days: options.days?.toString() || '30',
        vs_currency: options.vs_currency || 'usd'
      };

      console.log(`🌍 Fetching global market cap chart (${options.days || 30} days)`);
      const response = await this.fetchData<number[][]>('/global/market_cap_chart', params);
      
      return response.map(([timestamp, market_cap]) => ({
        timestamp,
        market_cap
      }));
    } catch (error) {
      console.error('Error fetching global market cap chart:', error);
      return [];
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

  // Enhanced method discovery with Pro feature categorization
  printAvailableMethods(): string[] {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => name !== 'constructor' && typeof (this as any)[name] === 'function');
    
    console.log(`
🚀 CoinGecko Pro API Methods Available (${this.plan.toUpperCase()} Plan)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CORE MARKET DATA
  ✅ getCoinsMarkets()           - Enhanced with Pro features (locale, precision)
  ✅ getCoinsList()              - Enhanced with metadata & status filtering
  ✅ getGlobalData()             - Global crypto market data
  
💼 MARKET INTELLIGENCE (Pro Plans)
  ${this.capabilities.hasMarketIntelligence ? '✅' : '❌'} getTopGainersLosers()        - Real-time market movers
  ${this.capabilities.hasMarketIntelligence ? '✅' : '❌'} getRecentlyAddedCoins()     - Newly listed tokens
  ${this.capabilities.hasMarketIntelligence ? '✅' : '❌'} getGlobalMarketCapChart()   - Historical global market cap

📈 ADVANCED TIME SERIES & CHARTS
  ✅ getHistoricalChartData()    - Enhanced with intervals & precision
  ${this.capabilities.hasTimeRangeQueries ? '✅' : '❌'} getHistoricalChartRange()    - Custom date ranges (Pro)
  ${this.capabilities.hasOHLCData ? '✅' : '❌'} getOHLCChart()              - Candlestick OHLC data (Pro)
  ${this.capabilities.hasOHLCData ? '✅' : '❌'} getOHLCChartRange()         - OHLC with custom ranges (Pro)

👑 SUPPLY CHAIN ANALYTICS (Pro/Enterprise)
  ${this.capabilities.hasSupplyCharts ? '✅' : '❌'} getCirculatingSupplyChart()  - Circulating supply over time
  ${this.capabilities.hasSupplyCharts ? '✅' : '❌'} getCirculatingSupplyChartRange() - Supply with date ranges
  ${this.capabilities.hasSupplyCharts ? '✅' : '❌'} getTotalSupplyChart()        - Total supply analytics
  ${this.capabilities.hasSupplyCharts ? '✅' : '❌'} getTotalSupplyChartRange()   - Total supply with ranges

🔗 ON-CHAIN DEX DATA (GeckoTerminal)
  ${this.capabilities.hasOnChainAccess ? '✅' : '❌'} getOnChainTokenPrice()      - Cross-chain token pricing
  ${this.capabilities.hasOnChainAccess ? '✅' : '❌'} getOnChainTokenPrices()     - Batch token pricing
  ${this.capabilities.hasOnChainAccess ? '✅' : '❌'} getTrendingPools()          - Trending DEX pools
  ${this.capabilities.hasOnChainAccess ? '✅' : '❌'} getPoolData()               - Specific pool analytics
  ${this.capabilities.hasOnChainAccess ? '✅' : '❌'} getPoolOHLCV()              - Pool OHLCV charts
  ${this.capabilities.hasMarketIntelligence ? '✅' : '❌'} getTokenHolders()           - Token holder analysis (Pro)

📊 EXCHANGE ANALYTICS
  ✅ getExchangeVolumeChart()    - Exchange volume over time
  ${this.capabilities.hasTimeRangeQueries ? '✅' : '❌'} getExchangeVolumeChartRange() - Volume with custom ranges

💰 MARKET CAP & PROTOCOL MAPPING
  ✅ getMarketCapByIds()         - Market cap by coin IDs
  ✅ getMarketCapBySymbols()     - Market cap by symbols
  ✅ findCoinByProtocolName()    - Smart protocol-to-token mapping
  ✅ getProtocolMarketCaps()     - Batch protocol market caps

🔧 API MANAGEMENT & UTILITIES
  ${this.capabilities.hasProAnalytics ? '✅' : '❌'} getApiUsage()               - Track API credit usage
  ✅ validateApiKey()            - Validate API key & plan
  ✅ getCapabilitiesInfo()       - View your plan capabilities
  ✅ getPlanInfo()               - Detailed plan information
  
�� Plan: ${this.plan.toUpperCase()} | Rate Limit: ${this.rateLimit}/min | Max Per Page: ${this.capabilities.maxPerPage}
${this.capabilities.hasCustomIntervals ? '⚡ 5-minute intervals available (Enterprise)' : ''}

Total Methods: ${methods.length}
    `);
    
    return methods;
  }

  // ========================================
  // ADVANCED TIME SERIES & HISTORICAL DATA
  // ========================================

  async getHistoricalChartData(
    coinId: string, 
    options: {
      vs_currency?: string;
      days?: number | 'max';
      interval?: 'daily' | 'hourly' | '5m';  // 5m: Enterprise only
      precision?: number;  // Pro feature
    } = {}
  ): Promise<HistoricalChartData> {
    try {
      const params: Record<string, string> = {
        vs_currency: options.vs_currency || 'usd',
        days: options.days?.toString() || '30'
      };

      // Enterprise-only 5-minute intervals
      if (options.interval === '5m' && !this.capabilities.hasCustomIntervals) {
        console.warn('5-minute intervals require Enterprise plan. Using automatic granularity.');
      } else if (options.interval && this.capabilities.hasCustomIntervals) {
        params.interval = options.interval;
      }

      if (options.precision && this.capabilities.hasProAnalytics) {
        params.precision = options.precision.toString();
      }

      console.log(`📊 Fetching historical chart for ${coinId} (${options.days || 30} days)`);
      const data = await this.fetchData<HistoricalChartData>(`/coins/${coinId}/market_chart`, params);
      return data;
    } catch (error) {
      console.error(`Error fetching historical chart for ${coinId}:`, error);
      return { prices: [], market_caps: [], total_volumes: [] };
    }
  }

  async getHistoricalChartRange(
    coinId: string,
    options: {
      from: number;        // UNIX timestamp
      to: number;          // UNIX timestamp  
      vs_currency?: string;
      interval?: 'daily' | 'hourly' | '5m';  // Pro exclusive
      precision?: number;
    }
  ): Promise<HistoricalChartData> {
    this.requiresProPlan('Historical chart range queries');
    
    try {
      const params: Record<string, string> = {
        from: options.from.toString(),
        to: options.to.toString(),
        vs_currency: options.vs_currency || 'usd'
      };

      // Validate date ranges based on plan and interval
      const daysDiff = Math.ceil((options.to - options.from) / (24 * 60 * 60));
      
      if (options.interval === '5m') {
        if (!this.capabilities.hasCustomIntervals) {
          throw new Error('5-minute intervals require Enterprise plan');
        }
        if (daysDiff > 10) {
          throw new Error('5-minute interval supports maximum 10 days date range');
        }
        params.interval = '5m';
      } else if (options.interval === 'hourly') {
        if (daysDiff > 100) {
          throw new Error('Hourly interval supports maximum 100 days date range');
        }
        params.interval = 'hourly';
      } else if (options.interval) {
        params.interval = options.interval;
      }

      if (options.precision && this.capabilities.hasProAnalytics) {
        params.precision = options.precision.toString();
      }

      console.log(`📊 Fetching historical chart range for ${coinId} (${daysDiff} days)`);
      const data = await this.fetchData<HistoricalChartData>(`/coins/${coinId}/market_chart/range`, params);
      return data;
    } catch (error) {
      console.error(`Error fetching historical chart range for ${coinId}:`, error);
      return { prices: [], market_caps: [], total_volumes: [] };
    }
  }

  async getOHLCChart(
    coinId: string,
    options: {
      vs_currency?: string;
      days?: number;
      precision?: number;
    } = {}
  ): Promise<OHLCData[]> {
    this.requiresProPlan('OHLC chart data');
    
    try {
      const params: Record<string, string> = {
        vs_currency: options.vs_currency || 'usd',
        days: options.days?.toString() || '30'
      };

      if (options.precision && this.capabilities.hasProAnalytics) {
        params.precision = options.precision.toString();
      }

      console.log(`📈 Fetching OHLC chart for ${coinId} (${options.days || 30} days)`);
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/ohlc`, params);
      
      return data.map(([timestamp, open, high, low, close]) => ({
        timestamp,
        open,
        high,
        low,
        close
      }));
    } catch (error) {
      console.error(`Error fetching OHLC chart for ${coinId}:`, error);
      return [];
    }
  }

  async getOHLCChartRange(
    coinId: string,
    options: {
      from: number;
      to: number;
      vs_currency?: string;
      precision?: number;
    }
  ): Promise<OHLCData[]> {
    this.requiresProPlan('OHLC chart range queries');
    
    try {
      const params: Record<string, string> = {
        from: options.from.toString(),
        to: options.to.toString(),
        vs_currency: options.vs_currency || 'usd'
      };

      if (options.precision && this.capabilities.hasProAnalytics) {
        params.precision = options.precision.toString();
      }

      const daysDiff = Math.ceil((options.to - options.from) / (24 * 60 * 60));
      console.log(`📈 Fetching OHLC chart range for ${coinId} (${daysDiff} days)`);
      
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/ohlc/range`, params);
      
      return data.map(([timestamp, open, high, low, close]) => ({
        timestamp,
        open,
        high,
        low,
        close
      }));
    } catch (error) {
      console.error(`Error fetching OHLC chart range for ${coinId}:`, error);
      return [];
    }
  }

  // ========================================
  // SUPPLY CHAIN ANALYTICS (CROWN FEATURES 👑)
  // ========================================

  async getCirculatingSupplyChart(
    coinId: string,
    options: {
      days?: number;
      interval?: 'daily' | 'hourly';
    } = {}
  ): Promise<SupplyChartData[]> {
    this.requiresProPlan('Circulating supply charts');
    
    try {
      const params: Record<string, string> = {
        days: options.days?.toString() || '30'
      };

      if (options.interval) {
        params.interval = options.interval;
      }

      console.log(`🔄 Fetching circulating supply chart for ${coinId}`);
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/circulating_supply_chart`, params);
      
      return data.map(([timestamp, circulating_supply]) => ({
        timestamp,
        circulating_supply
      }));
    } catch (error) {
      console.error(`Error fetching circulating supply chart for ${coinId}:`, error);
      return [];
    }
  }

  async getCirculatingSupplyChartRange(
    coinId: string,
    options: {
      from: number;
      to: number;
      interval?: 'daily' | 'hourly';
    }
  ): Promise<SupplyChartData[]> {
    this.requiresProPlan('Circulating supply chart ranges');
    
    try {
      const params: Record<string, string> = {
        from: options.from.toString(),
        to: options.to.toString()
      };

      if (options.interval) {
        params.interval = options.interval;
      }

      const daysDiff = Math.ceil((options.to - options.from) / (24 * 60 * 60));
      console.log(`🔄 Fetching circulating supply chart range for ${coinId} (${daysDiff} days)`);
      
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/circulating_supply_chart/range`, params);
      
      return data.map(([timestamp, circulating_supply]) => ({
        timestamp,
        circulating_supply
      }));
    } catch (error) {
      console.error(`Error fetching circulating supply chart range for ${coinId}:`, error);
      return [];
    }
  }

  async getTotalSupplyChart(
    coinId: string,
    options: {
      days?: number;
      interval?: 'daily' | 'hourly';
    } = {}
  ): Promise<SupplyChartData[]> {
    this.requiresProPlan('Total supply charts');
    
    try {
      const params: Record<string, string> = {
        days: options.days?.toString() || '30'
      };

      if (options.interval) {
        params.interval = options.interval;
      }

      console.log(`📊 Fetching total supply chart for ${coinId}`);
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/total_supply_chart`, params);
      
      return data.map(([timestamp, total_supply]) => ({
        timestamp,
        circulating_supply: 0, // Will need to be updated based on actual API response
        total_supply
      }));
    } catch (error) {
      console.error(`Error fetching total supply chart for ${coinId}:`, error);
      return [];
    }
  }

  async getTotalSupplyChartRange(
    coinId: string,
    options: {
      from: number;
      to: number;
      interval?: 'daily' | 'hourly';
    }
  ): Promise<SupplyChartData[]> {
    this.requiresProPlan('Total supply chart ranges');
    
    try {
      const params: Record<string, string> = {
        from: options.from.toString(),
        to: options.to.toString()
      };

      if (options.interval) {
        params.interval = options.interval;
      }

      const daysDiff = Math.ceil((options.to - options.from) / (24 * 60 * 60));
      console.log(`📊 Fetching total supply chart range for ${coinId} (${daysDiff} days)`);
      
      const data = await this.fetchData<number[][]>(`/coins/${coinId}/total_supply_chart/range`, params);
      
      return data.map(([timestamp, total_supply]) => ({
        timestamp,
        circulating_supply: 0, // Will need to be updated based on actual API response
        total_supply
      }));
    } catch (error) {
      console.error(`Error fetching total supply chart range for ${coinId}:`, error);
      return [];
    }
  }

  // ========================================
  // ENHANCED EXCHANGE ANALYTICS (PRO)
  // ========================================

  async getExchangeVolumeChart(
    exchangeId: string,
    days: number = 30
  ): Promise<ExchangeVolumeData[]> {
    try {
      const params: Record<string, string> = {
        days: days.toString()
      };

      console.log(`📊 Fetching exchange volume chart for ${exchangeId} (${days} days)`);
      const data = await this.fetchData<number[][]>(`/exchanges/${exchangeId}/volume_chart`, params);
      
      return data.map(([timestamp, volume_btc]) => ({
        timestamp,
        volume_btc
      }));
    } catch (error) {
      console.error(`Error fetching exchange volume chart for ${exchangeId}:`, error);
      return [];
    }
  }

  async getExchangeVolumeChartRange(
    exchangeId: string,
    options: {
      from: number;
      to: number;
    }
  ): Promise<ExchangeVolumeData[]> {
    this.requiresProPlan('Exchange volume chart ranges');
    
    try {
      const params: Record<string, string> = {
        from: options.from.toString(),
        to: options.to.toString()
      };

      const daysDiff = Math.ceil((options.to - options.from) / (24 * 60 * 60));
      console.log(`📊 Fetching exchange volume chart range for ${exchangeId} (${daysDiff} days)`);
      
      const data = await this.fetchData<number[][]>(`/exchanges/${exchangeId}/volume_chart/range`, params);
      
      return data.map(([timestamp, volume_btc]) => ({
        timestamp,
        volume_btc
      }));
    } catch (error) {
      console.error(`Error fetching exchange volume chart range for ${exchangeId}:`, error);
      return [];
    }
  }

  // ========================================
  // ON-CHAIN DEX INTEGRATION (GECKOTERMINAL)
  // ========================================

  async getOnChainTokenPrice(
    network: string,
    tokenAddress: string,
    options: {
      vs_currencies?: string;
      include?: string[];
    } = {}
  ): Promise<OnChainTokenPrice> {
    this.requiresProPlan('On-chain token pricing');
    
    try {
      const params: Record<string, string> = {};
      
      if (options.vs_currencies) {
        params.vs_currencies = options.vs_currencies;
      }
      
      if (options.include && options.include.length > 0) {
        params.include = options.include.join(',');
      }

      console.log(`🔗 Fetching on-chain token price for ${tokenAddress} on ${network}`);
      const data = await this.fetchData<{[key: string]: OnChainTokenPrice}>(`/onchain/simple/networks/${network}/token_price/${tokenAddress}`, params);
      
      return data[tokenAddress] || {};
    } catch (error) {
      console.error(`Error fetching on-chain token price for ${tokenAddress}:`, error);
      return {};
    }
  }

  async getOnChainTokenPrices(
    network: string,
    tokenAddresses: string[],
    options: {
      vs_currencies?: string;
      include?: string[];
    } = {}
  ): Promise<Record<string, OnChainTokenPrice>> {
    this.requiresProPlan('On-chain token pricing');
    
    try {
      const params: Record<string, string> = {};
      
      if (options.vs_currencies) {
        params.vs_currencies = options.vs_currencies;
      }
      
      if (options.include && options.include.length > 0) {
        params.include = options.include.join(',');
      }

      const addressesParam = tokenAddresses.join(',');
      console.log(`🔗 Fetching on-chain token prices for ${tokenAddresses.length} tokens on ${network}`);
      
      const data = await this.fetchData<Record<string, OnChainTokenPrice>>(`/onchain/simple/networks/${network}/token_price/${addressesParam}`, params);
      return data;
    } catch (error) {
      console.error(`Error fetching on-chain token prices:`, error);
      return {};
    }
  }

  async getTrendingPools(options: {
    network?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<TrendingPoolData[]> {
    try {
      const params: Record<string, string> = {};
      
      if (options.page) {
        params.page = options.page.toString();
      }
      
      if (options.per_page) {
        params.per_page = options.per_page.toString();
      }

      const endpoint = options.network 
        ? `/onchain/networks/${options.network}/trending_pools`
        : '/onchain/networks/trending_pools';

      console.log(`🌊 Fetching trending pools${options.network ? ` on ${options.network}` : ''}`);
      const response = await this.fetchData<{data: TrendingPoolData[]}>(`${endpoint}`, params);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching trending pools:', error);
      return [];
    }
  }

  async getPoolData(
    network: string,
    poolAddress: string
  ): Promise<any> {
    try {
      console.log(`🏊 Fetching pool data for ${poolAddress} on ${network}`);
      const data = await this.fetchData<any>(`/onchain/networks/${network}/pools/${poolAddress}`);
      return data;
    } catch (error) {
      console.error(`Error fetching pool data for ${poolAddress}:`, error);
      return null;
    }
  }

  async getPoolOHLCV(
    network: string,
    poolAddress: string,
    options: {
      timeframe: string;
      aggregate?: number;
      before_timestamp?: number;
      limit?: number;
    }
  ): Promise<any[]> {
    try {
      const params: Record<string, string> = {
        timeframe: options.timeframe
      };

      if (options.aggregate) {
        params.aggregate = options.aggregate.toString();
      }
      
      if (options.before_timestamp) {
        params.before_timestamp = options.before_timestamp.toString();
      }
      
      if (options.limit) {
        params.limit = options.limit.toString();
      }

      console.log(`📊 Fetching pool OHLCV for ${poolAddress} on ${network}`);
      const response = await this.fetchData<{data: any[]}>(`/onchain/networks/${network}/pools/${poolAddress}/ohlcv/${options.timeframe}`, params);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching pool OHLCV for ${poolAddress}:`, error);
      return [];
    }
  }

  async getTokenHolders(
    network: string,
    tokenAddress: string
  ): Promise<any[]> {
    this.requiresProPlan('Token holder analytics');
    
    try {
      console.log(`👥 Fetching token holders for ${tokenAddress} on ${network}`);
      const response = await this.fetchData<{data: any[]}>(`/onchain/networks/${network}/tokens/${tokenAddress}/top_holders`);
      return response.data || [];
    } catch (error) {
      console.error(`Error fetching token holders for ${tokenAddress}:`, error);
      return [];
    }
  }

  // ========================================
  // PRO PLAN MANAGEMENT & UTILITIES
  // ========================================

  async getApiUsage(): Promise<ApiUsageData | null> {
    this.requiresProPlan('API usage tracking');
    
    try {
      console.log(`📊 Fetching API usage data`);
      const data = await this.fetchData<ApiUsageData>('/key');
      return data;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      return null;
    }
  }

  async validateApiKey(): Promise<{
    valid: boolean;
    plan: string;
    credits_remaining?: number;
    rate_limit_remaining?: number;
  }> {
    try {
      const usage = await this.getApiUsage();
      
      if (usage) {
        return {
          valid: true,
          plan: usage.plan,
          credits_remaining: usage.current_remaining_monthly_calls,
          rate_limit_remaining: undefined // Would need rate limit endpoint
        };
      }
      
      // Fallback validation
      const pingResponse = await this.fetchData<any>('/ping');
      return {
        valid: !!pingResponse,
        plan: this.plan
      };
    } catch (error) {
      return {
        valid: false,
        plan: 'unknown'
      };
    }
  }

  // Migration and utility methods
  static migrationGuide(): void {
    console.log(`
🚀 CoinGecko Pro API Migration Guide:

Enhanced Methods Available:
✅ getHistoricalChartRange() - Custom date ranges with Pro intervals
✅ getOHLCChart() - Candlestick OHLC data (Pro exclusive)  
✅ getTopGainersLosers() - Real-time market intelligence
✅ getCirculatingSupplyChart() - Supply analytics (Pro/Enterprise)
✅ getOnChainTokenPrice() - Cross-chain DEX data access
✅ getApiUsage() - Track your API credit usage
✅ Enhanced rate limits and per_page maximums

Your existing code continues to work unchanged!
New Pro features are automatically enabled with your API key.
    `);
  }

  getCapabilitiesInfo(): ApiCapabilities {
    return { ...this.capabilities };
  }

  getPlanInfo(): { plan: CoinGeckoPlan; features: string[] } {
    const features: string[] = [];
    
    if (this.capabilities.hasOHLCData) features.push('OHLC Charts');
    if (this.capabilities.hasSupplyCharts) features.push('Supply Analytics');
    if (this.capabilities.hasCustomIntervals) features.push('5-minute intervals');
    if (this.capabilities.hasOnChainAccess) features.push('On-chain DEX data');
    if (this.capabilities.hasMarketIntelligence) features.push('Market Intelligence');
    if (this.capabilities.hasTimeRangeQueries) features.push('Time Range Queries');
    
    return {
      plan: this.plan,
      features
    };
  }
}

// Export default instance
export const coinGeckoAPI = new CoinGeckoAPI();
export default CoinGeckoAPI;