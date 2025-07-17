from termcolor import colored
import pandas as pd
import requests
from typing import Optional, Dict, Any
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("COINGECKO_API_KEY")


class CoinGeckoAPI:
    """A wrapper for the CoinGecko API.

    This class provides methods to fetch cryptocurrency market data, prices,
    and statistics from the CoinGecko API.

    Attributes:
        api_key (str): The API key for CoinGecko authentication.
        base_url (str): The base URL for the CoinGecko API.
    """

    def __init__(self):
        """Initialize the CoinGecko API wrapper.

        Args:
            api_key (str): The API key for authentication.
        """
        try:
            self.api_key = API_KEY
            self.base_url = "https://api.coingecko.com/api/v3"
            print(colored("CoinGecko API initialized successfully", "green"))
        except Exception as e:
            print(colored(f"Error initializing CoinGecko API: {str(e)}", "red"))
            raise

    def get_categories(self) -> Optional[Dict[str, Any]]:
        """Get list of all cryptocurrency categories.

        Returns:
            Optional[Dict[str, Any]]: List of categories if successful, None otherwise.
        """
        try:
            print(colored("Fetching cryptocurrency categories...", "blue"))
            url = f"{self.base_url}/coins/categories/list"
            headers = {"accept": "application/json", "x-cg-demo-api-key": self.api_key}

            response = requests.get(url, headers=headers)
            response.raise_for_status()

            result = response.json()
            if result:
                print(colored(f"Found {len(result)} categories", "green"))
            return result

        except requests.exceptions.RequestException as e:
            print(colored(f"API request error: {str(e)}", "red"))
            return None
        except Exception as e:
            print(colored(f"Unexpected error: {str(e)}", "red"))
            return None

    def get_historical_chart_data(
        self,
        coin_id: str,
        vs_currency: str = "usd",
        days: str = "max",
        interval: Optional[str] = None,
    ) -> Optional[pd.DataFrame]:
        """Get historical chart data for a specific cryptocurrency.

        Args:
            coin_id (str): The coin ID from CoinGecko (e.g., 'bitcoin').
            vs_currency (str, optional): Target currency for price data. Defaults to "usd".
            days (str, optional): Number of days of data to retrieve. Defaults to "max".
            interval (Optional[str], optional): Data interval. Options: 'daily'. Defaults to None.

        Returns:
            Optional[pd.DataFrame]: DataFrame with historical data if successful, None otherwise.
            Contains columns: price, market_cap, volume with timestamp index.
        """
        try:
            print(colored(f"Fetching historical data for {coin_id}...", "blue"))
            endpoint = f"/coins/{coin_id}/market_chart"

            params = {
                "vs_currency": vs_currency,
                "days": days,
                "interval": interval,
                "x_cg_demo_api_key": self.api_key,
            }

            response = requests.get(f"{self.base_url}{endpoint}", params=params)
            response.raise_for_status()

            data = response.json()

            # Convert to pandas DataFrames for easier handling
            df_prices = pd.DataFrame(data["prices"], columns=["timestamp", "price"])
            df_market_caps = pd.DataFrame(
                data["market_caps"], columns=["timestamp", "market_cap"]
            )
            df_volumes = pd.DataFrame(
                data["total_volumes"], columns=["timestamp", "volume"]
            )

            # Convert timestamps from milliseconds to datetime
            df_prices["timestamp"] = pd.to_datetime(df_prices["timestamp"], unit="ms")
            df_market_caps["timestamp"] = pd.to_datetime(
                df_market_caps["timestamp"], unit="ms"
            )
            df_volumes["timestamp"] = pd.to_datetime(df_volumes["timestamp"], unit="ms")

            # Merge all data into one DataFrame
            df_final = df_prices.merge(
                df_market_caps[["timestamp", "market_cap"]], on="timestamp"
            )
            df_final = df_final.merge(
                df_volumes[["timestamp", "volume"]], on="timestamp"
            )

            # Set timestamp as index
            df_final.set_index("timestamp", inplace=True)

            print(colored("Historical data fetched successfully", "green"))
            print(colored(f"Retrieved {len(df_final)} data points", "cyan"))
            return df_final

        except requests.exceptions.RequestException as e:
            print(colored(f"API request error: {str(e)}", "red"))
            return None
        except Exception as e:
            print(colored(f"Error processing data: {str(e)}", "red"))
            return None


def main():
    """Main function to demonstrate the usage of CoinGecko API."""
    try:
        print(colored("Starting CoinGecko API demo...", "blue"))

        # Initialize API client
        client = CoinGeckoAPI()

        # Get cryptocurrency categories
        categories = client.get_categories()
        if categories:
            print(colored("\nCryptocurrency Categories:", "cyan"))
            print(categories)

        # Get Bitcoin historical data
        btc_data = client.get_historical_chart_data("bitcoin", days="30")
        if btc_data is not None:
            print(colored("\nBitcoin Historical Data:", "cyan"))
            print(btc_data.head())

    except Exception as e:
        print(colored(f"Error in main execution: {str(e)}", "red"))


if __name__ == "__main__":
    main()
