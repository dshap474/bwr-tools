// Artemis API TypeScript Client
// A comprehensive wrapper for the Artemis Analytics API

interface ArtemisAsset {
  artemis_id: string;
  symbol: string;
  coingecko_id?: string;
  title: string;
  color?: string;
  ticker?: string;
}

interface ArtemisMetric {
  label: string;
  tags: string[];
  data_source: string;
  aggregation_type: string;
  description: string;
  methodology?: string;
}

interface ArtemisMetricResponse {
  metrics: ArtemisMetric[];
}

interface ArtemisDataPoint {
  date: string;
  val: number;
}

interface ArtemisDataResponse {
  data: {
    symbols: {
      [symbol: string]: {
        [metricName: string]: ArtemisDataPoint[];
      };
    };
  };
}

interface ArtemisApiOptions {
  baseUrl?: string;
  apiKey?: string;
  timeout?: number;
}

export class ArtemisAPI {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;

  constructor(options: ArtemisApiOptions = {}) {
    this.baseUrl = options.baseUrl || 'https://api.artemisxyz.com';
    this.apiKey = options.apiKey || process.env.NEXT_PUBLIC_ARTEMIS_API_KEY || process.env.ARTEMIS_API_KEY || '';
    this.timeout = options.timeout || 30000;

    if (!this.apiKey) {
      console.warn('Artemis API key not provided. Set NEXT_PUBLIC_ARTEMIS_API_KEY environment variable for client-side usage.');
    }
  }

  private async fetchData<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    try {
      const url = new URL(endpoint, this.baseUrl);
      
      // Add API key to params
      const searchParams = new URLSearchParams({
        api_key: this.apiKey,
        ...params
      });

      url.search = searchParams.toString();

      console.log(`Artemis API Call: ${url.toString()}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        // Only log detailed errors for non-auth issues to reduce noise
        if (response.status !== 403) {
          console.error(`Artemis API Error - Status: ${response.status}, Response: ${errorText}`);
        }
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      // Only log non-auth errors to reduce noise
      if (!(error instanceof Error) || !error.message?.includes('403')) {
        console.error(`Error fetching data from ${endpoint}:`, error);
      }
      throw error;
    }
  }

  // Asset Management Methods
  async listSupportedAssets(): Promise<ArtemisAsset[]> {
    try {
      const response = await this.fetchData<{ assets: ArtemisAsset[] }>('/asset-symbols');
      return response.assets || [];
    } catch (error) {
      console.error('Error fetching supported assets:', error);
      return [];
    }
  }

  async listSupportedMetrics(symbol: string): Promise<ArtemisMetric[]> {
    try {
      const response = await this.fetchData<ArtemisMetricResponse>('/supported-metrics/', {
        symbol: symbol.toLowerCase()
      });
      return response.metrics || [];
    } catch (error) {
      console.error(`Error fetching supported metrics for ${symbol}:`, error);
      return [];
    }
  }

  // Data Fetching Methods
  async fetchMetrics(
    metricNames: string | string[],
    symbols: string | string[],
    options: {
      startDate?: string;
      endDate?: string;
      summarize?: boolean;
    } = {}
  ): Promise<ArtemisDataResponse> {
    try {
      const metricNamesStr = Array.isArray(metricNames) ? metricNames.join(',') : metricNames;
      const symbolsStr = Array.isArray(symbols) ? symbols.join(',') : symbols;

      const params: Record<string, string> = {
        symbols: symbolsStr.toLowerCase()
      };

      if (options.startDate) {
        params.startDate = options.startDate;
      }
      if (options.endDate) {
        params.endDate = options.endDate;
      }
      if (options.summarize) {
        params.summarize = 'true';
      }

      const response = await this.fetchData<ArtemisDataResponse>(
        `/data/${metricNamesStr}`,
        params
      );

      return response;
    } catch (error) {
      // Only log non-auth errors to reduce noise
      if (!(error instanceof Error) || !error.message?.includes('403')) {
        console.error('Error fetching metrics:', error);
      }
      return {
        data: {
          symbols: {}
        }
      };
    }
  }

  // Convenience Methods for Common Metrics
  async getPriceData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('PRICE', symbols, { startDate, endDate });
  }

  async getMarketCapData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('MC', symbols, { startDate, endDate });
  }

  async getVolumeData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('24H_VOLUME', symbols, { startDate, endDate });
  }

  async getTVLData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('TVL', symbols, { startDate, endDate });
  }

  async getRevenueData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('REVENUE', symbols, { startDate, endDate });
  }

  async getFeesData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('FEES', symbols, { startDate, endDate });
  }

  async getActiveUsersData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('DAU', symbols, { startDate, endDate });
  }

  async getTransactionData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    return this.fetchMetrics('DAILY_TXNS', symbols, { startDate, endDate });
  }

  // Multi-metric convenience method
  async getComprehensiveData(
    symbols: string | string[],
    startDate?: string,
    endDate?: string
  ): Promise<ArtemisDataResponse> {
    const metrics = ['PRICE', 'MC', '24H_VOLUME', 'TVL', 'REVENUE', 'FEES', 'DAU'];
    return this.fetchMetrics(metrics, symbols, { startDate, endDate });
  }

  // Utility Methods
  async searchAssets(query: string): Promise<ArtemisAsset[]> {
    try {
      const allAssets = await this.listSupportedAssets();
      const queryLower = query.toLowerCase();
      
      return allAssets.filter(asset => 
        asset.symbol.toLowerCase().includes(queryLower) ||
        asset.title.toLowerCase().includes(queryLower) ||
        asset.artemis_id.toLowerCase().includes(queryLower)
      );
    } catch (error) {
      console.error('Error searching assets:', error);
      return [];
    }
  }

  async getAssetBySymbol(symbol: string): Promise<ArtemisAsset | null> {
    try {
      const allAssets = await this.listSupportedAssets();
      return allAssets.find(asset => 
        asset.symbol.toLowerCase() === symbol.toLowerCase()
      ) || null;
    } catch (error) {
      console.error(`Error finding asset ${symbol}:`, error);
      return null;
    }
  }

  // Helper method to format dates for API calls
  formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  // Helper method to get date range
  getDateRange(days: number): { startDate: string; endDate: string } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return {
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };
  }

  // Check if API key has data access (not just metadata)
  async hasDataAccess(): Promise<boolean> {
    try {
      // Try to get a simple data point to test access
      const response = await this.fetchMetrics('PRICE', 'eth', {});
      return response.data && Object.keys(response.data.symbols).length > 0;
    } catch (error) {
      return false;
    }
  }

  // Print all available methods
  printAvailableMethods(): string[] {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this))
      .filter(name => name !== 'constructor' && typeof (this as any)[name] === 'function');
    
    console.log('Available Artemis API methods:', methods);
    return methods;
  }
}

// Export default instance
export const artemisAPI = new ArtemisAPI();
export default ArtemisAPI;