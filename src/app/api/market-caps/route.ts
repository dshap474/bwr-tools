import { NextRequest, NextResponse } from 'next/server'
import { coinGeckoAPI } from '../../../lib/api-wrappers/coingecko-api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const { coinIds } = await request.json()
    
    if (!coinIds || !Array.isArray(coinIds)) {
      return NextResponse.json(
        { error: 'Invalid coinIds array' },
        { status: 400 }
      )
    }

    console.log(`📊 API Route: Fetching market caps for ${coinIds.length} coins`)
    
    const marketCaps: Record<string, number> = {}
    
    // Fetch market caps sequentially to respect rate limits
    for (let i = 0; i < coinIds.length; i++) {
      const coinId = coinIds[i]
      
      try {
        console.log(`💰 Fetching market cap ${i + 1}/${coinIds.length}: ${coinId}`)
        
        const marketData = await coinGeckoAPI.getCoinsMarkets({
          ids: [coinId],
          per_page: 1
        })
        
        if (marketData.length > 0 && marketData[0].market_cap) {
          marketCaps[coinId] = marketData[0].market_cap
          console.log(`✅ ${coinId}: $${marketData[0].market_cap.toLocaleString()}`)
        } else {
          console.warn(`⚠️ No market cap data for ${coinId}`)
          marketCaps[coinId] = 0
        }
        
        // Add delay between requests to respect rate limits
        if (i < coinIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
        }
        
      } catch (err: any) {
        console.warn(`Failed to fetch market cap for ${coinId}:`, err.message)
        marketCaps[coinId] = 0
        
        // If we hit rate limit, wait longer
        if (err.message?.includes('429') || err.message?.includes('Rate Limit')) {
          console.log('⏳ Rate limit detected, waiting 10 seconds...')
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
      }
    }
    
    const successfulMarketCaps = Object.values(marketCaps).filter(cap => cap > 0)
    console.log(`\n💰 Market cap API summary: ${successfulMarketCaps.length}/${coinIds.length} successful retrievals`)
    
    return NextResponse.json({ marketCaps })
    
  } catch (error: any) {
    console.error('Market cap API route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market caps', details: error.message },
      { status: 500 }
    )
  }
} 