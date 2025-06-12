import sys
from pathlib import Path
import pandas as pd
import numpy as np

# Add the src directory to the Python path
project_root = Path(__file__).resolve().parent.parent
src_path = project_root / "src"
if str(src_path) not in sys.path:
    sys.path.insert(0, str(src_path))

from bwr_tools import BWRPlots

# Create output directory
OUTPUT_DIR = project_root / "output"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# Initialize the plotter
plotter = BWRPlots()

print("=== BWR Point Scatter Plot Examples (New API) ===\n")

# Example 1: Basic point scatter with color grouping
print("Example 1: Point Scatter with Color Grouping")
np.random.seed(42)
df_example = pd.DataFrame(
    {
        "incentive_change": [-60, -50, -40, -30, 0, -65, -35, -5, 10, 20, -25, 15],
        "tvl_change": [-20, -10, 10, 30, 70, 2, 50, -100, 80, 60, 40, 90],
        "pool": [
            "USDC/ETH",
            "ETH/USDT",
            "USDC/ETH",
            "ETH/WBTC",
            "ETH/USDT",
            "USDC/ETH",
            "ETH/WBTC",
            "COMP/ETH",
            "USDC/ETH",
            "ETH/USDT",
            "ETH/WBTC",
            "COMP/ETH",
        ],
        "period": [
            "G1_G2",
            "G1_G2",
            "G2_G3",
            "G1_G2",
            "G2_G3",
            "G2_G3",
            "G2_G3",
            "G1_G2",
            "G1_G2",
            "G2_G3",
            "G1_G2",
            "G2_G3",
        ],
        "name": [
            "Point A",
            "Point B",
            "Point C",
            "Point D",
            "Point E",
            "Point F",
            "Point G",
            "Point H",
            "Point I",
            "Point J",
            "Point K",
            "Point L",
        ],
    }
)

fig1 = plotter.point_scatter_plot(
    data=df_example,
    x_column="incentive_change",
    y_column="tvl_change",
    color_column="pool",
    name_column="name",  # for hover
    title="TVL Change vs. Incentive Change (Color by Pool)",
    subtitle="Demonstrates color grouping functionality",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig1 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_color_by_pool.html\n"
)

# Example 2: Point scatter with symbol grouping
print("Example 2: Point Scatter with Symbol Grouping")
fig2 = plotter.point_scatter_plot(
    data=df_example,
    x_column="incentive_change",
    y_column="tvl_change",
    symbol_column="period",
    name_column="name",
    title="TVL Change vs. Incentive Change (Symbol by Period)",
    subtitle="Demonstrates symbol grouping functionality",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig2 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_symbol_by_period.html\n"
)

# Example 3: Point scatter with both color and symbol grouping
print("Example 3: Point Scatter with Both Color and Symbol Grouping")
fig3 = plotter.point_scatter_plot(
    data=df_example,
    x_column="incentive_change",
    y_column="tvl_change",
    color_column="pool",
    symbol_column="period",
    name_column="name",
    title="TVL Change vs. Incentive Change (Color by Pool, Symbol by Period)",
    subtitle="Demonstrates both color and symbol grouping",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig3 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_color_and_symbol.html\n"
)

# Example 4: Point scatter with custom color mapping
print("Example 4: Point Scatter with Custom Color Mapping")
custom_colors = {
    "USDC/ETH": "#FF6B6B",  # Red
    "ETH/USDT": "#4ECDC4",  # Teal
    "ETH/WBTC": "#45B7D1",  # Blue
    "COMP/ETH": "#FFA07A",  # Orange
}

fig4 = plotter.point_scatter_plot(
    data=df_example,
    x_column="incentive_change",
    y_column="tvl_change",
    color_column="pool",
    custom_colors_map=custom_colors,
    name_column="name",
    title="TVL Change vs. Incentive Change (Custom Colors)",
    subtitle="Demonstrates custom color mapping",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig4 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_custom_colors.html\n"
)

# Example 5: Point scatter with custom symbol mapping
print("Example 5: Point Scatter with Custom Symbol Mapping")
custom_symbols = {"G1_G2": "circle", "G2_G3": "diamond"}

