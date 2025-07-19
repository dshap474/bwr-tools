'use client'

import { useState, useEffect } from 'react'
import { defiLlamaAPI } from '@/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '@/lib/api-wrappers/coingecko-api-wrapper'
import { DeFiAnalyticsService } from '@/lib/services/defi-analytics-service'
import { protocolMappingService } from '@/lib/services/protocol-mapping-service'
import type { ProtocolMappingResult } from '@/lib/api-wrappers/coingecko-api-wrapper'
import { Button } from '@/components/ui/button'

// Import components
import NewsletterHeader from './components/newsletter-header'
import PeriodSelector from './components/period-selector'
import RevenueChart from './components/revenue-chart'
import RevenueStats from './components/revenue-stats'
import ProtocolTable from './components/protocol-table'
import ExcludedProtocols from './components/excluded-protocols'
import NewsflowPlaceholder from './components/newsflow-placeholder'
import AssetView from './components/asset-view'
import LoadingProgress from './components/loading-progress'

interface IndexData {
  date: string
  btc_price: number
  eth_price: number
  sol_price: number
  index_value: number
  index_change: number
}

interface RevenueIndexData {
  date: string
  index_value: number
  index_change: number
  top_protocols: string[]
  total_revenue: number
  protocol_revenues?: ProtocolRevenue[]
  weighting_strategy?: string
  protocols_count?: number
}

interface ProtocolRevenue {
  name: string
  slug: string
  quarterly_revenue: number
  monthly_revenue?: number
  market_cap: number
  weight: number
  token?: string
  coingecko_id?: string | null
  mapping_confidence?: number
  mapping_status?: 'success' | 'partial' | 'failed'
  match_method?: string
  defillama_slug?: string | null
  defillama_name?: string | null
  is_tokenless?: boolean
}

type TabType = 'indices' | 'dashboards' | 'newsflow'
type TimePeriod = 'W' | 'M' | 'Q' | 'Y'
type ViewType = 'chart' | 'asset'

interface LoadingStep {
  name: string
  status: 'pending' | 'loading' | 'completed' | 'error'
  progress: number
}

