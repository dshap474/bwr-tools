#!/usr/bin/env tsx
/**
 * Process Existing Mappings Script
 * Uses the existing cached protocol mappings to generate comprehensive token mappings
 * with lower confidence thresholds to capture more protocols
 */

import fs from 'fs'
import protocolMappings from '../src/data/protocol-mappings.json'

interface ProtocolMappingEntry {
  coingecko_id: string | null
  symbol: string | null
  name: string
  confidence: number
  match_method: string
  is_tokenless: boolean
  variations_tried: string[]
  last_verified: string
  quarterly_revenue?: number
  defillama_slug?: string | null
  defillama_name?: string | null
}

interface ProcessedResult {
  protocol: string
  token?: string
  coinGeckoId?: string
  defillama_coinId?: string
  confidence: number
  status: 'mapped' | 'partial' | 'tokenless' | 'failed'
  matchMethod?: string
}

async function processExistingMappings() {
  console.log('🚀 Processing Existing Protocol Mappings...\n')

  try {
    // Load existing mappings
    const mappings = protocolMappings.mappings as Record<string, ProtocolMappingEntry>
    console.log(`📚 Found ${Object.keys(mappings).length} cached protocol mappings`)

    // Process mappings with different confidence thresholds
    const results: ProcessedResult[] = []
    const tokenToDeFiLlamaMap: Record<string, string> = {}
    const protocolToTokenMap: Record<string, { token: string, coinGeckoId: string, confidence: number }> = {}
    
    // Lower confidence thresholds for more comprehensive mapping
    const HIGH_CONFIDENCE = 0.3  // Was 0.4, now lower
    const PARTIAL_CONFIDENCE = 0.15  // Include even lower confidence matches
    
    console.log('\n🔍 Processing mappings with confidence thresholds:')
    console.log(`- High confidence: >= ${HIGH_CONFIDENCE}`)
    console.log(`- Partial confidence: >= ${PARTIAL_CONFIDENCE}`)
    console.log()

    let highConfidenceCount = 0
    let partialConfidenceCount = 0
    let tokenlessCount = 0
    let failedCount = 0

    for (const [protocol, mapping] of Object.entries(mappings)) {
      let status: 'mapped' | 'partial' | 'tokenless' | 'failed' = 'failed'
      
      // Skip duplicates (some protocols are stored with both original and lowercase keys)
      if (results.some(r => r.protocol === protocol)) {
        continue
      }

      if (mapping.is_tokenless) {
        // Known tokenless protocol
        status = 'tokenless'
        tokenlessCount++
        console.log(`🚫 ${protocol}: tokenless protocol`)
      } else if (mapping.coingecko_id && mapping.symbol && mapping.confidence >= HIGH_CONFIDENCE) {
        // High confidence mapping
        status = 'mapped'
        highConfidenceCount++
        
        const token = mapping.symbol.toUpperCase()
        const coinGeckoId = mapping.coingecko_id
        const defillama_coinId = `coingecko:${coinGeckoId}`
        
        tokenToDeFiLlamaMap[token] = defillama_coinId
        protocolToTokenMap[protocol] = {
          token,
          coinGeckoId,
          confidence: mapping.confidence
        }
        
        console.log(`✅ ${protocol} → ${token} (${mapping.confidence.toFixed(2)} conf, ${mapping.match_method})`)
        
        results.push({
          protocol,
          token,
          coinGeckoId,
          defillama_coinId,
          confidence: mapping.confidence,
          status,
          matchMethod: mapping.match_method
        })
        continue
      } else if (mapping.coingecko_id && mapping.symbol && mapping.confidence >= PARTIAL_CONFIDENCE) {
        // Partial confidence mapping
        status = 'partial'
        partialConfidenceCount++
        
        const token = mapping.symbol.toUpperCase()
        const coinGeckoId = mapping.coingecko_id
        const defillama_coinId = `coingecko:${coinGeckoId}`
        
        tokenToDeFiLlamaMap[token] = defillama_coinId
        protocolToTokenMap[protocol] = {
          token,
          coinGeckoId,
          confidence: mapping.confidence
        }
        
        console.log(`⚠️  ${protocol} → ${token} (${mapping.confidence.toFixed(2)} conf, ${mapping.match_method}) [PARTIAL]`)
        
        results.push({
          protocol,
          token,
          coinGeckoId,
          defillama_coinId,
          confidence: mapping.confidence,
          status,
          matchMethod: mapping.match_method
        })
        continue
      } else {
        // Failed mapping
        failedCount++
        console.log(`❌ ${protocol}: failed (confidence: ${mapping.confidence})`)
      }
      
      results.push({
        protocol,
        confidence: mapping.confidence,
        status,
        matchMethod: mapping.match_method
      })
    }

    // Generate enhanced token mappings
    console.log('\n📁 Generating enhanced token mappings file...')
    
    const enhancedTokenMappings = `// Enhanced Token Mappings from Existing Cache
// Generated on: ${new Date().toISOString()}
// Processed from existing protocol mappings with confidence >= 0.15

export const TOKEN_TO_DEFILLAMA_MAP: Record<string, string> = ${JSON.stringify(tokenToDeFiLlamaMap, null, 2)}

export const PROTOCOL_TO_TOKEN_MAP: Record<string, { token: string, coinGeckoId: string, confidence: number }> = ${JSON.stringify(protocolToTokenMap, null, 2)}

export function getDeFiLlamaCoinId(token: string): string | null {
  return TOKEN_TO_DEFILLAMA_MAP[token.toUpperCase()] || null
}

export function getTokenByProtocol(protocol: string): { token: string, coinGeckoId: string, confidence: number } | null {
  return PROTOCOL_TO_TOKEN_MAP[protocol] || null
}

export const PROCESSED_PROTOCOL_MAPPINGS = ${JSON.stringify(results, null, 2)}

// Enhanced Mapping Statistics
export const MAPPING_STATS = {
  totalProtocols: ${results.length},
  highConfidence: ${highConfidenceCount},
  partialConfidence: ${partialConfidenceCount},
  tokenless: ${tokenlessCount},
  failed: ${failedCount},
  totalTokenMappings: ${Object.keys(tokenToDeFiLlamaMap).length},
  averageConfidence: ${(results.filter(r => r.confidence > 0).reduce((sum, r) => sum + r.confidence, 0) / results.filter(r => r.confidence > 0).length).toFixed(3)},
  highConfidenceThreshold: ${HIGH_CONFIDENCE},
  partialConfidenceThreshold: ${PARTIAL_CONFIDENCE},
  generatedAt: "${new Date().toISOString()}"
}

// Token list for easy reference
export const ALL_MAPPED_TOKENS = Object.keys(TOKEN_TO_DEFILLAMA_MAP).sort()

// Protocol list for easy reference  
export const ALL_MAPPED_PROTOCOLS = Object.keys(PROTOCOL_TO_TOKEN_MAP).sort()
`

    fs.writeFileSync('src/data/token-mappings.ts', enhancedTokenMappings)

    // Final summary
    console.log('\n🎉 Processing Complete!')
    console.log('\n📊 Final Results:')
    console.log(`- Total protocols processed: ${results.length}`)
    console.log(`- High confidence mapped: ${highConfidenceCount}`)
    console.log(`- Partial confidence mapped: ${partialConfidenceCount}`)
    console.log(`- Tokenless protocols: ${tokenlessCount}`)
    console.log(`- Failed mappings: ${failedCount}`)
    console.log(`- Total token mappings: ${Object.keys(tokenToDeFiLlamaMap).length}`)
    
    const validResults = results.filter(r => r.confidence > 0)
    const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
    console.log(`- Average confidence: ${avgConfidence.toFixed(3)}`)
    
    console.log('\n🏆 All Mapped Tokens:')
    const sortedTokens = Object.keys(tokenToDeFiLlamaMap).sort()
    sortedTokens.forEach((token, i) => {
      const protocolEntry = Object.entries(protocolToTokenMap).find(([, data]) => data.token === token)
      if (protocolEntry) {
        const [protocol, data] = protocolEntry
        console.log(`${i + 1}. ${token} ← ${protocol} (${data.confidence.toFixed(2)} conf)`)
      }
    })

    console.log('\n📁 Enhanced token mappings written to: src/data/token-mappings.ts')
    console.log('✅ Ready for testing!')

  } catch (error) {
    console.error('❌ Error processing existing mappings:', error)
  }
}

// Run the script
processExistingMappings().catch(console.error) 