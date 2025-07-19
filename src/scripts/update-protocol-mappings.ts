#!/usr/bin/env tsx
/**
 * Script to update existing protocol-to-CoinGecko mappings
 * This script checks for new protocols and updates mappings for existing ones
 */

import { DeFiLlamaAPI } from '../lib/api-wrappers/defillama-api-wrapper'
import { CoinGeckoAPI } from '../lib/api-wrappers/coingecko-api-wrapper'
import { protocolMappingService } from '../lib/services/protocol-mapping-service'
import * as fs from 'fs'
import * as path from 'path'

// Configuration
const TOP_N_PROTOCOLS = 100
const RATE_LIMIT_DELAY = 2000 // 2 seconds between requests
const OUTPUT_FILE = path.join(__dirname, '../data/protocol-mappings.json')
const BACKUP_FILE = path.join(__dirname, '../data/protocol-mappings.backup.json')

// Excluded protocols (stablecoins, wallets, infrastructure)
const EXCLUDED_PROTOCOLS = [
  'Tether', 
  'Circle', 
  'Phantom', 
  'Coinbase Wallet', 
  'MetaMask',
  'Trust Wallet',
  'Binance Stablecoin',
  'DAI',
  'USDC',
  'USDT',
  'BUSD',
  'TUSD',
  'PAX',
  'GUSD'
]

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function updateProtocolMappings() {
  console.log('🔄 Starting protocol mapping update...')
  console.log(`📊 Fetching top ${TOP_N_PROTOCOLS} protocols by revenue...`)

  // Initialize APIs
  const defiLlamaAPI = new DeFiLlamaAPI()
  const coinGeckoAPI = new CoinGeckoAPI({
    apiKey: process.env.NEXT_PUBLIC_COINGECKO_API_KEY || 'CG-9qjCJZMPjyJPJF7iw3hbhAkm'
  })

  try {
    // Create backup of existing mappings
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('\n💾 Creating backup of existing mappings...')
      fs.copyFileSync(OUTPUT_FILE, BACKUP_FILE)
      console.log('✅ Backup created at:', BACKUP_FILE)
    }

    // Get current cache statistics
    const initialStats = protocolMappingService.getMappingStatistics()
    console.log('\n📊 Initial cache statistics:')
    console.log(`  - Total lookups: ${initialStats.total_lookups}`)
    console.log(`  - Cache size: ${protocolMappingService.getCacheSize()}`)
    console.log(`  - Hit rate: ${initialStats.cache_hit_rate.toFixed(1)}%`)

    // Step 1: Get revenue data from DeFiLlama
    console.log('\n📈 Fetching revenue data from DeFiLlama...')
    const revenueOverview = await defiLlamaAPI.getRevenueOverview()
    
    // Filter out excluded protocols
    const filteredProtocols = revenueOverview
      .filter(protocol => !EXCLUDED_PROTOCOLS.includes(protocol.name))
      .slice(0, TOP_N_PROTOCOLS)

    console.log(`✅ Found ${filteredProtocols.length} protocols after filtering`)

    // Step 2: Check which protocols need updating
    console.log('\n🔍 Checking which protocols need updates...')
    const protocolsNeedingUpdate: string[] = []
    const newProtocols: string[] = []

    for (const protocol of filteredProtocols) {
      const protocolName = protocol.name
      
      // Check if protocol exists in cache
      if (protocolMappingService.isTokenlessProtocol(protocolName)) {
        // Skip tokenless protocols
        continue
      }

      const cacheSize = protocolMappingService.getCacheSize()
      
      // Check if this is a new protocol not in our cache
      const existingMapping = await protocolMappingService.getProtocolMapping(protocolName)
      
      if (!existingMapping.coin && existingMapping.confidence === 0) {
        // This might be a new protocol
        if (protocolMappingService.getCacheSize() === cacheSize) {
          // Cache size didn't change, so this is truly new
          newProtocols.push(protocolName)
        }
      } else if (existingMapping.confidence < 0.8) {
        // Low confidence mapping - try to improve
        protocolsNeedingUpdate.push(protocolName)
      }
    }

    console.log(`\n📊 Update summary:`)
    console.log(`  - New protocols found: ${newProtocols.length}`)
    console.log(`  - Protocols needing update: ${protocolsNeedingUpdate.length}`)

    if (newProtocols.length === 0 && protocolsNeedingUpdate.length === 0) {
      console.log('\n✅ All mappings are up to date!')
      return
    }

    // Step 3: Update mappings for new and low-confidence protocols
    const protocolsToUpdate = [...newProtocols, ...protocolsNeedingUpdate]
    console.log(`\n🔄 Updating ${protocolsToUpdate.length} protocol mappings...`)

    let updatedCount = 0
    let improvedCount = 0

    for (let i = 0; i < protocolsToUpdate.length; i++) {
      const protocolName = protocolsToUpdate[i]
      const isNew = newProtocols.includes(protocolName)
      
      console.log(`\n[${i + 1}/${protocolsToUpdate.length}] ${isNew ? '🆕 New' : '🔄 Update'}: ${protocolName}`)
      
      try {
        // Get mapping from API
        const mapping = await coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocolName)
        
        if (mapping.coin || mapping.confidence === 0) {
          // Add to cache
          protocolMappingService.addMapping(protocolName, mapping)
          
          if (isNew) {
            updatedCount++
            console.log(`  ✅ Added new mapping: ${mapping.coin?.symbol || 'NO MATCH'} (${(mapping.confidence * 100).toFixed(0)}% confidence)`)
          } else {
            improvedCount++
            console.log(`  ✅ Updated mapping: ${mapping.coin?.symbol || 'N/A'} (${(mapping.confidence * 100).toFixed(0)}% confidence)`)
          }
        } else {
          console.log(`  ❌ No mapping found`)
        }

        // Rate limiting
        if (i < protocolsToUpdate.length - 1) {
          process.stdout.write(`  ⏳ Waiting ${RATE_LIMIT_DELAY / 1000}s for rate limit...`)
          await delay(RATE_LIMIT_DELAY)
          process.stdout.write(' Done\n')
        }

      } catch (error) {
        console.error(`  ❌ Error updating ${protocolName}:`, error)
      }
    }

    // Step 4: Export updated cache to JSON
    console.log('\n💾 Saving updated mapping cache...')
    const exportedData = protocolMappingService.exportCacheToJSON()
    fs.writeFileSync(OUTPUT_FILE, exportedData)

    // Print final statistics
    const finalStats = protocolMappingService.getMappingStatistics()
    console.log('\n' + '='.repeat(60))
    console.log('📊 UPDATE COMPLETE')
    console.log('='.repeat(60))
    console.log(`New protocols added: ${updatedCount}`)
    console.log(`Existing mappings improved: ${improvedCount}`)
    console.log(`Total cache size: ${protocolMappingService.getCacheSize()}`)
    console.log(`Cache hit rate: ${finalStats.cache_hit_rate.toFixed(1)}%`)
    console.log(`Output file: ${OUTPUT_FILE}`)
    console.log(`Backup file: ${BACKUP_FILE}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ Fatal error during update:', error)
    
    // Restore backup if it exists
    if (fs.existsSync(BACKUP_FILE)) {
      console.log('\n🔄 Restoring backup...')
      fs.copyFileSync(BACKUP_FILE, OUTPUT_FILE)
      console.log('✅ Backup restored')
    }
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  updateProtocolMappings()
    .then(() => {
      console.log('\n✅ Update completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Update failed:', error)
      process.exit(1)
    })
}

export { updateProtocolMappings }