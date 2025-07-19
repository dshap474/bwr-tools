#!/usr/bin/env tsx

/**
 * Script to enhance existing protocol mappings with DeFiLlama data
 */

import { ProtocolMappingService } from '../src/lib/services/protocol-mapping-service'
import fs from 'fs'
import path from 'path'

async function enhanceProtocolMappings() {
  console.log('🚀 Starting protocol mapping enhancement with DeFiLlama data...')
  
  const service = new ProtocolMappingService()
  
  // Get all protocol names from the current mappings
  const protocolNames = Array.from(service['mappingCache'].keys())
    .filter(key => !key.includes(' ')) // Filter out lowercase duplicates
    .slice(0, 50) // Limit to first 50 for testing
  
  console.log(`📋 Found ${protocolNames.length} protocols to enhance`)
  
  // Enhance mappings with DeFiLlama data
  await service.enhanceMappingsWithDeFiLlama(protocolNames)
  
  // Export enhanced mappings
  const enhancedData = service.exportCacheToJSON()
  const outputPath = path.join(__dirname, '../src/data/protocol-mappings.json')
  
  fs.writeFileSync(outputPath, enhancedData)
  console.log(`✅ Enhanced mappings exported to: ${outputPath}`)
  
  // Print statistics
  const stats = service.getMappingStatistics()
  console.log('\n📊 Enhancement Statistics:')
  console.log(`- Total protocols: ${stats.total_lookups}`)
  console.log(`- Cache hits: ${stats.cache_hits}`)
  console.log(`- Cache misses: ${stats.cache_misses}`)
  console.log(`- API calls: ${stats.api_calls}`)
  console.log(`- Cache hit rate: ${stats.cache_hit_rate.toFixed(2)}%`)
  
  // Print some examples of enhanced mappings
  console.log('\n🔍 Sample Enhanced Mappings:')
  const sampleProtocols = ['PancakeSwap', 'Hyperliquid', 'Axiom', 'pump.fun', 'letsBONK.fun']
  
  for (const protocol of sampleProtocols) {
    const slug = service.getDeFiLlamaSlug(protocol)
    const name = service.getDeFiLlamaName(protocol)
    
    if (slug) {
      console.log(`- ${protocol} -> DeFiLlama: ${name} (${slug})`)
    } else {
      console.log(`- ${protocol} -> No DeFiLlama mapping found`)
    }
  }
}

// Run the enhancement
enhanceProtocolMappings().catch(console.error) 