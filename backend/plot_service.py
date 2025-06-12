"""
Plot generation service using BWR Tools
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Union
import json
import uuid
from datetime import datetime

from bwr_tools import BWRPlots
from bwr_tools.config import DEFAULT_BWR_CONFIG
from .models import PlotType, PlotConfiguration, PlotTypeInfo


class PlotService:
    """Service for generating plots using BWR Tools"""
    
    def __init__(self):
        self.bwr_plots = None
        
    def _get_plotter(self, config: PlotConfiguration) -> BWRPlots:
        """Get or create BWRPlots instance with custom config"""
        custom_config = {}
        
        # Handle watermark configuration
        if config.watermark_key:
            custom_config["watermark"] = {
                "selected_watermark_key": config.watermark_key,
                "default_use": config.use_watermark
            }
        elif not config.use_watermark:
            custom_config["watermark"] = {"default_use": False}
        
        # Create new plotter with custom config
        return BWRPlots(config=custom_config)
    
    async def generate_plot(
        self, 
        df: pd.DataFrame, 
        plot_type: PlotType,
        config: PlotConfiguration
    ) -> Dict[str, Any]:
        """Generate a plot based on type and configuration"""
        
        plotter = self._get_plotter(config)
        
        # Prepare data based on plot requirements
        plot_df = self._prepare_data(df, plot_type, config)
        
        # Common plot arguments
        base_args = {
            "data": plot_df,
            "title": config.title,
            "subtitle": config.subtitle,
            "source": config.source,
            "prefix": config.y_prefix,
            "suffix": config.y_suffix,
            "save_image": False,
            "open_in_browser": False
        }
        
        # Add axis titles if specified
        if config.x_axis_title:
            base_args["x_axis_title"] = config.x_axis_title
        if config.y_axis_title:
            base_args["y_axis_title"] = config.y_axis_title
        
        # Generate plot based on type
        fig = None
        
        if plot_type == PlotType.SCATTER:
            fig = await self._generate_scatter_plot(plotter, plot_df, config, base_args)
        elif plot_type == PlotType.POINT_SCATTER:
            fig = await self._generate_point_scatter_plot(plotter, df, config, base_args)
        elif plot_type == PlotType.LINE:
            # Line plot uses scatter plot with line mode
            fig = plotter.scatter_plot(**base_args)
        elif plot_type == PlotType.BAR:
            fig = plotter.bar_chart(**base_args)
        elif plot_type == PlotType.GROUPED_BAR:
            if config.tick_frequency:
                base_args["tick_frequency"] = config.tick_frequency
            fig = plotter.multi_bar(**base_args, xaxis_is_date=config.x_axis_is_date)
        elif plot_type == PlotType.STACKED_BAR:
            if config.sort_descending is not None:
                base_args["sort_descending"] = config.sort_descending
            fig = plotter.stacked_bar_chart(**base_args, xaxis_is_date=config.x_axis_is_date)
        elif plot_type == PlotType.HORIZONTAL_BAR:
            # Horizontal bar has specific requirements
            fig = await self._generate_horizontal_bar(plotter, df, config)
        elif plot_type == PlotType.METRIC_SHARE_AREA:
            if config.smoothing_window:
                base_args["smoothing_window"] = config.smoothing_window
            fig = plotter.metric_share_area_plot(**base_args, xaxis_is_date=config.x_axis_is_date)
        elif plot_type == PlotType.PLOTLY_TABLE:
            fig = plotter.table_plot(**base_args)
        else:
            raise ValueError(f"Unsupported plot type: {plot_type}")
        
        if not fig:
            raise ValueError("Failed to generate plot")
        
        # Generate plot ID
        plot_id = f"plot_{uuid.uuid4().hex[:8]}"
        
        # Convert to JSON
        plot_json = json.loads(fig.to_json())
        
        # Generate HTML
        plot_html = fig.to_html(
            include_plotlyjs="cdn",
            div_id=plot_id,
            config={"displayModeBar": True}
        )
        
        return {
            "success": True,
            "plot_json": plot_json,
            "plot_html": plot_html,
            "plot_id": plot_id,
            "plot_type": plot_type.value,
            "data_points": len(plot_df),
            "data_columns": plot_df.columns.tolist() if hasattr(plot_df, 'columns') else []
        }
    
    def _prepare_data(
        self, 
        df: pd.DataFrame, 
        plot_type: PlotType,
        config: PlotConfiguration
    ) -> Union[pd.DataFrame, pd.Series]:
        """Prepare data for plotting based on plot type"""
        
        # For point scatter, return raw dataframe
        if plot_type == PlotType.POINT_SCATTER:
            return df
        
        # For horizontal bar, prepare specific format
        if plot_type == PlotType.HORIZONTAL_BAR:
            return df
        
        # For most plots, set index and select columns
        if config.x_column and config.x_column in df.columns:
            plot_df = df.set_index(config.x_column)
        else:
            plot_df = df.copy()
        
        # Select Y columns if specified
        if config.y_column:
            if isinstance(config.y_column, list):
                # Multiple Y columns
                y_cols = [col for col in config.y_column if col in plot_df.columns]
                if y_cols:
                    plot_df = plot_df[y_cols]
            elif config.y_column in plot_df.columns:
                # Single Y column
                plot_df = plot_df[[config.y_column]]
        
        # Handle date index
        if config.x_axis_is_date and not isinstance(plot_df.index, pd.DatetimeIndex):
            try:
                plot_df.index = pd.to_datetime(plot_df.index)
                plot_df = plot_df.sort_index()
            except:
                pass  # Keep original if conversion fails
        
        return plot_df
    
    async def _generate_scatter_plot(
        self,
        plotter: BWRPlots,
        plot_df: pd.DataFrame,
        config: PlotConfiguration,
        base_args: Dict[str, Any]
    ):
        """Generate scatter plot with optional secondary Y-axis"""
        
        if config.enable_secondary_yaxis and config.secondary_y_columns:
            # Prepare data for dual Y-axis
            primary_cols = [col for col in plot_df.columns if col not in config.secondary_y_columns]
            secondary_cols = [col for col in config.secondary_y_columns if col in plot_df.columns]
            
            if not secondary_cols:
                # Fall back to regular scatter plot
                return plotter.scatter_plot(**base_args)
            
            # Split data
            primary_df = plot_df[primary_cols] if primary_cols else pd.DataFrame(index=plot_df.index)
            secondary_df = plot_df[secondary_cols]
            
            # Update base args for dual axis
            base_args["data"] = {
                "primary": primary_df,
                "secondary": secondary_df
            }
            
            # Add secondary axis options
            axis_options = {
                "secondary_title": config.secondary_y_title or "",
                "secondary_prefix": config.secondary_y_prefix,
                "secondary_suffix": config.secondary_y_suffix
            }
            base_args["axis_options"] = axis_options
        
        # Add date axis flag
        base_args["xaxis_is_date"] = config.x_axis_is_date
        
        return plotter.scatter_plot(**base_args)
    
    async def _generate_point_scatter_plot(
        self,
        plotter: BWRPlots,
        df: pd.DataFrame,
        config: PlotConfiguration,
        base_args: Dict[str, Any]
    ):
        """Generate point scatter plot"""
        
        # Point scatter requires x and y columns
        if not config.x_column or not config.y_column:
            raise ValueError("Point scatter plot requires x_column and y_column")
        
        # Remove data from base args as we'll pass it differently
        base_args.pop("data")
        
        # Build specific args for point scatter
        plot_args = {
            **base_args,
            "data": df,
            "x_column": config.x_column,
            "y_column": config.y_column if isinstance(config.y_column, str) else config.y_column[0],
            "xaxis_is_date": config.x_axis_is_date
        }
        
        # Add optional columns
        if config.color_column:
            plot_args["color_column"] = config.color_column
        
        return plotter.point_scatter_plot(**plot_args)
    
    async def _generate_horizontal_bar(
        self,
        plotter: BWRPlots,
        df: pd.DataFrame,
        config: PlotConfiguration
    ):
        """Generate horizontal bar chart"""
        
        # Horizontal bar needs specific column mappings
        if not config.x_column or not config.y_column:
            # If not specified, try to infer
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            non_numeric_cols = df.select_dtypes(exclude=[np.number]).columns
            
            if len(numeric_cols) > 0 and len(non_numeric_cols) > 0:
                x_col = numeric_cols[0]
                y_col = non_numeric_cols[0]
            else:
                raise ValueError("Cannot infer columns for horizontal bar chart")
        else:
            x_col = config.x_column
            y_col = config.y_column if isinstance(config.y_column, str) else config.y_column[0]
        
        plot_args = {
            "data": df,
            "y_column": y_col,  # Categories on Y-axis
            "x_column": x_col,  # Values on X-axis
            "title": config.title,
            "subtitle": config.subtitle,
            "source": config.source,
            "save_image": False,
            "open_in_browser": False
        }
        
        if config.sort_ascending is not None:
            plot_args["sort_ascending"] = config.sort_ascending
        
        return plotter.horizontal_bar(**plot_args)
    
    def get_available_plot_types(self) -> List[PlotTypeInfo]:
        """Get information about available plot types"""
        
        plot_types = [
            PlotTypeInfo(
                type=PlotType.LINE.value,
                name="Line Chart",
                description="Shows trends over time with connected points",
                bwr_method="scatter_plot",
                required_columns=["x", "y"],
                optional_columns=["color"],
                supports_time_series=True,
                example_config={
                    "x_column": "date",
                    "y_column": "value",
                    "x_axis_is_date": True
                }
            ),
            PlotTypeInfo(
                type=PlotType.SCATTER.value,
                name="Scatter Plot",
                description="Shows relationships between variables",
                bwr_method="scatter_plot",
                required_columns=["x", "y"],
                optional_columns=["color", "secondary_y"],
                supports_time_series=True,
                supports_secondary_axis=True,
                example_config={
                    "x_column": "date",
                    "y_column": ["series1", "series2"],
                    "enable_secondary_yaxis": True,
                    "secondary_y_columns": ["series2"]
                }
            ),
            PlotTypeInfo(
                type=PlotType.POINT_SCATTER.value,
                name="Point Scatter Plot",
                description="Scatter plot without connecting lines",
                bwr_method="point_scatter_plot",
                required_columns=["x", "y"],
                optional_columns=["color"],
                supports_time_series=True,
                example_config={
                    "x_column": "x_values",
                    "y_column": "y_values",
                    "color_column": "category"
                }
            ),
            PlotTypeInfo(
                type=PlotType.BAR.value,
                name="Bar Chart",
                description="Compares values across categories",
                bwr_method="bar_chart",
                required_columns=["category", "value"],
                optional_columns=[],
                supports_time_series=False,
                example_config={
                    "x_column": "category",
                    "y_column": "value"
                }
            ),
            PlotTypeInfo(
                type=PlotType.GROUPED_BAR.value,
                name="Grouped Bar Chart",
                description="Compares multiple series across categories",
                bwr_method="multi_bar",
                required_columns=["x", "y"],
                optional_columns=["tick_frequency"],
                supports_time_series=True,
                example_config={
                    "x_column": "month",
                    "y_column": ["sales", "costs", "profit"],
                    "tick_frequency": 2
                }
            ),
            PlotTypeInfo(
                type=PlotType.STACKED_BAR.value,
                name="Stacked Bar Chart",
                description="Shows composition of total across categories",
                bwr_method="stacked_bar_chart",
                required_columns=["x", "y"],
                optional_columns=["sort_descending"],
                supports_time_series=True,
                example_config={
                    "x_column": "quarter",
                    "y_column": ["product_a", "product_b", "product_c"],
                    "sort_descending": True
                }
            ),
            PlotTypeInfo(
                type=PlotType.HORIZONTAL_BAR.value,
                name="Horizontal Bar Chart",
                description="Bar chart with horizontal orientation",
                bwr_method="horizontal_bar",
                required_columns=["category", "value"],
                optional_columns=["sort_ascending"],
                supports_time_series=False,
                example_config={
                    "y_column": "country",
                    "x_column": "gdp",
                    "sort_ascending": False
                }
            ),
            PlotTypeInfo(
                type=PlotType.METRIC_SHARE_AREA.value,
                name="Metric Share Area Chart",
                description="Shows percentage composition over time",
                bwr_method="metric_share_area_plot",
                required_columns=["x", "y"],
                optional_columns=["smoothing_window"],
                supports_time_series=True,
                example_config={
                    "x_column": "date",
                    "y_column": ["metric1", "metric2", "metric3"],
                    "smoothing_window": 7
                }
            ),
            PlotTypeInfo(
                type=PlotType.PLOTLY_TABLE.value,
                name="Plotly Table",
                description="Static table visualization",
                bwr_method="table_plot",
                required_columns=[],
                optional_columns=[],
                supports_time_series=False,
                example_config={}
            )
        ]
        
        return [info.dict() for info in plot_types]