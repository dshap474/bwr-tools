"""
Test fixtures for DeFi Llama module tests
"""
import pytest
from unittest.mock import Mock
from bwr_tools.data_sources.defillama import DefiLlama


@pytest.fixture
def defi_llama_client():
    """Create a DeFi Llama client instance"""
    return DefiLlama()


@pytest.fixture
def mock_response():
    """Create a mock response object"""
    def _mock_response(json_data, status_code=200):
        mock = Mock()
        mock.status_code = status_code
        mock.json.return_value = json_data
        return mock
    return _mock_response


@pytest.fixture
def sample_protocols_data():
    """Sample data for get_all_protocols response"""
    return [
        {
            "name": "Aave",
            "slug": "aave",
            "tvl": 10000000000,
            "mcap": 2000000000,
            "change_1h": 0.5,
            "change_1d": 1.2,
            "change_7d": -2.3
        },
        {
            "name": "Uniswap",
            "slug": "uniswap",
            "tvl": 5000000000,
            "mcap": 7000000000,
            "change_1h": -0.3,
            "change_1d": 0.8,
            "change_7d": 5.1
        }
    ]


@pytest.fixture
def sample_tvl_data():
    """Sample TVL historical data"""
    return {
        "name": "Aave",
        "symbol": "AAVE",
        "tvl": [
            {"date": 1640995200, "tvl": 9000000000},
            {"date": 1641081600, "tvl": 9500000000},
            {"date": 1641168000, "tvl": 10000000000}
        ],
        "chainTvls": {
            "Ethereum": [
                {"date": 1640995200, "tvl": 7000000000},
                {"date": 1641081600, "tvl": 7300000000},
                {"date": 1641168000, "tvl": 7500000000}
            ],
            "Polygon": [
                {"date": 1640995200, "tvl": 2000000000},
                {"date": 1641081600, "tvl": 2200000000},
                {"date": 1641168000, "tvl": 2500000000}
            ]
        }
    }


@pytest.fixture
def sample_stablecoin_data():
    """Sample stablecoin data"""
    return {
        "peggedAssets": [
            {
                "id": 1,
                "name": "Tether",
                "symbol": "USDT",
                "pegType": "USD",
                "circulating": {"total": 83000000000},
                "chainCirculating": {
                    "Ethereum": {
                        "current": {"peggedUSD": 40000000000}
                    },
                    "Tron": {
                        "current": {"peggedUSD": 35000000000}
                    }
                }
            },
            {
                "id": 2,
                "name": "USD Coin",
                "symbol": "USDC",
                "pegType": "USD",
                "circulating": {"total": 32000000000},
                "chainCirculating": {
                    "Ethereum": {
                        "current": {"peggedUSD": 25000000000}
                    },
                    "Solana": {
                        "current": {"peggedUSD": 7000000000}
                    }
                }
            }
        ]
    }


@pytest.fixture
def mock_data_dir(tmp_path):
    """Create a temporary data directory for test outputs"""
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    return data_dir