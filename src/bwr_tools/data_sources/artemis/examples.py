"""Example usage of the Artemis API integration."""

from datetime import datetime, timedelta
from bwr_tools.data_sources.artemis import ArtemisClient, ArtemisDataFetcher


def example_basic_client():
    """Example using the basic ArtemisClient."""
    print("=== Basic ArtemisClient Example ===\n")
    
    # Initialize client (will use ARTEMIS_API_KEY from .env)
    client = ArtemisClient()
    
    # List supported assets
    print("Fetching supported assets...")
    assets = client.list_supported_assets()
    print(f"Found {len(assets)} supported assets")
    print(f"First few assets: {[a.get('symbol', a.get('id')) for a in assets[:5]]}\n")
    
    # Get available metrics for Bitcoin
    print("Fetching available metrics for BTC...")
    metrics = client.list_available_metrics("BTC")
    print(f"Available metrics: {[m.get('name', m.get('id')) for m in metrics[:10]]}\n")
    
    # Fetch price data for Bitcoin
    print("Fetching recent BTC price data...")
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    price_data = client.get_price_data(
        "BTC",
        start_date=start_date,
        end_date=end_date
    )
    print(f"Fetched price data: {price_data.get('data', [])[:3]}...\n")


def example_data_fetcher():
    """Example using the ArtemisDataFetcher with pandas."""
    print("=== ArtemisDataFetcher Example ===\n")
    
    # Initialize fetcher
    fetcher = ArtemisDataFetcher()
    
    # Get price data as DataFrame
    print("Fetching BTC price data as DataFrame...")
    end_date = datetime.now()
    start_date = end_date - timedelta(days=90)
    
    df = fetcher.get_asset_price_df(
        "BTC",
        start_date=start_date,
        end_date=end_date
    )
    print(f"Price DataFrame shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    print(f"Recent prices:\n{df.tail()}\n")
    
    # Compare multiple assets
    print("Comparing BTC and ETH prices...")
    comparison_df = fetcher.compare_assets(
        ["BTC", "ETH"],
        "price",
        start_date=start_date,
        end_date=end_date
    )
    print(f"Comparison DataFrame shape: {comparison_df.shape}")
    print(f"Columns: {comparison_df.columns.tolist()}")
    print(f"Recent data:\n{comparison_df.tail()}\n")
    
    # Get multiple metrics for an asset
    print("Fetching multiple metrics for ETH...")
    multi_metrics_df = fetcher.get_asset_metrics_df(
        "ETH",
        ["price", "volume", "tvl"],
        start_date=start_date,
        end_date=end_date
    )
    print(f"Multi-metrics DataFrame shape: {multi_metrics_df.shape}")
    print(f"Columns: {multi_metrics_df.columns.tolist()}")
    print(f"Recent data:\n{multi_metrics_df.tail()}\n")


def example_developer_activity():
    """Example fetching developer activity data."""
    print("=== Developer Activity Example ===\n")
    
    fetcher = ArtemisDataFetcher()
    
    # List supported ecosystems
    print("Fetching supported ecosystems...")
    ecosystems_df = fetcher.get_supported_ecosystems_df()
    print(f"Found {len(ecosystems_df)} ecosystems")
    print(f"First few ecosystems:\n{ecosystems_df.head()}\n")
    
    # Get developer activity for an ecosystem
    if len(ecosystems_df) > 0:
        ecosystem_id = ecosystems_df.iloc[0]['id']  # Use first ecosystem
        print(f"Fetching developer activity for {ecosystem_id}...")
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=180)
        
        commits_df = fetcher.get_developer_activity_df(
            ecosystem_id,
            metric="commits",
            start_date=start_date,
            end_date=end_date
        )
        print(f"Commits DataFrame shape: {commits_df.shape}")
        print(f"Recent commit data:\n{commits_df.tail()}\n")


def example_with_bwr_plots():
    """Example integrating Artemis data with BWR plots."""
    print("=== BWR Plots Integration Example ===\n")
    
    from bwr_tools import BWRPlots
    
    # Initialize fetcher and plots
    fetcher = ArtemisDataFetcher()
    bwr = BWRPlots()
    
    # Fetch data
    end_date = datetime.now()
    start_date = end_date - timedelta(days=365)
    
    print("Fetching BTC and ETH price data...")
    comparison_df = fetcher.compare_assets(
        ["BTC", "ETH"],
        "price",
        start_date=start_date,
        end_date=end_date
    )
    
    # Create a BWR-styled chart
    print("Creating BWR-styled price comparison chart...")
    fig = bwr.scatter(
        data=comparison_df,
        x=comparison_df.index,
        y=["BTC_price", "ETH_price"],
        title="BTC vs ETH Price Comparison",
        x_title="Date",
        y_title="Price (USD)",
        legend_labels=["Bitcoin", "Ethereum"],
        showlegend=True
    )
    
    # Save the chart
    output_path = "artemis_btc_eth_comparison.html"
    bwr.save_fig(fig, output_path, cdn=True)
    print(f"Chart saved to: {output_path}")


if __name__ == "__main__":
    # Run examples
    try:
        example_basic_client()
    except Exception as e:
        print(f"Basic client example failed: {e}\n")
    
    try:
        example_data_fetcher()
    except Exception as e:
        print(f"Data fetcher example failed: {e}\n")
    
    try:
        example_developer_activity()
    except Exception as e:
        print(f"Developer activity example failed: {e}\n")
    
    try:
        example_with_bwr_plots()
    except Exception as e:
        print(f"BWR plots integration example failed: {e}\n")