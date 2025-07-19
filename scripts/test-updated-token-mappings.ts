#!/usr/bin/env tsx
/**
 * Test script for updated token mappings
 * Verifies that the new token mappings work correctly
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'

async function testUpdatedTokenMappings() {
  console.log('🧪 Testing Updated Token Mappings...\n')

  // Test tokens from the top 25 protocols
  const testTokens = [
    'BONK', 'AAVE', 'LDO', 'JUP', // Original 4 that worked
    'CAKE', 'PUMP', 'PHOTON', 'LAUNCHCOIN', 'SKY', 'RAY', 'PENDLE', 'ONDO', 'COW', 'EDGE', 'BGCI', 'BUL', 'G', 'H', 'COIN' // New additions
  ]

  const tokenMappings: Record<string, string> = {
    'BONK': 'coingecko:bonk',
    'AAVE': 'coingecko:aave',
    'LDO': 'coingecko:lido-dao',
    'JUP': 'coingecko:jupiter',
    'CAKE': 'coingecko:pancakeswap-token',
    'PUMP': 'coingecko:pump',
    'PHOTON': 'coingecko:photon',
    'LAUNCHCOIN': 'coingecko:launchcoin',
    'SKY': 'coingecko:sky',
    'RAY': 'coingecko:raydium',
    'PENDLE': 'coingecko:pendle',
    'ONDO': 'coingecko:ondo',
    'COW': 'coingecko:cow',
    'EDGE': 'coingecko:edge',
    'BGCI': 'coingecko:bloomberg-galaxy-crypto-index',
    'BUL': 'coingecko:bul',
    'G': 'coingecko:g',
    'H': 'coingecko:h',
    'COIN': 'coingecko:coin',
  }

  console.log('🔍 Testing token mappings...')
  const validTokens: string[] = []
  const validCoinIds: string[] = []

  for (const token of testTokens) {
    const coinId = tokenMappings[token]
    if (coinId) {
      validTokens.push(token)
      validCoinIds.push(coinId)
      console.log(`✅ ${token} -> ${coinId}`)
    } else {
      console.log(`❌ No mapping found for ${token}`)
    }
  }
  console.log()

  if (validCoinIds.length > 0) {
    console.log('📈 Testing price data fetching for all tokens...')
    console.log(`Fetching data for ${validTokens.length} tokens...`)
    
    const priceData = await defiLlamaAPI.getPriceChart(
      validCoinIds.join(','),
      undefined,
      undefined,
      7,
      '1d'
    )
    
    console.log(`✅ Successfully fetched ${priceData.length} price points`)
    
    // Group by token
    const tokenData: Record<string, any[]> = {}
    validTokens.forEach(token => {
      tokenData[token] = []
    })

    priceData.forEach(point => {
      const coinId = point.coin
      const tokenIndex = validCoinIds.indexOf(coinId)
      if (tokenIndex !== -1) {
        const token = validTokens[tokenIndex]
        tokenData[token].push(point)
      }
    })

    // Show results for each token
    console.log('\n📊 Token data results:')
    Object.entries(tokenData).forEach(([token, data]) => {
      if (data.length > 0) {
        const firstPrice = data[0].price
        const lastPrice = data[data.length - 1].price
        const returnPercent = ((lastPrice - firstPrice) / firstPrice) * 100
        console.log(`✅ ${token}: $${firstPrice.toFixed(4)} -> $${lastPrice.toFixed(4)} (${returnPercent.toFixed(2)}%) - ${data.length} data points`)
      } else {
        console.log(`❌ ${token}: No price data available`)
      }
    })

    console.log(`\n🎉 Successfully mapped ${Object.keys(tokenData).length} tokens`)
    console.log(`📈 Total data points: ${priceData.length}`)
  } else {
    console.log('❌ No valid token mappings found')
  }
}

// Run the test
testUpdatedTokenMappings().catch(console.error) 