#!/usr/bin/env tsx

/**
 * Test script for enhanced protocol mapping service
 */

import { ProtocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function testEnhancedMappings() {
  console.log('🧪 Testing Enhanced Protocol Mapping Service...')
  
  const service = new ProtocolMappingService()
  
  // Test protocols from the top 25 list
  const testProtocols = [
    'Hyperliquid Spot Orderbook',
    'PancakeSwap AMM',
    'Axiom',
    'pump.fun',
    'letsBONK.fun',
    'Photon',
    'Launch Coin on Believe',
    'Aerodrome Slipstream',
    'Sky Lending',
    'AAVE V3',
    'Trojan',
    'Lido',
    'Raydium AMM',
    'GMGN',
    'edgeX',
    'Bloom Trading Bot',
    'BullX',
    'Jupiter Aggregator',
    'Maestro',
    'Pendle',
    'LaunchLab',
    'CoWSwap',
    'Meteora Dynamic Bonding Curve'
  ]
  
  console.log(`\n🔍 Testing ${testProtocols.length} protocols...`)
  
  for (const protocol of testProtocols) {
    console.log(`\n📋 Testing: ${protocol}`)
    
    try {
      // Get mapping
      const mapping = await service.getProtocolMapping(protocol)
      
      // Get DeFiLlama data
      const defiLlamaSlug = service.getDeFiLlamaSlug(protocol)
      const defiLlamaName = service.getDeFiLlamaName(protocol)
      
      console.log(`  - CoinGecko: ${mapping.coin?.name || 'N/A'} (${mapping.coin?.symbol || 'N/A'})`)
      console.log(`  - Confidence: ${mapping.confidence}`)
      console.log(`  - Match Method: ${mapping.matchMethod}`)
      console.log(`  - DeFiLlama: ${defiLlamaName || 'N/A'} (${defiLlamaSlug || 'N/A'})`)
      
      // Test TVL fetch if DeFiLlama slug exists
      if (defiLlamaSlug) {
        const tvlData = await service.getDeFiLlamaTVL(protocol)
        if (tvlData && tvlData.meta) {
          console.log(`  - DeFiLlama TVL: $${tvlData.meta.tvl?.toLocaleString() || 'N/A'}`)
        }
      }
      
    } catch (error) {
      console.error(`  ❌ Error testing ${protocol}:`, error)
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Print final statistics
  const stats = service.getMappingStatistics()
  console.log('\n📊 Final Statistics:')
  console.log(`- Total lookups: ${stats.total_lookups}`)
  console.log(`- Cache hits: ${stats.cache_hits}`)
  console.log(`- Cache misses: ${stats.cache_misses}`)
  console.log(`- API calls: ${stats.api_calls}`)
  console.log(`- Cache hit rate: ${stats.cache_hit_rate.toFixed(2)}%`)
  console.log(`- Cache size: ${service.getCacheSize()}`)
}

// Run the test
testEnhancedMappings().catch(console.error) 