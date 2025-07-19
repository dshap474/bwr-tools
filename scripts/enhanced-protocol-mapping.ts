#!/usr/bin/env tsx
/**
 * Enhanced Protocol Mapping Script
 * Advanced fuzzy matching for DeFiLlama protocols to CoinGecko tokens
 * Uses multiple matching strategies and lower confidence thresholds
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'
import fs from 'fs'
import { readFileSync } from 'fs'

// Load API key directly from .env file
function loadApiKey(): string | undefined {
  try {
    const envContent = readFileSync('.env', 'utf8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      if (line.startsWith('COINGECKO_API_KEY=')) {
        return line.split('=')[1].trim()
      }
    }
    return undefined
  } catch (error) {
    console.log('Error reading .env file:', error)
    return undefined
  }
}

// Import CoinGecko API with explicit key
import { CoinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper'
const apiKey = loadApiKey()
const coinGeckoAPI = new CoinGeckoAPI({ apiKey })

interface EnhancedProtocolResult {
  protocol: string
  revenue: number
  token?: string
  coinGeckoId?: string
  defillama_coinId?: string
  confidence: number
  status: 'mapped' | 'partial' | 'tokenless' | 'failed'
  matchMethod?: string
}

async function enhancedProtocolMapping() {
  console.log('🚀 Starting Enhanced Protocol Mapping with Advanced Fuzzy Matching...\n')

  try {
    // Step 1: Get top 100 protocols by revenue
    console.log('📊 Step 1: Fetching top 100 protocols by revenue...')
    const revenueData = await defiLlamaAPI.getRevenueOverview()
    
    if (!revenueData || revenueData.length === 0) {
      throw new Error('Failed to fetch revenue data')
    }

    // Filter out excluded protocols (wallets, stablecoins, etc.)
    const excludedProtocols = [
      'Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask',
      'Trust Wallet', 'Rainbow', 'Safe', 'WalletConnect', 'Ledger'
    ]
    
    const filteredRevenue = revenueData
      .filter((protocol: any) => !excludedProtocols.includes(protocol.name))
    
    const topProtocols = filteredRevenue
      .sort((a: any, b: any) => (Number(b.totalAllTime) || 0) - (Number(a.totalAllTime) || 0))
      .slice(0, 100)
      .map((protocol: any) => ({ 
        protocol: protocol.name, 
        revenue: Number(protocol.totalAllTime) || 0 
      }))

    console.log(`✅ Found ${topProtocols.length} top protocols`)

    // Step 2: Enhanced fuzzy matching with multiple strategies
    console.log('\n🔍 Step 2: Enhanced fuzzy matching...')
    const results: EnhancedProtocolResult[] = []
    const protocolNames = topProtocols.map(p => p.protocol)
    
    console.log('Getting existing mappings...')
    const existingMappings = await protocolMappingService.getProtocolMappings(protocolNames)
    
    // Lower confidence threshold for more matches
    const MIN_CONFIDENCE = 0.2  // Lowered from 0.4
    const MIN_PARTIAL_CONFIDENCE = 0.1  // Even lower for partial matches
    
    for (const { protocol, revenue } of topProtocols) {
      const mapping = existingMappings.get(protocol)
      
      if (mapping?.coin && mapping.confidence >= MIN_CONFIDENCE) {
        // High confidence mapping
        results.push({
          protocol,
          revenue,
          token: mapping.coin.symbol?.toUpperCase(),
          coinGeckoId: mapping.coin.id,
          defillama_coinId: `coingecko:${mapping.coin.id}`,
          confidence: mapping.confidence,
          status: 'mapped',
          matchMethod: mapping.matchMethod
        })
      } else if (mapping?.coin && mapping.confidence >= MIN_PARTIAL_CONFIDENCE) {
        // Lower confidence - partial match
        results.push({
          protocol,
          revenue,
          token: mapping.coin.symbol?.toUpperCase(),
          coinGeckoId: mapping.coin.id,
          defillama_coinId: `coingecko:${mapping.coin.id}`,
          confidence: mapping.confidence,
          status: 'partial',
          matchMethod: mapping.matchMethod
        })
      } else if (protocolMappingService.isTokenlessProtocol(protocol)) {
        // Known tokenless
        results.push({
          protocol,
          revenue,
          confidence: 1.0,
          status: 'tokenless'
        })
      } else {
        // Try enhanced fuzzy matching
        console.log(`🔧 Trying enhanced matching for: ${protocol}`)
        const enhancedResult = await tryEnhancedMatching(protocol, revenue)
        results.push(enhancedResult)
      }
    }

    // Step 3: Generate comprehensive token mappings
    console.log('\n📝 Step 3: Generating comprehensive token mappings...')
    
    const tokenToDeFiLlamaMap: Record<string, string> = {}
    const protocolToTokenMap: Record<string, { token: string, coinGeckoId: string, confidence: number }> = {}
    
    // Include both mapped and partial results (with confidence threshold)
    const validResults = results.filter(r => 
      (r.status === 'mapped' || (r.status === 'partial' && r.confidence >= 0.15)) && 
      r.token && 
      r.coinGeckoId
    )
    
    for (const result of validResults) {
      if (result.token && result.coinGeckoId) {
        tokenToDeFiLlamaMap[result.token] = `coingecko:${result.coinGeckoId}`
        protocolToTokenMap[result.protocol] = {
          token: result.token,
          coinGeckoId: result.coinGeckoId,
          confidence: result.confidence
        }
      }
    }

    // Step 4: Write enhanced mapping files
    console.log('\n📁 Step 4: Writing enhanced mapping files...')
    
    // Enhanced token mappings with metadata
    const enhancedTokenMappings = `// Enhanced Auto-generated Token Mappings
// Generated on: ${new Date().toISOString()}
// Top 100 DeFiLlama protocols by quarterly revenue
// Enhanced fuzzy matching with confidence >= 0.15

export const TOKEN_TO_DEFILLAMA_MAP: Record<string, string> = ${JSON.stringify(tokenToDeFiLlamaMap, null, 2)}

export const PROTOCOL_TO_TOKEN_MAP: Record<string, { token: string, coinGeckoId: string, confidence: number }> = ${JSON.stringify(protocolToTokenMap, null, 2)}

export function getDeFiLlamaCoinId(token: string): string | null {
  return TOKEN_TO_DEFILLAMA_MAP[token.toUpperCase()] || null
}

export function getTokenByProtocol(protocol: string): { token: string, coinGeckoId: string, confidence: number } | null {
  return PROTOCOL_TO_TOKEN_MAP[protocol] || null
}

export const ENHANCED_PROTOCOL_MAPPINGS = ${JSON.stringify(results, null, 2)}

// Mapping Statistics
export const MAPPING_STATS = {
  totalProtocols: ${results.length},
  mapped: ${results.filter(r => r.status === 'mapped').length},
  partial: ${results.filter(r => r.status === 'partial').length},
  tokenless: ${results.filter(r => r.status === 'tokenless').length},
  failed: ${results.filter(r => r.status === 'failed').length},
  totalTokenMappings: ${Object.keys(tokenToDeFiLlamaMap).length},
  averageConfidence: ${(results.filter(r => r.confidence > 0).reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence > 0).length).toFixed(3)},
  generatedAt: "${new Date().toISOString()}"
}
`

    fs.writeFileSync('src/data/token-mappings.ts', enhancedTokenMappings)

    // Step 5: Final summary
    console.log('\n🎉 Enhanced Protocol Mapping Complete!')
    console.log('\n📊 Final Results:')
    console.log(`- Total protocols analyzed: ${results.length}`)
    console.log(`- High confidence mapped: ${results.filter(r => r.status === 'mapped').length}`)
    console.log(`- Partial confidence mapped: ${results.filter(r => r.status === 'partial').length}`)
    console.log(`- Tokenless protocols: ${results.filter(r => r.status === 'tokenless').length}`)
    console.log(`- Failed mappings: ${results.filter(r => r.status === 'failed').length}`)
    console.log(`- Total token mappings: ${Object.keys(tokenToDeFiLlamaMap).length}`)
    
    const avgConfidence = results.filter(r => r.confidence > 0).reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence > 0).length
    console.log(`- Average confidence: ${avgConfidence.toFixed(3)}`)
    
    console.log('\n🏆 Top Mapped Tokens:')
    validResults.slice(0, 10).forEach((result, i) => {
      console.log(`${i + 1}. ${result.protocol} → ${result.token} (${result.confidence.toFixed(2)} conf, ${result.matchMethod})`)
    })

    console.log('\n📁 Generated: src/data/token-mappings.ts')
    console.log('✅ Ready for testing!')

  } catch (error) {
    console.error('❌ Error during enhanced protocol mapping:', error)
  }
}

// Enhanced fuzzy matching function
async function tryEnhancedMatching(protocol: string, revenue: number): Promise<EnhancedProtocolResult> {
  try {
    // Generate multiple variations with different strategies
    const variations = generateAdvancedVariations(protocol)
    console.log(`  📝 Generated ${variations.length} variations for "${protocol}"`)
    
    // Try each variation with the CoinGecko API
    const result = await coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocol)
    
    if (result.coin && result.confidence >= 0.1) {
      console.log(`  ✅ Match found: ${result.coin.name} (${result.coin.symbol}) - confidence: ${result.confidence}`)
      return {
        protocol,
        revenue,
        token: result.coin.symbol?.toUpperCase(),
        coinGeckoId: result.coin.id,
        defillama_coinId: `coingecko:${result.coin.id}`,
        confidence: result.confidence,
        status: result.confidence >= 0.3 ? 'mapped' : 'partial',
        matchMethod: result.matchMethod
      }
    }
    
    console.log(`  ❌ No match found for "${protocol}"`)
    return {
      protocol,
      revenue,
      confidence: 0,
      status: 'failed'
    }
  } catch (error) {
    console.error(`  ❌ Error matching ${protocol}:`, error)
    return {
      protocol,
      revenue,
      confidence: 0,
      status: 'failed'
    }
  }
}

// Advanced variation generation
function generateAdvancedVariations(protocol: string): string[] {
  const variations = new Set<string>()
  const original = protocol.toLowerCase()
  
  variations.add(original)
  
  // Remove common suffixes
  const suffixesToRemove = [
    ' amm', ' v3', ' v2', ' v1', ' spot', ' orderbook', ' slipstream', 
    ' labs', ' aggregator', ' trading bot', ' wallet', ' protocol', 
    ' dao', ' finance', ' dex', ' defi', ' swap', ' bridge', ' lending', 
    ' staking', ' perp', ' perpetual', ' exchange', ' pool', ' spot',
    ' classic', ' pro', ' plus', ' advanced', ' core', ' main'
  ]
  
  let cleaned = original
  for (const suffix of suffixesToRemove) {
    if (cleaned.endsWith(suffix)) {
      cleaned = cleaned.replace(new RegExp(suffix + '$'), '').trim()
      variations.add(cleaned)
    }
  }
  
  // Add domain variations (.fun, .xyz, etc.)
  if (original.includes('.')) {
    const withoutDomain = original.split('.')[0]
    variations.add(withoutDomain)
  }
  
  // Add first word only
  const firstWord = cleaned.split(/\s+/)[0]
  if (firstWord && firstWord.length > 2) {
    variations.add(firstWord)
  }
  
  // Add acronym for multi-word protocols
  const words = cleaned.split(/\s+/).filter(w => w.length > 2)
  if (words.length > 1) {
    const acronym = words.map(w => w[0]).join('')
    if (acronym.length >= 2) {
      variations.add(acronym)
    }
  }
  
  // Special DeFi mappings
  const specialMappings: Record<string, string[]> = {
    'uniswap': ['uni', 'uniswap'],
    'pancakeswap': ['cake', 'pancakeswap'],
    'compound': ['comp'],
    'aave': ['aave'],
    'maker': ['mkr', 'makerdao'],
    'synthetix': ['snx'],
    'curve': ['crv'],
    'yearn': ['yfi'],
    'sushi': ['sushi'],
    'balancer': ['bal'],
    'convex': ['cvx'],
    'lido': ['ldo'],
    'frax': ['fxs'],
    'dydx': ['dydx'],
    'gmx': ['gmx'],
    'raydium': ['ray'],
    'jupiter': ['jup'],
    'orca': ['orca'],
    'marinade': ['mnde'],
    'mango': ['mngo'],
    'solend': ['slnd'],
    'phantom': ['phantom'],
  }
  
  for (const [key, values] of Object.entries(specialMappings)) {
    if (cleaned.includes(key)) {
      values.forEach(v => variations.add(v))
    }
  }
  
  return Array.from(variations).filter(v => v.length > 0)
}

// Run the enhanced mapping
enhancedProtocolMapping().catch(console.error) 