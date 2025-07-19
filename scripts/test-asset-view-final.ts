#!/usr/bin/env tsx
/**
 * Final test script for Asset View component
 * Verifies that the component works correctly with updated token mappings
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function testAssetViewFinal() {
  console.log('🧪 Final Asset View Test...\n')

  try {
    // Step 1: Get the actual protocols that would be passed to Asset View
    console.log('📈 Step 1: Getting top 25 protocols...')
    const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
    
    // Calculate quarterly revenue for each protocol
    const quarterlyRevenue: Record<string, number> = {}
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const recentRevenue = revenueData.filter(point => 
      new Date(point.timestamp) >= threeMonthsAgo
    )
    
    recentRevenue.forEach(point => {
      Object.entries(point).forEach(([protocol, revenue]) => {
        if (protocol !== 'timestamp' && protocol !== 'total_crypto_revenue' && typeof revenue === 'number') {
          let combinedProtocol = protocol
          if (protocol === 'PumpSwap') combinedProtocol = 'pump.fun'
          if (protocol === 'BONKbot') combinedProtocol = 'letsBONK.fun'
          quarterlyRevenue[combinedProtocol] = (quarterlyRevenue[combinedProtocol] || 0) + revenue
        }
      })
    })
    
    const excludedProtocols = ['Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask']
    const filteredRevenue = Object.entries(quarterlyRevenue)
      .filter(([protocol]) => !excludedProtocols.includes(protocol))
    
    const topProtocolsByRevenue = filteredRevenue
      .sort(([, a], [, b]) => b - a)
      .slice(0, 25)
      .map(([protocol, revenue]) => ({ protocol, revenue }))

    // Step 2: Get protocol mappings
    console.log('🔍 Step 2: Getting protocol mappings...')
    const protocolNames = topProtocolsByRevenue.map(p => p.protocol)
    const cachedMappings = await protocolMappingService.getProtocolMappings(protocolNames)
    
    // Step 3: Simulate Asset View logic
    console.log('📊 Step 3: Simulating Asset View logic...')
    const protocolsWithTokens = topProtocolsByRevenue.filter(p => {
      const mapping = cachedMappings.get(p.protocol)
      return mapping?.coin?.symbol
    })

    console.log(`Found ${protocolsWithTokens.length} protocols with tokens`)

    // Step 4: Test token mapping function
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

    const getDeFiLlamaCoinId = (token: string): string | null => {
      return tokenMappings[token.toUpperCase()] || null
    }

    // Step 5: Get DeFiLlama coin IDs for all tokens
    const tokenCoinIds: string[] = []
    const tokenSymbols: string[] = []
    
    for (const { protocol } of protocolsWithTokens) {
      const mapping = cachedMappings.get(protocol)
      if (mapping?.coin?.symbol) {
        const coinId = getDeFiLlamaCoinId(mapping.coin.symbol)
        if (coinId) {
          tokenCoinIds.push(coinId)
          tokenSymbols.push(mapping.coin.symbol.toUpperCase())
        }
      }
    }

    console.log(`\n📊 Asset View Results:`)
    console.log(`- Total protocols: ${topProtocolsByRevenue.length}`)
    console.log(`- Protocols with tokens: ${protocolsWithTokens.length}`)
    console.log(`- Tokens with DeFiLlama mappings: ${tokenCoinIds.length}`)
    console.log()

    console.log('Tokens that will be displayed in Asset View:')
    tokenSymbols.forEach((symbol, i) => {
      console.log(`${i + 1}. ${symbol} -> ${tokenCoinIds[i]}`)
    })
    console.log()

    // Step 6: Test price data fetching
    if (tokenCoinIds.length > 0) {
      console.log('📈 Step 4: Testing price data fetching...')
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30) // 30 days ago
      const daysSinceStart = 30
      
      const priceData = await defiLlamaAPI.getPriceChart(
        tokenCoinIds.join(','),
        startDate.toISOString(),
        undefined,
        daysSinceStart,
        '1d'
      )

      // Group by token
      const tokenData: Record<string, any[]> = {}
      tokenSymbols.forEach(symbol => {
        tokenData[symbol] = []
      })

      priceData.forEach(point => {
        const coinId = point.coin
        const tokenIndex = tokenCoinIds.indexOf(coinId)
        if (tokenIndex !== -1) {
          const symbol = tokenSymbols[tokenIndex]
          tokenData[symbol].push(point)
        }
      })

      console.log('Price data results:')
      Object.entries(tokenData).forEach(([symbol, data]) => {
        if (data.length > 0) {
          const firstPrice = data[0].price
          const lastPrice = data[data.length - 1].price
          const returnPercent = ((lastPrice - firstPrice) / firstPrice) * 100
          console.log(`✅ ${symbol}: ${returnPercent.toFixed(2)}% return (${data.length} data points)`)
        } else {
          console.log(`❌ ${symbol}: No price data`)
        }
      })

      const tokensWithData = Object.values(tokenData).filter(data => data.length > 0).length
      console.log(`\n🎉 Asset View will display ${tokensWithData} tokens with price data`)
      console.log(`📈 Total data points: ${priceData.length}`)
    }

  } catch (error) {
    console.error('❌ Error during test:', error)
  }
}

// Run the test
testAssetViewFinal().catch(console.error) 