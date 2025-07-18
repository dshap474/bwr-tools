// DeFiLlama API TypeScript Client
// A comprehensive wrapper for the DeFi Llama API

interface ProtocolData {
  name: string;
  slug: string;
  tvl: number;
  mcap?: number;
  market_share?: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

interface TVLData {
  date: string;
  tvl: number;
}

interface ChainData {
  name: string;
  tvl: number;
  tokenSymbol?: string;
  cmcId?: string;
}

interface StablecoinData {
  id: number;
  name: string;
  symbol: string;
  circulating_total: number;
  pegType: string;
  price?: number;
}

interface PoolData {
  pool: string;
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy?: number;
  apyBase?: number;
  apyReward?: number;
  url?: string;
}

interface PriceData {
  coin: string;
  timestamp: number;
  price: number;
  datetime: string;
}

interface VolumeData {
  timestamp: string;
  total_volume?: number;
  [protocol: string]: number | string | undefined;
}

export class DeFiLlamaAPI {
  private baseUrl: string;
  private coinsBaseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = "https://api.llama.fi", apiKey?: string) {
    this.baseUrl = baseUrl;
    this.coinsBaseUrl = "https://coins.llama.fi";
    this.apiKey = apiKey || process.env.DEFILLAMA_PRO_API_KEY || process.env.NEXT_PUBLIC_DEFILLAMA_PRO_API_KEY;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    }
    
