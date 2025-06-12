# DeFi Llama Module

A comprehensive wrapper for the DeFi Llama API, integrated into the bwr-tools package. This module provides easy access to DeFi protocol data, TVL metrics, stablecoin analytics, and more.

## Features

- **TVL Data**: Historical and current TVL for protocols and chains
- **Price Data**: Token price charts and historical data
- **Stablecoins**: Circulating supply, market cap, and chain distribution
- **Yields**: Pool APY data and historical yields
- **Volume**: DEX, derivatives, and options trading volumes
- **Fees & Revenue**: Protocol fees and revenue analytics

## Quick Start

```python
from bwr_tools.data_sources.defillama import DefiLlama

# Initialize the client
dl = DefiLlama()

# Get all protocols sorted by TVL
protocols = dl.get_all_protocols()
print(protocols.head())

# Get historical TVL for a protocol
aave_tvl = dl.get_protocol_tvl('aave')
print(aave_tvl['tvl'].tail())

# Get stablecoin data
stables = dl.get_stablecoin_circulating_supply()
print(stables.nlargest(5, 'circulating_total'))
```

## Main Features

### TVL Methods
- `get_all_protocols()` - List all protocols with their TVL
- `get_protocol_tvl(protocol)` - Get historical TVL for a specific protocol
- `get_all_chains_tvl()` - Get current TVL of all chains
- `get_chain_historical_tvl(chain)` - Get historical TVL for a specific chain

### Price Methods
- `get_price_chart(coins, start, end)` - Get token price history
- `get_earliest_price(coins)` - Get earliest price record for tokens

### Stablecoin Methods
- `get_stablecoin_circulating_supply()` - Get all stablecoins with circulating amounts
- `get_stablecoin_charts_all()` - Historical market cap data
- `get_stablecoin_chains()` - Current market cap by chain

### Yields Methods
- `get_pools(chain, tvl_filter)` - Get yield pools with APY data
- `get_pool_chart(pool_id)` - Historical APY and TVL for a specific pool

### Volume Methods
- `get_dexs_overview()` - DEX volumes overview
- `get_derivatives_overview()` - Derivatives volumes
- `get_options_overview()` - Options volumes

### Fees & Revenue Methods
- `get_fees_overview()` - Protocol fees overview
- `get_revenue_overview()` - Protocol revenue overview
- `get_protocol_fees_and_revenue(protocol)` - Detailed fees and revenue for a protocol

## Testing

Tests for this module are run as part of the main bwr-tools test suite from the project root.

## Documentation

See the `docs/` directory for detailed API documentation and examples.

## Data Storage

The `data/` directory is used for:
- Test fixtures and mock data
- Cached API responses for testing
- Example outputs from various methods

## Contributing

1. Write tests for any new functionality
2. Update documentation for API changes
3. Follow the existing code style and patterns
4. Add docstrings for all public methods

