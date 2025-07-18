'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { defiLlamaAPI } from '@/lib/api-wrappers/defillama-api-wrapper'
import { coinGeckoAPI } from '@/lib/api-wrappers/coingecko-api-wrapper'
import { DeFiAnalyticsService } from '@/lib/services/defi-analytics-service'
import { protocolMappingService } from '@/lib/services/protocol-mapping-service'
import type { ProtocolMappingResult } from '@/lib/api-wrappers/coingecko-api-wrapper'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
}

interface ProtocolRevenue {
  name: string
  slug: string
  quarterly_revenue: number
  market_cap: number
  weight: number
  token?: string
  mapping_confidence?: number
  mapping_status?: 'success' | 'partial' | 'failed'
  match_method?: string
}

type TabType = 'indices' | 'newsflow'
type TimePeriod = 'W' | 'M' | 'Q' | 'Y'
type ViewType = 'chart' | 'table'

export default function NewsletterPage() {
  const [indexData, setIndexData] = useState<IndexData[]>([])
  const [revenueIndexData, setRevenueIndexData] = useState<RevenueIndexData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('indices')
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('W')
  const [viewType, setViewType] = useState<ViewType>('chart')
  const [dataCache, setDataCache] = useState<Record<TimePeriod, IndexData[]>>({} as Record<TimePeriod, IndexData[]>)
  const [revenueDataCache, setRevenueDataCache] = useState<Record<TimePeriod, RevenueIndexData[]>>({} as Record<TimePeriod, RevenueIndexData[]>)
  const [loadingPeriods, setLoadingPeriods] = useState<Set<TimePeriod>>(new Set())
  const [protocolRevenues, setProtocolRevenues] = useState<ProtocolRevenue[]>([])
  const [excludedProtocols] = useState<string[]>(['Tether', 'Circle', 'Phantom', 'Coinbase Wallet', 'MetaMask'])
  
  // Initialize DeFi Analytics Service for enhanced protocol mapping
  const [defiAnalyticsService] = useState(() => new DeFiAnalyticsService(defiLlamaAPI, coinGeckoAPI))

  // Check if a protocol is known to not have a token (for backward compatibility)
  const isTokenlessProtocol = (protocolName: string): boolean => {
    const tokenlessProtocols = new Set([
      'axiom',
      'hyperliquid spot orderbook',
      'aerodrome slipstream',
      'uniswap labs',
      'phantom',
      'coinbase wallet',
      'metamask',
    ])
    
    const normalizedName = protocolName.toLowerCase()
    return tokenlessProtocols.has(normalizedName) ||
           Array.from(tokenlessProtocols).some(excluded => normalizedName.includes(excluded))
  }

  // Helper function to get confidence color styling
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'text-green-600'
    if (confidence >= 0.6) return 'text-yellow-600'
    if (confidence >= 0.4) return 'text-orange-600'
    return 'text-red-600'
  }

  // Helper function to get status badge styling
  const getStatusBadgeClass = (status: 'success' | 'partial' | 'failed'): string => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
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

  const loadRevenueIndexData = async (period: TimePeriod, forceRefresh = false) => {
    // If data is already cached and we're not forcing refresh, use cached data
    if (revenueDataCache[period] && !forceRefresh) {
      setRevenueIndexData(revenueDataCache[period])
      return
    }

    // Mark this period as loading
    setLoadingPeriods(prev => new Set([...prev, period]))
    if (period === timePeriod) {
      setLoading(true)
    }
    setError(null)
    
    try {
      console.log(`Loading revenue index data for period: ${period}`)
      
      // Get historical revenue data for quarterly calculation
      const revenueData = await defiLlamaAPI.getTotalCryptoRevenue(true)
      
      // Calculate quarterly revenue for each protocol
      const quarterlyRevenue: Record<string, number> = {}
      const threeMonthsAgo = new Date()
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
      
      console.log(`Filtering revenue data from ${threeMonthsAgo.toISOString()} to ${new Date().toISOString()}`)
      
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
      
      // Filter out excluded protocols (stablecoins, etc.)
      const filteredRevenue = Object.entries(quarterlyRevenue)
        .filter(([protocol]) => !excludedProtocols.includes(protocol))
      
      // Get top 25 protocols by quarterly revenue (after exclusions)
      const topProtocolsByRevenue = filteredRevenue
        .sort(([, a], [, b]) => b - a)
        .slice(0, 25)
        .map(([protocol, revenue]) => ({ protocol, revenue }))
      
      // Get all protocols from DeFiLlama (for token symbol matching only, NOT market cap)
      const allProtocols = await defiLlamaAPI.getAllProtocols()
      
      console.log('Top 25 protocols by quarterly revenue (after exclusions):', topProtocolsByRevenue)
      console.log('Total protocols found:', Object.keys(quarterlyRevenue).length)
      console.log('Excluded protocols:', excludedProtocols)
      
      // Use enhanced protocol mapping for ALL protocols
      console.log('🔍 Starting enhanced protocol mapping with confidence scoring...')
      const mappingResults: Array<{
        protocol: string
        revenue: number
        mapping: ProtocolMappingResult
      }> = []
      
      for (let i = 0; i < topProtocolsByRevenue.length; i++) {
        const { protocol, revenue } = topProtocolsByRevenue[i]
        
        console.log(`\\n🔎 [${i + 1}/25] Mapping protocol: ${protocol}`)
        
        // Use enhanced protocol mapping with confidence scoring
        const mapping = await coinGeckoAPI.findCoinByProtocolNameWithConfidence(protocol)
        mappingResults.push({ protocol, revenue, mapping })
        
        // Rate limiting: 2 seconds between requests to stay under 30/minute
        if (i < topProtocolsByRevenue.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Batch fetch market caps for successful mappings (confidence >= 0.4)
      console.log('\\n💰 Fetching market caps for successfully mapped protocols...')
      const successfulMappings = mappingResults
        .filter(result => result.mapping.coin && result.mapping.confidence >= 0.4)
        .map(result => result.mapping.coin!.id)
      
      console.log(`📈 Getting market caps for ${successfulMappings.length} protocols`)
      
      const marketCaps = successfulMappings.length > 0 
        ? await coinGeckoAPI.getMarketCapByIds(successfulMappings)
        : {}
      
      // Process and combine all data with confidence and status information
      const topProtocols = mappingResults.map(({ protocol, revenue, mapping }) => {
        let marketCap: number = 0
        let mappingStatus: 'success' | 'partial' | 'failed' = 'failed'
        let tokenSymbol: string | undefined = undefined
        
        if (mapping.coin && mapping.confidence >= 0.4) {
          marketCap = marketCaps[mapping.coin.id] || 0
          mappingStatus = marketCap > 0 ? 'success' : 'partial'
          
          // Only show token symbol if not a tokenless protocol
          if (!isTokenlessProtocol(protocol)) {
            tokenSymbol = mapping.coin.symbol?.toUpperCase()
          }
        } else if (isTokenlessProtocol(protocol)) {
          mappingStatus = 'success' // Consider tokenless protocols as successfully identified
        }
        
        return {
          protocol,
          revenue,
          tokenSymbol,
          marketCap,
          mappingStatus,
          confidence: mapping.confidence,
          matchMethod: mapping.matchMethod
        }
      })
      
      console.log('\\n📊 Enhanced mapping results:')
      mappingResults.forEach((result, i) => {
        const protocol = topProtocols[i]
        console.log(`${result.protocol} -> Token: ${protocol.tokenSymbol || 'N/A'} -> MarketCap: $${protocol.marketCap.toLocaleString()} -> Status: ${protocol.mappingStatus} -> Confidence: ${(protocol.confidence * 100).toFixed(0)}% (${protocol.matchMethod})`)
      })
      
      console.log('Protocol combination results:')
      console.log(`- pump.fun + PumpSwap combined revenue: $${(quarterlyRevenue['pump.fun'] || 0).toLocaleString()}`)
      console.log(`- letsBONK.fun + BONKbot combined revenue: $${(quarterlyRevenue['letsBONK.fun'] || 0).toLocaleString()}`)
      
      // Calculate total market cap only from successfully mapped protocols for accurate percentages
      const successfulProtocols = topProtocols.filter(p => p.mappingStatus === 'success' && p.marketCap > 0)
      const totalMarketCapSuccessful = successfulProtocols.reduce((sum, p) => sum + p.marketCap, 0)
      
      console.log(`\\n📊 Market cap calculation: ${successfulProtocols.length} successful mappings, total market cap: $${totalMarketCapSuccessful.toLocaleString()}`)
      
      // Store protocol revenue data for the table with enhanced mapping information
      const protocolRevenueData: ProtocolRevenue[] = topProtocols.map(p => ({
        name: p.protocol,
        slug: p.protocol.toLowerCase().replace(/\s+/g, '-'),
        quarterly_revenue: p.revenue,
        market_cap: p.marketCap,
        // Calculate weight based only on successfully mapped protocols with market cap data
        weight: (p.mappingStatus === 'success' && p.marketCap > 0 && totalMarketCapSuccessful > 0) 
          ? p.marketCap / totalMarketCapSuccessful 
          : 0,
        token: p.tokenSymbol,
        mapping_confidence: p.confidence,
        mapping_status: p.mappingStatus,
        match_method: p.matchMethod
      }))
      
      setProtocolRevenues(protocolRevenueData)
      
      // Calculate weights (market cap-weighted) - note: weights already calculated above in protocolRevenueData
      const totalRevenue = topProtocols.reduce((sum, p) => sum + p.revenue, 0)
      
      // Generate mock historical data for the index
      // In a real implementation, this would be calculated from historical rebalancing
      const startDate = getStartOfPeriod(period)
      const daysBack = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      const indexValues: RevenueIndexData[] = []
      let baselineValue = 100
      
      // Create daily index values based on weighted average of protocol performance
      for (let i = 0; i <= daysBack; i++) {
        const date = new Date(startDate)
        date.setDate(date.getDate() + i)
        
        // Simulate index performance (in real version, this would be actual protocol TVL/price data)
        const randomChange = (Math.random() - 0.5) * 0.02 // +/- 1% daily volatility
        const currentValue = i === 0 ? baselineValue : indexValues[i - 1].index_value * (1 + randomChange)
        const changeFromBaseline = ((currentValue - baselineValue) / baselineValue) * 100
        
        indexValues.push({
          date: date.toISOString(),
          index_value: currentValue,
          index_change: changeFromBaseline,
          top_protocols: topProtocols.slice(0, 5).map(p => p.protocol),
          total_revenue: totalRevenue
        })
      }
      
      // Cache the data
      setRevenueDataCache(prev => ({ ...prev, [period]: indexValues }))
      
      // Only update display if this is the current period
      if (period === timePeriod) {
        setRevenueIndexData(indexValues)
      }
      
    } catch (err) {
      if (period === timePeriod) {
        setError('Failed to load revenue index data')
      }
      console.error(`Error loading revenue index data for ${period}:`, err)
    } finally {
      // Remove from loading set
      setLoadingPeriods(prev => {
        const newSet = new Set(prev)
        newSet.delete(period)
        return newSet
      })
      
      // Only update loading state if this is the current period
      if (period === timePeriod) {
        setLoading(false)
      }
    }
  }

  const loadIndexData = async (period: TimePeriod, forceRefresh = false) => {
    // If data is already cached and we're not forcing refresh, use cached data
    if (dataCache[period] && !forceRefresh) {
      setIndexData(dataCache[period])
      return
    }

    // Mark this period as loading
    setLoadingPeriods(prev => new Set([...prev, period]))
    if (period === timePeriod) {
      setLoading(true)
    }
    setError(null)
    
    try {
      const startDate = getStartOfPeriod(period)
      const daysSinceStart = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      const span = Math.min(Math.max(daysSinceStart, 1), 365)
      
      console.log(`Period: ${period}, Start: ${startDate.toISOString()}, Days: ${daysSinceStart}, Span: ${span}`)
      
      // Get price data for BTC, ETH, and SOL
      const dataSpan = span
      const dataInterval = '1d'
      
      const btcData = await defiLlamaAPI.getPriceChart(
        'coingecko:bitcoin',
        undefined,
        undefined,
        dataSpan,
        dataInterval
      )
      
      const ethData = await defiLlamaAPI.getPriceChart(
        'coingecko:ethereum',
        undefined,
        undefined,
        dataSpan,
        dataInterval
      )
      
      const solData = await defiLlamaAPI.getPriceChart(
        'coingecko:solana',
        undefined,
        undefined,
        dataSpan,
        dataInterval
      )

      // Create a map for easier lookup
      const getKey = (datetime: string) => datetime.split('T')[0]
      
      const btcPrices = new Map(btcData.map(d => [getKey(d.datetime), d.price]))
      const ethPrices = new Map(ethData.map(d => [getKey(d.datetime), d.price]))
      const solPrices = new Map(solData.map(d => [getKey(d.datetime), d.price]))

      // Get all unique dates/times
      const allDates = new Set([
        ...btcData.map(d => getKey(d.datetime)),
        ...ethData.map(d => getKey(d.datetime)),
        ...solData.map(d => getKey(d.datetime))
      ])

      // Calculate equal-weighted index with performance since start of period
      const indexValues: IndexData[] = []
      const periodStartDate = getStartOfPeriod(period)
      let baselineIndex = 0
      let baselineBtc = 0
      let baselineEth = 0
      let baselineSol = 0

      // Find the first data point on or after the start date
      const sortedDates = Array.from(allDates).sort()
      const startDateStr = periodStartDate.toISOString().split('T')[0]
      
      sortedDates.forEach((dateKey, i) => {
        const btcPrice = btcPrices.get(dateKey)
        const ethPrice = ethPrices.get(dateKey)
        const solPrice = solPrices.get(dateKey)

        if (btcPrice && ethPrice && solPrice) {
          // Set baseline to the first data point at or after the start of the period
          if (baselineIndex === 0 && dateKey >= startDateStr) {
            baselineIndex = (btcPrice + ethPrice + solPrice) / 3
            baselineBtc = btcPrice
            baselineEth = ethPrice
            baselineSol = solPrice
          }

          // Only include data points from the start of the period
          if (dateKey >= startDateStr && baselineIndex > 0) {
            const indexValue = (btcPrice + ethPrice + solPrice) / 3
            const indexChange = ((indexValue - baselineIndex) / baselineIndex) * 100

            indexValues.push({
              date: dateKey,
              btc_price: btcPrice,
              eth_price: ethPrice,
              sol_price: solPrice,
              index_value: indexValue,
              index_change: indexChange
            })
          }
        }
      })

      // Cache the data
      setDataCache(prev => ({ ...prev, [period]: indexValues }))
      
      // Only update display if this is the current period
      if (period === timePeriod) {
        setIndexData(indexValues)
      }
    } catch (err) {
      if (period === timePeriod) {
        setError('Failed to load index data')
      }
      console.error(`Error loading index data for ${period}:`, err)
    } finally {
      // Remove from loading set
      setLoadingPeriods(prev => {
        const newSet = new Set(prev)
        newSet.delete(period)
        return newSet
      })
      
      // Only update loading state if this is the current period
      if (period === timePeriod) {
        setLoading(false)
      }
    }
  }

  const preloadAllData = async () => {
    const periods: TimePeriod[] = ['W', 'M', 'Q', 'Y']
    
    // Start with current period for revenue index
    await loadRevenueIndexData(timePeriod)
    // Then preload other periods in background
    periods.forEach(period => {
      if (period !== timePeriod) {
        loadRevenueIndexData(period).catch(err => {
          console.warn(`Failed to preload revenue ${period} data:`, err)
        })
      }
    })
  }

  const getCurrentStats = () => {
    if (revenueIndexData.length === 0) return null
    
    const latest = revenueIndexData[revenueIndexData.length - 1]
    const previous = revenueIndexData[revenueIndexData.length - 2]
    
    return {
      currentChange: latest.index_change,
      dailyChange: previous ? ((latest.index_value - previous.index_value) / previous.index_value) * 100 : 0,
      totalRevenue: latest.total_revenue,
      topProtocols: latest.top_protocols
    }
  }

  const stats = getCurrentStats()

  // Load data automatically when component mounts
  useEffect(() => {
    if (activeTab === 'indices') {
      preloadAllData()
    }
  }, [activeTab])

  // Handle time period changes (instant switching if cached)
  useEffect(() => {
    if (activeTab === 'indices') {
      if (revenueDataCache[timePeriod]) {
        setRevenueIndexData(revenueDataCache[timePeriod])
      } else {
        loadRevenueIndexData(timePeriod)
      }
    }
  }, [timePeriod])

  return (
    <div className="min-h-screen -mt-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-start py-2 px-6">
        {/* Tab Navigation */}
        <div className="flex border rounded-lg">
          <button
            onClick={() => setActiveTab('indices')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg transition-colors ${
              activeTab === 'indices' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-muted'
            }`}
          >
            Indices
          </button>
          <button
            onClick={() => setActiveTab('newsflow')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg transition-colors ${
              activeTab === 'newsflow' 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-background hover:bg-muted'
            }`}
          >
            Newsflow
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {activeTab === 'indices' && (
          <div className="space-y-6">
            {/* Index Header with Time Period Selector */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Top 25 Revenue Index - Market Cap Weighted</h2>
                <p className="text-muted-foreground">
                  Top 25 tokens by market cap with quarterly revenue, rebalanced monthly
                </p>
              </div>
              
              {/* Time Period Selector and View Toggle */}
              <div className="flex space-x-4">
                {/* Time Period Selector */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  {(['W', 'M', 'Q', 'Y'] as TimePeriod[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setTimePeriod(period)}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition-colors relative ${
                        timePeriod === period 
                          ? 'bg-background text-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {period}
                      {/* Loading indicator for background loading */}
                      {loadingPeriods.has(period) && period !== timePeriod && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                      )}
                    </button>
                  ))}
                </div>
                
                {/* View Type Toggle */}
                <div className="flex space-x-1 bg-muted p-1 rounded-lg">
                  <button
                    onClick={() => setViewType('chart')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewType === 'chart' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Chart View
                  </button>
                  <button
                    onClick={() => setViewType('table')}
                    className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                      viewType === 'table' 
                        ? 'bg-background text-foreground shadow-sm' 
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Table View
                  </button>
                </div>
              </div>
            </div>

            {/* Loading indicator */}
            {loading && (
              <div className="text-center text-muted-foreground py-8">
                Loading Top 25 Revenue Index - Market Cap Weighted ({timePeriod})...
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="text-center text-red-600 text-sm py-8">
                {error}
              </div>
            )}

            {/* Main Content Layout */}
            {revenueIndexData.length > 0 && (
              <div>
                {/* Chart View */}
                {viewType === 'chart' && (
                  <div className="space-y-6">
                    {/* Chart */}
                    <Card>
                      <CardContent className="p-6">
                        <div className="h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueIndexData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => {
                                  const date = new Date(value)
                                  return date.toLocaleDateString()
                                }}
                              />
                              <YAxis 
                                tick={{ fontSize: 12 }}
                                tickFormatter={(value) => `${value.toFixed(1)}%`}
                              />
                              <Tooltip 
                                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Index Change']}
                                labelFormatter={(label) => {
                                  const date = new Date(label)
                                  return date.toLocaleDateString()
                                }}
                              />
                              <Legend />
                              <Line 
                                type="monotone" 
                                dataKey="index_change" 
                                stroke="#2563eb" 
                                strokeWidth={2}
                                name="Top 25 Revenue Index - Market Cap Weighted"
                                dot={false}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Stats Below Chart */}
                    {stats && (
                      <div className="grid grid-cols-5 gap-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Period Change</div>
                          <div className={`text-2xl font-bold ${stats.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.currentChange >= 0 ? '+' : ''}{stats.currentChange.toFixed(2)}%
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Total Revenue (90d)</div>
                          <div className="text-lg font-semibold">${(stats.totalRevenue || 0).toLocaleString()}</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Top 5 Protocols</div>
                          <div className="text-xs space-y-1">
                            {stats.topProtocols?.slice(0, 5).map((protocol, i) => (
                              <div key={i}>{protocol}</div>
                            ))}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Rebalance</div>
                          <div className="text-lg font-semibold">Monthly</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground">Protocols</div>
                          <div className="text-lg font-semibold">25</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Table View */}
                {viewType === 'table' && (
                  <div className="grid grid-cols-12 gap-6">
                    {/* Protocol Table */}
                    <div className="col-span-8">
                      {revenueIndexData.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Top 25 Protocols</CardTitle>
                            <CardDescription>
                              Quarterly Revenue (90d) - Market Cap Weighted | 
                              {protocolRevenues.filter(p => p.mapping_status === 'success').length}/25 successful mappings
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-y-auto">
                              <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-muted/50">
                                  <tr>
                                    <th className="text-left p-2 font-medium">#</th>
                                    <th className="text-left p-2 font-medium">Protocol</th>
                                    <th className="text-left p-2 font-medium">Token</th>
                                    <th className="text-right p-2 font-medium">Revenue</th>
                                    <th className="text-right p-2 font-medium">Market Cap</th>
                                    <th className="text-right p-2 font-medium">MC %</th>
                                    <th className="text-center p-2 font-medium">Status</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {protocolRevenues.map((protocol, index) => (
                                    <tr key={index} className="border-b hover:bg-muted/30">
                                      <td className="p-2 text-muted-foreground">{index + 1}</td>
                                      <td className="p-2 font-medium">{protocol.name}</td>
                                      <td className="p-2">
                                        <div className="flex items-center space-x-2">
                                          <span className="text-muted-foreground">
                                            {protocol.token || 'N/A'}
                                          </span>
                                          {protocol.mapping_confidence !== undefined && (
                                            <span className={`text-xs ${getConfidenceColor(protocol.mapping_confidence)}`}>
                                              {(protocol.mapping_confidence * 100).toFixed(0)}%
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="p-2 text-right">${protocol.quarterly_revenue.toLocaleString()}</td>
                                      <td className="p-2 text-right">
                                        {protocol.market_cap > 0 ? `$${protocol.market_cap.toLocaleString()}` : 'N/A'}
                                      </td>
                                      <td className="p-2 text-right">
                                        {protocol.weight > 0 ? `${(protocol.weight * 100).toFixed(2)}%` : 'N/A'}
                                      </td>
                                      <td className="p-2 text-center">
                                        <div className="flex items-center justify-center space-x-1">
                                          <Badge 
                                            variant="outline" 
                                            className={`text-xs ${getStatusBadgeClass(protocol.mapping_status || 'failed')}`}
                                          >
                                            {protocol.mapping_status}
                                          </Badge>
                                          {protocol.match_method && (
                                            <span className="text-xs text-muted-foreground" title={`Match method: ${protocol.match_method}`}>
                                              {protocol.match_method.slice(0, 3)}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                    
                    {/* Exclusion List */}
                    <div className="col-span-4">
                      {revenueIndexData.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">Excluded Protocols</CardTitle>
                            <CardDescription>Protocols excluded from index</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {excludedProtocols.map((protocol, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-muted/30 rounded">
                                  <span className="font-medium">{protocol}</span>
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className="text-xs">
                                      {protocol === 'Tether' || protocol === 'Circle' ? 'Stablecoin' : 'Wallet/Infrastructure'}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-3 text-xs text-muted-foreground">
                              Excluded protocols are filtered out before ranking. Index focuses on revenue-generating protocols with tradeable tokens, excluding wallets, infrastructure, and stablecoins.
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'newsflow' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Newsflow</h2>
            <Card>
              <CardContent className="p-12">
                <div className="text-center">
                  <p className="text-lg text-muted-foreground">
                    Coming soon...
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}