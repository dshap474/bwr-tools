// Test script for CoinGecko Pro API - Bitcoin 30-day price data
// Run with: npx tsx scripts/test-coingecko-pro-bitcoin.ts

import { readFileSync } from 'fs';
import { CoinGeckoAPI } from '../src/lib/api-wrappers/coingecko-api-wrapper';

// Load API key directly from .env file
function loadApiKey(): string | null {
  try {
    const envContent = readFileSync('.env', 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      if (line.startsWith('COINGECKO_API_KEY=')) {
        return line.split('=')[1].trim();
      }
    }
    return null;
  } catch (error) {
    console.log('Error reading .env file:', error);
    return null;
  }
}

async function testBitcoinPriceData() {
  console.log('🚀 Testing CoinGecko Pro API with Bitcoin price data...\n');

  // Load API key and create wrapper instance
  const apiKey = loadApiKey();
  const coinGeckoAPI = new CoinGeckoAPI({
    apiKey: apiKey || undefined,
    preferProEndpoints: true,
    enableOnChainData: true
  });

  try {
    // Show plan information
    const planInfo = coinGeckoAPI.getPlanInfo();
    console.log('📊 Your CoinGecko Plan:', planInfo);
    console.log('');

    // Test API key validation
    const keyValidation = await coinGeckoAPI.validateApiKey();
    console.log('🔑 API Key Validation:', keyValidation);
    console.log('');

    // Get Bitcoin historical price data for last 30 days
    console.log('📈 Fetching Bitcoin price data (last 30 days, daily intervals)...');
    
    const historicalData = await coinGeckoAPI.getHistoricalChartData('bitcoin', {
      vs_currency: 'usd',
      days: 30,
      interval: 'daily'
    });

    if (historicalData.prices && historicalData.prices.length > 0) {
      console.log(`✅ Successfully fetched ${historicalData.prices.length} price data points\n`);
      
      // Display the data in a nice format
      console.log('📊 Bitcoin Daily Close Prices (Last 30 Days):');
      console.log('─'.repeat(50));
      
      historicalData.prices.forEach(([timestamp, price], index) => {
        const date = new Date(timestamp).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric'
        });
        
        const formattedPrice = new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }).format(price);
        
        console.log(`${date}: ${formattedPrice}`);
      });

      // Show summary statistics
      const prices = historicalData.prices.map(([_, price]) => price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const currentPrice = prices[prices.length - 1];
      const firstPrice = prices[0];
      const change = ((currentPrice - firstPrice) / firstPrice) * 100;

      console.log('\n📊 30-Day Summary:');
      console.log('─'.repeat(30));
      console.log(`Highest: $${maxPrice.toLocaleString()}`);
      console.log(`Lowest:  $${minPrice.toLocaleString()}`);
      console.log(`Current: $${currentPrice.toLocaleString()}`);
      console.log(`30d Change: ${change >= 0 ? '+' : ''}${change.toFixed(2)}%`);

      // Test Pro-exclusive OHLC data if available
      console.log('\n📈 Testing Pro OHLC Data...');
      try {
        const ohlcData = await coinGeckoAPI.getOHLCChart('bitcoin', {
          vs_currency: 'usd'
          // Removed days parameter as it seems to cause issues
        });
        
        if (ohlcData.length > 0) {
          console.log(`✅ OHLC Data: ${ohlcData.length} candles (Pro feature working!)`);
          
          // Show last 3 OHLC candles
          console.log('\n📊 Latest OHLC Data (Last 3 candles):');
          ohlcData.slice(-3).forEach((candle) => {
            const date = new Date(candle.timestamp).toLocaleDateString();
            console.log(`${date}: O:$${candle.open.toFixed(0)} H:$${candle.high.toFixed(0)} L:$${candle.low.toFixed(0)} C:$${candle.close.toFixed(0)}`);
          });
        }
      } catch (error) {
        console.log(`ℹ️ OHLC data: ${error instanceof Error ? error.message : 'Not available'}`);
      }

      // Test API usage tracking
      console.log('\n📊 API Usage Information...');
      try {
        const usage = await coinGeckoAPI.getApiUsage();
        if (usage) {
          console.log(`✅ Credits Remaining: ${usage.current_remaining_monthly_calls.toLocaleString()}`);
          console.log(`✅ Plan: ${usage.plan}`);
          console.log(`✅ Monthly Limit: ${usage.monthly_call_credit.toLocaleString()}`);
        }
      } catch (error) {
        console.log(`ℹ️ API usage tracking: ${error instanceof Error ? error.message : 'Not available'}`);
      }

    } else {
      console.log('❌ No price data returned. Check your API key configuration.');
    }

  } catch (error) {
    console.error('❌ Error testing Bitcoin price data:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('401') || error.message.includes('403')) {
        console.log('\n💡 Tip: Make sure your COINGECKO_API_KEY is set correctly in your .env file');
      } else if (error.message.includes('429')) {
        console.log('\n💡 Rate limit exceeded. Your Pro plan has higher limits - this might be a temporary issue.');
      }
    }
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testBitcoinPriceData().catch(console.error); 