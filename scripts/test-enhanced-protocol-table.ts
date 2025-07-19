#!/usr/bin/env tsx

/**
 * Test script for enhanced protocol table functionality
 */

import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function testEnhancedProtocolTable() {
  console.log('🧪 Testing Enhanced Protocol Table Functionality...')
  
  // Test protocols (using original names, not DeFiLlama names)
  const testProtocols = [
    'PancakeSwap',
    'Hyperliquid',
    'Axiom',
    'pump.fun',
    'letsBONK.fun',
    'Photon',
    'Launch Coin on Believe',
    'Aerodrome',
    'Sky',
    'AAVE'
  ]
  
  console.log(`\n🔍 Testing ${testProtocols.length} protocols with enhanced mapping...`)
  
  for (const protocol of testProtocols) {
    console.log(`\n📋 Testing: ${protocol}`)
    
    try {
      // Test DeFiLlama slug retrieval
      const defillamaSlug = protocolMappingService.getDeFiLlamaSlug(protocol)
      const defillamaName = protocolMappingService.getDeFiLlamaName(protocol)
      
      console.log(`  - DeFiLlama Slug: ${defillamaSlug || 'N/A'}`)
      console.log(`  - DeFiLlama Name: ${defillamaName || 'N/A'}`)
      
    } catch (error) {
      console.error(`  ❌ Error testing ${protocol}:`, error)
    }
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Print mapping service statistics
  const stats = protocolMappingService.getMappingStatistics()
  console.log('\n📊 Protocol Mapping Service Statistics:')
  console.log(`- Total lookups: ${stats.total_lookups}`)
  console.log(`- Cache hits: ${stats.cache_hits}`)
  console.log(`- Cache misses: ${stats.cache_misses}`)
  console.log(`- API calls: ${stats.api_calls}`)
  console.log(`- Cache hit rate: ${stats.cache_hit_rate.toFixed(2)}%`)
  console.log(`- Cache size: ${protocolMappingService.getCacheSize()}`)
}

// Run the test
testEnhancedProtocolTable().catch(console.error) 