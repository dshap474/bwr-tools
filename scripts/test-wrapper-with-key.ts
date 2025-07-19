// Test wrapper with explicitly provided API key
// Run with: npx tsx scripts/test-wrapper-with-key.ts

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

async function testWrapperWithKey() {
  const apiKey = loadApiKey();
  
  if (!apiKey) {
    console.log('❌ No API key found in .env file');
    return;
  }

  console.log(`🔑 Using API Key: ${apiKey.substring(0, 8)}...`);
  console.log('🚀 Testing wrapper with explicit API key...\n');

  // Create wrapper instance with explicit API key
  const cgPro = new CoinGeckoAPI({
    apiKey: apiKey,
    preferProEndpoints: true,
    enableOnChainData: true
  });

  // Show plan information
  const planInfo = cgPro.getPlanInfo();
  console.log('📊 Detected Plan:', planInfo);

  const capabilities = cgPro.getCapabilitiesInfo();
  console.log('🔧 Capabilities:', capabilities);

  // Test a simple call
  console.log('\n📈 Testing Bitcoin price data...');
  try {
    const historicalData = await cgPro.getHistoricalChartData('bitcoin', {
      vs_currency: 'usd',
      days: 7,
      precision: 2
    });

    console.log(`✅ Retrieved ${historicalData.prices.length} price points`);
    
    if (historicalData.prices.length > 0) {
      const latestPrice = historicalData.prices[historicalData.prices.length - 1][1];
      console.log(`💰 Latest Bitcoin Price: $${latestPrice.toLocaleString()}`);
    }

    // Test Pro OHLC feature
    console.log('\n📊 Testing OHLC (Pro feature)...');
    const ohlcData = await cgPro.getOHLCChart('bitcoin', {
      days: 3,
      vs_currency: 'usd'
    });
    console.log(`✅ OHLC Data: ${ohlcData.length} candles`);

    // Test API usage
    console.log('\n📊 Testing API usage tracking...');
    const usage = await cgPro.getApiUsage();
    if (usage) {
      console.log(`✅ Credits Remaining: ${usage.current_remaining_monthly_calls}`);
      console.log(`✅ Plan: ${usage.plan}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  console.log('\n✅ Test completed!');
}

// Run the test
testWrapperWithKey().catch(console.error); 