#!/usr/bin/env tsx
/**
 * Complete Protocol Mapping Script
 * Maps top DeFiLlama protocols to CoinGecko IDs and creates comprehensive token mappings
 */

import { defiLlamaAPI } from '../src/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper'
import { protocolMappingService } from '../src/lib/services/protocol-mapping-service'
import fs from 'fs'

interface ProtocolMappingResult {
  protocol: string
  revenue: number
  token?: string
  coinGeckoId?: string
  defillama_coinId?: string
  confidence: number
  status: 'mapped' | 'tokenless' | 'failed'
}

async function completeProtocolMapping() {
  console.log('🚀 Starting Complete Protocol Mapping...\n')

  try {
    // Step 1: Get top 100 protocols by revenue
    console.log('📈 Step 1: Getting top 100 protocols by revenue...')
    const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
    
    // Calculate quarterly revenue
    const quarterlyRevenue: Record<string, number> = {}
    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
    
    const recentRevenue = revenueData.filter(point => 
      new Date(point.timestamp) >= threeMonthsAgo
    )
    
    recentRevenue.forEach(point => {
      Object.entries(point).forEach(([protocol, revenue]) => {
        if (protocol !== 'timestamp' && protocol !== 'total_crypto_revenue' && typeof revenue === 'number') {
          // Combine related protocols
          let combinedProtocol = protocol
          if (protocol === 'PumpSwap') combinedProtocol = 'pump.fun'
          if (protocol === 'BONKbot') combinedProtocol = 'letsBONK.fun'
          
          quarterlyRevenue[combinedProtocol] = (quarterlyRevenue[combinedProtocol] || 0) + revenue
        }
      })
    })
    
    // Filter out excluded protocols
    const excludedProtocols = ['Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask']
    const filteredRevenue = Object.entries(quarterlyRevenue)
      .filter(([protocol]) => !excludedProtocols.includes(protocol))
    
    const topProtocolsByRevenue = filteredRevenue
      .sort(([, a], [, b]) => b - a)
      .slice(0, 100)
      .map(([protocol, revenue]) => ({ protocol, revenue }))

    console.log('Top 100 protocols by quarterly revenue:')
    topProtocolsByRevenue.forEach((p, i) => {
      console.log(`${i + 1}. ${p.protocol}: $${p.revenue.toLocaleString()}`)
    })
    console.log()

    // Step 2: Get existing mappings and identify gaps
    console.log('🔍 Step 2: Analyzing existing mappings...')
    const protocolNames = topProtocolsByRevenue.map(p => p.protocol)
    const existingMappings = await protocolMappingService.getProtocolMappings(protocolNames)
    
    const results: ProtocolMappingResult[] = []
    const unmappedProtocols: string[] = []
    
    for (const { protocol, revenue } of topProtocolsByRevenue) {
      const mapping = existingMappings.get(protocol)
      const token = mapping?.coin?.symbol?.toUpperCase()
      const coinGeckoId = mapping?.coin?.id
      
      if (mapping?.coin && mapping.confidence >= 0.4) {
        results.push({
          protocol,
          revenue,
          token,
          coinGeckoId,
          confidence: mapping.confidence,
          status: 'mapped'
        })
      } else if (protocolMappingService.isTokenlessProtocol(protocol)) {
        results.push({
          protocol,
          revenue,
          confidence: 1.0,
          status: 'tokenless'
        })
      } else {
        results.push({
          protocol,
          revenue,
          confidence: mapping?.confidence || 0,
          status: 'failed'
        })
        unmappedProtocols.push(protocol)
      }
    }

    console.log(`✅ Mapped protocols: ${results.filter(r => r.status === 'mapped').length}`)
    console.log(`🚫 Tokenless protocols: ${results.filter(r => r.status === 'tokenless').length}`)
    console.log(`❌ Failed mappings: ${results.filter(r => r.status === 'failed').length}`)
    console.log()

    // Step 3: Attempt to map failed protocols
    if (unmappedProtocols.length > 0) {
      console.log('🔧 Step 3: Attempting to map failed protocols...')
      console.log(`Found ${unmappedProtocols.length} unmapped protocols, processing in batches...`)
      
      // Process in batches to avoid rate limits
      const batchSize = 10
      const batches = []
      for (let i = 0; i < unmappedProtocols.length; i += batchSize) {
        batches.push(unmappedProtocols.slice(i, i + batchSize))
      }
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]
        console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} protocols)...`)
        
        for (const protocol of batch) {
          console.log(`\n🔍 Manually mapping: ${protocol}`)
          
          // Try enhanced search with variations
          const variations = [
            protocol,
            protocol.replace(/\s+/g, ''),
            protocol.split(' ')[0],
            protocol.toLowerCase(),
            protocol.replace(/\.fun$/i, ''),
            protocol.replace(/^launch\s+coin\s+on\s+/i, ''),
          ]
          
          let bestMatch = null
          let bestConfidence = 0
          
          for (const variation of variations) {
            try {
              const searchResults = await coinGeckoAPI.searchCoins(variation)
              
              if (searchResults.length > 0) {
                const match = searchResults[0]
                const confidence = variation === protocol ? 0.9 : 0.7
                
                if (confidence > bestConfidence) {
                  bestMatch = match
                  bestConfidence = confidence
                }
              }
              
              // Rate limiting - longer delay for large batch
              await new Promise(resolve => setTimeout(resolve, 2000))
            } catch (error) {
              console.log(`  ⚠️ Search failed for "${variation}":`, error)
            }
          }
          
          if (bestMatch && bestConfidence >= 0.6) {
            console.log(`  ✅ Found match: ${bestMatch.name} (${bestMatch.symbol}) - ${bestConfidence} confidence`)
            
            // Update results
            const resultIndex = results.findIndex(r => r.protocol === protocol)
            if (resultIndex >= 0) {
              results[resultIndex] = {
                ...results[resultIndex],
                token: bestMatch.symbol.toUpperCase(),
                coinGeckoId: bestMatch.id,
                confidence: bestConfidence,
                status: 'mapped'
              }
            }
          } else {
            console.log(`  ❌ No suitable match found`)
          }
        }
        
        // Longer delay between batches
        if (batchIndex < batches.length - 1) {
          console.log(`⏳ Waiting 10 seconds before next batch...`)
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
      }
    }

    // Step 4: Create DeFiLlama coin ID mappings
    console.log('\n🔗 Step 4: Creating DeFiLlama coin ID mappings...')
    
    const tokenToDeFiLlamaMap: Record<string, string> = {}
    const mappedProtocols = results.filter(r => r.status === 'mapped' && r.token && r.coinGeckoId)
    
    for (const result of mappedProtocols) {
      if (result.token && result.coinGeckoId) {
        const defillama_coinId = `coingecko:${result.coinGeckoId}`
        result.defillama_coinId = defillama_coinId
        tokenToDeFiLlamaMap[result.token] = defillama_coinId
      }
    }

    // Step 5: Generate final mapping files
    console.log('\n📁 Step 5: Generating mapping files...')
    
    // Generate token mappings for the Asset View
    const tokenMappingsCode = `// Auto-generated token mappings for Asset View
