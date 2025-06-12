# DeFi Llama API Reference

## Table of Contents
- [TVL Methods](#tvl-methods)
- [Price Methods](#price-methods)
- [Stablecoin Methods](#stablecoin-methods)
- [Yields Methods](#yields-methods)
- [Volume Methods](#volume-methods)
- [Fees & Revenue Methods](#fees--revenue-methods)
- [Utility Methods](#utility-methods)

## TVL Methods

### get_all_protocols()
List all protocols on DeFi Llama along with their TVL.

**Returns:**
- `pd.DataFrame`: DataFrame containing protocols and their TVL data, sorted by TVL in descending order
  - `name`: Protocol name
  - `slug`: Protocol slug
  - `tvl`: Current TVL in USD
  - `mcap`: Market capitalization
  - `market_share`: Percentage of total TVL

**Example:**
```python
protocols = dl.get_all_protocols()
top_10 = protocols.head(10)
```

### get_protocol_tvl(protocol)
Get historical TVL of a protocol and breakdowns by token and chain.

**Parameters:**
- `protocol` (str): Protocol slug/name

**Returns:**
- `dict`: Dictionary containing:
  - `tvl`: DataFrame of historical total TVL
  - `chain_tvl`: Dictionary of DataFrames with per-chain TVL
  - `token_tvl`: Dictionary of DataFrames with per-token TVL
  - `meta`: Protocol metadata

**Example:**
```python
aave_data = dl.get_protocol_tvl('aave')
tvl_history = aave_data['tvl']
ethereum_tvl = aave_data['chain_tvl']['Ethereum']
```

### get_all_chains_tvl()
Get current TVL of all chains.

**Returns:**
- `pd.DataFrame`: DataFrame containing current TVL for all chains, sorted by TVL

**Example:**
```python
chains = dl.get_all_chains_tvl()
print(f"Top chain: {chains.iloc[0]['name']} with ${chains.iloc[0]['tvl']:,.0f}")
```

### get_chain_historical_tvl(chain)
Get historical TVL of a specific chain.

**Parameters:**
- `chain` (str): Chain slug

**Returns:**
- `pd.DataFrame`: DataFrame containing historical TVL data for the chain

**Example:**
```python
eth_tvl = dl.get_chain_historical_tvl('ethereum')
eth_tvl['tvl'].plot(title='Ethereum TVL Over Time')
```

## Price Methods

### get_price_chart(coins, start, end, span, period, search_width)
Get token prices at regular time intervals.

**Parameters:**
- `coins` (str): Comma-separated tokens defined as {chain}:{address}
- `start` (str, optional): Start date in 'yyyy-mm-dd' format
- `end` (str, optional): End date in 'yyyy-mm-dd' format
- `period` (str): Duration between data points (default: "24h")
- `span` (int): Number of data points to return (default: 1000)
- `search_width` (str, optional): Time range to find price data

**Returns:**
- `pd.DataFrame`: DataFrame containing price chart data

**Example:**
```python
# Get ETH price for 2024
eth_prices = dl.get_price_chart(
    coins='coingecko:ethereum',
    start='2024-01-01',
    end='2024-12-31',
    period='1d'
)
```

### get_earliest_price(coins)
Get earliest timestamp price record for coins.

**Parameters:**
- `coins` (str or list): Token(s) in format {chain}:{address}

**Returns:**
- `dict`: Dictionary containing earliest price records for each coin

**Example:**
```python
earliest = dl.get_earliest_price(['coingecko:ethereum', 'coingecko:bitcoin'])
```

## Stablecoin Methods

### get_stablecoin_circulating_supply(include_prices)
List all stablecoins along with their circulating amounts.

**Parameters:**
- `include_prices` (bool): Whether to include current stablecoin prices

**Returns:**
- `pd.DataFrame`: DataFrame containing stablecoin data

**Example:**
```python
stables = dl.get_stablecoin_circulating_supply(include_prices=True)
top_stables = stables.nlargest(5, 'circulating_total')
```

### get_stablecoin_chains()
Get current mcap sum of all stablecoins on each chain.

**Returns:**
- `pd.DataFrame`: DataFrame containing current market cap data by chain

**Example:**
```python
chain_stables = dl.get_stablecoin_chains()
print(f"Ethereum stablecoins: ${chain_stables['peggedUSD'].iloc[0]:,.0f}")
```

## Yields Methods

### get_pools(chain, tvl_filter)
Retrieve the latest data for all pools.

**Parameters:**
- `chain` (str, optional): Filter pools by specific blockchain
- `tvl_filter` (int): Minimum TVL in USD (default: 1000000)

**Returns:**
- `pd.DataFrame`: DataFrame containing pool information

**Example:**
```python
# Get high TVL pools on Ethereum
eth_pools = dl.get_pools(chain='Ethereum', tvl_filter=10000000)
high_apy = eth_pools.nlargest(10, 'apy')
```

### get_pool_chart(pool_id)
Get historical APY and TVL data for a specific pool.

**Parameters:**
- `pool_id` (str): Pool identifier from the /pools endpoint

**Returns:**
- `pd.DataFrame`: DataFrame containing historical data

**Example:**
```python
pool_history = dl.get_pool_chart("747c1d2a-c668-4682-b9f9-296708a3dd90")
pool_history[['apy', 'tvlUsd']].plot(secondary_y='tvlUsd')
```

## Volume Methods

### get_dexs_overview(data_type)
List all DEXs along with summaries of their volumes.

**Parameters:**
- `data_type` (str): 'dailyVolume' or 'totalVolume'

**Returns:**
- `pd.DataFrame`: DataFrame with DEX information

**Example:**
```python
dexs = dl.get_dexs_overview()
print(f"Top DEX: {dexs.iloc[0]['name']}")
```

### get_total_dex_volume(data_type)
Get historical volume data for all DEXs.

**Parameters:**
- `data_type` (str): 'dailyVolume' or 'totalVolume'

**Returns:**
- `pd.DataFrame`: DataFrame with timestamps as index, protocols as columns

**Example:**
```python
dex_volumes = dl.get_total_dex_volume()
dex_volumes[['total_dex_volume', 'uniswap', 'sushiswap']].plot()
```

## Fees & Revenue Methods

### get_fees_overview()
List all protocols along with summaries of their fees.

**Returns:**
- `pd.DataFrame`: DataFrame with protocol fees information

**Example:**
```python
fees = dl.get_fees_overview()
top_earners = fees.head(10)
```

### get_protocol_fees_and_revenue(protocol)
Get historical fees and revenue data for a protocol.

**Parameters:**
- `protocol` (str): Protocol slug

**Returns:**
- `pd.DataFrame`: DataFrame with daily and cumulative fees and revenue

**Example:**
```python
aave_fees = dl.get_protocol_fees_and_revenue('aave')
aave_fees[['fees_daily', 'revenue_daily']].plot()
```

## Utility Methods

### export_dict_to_excel(data_dict, output_folder, file_name, start_row)
Export data to Excel file.

**Parameters:**
- `data_dict` (dict): Dictionary containing DataFrames and/or single values
- `output_folder` (str): Path to output folder
- `file_name` (str): Name of Excel file (without .xlsx)
- `start_row` (int): Starting row for first sheet

**Example:**
```python
data = {
    'protocols': dl.get_all_protocols(),
    'chains': dl.get_all_chains_tvl()
}
dl.export_dict_to_excel(data, './output', 'defi_data')
```

### name_to_slug(df_to_convert, exclude_cols)
Convert protocol names to slugs in a DataFrame.

**Parameters:**
- `df_to_convert` (pd.DataFrame): DataFrame with protocol names as columns
- `exclude_cols` (list, optional): Columns to exclude from conversion

**Returns:**
- `pd.DataFrame`: DataFrame with names converted to slugs

**Example:**
```python
# Convert protocol names in volume data to slugs
volumes_with_slugs = dl.name_to_slug(volume_df, exclude_cols=['timestamp'])
```