fig5 = plotter.point_scatter_plot(
    data=df_example,
    x_column="incentive_change",
    y_column="tvl_change",
    symbol_column="period",
    custom_symbols_map=custom_symbols,
    name_column="name",
    title="TVL Change vs. Incentive Change (Custom Symbols)",
    subtitle="Demonstrates custom symbol mapping",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig5 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_custom_symbols.html\n"
)

# Example 6: Point scatter with variable marker sizes
print("Example 6: Point Scatter with Variable Marker Sizes")
df_with_size = df_example.copy()
df_with_size["market_cap"] = np.random.uniform(
    100, 1000, len(df_with_size)
)  # Market cap in millions

fig6 = plotter.point_scatter_plot(
    data=df_with_size,
    x_column="incentive_change",
    y_column="tvl_change",
    color_column="pool",
    marker_size_val_or_col="market_cap",
    name_column="name",
    title="TVL Change vs. Incentive Change (Size by Market Cap)",
    subtitle="Demonstrates variable marker sizes based on data column",
    source="Synthetic DeFi Data",
    xaxis_is_date=False,
    x_axis_title="Percentage Change in Daily Incentives (%)",
    y_axis_title="Percentage Change in TVL (%)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(
    f"[SUCCESS] Fig6 saved to {OUTPUT_DIR}/tvl_change_vs_incentive_change_variable_sizes.html\n"
)

# Example 7: Time series point scatter
print("Example 7: Time Series Point Scatter")
dates = pd.date_range("2023-01-01", periods=20, freq="D")
df_timeseries = pd.DataFrame(
    {
        "date": dates,
        "price": np.random.uniform(100, 200, len(dates)),
        "volume": np.random.uniform(1000, 5000, len(dates)),
        "exchange": np.random.choice(["Binance", "Coinbase", "Kraken"], len(dates)),
        "asset": np.random.choice(["BTC", "ETH"], len(dates)),
    }
)

fig7 = plotter.point_scatter_plot(
    data=df_timeseries,
    x_column="date",
    y_column="price",
    color_column="exchange",
    symbol_column="asset",
    marker_size_val_or_col="volume",
    title="Crypto Price Over Time",
    subtitle="Time series with color by exchange, symbol by asset, size by volume",
    source="Synthetic Crypto Data",
    xaxis_is_date=True,
    x_axis_title="Date",
    y_axis_title="Price (USD)",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(f"[SUCCESS] Fig7 saved to {OUTPUT_DIR}/crypto_price_over_time.html\n")

# Example 8: Large values with auto-scaling
print("Example 8: Point Scatter with Large Values (Auto-scaling)")
df_large = pd.DataFrame(
    {
        "revenue": np.random.uniform(1e6, 10e6, 15),  # Millions
        "profit": np.random.uniform(
            100e3, 2e6, 15
        ),  # Hundreds of thousands to millions
        "company_type": np.random.choice(["Tech", "Finance", "Healthcare"], 15),
        "region": np.random.choice(["North America", "Europe", "Asia"], 15),
        "company_name": [f"Company {i}" for i in range(1, 16)],
    }
)

fig8 = plotter.point_scatter_plot(
    data=df_large,
    x_column="revenue",
    y_column="profit",
    color_column="company_type",
    symbol_column="region",
    name_column="company_name",
    title="Company Profit vs Revenue",
    subtitle="Demonstrates automatic scaling for large values",
    source="Synthetic Business Data",
    xaxis_is_date=False,
    x_axis_title="Revenue",
    y_axis_title="Profit",
    save_image=True,
    save_path=str(OUTPUT_DIR),
    open_in_browser=False,
)
print(f"[SUCCESS] Fig8 saved to {OUTPUT_DIR}/company_profit_vs_revenue.html\n")

print("=== All Point Scatter Examples Generated Successfully! ===")
print(f"Check the output directory: {OUTPUT_DIR}")
print("\nFiles created:")
for html_file in sorted(OUTPUT_DIR.glob("*.html")):
    if any(
        keyword in html_file.name
        for keyword in ["tvl_change", "crypto_price", "company_profit"]
    ):
        print(f"  - {html_file.name}")
