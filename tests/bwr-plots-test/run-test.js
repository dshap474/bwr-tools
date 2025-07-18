#!/usr/bin/env node

/**
 * Simple runner for BWR Plots Pixel Perfect Test
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Starting BWR Plots Pixel Perfect Test...\n');

try {
  // Run the Jest test
  console.log('📊 Running chart generation tests...');
  const testCommand = 'npm test tests/bwr-plots-test/test-pixel-perfect.test.ts -- --verbose';
  
  execSync(testCommand, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../..')
  });

  console.log('\n✅ Chart generation tests completed successfully!');
  
  // Optionally run chart generator
  console.log('\n📈 Generating chart specifications...');
  try {
    execSync('npx ts-node tests/bwr-plots-test/chart-generator.ts', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '../..')
    });
    console.log('✅ Chart specifications generated!');
  } catch (err) {
    console.log('⚠️  Chart specification generation failed (may need frontend build)');
  }

  console.log('\n🎯 Next Steps:');
  console.log('1. Examine generated chart specifications in tests/bwr-plots-test/');
  console.log('2. Analyze example.png to determine exact chart configuration');
  console.log('3. Implement pixel comparison logic');
  console.log('4. Fine-tune BWR styling to match reference');

} catch (error) {
  console.error('\n❌ Test execution failed:');
  console.error(error.message);
  process.exit(1);
} 