# BWR Tools Test Suite

This directory contains test scripts for validating BWR plot generation and comparing TypeScript vs Python implementations.

## Test Scripts

### `run-plot-test.js` (Simple Node.js Test)
Quick test that generates Python plots using embedded test data.

```bash
# Run the simple test
node run-plot-test.js
```

**Features:**
- ✅ Embedded test data (no imports)
- ✅ Python plot generation via dev server
- ✅ PNG images saved to `test_plots/`
- ✅ Plotly JSON configs saved
- ✅ File size reporting

### `generate-test-plot.ts` (Comprehensive TypeScript Test)
Advanced test suite with both TypeScript and Python generation.

```bash
# Install dependencies first
npm install

# Run comprehensive test
npm run test:plots
```

**Features:**
- 🎯 TypeScript ScatterChart generation
- 🐍 Python comparison via dev server  
- 📊 Multiple test datasets (simple, financial, correlated)
- 🔍 Chart configuration auto-detection
- 📈 Dual-axis testing
- 📄 Detailed test summary reports

## Test Data

### Simple Dataset
Linear relationship with noise:
```json
{
  "x": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  "y": [2.1, 4.3, 5.8, 8.2, 10.1, 11.9, 14.2, 16.1, 17.8, 20.3]
}
```

### Financial Dataset  
Time series with price and volume:
```json
{
  "date": ["2024-01-01", "2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"],
  "price": [100.0, 102.5, 98.3, 105.7, 108.2],
  "volume": [1500000, 1800000, 2100000, 1700000, 1900000]
}
```

### Large Values Dataset
Tests scaling with millions and billions:
```json
{
  "x": [1, 2, 3, 4, 5],
  "millions": [1200000, 2800000, 4100000, 5900000, 7300000],
  "billions": [1.2e9, 2.8e9, 4.1e9, 5.9e9, 7.3e9]
}
```

## Output Files

All generated files are saved to `test_plots/`:

### Python Generated
- `{testname}_python.png` - BWR plot images (~875 KB each)
- `{testname}_python_config.json` - Plotly configuration (~1.3 MB each)

### TypeScript Generated (via comprehensive test)
- `{testname}_typescript_config.json` - TypeScript Plotly configs
- `test_summary.json` - Detailed test results

## Prerequisites

1. **Python Dev Server** must be running:
   ```bash
   cd tools/dev-server
   python3 server.py
   ```

2. **Node.js dependencies** (for TypeScript test):
   ```bash
   cd test
   npm install
   ```

## Expected Results

✅ **All tests should pass** with:
- 3 Python PNG images generated (simple, financial, large_values)
- 3 Plotly JSON configurations saved
- File sizes around 875 KB for images, 1.3 MB for configs
- BWR theme correctly applied (dark background, purple primary color)

## Troubleshooting

### Python Server Issues
```bash
# Check if server is running
curl http://localhost:5001/health

# Common fix: install dependencies
pip3 install flask flask-cors pandas plotly

# Restart server
cd tools/dev-server && python3 server.py
```

### TypeScript Import Issues
The comprehensive test imports from the local packages. Ensure all packages are built:
```bash
# Build packages (if needed)
cd packages/tools/plots/data && npm run build
cd packages/tools/plots/charts && npm run build
```

## File Structure
```
test/
├── README.md                          # This file
├── run-plot-test.js                   # Simple Node.js test
├── generate-test-plot.ts               # Comprehensive TypeScript test  
├── package.json                       # Dependencies for TypeScript test
└── test_plots/                        # Generated output files
    ├── simple_python.png
    ├── simple_python_config.json
    ├── financial_python.png
    ├── financial_python_config.json
    ├── large_values_python.png
    └── large_values_python_config.json
```