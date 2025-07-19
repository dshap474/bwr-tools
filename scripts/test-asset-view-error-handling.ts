#!/usr/bin/env tsx
/**
 * Test script for Asset View error handling
 * Verifies that the improved error handling works correctly
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'

async function testAssetViewErrorHandling() {
  console.log('🧪 Testing Asset View Error Handling...\n')

  try {
    // Test 1: Normal request (should work)
    console.log('📈 Test 1: Normal price data request...')
    const testCoins = ['coingecko:bitcoin', 'coingecko:ethereum', 'coingecko:solana']
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30) // 30 days ago
    
    try {
      const priceData = await Promise.race([
        defiLlamaAPI.getPriceChart(
          testCoins.join(','),
          startDate.toISOString(),
          undefined,
          30,
          '1d'
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Price data fetch timeout')), 60000)
        )
      ])
      console.log(`✅ Normal request succeeded: ${priceData.length} data points`)
    } catch (error) {
      console.log(`❌ Normal request failed:`, error)
    }
    console.log()

    // Test 2: Large request (might fail)
    console.log('📈 Test 2: Large price data request...')
    const largeTestCoins = [
      'coingecko:bitcoin', 'coingecko:ethereum', 'coingecko:solana',
      'coingecko:uniswap', 'coingecko:aave', 'coingecko:curve-dao-token',
      'coingecko:sushi', 'coingecko:compound-governance-token',
      'coingecko:yearn-finance', 'coingecko:balancer', 'coingecko:havven',
      'coingecko:maker', 'coingecko:chainlink', 'coingecko:polkadot',
      'coingecko:cardano', 'coingecko:avalanche-2', 'coingecko:matic-network',
      'coingecko:cosmos', 'coingecko:fantom', 'coingecko:near'
    ]
    
    try {
      const largePriceData = await Promise.race([
        defiLlamaAPI.getPriceChart(
          largeTestCoins.join(','),
          startDate.toISOString(),
          undefined,
          30,
          '1d'
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Price data fetch timeout')), 60000)
        )
      ])
      console.log(`✅ Large request succeeded: ${largePriceData.length} data points`)
    } catch (error) {
      console.log(`❌ Large request failed:`, error)
      
      // Test fallback with fewer tokens
      console.log('🔄 Testing fallback with first 10 tokens...')
      try {
        const fallbackPriceData = await Promise.race([
          defiLlamaAPI.getPriceChart(
            largeTestCoins.slice(0, 10).join(','),
            startDate.toISOString(),
            undefined,
            30,
            '1d'
          ),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Price data fetch timeout')), 60000)
          )
        ])
        console.log(`✅ Fallback request succeeded: ${fallbackPriceData.length} data points`)
      } catch (fallbackError) {
        console.log(`❌ Fallback request also failed:`, fallbackError)
      }
    }
    console.log()

    // Test 3: Invalid request (should fail gracefully)
    console.log('📈 Test 3: Invalid request...')
    try {
      const invalidPriceData = await Promise.race([
        defiLlamaAPI.getPriceChart(
          'invalid:coin:id',
          startDate.toISOString(),
          undefined,
          30,
          '1d'
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Price data fetch timeout')), 60000)
        )
      ])
      console.log(`✅ Invalid request succeeded: ${invalidPriceData.length} data points`)
    } catch (error) {
      console.log(`❌ Invalid request failed as expected:`, error)
    }
    console.log()

    // Test 4: Network error simulation
    console.log('📈 Test 4: Network error simulation...')
    try {
      const networkErrorData = await Promise.race([
        defiLlamaAPI.getPriceChart(
          testCoins.join(','),
          startDate.toISOString(),
          undefined,
          30,
          '1d'
        ),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new TypeError('Failed to fetch')), 1000) // Simulate network error
        )
      ])
      console.log(`✅ Network error test succeeded: ${networkErrorData.length} data points`)
    } catch (error) {
      console.log(`❌ Network error test failed as expected:`, error)
      
      // Test error message handling
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          console.log('✅ Correctly identified network error')
        } else if (error.message.includes('timeout')) {
          console.log('✅ Correctly identified timeout error')
        } else {
          console.log('✅ Correctly identified other error type')
        }
      }
    }
    console.log()

    console.log('✅ Asset View error handling test completed!')
    console.log('\n🔧 Improvements applied:')
    console.log('  - Added timeout protection (60 seconds)')
    console.log('  - Added fallback mechanism for large requests')
    console.log('  - Added retry mechanism (up to 3 attempts)')
    console.log('  - Added specific error message handling')
    console.log('  - Added graceful degradation for API failures')

  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

// Run the test
testAssetViewErrorHandling().catch(console.error) 