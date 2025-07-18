/**
 * Protocol Mapping Service
 * Manages cached protocol-to-CoinGecko mappings to reduce API calls
 */

import { CoinGeckoAPI } from '../api-wrappers/coingecko-api-wrapper'
import type { ProtocolMappingResult, CoinGeckoCoinInfo } from '../api-wrappers/coingecko-api-wrapper'
import protocolMappings from '../../data/protocol-mappings.json'

interface ProtocolMappingEntry {
  coingecko_id: string | null
  symbol: string | null
  name: string
  confidence: number
  match_method: string
  is_tokenless: boolean
  variations_tried: string[]
  last_verified: string
  quarterly_revenue?: number
}

interface MappingStatistics {
  total_lookups: number
  cache_hits: number
  cache_misses: number
  api_calls: number
  cache_hit_rate: number
  last_reset: Date
}

export class ProtocolMappingService {
  private mappingCache: Map<string, ProtocolMappingEntry>
  private coinGeckoAPI: CoinGeckoAPI
  private statistics: MappingStatistics
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.4

  constructor(coinGeckoAPI?: CoinGeckoAPI) {
    // Initialize cache from JSON file
    this.mappingCache = new Map()
    this.loadMappingsFromFile()
    
    // Initialize CoinGecko API
    this.coinGeckoAPI = coinGeckoAPI || new CoinGeckoAPI({
      apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-9qjCJZMPjyJPJF7iw3hbhAkm'
    })
    
    // Initialize statistics
    this.statistics = {
      total_lookups: 0,
      cache_hits: 0,
      cache_misses: 0,
      api_calls: 0,
      cache_hit_rate: 0,
      last_reset: new Date()
    }
  }

  /**
   * Load mappings from the JSON file into memory
   */
  private loadMappingsFromFile(): void {
    try {
      const mappings = protocolMappings.mappings as Record<string, ProtocolMappingEntry>
      
      for (const [protocol, mapping] of Object.entries(mappings)) {
        // Store with lowercase key for case-insensitive lookup
        this.mappingCache.set(protocol.toLowerCase(), mapping)
        // Also store with original case
        this.mappingCache.set(protocol, mapping)
      }
      
      console.log(`📚 Loaded ${this.mappingCache.size / 2} protocol mappings from cache`)
    } catch (error) {
      console.error('❌ Failed to load protocol mappings:', error)
    }
  }

