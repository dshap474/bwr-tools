"""
Tests for TVL-related methods in DeFi Llama module
"""
import pytest
import pandas as pd
from unittest.mock import patch


class TestTVLMethods:
    """Test class for TVL-related API methods"""
    
    def test_get_all_protocols(self, defi_llama_client, mock_response, sample_protocols_data):
        """Test get_all_protocols method"""
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_protocols_data)
            
            result = defi_llama_client.get_all_protocols()
            
            # Verify the request was made correctly
            mock_get.assert_called_once_with(
                "https://api.llama.fi/protocols"
            )
            
            # Verify the result is a DataFrame
            assert isinstance(result, pd.DataFrame)
            
            # Verify the DataFrame has expected columns
            expected_columns = ["name", "slug", "tvl", "mcap", "market_share"]
            assert all(col in result.columns for col in expected_columns)
            
            # Verify the data is sorted by TVL
            assert result["tvl"].is_monotonic_decreasing
            
            # Verify market share calculation
            total_tvl = result["tvl"].sum()
            expected_market_share = (result["tvl"] / total_tvl) * 100
            pd.testing.assert_series_equal(
                result["market_share"], 
                expected_market_share,
                check_names=False
            )
    
    def test_get_protocol_tvl(self, defi_llama_client, mock_response, sample_tvl_data):
        """Test get_protocol_tvl method"""
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_tvl_data)
            
            result = defi_llama_client.get_protocol_tvl('aave')
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://api.llama.fi/protocol/aave"
            )
            
            # Verify the result structure
            assert isinstance(result, dict)
            assert "meta" in result
            assert "tvl" in result
            assert "chain_tvl" in result
            
            # Verify TVL DataFrame
            assert isinstance(result["tvl"], pd.DataFrame)
            assert result["tvl"].index.name == "date"
            
            # Verify chain TVL
            assert isinstance(result["chain_tvl"], dict)
            assert "Ethereum" in result["chain_tvl"]
            assert "Polygon" in result["chain_tvl"]
    
    def test_get_protocol_tvl_no_protocol(self, defi_llama_client):
        """Test get_protocol_tvl with no protocol specified"""
        result = defi_llama_client.get_protocol_tvl('')
        assert result == {"error": "Must enter a protocol"}
    
    def test_get_protocol_tvl_error(self, defi_llama_client, mock_response):
        """Test get_protocol_tvl with API error"""
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response({}, status_code=404)
            
            result = defi_llama_client.get_protocol_tvl('invalid-protocol')
            assert result == {"error": "Failed: 404"}
    
    def test_get_all_chains_tvl(self, defi_llama_client, mock_response):
        """Test get_all_chains_tvl method"""
        sample_chains_data = [
            {"name": "Ethereum", "tvl": 100000000000},
            {"name": "BSC", "tvl": 20000000000},
            {"name": "Polygon", "tvl": 5000000000}
        ]
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_chains_data)
            
            result = defi_llama_client.get_all_chains_tvl()
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://api.llama.fi/v2/chains"
            )
            
            # Verify the result
            assert isinstance(result, pd.DataFrame)
            assert "market_share" in result.columns
            assert result["tvl"].is_monotonic_decreasing
            
            # Verify market share calculation
            total_tvl = result["tvl"].sum()
            expected_market_share = (result["tvl"] / total_tvl) * 100
            pd.testing.assert_series_equal(
                result["market_share"], 
                expected_market_share,
                check_names=False
            )
    
    def test_get_chain_historical_tvl(self, defi_llama_client, mock_response):
        """Test get_chain_historical_tvl method"""
        sample_historical_data = [
            {"date": 1640995200, "tvl": 90000000000},
            {"date": 1641081600, "tvl": 95000000000},
            {"date": 1641168000, "tvl": 100000000000}
        ]
        
        with patch('requests.get') as mock_get:
            mock_get.return_value = mock_response(sample_historical_data)
            
            result = defi_llama_client.get_chain_historical_tvl('ethereum')
            
            # Verify the request
            mock_get.assert_called_once_with(
                "https://api.llama.fi/v2/historicalChainTvl/ethereum"
            )
            
            # Verify the result
            assert isinstance(result, pd.DataFrame)
            assert result.index.name == "date"
            assert "tvl" in result.columns
            assert isinstance(result.index, pd.DatetimeIndex)