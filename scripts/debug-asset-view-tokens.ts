#!/usr/bin/env tsx
/**
 * Debug script for Asset View token issue
 * Checks why only 4 tokens are showing instead of 25
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'

async function debugAssetViewTokens() {
  console.log('🔍 Debugging Asset View Token Issue...\n')

  try {
    // Step 1: Get the actual top 25 protocols from revenue data
    console.log('📈 Step 1: Getting top 25 protocols from revenue data...')
    const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
    
    // Calculate quarterly revenue for each protocol
    const quarterlyRevenue: Record<string, number> = {}
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    // Filter to last 3 months and sum by protocol
    const recentRevenue = revenueData.filter(point => 
      new Date(point.timestamp) >= threeMonthsAgo
    )
    
    recentRevenue.forEach(point => {
      Object.entries(point).forEach(([protocol, revenue]) => {
        if (protocol !== 'timestamp' && protocol !== 'total_crypto_revenue' && typeof revenue === 'number') {
          // Combine related protocols
          let combinedProtocol = protocol
          
          // Combine pump.fun ecosystem
          if (protocol === 'PumpSwap') {
            combinedProtocol = 'pump.fun'
          }
          
          // Combine BONK ecosystem  
          if (protocol === 'BONKbot') {
            combinedProtocol = 'letsBONK.fun'
          }
          
          quarterlyRevenue[combinedProtocol] = (quarterlyRevenue[combinedProtocol] || 0) + revenue
        }
      })
    })
    
    // Filter out excluded protocols
    const excludedProtocols = ['Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask']
    const filteredRevenue = Object.entries(quarterlyRevenue)
      .filter(([protocol]) => !excludedProtocols.includes(protocol))
    
    // Get top 25 protocols by quarterly revenue
    const topProtocolsByRevenue = filteredRevenue
      .sort(([, a], [, b]) => b - a)
      .slice(0, 25)
      .map(([protocol, revenue]) => ({ protocol, revenue }))
    
    console.log('Top 25 protocols by quarterly revenue:')
    topProtocolsByRevenue.forEach((p, i) => {
      console.log(`${i + 1}. ${p.protocol}: $${p.revenue.toLocaleString()}`)
    })
    console.log()

    // Step 2: Get protocol mappings
    console.log('🔍 Step 2: Getting protocol mappings...')
    const protocolNames = topProtocolsByRevenue.map(p => p.protocol)
    const cachedMappings = await protocolMappingService.getProtocolMappings(protocolNames)
    
    console.log('Protocol mapping results:')
    const mappingResults: Array<{
      protocol: string
      revenue: number
      mapping: any
      token?: string
    }> = []
    
    for (const { protocol, revenue } of topProtocolsByRevenue) {
      const mapping = cachedMappings.get(protocol)
      const tokenSymbol = mapping?.coin?.symbol?.toUpperCase()
      
      mappingResults.push({
        protocol,
        revenue,
        mapping,
        token: tokenSymbol
      })
      
      console.log(`${protocol}: ${tokenSymbol || 'NO TOKEN'} (${mapping?.confidence || 0}% confidence)`)
    }
    console.log()

    // Step 3: Check which tokens have DeFiLlama mappings
    console.log('🔍 Step 3: Checking DeFiLlama token mappings...')
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
      'BAL': 'coingecko:balancer',
      'SNX': 'coingecko:havven',
      'MKR': 'coingecko:maker',
      'LINK': 'coingecko:chainlink',
      'DOT': 'coingecko:polkadot',
      'ADA': 'coingecko:cardano',
      'AVAX': 'coingecko:avalanche-2',
      'MATIC': 'coingecko:matic-network',
      'ATOM': 'coingecko:cosmos',
      'FTM': 'coingecko:fantom',
      'NEAR': 'coingecko:near',
      'ALGO': 'coingecko:algorand',
      'VET': 'coingecko:vechain',
      'ICP': 'coingecko:internet-computer',
      'FIL': 'coingecko:filecoin',
      'XTZ': 'coingecko:tezos',
      'THETA': 'coingecko:theta-token',
      'XLM': 'coingecko:stellar',
      'TRX': 'coingecko:tron',
      'EOS': 'coingecko:eos',
      'BCH': 'coingecko:bitcoin-cash',
      'LTC': 'coingecko:litecoin',
      'XRP': 'coingecko:ripple',
      'DOGE': 'coingecko:dogecoin',
      'SHIB': 'coingecko:shiba-inu',
      'PEPE': 'coingecko:pepe',
      'BONK': 'coingecko:bonk',
      'WIF': 'coingecko:dogwifhat',
      'JUP': 'coingecko:jupiter',
      'PYTH': 'coingecko:pyth-network',
      'JTO': 'coingecko:jito',
      'TIA': 'coingecko:celestia',
      'INJ': 'coingecko:injective-protocol',
      'SEI': 'coingecko:sei-network',
      'SUI': 'coingecko:sui',
      'APT': 'coingecko:aptos',
      'ARB': 'coingecko:arbitrum',
      'OP': 'coingecko:optimism',
      'BASE': 'coingecko:base',
      'BLUR': 'coingecko:blur',
      'ENS': 'coingecko:ethereum-name-service',
      'LDO': 'coingecko:lido-dao',
      'RPL': 'coingecko:rocket-pool',
      'FXS': 'coingecko:frax-share',
      'FRAX': 'coingecko:frax',
      'USDC': 'coingecko:usd-coin',
      'USDT': 'coingecko:tether',
      'DAI': 'coingecko:dai',
      'BUSD': 'coingecko:binance-usd',
      'TUSD': 'coingecko:true-usd',
      'GUSD': 'coingecko:gemini-dollar',
      'PAX': 'coingecko:paxos-standard',
      'HUSD': 'coingecko:husd',
      'USDN': 'coingecko:neutrino',
      'USDK': 'coingecko:usdk',
      'USDJ': 'coingecko:just',
      'USDH': 'coingecko:usdh',
      'USDP': 'coingecko:paxos-standard',
      'USDD': 'coingecko:usdd',
    }

    const protocolsWithTokens = mappingResults.filter(p => p.token)
    const protocolsWithDeFiLlamaMapping = protocolsWithTokens.filter(p => {
      const coinId = tokenMappings[p.token!]
      return coinId !== undefined
    })

    console.log('Token analysis:')
    console.log(`- Total protocols: ${mappingResults.length}`)
    console.log(`- Protocols with tokens: ${protocolsWithTokens.length}`)
    console.log(`- Protocols with DeFiLlama mappings: ${protocolsWithDeFiLlamaMapping.length}`)
    console.log()

    console.log('Protocols with DeFiLlama mappings:')
    protocolsWithDeFiLlamaMapping.forEach((p, i) => {
      const coinId = tokenMappings[p.token!]
      console.log(`${i + 1}. ${p.protocol} (${p.token}) -> ${coinId}`)
    })
    console.log()

    console.log('Protocols WITHOUT DeFiLlama mappings:')
    const protocolsWithoutMapping = protocolsWithTokens.filter(p => {
      const coinId = tokenMappings[p.token!]
      return coinId === undefined
    })
    
    protocolsWithoutMapping.forEach((p, i) => {
      console.log(`${i + 1}. ${p.protocol} (${p.token}) -> NO MAPPING`)
    })
    console.log()

    // Step 4: Test price data fetching for the mapped tokens
    if (protocolsWithDeFiLlamaMapping.length > 0) {
      console.log('📈 Step 4: Testing price data fetching...')
      const testTokens = protocolsWithDeFiLlamaMapping.slice(0, 4).map(p => tokenMappings[p.token!])
      
      console.log(`Testing with tokens: ${testTokens.join(', ')}`)
      
      const priceData = await defiLlamaAPI.getPriceChart(
        testTokens.join(','),
        undefined,
        undefined,
        7,
        '1d'
      )
      
      console.log(`✅ Successfully fetched ${priceData.length} price points`)
      console.log(`📊 Found data for ${new Set(priceData.map(p => p.coin)).size} tokens`)
    }

    console.log('\n🔍 Issue Analysis:')
    console.log(`The Asset View is only showing ${protocolsWithDeFiLlamaMapping.length} tokens because:`)
    console.log(`1. Only ${protocolsWithTokens.length}/${mappingResults.length} protocols have tokens mapped`)
    console.log(`2. Only ${protocolsWithDeFiLlamaMapping.length}/${protocolsWithTokens.length} tokens have DeFiLlama mappings`)
    console.log(`3. The token mapping function needs to be expanded to include more tokens`)

  } catch (error) {
    console.error('❌ Error during debug:', error)
  }
}

// Run the debug
debugAssetViewTokens().catch(console.error) 