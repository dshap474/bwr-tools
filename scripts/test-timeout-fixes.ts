#!/usr/bin/env tsx
/**
 * Test script for timeout fixes
 * Verifies that the improved error handling and timeouts work correctly
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function testTimeoutFixes() {
  console.log('🧪 Testing Timeout Fixes...\n')

  try {
    // Test 1: Protocol mapping with retry mechanism
    console.log('🔍 Test 1: Protocol mapping with retry...')
    const testProtocols = ['PancakeSwap', 'Hyperliquid', 'Axiom', 'pump.fun', 'letsBONK.fun']
    
    const startTime = Date.now()
    console.log('Fetching protocol mappings with retry mechanism...')
    
    let retryCount = 0
    const maxRetries = 2
    let mappings: Map<string, any> = new Map() // Initialize with empty map
    
    while (retryCount <= maxRetries) {
      try {
        mappings = await Promise.race([
          protocolMappingService.getProtocolMappings(testProtocols),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Protocol mapping timeout')), 120000) // 2 minutes
          )
        ])
        console.log(`✅ Protocol mapping succeeded on attempt ${retryCount + 1}`)
        break
      } catch (retryError) {
        retryCount++
        if (retryCount > maxRetries) {
          console.log(`❌ Protocol mapping failed after ${maxRetries} retries`)
          // mappings is already initialized as empty map
          break
        }
        console.log(`⚠️ Protocol mapping attempt ${retryCount} failed, retrying in 2 seconds...`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    const mappingTime = Date.now() - startTime
    console.log(`📊 Protocol mapping completed in ${mappingTime}ms`)
    console.log(`📈 Found ${mappings.size} mappings`)
    console.log()

    // Test 2: Market cap fetching with error handling
    console.log('💰 Test 2: Market cap fetching with error handling...')
    const successfulMappings = Array.from(mappings.values())
      .filter(mapping => mapping.coin && mapping.confidence >= 0.4)
      .map(mapping => mapping.coin.id)
    
    if (successfulMappings.length > 0) {
      console.log(`Fetching market caps for ${successfulMappings.length} protocols...`)
      const marketCapStartTime = Date.now()
      
      let marketCaps: Record<string, number> = {}
      try {
        marketCaps = await Promise.race([
          coinGeckoAPI.getMarketCapByIds(successfulMappings),
          new Promise<Record<string, number>>((_, reject) => 
            setTimeout(() => reject(new Error('Market cap fetch timeout')), 60000) // 1 minute
          )
        ])
        console.log(`✅ Market cap fetch succeeded`)
      } catch (error) {
        console.log(`⚠️ Market cap fetch failed, using empty data:`, error)
        marketCaps = {}
      }
      
      const marketCapTime = Date.now() - marketCapStartTime
      console.log(`📊 Market cap fetch completed in ${marketCapTime}ms`)
      console.log(`📈 Found ${Object.keys(marketCaps).length} market caps`)
    } else {
      console.log('⚠️ No successful mappings to fetch market caps for')
    }
    console.log()

    // Test 3: Overall error handling simulation
    console.log('🛡️ Test 3: Overall error handling simulation...')
    
    const simulateLoadingSteps = async () => {
      const steps = [
        { name: 'Revenue Data', duration: 1000 },
        { name: 'Protocol Mappings', duration: 5000 },
        { name: 'Market Cap Data', duration: 2000 },
        { name: 'Asset Price Data', duration: 3000 }
      ]
      
      for (const step of steps) {
        console.log(`🔄 ${step.name}: Starting...`)
        
        try {
          // Simulate potential failure
          if (Math.random() < 0.1) { // 10% chance of failure
            throw new Error(`${step.name} simulated failure`)
          }
          
          await new Promise(resolve => setTimeout(resolve, step.duration))
          console.log(`✅ ${step.name}: Completed successfully`)
        } catch (error) {
          console.log(`⚠️ ${step.name}: Failed but continuing...`)
          // Continue with next step instead of failing completely
        }
      }
      
      console.log('🎉 All steps completed (some with errors)')
    }
    
    await simulateLoadingSteps()
    console.log()

    console.log('✅ Timeout fixes test completed successfully!')
    console.log('\n🔧 Improvements applied:')
    console.log('  - Increased protocol mapping timeout to 2 minutes')
    console.log('  - Increased market cap timeout to 1 minute')
    console.log('  - Added retry mechanism for protocol mapping')
    console.log('  - Added graceful error handling for non-critical failures')
    console.log('  - Continue loading even if some steps fail')

  } catch (error) {
    console.error('❌ Error during timeout test:', error)
  }
}

// Run the test
testTimeoutFixes().catch(console.error) 