#!/usr/bin/env tsx
/**
 * Script to fix protocol mapping data by consolidating protocol variants
 * This addresses the issue where protocol variants (e.g., "PancakeSwap AMM") 
 * are incorrectly marked as tokenless when they should inherit the parent protocol's token
 */

import * as fs from 'fs'
import * as path from 'path'

const MAPPING_FILE = path.join(__dirname, '../data/protocol-mappings.json')
const BACKUP_FILE = path.join(__dirname, '../data/protocol-mappings.backup.json')

interface ProtocolMapping {
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

interface MappingData {
  version: string
  generated_at: string
  total_protocols: number
  mappings: Record<string, ProtocolMapping>
  tokenless_protocols: string[]
  defillama_mappings?: string[]
  statistics?: any
}

// Protocol variant consolidation rules
const PROTOCOL_VARIANTS: Record<string, string> = {
  // Hyperliquid variants
  'Hyperliquid Spot Orderbook': 'Hyperliquid',
  'Hyperliquid Bridge': 'Hyperliquid',
  
  // PancakeSwap variants  
  'PancakeSwap AMM': 'PancakeSwap',
  'PancakeSwap AMM V3': 'PancakeSwap',
  'PancakeSwap StableSwap': 'PancakeSwap',
  
  // Jupiter variants
  'Jupiter Perpetual Exchange': 'Jupiter',
  'Jupiter Aggregator': 'Jupiter', 
  'Jupiter DCA': 'Jupiter',
  
  // AAVE variants
  'AAVE V3': 'Aave',
  
  // Lido variants
  'Lido': 'Lido DAO',
  'ether.fi Liquid': 'Ether.fi',
  
  // Raydium variants
  'Raydium AMM': 'Raydium',
  
  // Uniswap variants
  'Uniswap Labs': 'Uniswap',
  'Uniswap V3': 'Uniswap',
  
  // GMX variants
  'GMX V2 Perps': 'GMX',
  
  // Curve variants
  'Curve DEX': 'Curve DAO Token',
  
  // Aerodrome variants
  'Aerodrome V1': 'Aerodrome Finance',
  'Aerodrome Slipstream': 'Aerodrome Finance',
  
  // dYdX variants
  'dYdX V4': 'dYdX',
  
  // PulseX variants
  'PulseX V1': 'PulseX',
  
  // Thorchain variants
  'Thorchain DEX': 'THORChain',
  
  // Meteora variants
  'Meteora Dynamic Bonding Curve': 'Meteora',
  'Meteora DAMM V2': 'Meteora',
  
  // Sky variants (related to MakerDAO)
  'Sky Lending': 'Sky',
  
  // Velodrome variants
  'Velodrome V3': 'Velodrome',
  
  // Compound variants
  'Compound V3': 'Compound',
  
  // Balancer variants
  'Balancer V2': 'Balancer',
  
  // Synthetix variants
  'Synthetix V3': 'Synthetix',
  
  // Stargate variants
  'Stargate V1': 'Stargate Finance',
  
  // JOE variants
  'Joe DEX': 'JOE',
  
  // Abracadabra variants
  'Abracadabra Spell': 'Spell Token',
  
  // Bancor variants
  'Bancor V3': 'Bancor',
  
  // Frax variants
  'Frax Finance': 'Frax',
  
  // Convex variants
  'Convex Finance V1': 'Convex Finance',
  
  // SushiSwap variants
  'SushiSwap V2': 'Sushi',
  'SushiSwap AMM': 'Sushi',
  
  // BONK variants
  'letsBONK.fun': 'Bonk',
}

// Protocols that are actually tokenless (infrastructure, wallets, etc.)
const ACTUALLY_TOKENLESS = new Set([
  'Axiom',
  'Trojan', 
  'GMGN',
  'Bloom Trading Bot',
  'edgeX',
  'BullX',
  'Maestro',
  'LaunchLab',
  'CoWSwap',
  'Ondo Finance',
  'SoSoValue Indexes',
  'Jito Liquid Staking',
  'Kamino Lend',
  'Banana Gun',
  'Shadow Exchange CLMM',
  'Orca',
  'UniDerp',
  'moonshot.money',
  'DEX Screener',
  'Pharaoh CL',
  'boop.fun',
  'KyberSwap Aggregator',
  'Cetus AMM',
  'Drift Trade',
  'LI.FI Bridge Aggregator',
  'Infrared Finance',
  'Trust Wallet',
  'four.meme',
  'Arbitrum Timeboost',
  'Rabby Wallet',
  'Ethena USDe',
  'Penpie',
  'SideShift',
  'deBridge',
  'Ostium',
  'KGeN',
  'TRONSAVE',
  'Suilend',
  'SolTradingBot',
  'DEXTools',
  'Mayan',
  'Superchain',
  'SSV Network',
  'clanker',
  'Gacha',
  'crvUSD',
  'Inverse Finance FiRM',
  'Bluefin Spot',
  'DODO AMM',
  'Moonshot Create',
  'NAVI Lending',
  'SolvBTC',
  'ODOS',
  'Bucket CDP',
  'Looter',
  'Maple',
  'THENA FUSION',
  'Virtuals Protocol',
  'Metronome Synth',
  'Resupply',
  'Vertex Perps',
  'VECTOR.FUN',
  'Satori Perp',
  'Padre',
  'Scallop Lend',
  'Arena DEX',
  'MEVX',
  'Momentum',
  'Echelon Market'
])

async function fixProtocolMappings() {
  console.log('🔧 Starting protocol mapping consolidation...')
  
  try {
    // Create backup
    if (fs.existsSync(MAPPING_FILE)) {
      console.log('💾 Creating backup...')
      fs.copyFileSync(MAPPING_FILE, BACKUP_FILE)
      console.log('✅ Backup created')
    } else {
      console.error('❌ Mapping file not found:', MAPPING_FILE)
      return
    }
    
    // Load current mappings
    console.log('📖 Loading current mappings...')
    const data: MappingData = JSON.parse(fs.readFileSync(MAPPING_FILE, 'utf8'))
    
    console.log(`📊 Current stats:`)
    console.log(`  - Total protocols: ${data.total_protocols}`)
    console.log(`  - Tokenless protocols: ${data.tokenless_protocols?.length || 0}`)
    console.log(`  - Mapped protocols: ${Object.keys(data.mappings).length}`)
    
    // Track changes
    let fixedCount = 0
    let consolidatedCount = 0
    const newTokenlessProtocols: string[] = []
    
    // Process each mapping
    console.log('\n🔄 Processing protocol variants...')
    
    for (const [protocolName, mapping] of Object.entries(data.mappings)) {
      // Check if this protocol should inherit from a parent
      const parentProtocol = PROTOCOL_VARIANTS[protocolName]
      
      if (parentProtocol && data.mappings[parentProtocol]) {
        const parentMapping = data.mappings[parentProtocol]
        
        // Only consolidate if parent has a valid token and current doesn't
        if (parentMapping.symbol && parentMapping.coingecko_id && 
            (!mapping.symbol || mapping.is_tokenless)) {
          
          console.log(`🔄 Consolidating: "${protocolName}" -> "${parentProtocol}" (${parentMapping.symbol})`)
          
          // Inherit token data from parent
          data.mappings[protocolName] = {
            ...mapping,
            coingecko_id: parentMapping.coingecko_id,
            symbol: parentMapping.symbol,
            confidence: parentMapping.confidence * 0.95, // Slightly lower confidence for variants
            match_method: 'variant_consolidation',
            is_tokenless: false,
            last_verified: new Date().toISOString(),
            variations_tried: [...new Set([...mapping.variations_tried, protocolName.toLowerCase()])]
          }
          
          consolidatedCount++
        }
      }
      // Check if protocol is incorrectly marked as tokenless
      else if (mapping.is_tokenless && !ACTUALLY_TOKENLESS.has(protocolName)) {
        console.log(`⚠️  Reviewing tokenless: "${protocolName}" - may need manual review`)
      }
      // Check if actually tokenless protocols are correctly marked
      else if (ACTUALLY_TOKENLESS.has(protocolName) && !mapping.is_tokenless) {
        console.log(`🔧 Fixing tokenless: "${protocolName}"`)
        data.mappings[protocolName] = {
          ...mapping,
          coingecko_id: null,
          symbol: null,
          confidence: 0,
          match_method: 'tokenless',
          is_tokenless: true,
          last_verified: new Date().toISOString()
        }
        fixedCount++
      }
    }
    
    // Rebuild tokenless protocols list
    console.log('\n📋 Rebuilding tokenless protocols list...')
    const updatedTokenlessProtocols = Object.entries(data.mappings)
      .filter(([_, mapping]) => mapping.is_tokenless)
      .map(([name, _]) => name)
    
    data.tokenless_protocols = updatedTokenlessProtocols
    
    // Update metadata
    data.generated_at = new Date().toISOString()
    data.version = '1.2'
    
    // Recalculate statistics
    const successful = Object.values(data.mappings).filter(m => m.symbol && !m.is_tokenless).length
    const tokenless = Object.values(data.mappings).filter(m => m.is_tokenless).length
    const failed = Object.values(data.mappings).filter(m => !m.symbol && !m.is_tokenless).length
    
    data.statistics = {
      ...data.statistics,
      successful_mappings: successful,
      tokenless_protocols: tokenless,
      failed_mappings: failed,
      consolidation_fixes: consolidatedCount,
      tokenless_fixes: fixedCount
    }
    
    // Save updated mappings
    console.log('\n💾 Saving consolidated mappings...')
    fs.writeFileSync(MAPPING_FILE, JSON.stringify(data, null, 2))
    
    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('🎉 PROTOCOL MAPPING CONSOLIDATION COMPLETE')
    console.log('='.repeat(60))
    console.log(`Protocols consolidated: ${consolidatedCount}`)
    console.log(`Tokenless fixes: ${fixedCount}`)
    console.log(`Total mapped with tokens: ${successful}`)
    console.log(`Total actually tokenless: ${tokenless}`)
    console.log(`Total failed mappings: ${failed}`)
    console.log(`Updated file: ${MAPPING_FILE}`)
    console.log(`Backup file: ${BACKUP_FILE}`)
    console.log('='.repeat(60))
    
    if (consolidatedCount > 0 || fixedCount > 0) {
      console.log('\n✅ Mapping data has been fixed! The newsletter should now display tokens correctly.')
    } else {
      console.log('\n💡 No changes needed - mappings are already correct.')
    }
    
  } catch (error) {
    console.error('❌ Error fixing mappings:', error)
    
    // Restore backup
    if (fs.existsSync(BACKUP_FILE)) {
      console.log('🔄 Restoring backup...')
      fs.copyFileSync(BACKUP_FILE, MAPPING_FILE)
      console.log('✅ Backup restored')
    }
    
    process.exit(1)
  }
}

// Run the script
if (require.main === module) {
  fixProtocolMappings()
    .then(() => {
      console.log('\n✅ Fix completed successfully!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Fix failed:', error)
      process.exit(1)
    })
}

export { fixProtocolMappings } 