    return headers;
  }

  private async fetchData<T>(url: string, params?: Record<string, string | number>): Promise<T> {
    try {
      const searchParams = new URLSearchParams();
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, value.toString());
          }
        });
      }

      const fullUrl = params && searchParams.toString() 
        ? `${url}?${searchParams.toString()}` 
        : url;

      console.log(`DeFiLlama API Call: ${fullUrl}`);

      const response = await fetch(fullUrl, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error - URL: ${fullUrl}, Status: ${response.status}, Response: ${errorText}`);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching data from ${url}:`, error);
      throw error;
    }
  }

  // TVL & Protocol Methods
  async getAllProtocols(): Promise<ProtocolData[]> {
    try {
      const data = await this.fetchData<any[]>(`${this.baseUrl}/protocols`);
      
      return data
        .map((protocol) => ({
          name: protocol.name,
          slug: protocol.slug,
          tvl: Number(protocol.tvl) || 0,
          mcap: protocol.mcap ? Number(protocol.mcap) : undefined,
          change_1h: protocol.change_1h ? Number(protocol.change_1h) : undefined,
          change_1d: protocol.change_1d ? Number(protocol.change_1d) : undefined,
          change_7d: protocol.change_7d ? Number(protocol.change_7d) : undefined,
          market_share: 0, // Will be calculated below
        }))
        .sort((a, b) => b.tvl - a.tvl)
        .map((protocol, _, arr) => {
          const totalTvl = arr.reduce((sum, p) => sum + p.tvl, 0);
          return {
            ...protocol,
            market_share: totalTvl > 0 ? (protocol.tvl / totalTvl) * 100 : 0,
          };
        });
    } catch (error) {
      console.error('Error fetching all protocols:', error);
      return [];
    }
  }

  async getProtocolTVL(protocol: string): Promise<any> {
    try {
      const data = await this.fetchData<any>(`${this.baseUrl}/protocol/${protocol}`);
      
      const result: any = {
        meta: {},
        tvl: [],
        chain_tvl: {},
        token_tvl: {},
      };

      // Extract metadata
      Object.keys(data).forEach(key => {
        if (!Array.isArray(data[key]) && typeof data[key] !== 'object') {
          result.meta[key] = data[key];
        }
      });

      // Process main TVL data
      if (data.tvl && Array.isArray(data.tvl)) {
        result.tvl = data.tvl.map((point: any) => ({
          date: new Date(point.date * 1000).toISOString(),
          tvl: point.totalLiquidityUSD || point.tvl || 0,
        }));
      }

      // Process chain-specific TVL
      if (data.chainTvls) {
        Object.entries(data.chainTvls).forEach(([chain, chainData]: [string, any]) => {
          if (Array.isArray(chainData)) {
            result.chain_tvl[chain] = chainData.map((point: any) => ({
              date: new Date(point.date * 1000).toISOString(),
              tvl: point.totalLiquidityUSD || point.tvl || 0,
            }));
          }
        });
      }

      return result;
    } catch (error) {
      console.error(`Error fetching protocol TVL for ${protocol}:`, error);
      return { error: `Failed to fetch data for ${protocol}` };
    }
  }

  async getTotalCryptoTVL(): Promise<TVLData[]> {
    try {
      const data = await this.fetchData<any[]>(`${this.baseUrl}/v2/historicalChainTvl`);
      return data.map((point) => ({
        date: new Date(point.date * 1000).toISOString(),
        tvl: point.tvl || 0,
      }));
    } catch (error) {
      console.error('Error fetching total crypto TVL:', error);
      return [];
    }
  }

  async getChainHistoricalTVL(chain: string): Promise<TVLData[]> {
    try {
      const data = await this.fetchData<any[]>(`${this.baseUrl}/v2/historicalChainTvl/${chain}`);
      return data.map((point) => ({
        date: new Date(point.date * 1000).toISOString(),
        tvl: point.tvl || 0,
      }));
    } catch (error) {
      console.error(`Error fetching chain TVL for ${chain}:`, error);
      return [];
    }
  }

  async getAllChainsTVL(): Promise<ChainData[]> {
    try {
      const data = await this.fetchData<any[]>(`${this.baseUrl}/v2/chains`);
      const chains = data.map((chain) => ({
        name: chain.name,
        tvl: Number(chain.tvl) || 0,
        tokenSymbol: chain.tokenSymbol,
        cmcId: chain.cmcId,
      }));

      // Add market share calculation
      const totalTvl = chains.reduce((sum, chain) => sum + chain.tvl, 0);
      
      return chains
        .map((chain) => ({
          ...chain,
          market_share: totalTvl > 0 ? (chain.tvl / totalTvl) * 100 : 0,
        }))
        .sort((a, b) => b.tvl - a.tvl);
    } catch (error) {
      console.error('Error fetching all chains TVL:', error);
      return [];
    }
  }

  // Price Methods
  async getPriceChart(
    coins: string,
    start?: string,
    end?: string,
    span: number = 1000,
    period: string = "24h",
    searchWidth?: string
  ): Promise<PriceData[]> {
    try {
      const params: Record<string, string | number> = {
        period,
        span,
      };

      if (start) {
        params.start = Math.floor(new Date(start).getTime() / 1000);
      }
      if (end) {
        params.end = Math.floor(new Date(end).getTime() / 1000);
      }
      if (searchWidth) {
        params.searchWidth = searchWidth;
      }

      const data = await this.fetchData<any>(`${this.coinsBaseUrl}/chart/${coins}`, params);
      
      const allPrices: PriceData[] = [];
      
      if (data.coins) {
        Object.entries(data.coins).forEach(([coin, coinData]: [string, any]) => {
          if (coinData.prices) {
            coinData.prices.forEach((pricePoint: any) => {
              allPrices.push({
                coin,
                timestamp: pricePoint.timestamp,
                price: pricePoint.price,
                datetime: new Date(pricePoint.timestamp * 1000).toISOString(),
              });
            });
          }
        });
      }

      return allPrices.sort((a, b) => a.timestamp - b.timestamp);
    } catch (error) {
      console.error('Error fetching price chart:', error);
      return [];
    }
  }

  async getEarliestPrice(coins: string | string[]): Promise<any> {
    try {
      const coinsParam = Array.isArray(coins) ? coins.join(',') : coins;
      return await this.fetchData<any>(`${this.coinsBaseUrl}/prices/first/${coinsParam}`);
    } catch (error) {
      console.error('Error fetching earliest price:', error);
      return { error: 'Failed to fetch earliest price data' };
    }
  }

  // Stablecoin Methods
  async getStablecoinCirculatingSupply(includePrices: boolean = false): Promise<StablecoinData[]> {
    try {
      const params = { includePrices: includePrices.toString() };
      const data = await this.fetchData<any>("https://stablecoins.llama.fi/stablecoins", params);
      
      if (!data.peggedAssets) return [];

      return data.peggedAssets.map((stablecoin: any) => {
        const circulatingTotal = typeof stablecoin.circulating === 'object' 
          ? Object.values(stablecoin.circulating).reduce((sum: number, val: any) => sum + (Number(val) || 0), 0)
          : Number(stablecoin.circulating) || 0;

        return {
          id: stablecoin.id,
          name: stablecoin.name,
          symbol: stablecoin.symbol,
          circulating_total: circulatingTotal,
          pegType: stablecoin.pegType,
          price: includePrices ? stablecoin.price : undefined,
        };
      }).sort((a: StablecoinData, b: StablecoinData) => b.circulating_total - a.circulating_total);
    } catch (error) {
      console.error('Error fetching stablecoin circulating supply:', error);
      return [];
    }
  }

  async getStablecoinChartsAll(stablecoinId?: number): Promise<any[]> {
    try {
      const params = stablecoinId ? { stablecoin: stablecoinId.toString() } : undefined;
      const data = await this.fetchData<any[]>("https://stablecoins.llama.fi/stablecoincharts/all", params);
      
      return data.map((point) => ({
        date: new Date(point.date * 1000).toISOString(),
        totalCirculating: point.totalCirculating,
        ...point,
      }));
    } catch (error) {
      console.error('Error fetching stablecoin charts:', error);
      return [];
    }
  }

  async getStablecoinChartsChain(chain: string, stablecoinId?: number): Promise<any[]> {
    try {
      const params = stablecoinId ? { stablecoin: stablecoinId.toString() } : undefined;
      const data = await this.fetchData<any[]>(`https://stablecoins.llama.fi/stablecoincharts/${chain}`, params);
      
      return data.map((point) => ({
        date: new Date(point.date * 1000).toISOString(),
        totalCirculating: point.totalCirculating,
        ...point,
      }));
    } catch (error) {
      console.error(`Error fetching stablecoin charts for ${chain}:`, error);
      return [];
    }
  }

  // Yield/Pool Methods
  async getPools(chain?: string, tvlFilter: number = 1000000): Promise<PoolData[]> {
    try {
      const data = await this.fetchData<{ data: any[] }>("https://yields.llama.fi/pools");
      
      if (!data.data) return [];

      let pools = data.data;

      // Apply chain filter if specified
      if (chain && chain !== "None") {
        pools = pools.filter((pool: any) => 
          pool.chain.toLowerCase() === chain.toLowerCase()
        );
      }

      // Apply TVL filter
      pools = pools.filter((pool: any) => 
        Number(pool.tvlUsd) >= tvlFilter
      );

      return pools.map((pool: any) => ({
        pool: pool.pool,
        chain: pool.chain,
        project: pool.project,
        symbol: pool.symbol,
        tvlUsd: Number(pool.tvlUsd) || 0,
        apy: pool.apy ? Number(pool.apy) : undefined,
        apyBase: pool.apyBase ? Number(pool.apyBase) : undefined,
        apyReward: pool.apyReward ? Number(pool.apyReward) : undefined,
        url: pool.url,
      }));
    } catch (error) {
      console.error('Error fetching pools:', error);
      return [];
    }
  }

  async getPoolChart(poolId: string): Promise<any[]> {
    try {
      const data = await this.fetchData<{ data: any[] }>(`https://yields.llama.fi/chart/${poolId}`);
      
      if (!data.data) return [];

      return data.data.map((point: any) => ({
        timestamp: new Date(point.timestamp).toISOString(),
        tvlUsd: Number(point.tvlUsd) || 0,
        apy: point.apy ? Number(point.apy) : undefined,
        apyBase: point.apyBase ? Number(point.apyBase) : undefined,
        apyReward: point.apyReward ? Number(point.apyReward) : undefined,
        il7d: point.il7d ? Number(point.il7d) : undefined,
        apyBase7d: point.apyBase7d ? Number(point.apyBase7d) : undefined,
      }));
    } catch (error) {
      console.error(`Error fetching pool chart for ${poolId}:`, error);
      return [];
    }
  }

  // DEX Methods
  async getDexsOverview(dataType: string = "dailyVolume"): Promise<any[]> {
    try {
      const params = {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
        dataType,
      };

      const data = await this.fetchData<{ protocols: any[] }>(`${this.baseUrl}/overview/dexs`, params);
      
      if (!data.protocols) return [];

      return data.protocols
        .sort((a, b) => (b.totalAllTime || 0) - (a.totalAllTime || 0))
        .map((protocol) => ({
          name: protocol.name,
          totalAllTime: protocol.totalAllTime || 0,
          ...protocol,
        }));
    } catch (error) {
      console.error('Error fetching DEXs overview:', error);
      return [];
    }
  }

  async getTotalDexVolume(dataType: string = "dailyVolume"): Promise<VolumeData[]> {
    try {
      const params = {
        excludeTotalDataChart: "false",
        excludeTotalDataChartBreakdown: "false",
        dataType,
      };

      const data = await this.fetchData<any>(`${this.baseUrl}/overview/dexs`, params);
      
      const result: VolumeData[] = [];

      // Process totalDataChart
      if (data.totalDataChart) {
        data.totalDataChart.forEach((point: any, index: number) => {
          result[index] = {
            timestamp: new Date(point[0] * 1000).toISOString(),
            total_dex_volume: point[1],
          };
        });
      }

      // Process breakdown data
      if (data.totalDataChartBreakdown) {
        data.totalDataChartBreakdown.forEach((point: any, index: number) => {
          if (!result[index]) {
            result[index] = {
              timestamp: new Date(point[0] * 1000).toISOString(),
            };
          }
          
          Object.entries(point[1]).forEach(([protocol, volume]: [string, any]) => {
            result[index][protocol] = Number(volume) || 0;
          });
        });
      }

      return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching total DEX volume:', error);
      return [];
    }
  }

  async getChainDexsOverview(chain: string, dataType: string = "dailyVolume"): Promise<any[]> {
    try {
      const params = {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
        dataType,
      };

      const data = await this.fetchData<{ protocols: any[] }>(`${this.baseUrl}/overview/dexs/${chain}`, params);
      
      if (!data.protocols) return [];

      return data.protocols
        .sort((a, b) => (b.totalAllTime || 0) - (a.totalAllTime || 0))
        .map((protocol) => ({
          name: protocol.name,
          totalAllTime: protocol.totalAllTime || 0,
          ...protocol,
        }));
    } catch (error) {
      console.error(`Error fetching DEXs overview for ${chain}:`, error);
      return [];
    }
  }

  // Fees and Revenue Methods
  async getFeesOverview(): Promise<any[]> {
    try {
      const params = {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
        dataType: "dailyFees",
      };

      const data = await this.fetchData<{ protocols: any[] }>(`${this.baseUrl}/overview/fees`, params);
      
      if (!data.protocols) return [];

      return data.protocols
        .sort((a, b) => (b.totalAllTime || 0) - (a.totalAllTime || 0))
        .map((protocol) => ({
          name: protocol.name,
          totalAllTime: protocol.totalAllTime || 0,
          ...protocol,
        }));
    } catch (error) {
      console.error('Error fetching fees overview:', error);
      return [];
    }
  }

  async getRevenueOverview(): Promise<any[]> {
    try {
      const params = {
        excludeTotalDataChart: "true",
        excludeTotalDataChartBreakdown: "true",
        dataType: "dailyRevenue",
      };

      const data = await this.fetchData<{ protocols: any[] }>(`${this.baseUrl}/overview/fees`, params);
      
      if (!data.protocols) return [];

      return data.protocols
        .sort((a, b) => (b.totalAllTime || 0) - (a.totalAllTime || 0))
        .map((protocol) => ({
          name: protocol.name,
          totalAllTime: protocol.totalAllTime || 0,
          ...protocol,
        }));
    } catch (error) {
      console.error('Error fetching revenue overview:', error);
      return [];
    }
  }

  async getTotalCryptoFees(daily: boolean = true): Promise<VolumeData[]> {
    try {
      const dataType = daily ? "dailyFees" : "totalFees";
      const params = {
        excludeTotalDataChart: "false",
        excludeTotalDataChartBreakdown: "false",
        dataType,
      };

      const data = await this.fetchData<any>(`${this.baseUrl}/overview/fees`, params);
      
      const result: VolumeData[] = [];

      // Process totalDataChart
      if (data.totalDataChart) {
        data.totalDataChart.forEach((point: any, index: number) => {
          result[index] = {
            timestamp: new Date(point[0] * 1000).toISOString(),
            total_crypto_fees: point[1],
          };
        });
      }

      // Process breakdown data
      if (data.totalDataChartBreakdown) {
        data.totalDataChartBreakdown.forEach((point: any, index: number) => {
          if (!result[index]) {
            result[index] = {
              timestamp: new Date(point[0] * 1000).toISOString(),
            };
          }
          
          Object.entries(point[1]).forEach(([protocol, fees]: [string, any]) => {
            result[index][protocol] = Number(fees) || 0;
          });
        });
      }

      return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching total crypto fees:', error);
      return [];
    }
  }

  async getTotalCryptoRevenue(daily: boolean = true): Promise<VolumeData[]> {
    try {
      const dataType = daily ? "dailyRevenue" : "totalRevenue";
      const params = {
        excludeTotalDataChart: "false",
        excludeTotalDataChartBreakdown: "false",
        dataType,
      };

      const data = await this.fetchData<any>(`${this.baseUrl}/overview/fees`, params);
      
      const result: VolumeData[] = [];

      // Process totalDataChart
      if (data.totalDataChart) {
        data.totalDataChart.forEach((point: any, index: number) => {
          result[index] = {
            timestamp: new Date(point[0] * 1000).toISOString(),
            total_crypto_revenue: point[1],
          };
        });
      }

      // Process breakdown data
      if (data.totalDataChartBreakdown) {
        data.totalDataChartBreakdown.forEach((point: any, index: number) => {
          if (!result[index]) {
            result[index] = {
              timestamp: new Date(point[0] * 1000).toISOString(),
            };
          }
          
          Object.entries(point[1]).forEach(([protocol, revenue]: [string, any]) => {
            result[index][protocol] = Number(revenue) || 0;
          });
        });
      }

      return result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching total crypto revenue:', error);
      return [];
    }
  }

  // Utility Methods
  async nameToSlug(protocolNames: string[]): Promise<Record<string, string>> {
    try {
      const protocols = await this.getAllProtocols();
      const nameToSlugMap: Record<string, string> = {};
      
      protocols.forEach(protocol => {
        nameToSlugMap[protocol.name] = protocol.slug;
      });

      const result: Record<string, string> = {};
      protocolNames.forEach(name => {
        result[name] = nameToSlugMap[name] || name;
      });

      return result;
    } catch (error) {
      console.error('Error creating name to slug mapping:', error);
      return {};
    }
  }

  // Print all available functions
  printAllFunctions(): string[] {
    const functions = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => name !== 'constructor' && typeof (this as any)[name] === 'function');
    
    console.log('Available DeFiLlama API functions:', functions);
    return functions;
  }
}

// Export default instance
export const defiLlamaAPI = new DeFiLlamaAPI();
export default DeFiLlamaAPI; 