import pandas as pd
import plotly.graph_objects as go
import numpy as np
from typing import Dict, List, Optional, Union, Tuple, Any


def _add_point_scatter_traces(
    fig: go.Figure,
    data: pd.DataFrame,
    x_col: str,
    y_col: str,
    cfg_plot: Dict,  # Specific config for point_scatter
    cfg_colors: Dict,  # General color config for palette
    color_col: Optional[str] = None,
    symbol_col: Optional[str] = None,
    name_col: Optional[str] = None,
    marker_size_val_or_col: Optional[Union[int, str]] = None,
    custom_colors_map: Optional[Dict[Any, str]] = None,
    custom_symbols_map: Optional[Dict[Any, str]] = None,
    show_legend_for_main_traces: bool = True,  # To control legend for primary data groups
    show_text_on_points: bool = False,  # NEW PARAMETER
    text_data_column: Optional[str] = None,  # NEW PARAMETER
    text_pos: str = "top center",  # NEW PARAMETER
) -> None:
    """
    Adds point scatter traces to the provided figure with support for color and symbol grouping.

    Args:
        fig: The plotly figure object to add traces to
        data: DataFrame with data to plot (already scaled if needed)
        x_col: Column name for X-axis values
        y_col: Column name for Y-axis values
        cfg_plot: Plot-specific configuration for point_scatter
        cfg_colors: Color configuration
        color_col: Optional column name for color grouping
        symbol_col: Optional column name for symbol grouping
        name_col: Optional column name for hover text
        marker_size_val_or_col: Optional marker size (int) or column name (str)
        custom_colors_map: Optional custom color mapping for color_col values
        custom_symbols_map: Optional custom symbol mapping for symbol_col values
        show_legend_for_main_traces: Whether to show legend for main data groups
        show_text_on_points: Whether to display text labels on points
        text_data_column: Column name for point text labels (required if show_text_on_points=True)
        text_pos: Position of text labels relative to points
    """
    if data is None or data.empty:
        print("Warning: No data provided for point scatter plot.")
        return

    # Validate required columns exist
    if x_col not in data.columns:
        print(f"Warning: X column '{x_col}' not found in data.")
        return
    if y_col not in data.columns:
        print(f"Warning: Y column '{y_col}' not found in data.")
        return

    # Initialize color and symbol palettes
    color_palette = iter(cfg_colors.get("default_palette", ["#5637cd"]))
    symbol_palette = iter(cfg_plot.get("default_symbol_palette", ["circle"]))

    # Initialize mapping dictionaries
    point_colors_map = {}
    point_symbols_map = {}

    # Build color mapping if color_col is provided
    if color_col and color_col in data.columns:
        unique_colors = data[color_col].dropna().unique()
        for value in unique_colors:
            if custom_colors_map and value in custom_colors_map:
                point_colors_map[value] = custom_colors_map[value]
            else:
                try:
                    point_colors_map[value] = next(color_palette)
                except StopIteration:
                    # If we run out of colors, cycle back to the first one
                    color_palette = iter(cfg_colors.get("default_palette", ["#5637cd"]))
                    point_colors_map[value] = next(color_palette)

    # Build symbol mapping if symbol_col is provided
    if symbol_col and symbol_col in data.columns:
        unique_symbols = data[symbol_col].dropna().unique()
        for value in unique_symbols:
            if custom_symbols_map and value in custom_symbols_map:
                point_symbols_map[value] = custom_symbols_map[value]
            else:
                try:
                    point_symbols_map[value] = next(symbol_palette)
                except StopIteration:
                    # If we run out of symbols, cycle back to the first one
                    symbol_palette = iter(
                        cfg_plot.get("default_symbol_palette", ["circle"])
                    )
                    point_symbols_map[value] = next(symbol_palette)

    # Generate arrays for each data point
    colors_array = None
    if color_col and color_col in data.columns:
        colors_array = data[color_col].map(point_colors_map)
    else:
        colors_array = cfg_colors.get("default_palette", ["#5637cd"])[0]

    symbols_array = None
    if symbol_col and symbol_col in data.columns:
        symbols_array = data[symbol_col].map(point_symbols_map)
    else:
        symbols_array = cfg_plot.get("default_marker_symbol", "circle")

    # Handle marker size
    size_array_or_value = cfg_plot.get("default_marker_size", 12)
    if marker_size_val_or_col is not None:
        if isinstance(marker_size_val_or_col, (int, float)):
            size_array_or_value = marker_size_val_or_col
        elif (
            isinstance(marker_size_val_or_col, str)
            and marker_size_val_or_col in data.columns
        ):
            size_array_or_value = data[marker_size_val_or_col]

    # Generate hover text array
    hover_text_array = None
    if name_col and name_col in data.columns:
        hover_text_array = data[name_col]

    # Handle text display on points
    trace_mode = "markers"
    text_values_for_trace = None

    if show_text_on_points and text_data_column and text_data_column in data.columns:
        trace_mode = "markers+text"
        text_values_for_trace = data[text_data_column]
    elif show_text_on_points and text_data_column:  # Column specified but not found
        print(
            f"Warning: text_column '{text_data_column}' not found in data. Text will not be displayed."
        )

    # Add the main scatter trace
    fig.add_trace(
        go.Scatter(
            x=data[x_col],
            y=data[y_col],
            mode=trace_mode,  # MODIFIED
            text=text_values_for_trace,  # NEW
            textposition=text_pos,  # NEW
            textfont=dict(  # Optional: Configure text font, can be from cfg_plot
                size=cfg_plot.get("point_text_size", 10),
                color=cfg_plot.get(
                    "point_text_color",
                    cfg_colors.get("default_palette", ["#ededed"])[0],
                ),
            ),
            marker=dict(
                color=colors_array,
                symbol=symbols_array,
                size=size_array_or_value,
                opacity=cfg_plot.get("default_marker_opacity", 0.8),
                line=dict(width=0),  # No outline by default
            ),
            hovertext=hover_text_array if hover_text_array is not None else None,
            hoverinfo="text" if hover_text_array is not None else "x+y",
            name="Data Points",  # Generic name, legend built separately
            showlegend=False,  # Main data trace doesn't need a legend entry
        )
    )

    # Generate legend traces for color grouping
    if color_col and point_colors_map and show_legend_for_main_traces:
        for category, color in point_colors_map.items():
            fig.add_trace(
                go.Scatter(
                    x=[None],
                    y=[None],
                    mode="markers",
                    marker=dict(
                        color=color,
                        symbol=cfg_plot.get("default_marker_symbol", "circle"),
                        size=12,
                        opacity=cfg_plot.get("default_marker_opacity", 0.8),
                    ),
                    name=str(category),
                    showlegend=True,
                    legendgroup="colors",
                )
            )

    # Generate legend traces for symbol grouping
    if symbol_col and point_symbols_map and show_legend_for_main_traces:
        for category, symbol in point_symbols_map.items():
            fig.add_trace(
                go.Scatter(
                    x=[None],
                    y=[None],
                    mode="markers",
                    marker=dict(
                        color=cfg_colors.get("default_palette", ["#5637cd"])[0],
                        symbol=symbol,
                        size=12,
                        opacity=cfg_plot.get("default_marker_opacity", 0.8),
                    ),
                    name=f"Symbol: {str(category)}",
                    showlegend=True,
                    legendgroup="symbols",
                )
            )
