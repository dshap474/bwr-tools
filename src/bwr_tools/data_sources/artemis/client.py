"""Artemis API client for cryptocurrency and DeFi data."""

import os
from typing import Dict, List, Optional, Any, Union
from datetime import datetime, date
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class ArtemisAPIError(Exception):
    """Custom exception for Artemis API errors."""
    pass


class ArtemisClient:
    """Client for interacting with the Artemis API."""
    
    BASE_URL = "https://api.artemisxyz.com"
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Artemis API client.
        
        Args:
            api_key: Artemis API key. If not provided, will look for ARTEMIS_API_KEY in environment.
        """
        self.api_key = api_key or os.getenv("ARTEMIS_API_KEY")
        if not self.api_key:
            raise ValueError("Artemis API key not found. Please provide it or set ARTEMIS_API_KEY environment variable.")
        
        self.headers = {
            "Accept": "application/json"
        }
        self.session = requests.Session()
        self.session.headers.update(self.headers)
    
    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Make a request to the Artemis API.
        
        Args:
            endpoint: API endpoint path
            params: Query parameters
            
        Returns:
            API response as dictionary
            
        Raises:
            ArtemisAPIError: If the API request fails
        """
        url = f"{self.BASE_URL}{endpoint}"
        
        # Add API key to params
        if params is None:
            params = {}
        params["api-key"] = self.api_key
        
        try:
            response = self.session.get(url, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise ArtemisAPIError(f"API request failed: {str(e)}")
    
    # Core Artemis Assets Endpoints
    
    def list_supported_assets(self) -> List[Dict[str, Any]]:
        """
        List all supported assets in the Artemis platform.
        
        Returns:
            List of supported assets with their details
        """
        return self._make_request("/asset-symbols")
    
    def list_available_metrics(self, asset_id: str) -> List[Dict[str, Any]]:
        """
        List available metrics for a specific asset by symbol.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            
        Returns:
            List of available metrics for the asset
        """
        params = {"symbol": asset_id}
        return self._make_request("/supported-metrics/", params=params)
    
    def fetch_asset_metrics(
        self,
        asset_id: str,
        metrics: Union[str, List[str]],
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Fetch metrics for assets by symbol.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            metrics: Single metric or list of metrics to fetch
            start_date: Start date for the data (ISO format or date object)
            end_date: End date for the data (ISO format or date object)
            granularity: Data granularity ('daily', 'weekly', 'monthly')
            
        Returns:
            Dictionary containing the requested metrics data
        """
        # Convert metrics to comma-separated string if it's a list
        if isinstance(metrics, list):
            metrics = ",".join(metrics)
        
        # Format dates if provided
        params = {"symbols": asset_id}
        
        if start_date:
            if isinstance(start_date, (date, datetime)):
                start_date = start_date.strftime("%Y-%m-%d")
            params["startDate"] = start_date
            
        if end_date:
            if isinstance(end_date, (date, datetime)):
                end_date = end_date.strftime("%Y-%m-%d")
            params["endDate"] = end_date
        
        # Granularity might be handled via summarize parameter
        if granularity != "daily":
            params["summarize"] = granularity
        
        return self._make_request(f"/data/{metrics}", params=params)
    
    # Developer Activity Endpoints
    
    def list_supported_ecosystems(self) -> List[Dict[str, Any]]:
        """
        List all supported ecosystems for developer activity tracking.
        
        Returns:
            List of supported ecosystems
        """
        return self._make_request("/dev-ecosystems")
    
    def fetch_weekly_commits(
        self,
        ecosystem_id: str,
        include_forks: bool = False,
        days_back: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Fetch weekly commit data for an ecosystem.
        
        Args:
            ecosystem_id: Ecosystem identifier
            include_forks: Whether to include forked repositories
            days_back: Number of days to look back
            
        Returns:
            Weekly commit data for the ecosystem
        """
        params = {"ecosystem": ecosystem_id}
        
        if include_forks:
            params["includeForks"] = "true"
            
        if days_back:
            params["daysBack"] = days_back
        
        return self._make_request("/weekly-commits", params=params)
    
    def fetch_weekly_active_developers(
        self,
        ecosystem_id: str,
        include_forks: bool = False,
        days_back: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Fetch weekly active developer data for an ecosystem.
        
        Args:
            ecosystem_id: Ecosystem identifier
            include_forks: Whether to include forked repositories
            days_back: Number of days to look back
            
        Returns:
            Weekly active developer data for the ecosystem
        """
        params = {"ecosystem": ecosystem_id}
        
        if include_forks:
            params["includeForks"] = "true"
            
        if days_back:
            params["daysBack"] = days_back
        
        return self._make_request("/weekly-active-devs", params=params)
    
    # Convenience methods
    
    def get_price_data(
        self,
        asset_id: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Convenience method to fetch price data for an asset.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            Price data for the asset
        """
        return self.fetch_asset_metrics(asset_id, "price", start_date, end_date, granularity)
    
    def get_volume_data(
        self,
        asset_id: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Convenience method to fetch volume data for an asset.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            Volume data for the asset
        """
        return self.fetch_asset_metrics(asset_id, "volume", start_date, end_date, granularity)
    
    def get_tvl_data(
        self,
        asset_id: str,
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Convenience method to fetch TVL (Total Value Locked) data for an asset.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            TVL data for the asset
        """
        return self.fetch_asset_metrics(asset_id, "tvl", start_date, end_date, granularity)
    
    def get_multiple_metrics(
        self,
        asset_id: str,
        metrics: List[str],
        start_date: Optional[Union[str, date, datetime]] = None,
        end_date: Optional[Union[str, date, datetime]] = None,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """
        Fetch multiple metrics for an asset in a single request.
        
        Args:
            asset_id: Asset symbol (e.g., 'BTC', 'ETH')
            metrics: List of metrics to fetch
            start_date: Start date for the data
            end_date: End date for the data
            granularity: Data granularity
            
        Returns:
            Dictionary containing all requested metrics data
        """
        return self.fetch_asset_metrics(asset_id, metrics, start_date, end_date, granularity)