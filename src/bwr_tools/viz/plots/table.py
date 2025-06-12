import pandas as pd
import plotly.graph_objects as go
from typing import Dict


def _add_plotly_table_trace(
    fig: go.Figure,
    data: pd.DataFrame,
    cfg_plot: Dict,
    cfg_fonts: Dict,
    cfg_colors: Dict,
    cfg_layout: Dict,
) -> None:
    """
    Adds a Plotly Table trace to the provided figure, styled according to config.

    Args:
        fig: The Plotly figure object to add the table trace to.
        data: The DataFrame to visualize.
        cfg_plot: Table-specific plot config.
        cfg_fonts: Fonts config.
        cfg_colors: Colors config.
        cfg_layout: Layout config (unused, but included for future extensibility).
    """
    if data is None or data.empty:
        raise ValueError("Input data for table is empty or None.")

    # Extract header and cell values
    header_values = list(map(str, data.columns))
    # Each column as a list of strings
    cell_values = [data[col].astype(str).tolist() for col in data.columns]
    n_rows = len(data)

    # --- Font Configuration ---
    # Get specific overrides from plot_specific.table
    font_header_override = cfg_plot.get("font_header_override", {})
    font_cell_override = cfg_plot.get("font_cell_override", {})

    # Get global table font settings from fonts config
    global_table_header_font_cfg = cfg_fonts.get("table_header", {})
    global_table_cell_font_cfg = cfg_fonts.get("table_cell", {})

    # Fallback to general title/tick fonts if table-specific globals are missing
    fallback_header_font_cfg = cfg_fonts.get("title", {})
    fallback_cell_font_cfg = cfg_fonts.get("tick", {})

    # Determine final header font properties
    final_header_font_family = font_header_override.get(
        "family",
        global_table_header_font_cfg.get(
            "family", cfg_fonts.get("bold_family", "Arial")
        ),
    )
    final_header_font_size = font_header_override.get(
        "size",
        global_table_header_font_cfg.get(
            "size", fallback_header_font_cfg.get("size", 20)
        ),
    )
    final_header_font_color = font_header_override.get(
        "color",
        global_table_header_font_cfg.get(
            "color", fallback_header_font_cfg.get("color", "#ededed")
        ),
    )

    # Determine final cell font properties
    final_cell_font_family = font_cell_override.get(
        "family",
        global_table_cell_font_cfg.get(
            "family", cfg_fonts.get("normal_family", "Arial")
        ),
    )
    final_cell_font_size = font_cell_override.get(
        "size",
        global_table_cell_font_cfg.get("size", fallback_cell_font_cfg.get("size", 18)),
    )
    final_cell_font_color = font_cell_override.get(
        "color",
        global_table_cell_font_cfg.get(
            "color", fallback_cell_font_cfg.get("color", "#ededed")
        ),
    )

    # Colors
    header_fill_color = cfg_plot.get(
        "header_fill_color", cfg_colors.get("primary", "#5637cd")
    )
    cell_fill_color_odd = cfg_plot.get(
        "cell_fill_color_odd", cfg_colors.get("background_color", "#1A1A1A")
    )
    cell_fill_color_even = cfg_plot.get(
        "cell_fill_color_even", cfg_colors.get("background_color", "#1A1A1A")
    )
    line_color = cfg_plot.get(
        "line_color", cfg_colors.get("background_color", "#404040")
    )
    cell_height = cfg_plot.get("cell_height", 30)

    # Fetch alignment and height from cfg_plot (which is plot_specific.table)
    header_align_cfg = cfg_plot.get("header_align", "left")  # Default to left
    header_height_cfg = cfg_plot.get("header_height", 50)  # Default height
    cell_align_cfg = cfg_plot.get("cell_align", "left")  # Default to left

    # Alternating row colors: build a list of fill colors for each row
    fill_colors = [
        cell_fill_color_even if i % 2 == 0 else cell_fill_color_odd
        for i in range(n_rows)
    ]

    # Compose the Table trace
    table_trace = go.Table(
        header=dict(
            values=header_values,
            font=dict(
                family=final_header_font_family,
                size=final_header_font_size,
                color=final_header_font_color,
            ),
            fill_color=header_fill_color,
            align=header_align_cfg,  # Apply configured header alignment
            line_color=line_color,
            height=header_height_cfg,  # Apply configured header height
        ),
        cells=dict(
            values=cell_values,
            font=dict(
                family=final_cell_font_family,
                size=final_cell_font_size,
                color=final_cell_font_color,
            ),
            fill_color=[fill_colors],
            align=cell_align_cfg,  # Apply configured cell alignment
            line_color=line_color,
            height=cell_height,  # Ensure this uses the fetched cell_height
        ),
    )
    fig.add_trace(table_trace)