export default function NewsletterPage() {
  const [indexData, setIndexData] = useState<IndexData[]>([])
  const [revenueIndexData, setRevenueIndexData] = useState<RevenueIndexData[]>([])
  const [loading, setLoading] = useState(false)
  const [chartDataLoading, setChartDataLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('indices')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('W')
  const [viewType, setViewType] = useState<ViewType>('chart')
  const [dataCache, setDataCache] = useState<Record<TimePeriod, IndexData[]>>({} as Record<TimePeriod, IndexData[]>)
  const [revenueDataCache, setRevenueDataCache] = useState<Record<TimePeriod, RevenueIndexData[]>>({} as Record<TimePeriod, RevenueIndexData[]>)
  const [loadingPeriods, setLoadingPeriods] = useState<Set<TimePeriod>>(new Set())
  const [protocolRevenues, setProtocolRevenues] = useState<ProtocolRevenue[]>([])
  const [chartDataAvailable, setChartDataAvailable] = useState(false)
  const [excludedProtocols] = useState<string[]>(['Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask', 'Axiom', 'Trojan', 'GMGN', 'Bloom Trading Bot'])
  
  // Loading progress state
  const [loadingSteps, setLoadingSteps] = useState<LoadingStep[]>([
    { name: 'Revenue Data', status: 'pending', progress: 0 },
    { name: 'Protocol Mappings', status: 'pending', progress: 0 },
    { name: 'Market Cap Data', status: 'pending', progress: 0 },
    { name: 'Asset Price Data', status: 'pending', progress: 0 },
    { name: 'Caching Periods', status: 'pending', progress: 0 }
  ])
  const [currentLoadingStep, setCurrentLoadingStep] = useState<string>('Initializing...')
  const [showLoadingProgress, setShowLoadingProgress] = useState(false)
  
  // Initialize DeFi Analytics Service for enhanced protocol mapping
  const [defiAnalyticsService] = useState(() => new DeFiAnalyticsService(defiLlamaAPI, coinGeckoAPI))

  // Helper functions to update loading progress
  const updateLoadingStep = (stepName: string, status: LoadingStep['status'], progress: number) => {
    setLoadingSteps(prev => prev.map(step => 
      step.name === stepName 
        ? { ...step, status, progress }
        : step
    ))
  }

  const updateCurrentStep = (stepName: string) => {
    setCurrentLoadingStep(stepName)
  }

  const getOverallProgress = () => {
    const totalProgress = loadingSteps.reduce((sum, step) => sum + step.progress, 0)
    return totalProgress / loadingSteps.length
  }

  // Enhanced protocol name normalization for better token mapping
  const normalizeProtocolName = (protocolName: string): string => {
    const name = protocolName.toLowerCase().trim()
    
    console.log(`🔄 Normalizing: "${protocolName}" -> "${name}"`)
    
    // Handle specific protocol variations with exact mappings
    const protocolMappings: Record<string, string> = {
      'hyperliquid spot orderbook': 'Hyperliquid',
      'pancakeswap amm': 'PancakeSwap', 
      'uniswap labs': 'Uniswap',
      'aave v3': 'AAVE',
      'sky lending': 'Lido', // Sky is related to MakerDAO/Lido
      'raydium amm': 'Raydium',
      'jupiter perpetual exchange': 'Jupiter',
      'jupiter aggregator': 'Jupiter',
      'aerodrome slipstream': 'Aerodrome',
      'lido': 'Lido',
      'pendle': 'Pendle'
    }
    
    // Try exact mapping first
    if (protocolMappings[name]) {
      console.log(`✅ Exact mapping: "${name}" -> "${protocolMappings[name]}"`)
      return protocolMappings[name]
    }
    
    // Handle pattern-based mappings
    if (name.includes('hyperliquid')) {
      console.log(`✅ Pattern mapping: hyperliquid -> Hyperliquid`)
      return 'Hyperliquid'
    }
    
    if (name.includes('pancakeswap')) {
      console.log(`✅ Pattern mapping: pancakeswap -> PancakeSwap`)
      return 'PancakeSwap'
    }
    
    if (name.includes('uniswap')) {
      console.log(`✅ Pattern mapping: uniswap -> Uniswap`)
      return 'Uniswap'
    }
    
    if (name.includes('aave')) {
      console.log(`✅ Pattern mapping: aave -> AAVE`)
      return 'AAVE'
    }
    
    if (name.includes('lido') || name.includes('sky')) {
      console.log(`✅ Pattern mapping: lido/sky -> Lido`)
      return 'Lido'
    }
    
    if (name.includes('raydium')) {
      console.log(`✅ Pattern mapping: raydium -> Raydium`)
      return 'Raydium'
    }
    
    if (name.includes('jupiter')) {
      console.log(`✅ Pattern mapping: jupiter -> Jupiter`)
      return 'Jupiter'
    }
    
    if (name.includes('aerodrome')) {
      console.log(`✅ Pattern mapping: aerodrome -> Aerodrome`)
      return 'Aerodrome'
    }
    
    if (name.includes('pendle')) {
      console.log(`✅ Pattern mapping: pendle -> Pendle`)
      return 'Pendle'
    }
    
    console.log(`⚪ No normalization needed: "${protocolName}"`)
    return protocolName
  }

  // Check if a protocol is actually tokenless using mapping service
  const isTokenlessProtocol = (protocolName: string): boolean => {
    // First try the normalized name
    const normalizedName = normalizeProtocolName(protocolName)
    
    // Check the mapping service for tokenless status
    const isTokenlessFromService = protocolMappingService.isTokenlessProtocol(normalizedName)
    if (isTokenlessFromService) {
      return true
    }
    
    // Also check the original name
    const isTokenlessOriginal = protocolMappingService.isTokenlessProtocol(protocolName)
    if (isTokenlessOriginal) {
      return true
    }
    
    // Known tokenless protocols that are infrastructure/wallets only
    const knownTokenless = new Set([
      'axiom',
      'phantom',
      'coinbase wallet',
      'metamask',
    ])
    
    const lowerName = protocolName.toLowerCase()
    return knownTokenless.has(lowerName) ||
           Array.from(knownTokenless).some(excluded => lowerName.includes(excluded))
  }

  // Enhanced protocol exclusion check
  const isExcludedProtocol = (protocolName: string): boolean => {
    const normalizedName = protocolName.toLowerCase()
    const normalizedExcluded = excludedProtocols.map(p => p.toLowerCase())
    
    // Direct match
    if (normalizedExcluded.includes(normalizedName)) {
      return true
    }
    
    // Partial match for protocol variations
    return normalizedExcluded.some(excluded => {
      return normalizedName.includes(excluded) || excluded.includes(normalizedName)
    })
  }

  // Enhanced protocol combination logic
  const combineRelatedProtocols = (protocol: string): string => {
    const protocolLower = protocol.toLowerCase()
    
    // Pump.fun ecosystem
    if (protocolLower.includes('pump') && (protocolLower.includes('swap') || protocolLower.includes('bot'))) {
      return 'pump.fun'
    }
    
    // BONK ecosystem  
    if (protocolLower.includes('bonk') && protocolLower.includes('bot')) {
      return 'letsBONK.fun'
    }
    
    // Uniswap variations
    if (protocolLower.includes('uniswap')) {
      return 'Uniswap Labs'
    }
    
    // PancakeSwap variations
    if (protocolLower.includes('pancake')) {
      return 'PancakeSwap AMM'
    }
    
    // AAVE variations
    if (protocolLower.includes('aave')) {
      return 'AAVE V3'
    }
    
    return protocol
  }

  const getStartOfPeriod = (period: TimePeriod): Date => {
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
    return startOfPeriod
  }

  // Load basic revenue data for the table (instant loading)
  const loadBasicRevenueData = async () => {
    console.log('🔄 Loading basic revenue data for table...')
    setLoading(true)
    setError(null)
    
    try {
      // Get historical revenue data for quarterly calculation
      const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
      
      // Calculate quarterly and monthly revenue for each protocol
      const quarterlyRevenue: Record<string, number> = {}
      const monthlyRevenue: Record<string, number> = {}
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      const oneMonthAgo = new Date()
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
      
      console.log(`Filtering revenue data from ${threeMonthsAgo.toISOString()} to ${new Date().toISOString()}`)
      
      // Filter to last 3 months and sum by protocol
      const recentRevenue = revenueData.filter(point => 
        new Date(point.timestamp) >= threeMonthsAgo
      )
      
      // Filter to last 1 month for monthly revenue
      const monthlyRevenueData = revenueData.filter(point => 
        new Date(point.timestamp) >= oneMonthAgo
      )
      
      recentRevenue.forEach(point => {
        Object.entries(point).forEach(([protocol, revenue]) => {
          if (protocol !== 'timestamp' && protocol !== 'total_crypto_revenue' && typeof revenue === 'number') {
            // Use enhanced protocol combination logic
            const combinedProtocol = combineRelatedProtocols(protocol)
            quarterlyRevenue[combinedProtocol] = (quarterlyRevenue[combinedProtocol] || 0) + revenue
          }
        })
      })
      
      monthlyRevenueData.forEach(point => {
        Object.entries(point).forEach(([protocol, revenue]) => {
          if (protocol !== 'timestamp' && protocol !== 'total_crypto_revenue' && typeof revenue === 'number') {
            // Use enhanced protocol combination logic
            const combinedProtocol = combineRelatedProtocols(protocol)
            monthlyRevenue[combinedProtocol] = (monthlyRevenue[combinedProtocol] || 0) + revenue
          }
        })
      })
      
      // Filter out excluded protocols using enhanced exclusion check
      const filteredRevenue = Object.entries(quarterlyRevenue)
        .filter(([protocol]) => !isExcludedProtocol(protocol))
      
      // Get top 50 protocols by quarterly revenue (after exclusions)
      const topProtocolsByRevenue = filteredRevenue
        .sort(([, a], [, b]) => b - a)
        .slice(0, 50)
        .map(([protocol, revenue]) => ({ protocol, revenue }))
      
      console.log('Top 50 protocols by quarterly revenue (after exclusions):', topProtocolsByRevenue)
      
      // Get basic protocol mappings from cache (without API calls)
      const basicProtocolData: ProtocolRevenue[] = topProtocolsByRevenue.map(({ protocol, revenue }) => {
        const normalizedName = normalizeProtocolName(protocol)
        const coingeckoId = protocolMappingService.getCoinGeckoId(protocol) || protocolMappingService.getCoinGeckoId(normalizedName)
        const defillamaSlug = protocolMappingService.getDeFiLlamaSlug(protocol) || protocolMappingService.getDeFiLlamaSlug(normalizedName)
        const defillamaName = protocolMappingService.getDeFiLlamaName(protocol) || protocolMappingService.getDeFiLlamaName(normalizedName)
        const isTokenless = protocolMappingService.isTokenlessProtocol(protocol) || protocolMappingService.isTokenlessProtocol(normalizedName)
        
        // Get basic token symbol if available
        let tokenSymbol: string | undefined
        let mappingStatus: 'success' | 'partial' | 'failed' = 'failed'
        
        if (coingeckoId) {
          // Try to extract token symbol from CoinGecko ID
          const symbolMap: Record<string, string> = {
            'hyperliquid': 'HYPE',
            'pancakeswap-token': 'CAKE',
            'pump-fun': 'PUMP',
            'bonk': 'BONK',
            'aerodrome-finance': 'AERO',
            'sky': 'SKY',
            'aave': 'AAVE',
            'lido-dao': 'LDO',
            'raydium': 'RAY',
            'uniswap': 'UNI',
            'pendle': 'PENDLE',
            'thorchain': 'RUNE'
          }
          tokenSymbol = symbolMap[coingeckoId] || coingeckoId.toUpperCase()
          mappingStatus = 'partial' // We have mapping but no market cap yet
        } else if (isTokenless) {
          mappingStatus = 'success' // Tokenless protocols are successfully identified
        }
        
        return {
          name: protocol,
          slug: protocol.toLowerCase().replace(/\s+/g, '-'),
          quarterly_revenue: revenue,
          monthly_revenue: monthlyRevenue[protocol] || 0,
          market_cap: 0, // Will be filled when chart data is loaded
          weight: 0, // Will be calculated when chart data is loaded
          token: tokenSymbol,
          coingecko_id: coingeckoId,
          mapping_confidence: coingeckoId ? 0.8 : 0,
          mapping_status: mappingStatus,
          match_method: coingeckoId ? 'cached' : 'none',
          defillama_slug: defillamaSlug,
          defillama_name: defillamaName,
          is_tokenless: isTokenless
        }
      })
      
      setProtocolRevenues(basicProtocolData)
      console.log(`✅ Loaded basic data for ${basicProtocolData.length} protocols`)
      
    } catch (err) {
      console.error('Error loading basic revenue data:', err)
      setError('Failed to load revenue data')
    } finally {
      setLoading(false)
    }
  }

  // Load enhanced data for charts (triggered by button)
  const loadChartData = async (period: TimePeriod, forceRefresh = false) => {
    console.log(`🔄 Loading chart data for period: ${period}`)
    
    // If chart data is already cached and we're not forcing refresh, use cached data
    if (revenueDataCache[period] && !forceRefresh && chartDataAvailable) {
      console.log(`📋 Using cached chart data for period: ${period}`)
      setRevenueIndexData(revenueDataCache[period])
      return
    }

    setChartDataLoading(true)
    setShowLoadingProgress(true)
    setError(null)
    
    // Reset loading steps
    setLoadingSteps([
      { name: 'Protocol Mappings', status: 'pending', progress: 0 },
      { name: 'Market Cap Data', status: 'pending', progress: 0 },
      { name: 'Asset Price Data', status: 'pending', progress: 0 },
      { name: 'Caching Periods', status: 'pending', progress: 0 }
    ])
    
    try {
      if (protocolRevenues.length === 0) {
        await loadBasicRevenueData()
      }
      
      // Update loading progress - Protocol Mappings
      updateCurrentStep('Loading protocol mappings...')
      updateLoadingStep('Protocol Mappings', 'loading', 50)
      
      const topProtocolsByRevenue = protocolRevenues.map(p => ({
        protocol: p.name,
        revenue: p.quarterly_revenue
      }))
      
      // Use cached protocol mapping service for enhanced mappings
      console.log('🔍 Loading enhanced protocol mappings...')
      const protocolNames = topProtocolsByRevenue.reduce((acc: string[], p) => {
        acc.push(p.protocol)
        const normalized = normalizeProtocolName(p.protocol)
        if (normalized !== p.protocol) {
          acc.push(normalized)
        }
        return acc
      }, [])
      
      let cachedMappings: Map<string, ProtocolMappingResult> = new Map()
      
      try {
        cachedMappings = await Promise.race([
          protocolMappingService.getProtocolMappings(protocolNames),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Protocol mapping timeout')), 120000)
          )
        ])
        updateLoadingStep('Protocol Mappings', 'completed', 100)
        updateCurrentStep('Protocol mappings completed')
      } catch (error) {
        console.warn('Protocol mapping failed, using cached data:', error)
        updateLoadingStep('Protocol Mappings', 'error', 50)
        updateCurrentStep('Protocol mappings failed, continuing...')
      }
      
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Process mappings
      const mappingResults: Array<{
        protocol: string
        revenue: number
        monthly_revenue: number
        mapping: ProtocolMappingResult
      }> = []
      
      for (const { protocol, revenue } of topProtocolsByRevenue) {
        const protocolData = protocolRevenues.find(p => p.name === protocol)
        let mapping = cachedMappings.get(protocol)
        
        if (!mapping || mapping.confidence === 0) {
          const normalizedName = normalizeProtocolName(protocol)
          if (normalizedName !== protocol) {
            const normalizedMapping = cachedMappings.get(normalizedName)
            if (normalizedMapping && normalizedMapping.confidence > 0) {
              mapping = normalizedMapping
            }
          }
        }
        
        if (mapping && mapping.confidence > 0) {
          mappingResults.push({ 
            protocol, 
            revenue, 
            monthly_revenue: protocolData?.monthly_revenue || 0, 
            mapping 
          })
        } else {
          mappingResults.push({ 
            protocol, 
            revenue, 
            monthly_revenue: protocolData?.monthly_revenue || 0,
            mapping: {
              coin: null,
              confidence: 0,
              matchMethod: 'failed',
              searchVariations: []
            }
          })
        }
      }
      
      // Update loading progress - Market Cap Data
      updateCurrentStep('Fetching market cap data...')
      updateLoadingStep('Market Cap Data', 'loading', 75)
      
      const successfulMappings = mappingResults
        .filter(result => result.mapping.coin && result.mapping.confidence >= 0.4)
        .map(result => result.mapping.coin!.id)
      
      let marketCaps: Record<string, number> = {}
      if (successfulMappings.length > 0) {
        try {
          const response = await fetch('/api/market-caps', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ coinIds: successfulMappings })
          })
          
          if (response.ok) {
            const data = await response.json()
            marketCaps = data.marketCaps || {}
          }
        } catch (error) {
          console.warn('Market cap fetch failed:', error)
        }
      }
      
      updateLoadingStep('Market Cap Data', 'completed', 100)
      updateCurrentStep('Market cap data completed')
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Process enhanced protocol data
      const enhancedProtocols = mappingResults.map(({ protocol, revenue, monthly_revenue, mapping }) => {
        let marketCap: number = 0
        let mappingStatus: 'success' | 'partial' | 'failed' = 'failed'
        let tokenSymbol: string | undefined = undefined
        
        if (mapping.coin && mapping.confidence >= 0.4) {
          marketCap = marketCaps[mapping.coin.id] || 0
          mappingStatus = marketCap > 0 ? 'success' : 'partial'
          tokenSymbol = mapping.coin.symbol?.toUpperCase()
        } else if (mapping.coin && mapping.coin.symbol) {
          tokenSymbol = mapping.coin.symbol?.toUpperCase()
          mappingStatus = 'partial'
        } else {
          const isActuallyTokenless = protocolMappingService.isTokenlessProtocol(protocol)
          if (isActuallyTokenless) {
            mappingStatus = 'success'
          }
        }
        
        return {
          protocol,
          revenue,
          monthly_revenue,
          tokenSymbol,
          marketCap,
          mappingStatus,
          confidence: mapping.confidence,
          matchMethod: mapping.matchMethod
        }
      })
      
      // Calculate weights and create enhanced protocol data
      const protocolsWithMarketCap = enhancedProtocols.filter(p => 
        p.mappingStatus === 'success' && 
        p.marketCap > 0 && 
        p.tokenSymbol
      )
      const totalMarketCapSuccessful = protocolsWithMarketCap.reduce((sum, p) => sum + p.marketCap, 0)
      const useMarketCapWeighting = protocolsWithMarketCap.length >= 5 && totalMarketCapSuccessful > 0
      const weightingStrategy = useMarketCapWeighting ? 'market_cap' : 'equal'
      
      // Update protocol revenues with enhanced data
      const enhancedProtocolRevenues: ProtocolRevenue[] = enhancedProtocols.map(p => {
        const isTokenless = protocolMappingService.isTokenlessProtocol(p.protocol)
        
        let calculatedWeight = 0
        if (useMarketCapWeighting && p.mappingStatus === 'success' && p.marketCap > 0 && p.tokenSymbol) {
          calculatedWeight = p.marketCap / totalMarketCapSuccessful
        } else if (!useMarketCapWeighting && p.mappingStatus === 'success' && p.tokenSymbol && !isTokenless) {
          const eligibleProtocols = enhancedProtocols.filter(tp => 
            tp.mappingStatus === 'success' && 
            tp.tokenSymbol && 
            !protocolMappingService.isTokenlessProtocol(tp.protocol)
          )
          calculatedWeight = eligibleProtocols.length > 0 ? 1 / eligibleProtocols.length : 0
        }
        
        calculatedWeight = Math.max(0, Math.min(1, calculatedWeight || 0))
        
        return {
          name: p.protocol,
          slug: p.protocol.toLowerCase().replace(/\s+/g, '-'),
          quarterly_revenue: p.revenue,
          monthly_revenue: p.monthly_revenue,
          market_cap: p.marketCap,
          weight: calculatedWeight,
          token: p.tokenSymbol,
          coingecko_id: protocolMappingService.getCoinGeckoId(p.protocol),
          mapping_confidence: p.confidence,
          mapping_status: p.mappingStatus,
          match_method: p.matchMethod,
          defillama_slug: protocolMappingService.getDeFiLlamaSlug(p.protocol),
          defillama_name: protocolMappingService.getDeFiLlamaName(p.protocol),
          is_tokenless: isTokenless
        }
      })
      
      setProtocolRevenues(enhancedProtocolRevenues)
      
      // Filter protocols for index
      const eligibleProtocols = enhancedProtocolRevenues
        .filter(p => 
          p.token && 
          !p.is_tokenless && 
          p.mapping_status === 'success' &&
          p.weight > 0
        )
        .slice(0, 25)
      
      // Update loading progress - Asset Price Data
      updateCurrentStep(`Fetching price data for ${eligibleProtocols.length} tokens...`)
      updateLoadingStep('Asset Price Data', 'loading', 80)
      
      let indexValues: RevenueIndexData[] = []
      
      if (eligibleProtocols.length > 0) {
        try {
          const coinGeckoIds = eligibleProtocols
            .map(p => protocolMappingService.getCoinGeckoId(p.name))
            .filter(id => id !== null) as string[]
          
          const startDate = getStartOfPeriod(period)
          const daysSinceStart = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
          const span = Math.min(Math.max(daysSinceStart, 1), 365)
          
          let allPriceData = []
          
          try {
            const response = await fetch('/api/historical-prices', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                coinIds: coinGeckoIds,
                days: span
              })
            })
            
            if (response.ok) {
              const data = await response.json()
              allPriceData = data.priceData || []
            }
          } catch (error) {
            console.warn('Historical price fetch failed:', error)
            allPriceData = coinGeckoIds.map(coinId => ({ coinId, prices: [] }))
          }
          
          // Create price maps and calculate index
          const priceMap = new Map<string, Map<string, number>>()
          const allDates = new Set<string>()
          
          allPriceData.forEach((tokenData: any) => {
            const { coinId, prices } = tokenData
            const pricesByDate = new Map<string, number>()
            
            prices.forEach((point: [number, number]) => {
              const dateKey = new Date(point[0]).toISOString().split('T')[0]
              pricesByDate.set(dateKey, point[1])
              allDates.add(dateKey)
            })
            
            priceMap.set(coinId, pricesByDate)
          })
          
          const sortedDates = Array.from(allDates).sort()
          const startDateStr = startDate.toISOString().split('T')[0]
          let baselineValue = 100
          let hasBaseline = false
          
          sortedDates.forEach(dateKey => {
            if (dateKey >= startDateStr) {
              let weightedReturn = 0
              let totalWeight = 0
              
              eligibleProtocols.forEach(protocol => {
                const coinId = protocolMappingService.getCoinGeckoId(protocol.name)
                if (coinId && priceMap.has(coinId)) {
                  const prices = priceMap.get(coinId)!
                  const currentPrice = prices.get(dateKey)
                  const baselinePrice = prices.get(startDateStr) || prices.get(sortedDates.find(d => d >= startDateStr) || dateKey)
                  
                  if (currentPrice && baselinePrice && baselinePrice > 0) {
                    const tokenReturn = (currentPrice - baselinePrice) / baselinePrice
                    weightedReturn += tokenReturn * protocol.weight
                    totalWeight += protocol.weight
                  }
                }
              })
              
              if (totalWeight > 0) {
                const indexReturn = weightedReturn / totalWeight
                const currentValue = hasBaseline ? baselineValue * (1 + indexReturn) : baselineValue
                
                if (!hasBaseline) {
                  hasBaseline = true
                }
                
                const changeFromBaseline = ((currentValue - baselineValue) / baselineValue) * 100
                
                indexValues.push({
                  date: dateKey,
                  index_value: currentValue,
                  index_change: changeFromBaseline,
                  top_protocols: eligibleProtocols.slice(0, 5).map(p => p.name),
                  total_revenue: eligibleProtocols.reduce((sum, p) => sum + p.quarterly_revenue, 0),
                  protocol_revenues: eligibleProtocols,
                  weighting_strategy: weightingStrategy,
                  protocols_count: eligibleProtocols.length
                })
              }
            }
          })
          
          console.log(`✅ Generated ${indexValues.length} index data points`)
          
        } catch (error) {
          console.warn('Failed to fetch price data:', error)
        }
      }
      
      updateLoadingStep('Asset Price Data', 'completed', 100)
      updateCurrentStep('Caching data...')
      updateLoadingStep('Caching Periods', 'loading', 90)
      
      // Cache the data
      setRevenueDataCache(prev => ({ ...prev, [period]: indexValues }))
      setRevenueIndexData(indexValues)
      setChartDataAvailable(true)
      
      updateLoadingStep('Caching Periods', 'completed', 100)
      
    } catch (err) {
      console.error(`Error loading chart data:`, err)
      setError(`Failed to load chart data: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setChartDataLoading(false)
      setTimeout(() => setShowLoadingProgress(false), 1000)
    }
  }

  // Load data automatically when component mounts (basic data only)
  useEffect(() => {
    if (activeTab === 'indices' || activeTab === 'dashboards') {
      loadBasicRevenueData()
    }
  }, [activeTab])

  // Handle time period changes for chart data
  const handleTimePeriodChange = (period: TimePeriod) => {
    setTimePeriod(period)
    
    // If chart data is available and cached for this period, load it
    if (chartDataAvailable && revenueDataCache[period]) {
      setRevenueIndexData(revenueDataCache[period])
    } else if (chartDataAvailable) {
      // If chart data was loaded for another period, load for this period too
      loadChartData(period)
    }
  }

  return (
    <>
      {/* Header */}
      <NewsletterHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'indices' && (
          <div className="space-y-6">
            {/* Index Header with Time Period Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Top 25 Revenue Index - Market Cap Weighted</h2>
                <p className="text-muted-foreground">
                  Top revenue-generating tokens from our protocol dashboard, weighted by market cap (or equal weighted if insufficient data)
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                <PeriodSelector
                  timePeriod={timePeriod}
                  viewType={viewType}
                  loadingPeriods={loadingPeriods}
                  onTimePeriodChange={handleTimePeriodChange}
                  onViewTypeChange={setViewType}
                />
                
                {/* Load Chart Data Button */}
                {!chartDataAvailable && (
                  <Button 
                    onClick={() => loadChartData(timePeriod)}
                    disabled={chartDataLoading}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {chartDataLoading ? 'Loading Charts...' : 'Load Chart Data'}
                  </Button>
                )}
              </div>
            </div>

            {/* Loading Progress for Chart Data */}
            {showLoadingProgress && chartDataLoading && (
              <div className="py-8">
                <LoadingProgress
                  steps={loadingSteps}
                  currentStep={currentLoadingStep}
                  overallProgress={getOverallProgress()}
                  isVisible={showLoadingProgress}
                />
              </div>
            )}

            {/* Simple Loading indicator for basic data */}
            {loading && (
              <div className="text-center text-muted-foreground py-8">
                Loading Revenue Data...
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-center text-red-600 text-sm py-8">
                {error}
              </div>
            )}

            {/* Chart Data Not Loaded Message */}
            {!chartDataAvailable && !chartDataLoading && protocolRevenues.length > 0 && (viewType === 'chart' || viewType === 'asset') && (
              <div className="text-center py-8 bg-muted/30 rounded-lg">
                <p className="text-muted-foreground mb-4">
                  Chart data not loaded. Click "Load Chart Data" to fetch market cap and price data for visualization.
                </p>
                <Button 
                  onClick={() => loadChartData(timePeriod)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Load Chart Data
                </Button>
              </div>
            )}

            {/* Main Content Layout */}
            {chartDataAvailable && revenueIndexData.length > 0 && (
              <div>
                {/* Chart View */}
                {viewType === 'chart' && (
                  <div className="space-y-6">
                    <RevenueChart data={revenueIndexData} />
                    <RevenueStats data={revenueIndexData} />
                  </div>
                )}

                {/* Asset View */}
                {viewType === 'asset' && (
                  <AssetView protocols={protocolRevenues} timePeriod={timePeriod} />
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'dashboards' && (
          <div className="space-y-6">
            {/* Simple Loading indicator for basic data */}
            {loading && (
              <div className="text-center text-muted-foreground py-8">
                Loading Dashboard Data...
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-center text-red-600 text-sm py-8">
                {error}
              </div>
            )}

            {/* Dashboard Content - Shows immediately with basic data */}
            {protocolRevenues.length > 0 && (
              <ProtocolTable protocols={protocolRevenues} />
            )}
          </div>
        )}

        {activeTab === 'newsflow' && <NewsflowPlaceholder />}
      </div>
    </>
  )
}