  /**
   * Get protocol mapping from cache or API
   */
  async getProtocolMapping(protocolName: string): Promise<ProtocolMappingResult> {
    this.statistics.total_lookups++
    
    // Check cache first (case-insensitive)
    const cachedMapping = this.mappingCache.get(protocolName) || 
                         this.mappingCache.get(protocolName.toLowerCase())
    
    if (cachedMapping) {
      this.statistics.cache_hits++
      this.updateCacheHitRate()
      
      // Convert cached format to ProtocolMappingResult
      const coin: CoinGeckoCoinInfo | null = cachedMapping.coingecko_id ? {
        id: cachedMapping.coingecko_id,
        symbol: cachedMapping.symbol || '',
        name: cachedMapping.name,
        platforms: {}
      } : null
      
      return {
        coin,
        confidence: cachedMapping.confidence,
        matchMethod: cachedMapping.match_method as any,
        searchVariations: cachedMapping.variations_tried
      }
    }
    
    // Cache miss - fetch from API
    this.statistics.cache_misses++
    this.statistics.api_calls++
    this.updateCacheHitRate()
    
    console.log(`🔍 Cache miss for "${protocolName}" - fetching from API...`)
    
    try {
      const mapping = await this.coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocolName)
      
      // Add to cache for future use
      if (mapping.confidence >= this.MIN_CONFIDENCE_THRESHOLD || mapping.matchMethod === 'failed') {
        this.addMapping(protocolName, mapping)
      }
      
      return mapping
    } catch (error) {
      console.error(`❌ Failed to fetch mapping for ${protocolName}:`, error)
      return {
        coin: null,
        confidence: 0,
        matchMethod: 'failed',
        searchVariations: []
      }
    }
  }

  /**
   * Get multiple protocol mappings efficiently
   */
  async getProtocolMappings(protocolNames: string[]): Promise<Map<string, ProtocolMappingResult>> {
    const results = new Map<string, ProtocolMappingResult>()
    const uncachedProtocols: string[] = []
    
    // First pass: check cache
    for (const protocol of protocolNames) {
      const cachedMapping = await this.getProtocolMapping(protocol)
      if (cachedMapping.confidence > 0 || cachedMapping.matchMethod === 'tokenless') {
        results.set(protocol, cachedMapping)
      } else {
        uncachedProtocols.push(protocol)
      }
    }
    
    // Second pass: batch fetch uncached protocols (if needed)
    if (uncachedProtocols.length > 0) {
      console.log(`📡 Fetching ${uncachedProtocols.length} uncached protocols from API...`)
      
      for (const protocol of uncachedProtocols) {
        const mapping = await this.getProtocolMapping(protocol)
        results.set(protocol, mapping)
        
        // Rate limiting
        if (uncachedProtocols.indexOf(protocol) < uncachedProtocols.length - 1) {
          await this.delay(2000) // 2 second delay between API calls
        }
      }
    }
    
    return results
  }

  /**
   * Add a new mapping to the cache
   */
  addMapping(protocolName: string, mapping: ProtocolMappingResult): void {
    const entry: ProtocolMappingEntry = {
      coingecko_id: mapping.coin?.id || null,
      symbol: mapping.coin?.symbol || null,
      name: protocolName,
      confidence: mapping.confidence,
      match_method: mapping.matchMethod,
      is_tokenless: mapping.matchMethod === 'failed' && mapping.confidence === 0,
      variations_tried: mapping.searchVariations,
      last_verified: new Date().toISOString()
    }
    
    // Store with both original and lowercase keys
    this.mappingCache.set(protocolName, entry)
    this.mappingCache.set(protocolName.toLowerCase(), entry)
    
    console.log(`💾 Added mapping for "${protocolName}" to cache`)
  }

  /**
   * Check if a protocol is tokenless
   */
  isTokenlessProtocol(protocolName: string): boolean {
    const mapping = this.mappingCache.get(protocolName) || 
                   this.mappingCache.get(protocolName.toLowerCase())
    
    return mapping?.is_tokenless || false
  }

  /**
   * Get mapping statistics
   */
  getMappingStatistics(): MappingStatistics {
    return { ...this.statistics }
  }

  /**
   * Reset statistics
   */
  resetStatistics(): void {
    this.statistics = {
      total_lookups: 0,
      cache_hits: 0,
      cache_misses: 0,
      api_calls: 0,
      cache_hit_rate: 0,
      last_reset: new Date()
    }
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    // Divide by 2 because we store each mapping twice (original and lowercase)
    return this.mappingCache.size / 2
  }

  /**
   * Update cache hit rate
   */
  private updateCacheHitRate(): void {
    if (this.statistics.total_lookups > 0) {
      this.statistics.cache_hit_rate = 
        (this.statistics.cache_hits / this.statistics.total_lookups) * 100
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Export current cache to JSON format
   */
  exportCacheToJSON(): string {
    const mappings: Record<string, ProtocolMappingEntry> = {}
    const tokenlessProtocols: string[] = []
    const processedKeys = new Set<string>()
    
    // Export unique mappings only (skip duplicates from lowercase storage)
    for (const [key, value] of this.mappingCache.entries()) {
      const normalizedKey = value.name // Use the original name from the entry
      if (!processedKeys.has(normalizedKey)) {
        mappings[normalizedKey] = value
        processedKeys.add(normalizedKey)
        
        if (value.is_tokenless) {
          tokenlessProtocols.push(normalizedKey)
        }
      }
    }
    
    const exportData = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      total_protocols: Object.keys(mappings).length,
      mappings,
      tokenless_protocols: tokenlessProtocols,
      statistics: {
        ...this.statistics,
        cache_size: this.getCacheSize()
      }
    }
    
    return JSON.stringify(exportData, null, 2)
  }
}

// Export singleton instance
export const protocolMappingService = new ProtocolMappingService()
export default ProtocolMappingService