// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Basic Test for BWR Plots Implementation                                            │
// └────────────────────────────────────────────────────────────────────────────────────┘

import { BWRPlots } from './index';
import { DataFrame } from './data/DataFrame';
import { groupDataByMonth } from './data/processors';

// Test basic functionality
export function testBasicImplementation() {
  console.log('Testing BWR Plots basic implementation...');

  try {
    // Create test data similar to the CSV structure
    const testData = {
      dt: ['2024-01-01', '2024-01-02', '2024-02-01', '2024-02-02', '2024-03-01'],
      txfees_priorityfees_usd: [100, 150, 200, 250, 300],
      txfees_basefee_usd: [50, 75, 100, 125, 150],
      txfees_l1fee_usd: [25, 35, 45, 55, 65]
    };

    console.log('1. Creating DataFrame...');
    const df = new DataFrame(testData);
    console.log('✓ DataFrame created:', df.shape);

    console.log('2. Testing monthly grouping...');
    const monthlyDf = groupDataByMonth(df);
    console.log('✓ Monthly grouping completed:', monthlyDf.shape);
    console.log('  Columns:', monthlyDf.columns);
    console.log('  First few rows:', monthlyDf.head(3));

    console.log('3. Creating BWRPlots instance...');
    const plotter = new BWRPlots({
      general: { width: 1920, height: 1080 }
    });
    console.log('✓ BWRPlots instance created');

    console.log('4. Generating stacked bar chart...');
    const chartSpec = plotter.stacked_bar_chart({
      data: monthlyDf,
      title: 'Test Stacked Bar Chart',
      subtitle: 'Testing BWR Plots Implementation',
      source: 'Test Data',
      xaxis_is_date: true,
      sort_descending: false
    });

    console.log('✓ Chart specification generated');
    console.log('  Data traces:', chartSpec.data?.length || 0);
    console.log('  Layout defined:', !!chartSpec.layout);
    console.log('  Config defined:', !!chartSpec.config);

    if (chartSpec.data && chartSpec.data.length > 0) {
      console.log('  First trace type:', chartSpec.data[0].type);
      console.log('  First trace name:', chartSpec.data[0].name);
    }

    return {
      success: true,
      chartSpec,
      message: 'Basic implementation test passed!'
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      message: 'Basic implementation test failed'
    };
  }
}

// Run test if called directly
if (typeof window === 'undefined' && require.main === module) {
  testBasicImplementation();
}