# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

BWR-tools is a Python library (published as `bwr-tools` on PyPI) for creating Blockworks Research branded data visualizations. It wraps Plotly for charts and AG-Grid for interactive tables, providing consistent styling for financial and cryptocurrency data visualization.

## Commands

### Development Setup
```bash
# Install dependencies using Poetry
poetry install

# Install in development mode
pip install -e .
```

### Running Examples
```bash
# Run individual example
python examples/demo_scatter.py

# Run all examples
python examples/run_all_examples.py

# Run Streamlit demo app
streamlit run app.py
```

### Testing
```bash
# Run tests (limited test coverage)
poetry run pytest
```

## Architecture

### Core Structure
- **Main Class**: `BWRPlots` in `src/bwr_tools/core.py` - Factory for all chart types
- **Chart Modules**: Individual modules in `src/bwr_tools/charts/` for each chart type
- **Configuration**: Centralized in `config.py` with hierarchical, mergeable configs
- **Package Name**: The package is published as `bwr_tools` and the directory is also `bwr_tools`

### Key Patterns
1. **Factory Pattern**: BWRPlots class creates all chart types through dedicated methods
2. **Configuration Merging**: Each chart method accepts config overrides that merge with defaults
3. **Consistent Interface**: All chart methods follow similar parameter patterns (data, config, output options)

### Chart Types
- `scatter()`: Line/scatter plots with optional dual Y-axis
- `point_scatter()`: Scatter plots without connecting lines
- `metric_share_area()`: Normalized stacked area charts (100% stacked)
- `bar()`, `grouped_bar()`, `stacked_bar()`, `horizontal_bar()`: Various bar chart types
- `plotly_table()`: Static tables with Plotly
- `aggrid_table()`: Interactive tables for Streamlit apps

### Special Features
- **Branding**: Extensive BWR/BWA branding options (colors, fonts, watermarks, backgrounds)
- **Auto-scaling**: Y-axis values automatically formatted with K/M/B suffixes
- **DeFi Llama Integration**: Built-in API wrapper for crypto/DeFi data
- **Output Options**: Save as HTML, auto-open in browser, CDN support for smaller files