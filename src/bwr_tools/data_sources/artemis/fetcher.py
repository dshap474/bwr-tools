"""High-level data fetching utilities for Artemis API."""

import pandas as pd
from typing import Dict, List, Optional, Union, Any
from datetime import datetime, date, timedelta
from .client import ArtemisClient, ArtemisAPIError


class ArtemisDataFetcher:
    """High-level data fetcher for Artemis API with pandas integration."""
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the data fetcher.
        
        Args:
            api_key: Artemis API key. If not provided, will look for ARTEMIS_API_KEY in environment.
        """
        self.client = ArtemisClient(api_key)
    
    def _process_timeseries_data(self, data: Dict[str, Any], metrics: Union[str, List[str]]) -> pd.DataFrame:
        """
        Process timeseries data from API response into a pandas DataFrame.
        
        Args:
            data: Raw API response
            metrics: Metric(s) that were requested
            
        Returns:
            Processed pandas DataFrame
        """
        if isinstance(metrics, str):
            metrics = [metrics]
        
        # Extract the data from the response
        if "data" not in data:
            raise ArtemisAPIError("No data in API response")
        
        # Convert to DataFrame
        df = pd.DataFrame(data["data"])
        
        # Convert timestamp to datetime if present
        if "timestamp" in df.columns:
            df["timestamp"] = pd.to_datetime(df["timestamp"])
            df.set_index("timestamp", inplace=True)
        elif "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
            df.set_index("date", inplace=True)
        
        return df
    
    def get_asset_price_df(
        self,
        asset_id: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> pd.DataFrame:
        """
        Get price data for an asset as a pandas DataFrame.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            DataFrame with price data
        """
        data = self.client.get_price_data(asset_id, start_date, end_date, granularity)
        return self._process_timeseries_data(data, "price")
    
    def get_asset_metrics_df(
        self,
        asset_id: str,
        metrics: Union[str, List[str]],
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> pd.DataFrame:
        """
        Get multiple metrics for an asset as a pandas DataFrame.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            metrics: Single metric or list of metrics
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            DataFrame with requested metrics
        """
        data = self.client.fetch_asset_metrics(asset_id, metrics, start_date, end_date, granularity)
        return self._process_timeseries_data(data, metrics)
    
    def get_developer_activity_df(
        self,
        ecosystem_id: str,
        metric: str = "commits",
        include_forks: bool = False,
        days_back: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Get developer activity data for an ecosystem as a DataFrame.
        
        Args:
            ecosystem_id: Ecosystem identifier
            metric: 'commits' or 'developers'
            include_forks: Whether to include forked repositories
            days_back: Number of days to look back
            
        Returns:
            DataFrame with developer activity data
        """
        if metric == "commits":
            data = self.client.fetch_weekly_commits(ecosystem_id, include_forks, days_back)
        elif metric == "developers":
            data = self.client.fetch_weekly_active_developers(ecosystem_id, include_forks, days_back)
        else:
            raise ValueError(f"Invalid metric: {metric}. Must be 'commits' or 'developers'")
        
        return self._process_timeseries_data(data, metric)
    
    def compare_assets(
        self,
        asset_ids: List[str],
        metric: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> pd.DataFrame:
        """
        Compare a metric across multiple assets.
        
        Args:
            asset_ids: List of asset symbols
            metric: Metric to compare
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            DataFrame with metric data for all assets
        """
        dfs = []
        
        for asset_id in asset_ids:
            try:
                df = self.get_asset_metrics_df(asset_id, metric, start_date, end_date, granularity)
                # Rename the metric column to include the asset ID
                if metric in df.columns:
                    df.rename(columns={metric: f"{asset_id}_{metric}"}, inplace=True)
                dfs.append(df)
            except ArtemisAPIError as e:
                print(f"Error fetching data for {asset_id}: {e}")
                continue
        
        if not dfs:
            raise ArtemisAPIError("No data fetched for any assets")
        
        # Combine all DataFrames
        result = pd.concat(dfs, axis=1)
        return result
    
    def get_ecosystem_comparison_df(
        self,
        ecosystem_ids: List[str],
        metric: str = "commits",
        include_forks: bool = False,
        days_back: Optional[int] = None
    ) -> pd.DataFrame:
        """
        Compare developer activity across multiple ecosystems.
        
        Args:
            ecosystem_ids: List of ecosystem identifiers
            metric: 'commits' or 'developers'
            include_forks: Whether to include forked repositories
            days_back: Number of days to look back
            
        Returns:
            DataFrame with comparison data
        """
        dfs = []
        
        for ecosystem_id in ecosystem_ids:
            try:
                df = self.get_developer_activity_df(ecosystem_id, metric, include_forks, days_back)
                # Rename the metric column to include the ecosystem ID
                if metric in df.columns:
                    df.rename(columns={metric: f"{ecosystem_id}_{metric}"}, inplace=True)
                dfs.append(df)
            except ArtemisAPIError as e:
                print(f"Error fetching data for {ecosystem_id}: {e}")
                continue
        
        if not dfs:
            raise ArtemisAPIError("No data fetched for any ecosystems")
        
        # Combine all DataFrames
        result = pd.concat(dfs, axis=1)
        return result
    
    def get_supported_assets_df(self) -> pd.DataFrame:
        """
        Get list of supported assets as a DataFrame.
        
        Returns:
            DataFrame with supported assets information
        """
        data = self.client.list_supported_assets()
        return pd.DataFrame(data)
    
    def get_supported_ecosystems_df(self) -> pd.DataFrame:
        """
        Get list of supported ecosystems as a DataFrame.
        
        Returns:
            DataFrame with supported ecosystems information
        """
        data = self.client.list_supported_ecosystems()
        return pd.DataFrame(data)
    
    def get_available_metrics_df(self, asset_id: str) -> pd.DataFrame:
        """
        Get available metrics for an asset as a DataFrame.
        
        Args:
            asset_id: Asset symbol
            
        Returns:
            DataFrame with available metrics information
        """
        data = self.client.list_available_metrics(asset_id)
        return pd.DataFrame(data)