// Generated on: ${new Date().toISOString()}
// Top 100 DeFiLlama protocols by quarterly revenue

export const TOKEN_TO_DEFILLAMA_MAP: Record<string, string> = ${JSON.stringify(tokenToDeFiLlamaMap, null, 2)}

export function getDeFiLlamaCoinId(token: string): string | null {
  return TOKEN_TO_DEFILLAMA_MAP[token.toUpperCase()] || null
}

export const PROTOCOL_REVENUE_MAPPINGS = ${JSON.stringify(results, null, 2)}
`

    fs.writeFileSync('src/data/token-mappings.ts', tokenMappingsCode)
    
    // Update protocol mappings JSON
    const updatedMappings = protocolMappingService.exportCacheToJSON()
    fs.writeFileSync('src/data/protocol-mappings.json', updatedMappings)

    // Step 6: Test the complete pipeline
    console.log('\n🧪 Step 6: Testing complete pipeline...')
    
    const testTokens = Object.values(tokenToDeFiLlamaMap).slice(0, 5)
    if (testTokens.length > 0) {
      const priceData = await defiLlamaAPI.getPriceChart(
        testTokens.join(','),
        undefined,
        undefined,
        7,
        '1d'
      )
      
      console.log(`✅ Successfully fetched price data for ${new Set(priceData.map(p => p.coin)).size} tokens`)
    }

    // Final summary
    console.log('\n🎉 Protocol Mapping Complete!')
    console.log('\n📊 Final Results:')
    console.log(`- Total protocols: ${results.length}`)
    console.log(`- Successfully mapped: ${results.filter(r => r.status === 'mapped').length}`)
    console.log(`- Tokenless protocols: ${results.filter(r => r.status === 'tokenless').length}`)
    console.log(`- Failed mappings: ${results.filter(r => r.status === 'failed').length}`)
    console.log(`- Token mappings created: ${Object.keys(tokenToDeFiLlamaMap).length}`)
    
    console.log('\n📁 Generated files:')
    console.log('- src/data/token-mappings.ts (for Asset View)')
    console.log('- src/data/protocol-mappings.json (updated cache)')
    
    console.log('\n✅ Your Asset View should now show many more mapped tokens!')

  } catch (error) {
    console.error('❌ Error during protocol mapping:', error)
  }
}

// Run the script
completeProtocolMapping().catch(console.error) 