# DeFi Llama API Usage Examples

This document provides practical examples of using the DeFi Llama API wrapper for common DeFi data analysis tasks.

## Basic Setup

```python
from bwr_tools.data_sources.defillama import DefiLlama

# Initialize the client
dl = DefiLlama()
```

## TVL Analysis Examples

### 1. Top Protocols by TVL
```python
# Get all protocols sorted by TVL
protocols = dl.get_all_protocols()

# Top 10 protocols
top_10 = protocols.head(10)
print("Top 10 DeFi Protocols by TVL:")
print(top_10[['name', 'tvl', 'market_share']])

# Protocols with >$1B TVL
billion_club = protocols[protocols['tvl'] > 1e9]
print(f"\nProtocols with >$1B TVL: {len(billion_club)}")
```

### 2. Protocol TVL History
```python
# Get Aave's historical TVL
aave_data = dl.get_protocol_tvl('aave')

# Plot total TVL over time
import matplotlib.pyplot as plt

tvl_history = aave_data['tvl']
tvl_history['tvl'].plot(figsize=(12, 6))
plt.title('Aave Total TVL Over Time')
plt.ylabel('TVL (USD)')
plt.show()

# Analyze TVL by chain
if 'chain_tvl' in aave_data:
    for chain, data in aave_data['chain_tvl'].items():
        print(f"{chain}: Current TVL = ${data['tvl'].iloc[-1]:,.0f}")
```

### 3. Chain TVL Comparison
```python
# Get current TVL for all chains
chains = dl.get_all_chains_tvl()

# Top 5 chains by TVL
top_chains = chains.head(5)

# Create a pie chart of market share
import matplotlib.pyplot as plt

plt.figure(figsize=(10, 8))
plt.pie(top_chains['tvl'], labels=top_chains['name'], autopct='%1.1f%%')
plt.title('Top 5 Chains by TVL Market Share')
plt.show()
```

## Stablecoin Analysis Examples

### 1. Stablecoin Market Overview
```python
# Get all stablecoins with current data
stables = dl.get_stablecoin_circulating_supply(include_prices=True)

# Top 5 stablecoins by market cap
top_stables = stables.nlargest(5, 'circulating_total')
print("Top 5 Stablecoins by Market Cap:")
for _, stable in top_stables.iterrows():
    print(f"{stable['symbol']}: ${stable['circulating_total']:,.0f}")
    if 'price' in stable:
        print(f"  Current price: ${stable['price']:.4f}")
```

### 2. Stablecoin Distribution by Chain
```python
# Get chain distribution
chain_dist = dl.get_stablecoin_chains()

# Find chains with most stablecoin activity
top_stable_chains = chain_dist.nlargest(10, 'peggedUSD')

# Visualize distribution
import matplotlib.pyplot as plt

plt.figure(figsize=(12, 6))
plt.bar(top_stable_chains['chain'], top_stable_chains['peggedUSD'])
plt.xticks(rotation=45)
plt.ylabel('Stablecoin Value (USD)')
plt.title('Stablecoin Distribution by Chain')
plt.tight_layout()
plt.show()
```

### 3. Stablecoin Historical Analysis
```python
# Get historical data for USDT
usdt_history = dl.get_stablecoin_asset(1)  # 1 is USDT's ID

# Plot USDT distribution over time
usdt_history.plot(figsize=(12, 6), stacked=True)
plt.title('USDT Distribution Across Chains Over Time')
plt.ylabel('Market Cap (USD)')
plt.show()

# Calculate growth rates
latest = usdt_history.iloc[-1]
month_ago = usdt_history.iloc[-30] if len(usdt_history) > 30 else usdt_history.iloc[0]

for chain in usdt_history.columns:
    if chain.endswith('_total_circulating'):
        continue
    growth = ((latest[chain] - month_ago[chain]) / month_ago[chain]) * 100
    print(f"{chain}: {growth:.1f}% monthly growth")
```

## DeFi Yields Analysis

