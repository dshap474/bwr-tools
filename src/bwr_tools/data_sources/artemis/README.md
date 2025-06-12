# Artemis API Integration for BWR Tools

This module provides a comprehensive integration with the Artemis API for accessing cryptocurrency and DeFi data.

## Setup

1. Get your Artemis API key from [Artemis Terminal](https://app.artemis.xyz/settings/)
2. Add it to your `.env` file:
   ```
   ARTEMIS_API_KEY=your_api_key_here
   ```

## Quick Start

```python
from bwr_tools.data_sources.artemis import ArtemisClient, ArtemisDataFetcher

# Initialize client
client = ArtemisClient()  # Uses ARTEMIS_API_KEY from environment

# List available metrics for Bitcoin
metrics = client.list_available_metrics("BTC")

# Initialize data fetcher for pandas integration
fetcher = ArtemisDataFetcher()

# Get supported assets
assets_df = fetcher.get_supported_assets_df()

# Get developer activity data
ecosystems_df = fetcher.get_supported_ecosystems_df()
```

## API Permissions

Different API endpoints require different permission levels:

- **Free/Basic Tier**: Metadata endpoints (list assets, metrics, ecosystems)
- **Enterprise Tier**: Data fetching endpoints (price data, metrics timeseries)

Check your permissions:
```python
from bwr_tools.data_sources.artemis.utils import check_api_permissions

permissions = check_api_permissions(client)
print(permissions)
```

## Available Classes

### ArtemisClient
Low-level client for direct API access:
- `list_supported_assets()` - Get all supported assets
- `list_available_metrics(asset_id)` - Get available metrics for an asset
- `fetch_asset_metrics(asset_id, metrics, start_date, end_date)` - Fetch metrics data
- `list_supported_ecosystems()` - Get developer ecosystems
- `fetch_weekly_commits(ecosystem_id)` - Get commit data
- `fetch_weekly_active_developers(ecosystem_id)` - Get developer data

### ArtemisDataFetcher
High-level fetcher with pandas integration:
- `get_asset_price_df(asset_id, start_date, end_date)` - Price data as DataFrame
- `get_asset_metrics_df(asset_id, metrics, start_date, end_date)` - Multiple metrics
- `compare_assets(asset_ids, metric, start_date, end_date)` - Compare assets
- `get_developer_activity_df(ecosystem_id, metric)` - Developer activity data
- `get_supported_assets_df()` - Assets list as DataFrame
- `get_supported_ecosystems_df()` - Ecosystems list as DataFrame

## Convenience Functions

Import from `main` module:
```python
from bwr_tools.data_sources.artemis.main import (
    btc_price,
    eth_price,
    list_assets,
    list_metrics,
    compare_assets,
    top_assets_comparison
)

# Quick access to BTC price (last 30 days)
df = btc_price(days=30)

# Compare top assets
comparison_df = top_assets_comparison(
    metric="TVL",
    assets=["BTC", "ETH", "SOL"],
    days=90
)
```

## Utility Functions

```python
from bwr_tools.data_sources.artemis.utils import (
    parse_metrics_response,
    filter_metrics_by_tag,
    print_available_metrics
)

# Pretty print available metrics
print_available_metrics(client, "ETH")

# Parse and filter metrics
metrics_data = client.list_available_metrics("BTC")
metrics_df = parse_metrics_response(metrics_data)
market_metrics = filter_metrics_by_tag(metrics_df, "Market Data")
```

## Integration with BWR Plots

```python
from bwr_tools import BWRPlots
from bwr_tools.data_sources.artemis import ArtemisDataFetcher

# Initialize
fetcher = ArtemisDataFetcher()
bwr = BWRPlots()

# Fetch and plot data
df = fetcher.compare_assets(["BTC", "ETH"], "MC", days_back=365)

fig = bwr.scatter(
    data=df,
    x=df.index,
    y=["BTC_MC", "ETH_MC"],
    title="Market Cap Comparison",
    legend_labels=["Bitcoin", "Ethereum"]
)

bwr.save_fig(fig, "market_cap_comparison.html", cdn=True)
```

## Error Handling

```python
from bwr_tools.data_sources.artemis import ArtemisAPIError

try:
    data = client.fetch_asset_metrics("BTC", "price")
except ArtemisAPIError as e:
    print(f"API Error: {e}")
```

## Available Metrics Categories

- **Market Data**: Price, Market Cap, Trading Volume
- **Financial Metrics**: Fees, Revenue, Earnings
- **Economic Activity**: TVL, DEX Volumes, Circulating Supply
- **Usage Data**: DAU, WAU, MAU, Daily Transactions
- **Development Activity**: Weekly Commits, Active Developers
- **Valuation Multiples**: FDMC/TVL, MC/Fees ratios
- **Social Data**: Twitter Followers
- **Infrastructure Data**: Average Transaction Fee
- **ETFs**: Net ETF Flow, Cumulative ETF Flow