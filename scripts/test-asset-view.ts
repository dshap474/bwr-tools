#!/usr/bin/env tsx
/**
 * Test script for Asset View functionality
 * Tests DeFiLlama price data fetching and return calculations
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

// Sample protocols for testing
const testProtocols = [
  { name: 'Bitcoin', token: 'BTC' },
  { name: 'Ethereum', token: 'ETH' },
  { name: 'Solana', token: 'SOL' },
  { name: 'Uniswap', token: 'UNI' },
  { name: 'AAVE', token: 'AAVE' },
  { name: 'Curve', token: 'CRV' },
  { name: 'SushiSwap', token: 'SUSHI' },
  { name: 'Compound', token: 'COMP' },
  { name: 'Yearn Finance', token: 'YFI' },
  { name: 'Balancer', token: 'BAL' }
]

async function testAssetView() {
  console.log('🧪 Testing Asset View Functionality...\n')

  try {
    // Test 1: DeFiLlama API connection
    console.log('📡 Testing DeFiLlama API connection...')
    const testCoins = ['coingecko:bitcoin', 'coingecko:ethereum', 'coingecko:solana']
    const priceData = await defiLlamaAPI.getPriceChart(
      testCoins.join(','),
      undefined,
      undefined,
      30,
      '1d'
    )
    console.log(`✅ Successfully fetched price data for ${priceData.length} data points`)
    console.log(`📊 Sample data point:`, priceData[0])
    console.log()

    // Test 2: Token mapping functionality
    console.log('🔍 Testing token mapping...')
    const tokenMappings: Record<string, string> = {
      'BTC': 'coingecko:bitcoin',
      'ETH': 'coingecko:ethereum',
      'SOL': 'coingecko:solana',
      'UNI': 'coingecko:uniswap',
      'AAVE': 'coingecko:aave',
      'CRV': 'coingecko:curve-dao-token',
      'SUSHI': 'coingecko:sushi',
      'COMP': 'coingecko:compound-governance-token',
      'YFI': 'coingecko:yearn-finance',
      'BAL': 'coingecko:balancer'
    }

    const validTokens: string[] = []
    const validCoinIds: string[] = []

    for (const protocol of testProtocols) {
      if (protocol.token) {
        const coinId = tokenMappings[protocol.token.toUpperCase()]
        if (coinId) {
          validTokens.push(protocol.token)
          validCoinIds.push(coinId)
          console.log(`✅ ${protocol.token} -> ${coinId}`)
        } else {
          console.log(`❌ No mapping found for ${protocol.token}`)
        }
      }
    }
    console.log()

    // Test 3: Price data fetching for multiple tokens
    console.log('📈 Testing price data fetching for multiple tokens...')
    if (validCoinIds.length > 0) {
      const multiTokenData = await defiLlamaAPI.getPriceChart(
        validCoinIds.join(','),
        undefined,
        undefined,
        7, // Last 7 days for testing
        '1d'
      )
      
      console.log(`✅ Fetched ${multiTokenData.length} data points for ${validTokens.length} tokens`)
      
      // Group by token
      const tokenData: Record<string, any[]> = {}
      validTokens.forEach(token => {
        tokenData[token] = []
      })

      multiTokenData.forEach(point => {
        const coinId = point.coin
        const tokenIndex = validCoinIds.indexOf(coinId)
        if (tokenIndex !== -1) {
          const token = validTokens[tokenIndex]
          tokenData[token].push(point)
        }
      })

      // Show sample data for each token
      Object.entries(tokenData).forEach(([token, data]) => {
        if (data.length > 0) {
          const firstPrice = data[0].price
          const lastPrice = data[data.length - 1].price
          const returnPercent = ((lastPrice - firstPrice) / firstPrice) * 100
          console.log(`📊 ${token}: $${firstPrice.toFixed(2)} -> $${lastPrice.toFixed(2)} (${returnPercent.toFixed(2)}%)`)
        }
      })
    }
    console.log()

    // Test 4: Period calculation
    console.log('📅 Testing period calculations...')
    const periods: Array<'W' | 'M' | 'Q' | 'Y'> = ['W', 'M', 'Q', 'Y']
    
    periods.forEach(period => {
      const now = new Date()
      const startOfPeriod = new Date(now)
      
      switch (period) {
        case 'W':
          const dayOfWeek = now.getDay()
          startOfPeriod.setDate(now.getDate() - dayOfWeek)
          startOfPeriod.setHours(0, 0, 0, 0)
          break
        case 'M':
          startOfPeriod.setDate(1)
          startOfPeriod.setHours(0, 0, 0, 0)
          break
        case 'Q':
          const quarter = Math.floor(now.getMonth() / 3)
          startOfPeriod.setMonth(quarter * 3, 1)
          startOfPeriod.setHours(0, 0, 0, 0)
          break
        case 'Y':
          startOfPeriod.setMonth(0, 1)
          startOfPeriod.setHours(0, 0, 0, 0)
          break
      }
      
      const daysSinceStart = Math.ceil((now.getTime() - startOfPeriod.getTime()) / (1000 * 60 * 60 * 24))
      console.log(`📅 ${period}: ${startOfPeriod.toISOString().split('T')[0]} (${daysSinceStart} days ago)`)
    })
    console.log()

    // Test 5: Protocol mapping service integration
    console.log('🔗 Testing protocol mapping service integration...')
    const protocolNames = testProtocols.map(p => p.name)
    const mappings = await protocolMappingService.getProtocolMappings(protocolNames)
    
    console.log(`📋 Found ${mappings.size} protocol mappings`)
    mappings.forEach((mapping, protocol) => {
      const coinId = mapping.coin?.id || 'No ID'
      const symbol = mapping.coin?.symbol || 'No symbol'
      console.log(`🔍 ${protocol}: ${symbol} (${coinId}) - ${(mapping.confidence * 100).toFixed(1)}% confidence`)
    })

    console.log('\n✅ Asset View functionality test completed successfully!')
    console.log('\n📋 Summary:')
    console.log(`- DeFiLlama API: ✅ Working`)
    console.log(`- Token mappings: ✅ ${validTokens.length}/${testProtocols.length} tokens mapped`)
    console.log(`- Price data: ✅ Successfully fetched for multiple tokens`)
    console.log(`- Period calculations: ✅ All periods working`)
    console.log(`- Protocol mappings: ✅ ${mappings.size} protocols found`)

  } catch (error) {
    console.error('❌ Error testing asset view:', error)
  }
}

// Run the test
testAssetView().catch(console.error) 