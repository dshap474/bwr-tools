"""
Configuration settings for DeFi Llama module
"""
import os
from typing import Optional


class Config:
    """Configuration class for DeFi Llama API settings"""
    
    # API Base URLs
    DEFI_LLAMA_BASE_URL = os.environ.get("DEFI_LLAMA_BASE_URL", "https://api.llama.fi")
    COINS_BASE_URL = os.environ.get("DEFI_LLAMA_COINS_URL", "https://coins.llama.fi")
    STABLECOINS_BASE_URL = os.environ.get("DEFI_LLAMA_STABLECOINS_URL", "https://stablecoins.llama.fi")
    YIELDS_BASE_URL = os.environ.get("DEFI_LLAMA_YIELDS_URL", "https://yields.llama.fi")
    
    # Request Settings
    REQUEST_TIMEOUT = int(os.environ.get("DEFI_LLAMA_REQUEST_TIMEOUT", "30"))  # seconds
    MAX_RETRIES = int(os.environ.get("DEFI_LLAMA_MAX_RETRIES", "3"))
    RETRY_DELAY = float(os.environ.get("DEFI_LLAMA_RETRY_DELAY", "1.0"))  # seconds
    
    # Rate Limiting
    RATE_LIMIT_ENABLED = os.environ.get("DEFI_LLAMA_RATE_LIMIT_ENABLED", "True").lower() == "true"
    REQUESTS_PER_MINUTE = int(os.environ.get("DEFI_LLAMA_REQUESTS_PER_MINUTE", "300"))
    
    # Caching
    CACHE_ENABLED = os.environ.get("DEFI_LLAMA_CACHE_ENABLED", "False").lower() == "true"
    CACHE_TTL = int(os.environ.get("DEFI_LLAMA_CACHE_TTL", "300"))  # seconds
    
    # CMC API Key (for FDV data)
    CMC_API_KEY = os.environ.get("CMC_API_KEY", "1dc4b946-d450-4bc9-8fae-e0a726a7ba1c")
    
    # Data Processing
    DEFAULT_TVL_FILTER = int(os.environ.get("DEFI_LLAMA_DEFAULT_TVL_FILTER", "1000000"))  # $1M
    
    # Logging
    LOG_LEVEL = os.environ.get("DEFI_LLAMA_LOG_LEVEL", "INFO")
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    
    @classmethod
    def get_api_key(cls, key_name: str) -> Optional[str]:
        """Get API key from environment variables
        
        Args:
            key_name: Name of the API key to retrieve
            
        Returns:
            API key value or None if not found
        """
        return os.environ.get(key_name)
    
    @classmethod
    def update_from_env(cls):
        """Update configuration from environment variables"""
        for attr in dir(cls):
            if attr.isupper() and not attr.startswith("_"):
                env_key = f"DEFI_LLAMA_{attr}"
                if env_key in os.environ:
                    setattr(cls, attr, os.environ[env_key])