import requests
from typing import List, Dict, Optional, Union
from datetime import date, timedelta
import pandas as pd

# %%


class ArtemisAPI:
    API_KEY = "AmDzZw_oiTZdcIeBeLXbRUB1PaQTqnilRsTdUoHPQ_Q"  # Replace this with your actual API key

    def __init__(self, base_url: str = "https://api.artemisxyz.com"):
        self.base_url = base_url

    def _make_request(
        self, endpoint: str, method: str = "GET", params: Dict = None
    ) -> Dict:
        url = f"{self.base_url}{endpoint}"
        params = params or {}
        params["APIKey"] = self.API_KEY

        response = requests.request(method, url, params=params)
        response.raise_for_status()
        return response.json()

    def list_assets(
        self, as_dataframe: bool = False
    ) -> Union[List[Dict], pd.DataFrame]:
        """
        List supported assets.

        Args:
            as_dataframe (bool): If True, returns a pandas DataFrame with selected columns.
                               If False, returns the raw API response.

        Returns:
            Union[List[Dict], pd.DataFrame]: Either the raw API response or a formatted DataFrame
        """
        response = self._make_request("/asset")

        if not as_dataframe:
            return response

        # Extract the assets list from the response
        assets_list = response["assets"]

        # Create DataFrame with selected columns
        df_assets = pd.DataFrame(
            [
                {
                    "artemis_id": asset["artemis_id"],
                    "symbol": asset["symbol"],
                    "coingecko_id": asset["coingecko_id"],
                    "title": asset["title"],
                }
                for asset in assets_list
            ]
        )

        return df_assets

    def list_metrics_for_asset(self, artemis_id: str) -> Dict:
        """List available metrics for an asset."""
        response = self._make_request(f"/asset/{artemis_id}/metric")
        response = response["metrics"]
        return response

    def fetch_metrics_for_assets(
        self,
        metric_names: str,
        artemis_ids: Optional[str] = None,
        symbols: Optional[str] = None,
        start_date: Optional[date] = None,
        end_date: Optional[date] = None,
        summarize: bool = False,
    ) -> pd.DataFrame:
        """
        Fetch metrics for assets and return as a DataFrame.

        Args:
            metric_names (str): Single metric name to fetch (no commas allowed)
            artemis_ids (str, optional): Comma-separated list of artemis IDs
            symbols (str, optional): Comma-separated list of symbols
            start_date (date, optional): Start date for time series data
            end_date (date, optional): End date for time series data
            summarize (bool, optional): Whether to summarize the data

        Returns:
            pd.DataFrame: DataFrame with artemis_ids as columns and dates as index (if time series)
        """
        # Check for multiple metrics
        if "," in metric_names:
            raise ValueError("Please enter only one metric name (no commas allowed)")

        params = {
            "artemisIds": artemis_ids,
            "symbols": symbols,
            "startDate": start_date.isoformat() if start_date else None,
            "endDate": end_date.isoformat() if end_date else None,
            "summarize": summarize,
        }

        response = self._make_request(f"/data/{metric_names}", params=params)
        data = response["data"]["artemis_ids"]

        # If it's a time series response (list of date/val pairs)
        if isinstance(next(iter(data.values()))[metric_names], list):
            # Create a list of records for the DataFrame
            records = []
            for asset_id, asset_data in data.items():
                for entry in asset_data[metric_names]:
                    records.append(
                        {
                            "date": entry["date"],
                            "asset_id": asset_id,
                            "value": entry["val"],
                        }
                    )

            # Create DataFrame and pivot
            df = pd.DataFrame(records)
            df["date"] = pd.to_datetime(df["date"])
            df_pivot = df.pivot(index="date", columns="asset_id", values="value")
            return df_pivot

        # If it's a single value response
        else:
            return pd.DataFrame(
                {
                    asset_id: [asset_data[metric_names]]
                    for asset_id, asset_data in data.items()
                }
            )

    def list_ecosystems(self) -> List[Dict]:
        """List supported ecosystems."""
        return self._make_request("/dev-ecosystems")

    def query_weekly_commits_for_ecosystem(
        self,
        ecosystem: Optional[str] = None,
        include_forks: bool = False,
        days_back: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Fetch weekly commits for ecosystems.

        Args:
            ecosystem (str, optional): Name of the ecosystem (case sensitive, e.g., 'Ethereum')
            include_forks (bool): Whether to include forked repositories
            days_back (int, optional): Number of days to look back

        Returns:
            pd.DataFrame: DataFrame with columns for date, core commits, and sub-ecosystem commits
        """
        params = {
            "ecosystem": ecosystem,
            "includeForks": include_forks,
            "daysBack": days_back,
        }

        response = self._make_request("/weekly-commits", params=params)

        if not response:
            return pd.DataFrame()

        # Convert response to DataFrame
        records = []
        for entry in response:
            record = {
                "date": pd.to_datetime(entry["date"]),
                "core_commits": entry.get(f"{ecosystem} Core", 0),
                "sub_ecosystem_commits": entry.get("Sub-Ecosystems", 0),
            }
            records.append(record)

        df = pd.DataFrame(records)
        return df

    def query_active_devs_for_ecosystem(
        self,
        ecosystem: Optional[str] = None,
        include_forks: bool = False,
        days_back: Optional[int] = None,
    ) -> pd.DataFrame:
        """
        Fetch weekly active developers for ecosystems.

        Args:
            ecosystem (str, optional): Name of the ecosystem (case sensitive, e.g., 'Solana')
            include_forks (bool): Whether to include forked repositories
            days_back (int, optional): Number of days to look back

        Returns:
            pd.DataFrame: DataFrame with columns for date, core developers, and sub-ecosystem developers
        """
        params = {
            "ecosystem": ecosystem,
            "includeForks": include_forks,
            "daysBack": days_back,
        }

        response = self._make_request("/weekly-active-devs", params=params)

        if not response:
            return pd.DataFrame()

        # Convert response to DataFrame
        records = []
        for entry in response:
            record = {
                "date": pd.to_datetime(entry["date"]),
                "core_developers": entry.get(f"{ecosystem} Core", 0),
                "sub_ecosystem_developers": entry.get("Sub-Ecosystems", 0),
            }
            records.append(record)

        df = pd.DataFrame(records)
        return df


# %% Usage examples:
# api = ArtemisAPI()

# # Get assets as DataFrame
# print("\n=== Assets as DataFrame ===")
# df_assets = api.list_assets(as_dataframe=True)
# print(df_assets)


# # 2. List metrics for Bitcoin
# metrics_list = api.list_metrics_for_asset('solana')
# print("Available metrics:")
# for x in metrics_list:
#     print(x)

###########
# METRICS #
###########
# start_date = date.fromisoformat('2024-01-01')
# artemis_ids = "ethereum,solana,base,arbitrum,optimism"

# revenue_data = api.fetch_metrics_for_assets(
#     metric_names="REVENUE",
#     artemis_ids=artemis_ids,
#     start_date=start_date,
# )

# txns_data = api.fetch_metrics_for_assets(
#     metric_names="DAILY_TXNS",
#     artemis_ids=artemis_ids,
#     start_date=start_date,
# )

# tvl_data = api.fetch_metrics_for_assets(
#     metric_names="TVL",
#     artemis_ids=artemis_ids,
#     start_date=start_date,
# )

# users_data = api.fetch_metrics_for_assets(
#     metric_names="DAU",
#     artemis_ids=artemis_ids,
#     start_date=start_date,
# )
