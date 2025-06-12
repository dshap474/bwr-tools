"""
Pydantic models for API requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import Dict, Any, Optional, List, Union
from datetime import datetime
from enum import Enum


class PlotType(str, Enum):
    """Available plot types matching BWRPlots methods"""
    SCATTER = "scatter"
    POINT_SCATTER = "point_scatter"
    LINE = "line"  # Uses scatter with line mode
    BAR = "bar"
    GROUPED_BAR = "grouped_bar"
    STACKED_BAR = "stacked_bar"
    HORIZONTAL_BAR = "horizontal_bar"
    METRIC_SHARE_AREA = "metric_share_area"
    TABLE = "table"
    PLOTLY_TABLE = "plotly_table"


class DataProcessingConfig(BaseModel):
    """Configuration for data processing"""
    # Column operations
    drop_columns: Optional[List[str]] = Field(default_factory=list)
    rename_columns: Optional[Dict[str, str]] = Field(default_factory=dict)
    
    # Pivoting
    pivot_enabled: bool = False
    pivot_index: Optional[str] = None
    pivot_columns: Optional[str] = None
    pivot_values: Optional[str] = None
    pivot_aggfunc: str = "mean"
    
    # Date filtering
    date_column: Optional[str] = None
    lookback_days: Optional[int] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    
    # Resampling
    resample_frequency: Optional[str] = None  # 'D', 'W', 'M', 'Q', 'Y'
    resample_method: str = "mean"
    
    # Smoothing
    smoothing_window: Optional[int] = None
    smoothing_method: str = "rolling_mean"


class PlotConfiguration(BaseModel):
    """Configuration for plot generation"""
    # Basic info
    title: str = ""
    subtitle: str = ""
    source: str = ""
    
    # Column mappings
    x_column: Optional[str] = None
    y_column: Optional[Union[str, List[str]]] = None  # Can be multiple for some plots
    color_column: Optional[str] = None
    size_column: Optional[str] = None
    
    # Axis configuration
    x_axis_title: Optional[str] = None
    y_axis_title: Optional[str] = None
    x_axis_is_date: bool = True
    
    # Y-axis formatting
    y_prefix: str = ""
    y_suffix: str = ""
    
    # Secondary Y-axis (for scatter plots)
    enable_secondary_yaxis: bool = False
    secondary_y_columns: Optional[List[str]] = None
    secondary_y_title: Optional[str] = None
    secondary_y_prefix: str = ""
    secondary_y_suffix: str = ""
    
    # Watermark
    use_watermark: bool = True
    watermark_key: Optional[str] = None
    
    # Plot-specific options
    smoothing_window: Optional[int] = None  # For area plots
    tick_frequency: Optional[int] = None  # For grouped bars
    sort_ascending: Optional[bool] = None  # For horizontal bars
    sort_descending: Optional[bool] = None  # For stacked bars
    
    # Export options
    save_image: bool = False
    open_in_browser: bool = False
    width: Optional[int] = None
    height: Optional[int] = None


class PlotRequest(BaseModel):
    """Request model for plot generation"""
    session_id: str
    plot_type: PlotType
    configuration: PlotConfiguration
    data_processing: Optional[DataProcessingConfig] = None
    
    @validator('session_id')
    def validate_session_id(cls, v):
        if not v or len(v) < 10:
            raise ValueError('Invalid session ID')
        return v


class PlotResponse(BaseModel):
    """Response model for plot generation"""
    success: bool
    plot_json: Optional[Dict[str, Any]] = None
    plot_html: Optional[str] = None
    plot_id: Optional[str] = None
    plot_type: Optional[str] = None
    data_points: Optional[int] = None
    data_columns: Optional[List[str]] = None
    error: Optional[str] = None
    traceback: Optional[str] = None


class SessionInfo(BaseModel):
    """Session information"""
    session_id: str
    created_at: datetime
    updated_at: datetime
    has_data: bool = False
    has_processed_data: bool = False
    data_shape: Optional[List[int]] = None
    data_columns: Optional[List[str]] = None
    plots: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DeFiLlamaRequest(BaseModel):
    """Request model for DeFi Llama API calls"""
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AgentMessage(BaseModel):
    """Message for research agent communication"""
    type: str  # 'user', 'system', 'tool'
    content: str
    metadata: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    """Response from research agent"""
    type: str  # 'thinking', 'tool_call', 'result', 'error'
    content: str
    metadata: Optional[Dict[str, Any]] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None


class PlotTypeInfo(BaseModel):
    """Information about a plot type"""
    type: str
    name: str
    description: str
    bwr_method: str
    required_columns: List[str]
    optional_columns: List[str]
    supports_time_series: bool
    supports_secondary_axis: bool = False
    example_config: Optional[Dict[str, Any]] = None