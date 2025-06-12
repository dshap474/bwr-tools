import copy  # Needed if the config itself uses copy internally

# Default configuration dictionary for all BWR plots
DEFAULT_BWR_CONFIG = {
    "general": {
        # Figure size and style
        "width": 1920,
        "height": 1080,
        "template": "plotly_white",
        "background_image_path": "./brand-assets/bg_black.png",
    },
    "colors": {
        "background_color": "#1A1A1A",
        "primary": "#5637cd",  # Kept for clarity, used for bar_default/hbar_positive
        "bar_default": "#5637cd",
        "hbar_positive": "#5637cd",
        "hbar_negative": "#EF798A",
        "default_palette": [
            "#5637cd",
            "#779BE7",
            "#8F7BE1",
            "#EF798A",
            "#C0B9D8",
            "#8a7cff",
            "#F3A712",
            "#9f95c6",
            "#d62728",
            "#9467bd",
            "#8c564b",
            "#e377c2",
            "#7f7f7f",
            "#bcbd22",
            "#17becf",
        ],
    },
    "fonts": {
        "normal_family": "Maison Neue, Inter, sans-serif",
        "bold_family": "Maison Neue Medium, Inter, sans-serif",
        "title": {"size": 51.6, "color": "#ededed"},
        "subtitle": {"size": 21.6, "color": "#adb0b5"},
        "axis_title": {"size": 16.8, "color": "#ededed"},
        "tick": {"size": 21.6, "color": "#ededed"},
        "legend": {"size": 24.0, "color": "#ededed"},
        "annotation": {"size": 17.4, "color": "#9f95c6"},
        # Table-specific fonts (optional, fallback to title/tick if not present)
        "table_header": {"size": 24, "color": "#ededed"},
        "table_cell": {"size": 20, "color": "#ededed"},
    },
    "watermark": {
        "available_watermarks": {
            "Blockworks Research": "./brand-assets/bwr_white.svg",
            "Blockworks Advisory": "./brand-assets/bwa_white.svg",
        },
        "selected_watermark_key": "Blockworks Research",
        "default_use": True,
        "chart_opacity": 1.0,
        "chart_layer": "above",
        "chart_x": 1.012,
        "chart_y": 1.275,
        "chart_sizex": 0.20,
        "chart_sizey": 0.20,
        "chart_xanchor": "right",
        "plotly_table_options": {
            "use_default_path": True,  # Uses the globally selected watermark SVG
            "x": 1.012,  # Match chart_x
            "y": 1.275,  # Match chart_y
            "sizex": 0.20,  # Match chart_sizex
            "sizey": 0.20,  # Match chart_sizey
            "opacity": 1.0,  # Match chart_opacity
            "layer": "above",  # Match chart_layer
            "xanchor": "right",  # Match chart_xanchor
            "yanchor": "top",  # Explicitly 'top' for clarity, consistent with y > 1
        },
    },
    "layout": {
        "margin_l": 120,
        "margin_r": 70,
        "margin_t_base": 108,  # 108
        "margin_b_min": 0,  # 24
        "plot_area_b_padding": 0,  # -36
        "title_x": 0.035,
        "title_padding": 100,
        "hovermode": "x unified",
        "hoverdistance": 100,
        "spikedistance": 1000,
        # New: Specific left margin for tables to align with title
        # Calculated as title_x * general.width (0.035 * 1920 = 67.2, rounded to 67)
        # This assumes title_x positions the start of the title text block.
        "table_margin_l": 67,
        "table_padding_below_source_px": 20,  # New: Pixels below source text to figure edge
    },
    "legend": {
        "bgcolor": "rgba(255, 255, 255, 0)",
        "bordercolor": "rgba(255, 255, 255, 0)",
        "borderwidth": 0,
        "font_family": "Maison Neue",
        "font_color": "#282829",
        "font_size": 14.4,
        "orientation": "h",
        "yanchor": "top",
        "y": -0.138,
        "xanchor": "left",
        "x": 0.0,
        "title": "",
        "itemsizing": "trace",
        "itemwidth": 36,
        "marker_symbol": "circle",
        "marker_size": 12,
        "traceorder": "reversed",
    },
    "annotations": {
        "default_source_y": -0.16,
        "default_source_x": 1.002,
        "xanchor": "right",
        "yanchor": "top",
        "showarrow": False,
        "chart_source_x": 0.0,
        "chart_source_y": 0.0,
        "chart_source_xanchor": "left",
        "chart_source_yanchor": "top",
        # Update table source annotation to position below table
        "table_source_x": 1.002,  # Keep as bottom-right for x-position
        "table_source_y": 0.01,  # Small positive value for padding from absolute bottom
        "table_xanchor": "right",  # Keep right-aligned
        "table_yanchor": "bottom",  # Anchor to the bottom of its text block
    },
    "axes": {
        "linecolor": "rgb(38, 38, 38)",
        "tickcolor": "rgb(38, 38, 38)",
        "gridcolor": "rgb(38, 38, 38)",
        "showgrid_x": False,
        "showgrid_y": True,
        "ticks": "outside",
        "tickwidth": 2,
        "showline": True,
        "linewidth": 2.5,
        "zeroline": True,
        "zerolinewidth": 2.5,
        "zerolinecolor": "rgb(38, 38, 38)",
        "showspikes": True,
        "spikethickness": 2.4,
        "spikedash": "dot",
        "spikecolor": "rgb(38, 38, 38)",
        "spikemode": "across",
        "x_title_text": "",
        "x_ticklen": 6,
        "x_nticks": 15,
        "x_tickformat": "%d %b %y",
        "x_numeric_tickformat": ",.2f",  # NEW: Default for numeric non-date X-axis
        "y_primary_title_text": "",
        "y_primary_tickformat": ",d",
        "y_primary_ticksuffix": "",
        "y_primary_tickprefix": "",
        "y_primary_range": None,
        "y_secondary_title_text": "",
        "y_secondary_tickformat": ",d",
        "y_secondary_ticksuffix": "",
        "y_secondary_tickprefix": "",
        "y_secondary_range": None,
        "gridwidth": 2.5,
        "y_showgrid": True,
        "y_gridcolor": "rgb(38, 38, 38)",
        "x_gridcolor": "rgb(38, 38, 38)",
        "titlefont_size": 14.4,
        "titlefont_color": "#adb0b5",
    },
    "plot_specific": {
        "scatter": {
            "line_width": 4.2,
            "mode": "lines",
            "default_fill_mode": None,
            "default_fill_color": None,
            "line_shape": "spline",
            "line_smoothing": 0.3,
            "use_background_image": True,
        },
        "metric_share_area": {
            "stackgroup": "one",
            "y_tickformat": ".0%",
            "y_range": [0, 1],
            "legend_marker_symbol": "circle",
            "use_background_image": True,
        },
        "bar": {
            "bargap": 0.15,
            "use_background_image": True,
        },
        "horizontal_bar": {
            "orientation": "h",
            "textposition": "outside",
            "default_y_column": "category",
            "default_x_column": "value",
            "default_sort_ascending": False,
            "bar_height": 0.7,
            "bargap": 0.15,
            "yaxis_automargin": True,
            "use_background_image": True,
        },
        "multi_bar": {
            "default_scale_values": True,
            "default_show_bar_values": False,
            "default_tick_frequency": 1,
            "barmode": "group",
            "bargap": 0.15,
            "bargroupgap": 0.1,
            "orientation": "v",
            "textposition": "outside",
            "legend_marker_symbol": "circle",
            "use_background_image": True,
        },
        "stacked_bar": {
            "default_sort_descending": False,
            "barmode": "stack",
            "bargap": 0.15,
            "bargroupgap": 0.1,
            "default_scale_values": True,
            "y_tickformat": ",.0f",
            "legend_marker_symbol": "circle",
            "use_background_image": True,
        },
        # Table plot configuration
        "table": {
            "header_fill_color": "#2a2a2a",  # Use primary color
            "header_align": "left",  # New: Alignment for header text
            "header_height": 50,  # New: Height for header row
            "cell_fill_color_odd": "#1A1A1A",  # Slightly off-background
            "cell_fill_color_even": "#1A1A1A",  # Ensure uniform cell color
            "cell_align": "left",  # New: Alignment for cell text
            "cell_height": 40,  # Adjusted: Height for data cells
            "line_color": "#404040",  # Dark grey lines
            "font_header_override": {  # New: Specific font settings for header
                "family": "Maison Neue Medium, Inter, sans-serif",
                "size": 18,
                "color": "#E0E0E0",
            },
            "font_cell_override": {  # New: Specific font settings for cells
                "family": "Maison Neue, Inter, sans-serif",
                "size": 16,
                "color": "#D0D0D0",
            },
            # Font keys are optional; fallback logic in core.py
            # "header_font_key": "table_header",
            # "cell_font_key": "table_cell",
            # "columnwidth": None, # Optional: for future implementation, e.g. [0.2, 0.5, 0.3]
        },
        # Point scatter plot configuration
        "point_scatter": {
            "default_marker_symbol": "circle",
            "default_marker_size": 20,  # MODIFIED: Increased default size from 10 to 12
            "default_marker_opacity": 0.8,
            "use_background_image": True,
            "point_text_size": 10,  # NEW: Default text size for point labels
            "point_text_color": "#ededed",  # NEW: Default text color for point labels
            "default_symbol_palette": [
                "circle",
                "x",
                "square",
                "diamond",
                "cross",
                "star",
                "triangle-up",
                "pentagon",
            ],
        },
    },
}


def get_default_config():
    """Returns a deep copy of the default configuration"""
    return copy.deepcopy(DEFAULT_BWR_CONFIG)