### 1. High Yield Opportunities
```python
# Get pools with >$5M TVL
pools = dl.get_pools(tvl_filter=5000000)

# Find pools with >10% APY
high_yield = pools[pools['apy'] > 10].sort_values('apy', ascending=False)

print("High Yield Pools (>10% APY):")
for _, pool in high_yield.head(10).iterrows():
    print(f"{pool['project']} - {pool['symbol']}")
    print(f"  APY: {pool['apy']:.2f}%")
    print(f"  TVL: ${pool['tvlUsd']:,.0f}")
    print(f"  Chain: {pool['chain']}\n")
```

### 2. Pool Performance Tracking
```python
# Track a specific pool over time
pool_id = "747c1d2a-c668-4682-b9f9-296708a3dd90"  # Example pool ID
pool_history = dl.get_pool_chart(pool_id)

# Analyze APY trends
fig, (ax1, ax2) = plt.subplots(2, 1, figsize=(12, 10))

# APY over time
pool_history['apy'].plot(ax=ax1)
ax1.set_title('Pool APY Over Time')
ax1.set_ylabel('APY (%)')

# TVL over time
pool_history['tvlUsd'].plot(ax=ax2)
ax2.set_title('Pool TVL Over Time')
ax2.set_ylabel('TVL (USD)')

plt.tight_layout()
plt.show()

# Calculate statistics
print(f"Average APY: {pool_history['apy'].mean():.2f}%")
print(f"Max APY: {pool_history['apy'].max():.2f}%")
print(f"Current TVL: ${pool_history['tvlUsd'].iloc[-1]:,.0f}")
```

## Trading Volume Analysis

### 1. DEX Volume Comparison
```python
# Get DEX overview
dexs = dl.get_dexs_overview()

# Top 10 DEXs by all-time volume
top_dexs = dexs.head(10)

# Visualize market share
total_volume = top_dexs['totalAllTime'].sum()
top_dexs['market_share'] = (top_dexs['totalAllTime'] / total_volume) * 100

plt.figure(figsize=(10, 8))
plt.pie(top_dexs['market_share'], labels=top_dexs['name'], autopct='%1.1f%%')
plt.title('Top 10 DEXs Market Share by All-Time Volume')
plt.show()
```

### 2. Historical Volume Trends
```python
# Get historical DEX volumes
dex_volumes = dl.get_total_dex_volume()

# Plot total daily volume trend
dex_volumes['total_dex_volume'].resample('W').sum().plot(figsize=(12, 6))
plt.title('Weekly DEX Volume Trend')
plt.ylabel('Volume (USD)')
plt.show()

# Compare top DEXs
top_dex_names = ['uniswap', 'sushiswap', 'curve']
available_dexs = [dex for dex in top_dex_names if dex in dex_volumes.columns]

if available_dexs:
    dex_volumes[available_dexs].resample('M').sum().plot(figsize=(12, 6))
    plt.title('Monthly Volume Comparison - Top DEXs')
    plt.ylabel('Volume (USD)')
    plt.legend()
    plt.show()
```

## Fees and Revenue Analysis

### 1. Protocol Revenue Rankings
```python
# Get fees and revenue overview
fees = dl.get_fees_overview()
revenue = dl.get_revenue_overview()

# Merge and calculate fee/revenue ratio
merged = fees.merge(revenue, on='name', suffixes=('_fees', '_revenue'))
merged['fee_revenue_ratio'] = merged['totalAllTime_fees'] / merged['totalAllTime_revenue']

# Top revenue generators
top_revenue = merged.nlargest(10, 'totalAllTime_revenue')
print("Top 10 Protocols by Revenue:")
for _, protocol in top_revenue.iterrows():
    print(f"{protocol['name']}:")
    print(f"  Total Fees: ${protocol['totalAllTime_fees']:,.0f}")
    print(f"  Total Revenue: ${protocol['totalAllTime_revenue']:,.0f}")
    print(f"  Revenue/Fees Ratio: {protocol['fee_revenue_ratio']:.2%}\n")
```

