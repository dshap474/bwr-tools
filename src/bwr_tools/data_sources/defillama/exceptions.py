"""
Custom exceptions for DeFi Llama module
"""


class DefiLlamaError(Exception):
    """Base exception for DeFi Llama API errors"""
    pass


class APIError(DefiLlamaError):
    """Raised when API returns an error response"""
    def __init__(self, message: str, status_code: int = None, response_data: dict = None):
        self.status_code = status_code
        self.response_data = response_data
        super().__init__(message)


class RateLimitError(DefiLlamaError):
    """Raised when API rate limit is exceeded"""
    pass


class DataNotFoundError(DefiLlamaError):
    """Raised when requested data is not found"""
    pass


class InvalidParameterError(DefiLlamaError):
    """Raised when invalid parameters are provided"""
    pass


class NetworkError(DefiLlamaError):
    """Raised when network-related errors occur"""
    pass


class DataProcessingError(DefiLlamaError):
    """Raised when data processing fails"""
    pass