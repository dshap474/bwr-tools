#!/usr/bin/env tsx
/**
 * Test script for the new token mappings
 * Verifies price data can be fetched for the mapped tokens
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { TOKEN_TO_DEFILLAMA_MAP, getDeFiLlamaCoinId } from '../src/data/token-mappings'

async function testNewTokenMappings() {
  console.log('🧪 Testing New Token Mappings...\n')

  console.log('📊 Available Token Mappings:')
  Object.entries(TOKEN_TO_DEFILLAMA_MAP).forEach(([token, coinId]) => {
    console.log(`  ${token} -> ${coinId}`)
  })
  console.log()

  // Test the getDeFiLlamaCoinId function
  console.log('🔍 Testing getDeFiLlamaCoinId function:')
  const testTokens = ['PUMP', 'PHOTON', 'PENDLE', 'MPLX', 'GNS', 'CVX']
  testTokens.forEach(token => {
    const coinId = getDeFiLlamaCoinId(token)
    console.log(`  ${token} -> ${coinId}`)
  })
  console.log()

  // Test price data fetching
  console.log('📈 Testing price data fetching...')
  const allCoinIds = Object.values(TOKEN_TO_DEFILLAMA_MAP)
  
  if (allCoinIds.length > 0) {
    console.log(`Fetching 7-day price data for ${allCoinIds.length} tokens...`)
    
    try {
      const priceData = await defiLlamaAPI.getPriceChart(
        allCoinIds.join(','),
        undefined,
        undefined,
        7,
        '1d'
      )
      
      console.log(`✅ Successfully fetched ${priceData.length} data points`)
      
      // Group by token and show performance
      const tokenPerformance: Record<string, { points: number; firstPrice: number; lastPrice: number; return: number }> = {}
      
      allCoinIds.forEach(coinId => {
        const tokenData = priceData.filter(p => p.coin === coinId)
        if (tokenData.length > 0) {
          const token = Object.keys(TOKEN_TO_DEFILLAMA_MAP).find(
            t => TOKEN_TO_DEFILLAMA_MAP[t] === coinId
          ) || 'UNKNOWN'
          
          const firstPrice = tokenData[0].price
          const lastPrice = tokenData[tokenData.length - 1].price
          const returnPercent = ((lastPrice - firstPrice) / firstPrice) * 100
          
          tokenPerformance[token] = {
            points: tokenData.length,
            firstPrice,
            lastPrice,
            return: returnPercent
          }
        }
      })
      
      console.log('\n📊 7-Day Performance Results:')
      console.log('─'.repeat(50))
      Object.entries(tokenPerformance).forEach(([token, perf]) => {
        const returnColor = perf.return >= 0 ? '🟢' : '🔴'
        console.log(`${returnColor} ${token}: ${perf.return.toFixed(2)}% (${perf.points} data points)`)
        console.log(`   $${perf.firstPrice.toFixed(4)} -> $${perf.lastPrice.toFixed(4)}`)
      })
      
      const successfulTokens = Object.keys(tokenPerformance).length
      console.log(`\n🎉 Successfully tested ${successfulTokens}/${allCoinIds.length} token mappings`)
      
      if (successfulTokens === allCoinIds.length) {
        console.log('✅ All token mappings are working perfectly!')
        console.log('\n🚀 Your Asset View component should now display:')
        console.log(`   - ${successfulTokens} tokens with price data`)
        console.log(`   - 7-day performance charts`)
        console.log(`   - Return percentages`)
      }
      
    } catch (error) {
      console.error('❌ Error fetching price data:', error)
    }
  } else {
    console.log('⚠️ No token mappings found')
  }
}

// Run the test
testNewTokenMappings().catch(console.error) 