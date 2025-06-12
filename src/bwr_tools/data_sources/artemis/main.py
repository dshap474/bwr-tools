"""Main entry point for Artemis API integration with convenient helper functions."""

from typing import Optional, Union, List, Dict, Any
from datetime import datetime, date
import pandas as pd
from .client import ArtemisClient
from .fetcher import ArtemisDataFetcher


# Global instances (lazy-loaded)
_client: Optional[ArtemisClient] = None
_fetcher: Optional[ArtemisDataFetcher] = None


def get_client(api_key: Optional[str] = None) -> ArtemisClient:
    """
    Get or create the global ArtemisClient instance.
    
    Args:
        api_key: Optional API key. If not provided, uses environment variable.
        
    Returns:
        ArtemisClient instance
    """
    global _client
    if _client is None or api_key is not None:
        _client = ArtemisClient(api_key)
    return _client


def get_fetcher(api_key: Optional[str] = None) -> ArtemisDataFetcher:
    """
    Get or create the global ArtemisDataFetcher instance.
    
    Args:
        api_key: Optional API key. If not provided, uses environment variable.
        
    Returns:
        ArtemisDataFetcher instance
    """
    global _fetcher
    if _fetcher is None or api_key is not None:
        _fetcher = ArtemisDataFetcher(api_key)
    return _fetcher


# Convenience functions that use the global instances

def fetch_price(
    asset_id: str,
    start_date: Optional[Union[str, date, datetime]] = None,
    end_date: Optional[Union[str, date, datetime]] = None,
    as_dataframe: bool = True
) -> Union[pd.DataFrame, Dict[str, Any]]:
    """
    Fetch price data for an asset.
    
    Args:
        asset_id: Asset symbol (e.g., 'BTC', 'ETH')
        start_date: Start date for the data
        end_date: End date for the data
        as_dataframe: Return as pandas DataFrame (True) or raw dict (False)
        
    Returns:
        Price data as DataFrame or dictionary
    """
    if as_dataframe:
        return get_fetcher().get_asset_price_df(asset_id, start_date, end_date)
    else:
        return get_client().get_price_data(asset_id, start_date, end_date)


def fetch_metrics(
    asset_id: str,
    metrics: Union[str, List[str]],
    start_date: Optional[Union[str, date, datetime]] = None,
    end_date: Optional[Union[str, date, datetime]] = None,
    as_dataframe: bool = True
) -> Union[pd.DataFrame, Dict[str, Any]]:
    """
    Fetch one or more metrics for an asset.
    
    Args:
        asset_id: Asset symbol (e.g., 'BTC', 'ETH')
        metrics: Single metric or list of metrics
        start_date: Start date for the data
        end_date: End date for the data
        as_dataframe: Return as pandas DataFrame (True) or raw dict (False)
        
    Returns:
        Metrics data as DataFrame or dictionary
    """
    if as_dataframe:
        return get_fetcher().get_asset_metrics_df(asset_id, metrics, start_date, end_date)
    else:
        return get_client().fetch_asset_metrics(asset_id, metrics, start_date, end_date)


def compare_assets(
    asset_ids: List[str],
    metric: str,
    start_date: Optional[Union[str, date, datetime]] = None,
    end_date: Optional[Union[str, date, datetime]] = None
) -> pd.DataFrame:
    """
    Compare a metric across multiple assets.
    
    Args:
        asset_ids: List of asset symbols
        metric: Metric to compare
        start_date: Start date for the data
        end_date: End date for the data
        
    Returns:
        DataFrame with comparison data
    """
    return get_fetcher().compare_assets(asset_ids, metric, start_date, end_date)


def list_assets() -> pd.DataFrame:
    """
    Get list of all supported assets.
    
    Returns:
        DataFrame with supported assets
    """
    return get_fetcher().get_supported_assets_df()


def list_ecosystems() -> pd.DataFrame:
    """
    Get list of all supported ecosystems.
    
    Returns:
        DataFrame with supported ecosystems
    """
    return get_fetcher().get_supported_ecosystems_df()


def list_metrics(asset_id: str) -> pd.DataFrame:
    """
    Get list of available metrics for an asset.
    
    Args:
        asset_id: Asset symbol
        
    Returns:
        DataFrame with available metrics
    """
    return get_fetcher().get_available_metrics_df(asset_id)


def fetch_developer_activity(
    ecosystem_id: str,
    metric: str = "commits",
    include_forks: bool = False,
    days_back: Optional[int] = None
) -> pd.DataFrame:
    """
    Fetch developer activity data for an ecosystem.
    
    Args:
        ecosystem_id: Ecosystem identifier
        metric: 'commits' or 'developers'
        include_forks: Whether to include forked repositories
        days_back: Number of days to look back
        
    Returns:
        DataFrame with developer activity data
    """
    return get_fetcher().get_developer_activity_df(ecosystem_id, metric, include_forks, days_back)


# Quick access functions for common use cases

def btc_price(days: int = 30) -> pd.DataFrame:
    """Get recent Bitcoin price data."""
    end_date = datetime.now()
    start_date = end_date - pd.Timedelta(days=days)
    return fetch_price("BTC", start_date, end_date)


def eth_price(days: int = 30) -> pd.DataFrame:
    """Get recent Ethereum price data."""
    end_date = datetime.now()
    start_date = end_date - pd.Timedelta(days=days)
    return fetch_price("ETH", start_date, end_date)


def top_assets_comparison(
    metric: str = "price",
    assets: List[str] = ["BTC", "ETH", "SOL", "AVAX"],
    days: int = 90
) -> pd.DataFrame:
    """
    Compare top assets by a metric.
    
    Args:
        metric: Metric to compare
        assets: List of asset symbols
        days: Number of days of data to fetch
        
    Returns:
        DataFrame with comparison data
    """
    end_date = datetime.now()
    start_date = end_date - pd.Timedelta(days=days)
    return compare_assets(assets, metric, start_date, end_date)