/**
 * Protocol Mapping Service
 * Manages cached protocol-to-CoinGecko mappings to reduce API calls
 */

import { CoinGeckoAPI } from '../api-wrappers/coingecko-api-wrapper'
import type { ProtocolMappingResult, CoinGeckoCoinInfo } from '../api-wrappers/coingecko-api-wrapper'
import { DeFiLlamaAPI } from '../api-wrappers/defillama-api-wrapper'
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
  defillama_slug?: string | null
  defillama_name?: string | null
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
  private defiLlamaAPI: DeFiLlamaAPI
  private statistics: MappingStatistics
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.4

  constructor(coinGeckoAPI?: CoinGeckoAPI, defiLlamaAPI?: DeFiLlamaAPI) {
    // Initialize cache from JSON file
    this.mappingCache = new Map()
    this.loadMappingsFromFile()
    
    // Initialize CoinGecko API
    this.coinGeckoAPI = coinGeckoAPI || new CoinGeckoAPI({
      apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-9qjCJZMPjyJPJF7iw3hbhAkm'
    })
    
    // Initialize DeFiLlama API
    this.defiLlamaAPI = defiLlamaAPI || new DeFiLlamaAPI()
    
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
      
      // Try to find DeFiLlama protocol
      const defiLlamaProtocol = await this.findDeFiLlamaProtocol(protocolName)
      
      // Add to cache for future use
      if (mapping.confidence >= this.MIN_CONFIDENCE_THRESHOLD || mapping.matchMethod === 'failed') {
        this.addMapping(protocolName, mapping, defiLlamaProtocol)
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
   * Enhanced protocol mapping with name normalization
   */
  async getProtocolMappingWithNormalization(protocolName: string): Promise<ProtocolMappingResult> {
    // First try direct mapping
    let mapping = await this.getProtocolMapping(protocolName)
    
    // If failed or low confidence, try normalized variations
    if (mapping.confidence < this.MIN_CONFIDENCE_THRESHOLD) {
      const variations = this.generateProtocolNameVariations(protocolName)
      
      for (const variation of variations) {
        const variationMapping = await this.getProtocolMapping(variation)
        if (variationMapping.confidence >= this.MIN_CONFIDENCE_THRESHOLD) {
          console.log(`🔄 Found mapping via variation: "${protocolName}" -> "${variation}" -> ${variationMapping.coin?.symbol}`)
          // Update the original name mapping with the successful variation
          this.addMapping(protocolName, variationMapping)
          return variationMapping
        }
      }
    }
    
    return mapping
  }

  /**
   * Generate protocol name variations for better matching
   */
  private generateProtocolNameVariations(protocolName: string): string[] {
    const variations: string[] = []
    const name = protocolName.toLowerCase().trim()
    
    // Handle specific protocol variations
    if (name.includes('hyperliquid')) {
      variations.push('Hyperliquid', 'hyperliquid')
    }
    
    if (name.includes('pancakeswap') || name.includes('cake')) {
      variations.push('PancakeSwap', 'pancakeswap')
    }
    
    if (name.includes('uniswap')) {
      variations.push('Uniswap', 'uniswap')
    }
    
    if (name.includes('aave')) {
      variations.push('AAVE', 'aave', 'Aave')
    }
    
    if (name.includes('lido')) {
      variations.push('Lido', 'lido')
    }
    
    if (name.includes('raydium')) {
      variations.push('Raydium', 'raydium')
    }
    
    if (name.includes('jupiter')) {
      variations.push('Jupiter', 'jupiter')
    }
    
    if (name.includes('aerodrome')) {
      variations.push('Aerodrome', 'aerodrome')
    }
    
    if (name.includes('pendle')) {
      variations.push('Pendle', 'pendle')
    }
    
    // Remove duplicates and the original name
    return [...new Set(variations)].filter(v => v.toLowerCase() !== name)
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
      if (cachedMapping.confidence > 0 || cachedMapping.matchMethod === 'failed') {
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
  addMapping(
    protocolName: string, 
    mapping: ProtocolMappingResult, 
    defiLlamaProtocol?: { name: string; slug: string } | null
  ): void {
    const entry: ProtocolMappingEntry = {
      coingecko_id: mapping.coin?.id || null,
      symbol: mapping.coin?.symbol || null,
      name: protocolName,
      confidence: mapping.confidence,
      match_method: mapping.matchMethod,
      is_tokenless: mapping.matchMethod === 'failed' && mapping.confidence === 0,
      variations_tried: mapping.searchVariations,
      last_verified: new Date().toISOString(),
      defillama_slug: defiLlamaProtocol?.slug || null,
      defillama_name: defiLlamaProtocol?.name || null
    }
    
    // Store with both original and lowercase keys
    this.mappingCache.set(protocolName, entry)
    this.mappingCache.set(protocolName.toLowerCase(), entry)
    
    console.log(`💾 Added mapping for "${protocolName}" to cache${defiLlamaProtocol ? ` (DeFiLlama: ${defiLlamaProtocol.name})` : ''}`)
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
   * Get DeFiLlama TVL data for a protocol
   */
  async getDeFiLlamaTVL(protocolName: string): Promise<any> {
    const mapping = this.mappingCache.get(protocolName) || 
                   this.mappingCache.get(protocolName.toLowerCase())
    
    if (!mapping?.defillama_slug) {
      console.warn(`⚠️ No DeFiLlama slug found for ${protocolName}`)
      return null
    }
    
    try {
      const tvlData = await this.defiLlamaAPI.getProtocolTVL(mapping.defillama_slug)
      return tvlData
    } catch (error) {
      console.error(`❌ Failed to fetch DeFiLlama TVL for ${protocolName}:`, error)
      return null
    }
  }

  /**
   * Get DeFiLlama slug for a protocol
   */
  getDeFiLlamaSlug(protocolName: string): string | null {
    const mapping = this.mappingCache.get(protocolName) || 
                   this.mappingCache.get(protocolName.toLowerCase())
    
    return mapping?.defillama_slug || null
  }

  /**
   * Get DeFiLlama name for a protocol
   */
  getDeFiLlamaName(protocolName: string): string | null {
    const mapping = this.mappingCache.get(protocolName) || 
                   this.mappingCache.get(protocolName.toLowerCase())
    
    return mapping?.defillama_name || null
  }

  /**
   * Get CoinGecko ID for a protocol
   */
  getCoinGeckoId(protocolName: string): string | null {
    const mapping = this.mappingCache.get(protocolName) || 
                   this.mappingCache.get(protocolName.toLowerCase())
    
    return mapping?.coingecko_id || null
  }

  /**
   * Enhance existing mappings with DeFiLlama data
   */
  async enhanceMappingsWithDeFiLlama(protocolNames: string[]): Promise<void> {
    console.log(`🔍 Enhancing ${protocolNames.length} protocols with DeFiLlama data...`)
    
    for (const protocolName of protocolNames) {
      const mapping = this.mappingCache.get(protocolName) || 
                     this.mappingCache.get(protocolName.toLowerCase())
      
      if (mapping && !mapping.defillama_slug) {
        try {
          const defiLlamaProtocol = await this.findDeFiLlamaProtocol(protocolName)
          
          if (defiLlamaProtocol) {
            // Update existing mapping with DeFiLlama data
            mapping.defillama_slug = defiLlamaProtocol.slug
            mapping.defillama_name = defiLlamaProtocol.name
            mapping.last_verified = new Date().toISOString()
            
            // Update cache entries
            this.mappingCache.set(protocolName, mapping)
            this.mappingCache.set(protocolName.toLowerCase(), mapping)
            
            console.log(`✅ Enhanced ${protocolName} with DeFiLlama: ${defiLlamaProtocol.name}`)
          }
          
          // Rate limiting
          await this.delay(1000) // 1 second delay between API calls
        } catch (error) {
          console.error(`❌ Failed to enhance ${protocolName} with DeFiLlama data:`, error)
        }
      }
    }
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
   * Find DeFiLlama protocol by name
   */
  private async findDeFiLlamaProtocol(protocolName: string): Promise<{ name: string; slug: string } | null> {
    try {
      const protocols = await this.defiLlamaAPI.getAllProtocols()
      
      // Try exact match first
      let found = protocols.find(p => 
        p.name.toLowerCase() === protocolName.toLowerCase()
      )
      
      // Try partial match if exact not found
      if (!found) {
        found = protocols.find(p => 
          p.name.toLowerCase().includes(protocolName.toLowerCase()) ||
          protocolName.toLowerCase().includes(p.name.toLowerCase())
        )
      }
      
      // Try fuzzy match for common variations
      if (!found) {
        const cleanedName = this.cleanProtocolName(protocolName)
        found = protocols.find(p => {
          const cleanedProtocolName = this.cleanProtocolName(p.name)
          return cleanedProtocolName.includes(cleanedName) || 
                 cleanedName.includes(cleanedProtocolName)
        })
      }
      
      return found ? { name: found.name, slug: found.slug } : null
    } catch (error) {
      console.error(`❌ Failed to find DeFiLlama protocol for ${protocolName}:`, error)
      return null
    }
  }

  /**
   * Clean protocol name for better matching
   */
  private cleanProtocolName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .replace(/\s+/g, '') // Remove spaces
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
    const defillamaMappings: string[] = []
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
        
        if (value.defillama_slug) {
          defillamaMappings.push(normalizedKey)
        }
      }
    }
    
    const exportData = {
      version: '1.1',
      generated_at: new Date().toISOString(),
      total_protocols: Object.keys(mappings).length,
      mappings,
      tokenless_protocols: tokenlessProtocols,
      defillama_mappings: defillamaMappings,
      statistics: {
        ...this.statistics,
        cache_size: this.getCacheSize(),
        defillama_coverage: defillamaMappings.length
      }
    }
    
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Load token mappings from CSV data (utility for future integration)
   * Expected CSV format: protocol_name,token_symbol,coingecko_id,confidence
   */
  async loadTokenMappingsFromCSV(csvData: string): Promise<void> {
    try {
      const lines = csvData.trim().split('\n')
      const headers = lines[0].toLowerCase().split(',')
      
      // Check if CSV has expected format
      const requiredHeaders = ['protocol_name', 'token_symbol', 'coingecko_id']
      const hasRequiredHeaders = requiredHeaders.every(header => 
        headers.some(h => h.includes(header) || h.includes(header.replace('_', '')))
      )
      
      if (!hasRequiredHeaders) {
        console.warn('⚠️  CSV does not contain expected token mapping headers:', headers)
        console.warn('📋 Expected headers should include: protocol_name, token_symbol, coingecko_id')
        return
      }
      
      // Parse CSV data
      let loadedCount = 0
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',')
        if (values.length >= 3) {
          const protocolName = values[0]?.trim()
          const tokenSymbol = values[1]?.trim()
          const coingeckoId = values[2]?.trim()
          const confidence = parseFloat(values[3]) || 0.9
          
          if (protocolName && tokenSymbol && coingeckoId) {
            // Create mapping entry
            const entry: ProtocolMappingEntry = {
              coingecko_id: coingeckoId,
              symbol: tokenSymbol,
              name: protocolName,
              confidence: confidence,
              match_method: 'csv_import',
              is_tokenless: false,
              variations_tried: ['csv_import'],
              last_verified: new Date().toISOString()
            }
            
            // Add to cache
            this.mappingCache.set(protocolName, entry)
            this.mappingCache.set(protocolName.toLowerCase(), entry)
            loadedCount++
          }
        }
      }
      
      console.log(`✅ Loaded ${loadedCount} token mappings from CSV data`)
    } catch (error) {
      console.error('❌ Failed to load token mappings from CSV:', error)
    }
  }

  /**
   * Check if dataset.csv contains token mapping data
   */
  async validateDatasetForTokenMappings(csvData: string): Promise<boolean> {
    try {
      const lines = csvData.trim().split('\n')
      if (lines.length < 2) return false
      
      const headers = lines[0].toLowerCase().split(',')
      console.log('📊 Dataset.csv headers detected:', headers)
      
      // Check if this looks like token mapping data
      const tokenMappingHeaders = ['protocol', 'token', 'symbol', 'coingecko', 'mapping']
      const hasTokenMappingHeaders = tokenMappingHeaders.some(keyword =>
        headers.some(header => header.includes(keyword))
      )
      
      if (!hasTokenMappingHeaders) {
        console.log('ℹ️  Dataset.csv appears to contain different data (not token mappings)')
        console.log('📋 Current headers suggest this is:', this.identifyDatasetType(headers))
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ Failed to validate dataset:', error)
      return false
    }
  }

  /**
   * Identify the type of data in dataset.csv
   */
  private identifyDatasetType(headers: string[]): string {
    if (headers.some(h => h.includes('fee') || h.includes('txfee'))) {
      return 'Transaction fee data'
    }
    if (headers.some(h => h.includes('price') || h.includes('ohlc'))) {
      return 'Price/OHLC data'
    }
    if (headers.some(h => h.includes('volume') || h.includes('tvl'))) {
      return 'Volume/TVL data'
    }
    if (headers.some(h => h.includes('revenue') || h.includes('earnings'))) {
      return 'Revenue/earnings data'
    }
    return 'Unknown data type'
  }
}

// Export singleton instance
export const protocolMappingService = new ProtocolMappingService()
export default ProtocolMappingService