### 2. Protocol Financial Analysis
```python
# Detailed analysis for a specific protocol
protocol = 'aave'
financials = dl.get_protocol_fees_and_revenue(protocol)

# Plot daily fees vs revenue
fig, ax = plt.subplots(figsize=(12, 6))
financials[['fees_daily', 'revenue_daily']].plot(ax=ax)
ax.set_title(f'{protocol.upper()} Daily Fees vs Revenue')
ax.set_ylabel('USD')
plt.show()

# Calculate key metrics
total_fees = financials['fees_cumulative'].iloc[-1]
total_revenue = financials['revenue_cumulative'].iloc[-1]
avg_daily_fees = financials['fees_daily'].mean()
avg_daily_revenue = financials['revenue_daily'].mean()

print(f"{protocol.upper()} Financial Metrics:")
print(f"Total Fees Collected: ${total_fees:,.0f}")
print(f"Total Revenue Generated: ${total_revenue:,.0f}")
print(f"Average Daily Fees: ${avg_daily_fees:,.0f}")
print(f"Average Daily Revenue: ${avg_daily_revenue:,.0f}")
print(f"Revenue Margin: {(total_revenue/total_fees)*100:.1f}%")
```

## Price Analysis Examples

### 1. Multi-Asset Price Comparison
```python
# Get price data for multiple assets
coins = 'coingecko:ethereum,coingecko:bitcoin,coingecko:binancecoin'
prices = dl.get_price_chart(
    coins=coins,
    start='2024-01-01',
    period='1d',
    span=365
)

# Normalize prices for comparison
pivot_prices = prices.pivot(columns='coin', values='price')
normalized = pivot_prices / pivot_prices.iloc[0] * 100

# Plot normalized prices
normalized.plot(figsize=(12, 6))
plt.title('2024 Price Performance Comparison (Indexed to 100)')
plt.ylabel('Indexed Price')
plt.legend(['ETH', 'BTC', 'BNB'])
plt.show()
```

### 2. Price Correlation Analysis
```python
# Calculate correlations
if len(pivot_prices.columns) > 1:
    correlations = pivot_prices.corr()
    print("Price Correlations:")
    print(correlations)
    
    # Returns correlation
    returns = pivot_prices.pct_change()
    returns_corr = returns.corr()
    print("\nReturns Correlations:")
    print(returns_corr)
```

## Exporting Data

### Export Multiple Datasets to Excel
```python
# Collect various datasets
data_collection = {
    'Top_Protocols': dl.get_all_protocols().head(50),
    'Top_Chains': dl.get_all_chains_tvl().head(20),
    'Stablecoins': dl.get_stablecoin_circulating_supply(),
    'Top_DEXs': dl.get_dexs_overview().head(20)
}

# Export to Excel with multiple sheets
dl.export_dict_to_excel(
    data_dict=data_collection,
    output_folder='./defi_analysis',
    file_name='defi_llama_report'
)
```

## Error Handling

### Proper Error Handling Pattern
```python
try:
    # Attempt to get protocol data
    protocol_data = dl.get_protocol_tvl('some-protocol')
    
    if isinstance(protocol_data, dict) and 'error' in protocol_data:
        print(f"API Error: {protocol_data['error']}")
    else:
        # Process the data
        tvl_df = protocol_data['tvl']
        print(f"Successfully retrieved {len(tvl_df)} data points")
        
except Exception as e:
    print(f"Unexpected error: {e}")
```

## Rate Limiting Considerations

When making multiple requests, consider adding delays:

```python
import time

protocols_to_analyze = ['aave', 'compound', 'maker', 'curve', 'uniswap']
protocol_data = {}

for protocol in protocols_to_analyze:
    print(f"Fetching data for {protocol}...")
    protocol_data[protocol] = dl.get_protocol_tvl(protocol)
    time.sleep(0.5)  # 500ms delay between requests

print(f"Retrieved data for {len(protocol_data)} protocols")
```