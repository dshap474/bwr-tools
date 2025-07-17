// ┌────────────────────────────────────────────────────────────────────────────────────┐
// │ Testing Utilities Exports                                                           │
// └────────────────────────────────────────────────────────────────────────────────────┘

// Visual regression testing
export { VisualRegressionTester } from './visual-regression';
export { 
  createTestDataFrames, 
  createScatterTestCases 
} from './visual-regression';
export type {
  PythonComparisonOptions,
  ComparisonResult,
  TestCase
} from './visual-regression';

// Test data generation
export { TestDataGenerator, TEST_DATASETS, getTestDataset, createCustomTestData } from './test-data';
export type { CustomDataOptions } from './test-data';