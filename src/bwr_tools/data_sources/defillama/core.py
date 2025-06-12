"""
DeFi Llama Module Core
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Core class providing access to DeFi Llama API endpoints
"""

#############
## Imports ##------------------------------------------------------------------
#############

import os
import sys
import logging
import pandas as pd
import requests
from typing import Dict, List, Optional, Union
from .config import Config
from .exceptions import APIError, DataNotFoundError, InvalidParameterError

# %% Class


class DefiLlama:
    """DeFi Llama API wrapper for accessing DeFi protocol data"""

    def __init__(self, base_url: Optional[str] = None):
        """Initialize DeFi Llama client
        
        Args:
            base_url: Override default API base URL
        """
        self.base_url = base_url or Config.DEFI_LLAMA_BASE_URL
        self.coins_base_url = Config.COINS_BASE_URL
        self.logger = self._setup_logger()

    def _setup_logger(self) -> logging.Logger:
        """Setup logger for the client"""
        logger = logging.getLogger('defi_llama')
        logger.setLevel(getattr(logging, Config.LOG_LEVEL))
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(Config.LOG_FORMAT)
            handler.setFormatter(formatter)
            logger.addHandler(handler)
        
        return logger
    
    def _make_request(self, url: str, params: Optional[Dict] = None) -> requests.Response:
        """Make HTTP request with error handling
        
        Args:
            url: Request URL
            params: Query parameters
            
        Returns:
            Response object
            
        Raises:
            APIError: On API errors
        """
        try:
            self.logger.debug(f"Making request to: {url}")
            response = requests.get(url, params=params, timeout=Config.REQUEST_TIMEOUT)
            response.raise_for_status()
            return response
        except requests.exceptions.RequestException as e:
            self.logger.error(f"Request failed: {e}")
            raise APIError(f"Request failed: {e}")
    
    def print_all_functions(self):
        """Print a list of all functions contained in this class."""
        functions = [
            func
            for func in dir(self)
            if callable(getattr(self, func)) and not func.startswith("_")
        ]
        self.logger.info("Functions in defi_llama class:")
        for func in functions:
            self.logger.info(f"- {func}")

    ###############
    # TVL Methods #-------------------------------------------------------------------------
    ###############

    def get_all_protocols(self):
        """List all protocols on defillama along with their TVL

        Returns:
            pd.DataFrame: DataFrame containing protocols and their TVL data, sorted by TVL in descending order
                - name: Protocol name
                - slug: Protocol slug
                - tvl: Current TVL in USD
                - mcap: Market capitalization
                - market_share: Percentage of total TVL

        Example:
            >>> client = defi_llama()
            >>> protocols = client.get_all_protocols()
            >>> # Top protocols are already sorted by TVL
            >>> top_10_protocols = protocols.head(10)
        """
        endpoint = f"{self.base_url}/protocols"
        try:
            response = self._make_request(endpoint)
            
            if response.status_code == 200:
                data = response.json()
                df = pd.DataFrame(data)

                # Convert numeric columns
                numeric_cols = ["tvl", "change_1h", "change_1d", "change_7d", "mcap"]
                for col in numeric_cols:
                    if col in df.columns:
                        df[col] = pd.to_numeric(df[col], errors="coerce")

                # Add market share calculation
                if "tvl" in df.columns:
                    df["market_share"] = (df["tvl"] / df["tvl"].sum()) * 100

                # Sort by TVL in descending order
                df = df.sort_values("tvl", ascending=False)

                return df[["name", "slug", "tvl", "mcap", "market_share"]]
            return pd.DataFrame()
        except APIError as e:
            self.logger.error(f"Failed to get protocols: {e}")
            return pd.DataFrame()

    def get_protocol_tvl(self, protocol: str) -> Dict:
        """Get historical TVL of a protocol and breakdowns by token and chain

        Args:
            protocol: Protocol slug/name

        Returns:
            Dictionary containing:
                - tvl: DataFrame of historical total TVL
                - chain_tvl: Dictionary of DataFrames with per-chain TVL
                - token_tvl: Dictionary of DataFrames with per-token TVL
                - meta: Protocol metadata

        Raises:
            InvalidParameterError: If protocol is not provided
        """
        if not protocol:
            raise InvalidParameterError("Must enter a protocol")

        endpoint = f"{self.base_url}/protocol/{protocol}"
        try:
            response = self._make_request(endpoint)
            
            if response.status_code == 200:
                data = response.json()
                result = {
                    "meta": {k: v for k, v in data.items() if not isinstance(v, list)}
                }

                # Process main TVL data
                if "tvl" in data:
                    tvl_df = pd.DataFrame(data["tvl"])
                    if "date" in tvl_df.columns:
                        tvl_df["date"] = pd.to_datetime(tvl_df["date"], unit="s")
                        tvl_df.set_index("date", inplace=True)
                    result["tvl"] = tvl_df

                # Process chain-specific TVL
                if "chainTvls" in data:
                    chain_tvls = {}
                    for chain, chain_data in data["chainTvls"].items():
                        if isinstance(chain_data, list):
                            chain_df = pd.DataFrame(chain_data)
                            if "date" in chain_df.columns:
                                chain_df["date"] = pd.to_datetime(
                                    chain_df["date"], unit="s"
                                )
                                chain_df.set_index("date", inplace=True)
                            chain_tvls[chain] = chain_df
                    result["chain_tvl"] = chain_tvls

                # Process token TVL if available
                if "tokens" in data:
                    token_tvls = {}
                    for token_data in data["tokens"]:
                        if "tokens" in token_data and isinstance(
                            token_data["tokens"], list
                        ):
                            token_df = pd.DataFrame(token_data["tokens"])
                            if not token_df.empty and "date" in token_df.columns:
                                token_df["date"] = pd.to_datetime(
                                    token_df["date"], unit="s"
                                )
                                token_df.set_index("date", inplace=True)
                                token_tvls[token_data.get("symbol", "unknown")] = token_df
                        elif isinstance(token_data.get("tokens"), dict):
                            # Handle case where 'tokens' is a dictionary
                            token_df = pd.DataFrame([token_data["tokens"]])
                            if not token_df.empty:
                                token_tvls[token_data.get("symbol", "unknown")] = token_df
                    result["token_tvl"] = token_tvls

                return result
            return {}
        except APIError as e:
            self.logger.error(f"Failed to get protocol TVL for {protocol}: {e}")
            return {}

    def get_total_crypto_tvl(self):
        """Get historical total crypto TVL on all chains
        (excludes liquid staking and double counted TVL)

        Returns:
            pd.DataFrame: DataFrame containing historical TVL data for all chains
        """
        endpoint = f"{self.base_url}/v2/historicalChainTvl"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            df["date"] = pd.to_datetime(df["date"], unit="s")
            df.set_index("date", inplace=True)
            return df
        return {"error": f"Failed: {response.status_code}"}

    def get_chain_historical_tvl(self, chain):
        """Get historical TVL of a specific chain
        (excludes liquid staking and double counted TVL)

        Args:
            chain (str): Chain slug

        Returns:
            pd.DataFrame: DataFrame containing historical TVL data for the chain
        """
        endpoint = f"{self.base_url}/v2/historicalChainTvl/{chain}"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            df["date"] = pd.to_datetime(df["date"], unit="s")
            df.set_index("date", inplace=True)
            return df
        return {"error": f"Failed: {response.status_code}"}

    def get_all_chains_tvl(self):
        """Get current TVL of all chains

        Returns:
            pd.DataFrame: DataFrame containing current TVL for all chains, sorted by TVL in descending order
        """
        endpoint = f"{self.base_url}/v2/chains"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)

            # Add market share calculation
            if "tvl" in df.columns:
                df["market_share"] = (df["tvl"] / df["tvl"].sum()) * 100

            # Sort the DataFrame by 'tvl' in descending order
            df = df.sort_values(by="tvl", ascending=False)

            return df
        return {"error": f"Failed: {response.status_code}"}

    #################
    # Coins Methods #-------------------------------------------------------------
    #################

    def get_price_chart(
        self, coins, start=None, end=None, span=1000, period="24h", search_width=None
    ):
        """Get token prices at regular time intervals

        Args:
            coins (str): Comma-separated tokens defined as {chain}:{address}
            start (str, optional): Start date in 'yyyy-mm-dd' format
            end (str, optional): End date in 'yyyy-mm-dd' format
            period (str): Duration between data points (default: "24h")
                Format: Can use chart candle notation like '4h', '1d', etc.
            span (int, optional): Number of data points to return (default: 10)
            search_width (str, optional): Time range to find price data
                Defaults to 10% of period

        Returns:
            pd.DataFrame: DataFrame containing price chart data
        """
        params = {"period": period, "span": span if span is not None else 10}

        # Convert start and end dates to Unix timestamps
        if start is not None:
            start_timestamp = int(pd.to_datetime(start).timestamp())
            params["start"] = start_timestamp

        if end is not None:
            end_timestamp = int(pd.to_datetime(end).timestamp())
            params["end"] = end_timestamp

        if search_width is not None:
            params["searchWidth"] = search_width

        endpoint = f"{self.coins_base_url}/chart/{coins}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            all_prices = []
            for coin, coin_data in data["coins"].items():
                if "prices" in coin_data:
                    for price_point in coin_data["prices"]:
                        all_prices.append(
                            {
                                "coin": coin,
                                "timestamp": price_point["timestamp"],
                                "price": price_point["price"],
                                "datetime": pd.to_datetime(
                                    price_point["timestamp"], unit="s"
                                ),
                            }
                        )

            df = pd.DataFrame(all_prices)
            if not df.empty:
                df.set_index("datetime", inplace=True)
                df.sort_index(inplace=True)
                return df
            else:
                print("Empty DataFrame\nColumns: []\nIndex: []\n\nreturning empty")
                return pd.DataFrame()  # Return an empty DataFrame
        print(f"Failed: {response.status_code}")
        return pd.DataFrame()  # Return an empty DataFrame on error

    def get_earliest_price(self, coins):
        """Get earliest timestamp price record for coins

        Args:
            coins (str or list): Token(s) in format {chain}:{address}. Can be a single string or a list of strings.

        Returns:
            dict: Dictionary containing earliest price records for each coin
        """
        if isinstance(coins, list):
            coins_param = ",".join(coins)
        else:
            coins_param = coins

        endpoint = f"{self.coins_base_url}/prices/first/{coins_param}"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            if "coins" in data and data["coins"]:
                return data
            else:
                return {"error": "No data returned for the specified coins"}
        elif response.status_code == 502:
            return {
                "error": "Internal server error. The API might be experiencing issues."
            }
        else:
            return {"error": f"Failed: {response.status_code}"}

    #######################
    # Stablecoins Methods #-------------------------------------------------------------
    #######################

    def get_stablecoin_circulating_supply(self, include_prices=False):
        """List all stablecoins along with their circulating amounts

        Args:
            include_prices (bool): Whether to include current stablecoin prices

        Returns:
            pd.DataFrame: DataFrame containing stablecoin data with columns including:
                - id: Stablecoin ID
                - name: Stablecoin name
                - symbol: Token symbol
                - circulating_total: Total circulating supply across all networks
                - pegType: Type of peg (e.g., USD, EUR)
                - prices: Current prices (if requested)
                - Additional columns for each chain's circulating supply (e.g., circulating_optimism, circulating_statemine)

        Example:
            >>> client = defi_llama()
            >>> stablecoins = client.get_stablecoin_circulating_supply(include_prices=True)
            >>> # Get top stablecoins by circulating supply
            >>> top_stables = stablecoins.nlargest(10, 'circulating_total')
        """
        params = {"includePrices": str(include_prices).lower()}

        endpoint = "https://stablecoins.llama.fi/stablecoins"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            if "peggedAssets" in data:
                df = pd.DataFrame(data["peggedAssets"])

                # Extract and sum the circulating supply across all networks
                df["circulating_total"] = df["circulating"].apply(
                    lambda x: sum(x.values()) if isinstance(x, dict) else x
                )

                # Convert circulating_total to numeric, coercing any non-numeric values to NaN
                df["circulating_total"] = pd.to_numeric(
                    df["circulating_total"], errors="coerce"
                )

                # Extract chain-specific circulating supply
                for chain in df["chainCirculating"].iloc[0].keys():
                    df[f"circulating_{chain.lower()}"] = df["chainCirculating"].apply(
                        lambda x: (
                            x.get(chain, {}).get("current", {}).get("peggedUSD", 0)
                            if isinstance(x, dict)
                            else 0
                        )
                    )

                # Select only the relevant columns
                columns_to_keep = [
                    "id",
                    "name",
                    "symbol",
                    "circulating_total",
                    "pegType",
                ] + [
                    f"circulating_{chain.lower()}"
                    for chain in df["chainCirculating"].iloc[0].keys()
                ]
                if include_prices:
                    columns_to_keep.append("price")

                df = df[columns_to_keep]

                return df
            return pd.DataFrame(data)
        return {"error": f"Failed: {response.status_code}"}

    def get_stablecoin_charts_all(self, stablecoin_id=None):
        """Get historical mcap sum of a selected stablecoin

        Args:
            stablecoin_id (int): Specific stablecoin ID to filter by

        Returns:
            pd.DataFrame: DataFrame containing historical market cap data for different stablecoins
        """
        params = {}
        if stablecoin_id is not None:
            params["stablecoin"] = stablecoin_id

        endpoint = "https://stablecoins.llama.fi/stablecoincharts/all"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"], unit="s")
                df.set_index("date", inplace=True)

                # Extract different pegged currencies
                pegged_currencies = (
                    df["totalCirculating"].apply(lambda x: x.keys()).explode().unique()
                )

                # Create new columns for each pegged currency
                for currency in pegged_currencies:
                    df[f"circulating_{currency}"] = df["totalCirculating"].apply(
                        lambda x: x.get(currency, 0)
                    )

                # Drop the original totalCirculating column and other specified columns
                columns_to_drop = [
                    "totalCirculating",
                    "totalCirculatingUSD",
                    "totalUnreleased",
                    "totalMintedUSD",
                    "totalBridgedToUSD",
                ]
                df = df.drop(
                    columns=[col for col in columns_to_drop if col in df.columns]
                )

            return df
        return {"error": f"Failed: {response.status_code}"}

    def get_stablecoin_charts_chain(self, chain, stablecoin_id=None):
        """Get historical mcap sum of all stablecoins in a chain

        Args:
            chain (str): Chain slug
            stablecoin_id (int, optional): Specific stablecoin ID to filter by

        Returns:
            pd.DataFrame: DataFrame containing historical market cap data for the chain
        """
        params = {}
        if stablecoin_id is not None:
            params["stablecoin"] = stablecoin_id

        endpoint = f"https://stablecoins.llama.fi/stablecoincharts/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"], unit="s")
                df.set_index("date", inplace=True)

                # Extract different pegged currencies
                pegged_currencies = (
                    df["totalCirculating"].apply(lambda x: x.keys()).explode().unique()
                )

                # Create new columns for each pegged currency
                for currency in pegged_currencies:
                    df[f"circulating_{currency}"] = df["totalCirculating"].apply(
                        lambda x: x.get(currency, 0)
                    )

                # Drop the original totalCirculating column and other specified columns
                columns_to_drop = [
                    "totalCirculating",
                    "totalCirculatingUSD",
                    "totalUnreleased",
                    "totalMintedUSD",
                    "totalBridgedToUSD",
                ]
                df = df.drop(
                    columns=[col for col in columns_to_drop if col in df.columns]
                )

            return df
        return {"error": f"Failed: {response.status_code}"}

    def get_stablecoin_asset(self, asset_id):
        """Get historical mcap and historical chain distribution of a stablecoin

        Args:
            asset_id (int): Stablecoin ID from /stablecoins endpoint

        Returns:
            pd.DataFrame: DataFrame containing historical chain balance data
        """
        endpoint = f"https://stablecoins.llama.fi/stablecoin/{asset_id}"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()

            if "chainBalances" in data:
                chain_balances = []
                for chain, balance_data in data["chainBalances"].items():
                    for token in balance_data["tokens"]:
                        chain_balances.append(
                            {
                                "date": pd.to_datetime(token["date"], unit="s"),
                                "chain": chain,
                                "circulating_peggedUSD": (
                                    token["circulating"].get("peggedUSD", 0)
                                    if isinstance(token.get("circulating"), dict)
                                    else 0
                                ),
                            }
                        )

                df = pd.DataFrame(chain_balances)
                df = df.pivot(
                    index="date", columns="chain", values="circulating_peggedUSD"
                )
                df.columns.name = None

                # Calculate the total circulating supply
                df[f'{data["name"]}_total_circulating'] = df.sum(axis=1)

                # Reorder columns to make the total column first
                columns = df.columns.tolist()
                columns = [columns[-1]] + columns[:-1]
                df = df[columns]

                return df

            return pd.DataFrame()  # Return empty DataFrame if no chainBalances data
        return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_stablecoin_chains(self):
        """Get current mcap sum of all stablecoins on each chain

        Returns:
            pd.DataFrame: DataFrame containing current market cap data by chain with separate columns for each pegged currency
        """
        endpoint = "https://stablecoins.llama.fi/stablecoinchains"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)

            # Extract all pegged currencies from totalCirculatingUSD
            if not df.empty and "totalCirculatingUSD" in df.columns:
                pegged_currencies = set()
                for currencies in df["totalCirculatingUSD"]:
                    if isinstance(currencies, dict):
                        pegged_currencies.update(currencies.keys())

                # Create separate columns for each pegged currency
                for currency in pegged_currencies:
                    df[currency] = df["totalCirculatingUSD"].apply(
                        lambda x: x.get(currency, 0) if isinstance(x, dict) else 0
                    )

            # Drop the original totalCirculatingUSD column
            df = df.drop(columns=["totalCirculatingUSD"])

            return df
        return {"error": f"Failed: {response.status_code}"}

    def get_stablecoin_prices(self):
        """Get historical prices of all stablecoins

        Returns:
            pd.DataFrame: DataFrame containing historical price data for all stablecoins
        """
        endpoint = "https://stablecoins.llama.fi/stablecoinprices"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            df = pd.DataFrame(data)
            if not df.empty:
                df["date"] = pd.to_datetime(df["date"], unit="s")
                df.set_index("date", inplace=True)

                # Break out each stablecoin into separate columns
                stablecoins = df["prices"].apply(pd.Series)

                # Combine the original DataFrame with the new stablecoin columns
                df = pd.concat([df, stablecoins], axis=1)

                # Drop the original 'prices' column
                df = df.drop(columns=["prices"])

            return df
        return {"error": f"Failed: {response.status_code}"}

    ###################
    # Yields Methods #-------------------------------------------------------------
    ###################

    def get_pools(self, chain: str = "None", tvl_filter: int = 1000000):
        """Retrieve the latest data for all pools, including enriched information such as predictions

        Args:
            chain (str, optional): Filter pools by specific blockchain. Defaults to None.
            tvl_filter (int, optional): Minimum TVL (Total Value Locked) in USD. Defaults to 1000000.

        Returns:
            pd.DataFrame: A DataFrame containing pool information

        Example:
            >>> client = defi_llama()
            >>> pools = client.get_pools(chain='Ethereum', tvl_filter=5000000)
            >>> # Get top 10 pools by APY
            >>> top_pools = pools.nlargest(10, 'apy')
        """
        endpoint = "https://yields.llama.fi/pools"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = pd.DataFrame(response.json()["data"])

            # Apply chain filter if specified
            if chain != "None":
                # Convert chain to lowercase for comparison
                chain_lower = chain.lower()
                data = data[data["chain"].str.lower() == chain_lower]

            # Apply TVL filter after converting to integer
            data = data[data["tvlUsd"].astype(int) >= int(tvl_filter)]

            return data
        else:
            return pd.DataFrame()

    def get_pool_chart(self, pool_id):
        """Get historical APY and TVL data for a specific pool

        Args:
            pool_id (str): Pool identifier from the /pools endpoint

        Returns:
            pd.DataFrame: DataFrame containing historical data with columns:
                - timestamp: Date of the data point
                - tvlUsd: Total Value Locked in USD
                - apy: APY at that timestamp
                - apyBase: Base APY at that timestamp
                - apyReward: Reward APY at that timestamp
                - il7d: Impermanent Loss over 7 days
                - apyBase7d: 7-day average of base APY

        Example:
            >>> client = defi_llama()
            >>> # Get historical data for a specific pool
            >>> pool_history = client.get_pool_chart("747c1d2a-c668-4682-b9f9-296708a3dd90")
            >>> # Plot APY over time
            >>> pool_history.plot(x='timestamp', y='apy')
        """
        endpoint = f"https://yields.llama.fi/chart/{pool_id}"
        response = requests.get(endpoint)

        if response.status_code == 200:
            data = response.json()
            if "data" in data and isinstance(data["data"], list):
                df = pd.DataFrame(data["data"])

                if not df.empty:
                    # Convert timestamp and remove timezone
                    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize(
                        None
                    )
                    df.set_index("timestamp", inplace=True)

                    # Convert numeric columns
                    numeric_columns = [
                        "tvlUsd",
                        "apy",
                        "apyBase",
                        "apyReward",
                        "il7d",
                        "apyBase7d",
                    ]
                    for col in numeric_columns:
                        if col in df.columns:
                            df[col] = pd.to_numeric(df[col], errors="coerce")

                    # Add rolling averages
                    if "apy" in df.columns:
                        df["apy_7d_avg"] = df["apy"].rolling(window=7).mean()
                        df["apy_30d_avg"] = df["apy"].rolling(window=30).mean()

                    # Add TVL changes
                    if "tvlUsd" in df.columns:
                        df["tvl_change_24h"] = df["tvlUsd"].pct_change(periods=1)
                        df["tvl_change_7d"] = df["tvlUsd"].pct_change(periods=7)

                return df
            else:
                return (
                    pd.DataFrame()
                )  # Return empty DataFrame if 'data' is not in the expected format
        return pd.DataFrame()  # Return empty DataFrame on request failure

    ###################
    # Volume Methods #-------------------------------------------------------------
    ###################

    # region DEX Methods
    def get_dexs_overview(self, data_type="dailyVolume"):
        """List all dexs along with summaries of their volumes and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with DEX information, sorted by totalAllTime volume in descending order
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/dexs"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            dex_overview = data["protocols"]
            df = pd.DataFrame(dex_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_total_dex_volume(self, data_type="dailyVolume"):
        """List all dexs along with summaries of their volumes and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/dexs"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"], columns=["timestamp", "total_dex_volume"]
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="volume"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_dexs_overview(self, chain, data_type="dailyVolume"):
        """List all dexs along with summaries of their volumes and dataType history data filtering by chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/dexs response
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/dexs/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            dex_overview = data["protocols"]
            df = pd.DataFrame(dex_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

        return df

    def get_chain_dex_volume(self, chain, data_type="dailyVolume"):
        """List all dexs along with summaries of their volumes and dataType history data filtering by chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/dexs response
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/dexs/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"],
                    columns=["timestamp", f"{chain}_total_dex_volume"],
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="volume"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_dex_summary(self, protocol, data_type="dailyVolume"):
        """Get summary of dex volume with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame containing DEX summary information
        """
        params = {
            "excludeTotalDataChart": "true",
            "excludeTotalDataChartBreakdown": "true",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/summary/dexs/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create a DataFrame from the dictionary
            df = pd.DataFrame([data])

            # Convert nested dictionaries to separate columns
            for column in df.columns:
                if isinstance(df[column].iloc[0], dict):
                    nested_df = pd.json_normalize(df[column])
                    df = pd.concat([df.drop(column, axis=1), nested_df], axis=1)

            # Drop 'totalDataChart' and 'totalDataChartBreakdown' columns if they exist
            df = df.drop(
                ["totalDataChart", "totalDataChartBreakdown"], axis=1, errors="ignore"
            )

            return df

        return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_dex_volume(self, protocol, data_type="dailyVolume"):
        """Get summary of dex volume with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame of historical data with total volume and breakdown by protocol
        """
        params = {
            "excludeTotalDataChart": "false",
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/summary/dexs/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create DataFrame from totalDataChartBreakdown
            df = pd.DataFrame(data["totalDataChartBreakdown"])

            # Set the first column (timestamp) as index
            df.set_index(0, inplace=True)
            df.index = pd.to_datetime(df.index, unit="s")
            df.index.name = "timestamp"

            # Function to extract protocol volumes
            def extract_protocol_volumes(row):
                volumes = {}
                for chain, protocols in row.items():
                    for protocol, volume in protocols.items():
                        volumes[f"{protocol.lower().replace(' ', '_')}_volume"] = volume
                return pd.Series(volumes)

            # Apply the function to each row
            protocol_volumes = df[1].apply(extract_protocol_volumes)

            # Add total volume from totalDataChart
            total_volume = pd.DataFrame(
                data["totalDataChart"], columns=["timestamp", "total_volume"]
            )
            total_volume["timestamp"] = pd.to_datetime(
                total_volume["timestamp"], unit="s"
            )
            total_volume.set_index("timestamp", inplace=True)

            # Merge total volume with protocol breakdown
            df = pd.concat([total_volume, protocol_volumes], axis=1)

            return df
        return pd.DataFrame()

    # region Derivatives Methods
    def get_derivatives_overview(self, data_type="dailyVolume"):
        """List all derivatives along with summaries of their volumes and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with derivatives information, sorted by totalAllTime volume in descending order
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/derivatives"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            dex_overview = data["protocols"]
            df = pd.DataFrame(dex_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_total_derivative_volume(self, data_type="dailyVolume"):
        """Get total volume of all derivatives

        Args:
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/derivatives"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"],
                    columns=["timestamp", "total_derivatives_volume"],
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="volume"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_derivatives_overview(self, chain, data_type="dailyVolume"):
        """List all derivatives on a chain along with summaries of their volumes and dataType history data

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/derivatives response
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with derivatives information for the specified chain
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/derivatives/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            derivatives_overview = data["protocols"]
            df = pd.DataFrame(derivatives_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_derivative_volume(self, chain, data_type="dailyVolume"):
        """Get total volume of all derivatives on a chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/derivatives response
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/derivatives/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"], columns=["timestamp", "total_volume"]
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                if all_data:
                    df = pd.DataFrame(all_data)

                    # Pivot the DataFrame to get protocols as columns
                    protocol_volumes = df.pivot(
                        index="timestamp", columns="protocol", values="volume"
                    )
                    protocol_volumes.columns = [
                        f"{col.lower().replace(' ', '_')}_volume"
                        for col in protocol_volumes.columns
                    ]

                    # Merge with total volume
                    df_pivoted = pd.concat([df_pivoted, protocol_volumes], axis=1)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_derivative_summary(self, protocol, data_type="dailyVolume"):
        """Get summary of protocol volume with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame containing options summary information
        """
        params = {"dataType": data_type}

        endpoint = f"{self.base_url}/summary/derivatives/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create a DataFrame from the dictionary
            df = pd.DataFrame([data])

            # Convert nested dictionaries to separate columns
            for column in df.columns:
                if isinstance(df[column].iloc[0], dict):
                    nested_df = pd.json_normalize(df[column])
                    df = pd.concat([df.drop(column, axis=1), nested_df], axis=1)

            # Drop 'totalDataChart' and 'totalDataChartBreakdown' columns if they exist
            df = df.drop(
                ["totalDataChart", "totalDataChartBreakdown"], axis=1, errors="ignore"
            )

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_derivative_volume(self, protocol, data_type="dailyVolume"):
        """Get historical volume data for a protocol

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyVolume', 'totalVolume'

        Returns:
            pd.DataFrame: DataFrame of historical data with total volume and breakdown by protocol
        """
        params = {
            "excludeTotalDataChart": "false",
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/summary/derivatives/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create DataFrame from totalDataChartBreakdown
            df = pd.DataFrame(data["totalDataChartBreakdown"])

            # Set the first column (timestamp) as index
            df.set_index(0, inplace=True)
            df.index = pd.to_datetime(df.index, unit="s")
            df.index.name = "timestamp"

            # Function to extract protocol volumes
            def extract_protocol_volumes(row):
                volumes = {}
                for chain, protocols in row.items():
                    for protocol, volume in protocols.items():
                        volumes[f"{protocol.lower().replace(' ', '_')}_volume"] = volume
                return pd.Series(volumes)

            # Apply the function to each row
            protocol_volumes = df[1].apply(extract_protocol_volumes)

            # Add total volume from totalDataChart
            total_volume = pd.DataFrame(
                data["totalDataChart"], columns=["timestamp", "total_volume"]
            )
            total_volume["timestamp"] = pd.to_datetime(
                total_volume["timestamp"], unit="s"
            )
            total_volume.set_index("timestamp", inplace=True)

            # Merge total volume with protocol breakdown
            df = pd.concat([total_volume, protocol_volumes], axis=1)

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    # region Options Methods
    def get_options_overview(self, data_type="dailyNotionalVolume"):
        """List all options dexs along with summaries of their volumes and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame with options DEX information, sorted by totalAllTime volume in descending order
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/options"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            options_overview = data["protocols"]
            df = pd.DataFrame(options_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_total_options_volume(self, data_type="dailyNotionalVolume"):
        """List all options dexs along with summaries of their volumes and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/options"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"],
                    columns=["timestamp", "total_options_volume"],
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="volume"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_options_overview(self, chain, data_type="dailyNotionalVolume"):
        """List all options dexs along with summaries of their volumes and dataType history data filtering by chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/options response
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame with options dex overview data
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/options/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            options_overview = data["protocols"]
            df = pd.DataFrame(options_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_options_volume(self, chain, data_type="dailyNotionalVolume"):
        """List all options dexs along with summaries of their volumes and dataType history data filtering by chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/options response
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and volumes as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/options/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_volume = pd.DataFrame(
                    data["totalDataChart"],
                    columns=["timestamp", "total_options_volume"],
                )
                total_volume["timestamp"] = pd.to_datetime(
                    total_volume["timestamp"], unit="s"
                )
                total_volume.set_index("timestamp", inplace=True)
                df_pivoted = total_volume

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    volumes = entry[1]

                    for protocol, volume in volumes.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "volume": volume,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="volume"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_options_summary(self, protocol, data_type="dailyNotionalVolume"):
        """Get summary of options dex volume with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame containing options summary information
        """
        params = {
            "excludeTotalDataChart": "true",
            "excludeTotalDataChartBreakdown": "true",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/summary/options/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create a DataFrame from the dictionary
            df = pd.DataFrame([data])

            # Convert nested dictionaries to separate columns
            for column in df.columns:
                if isinstance(df[column].iloc[0], dict):
                    nested_df = pd.json_normalize(df[column])
                    df = pd.concat([df.drop(column, axis=1), nested_df], axis=1)

            # Drop 'totalDataChart' and 'totalDataChartBreakdown' columns if they exist
            df = df.drop(
                ["totalDataChart", "totalDataChartBreakdown"], axis=1, errors="ignore"
            )

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_options_volume(self, protocol, data_type="dailyNotionalVolume"):
        """Get summary of options dex volume with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'dailyPremiumVolume', 'dailyNotionalVolume',
                           'totalPremiumVolume', 'totalNotionalVolume'

        Returns:
            pd.DataFrame: DataFrame of historical data with total volume and breakdown by protocol
        """
        params = {
            "excludeTotalDataChart": "false",
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/summary/options/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create DataFrame from totalDataChartBreakdown
            df = pd.DataFrame(data["totalDataChartBreakdown"])

            # Set the first column (timestamp) as index
            df.set_index(0, inplace=True)
            df.index = pd.to_datetime(df.index, unit="s")
            df.index.name = "timestamp"

            # Function to extract protocol volumes
            def extract_protocol_volumes(row):
                volumes = {}
                for chain, protocols in row.items():
                    for protocol, volume in protocols.items():
                        volumes[f"{protocol.lower().replace(' ', '_')}_volume"] = volume
                return pd.Series(volumes)

            # Apply the function to each row
            protocol_volumes = df[1].apply(extract_protocol_volumes)

            # Add total volume from totalDataChart
            total_volume = pd.DataFrame(
                data["totalDataChart"], columns=["timestamp", "total_volume"]
            )
            total_volume["timestamp"] = pd.to_datetime(
                total_volume["timestamp"], unit="s"
            )
            total_volume.set_index("timestamp", inplace=True)

            # Merge total volume with protocol breakdown
            df = pd.concat([total_volume, protocol_volumes], axis=1)

            return df

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    ##########################
    # Fees & Revenue Methods #-------------------------------------------------------------
    ##########################

    def get_fees_or_revenue_overview(self, data_type="fees"):
        """List all protocols along with summaries of their fees and revenue and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'fees', 'revenue'

        Returns:
            pd.DataFrame: DataFrame with protocol fees and revenue information, sorted by totalAllTime in descending order
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": "daily" + data_type.capitalize(),
        }

        endpoint = f"{self.base_url}/overview/fees"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            fees_overview = data["protocols"]
            df = pd.DataFrame(fees_overview)

            # Sort the DataFrame by totalAllTime in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalAllTime' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

            return df
        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_fees_overview(self):
        """List all protocols along with summaries of their fees and revenue and dataType history data

        Returns:
            pd.DataFrame: DataFrame with protocol fees information, sorted by totalAllTime in descending order
        """
        return self.get_fees_or_revenue_overview(data_type="fees")

    def get_revenue_overview(self):
        """List all protocols along with summaries of their fees and revenue and dataType history data

        Returns:
            pd.DataFrame: DataFrame with protocol revenue information, sorted by totalAllTime in descending order
        """
        return self.get_fees_or_revenue_overview(data_type="revenue")

    def get_total_crypto_fees_or_revenue(self, data_type="dailyFees"):
        """List all protocols along with summaries of their fees and revenue and dataType history data

        Args:
            data_type (str): Data type to return. Options: 'totalFees', 'dailyFees',
                           'totalRevenue', 'dailyRevenue'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and fees/revenue as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/fees"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_fees = pd.DataFrame(
                    data["totalDataChart"], columns=["timestamp", "total_crypto_fees"]
                )
                total_fees["timestamp"] = pd.to_datetime(
                    total_fees["timestamp"], unit="s"
                )
                total_fees.set_index("timestamp", inplace=True)
                df_pivoted = total_fees

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    fees = entry[1]

                    for protocol, fee in fees.items():
                        all_data.append(
                            {"timestamp": timestamp, "protocol": protocol, "fee": fee}
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(index="timestamp", columns="protocol", values="fee")

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_total_crypto_fees(self, daily=True):
        """Get total crypto fees data

        Args:
            daily (bool): If True, returns daily fees, otherwise returns total fees

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and fees as values
        """
        data_type = "dailyFees" if daily else "totalFees"
        return self.get_total_crypto_fees_or_revenue(data_type)

    def get_total_crypto_revenue(self, daily=True):
        """Get total crypto revenue data

        Args:
            daily (bool): If True, returns daily revenue, otherwise returns total revenue

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and revenue as values
        """
        data_type = "dailyRevenue" if daily else "totalRevenue"
        return self.get_total_crypto_fees_or_revenue(data_type)

    def get_chain_fees_or_revenue_overview(self, chain, data_type="dailyFees"):
        """List all protocols along with summaries of their fees and revenue for a specific chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response
            data_type (str): Data type to return. Options: 'totalFees', 'dailyFees',
                           'totalRevenue', 'dailyRevenue'

        Returns:
            pd.DataFrame: DataFrame with protocol information, sorted by totalFees in descending order
        """
        params = {
            "excludeTotalDataChart": "True",
            "excludeTotalDataChartBreakdown": "True",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/fees/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            fees_overview = data["protocols"]
            df = pd.DataFrame(fees_overview)

            # Sort the DataFrame by totalFees in descending order
            df = df.sort_values(by="totalAllTime", ascending=False)

            # Reorder columns to make 'name' and 'totalFees' the first two columns
            columns = ["name", "totalAllTime"] + [
                col for col in df.columns if col not in ["name", "totalAllTime"]
            ]
            df = df[columns]

        return df

    def get_chain_fees_overview(self, chain):
        """Get fees overview data for a specific blockchain chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response

        Returns:
            pd.DataFrame: DataFrame containing fees overview data for the specified chain, with columns:
                - name: Protocol name
                - totalAllTime: Total fees collected by protocol
                - And additional protocol-specific metrics

        Example:
            >>> client = defi_llama()
            >>> # Get fees overview for Ethereum chain
            >>> eth_fees = client.get_chain_fees_overview('ethereum')
            >>> # View top protocols by total fees
            >>> top_protocols = eth_fees.head()
        """
        return self.get_chain_fees_or_revenue_overview(chain, data_type="dailyFees")

    def get_chain_revenue_overview(self, chain):
        """Get revenue overview data for a specific blockchain chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response

        Returns:
            pd.DataFrame: DataFrame containing revenue overview data for the specified chain, with columns:
                - name: Protocol name
                - totalAllTime: Total revenue collected by protocol
                - And additional protocol-specific metrics

        Example:
            >>> client = defi_llama()
            >>> # Get revenue overview for Ethereum chain
            >>> eth_revenue = client.get_chain_revenue_overview('ethereum')
            >>> # View top protocols by total revenue
            >>> top_protocols = eth_revenue.head()
        """
        return self.get_chain_fees_or_revenue_overview(chain, data_type="dailyRevenue")

    def get_chain_fees_or_revenue(self, chain, data_type="dailyFees"):
        """Get historical fees or revenue data for a specific chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response
            data_type (str): Data type to return. Options: 'totalFees', 'dailyFees',
                           'totalRevenue', 'dailyRevenue'

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and fees/revenue as values
        """
        params = {
            "excludeTotalDataChart": "false",  # Always include totalDataChart
            "excludeTotalDataChartBreakdown": "false",
            "dataType": data_type,
        }

        endpoint = f"{self.base_url}/overview/fees/{chain}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()
            df_pivoted = pd.DataFrame()

            # Add totalDataChart as the first column after the index
            if "totalDataChart" in data:
                total_data = pd.DataFrame(
                    data["totalDataChart"],
                    columns=["timestamp", f"{chain}_total_{data_type.lower()}"],
                )
                total_data["timestamp"] = pd.to_datetime(
                    total_data["timestamp"], unit="s"
                )
                total_data.set_index("timestamp", inplace=True)
                df_pivoted = total_data

            if "totalDataChartBreakdown" in data:
                # Create a list to store all data points
                all_data = []

                for entry in data["totalDataChartBreakdown"]:
                    timestamp = pd.to_datetime(entry[0], unit="s")
                    values = entry[1]

                    for protocol, value in values.items():
                        all_data.append(
                            {
                                "timestamp": timestamp,
                                "protocol": protocol,
                                "value": value,
                            }
                        )

                # Create DataFrame from all data points
                df = pd.DataFrame(all_data)

                # Pivot the DataFrame to have protocols as columns
                df_temp = df.pivot(
                    index="timestamp", columns="protocol", values="value"
                )

                # Concatenate with the existing DataFrame
                df_pivoted = pd.concat([df_pivoted, df_temp], axis=1)

                # Sort the index (timestamps) in ascending order
                df_pivoted.sort_index(inplace=True)

            return df_pivoted

        else:
            return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_chain_fees(self, chain, daily=True):
        """Get fees data for a specific chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response
            daily (bool): If True, returns daily fees, otherwise returns total fees

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and fees as values
        """
        data_type = "dailyFees" if daily else "totalFees"
        return self.get_chain_fees_or_revenue(chain, data_type)

    def get_chain_revenue(self, chain, daily=True):
        """Get revenue data for a specific chain

        Args:
            chain (str): Chain name, must be from supported chains list in /overview/fees response
            daily (bool): If True, returns daily revenue, otherwise returns total revenue

        Returns:
            pd.DataFrame: DataFrame with timestamps as index, protocols as columns, and revenue as values
        """
        data_type = "dailyRevenue" if daily else "totalRevenue"
        return self.get_chain_fees_or_revenue(chain, data_type)

    def get_protocol_fees_and_revenue_overview(self, protocol, data_type="dailyFees"):
        """Get summary of protocol fees or revenue with historical data

        Args:
            protocol (str): Protocol slug
            data_type (str): Data type to return. Options: 'totalFees', 'dailyFees',
                           'totalRevenue', 'dailyRevenue'

        Returns:
            pd.DataFrame: DataFrame containing options summary information
        """
        params = {"dataType": data_type}

        endpoint = f"{self.base_url}/summary/fees/{protocol}"
        response = requests.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Create a DataFrame from the dictionary
            df = pd.DataFrame([data])

            # Convert nested dictionaries to separate columns
            for column in df.columns:
                if isinstance(df[column].iloc[0], dict):
                    nested_df = pd.json_normalize(df[column])
                    df = pd.concat([df.drop(column, axis=1), nested_df], axis=1)

            # Drop 'totalDataChart' and 'totalDataChartBreakdown' columns if they exist
            df = df.drop(
                ["totalDataChart", "totalDataChartBreakdown"], axis=1, errors="ignore"
            )

            return df

        return pd.DataFrame()  # Return empty DataFrame on request failure

    def get_protocol_fees_and_revenue(self, protocol):
        """Get summary of protocol fees and revenue with historical data and cumulative calculations

        Args:
            protocol (str): Protocol slug

        Returns:
            pd.DataFrame: DataFrame of historical data with daily and cumulative fees and revenue
        """

        def fetch_data(data_type):
            params = {
                "excludeTotalDataChart": "false",
                "excludeTotalDataChartBreakdown": "false",
                "dataType": data_type,
            }

            endpoint = f"{self.base_url}/summary/fees/{protocol}"
            response = requests.get(endpoint, params=params)

            if response.status_code == 200:
                return response.json()
            return None

        fees_data = fetch_data("dailyFees")
        revenue_data = fetch_data("dailyRevenue")

        if fees_data is None or revenue_data is None:
            return pd.DataFrame()  # Return empty DataFrame if either request fails

        def process_data(data, column_prefix):
            df = pd.DataFrame(
                data["totalDataChart"], columns=["timestamp", f"{column_prefix}_daily"]
            )
            df["timestamp"] = pd.to_datetime(df["timestamp"], unit="s")
            df.set_index("timestamp", inplace=True)
            df[f"{column_prefix}_cumulative"] = df[f"{column_prefix}_daily"].cumsum()
            return df

        fees_df = process_data(fees_data, "fees")
        revenue_df = process_data(revenue_data, "revenue")

        # Merge fees and revenue data
        df = pd.concat([fees_df, revenue_df], axis=1)

        # Sort by timestamp
        df.sort_index(inplace=True)

        return df

    def get_protocol_fdv(self, protocol):

        cmc_id = self.get_protocol_tvl(protocol)["meta"]["cmcId"]

        cmc_api_key = "1dc4b946-d450-4bc9-8fae-e0a726a7ba1c"

        url = "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest"
        parameters = {"id": cmc_id, "convert": "USD"}
        headers = {"Accepts": "application/json", "X-CMC_PRO_API_KEY": cmc_api_key}

        response = requests.get(url, headers=headers, params=parameters)
        data = response.json()
        fdv = data["data"]["20734"]["quote"]["USD"]["fully_diluted_market_cap"]
        return fdv

    ###########
    # Utility #--------------------------------------------------------------------
    ###########

    def export_dict_to_excel(
        self, data_dict: dict, output_folder: str, file_name: str, start_row: int = 0
    ) -> None:
        """
        Export a dictionary containing mixed data types (DataFrames and single values) to Excel.

        Parameters:
        -----------
        data_dict : dict
            Dictionary containing DataFrames and/or single values
        output_folder : str
            Path to the folder where the Excel file will be saved.
        file_name : str
            Name of the Excel file to be created (without .xlsx extension).
        start_row : int, optional
            Starting row for the first sheet (default: 0)

        Returns:
        --------
        None
        """
        # Ensure the output folder exists
        os.makedirs(output_folder, exist_ok=True)

        # Create the full output path
        output_path = os.path.join(output_folder, f"{file_name}.xlsx")

        # Create Excel writer object
        with pd.ExcelWriter(output_path, engine="xlsxwriter") as writer:
            # Get the workbook and create a bold format
            workbook = writer.book
            bold_format = workbook.add_format({"bold": True})

            # Create a sheet for the main data
            sheet_name = "Data"

            # Check if data_dict is a DataFrame
            if isinstance(data_dict, pd.DataFrame):
                # Remove hyperlinks from the DataFrame
                for col in data_dict.select_dtypes(include=["object"]):
                    data_dict[col] = data_dict[col].astype(str)

                # Write the DataFrame directly to Excel
                data_dict.to_excel(
                    writer, sheet_name=sheet_name, startrow=start_row, index=True
                )

                # Set column widths
                worksheet = writer.sheets[sheet_name]
                for idx, col in enumerate(data_dict.columns):
                    max_len = max(data_dict[col].astype(str).map(len).max(), len(col))
                    worksheet.set_column(
                        idx + 1, idx + 1, max_len + 2
                    )  # +2 for some padding

                # Set index column width
                max_index_len = max(len(str(idx)) for idx in data_dict.index)
                worksheet.set_column(0, 0, max_index_len + 2)  # +2 for some padding
            else:
                # If it's not a DataFrame, use the original logic for mixed data types
                current_row = start_row
                max_col = 0

                # Initialize an empty list for single values
                single_values = []

                # Process each item in the dictionary
                for key, value in data_dict.items():
                    if isinstance(value, pd.DataFrame):
                        # Remove hyperlinks from the DataFrame
                        for col in value.select_dtypes(include=["object"]):
                            value[col] = value[col].astype(str)

                        # Handle DataFrames
                        # Write the key as a header
                        pd.DataFrame({"": [key]}).to_excel(
                            writer,
                            sheet_name=sheet_name,
                            startrow=current_row,
                            startcol=0,
                            header=False,
                            index=False,
                        )
                        current_row += 1

                        # Write the DataFrame
                        value.to_excel(
                            writer,
                            sheet_name=sheet_name,
                            startrow=current_row,
                            startcol=0,
                            index=True,
                        )
                        current_row += len(value) + 3  # Add space after DataFrame
                        max_col = max(max_col, len(value.columns) + 1)  # +1 for index

                    else:
                        # Collect single values
                        single_values.append(
                            {
                                "Key": key,
                                "Value": (
                                    str(value)
                                    if not isinstance(value, (int, float))
                                    else value
                                ),
                            }
                        )

                # Write single values if any exist
                if single_values:
                    single_values_df = pd.DataFrame(single_values)
                    pd.DataFrame({"": ["Single Values"]}).to_excel(
                        writer,
                        sheet_name=sheet_name,
                        startrow=start_row,
                        startcol=max_col + 1,
                        header=False,
                        index=False,
                    )
                    single_values_df.to_excel(
                        writer,
                        sheet_name=sheet_name,
                        startrow=start_row + 1,
                        startcol=max_col + 1,
                        index=False,
                    )

                # Set column widths
                worksheet = writer.sheets[sheet_name]
                for col in range(worksheet.dim_colmax + 1):
                    worksheet.set_column(col, col, 15)  # Set a default width of 15

        print(f"Excel file exported to: {os.path.abspath(output_path)}")
        print(f"File name: {os.path.basename(output_path)}")

    def name_to_slug(self, df_to_convert, exclude_cols=None):
        """Convert protocol names to slugs in a DataFrame using mapping from get_all_protocols()

        Args:
            df_to_convert (pd.DataFrame): DataFrame containing protocol names to convert
            exclude_cols (list, optional): List of column names to exclude from conversion

        Returns:
            pd.DataFrame: DataFrame with protocol names converted to slugs
        """
        # Get mapping DataFrame from get_all_protocols()
        df_mapping = self.get_all_protocols()

        # Create mapping from name to slug
        name_to_slug = dict(zip(df_mapping["name"], df_mapping["slug"]))

        # Get list of columns to convert
        cols_to_convert = df_to_convert.columns
        if exclude_cols:
            cols_to_convert = [
                col for col in cols_to_convert if col not in exclude_cols
            ]

        # Create mapping of old column names to new ones
        rename_map = {col: name_to_slug.get(col, col) for col in cols_to_convert}

        # Add back excluded columns unchanged
        if exclude_cols:
            for col in exclude_cols:
                rename_map[col] = col

        # Rename columns and return
        return df_to_convert.rename(columns=rename_map)


# %% LOAD CLASS
# dl = DefiLlama()

# dl.print_all_functions()

# df = dl.get_all_protocols()
# df = dl.get_protocol_tvl('aave') #aerodrome, aave
# df = dl.get_total_crypto_tvl()
# df = dl.get_chain_historical_tvl('solana')
# df = dl.get_all_chains_tvl()

# print(type(df))
# print(df.head())
# da.plot(df)

# df = dl.get_price_chart(coins = 'coingecko:ethereum', start = '2024-01-01', period = '1d')
# df = dl.get_earliest_price(coins='coingecko:ethereum')

# df = dl.get_stablecoin_circulating_supply()
# df = dl.get_stablecoin_charts_all()
# df = dl.get_stablecoin_charts_chain('solana')
# df = dl.get_stablecoin_asset(1)
# df = dl.get_stablecoin_chains()
# df = dl.get_stablecoin_prices()

# df = dl.get_pools(tvl_filter=1000000)
# df = dl.get_pool_chart('747c1d2a-c668-4682-b9f9-296708a3dd90')

# df = dl.get_dexs_overview()
# df = dl.get_total_dex_volume()
# df = dl.get_chain_dexs_overview('solana')
# df = dl.get_chain_dex_volume('op-mainnet')
# df = dl.get_dex_summary('uniswap')
# df = dl.get_dex_volume('uniswap')
# ----
# df = dl.get_derivatives_overview()
# df = dl.get_total_derivative_volume()
# df = dl.get_chain_derivatives_overview('base')
# df = dl.get_chain_derivative_volume('base')
# df = dl.get_derivative_summary('hyperliquid')
# df = dl.get_derivative_volume('hyperliquid')
# ----
# df = dl.get_options_overview()
# df = dl.get_total_options_volume()
# df = dl.get_chain_options_overview('solana')
# df = dl.get_chain_options_volume('solana')
# df = dl.get_options_summary('aevo')
# df = dl.get_options_volume('aevo')

# df = dl.get_fees_overview()
# df = dl.get_revenue_overview()
# df = dl.get_total_crypto_fees()
# df = dl.get_total_crypto_revenue()
# df = dl.get_chain_fees_overview('ethereum')
# df = dl.get_chain_revenue_overview('ethereum')
# df = dl.get_chain_fees('ethereum')
# df = dl.get_chain_revenue('ethereum')
# df = dl.get_protocol_fees_and_revenue_overview('aave')
# df = dl.get_protocol_fees_and_revenue('aave')


# current_dir = os.path.dirname(os.path.abspath(__file__))
# parent_dir = os.path.dirname(current_dir)
# master_dir = os.path.dirname(parent_dir)
# output_dir = os.path.join(master_dir, "outputs")
# sys.path.append(parent_dir)
# dl.export_dict_to_excel(df, output_dir, 'xxxxxxxxxxxxxxxxxx')


# Convenience function for easier import
def defi_llama():
    """
    Convenience function to create and return a DefiLlama instance.

    Returns:
        DefiLlama: An instance of the DefiLlama class
    """
    return DefiLlama()
