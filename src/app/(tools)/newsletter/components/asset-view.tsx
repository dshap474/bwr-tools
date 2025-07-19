'use client'

import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { defiLlamaAPI } from '@/lib/api-wrappers/defillama-api-wrapper'
import { protocolMappingService } from '@/lib/services/protocol-mapping-service'

interface AssetReturnData {
  date: string
  [key: string]: number | string // Dynamic token symbols as keys
}

interface AssetViewProps {
  protocols: Array<{
    name: string
    token?: string
    defillama_slug?: string | null
    is_tokenless?: boolean
    mapping_status?: 'success' | 'partial' | 'failed'
  }>
  timePeriod: 'W' | 'M' | 'Q' | 'Y'
}

export default function AssetView({ protocols, timePeriod }: AssetViewProps) {
  const [assetData, setAssetData] = useState<AssetReturnData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get start date based on time period
  const getStartOfPeriod = (period: 'W' | 'M' | 'Q' | 'Y'): Date => {
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

  // Get DeFiLlama coin identifier for a token
  const getDeFiLlamaCoinId = (token: string): string | null => {
    // Common token mappings to DeFiLlama format
    const tokenMappings: Record<string, string> = {
      // Major cryptocurrencies
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
      
      // Additional tokens from the top 25 protocols
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

    return tokenMappings[token.toUpperCase()] || null
  }

  // Load asset return data
  useEffect(() => {
    const loadAssetData = async () => {
      setLoading(true)
      setError(null)

      // Add retry mechanism
      let retryCount = 0
      const maxRetries = 2

      while (retryCount <= maxRetries) {
        try {
        // Filter to top 25 protocols with tokens (same as index calculation)
        const protocolsWithTokens = protocols
          .filter(p => p.token && !p.is_tokenless && p.mapping_status === 'success')
          .slice(0, 25)
        
        if (protocolsWithTokens.length === 0) {
          setError('No protocols with tokens found')
          setLoading(false)
          return
        }

        // Get DeFiLlama coin IDs for all tokens
        const tokenCoinIds: string[] = []
        const tokenSymbols: string[] = []
        
        for (const protocol of protocolsWithTokens) {
          if (protocol.token) {
            const coinId = getDeFiLlamaCoinId(protocol.token)
            if (coinId) {
              tokenCoinIds.push(coinId)
              tokenSymbols.push(protocol.token)
            }
          }
        }

        if (tokenCoinIds.length === 0) {
          setError('No valid DeFiLlama coin IDs found for tokens')
          setLoading(false)
          return
        }

        console.log(`Loading price data for ${tokenCoinIds.length} tokens:`, tokenSymbols)

        // Calculate period parameters
        const startDate = getStartOfPeriod(timePeriod)
        const daysSinceStart = Math.ceil((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        const span = Math.min(Math.max(daysSinceStart, 1), 365)
        
        // Fetch price data for all tokens with better error handling
        console.log(`Fetching price data for ${tokenCoinIds.length} tokens with span: ${span} days`)
        console.log(`Start date: ${startDate.toISOString()}`)
        console.log(`Token IDs: ${tokenCoinIds.join(',')}`)
        
        let priceData: any[] = []
        try {
          priceData = await Promise.race([
            defiLlamaAPI.getPriceChart(
              tokenCoinIds.join(','),
              startDate.toISOString(),
              undefined,
              span,
              '1d'
            ),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Price data fetch timeout')), 60000) // 1 minute timeout
            )
          ])
        } catch (fetchError) {
          console.error('Failed to fetch price data:', fetchError)
          
          // Try with fewer tokens if the request failed
          if (tokenCoinIds.length > 10) {
            console.log('Trying with first 10 tokens due to request failure...')
            try {
              priceData = await Promise.race([
                defiLlamaAPI.getPriceChart(
                  tokenCoinIds.slice(0, 10).join(','),
                  startDate.toISOString(),
                  undefined,
                  span,
                  '1d'
                ),
                new Promise<never>((_, reject) => 
                  setTimeout(() => reject(new Error('Price data fetch timeout')), 60000)
                )
              ])
              console.log('Successfully fetched data for first 10 tokens')
            } catch (retryError) {
              console.error('Failed to fetch even with reduced tokens:', retryError)
              throw new Error('Unable to fetch price data from DeFiLlama API')
            }
          } else {
            throw fetchError
          }
        }

        // Process price data into return percentages
        const priceMap = new Map<string, Map<string, number>>()
        const allDates = new Set<string>()

        // Initialize price maps for each token
        tokenSymbols.forEach(symbol => {
          priceMap.set(symbol, new Map())
        })

        // Populate price maps
        priceData.forEach(point => {
          const coinId = point.coin
          const symbol = tokenSymbols[tokenCoinIds.indexOf(coinId)]
          if (symbol) {
            const dateKey = point.datetime.split('T')[0]
            priceMap.get(symbol)?.set(dateKey, point.price)
            allDates.add(dateKey)
          }
        })

        // Calculate return percentages
        const sortedDates = Array.from(allDates).sort()
        const assetReturnData: AssetReturnData[] = []

        sortedDates.forEach(dateKey => {
          const dataPoint: AssetReturnData = { date: dateKey }
          
          tokenSymbols.forEach(symbol => {
            const prices = priceMap.get(symbol)
            if (prices) {
              const currentPrice = prices.get(dateKey)
              const firstPrice = prices.get(sortedDates[0])
              
              if (currentPrice && firstPrice && firstPrice > 0) {
                const returnPercent = ((currentPrice - firstPrice) / firstPrice) * 100
                dataPoint[symbol] = returnPercent
              }
            }
          })

          // Only add data point if it has at least one valid return
          if (Object.keys(dataPoint).length > 1) {
            assetReturnData.push(dataPoint)
          }
        })

        setAssetData(assetReturnData)
        console.log(`Generated ${assetReturnData.length} data points for ${tokenSymbols.length} tokens`)
        break // Success, exit retry loop

      } catch (err) {
        retryCount++
        if (retryCount > maxRetries) {
          console.error('Error loading asset data after retries:', err)
          
          // Provide more specific error messages
          if (err instanceof Error) {
            if (err.message.includes('Network error')) {
              setError('Network error: Unable to connect to DeFiLlama API. Please check your internet connection.')
            } else if (err.message.includes('timeout')) {
              setError('Request timeout: The API request took too long. Please try again.')
            } else if (err.message.includes('Unable to fetch price data')) {
              setError('API error: Unable to fetch price data from DeFiLlama. Please try again later.')
            } else {
              setError(`Failed to load asset return data: ${err.message}`)
            }
          } else {
            setError('Failed to load asset return data')
          }
          break
        }
        
        console.warn(`Asset data load attempt ${retryCount} failed, retrying in 2 seconds...`, err)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    setLoading(false)
    }

    loadAssetData()
  }, [protocols, timePeriod])

  // Generate colors for tokens
  const generateColors = (count: number): string[] => {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1',
      '#14B8A6', '#F43F5E', '#A855F7', '#0EA5E9', '#22C55E',
      '#EAB308', '#FB7185', '#8B5CF6', '#06B6D4', '#84CC16',
      '#F97316', '#EC4899', '#6366F1', '#14B8A6', '#F43F5E'
    ]
    return colors.slice(0, count)
  }

  const tokenSymbols = assetData.length > 0 
    ? Object.keys(assetData[0]).filter(key => key !== 'date')
    : []
  const colors = generateColors(tokenSymbols.length)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Returns</CardTitle>
          <CardDescription>Loading asset return data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            Loading asset return data for {timePeriod} period...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Returns</CardTitle>
          <CardDescription>Error loading data</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-600 py-8">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Returns</CardTitle>
        <CardDescription>
          Individual token returns over {timePeriod} period | {tokenSymbols.length} assets
        </CardDescription>
      </CardHeader>
      <CardContent>
        {assetData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={assetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString()}
                interval="preserveStartEnd"
              />
              <YAxis 
                tickFormatter={(value) => `${value.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString()}
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Return']}
              />
              <Legend />
              {tokenSymbols.map((symbol, index) => (
                <Line
                  key={symbol}
                  type="monotone"
                  dataKey={symbol}
                  stroke={colors[index]}
                  strokeWidth={2}
                  dot={false}
                  name={symbol}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            No asset return data available
          </div>
        )}
      </CardContent>
    </Card>
  )
} 