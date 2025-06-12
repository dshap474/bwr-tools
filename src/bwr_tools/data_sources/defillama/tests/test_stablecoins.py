"""
Tests for stablecoin-related methods in DeFi Llama module
"""
import pytest
import pandas as pd
from unittest.mock import patch


class TestStablecoinMethods:
    """Test class for stablecoin-related API methods"""
    
    def test_get_stablecoin_circulating_supply(self, defi_llama_client, mock_response, sample_stablecoin_data):
        """Test get_stablecoin_circulating_supply method"""
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_stablecoin_data)
            
            result = defi_llama_client.get_stablecoin_circulating_supply()
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://stablecoins.llama.fi/stablecoins",
                params={"includePrices": "false"}
            )
            
            # Verify the result is a DataFrame
            assert isinstance(result, pd.DataFrame)
            
            # Verify expected columns
            expected_columns = ["id", "name", "symbol", "circulating_total", "pegType"]
            assert all(col in result.columns for col in expected_columns)
            
            # Verify chain-specific columns were created
            assert "circulating_ethereum" in result.columns
            assert "circulating_tron" in result.columns
            assert "circulating_solana" in result.columns
            
            # Verify total calculation
            assert result.loc[0, "circulating_total"] == 83000000000
            assert result.loc[1, "circulating_total"] == 32000000000
    
    def test_get_stablecoin_circulating_supply_with_prices(self, defi_llama_client, mock_response):
        """Test get_stablecoin_circulating_supply with prices included"""
        data_with_prices = {
            "peggedAssets": [
                {
                    "id": 1,
                    "name": "Tether",
                    "symbol": "USDT",
                    "pegType": "USD",
                    "price": 0.9998,
                    "circulating": {"total": 83000000000},
                    "chainCirculating": {
                        "Ethereum": {
                            "current": {"peggedUSD": 40000000000}
                        }
                    }
                }
            ]
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(data_with_prices)
            
            result = defi_llama_client.get_stablecoin_circulating_supply(include_prices=True)
            
            # Verify the request included prices parameter
            mock_get.assert_called_once_with(
                "https://stablecoins.llama.fi/stablecoins",
                params={"includePrices": "true"}
            )
            
            # Verify price column exists
            assert "price" in result.columns
            assert result.loc[0, "price"] == 0.9998
    
    def test_get_stablecoin_chains(self, defi_llama_client, mock_response):
        """Test get_stablecoin_chains method"""
        sample_chains_data = [
            {
                "chain": "Ethereum",
                "totalCirculatingUSD": {
                    "peggedUSD": 65000000000,
                    "peggedEUR": 1000000000
                }
            },
            {
                "chain": "Tron",
                "totalCirculatingUSD": {
                    "peggedUSD": 35000000000,
                    "peggedEUR": 500000000
                }
            }
        ]
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_chains_data)
            
            result = defi_llama_client.get_stablecoin_chains()
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://stablecoins.llama.fi/stablecoinchains"
            )
            
            # Verify the result
            assert isinstance(result, pd.DataFrame)
            assert "chain" in result.columns
            assert "peggedUSD" in result.columns
            assert "peggedEUR" in result.columns
            
            # Verify values
            assert result[result["chain"] == "Ethereum"]["peggedUSD"].iloc[0] == 65000000000
            assert result[result["chain"] == "Tron"]["peggedUSD"].iloc[0] == 35000000000
    
    def test_get_stablecoin_asset(self, defi_llama_client, mock_response):
        """Test get_stablecoin_asset method"""
        sample_asset_data = {
            "name": "Tether",
            "symbol": "USDT",
            "chainBalances": {
                "Ethereum": {
                    "tokens": [
                        {
                            "date": 1640995200,
                            "circulating": {"peggedUSD": 38000000000}
                        },
                        {
                            "date": 1641081600,
                            "circulating": {"peggedUSD": 39000000000}
                        }
                    ]
                },
                "Tron": {
                    "tokens": [
                        {
                            "date": 1640995200,
                            "circulating": {"peggedUSD": 33000000000}
                        },
                        {
                            "date": 1641081600,
                            "circulating": {"peggedUSD": 34000000000}
                        }
                    ]
                }
            }
        }
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_asset_data)
            
            result = defi_llama_client.get_stablecoin_asset(1)
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://stablecoins.llama.fi/stablecoin/1"
            )
            
            # Verify the result
            assert isinstance(result, pd.DataFrame)
            assert isinstance(result.index, pd.DatetimeIndex)
            
            # Verify columns
            assert "Ethereum" in result.columns
            assert "Tron" in result.columns
            assert "Tether_total_circulating" in result.columns
            
            # Verify total calculation
            first_row_total = result.iloc[0]["Ethereum"] + result.iloc[0]["Tron"]
            assert result.iloc[0]["Tether_total_circulating"] == first_row_total
    
    def test_get_stablecoin_prices(self, defi_llama_client, mock_response):
        """Test get_stablecoin_prices method"""
        sample_prices_data = [
            {
                "date": 1640995200,
                "prices": {
                    "USDT": 0.9998,
                    "USDC": 1.0001,
                    "DAI": 0.9997
                }
            },
            {
                "date": 1641081600,
                "prices": {
                    "USDT": 0.9999,
                    "USDC": 1.0000,
                    "DAI": 0.9999
                }
            }
        ]
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_prices_data)
            
            result = defi_llama_client.get_stablecoin_prices()
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://stablecoins.llama.fi/stablecoinprices"
            )
            
            # Verify the result
            assert isinstance(result, pd.DataFrame)
            assert isinstance(result.index, pd.DatetimeIndex)
            
            # Verify columns
            assert "USDT" in result.columns
            assert "USDC" in result.columns
            assert "DAI" in result.columns
            
            # Verify values
            assert result.iloc[0]["USDT"] == 0.9998
            assert result.iloc[1]["USDC"] == 1.0000