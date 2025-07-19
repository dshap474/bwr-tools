#!/usr/bin/env tsx
/**
 * Debug script for the loading freeze issue
 * Tests the specific steps that are causing the problem
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function debugLoadingIssue() {
  console.log('🔍 Debugging Loading Freeze Issue...\n')

  try {
    // Test 1: Revenue Data (this should work)
    console.log('📡 Test 1: Revenue Data')
    const startTime = Date.now()
    const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
    const revenueTime = Date.now() - startTime
    console.log(`✅ Revenue data loaded in ${revenueTime}ms (${revenueData.length} data points)`)
    console.log()

    // Test 2: Protocol Mappings (this might be the issue)
    console.log('🔍 Test 2: Protocol Mappings')
    const testProtocols = ['PancakeSwap', 'Hyperliquid', 'Axiom', 'pump.fun', 'letsBONK.fun']
    
    const mappingStartTime = Date.now()
    console.log('Fetching protocol mappings...')
    
    const mappings = await Promise.race([
      protocolMappingService.getProtocolMappings(testProtocols),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Protocol mapping timeout')), 30000)
      )
    ])
    
    const mappingTime = Date.now() - mappingStartTime
    console.log(`✅ Protocol mappings loaded in ${mappingTime}ms`)
    console.log(`📊 Found ${mappings.size} mappings`)
    console.log()

    // Test 3: Market Cap Data
    console.log('💰 Test 3: Market Cap Data')
    const successfulMappings = Array.from(mappings.values())
      .filter(mapping => mapping.coin && mapping.confidence >= 0.4)
      .map(mapping => mapping.coin!.id)
    
    if (successfulMappings.length > 0) {
      console.log(`Fetching market caps for ${successfulMappings.length} protocols...`)
      const marketCapStartTime = Date.now()
      
      const marketCaps = await Promise.race([
        coinGeckoAPI.getMarketCapByIds(successfulMappings),
        new Promise<Record<string, number>>((_, reject) => 
          setTimeout(() => reject(new Error('Market cap fetch timeout')), 30000)
        )
      ])
      
      const marketCapTime = Date.now() - marketCapStartTime
      console.log(`✅ Market cap data loaded in ${marketCapTime}ms`)
      console.log(`📊 Found ${Object.keys(marketCaps).length} market caps`)
    } else {
      console.log('⚠️ No successful mappings to fetch market caps for')
    }
    console.log()

    // Test 4: Asset Price Data
    console.log('📈 Test 4: Asset Price Data')
    const testCoins = ['coingecko:bitcoin', 'coingecko:ethereum', 'coingecko:solana']
    const priceStartTime = Date.now()
    
    const priceData = await defiLlamaAPI.getPriceChart(
      testCoins.join(','),
      undefined,
      undefined,
      7,
      '1d'
    )
    
    const priceTime = Date.now() - priceStartTime
    console.log(`✅ Price data loaded in ${priceTime}ms`)
    console.log(`📊 Found ${priceData.length} price points`)
    console.log()

    console.log('✅ All tests completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`- Revenue Data: ${revenueTime}ms`)
    console.log(`- Protocol Mappings: ${mappingTime}ms`)
    console.log(`- Market Cap Data: ${successfulMappings.length > 0 ? 'OK' : 'SKIPPED'}`)
    console.log(`- Asset Price Data: ${priceTime}ms`)

  } catch (error) {
    console.error('❌ Error during debug:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Protocol mapping')) {
        console.log('\n🔍 Issue identified: Protocol mapping service is hanging')
        console.log('💡 Possible causes:')
        console.log('  - API rate limiting')
        console.log('  - Network timeout')
        console.log('  - Service unavailability')
      } else if (error.message.includes('Market cap')) {
        console.log('\n🔍 Issue identified: Market cap fetching is hanging')
        console.log('💡 Possible causes:')
        console.log('  - CoinGecko API rate limiting')
        console.log('  - Network timeout')
      } else {
        console.log('\n🔍 Issue identified: Unknown error')
        console.log('💡 Check network connectivity and API availability')
      }
    }
  }
}

// Run the debug
debugLoadingIssue().catch(console.error) 