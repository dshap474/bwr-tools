#!/usr/bin/env tsx
/**
 * Script to generate protocol-to-CoinGecko mappings for top 100 DeFi protocols
 * This creates a JSON cache file to avoid repeated API calls
 */

import { DeFiLlamaAPI } from '../lib/api-wrappers/defillama-api-wrapper'
import { CoinGeckoAPI } from '../lib/api-wrappers/coingecko-api-wrapper'
import type { ProtocolMappingResult } from '../lib/api-wrappers/coingecko-api-wrapper'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const TOP_N_PROTOCOLS = 100
const RATE_LIMIT_DELAY = 2000 // 2 seconds between requests
const OUTPUT_FILE = path.join(__dirname, '../data/protocol-mappings.json')

// Excluded protocols (stablecoins, wallets, infrastructure)
const EXCLUDED_PROTOCOLS = [
  'Tether', 
  'Circle', 
  'Phantom', 
  'Coinbase Wallet', 
  'MetaMask',
  'Trust Wallet',
  'Binance Stablecoin',
  'DAI',
  'USDC',
  'USDT',
  'BUSD',
  'TUSD',
  'PAX',
  'GUSD'
]

interface ProtocolMapping {
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

interface MappingCache {
  version: string
  generated_at: string
  total_protocols: number
  mappings: Record<string, ProtocolMapping>
  tokenless_protocols: string[]
  failed_mappings: string[]
  statistics: {
    successful_mappings: number
    partial_mappings: number
    failed_mappings: number
    average_confidence: number
    total_quarterly_revenue: number
  }
}

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function generateProtocolMappings() {
  console.log('🚀 Starting protocol mapping generation...')
  console.log(`📊 Fetching top ${TOP_N_PROTOCOLS} protocols by revenue...`)

  // Initialize APIs
  const defiLlamaAPI = new DeFiLlamaAPI()
  // Use the demo API key to avoid rate limits
  const coinGeckoAPI = new CoinGeckoAPI({
    apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-9qjCJZMPjyJPJF7iw3hbhAkm'
  })

  // Cache for coins list to avoid repeated API calls
  let cachedCoinsList: any[] | null = null

  try {
    // First, fetch and cache the coins list
    console.log('\n🪙 Fetching CoinGecko coins list (this will be cached)...')
    try {
      cachedCoinsList = await coinGeckoAPI.getCoinsList()
      console.log(`✅ Cached ${cachedCoinsList.length} coins from CoinGecko`)
    } catch (error) {
      console.error('❌ Failed to fetch coins list:', error)
      console.log('⚠️  Continuing without coin mappings...')
    }
    // Step 1: Get revenue data from DeFiLlama
    console.log('\n📈 Fetching revenue data from DeFiLlama...')
    const revenueOverview = await defiLlamaAPI.getRevenueOverview()
    
    // Filter out excluded protocols
    const filteredProtocols = revenueOverview
      .filter(protocol => !EXCLUDED_PROTOCOLS.includes(protocol.name))
      .slice(0, TOP_N_PROTOCOLS)

    console.log(`✅ Found ${filteredProtocols.length} protocols after filtering`)

    // Step 2: Map each protocol to CoinGecko
    console.log('\n🔍 Starting protocol mapping to CoinGecko...')
    console.log(`⏱️  This will take approximately ${Math.ceil((filteredProtocols.length * RATE_LIMIT_DELAY) / 60000)} minutes with rate limiting...\n`)

    const mappingCache: MappingCache = {
      version: '1.0',
      generated_at: new Date().toISOString(),
      total_protocols: filteredProtocols.length,
      mappings: {},
      tokenless_protocols: [],
      failed_mappings: [],
      statistics: {
        successful_mappings: 0,
        partial_mappings: 0,
        failed_mappings: 0,
        average_confidence: 0,
        total_quarterly_revenue: 0
      }
    }

    let totalConfidence = 0

    for (let i = 0; i < filteredProtocols.length; i++) {
      const protocol = filteredProtocols[i]
      const protocolName = protocol.name
      const quarterlyRevenue = protocol.totalAllTime || 0
      
      console.log(`\n[${i + 1}/${filteredProtocols.length}] Mapping protocol: ${protocolName}`)
      console.log(`  Revenue: $${quarterlyRevenue.toLocaleString()}`)

      try {
        // Get mapping with confidence scoring
        const mapping: ProtocolMappingResult = await coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocolName)
        
        // Check if this is a tokenless protocol
        const isTokenless = mapping.matchMethod === 'failed' && 
                           mapping.confidence === 0.0 && 
                           mapping.coin === null &&
                           (protocolName.toLowerCase().includes('orderbook') ||
                            protocolName.toLowerCase().includes('slipstream') ||
                            protocolName.toLowerCase().includes('labs') ||
                            protocolName.toLowerCase() === 'axiom')

        // Create mapping entry
        const protocolMapping: ProtocolMapping = {
          coingecko_id: mapping.coin?.id || null,
          symbol: mapping.coin?.symbol?.toUpperCase() || null,
          name: protocolName,
          confidence: mapping.confidence,
          match_method: isTokenless ? 'tokenless' : mapping.matchMethod,
          is_tokenless: isTokenless,
          variations_tried: mapping.searchVariations,
          last_verified: new Date().toISOString(),
          quarterly_revenue: quarterlyRevenue
        }

        // Add to cache
        mappingCache.mappings[protocolName] = protocolMapping

        // Update statistics
        if (isTokenless) {
          mappingCache.tokenless_protocols.push(protocolName)
          console.log(`  ❌ Tokenless protocol (no token exists)`)
        } else if (mapping.confidence >= 0.4 && mapping.coin) {
          mappingCache.statistics.successful_mappings++
          totalConfidence += mapping.confidence
          console.log(`  ✅ Mapped to: ${mapping.coin.name} (${mapping.coin.symbol}) - Confidence: ${(mapping.confidence * 100).toFixed(0)}%`)
        } else if (mapping.coin && mapping.confidence < 0.4) {
          mappingCache.statistics.partial_mappings++
          totalConfidence += mapping.confidence
          console.log(`  ⚠️  Partial match: ${mapping.coin.name} (${mapping.coin.symbol}) - Low confidence: ${(mapping.confidence * 100).toFixed(0)}%`)
        } else {
          mappingCache.statistics.failed_mappings++
          mappingCache.failed_mappings.push(protocolName)
          console.log(`  ❌ No mapping found`)
        }

        mappingCache.statistics.total_quarterly_revenue += quarterlyRevenue

        // Rate limiting
        if (i < filteredProtocols.length - 1) {
          process.stdout.write(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s for rate limit...`)
          await delay(RATE_LIMIT_DELAY)
          process.stdout.write(' Done\n')
        }

      } catch (error) {
        console.error(`  ❌ Error mapping ${protocolName}:`, error)
        mappingCache.failed_mappings.push(protocolName)
        mappingCache.statistics.failed_mappings++
      }
    }

    // Calculate average confidence
    const mappedCount = mappingCache.statistics.successful_mappings + mappingCache.statistics.partial_mappings
    mappingCache.statistics.average_confidence = mappedCount > 0 ? totalConfidence / mappedCount : 0

    // Step 3: Save to JSON file
    console.log('\n💾 Saving mapping cache to file...')
    
    // Ensure data directory exists
    const dataDir = path.dirname(OUTPUT_FILE)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    // Write JSON file with pretty formatting
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mappingCache, null, 2))
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 MAPPING GENERATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`Total protocols processed: ${mappingCache.total_protocols}`)
    console.log(`Successful mappings: ${mappingCache.statistics.successful_mappings} (${((mappingCache.statistics.successful_mappings / mappingCache.total_protocols) * 100).toFixed(1)}%)`)
    console.log(`Partial mappings: ${mappingCache.statistics.partial_mappings} (${((mappingCache.statistics.partial_mappings / mappingCache.total_protocols) * 100).toFixed(1)}%)`)
    console.log(`Failed mappings: ${mappingCache.statistics.failed_mappings} (${((mappingCache.statistics.failed_mappings / mappingCache.total_protocols) * 100).toFixed(1)}%)`)
    console.log(`Tokenless protocols: ${mappingCache.tokenless_protocols.length}`)
    console.log(`Average confidence: ${(mappingCache.statistics.average_confidence * 100).toFixed(1)}%`)
    console.log(`Total quarterly revenue: $${mappingCache.statistics.total_quarterly_revenue.toLocaleString()}`)
    console.log(`\nOutput file: ${OUTPUT_FILE}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Fatal error:', error)
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  generateProtocolMappings()
    .then(() => {
      console.log('\n✅ Script completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error)
      process.exit(1)
    })
}

export { generateProtocolMappings }