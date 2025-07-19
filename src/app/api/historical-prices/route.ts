import { NextRequest, NextResponse } from 'next/server'
import { coinGeckoAPI } from '../../../lib/api-wrappers/coingecko-api-wrapper'

export async function POST(request: NextRequest) {
  try {
    const { coinIds, days } = await request.json()
    
    if (!coinIds || !Array.isArray(coinIds)) {
      return NextResponse.json(
        { error: 'Invalid coinIds array' },
        { status: 400 }
      )
    }

    console.log(`📈 API Route: Fetching historical prices for ${coinIds.length} coins (${days} days)`)
    
    const allPriceData: Array<{ coinId: string; prices: [number, number][] }> = []
    
    // Fetch price data sequentially to respect rate limits
    for (let i = 0; i < coinIds.length; i++) {
      const coinId = coinIds[i]
      
      try {
        console.log(`📊 Fetching prices ${i + 1}/${coinIds.length}: ${coinId}`)
        
        const priceData = await coinGeckoAPI.getHistoricalChartData(coinId, {
          days: days || 90
        })
        
        if (priceData && priceData.prices) {
          allPriceData.push({ coinId, prices: priceData.prices })
          console.log(`✅ ${coinId}: ${priceData.prices.length} price points`)
        } else {
          console.warn(`⚠️ No price data for ${coinId}`)
          allPriceData.push({ coinId, prices: [] })
        }
        
        // Add delay between requests to respect rate limits
        if (i < coinIds.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)) // 3 second delay
        }
        
      } catch (err: any) {
        console.warn(`Failed to fetch prices for ${coinId}:`, err.message)
        allPriceData.push({ coinId, prices: [] })
        
        // If we hit rate limit, wait longer
        if (err.message?.includes('429') || err.message?.includes('Rate Limit')) {
          console.log('⏳ Rate limit detected, waiting 10 seconds...')
          await new Promise(resolve => setTimeout(resolve, 10000))
        }
      }
    }
    
    const successfulPrices = allPriceData.filter(data => data.prices.length > 0)
    console.log(`\n📈 Price data API summary: ${successfulPrices.length}/${coinIds.length} successful retrievals`)
    
    return NextResponse.json({ priceData: allPriceData })
    
  } catch (error: any) {
    console.error('Historical prices API route error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical prices', details: error.message },
      { status: 500 }
    )
  }
} 