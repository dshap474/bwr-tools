// Direct Pro API ping test
// Run with: npx tsx scripts/test-pro-api-ping.ts

import { readFileSync } from 'fs';

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

async function testProApiPing() {
  const apiKey = loadApiKey();
  
  if (!apiKey) {
    console.log('❌ No API key found in .env file');
    return;
  }

  console.log(`🔑 Testing API Key: ${apiKey.substring(0, 8)}...`);
  console.log('🚀 Testing Pro API Ping...\n');

  try {
    // Test Pro API endpoint
    const proResponse = await fetch('https://pro-api.coingecko.com/api/v3/ping', {
      headers: {
        'Accept': 'application/json',
        'x-cg-pro-api-key': apiKey
      }
    });

    console.log(`🌐 Pro API Ping Response: ${proResponse.status}`);
    
    if (proResponse.ok) {
      const proData = await proResponse.json();
      console.log('✅ Pro API Response:', proData);
      
      // Test a Pro-specific endpoint (coins list)
      console.log('\n📊 Testing Pro coins list endpoint...');
      const coinsResponse = await fetch('https://pro-api.coingecko.com/api/v3/coins/list?per_page=5', {
        headers: {
          'Accept': 'application/json',
          'x-cg-pro-api-key': apiKey
        }
      });
      
      console.log(`📋 Coins List Response: ${coinsResponse.status}`);
      
      if (coinsResponse.ok) {
        const coinsData = await coinsResponse.json();
        console.log(`✅ Retrieved ${coinsData.length} coins from Pro API`);
        console.log('Sample coins:', coinsData.slice(0, 3).map((c: any) => c.name));
      } else {
        const errorText = await coinsResponse.text();
        console.log('❌ Coins list error:', errorText);
      }
      
    } else {
      const errorText = await proResponse.text();
      console.log('❌ Pro API Error:', errorText);
    }

    // Also test Demo API for comparison
    console.log('\n🔄 Testing Demo API endpoint for comparison...');
    const demoResponse = await fetch(`https://api.coingecko.com/api/v3/ping?x_cg_demo_api_key=${apiKey}`);
    
    console.log(`🆓 Demo API Ping Response: ${demoResponse.status}`);
    if (demoResponse.ok) {
      const demoData = await demoResponse.json();
      console.log('✅ Demo API Response:', demoData);
    }

  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

// Run the test
testProApiPing().catch(console.error); 