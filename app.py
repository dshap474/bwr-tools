# This is the main app file for the BWR Plots Generator
import streamlit as st
import pandas as pd
import numpy as np
import plotly.graph_objects as go
from io import StringIO, BytesIO
import traceback
from typing import Optional, Dict, Any, Tuple, List
from contextlib import contextmanager
from streamlit.components.v1 import html as st_html  # Added for raw HTML rendering
import io
import inspect

# --- ADDED: Plot Type Visibility Controls ---
SCATTER_PLOT_ON = 1
POINT_SCATTER_PLOT_ON = 1
METRIC_SHARE_AREA_PLOT_ON = 1
BAR_CHART_ON = 1
GROUPED_BAR_TIMESERIES_ON = 1
STACKED_BAR_TIMESERIES_ON = 1
HORIZONTAL_BAR_CHART_ON = 0
TABLE_AGGRID_ON = 0
PLOTLY_TABLE_ON = 1  # Add this line
# ------------------------------------------

# --- BWR Plots and AG-Grid Imports ---
try:
    # Import BWRPlots for charts
    from bwr_tools import BWRPlots
    from bwr_tools.viz.config import DEFAULT_BWR_CONFIG

    # Import the new AG-Grid renderer and helper
    from bwr_tools.aggrid_table import (
        render_aggrid_table,
        dataframe_to_csv_bytes,
    )

    # --- ADDED: Import DeFi Llama wrapper ---
    from bwr_tools.data_sources.defillama.api_wrapper import defi_llama

except ImportError:
    # Keep existing fallback logic for BWRPlots
    import sys
    from pathlib import Path

    project_root = Path(__file__).resolve().parent
    src_path = project_root / "src"
    if src_path.exists():
        sys.path.insert(0, str(src_path))
        try:
            from bwr_tools import BWRPlots
            from bwr_tools.viz.config import DEFAULT_BWR_CONFIG
            from bwr_tools.aggrid_table import (
                render_aggrid_table,
                dataframe_to_csv_bytes,
            )

            # --- ADDED: Import DeFi Llama wrapper (fallback) ---
            from bwr_tools.data_sources.defillama.api_wrapper import defi_llama

        except ImportError as ie:
            st.error(f"Could not import necessary libraries from src: {ie}")
            st.stop()
    else:
        st.error(
            "Could not find the 'bwr_tools' library. Please ensure it's installed or the 'src' directory is accessible."
        )
        st.stop()

# --- Configuration ---
SUPPORTED_FILE_TYPES = ["csv", "xlsx"]
PRIMARY_COLOR = "#5637cd"
PLOT_TYPES = {
    "Scatter Plot": "scatter_plot",
    "Point Scatter Plot": "point_scatter_plot",
    "Metric Share Area Plot": "metric_share_area_plot",
    "Bar Chart": "bar_chart",
    "Grouped Bar (Timeseries)": "multi_bar",
    "Stacked Bar (Timeseries)": "stacked_bar_chart",
    "Horizontal Bar Chart": "horizontal_bar",
    "Table (AG-Grid)": "aggrid_table",  # Add new table type
    "Plotly Table": "table_plot",  # Add this new entry
    # "Table": "table", # REMOVE old plotly table
}

# Filter plot types based on visibility controls
VISIBLE_PLOT_TYPES = {}
if SCATTER_PLOT_ON:
    VISIBLE_PLOT_TYPES["Scatter Plot"] = PLOT_TYPES["Scatter Plot"]
if POINT_SCATTER_PLOT_ON:
    VISIBLE_PLOT_TYPES["Point Scatter Plot"] = PLOT_TYPES["Point Scatter Plot"]
if METRIC_SHARE_AREA_PLOT_ON:
    VISIBLE_PLOT_TYPES["Metric Share Area Plot"] = PLOT_TYPES["Metric Share Area Plot"]
if BAR_CHART_ON:
    VISIBLE_PLOT_TYPES["Bar Chart"] = PLOT_TYPES["Bar Chart"]
if GROUPED_BAR_TIMESERIES_ON:
    VISIBLE_PLOT_TYPES["Grouped Bar (Timeseries)"] = PLOT_TYPES[
        "Grouped Bar (Timeseries)"
    ]
if STACKED_BAR_TIMESERIES_ON:
    VISIBLE_PLOT_TYPES["Stacked Bar (Timeseries)"] = PLOT_TYPES[
        "Stacked Bar (Timeseries)"
    ]
if HORIZONTAL_BAR_CHART_ON:
    VISIBLE_PLOT_TYPES["Horizontal Bar Chart"] = PLOT_TYPES["Horizontal Bar Chart"]
if TABLE_AGGRID_ON:
    VISIBLE_PLOT_TYPES["Table (AG-Grid)"] = PLOT_TYPES["Table (AG-Grid)"]
if PLOTLY_TABLE_ON:  # Add this block
    VISIBLE_PLOT_TYPES["Plotly Table"] = PLOT_TYPES["Plotly Table"]

# --- NEW CODE START ---
# Define which plot types (using display names) expect the xaxis_is_date argument
PLOT_TYPES_USING_XAXIS_DATE = {
    "Scatter Plot",
    "Point Scatter Plot",
    "Metric Share Area Plot",
    "Grouped Bar (Timeseries)",  # Corresponds to multi_bar
    "Stacked Bar (Timeseries)",  # Corresponds to stacked_bar_chart
}
# --- NEW CODE END ---

# Plot types requiring a time-series index (AG-Grid doesn't strictly require it)
INDEX_REQUIRED_PLOTS = [
    "Scatter Plot",
    "Metric Share Area Plot",
    "Grouped Bar (Timeseries)",
    "Stacked Bar (Timeseries)",
]
# Plot types requiring smoothing
SMOOTHING_PLOT_TYPES = ["Scatter Plot", "Metric Share Area Plot"]
# Plot types requiring resampling
RESAMPLING_PLOT_TYPES = ["Grouped Bar (Timeseries)", "Stacked Bar (Timeseries)"]
# Plot types requiring filtering (AG-Grid can use its own filters, but pre-filtering is ok)
FILTERING_PLOT_TYPES = [
    "Scatter Plot",
    "Metric Share Area Plot",
    "Grouped Bar (Timeseries)",
    "Stacked Bar (Timeseries)",
    "Table (AG-Grid)",  # If AG-Grid uses this for its date filtering UI
]  # Ensure "Plotly Table" is not here for date-based filtering UI.
# Plot types with specific column mapping needs
COLUMN_MAPPING_PLOTS = {
    # Removed Horizontal Bar Chart from specific mappings
    # AG-Grid doesn't need this specific mapping here, config is done differently
}
# Potential date column names (case-insensitive)
DATE_COLUMN_NAMES = ["date", "time", "datetime", "timestamp"]

# --- Helper Functions ---


@st.cache_data(ttl=3600)  # Cache loaded data for an hour
def load_data(uploaded_file) -> Optional[pd.DataFrame]:
    """Loads data from uploaded file into a Pandas DataFrame."""
    if uploaded_file is None:
        return None
    try:
        file_extension = uploaded_file.name.split(".")[-1].lower()
        if file_extension == "csv":
            # --- MODIFICATION START ---
            try:
                # Try with auto-detection first, BUT disable date parsing
                df = pd.read_csv(
                    uploaded_file,
                    sep=None,
                    engine="python",
                    parse_dates=False,  # ADD THIS ARGUMENT
                    infer_datetime_format=False,  # ADD THIS ARGUMENT
                )
            except Exception as e_csv1:
                uploaded_file.seek(0)
                # Fallback read, also disable date parsing
                df = pd.read_csv(
                    uploaded_file,
                    parse_dates=False,  # ADD THIS ARGUMENT
                    infer_datetime_format=False,  # ADD THIS ARGUMENT
                )
            # --- MODIFICATION END ---
        elif file_extension == "xlsx":
            df = pd.read_excel(uploaded_file, engine="openpyxl")
        else:
            st.error(
                f"Unsupported file type: {file_extension}. Please upload a CSV or XLSX file."
            )
            return None

        # st.success(f"Successfully loaded `{uploaded_file.name}`")
        return df
    except Exception as e:
        st.error(f"Error loading data from file: {e}")
        traceback.print_exc()
        return None


def find_potential_date_col(df: pd.DataFrame) -> Optional[str]:
    """Tries to find a likely date column based on common names."""
    if df is None:
        return None
    for col in df.columns:
        if isinstance(col, str) and col.lower() in DATE_COLUMN_NAMES:
            return col
    return None


def get_column_options(df: Optional[pd.DataFrame]) -> List[str]:
    """Returns list of columns, including a 'None' option."""
    options = ["<None>"]
    if df is not None:
        options.extend(df.columns.astype(str).tolist())
    return options


# --- Helper: create a reusable container with header ---------------
def card(title: str):
    pass  # No longer used


def build_plot(
    df: pd.DataFrame,
    plotter: "BWRPlots",
    plot_type_display: str,
    column_mappings: dict,
    title: str,
    subtitle: str,
    source: str,
    prefix: str,
    suffix: str,
    xaxis_is_date: bool,
    date_override: Optional[str] = None,
    xaxis_title: str = "",
    yaxis_title: str = "",
    axis_options: Optional[Dict[str, Any]] = None,
    **styling_kwargs,
):
    """Builds the plot using the selected type and configuration."""

    plot_args_base = dict(
        title=title,
        subtitle=subtitle,
        source=source,
        prefix=prefix,
        suffix=suffix,
        save_image=False,
        open_in_browser=False,
        x_axis_title=xaxis_title if xaxis_title else None,
        y_axis_title=yaxis_title if yaxis_title else None,
        axis_options=axis_options,
    )

    # Add specific column mappings if they exist and are needed (e.g., for horizontal_bar)
    if column_mappings:
        plot_args_base.update(column_mappings)

    # Conditionally add the 'xaxis_is_date' argument
    # Check if the *display name* is in our set of plots that use this flag
    if plot_type_display in PLOT_TYPES_USING_XAXIS_DATE:
        plot_args_base["xaxis_is_date"] = xaxis_is_date

    # Add styling arguments AFTER specific ones to allow overrides if needed
    plot_args_base.update(styling_kwargs)

    # Combine base args with the actual data
    # Ensure 'data' key exists, as all plot methods expect it
    plot_args = {**plot_args_base, "data": df}

    try:
        # Get the actual method name (e.g., 'scatter_plot') from the display name
        func_name = PLOT_TYPES.get(plot_type_display)
        if not func_name or not hasattr(plotter, func_name):
            st.error(
                f"Plot type '{plot_type_display}' (method '{func_name}') is not implemented correctly in BWRPlots."
            )
            return None

        plot_function = getattr(plotter, func_name)

        # Call the appropriate BWRPlots method (e.g., plotter.bar_chart(**plot_args))
        fig = plot_function(**plot_args)

        # --- ADD THIS POST-PROCESSING LOGIC ---
        if fig and date_override:  # Check if fig exists and override is provided
            print(f"[DEBUG build_plot] Applying date override: '{date_override}'")
            if fig.layout.annotations:
                try:
                    # Assume the source annotation is the last one added by _apply_common_layout
                    # Construct the new annotation text using the override date and original source
                    new_annotation_text = (
                        f"<b>Data as of {date_override} | Source: {source}</b>"
                    )
                    # Update the text of the last annotation
                    fig.layout.annotations[-1].text = new_annotation_text
                    print(f"[DEBUG build_plot] Successfully updated annotation text.")
                except IndexError:
                    print(
                        "[Warning build_plot] Could not find annotation to update (IndexError)."
                    )
                except Exception as e:
                    print(f"[Warning build_plot] Failed to update annotation text: {e}")
            else:
                print("[Warning build_plot] Figure has no annotations to update.")
        # --- END ADDITION ---

        return fig
    except Exception as exc:
        # Catch errors during the actual plot generation in the library
        st.error(
            f"Plot generation failed for '{plot_type_display}' (method '{func_name}'):"
        )
        st.exception(exc)  # Show the full traceback in Streamlit
        return None


# --- Streamlit App ---

st.set_page_config(
    page_title="BWR Plots & DeFi Llama Explorer",  # Updated title to reflect both functionalities
    layout="wide",
    initial_sidebar_state="expanded",
)
st.markdown(
    """
    <style>
        .stTabs [data-baseweb="tab-list"] button { font-size:0.9rem; padding:8px 12px; }
        .stTabs [data-baseweb="tab-panel"] { padding: 1rem 0; }
        
        /* IMPORTANT: Ensure tabs don't constrain content width */
        .stTabs [data-baseweb="tab-panel"] > div {
            width: 100% !important;
            max-width: none !important;
            overflow-x: auto !important;
        }
        
        /* Ensure plot containers can exceed tab width if needed */
        .plot-container {
            width: auto !important;
            max-width: none !important;
            overflow-x: auto !important;
            overflow-y: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-sizing: border-box !important;
        }
        
        /* Ensure Streamlit components don't add extra padding */
        iframe[title="streamlit_component"] {
            margin: 0 !important;
            padding: 0 !important;
        }
        
        /* Remove Custom vertical divider */
        /* .vertical-divider {
            border-left: 2px solid #bbb;
            height: 100vh !important;
        } */
        /* Reduce top blank space */
        .main .block-container {
            padding-top: 0.5rem !important;
        }
        header[data-testid="stHeader"] {
            margin-bottom: 0 !important;
            padding-top: 0.2rem !important;
            min-height: 0 !important;
        }
        /* Sidebar subheader font size and margin */
        section[data-testid="stSidebar"] h3, .stSidebar h3, .stSidebar .stSubheader, .stSubheader {
            font-size: 1.1rem !important;
            margin-bottom: 0.5rem !important;
            margin-top: 0.5rem !important;
        }
        /* Align upload and plot type columns to top */
        .sidebar-row-align-top > div[data-testid="column"] {
            align-items: flex-start !important;
            display: flex;
            flex-direction: column;
        }
        /* Center the checkbox in the X-axis/Is Date row */
        .xaxis-checkbox-align {
            margin-top: 18px !important;
        }
        /* Sidebar as a card/box */
        section[data-testid="stSidebar"] > div:first-child {
            background: #f7f7fb;
            border-radius: 18px;
            box-shadow: 0 2px 16px 0 rgba(80,80,120,0.07);
            padding: 1.5rem 1.2rem 1.2rem 1.2rem;
            margin: 0.5rem 0.2rem 0.5rem 0.2rem;
            position: relative;
            border-right: 2px solid #bbb;
            overflow: visible;
        }
        /* Left vertical line */
        section[data-testid="stSidebar"] > div:first-child::before {
            content: "";
            position: absolute;
            left: -18px;
            top: 0;
            width: 2px;
            height: 100%;
            background: #bbb;
            border-radius: 2px;
            z-index: 1;
        }
        /* Top horizontal line */
        section[data-testid="stSidebar"] > div:first-child::after {
            content: "";
            position: absolute;
            left: -18px;
            right: -2px;
            top: 0;
            height: 4px;
            background: #bbb;
            border-radius: 2px;
            z-index: 1;
        }
        /* Bottom horizontal line using a wrapper div and its ::after */
        section[data-testid="stSidebar"] > div:first-child > div:last-child {
            position: relative;
        }
        section[data-testid="stSidebar"] > div:first-child > div:last-child::after {
            content: "";
            position: absolute;
            left: -18px;
            right: -2px;
            bottom: -12px;
            height: 4px;
            background: #bbb;
            border-radius: 2px;
            z-index: 1;
        }
        /* Ensure the sidebar content is above the lines */
        section[data-testid="stSidebar"] > div:first-child > * {
            position: relative;
            z-index: 2;
        }
        /* --- Custom: Make all input/select text grey instead of white --- */
        /* Selectbox, multiselect, radio, number_input, text_input, file_uploader, checkbox */
        .stSelectbox div[data-baseweb="select"] span,
        .stSelectbox div[data-baseweb="select"] input,
        .stMultiSelect div[data-baseweb="select"] span,
        .stMultiSelect div[data-baseweb="select"] input,
        .stRadio div[role="radiogroup"] label,
        .stNumberInput input,
        .stTextInput input,
        .stFileUploader label,
        .stCheckbox label,
        .stSelectbox div[data-baseweb="select"] div,
        .stMultiSelect div[data-baseweb="select"] div {
            color: #aaa !important;
        }
        /* Make the select plot type menu text white specifically */
        .custom-plot-type .stSelectbox div[data-baseweb="select"] span,
        .custom-plot-type .stSelectbox div[data-baseweb="select"] input,
        .custom-plot-type .stSelectbox div[data-baseweb="select"] div {
            color: #fff !important;
        }
        /* Placeholder text for all inputs */
        .stTextInput input::placeholder,
        .stNumberInput input::placeholder,
        .stSelectbox div[data-baseweb="select"] input::placeholder,
        .stMultiSelect div[data-baseweb="select"] input::placeholder {
            color: #888 !important;
            opacity: 1 !important;
        }
    </style>
    <style>
        /* Make all horizontal rules and Streamlit dividers match the vertical divider color and be thinner */
        hr, .stDividerHorizontalLine {
            border-top: 2px solid #bbb !important;
            height: 2px !important;
        }
        div[data-testid="stDivider"] hr {
            border-top: 2px solid #bbb !important;
            height: 2px !important;
        }
    </style>
    """,
    unsafe_allow_html=True,
)

# --- Create Tabs ---
tab_plots, tab_defi_llama = st.tabs(
    ["**BWR Plots & Tables**", "**DeFi Llama API Explorer**"]
)

# ==============================================================================
# ========================== TAB 1: BWR PLOTS GENERATOR ========================
# ==============================================================================
with tab_plots:
    # --- MAIN LAYOUT: Sidebar (controls) | Main Output ---
    sidebar_col, main_col = st.columns([0.9, 2.05], gap="small")

    with sidebar_col:
        # --- Section 1: Upload Data and Plot Type in parallel ---
        upload_col, plot_col = st.columns([1, 1], gap="small")
        st.markdown('<div class="sidebar-row-align-top">', unsafe_allow_html=True)
        with upload_col:
            st.subheader("Upload Data")
            uploader_container = st.container()
            with uploader_container:
                st.markdown(
                    """
                    <style>
                    .custom-uploader .stFileUploader {width: 100% !important; min-width: 260px; min-height: 56px;}
                    .custom-uploader .stFileUploader label {font-size: 1rem;}
                    </style>
                    """,
                    unsafe_allow_html=True,
                )
                st.markdown('<div class="custom-uploader">', unsafe_allow_html=True)
                uploaded_file_tab1 = st.file_uploader(
                    "CSV or XLSX",
                    type=SUPPORTED_FILE_TYPES,
                    key="file_uploader_tab1",  # Unique key for tab 1
                    label_visibility="collapsed",
                )
                st.markdown("</div>", unsafe_allow_html=True)
        with plot_col:
            st.subheader("Select Output Type")  # Rename slightly
            st.markdown(
                """
                <style>
                .custom-plot-type .stSelectbox {width: 100% !important; min-width: 260px; min-height: 56px;}
                .custom-plot-type .stSelectbox label {font-size: 1rem;}
                </style>
                """,
                unsafe_allow_html=True,
            )
            st.markdown('<div class="custom-plot-type">', unsafe_allow_html=True)
            plot_type_display_tab1 = st.selectbox(
                "",
                list(VISIBLE_PLOT_TYPES.keys()),
                key="plot_type_selector_tab1",  # Unique key for tab 1
                label_visibility="collapsed",
            )
            st.markdown("</div>", unsafe_allow_html=True)
        st.markdown("</div>", unsafe_allow_html=True)  # Close sidebar-row-align-top
        st.divider()

        # Check if data is loaded before showing manipulation/config
        if "file_uploader_tab1" in st.session_state:
            uploaded_file_tab1 = st.session_state["file_uploader_tab1"]
        else:
            uploaded_file_tab1 = None

        if uploaded_file_tab1 is not None:
            if (
                st.session_state.get("current_file_name_tab1")
                != uploaded_file_tab1.name
            ):
                if "df_tab1" in st.session_state:
                    del st.session_state["df_tab1"]
                if "plotter_instance_tab1" in st.session_state:
                    del st.session_state["plotter_instance_tab1"]
                st.session_state["current_file_name_tab1"] = uploaded_file_tab1.name
            if "df_tab1" not in st.session_state:
                with st.spinner("Loading data for Plots Tab..."):
                    st.session_state.df_tab1 = load_data(uploaded_file_tab1)
                if st.session_state.df_tab1 is not None:
                    st.session_state.plotter_instance_tab1 = BWRPlots()

        df_tab1 = st.session_state.get("df_tab1", None)
        plotter_tab1 = st.session_state.get("plotter_instance_tab1", None)

        if "df_tab1" in st.session_state and st.session_state.df_tab1 is not None:
            # --- Section 2: Dataframe Manipulation (NEW SECTION) ---
            st.subheader("Dataframe Manipulation")

            # Get original columns BEFORE manipulation for user selection convenience
            original_df_for_selectors = st.session_state.get("df_tab1")
            original_cols_options_manip = get_column_options(
                original_df_for_selectors
            )  # Use helper function

            with st.expander("Drop Columns"):
                # This multiselect now uses original columns for selection
                cols_to_drop = st.multiselect(
                    "Select columns to remove",
                    options=[
                        c for c in original_cols_options_manip if c != "<None>"
                    ],  # Exclude None
                    key="data_cols_to_drop_tab1",
                )

            with st.expander("Rename Columns"):
                st.caption("Enter new name only for columns you want to rename.")
                rename_map = {}
                # Iterate over original columns for the UI, but logic will apply to current df state
                cols_available_for_rename = [
                    c for c in original_cols_options_manip if c != "<None>"
                ]
                for col in cols_available_for_rename:
                    # Check if the column *might* be dropped - disable if so? (Optional enhancement)
                    # is_dropped = col in st.session_state.get("data_cols_to_drop_tab1", [])
                    new_name = st.text_input(
                        f"`{col}` -> New Name:",
                        key=f"rename_{col}_tab1",
                        # disabled=is_dropped # Optional: disable renaming if selected for dropping
                    )
                    if new_name and new_name.strip() != col:
                        rename_map[col] = new_name.strip()
                st.session_state.data_rename_map_tab1 = rename_map  # Store the map

            with st.expander("Pivot Data (Optional)"):
                st.checkbox("Enable Pivoting", key="pivot_enabled_tab1", value=False)
                if st.session_state.get("pivot_enabled_tab1", False):
                    # These selectors also use original columns for user selection
                    st.selectbox(
                        "Index Column (Rows)",
                        options=original_cols_options_manip,
                        key="pivot_index_col_tab1",
                        index=0,  # Consider finding a better default?
                        help="Column whose unique values become the new row index.",
                    )
                    st.selectbox(
                        "Pivot Columns (New Columns)",
                        options=original_cols_options_manip,
                        key="pivot_columns_col_tab1",
                        index=0,
                        help="Column whose unique values become the new column headers.",
                    )
                    st.selectbox(
                        "Pivot Values (Cell Content)",
                        options=original_cols_options_manip,
                        key="pivot_values_col_tab1",
                        index=0,
                        help="Column whose values will fill the pivoted table cells.",
                    )
                    st.selectbox(
                        "Aggregation Function",
                        options=[
                            "first",
                            "mean",
                            "sum",
                            "count",
                            "median",
                            "min",
                            "max",
                        ],
                        key="pivot_aggfunc_tab1",
                        index=0,
                        help="How to handle duplicate index/column pairs (e.g., 'sum' values).",
                    )
            st.divider()  # Divider after manipulation section

            # --- Section 3: Plot Configuration (Renamed from "Data Settings") ---
            st.subheader("Plot Configuration")

            # Get the manipulated dataframe (or original if not manipulated yet)
            # We need this *here* to populate the selectors correctly
            manipulated_df_for_selectors = st.session_state.get(
                "manipulated_df_tab1", st.session_state.get("df_tab1")
            )
            if manipulated_df_for_selectors is None:
                st.warning("Load data first.")
                st.stop()

            # Get available columns/index AFTER potential manipulation
            available_columns = ["<None>"]
            available_index_name = None
            if isinstance(manipulated_df_for_selectors, pd.DataFrame):
                available_columns.extend(
                    manipulated_df_for_selectors.columns.astype(str).tolist()
                )
                if manipulated_df_for_selectors.index.name:
                    available_index_name = str(manipulated_df_for_selectors.index.name)
                    # Add index to options if it's named and not already a column
                    if available_index_name not in available_columns:
                        available_columns.insert(
                            1, available_index_name
                        )  # Insert after <None>
                else:  # Handle unnamed index (e.g., after reset_index)
                    # Maybe add a placeholder like "<Unnamed Index>"? Or just rely on columns.
                    pass

            if plot_type_display_tab1 not in ["Point Scatter Plot", "Plotly Table"]:
                # Show generic X-axis/Index selector and "Is Date?" checkbox
                cols_xaxis, cols_isdate = st.columns([3, 1])
                with cols_xaxis:
                    # Selector now uses columns/index from the *manipulated* df
                    st.selectbox(
                        "Column to use as x-axis / Index",  # Clarify label
                        options=available_columns,  # Use dynamically generated options
                        index=0,  # Reset index selection or try to find previous?
                        key="data_index_col_tab1",  # Keep key same for now
                        help='Select the column or index for the X-axis. Check "Is Date?" if it contains dates/times.',
                    )
                with cols_isdate:
                    st.markdown(
                        '<div style="margin-top: 28px;"></div>', unsafe_allow_html=True
                    )
                    st.checkbox(
                        "Is Date?",
                        value=st.session_state.get(
                            "data_xaxis_is_date_tab1", True
                        ),  # Default True for general plots
                        key="data_xaxis_is_date_tab1",
                        help="Check if the selected x-axis/index column contains dates or timestamps.",
                    )

                # Add secondary Y-axis controls for Scatter Plot
                if plot_type_display_tab1 == "Scatter Plot":
                    st.divider()
                    st.checkbox(
                        "Enable Secondary Y-Axis",
                        key="scatter_enable_secondary_yaxis_tab1",
                        value=False,
                    )

                    if st.session_state.get(
                        "scatter_enable_secondary_yaxis_tab1", False
                    ):
                        # Get current available columns for selectors
                        current_available_cols = available_columns[
                            1:
                        ]  # Remove "<None>" option

                        st.multiselect(
                            "Select Columns for Primary Y-Axis",
                            options=current_available_cols,
                            key="scatter_primary_y_cols_tab1",
                            help="Select one or more columns for the primary Y-axis. If none selected, all numeric columns not used by secondary axis might be used.",
                        )
                        st.multiselect(
                            "Select Columns for Secondary Y-Axis",
                            options=current_available_cols,
                            key="scatter_secondary_y_cols_tab1",
                            help="Select one or more columns for the secondary Y-axis. Required if 'Enable Secondary Y-Axis' is checked.",
                        )
                        st.text_input(
                            "Secondary Y-Axis Title",
                            key="scatter_secondary_yaxis_title_tab1",
                            placeholder="Optional",
                        )
                        st.text_input(
                            "Secondary Y-Axis Prefix",
                            key="scatter_secondary_yaxis_prefix_tab1",
                            placeholder="e.g., $",
                        )
                        st.text_input(
                            "Secondary Y-Axis Suffix",
                            key="scatter_secondary_yaxis_suffix_tab1",
                            placeholder="e.g., %",
                        )
            else:  # plot_type_display_tab1 == "Point Scatter Plot"
                # No "Point Scatter Plot Settings:" caption needed here, selectors appear directly.
                manipulated_df_for_selectors = st.session_state.get(
                    "manipulated_df_tab1", st.session_state.get("df_tab1")
                )
                if manipulated_df_for_selectors is not None:
                    scatter_plot_col_options = [
                        "<None>"
                    ] + manipulated_df_for_selectors.columns.astype(str).tolist()

                    st.selectbox(
                        "X-axis Data Column:",  # Moved directly under "Plot Configuration"
                        options=scatter_plot_col_options,
                        key="point_scatter_x_col_tab1",
                        index=0,
                        help="Select the column containing X-coordinate values for the points.",
                    )
                    st.checkbox(
                        "X-axis is Date?",  # Logically follows X-axis Data Column
                        value=st.session_state.get("data_xaxis_is_date_tab1", False),
                        key="data_xaxis_is_date_tab1",
                        help="Check if the selected X-axis Data Column contains dates or timestamps.",
                    )
                    st.selectbox(
                        "Y-axis Data Column:",  # Moved directly under "Plot Configuration"
                        options=scatter_plot_col_options,
                        key="point_scatter_y_col_tab1",
                        index=0,
                        help="Select the column containing Y-coordinate values for the points.",
                    )
                    st.selectbox(
                        "Color Grouping Column (Optional):",  # Remains
                        options=scatter_plot_col_options,
                        key="point_scatter_color_col_tab1",
                        index=0,
                        help="Select a column to group points by color. Each unique value will get a different color and legend entry.",
                    )
                    # REMOVE "Symbol Grouping Column" selector
                    # REMOVE "Point Name/Hover Column" selector
                else:
                    st.warning(
                        "Manipulated DataFrame not available for column selection."
                    )

            # Keep Filtering, Resampling, Smoothing controls here
            # They operate on the data *after* manipulation and index selection
            if (
                plot_type_display_tab1 in FILTERING_PLOT_TYPES
                and plot_type_display_tab1 != "Plotly Table"
            ):
                filter_mode = st.radio(
                    "Filter by:",
                    ["Lookback", "Date Window"],
                    key="data_filter_mode_tab1",
                    horizontal=True,
                    index=0,
                )
                if filter_mode == "Lookback":
                    st.number_input(
                        "Lookback Period (days, 0=all)",
                        min_value=0,
                        step=1,
                        value=st.session_state.get("data_lookback_days_tab1", 0),
                        key="data_lookback_days_tab1",
                        help="Number of days of data to show, counting back from the latest date. 0 uses all available data.",
                    )
                    st.session_state.data_window_start_tab1 = ""
                    st.session_state.data_window_end_tab1 = ""
                else:
                    st.text_input(
                        "Start Date (DD-MM-YYYY)",
                        key="data_window_start_tab1",
                        placeholder="e.g., 01-01-2023",
                        value=st.session_state.get("data_window_start_tab1", ""),
                    )
                    st.text_input(
                        "End Date (DD-MM-YYYY)",
                        key="data_window_end_tab1",
                        placeholder="e.g., 31-12-2023",
                        value=st.session_state.get("data_window_end_tab1", ""),
                    )
                    st.session_state.data_lookback_days_tab1 = 0
            else:
                st.session_state.data_filter_mode_tab1 = "Lookback"
                st.session_state.data_lookback_days_tab1 = 0
                st.session_state.data_window_start_tab1 = ""
                st.session_state.data_window_end_tab1 = ""

            if (
                plot_type_display_tab1 in RESAMPLING_PLOT_TYPES
                and plot_type_display_tab1 != "Plotly Table"
            ):
                resample_freq_selection = st.selectbox(
                    "Resample Frequency",
                    options=["<None>", "D", "W", "ME", "QE", "YE"],
                    index=0,
                    key="data_resample_freq_tab1",
                    help="Resample the data to a lower frequency. '<None>' uses original frequency. Aggregation is always 'sum'.",
                )
            else:
                st.session_state.data_resample_freq_tab1 = "<None>"

            if (
                plot_type_display_tab1 in SMOOTHING_PLOT_TYPES
                and plot_type_display_tab1 != "Plotly Table"
            ):
                smoothing_window_val = st.number_input(
                    "Smoothing Window (days, 0=none)",
                    min_value=0,
                    step=1,
                    value=st.session_state.get("data_smoothing_window_tab1", 0),
                    key="data_smoothing_window_tab1",
                    help="Size of the trailing moving average window. 0 or 1 disables smoothing.",
                )
            else:
                st.session_state.data_smoothing_window_tab1 = 0

            st.divider()

            # --- Section 4: Display Info ---
            st.subheader("Display Info")
            plot_title = st.text_input(
                "Title", "My Data Display", key="plot_title_tab1"
            )
            plot_subtitle = st.text_input(
                "Subtitle", "Generated from uploaded data", key="plot_subtitle_tab1"
            )
            plot_source = st.text_input(
                "Data source text", "Uploaded Data", key="plot_source_tab1"
            )
            plot_date_override = st.text_input(
                "Data Source Date (Override)",
                key="plot_date_override_tab1",
                placeholder="YYYY-MM-DD or custom text (Optional)",
                help="Leave blank to use the latest date from data automatically.",
            )
            y_prefix = st.text_input("Y-axis prefix", "", key="y_prefix_tab1")
            y_suffix = st.text_input("Y-axis suffix", "", key="y_suffix_tab1")

            # --- BEGIN ADDITION: Watermark Selection UI ---
            st.divider()
            st.subheader("Branding Options")

            # Get watermark options from default config
            default_watermark_options = list(
                DEFAULT_BWR_CONFIG["watermark"]["available_watermarks"].keys()
            )
            default_selected_key = DEFAULT_BWR_CONFIG["watermark"][
                "selected_watermark_key"
            ]

            # Ensure default_selected_key is valid, otherwise default to first option
            try:
                default_index = default_watermark_options.index(default_selected_key)
            except ValueError:
                default_index = 0
                if default_watermark_options:  # Check if options exist
                    print(
                        f"Warning: Default watermark key '{default_selected_key}' not in available options. Defaulting to '{default_watermark_options[0]}'."
                    )
                else:
                    print("Warning: No watermark options available.")

            # Only show selectbox if options are available
            if default_watermark_options:
                st.selectbox(
                    "Select Watermark SVG",
                    options=default_watermark_options,
                    index=default_index,
                    key="watermark_svg_select_tab1",
                    help="Choose the SVG image to use as the plot watermark.",
                )
            else:
                st.caption("No watermark options configured.")

            # Optional: Add a checkbox to toggle watermark usage
            st.checkbox(
                "Use Watermark",
                value=DEFAULT_BWR_CONFIG["watermark"].get("default_use", True),
                key="use_watermark_toggle_tab1",
            )
            # --- END ADDITION: Watermark Selection UI ---

            # --- BEGIN ADDITION ---
            # Conditionally show axis title inputs if X-axis is not a date
            xaxis_titles_visible = (
                not st.session_state.get("data_xaxis_is_date_tab1", True)
                and plot_type_display_tab1 != "Plotly Table"
            )
            if xaxis_titles_visible:
                st.markdown("---")  # Visual separator
                st.caption("Specify Axis Titles (for non-date X-axis):")
                st.text_input(
                    "X-Axis Title",
                    "",
                    key="plot_xaxis_title_tab1",
                    help="Title for the horizontal axis.",
                )
                st.text_input(
                    "Y-Axis Title",
                    "",
                    key="plot_yaxis_title_tab1",
                    help="Title for the vertical axis.",
                )
            # --- END ADDITION ---
        else:
            st.info("Upload a CSV or XLSX file to begin.")  # Message when no data

    with main_col:
        if df_tab1 is not None and plotter_tab1 is not None:
            generate_clicked = st.button("Generate Output", key="generate_button_tab1")

            if generate_clicked:
                if (
                    "df_tab1" not in st.session_state
                    or st.session_state.df_tab1 is None
                ):
                    st.warning("Please upload data first.")
                    st.stop()  # Stop if no base data

                try:
                    # --- Phase 1: Data Manipulation ---
                    manipulated_df = st.session_state.df_tab1.copy()

                    # 1a. Drop Columns
                    cols_to_drop = st.session_state.get("data_cols_to_drop_tab1", [])
                    if cols_to_drop:
                        cols_actually_in_df = [
                            c for c in cols_to_drop if c in manipulated_df.columns
                        ]
                        if cols_actually_in_df:
                            manipulated_df = manipulated_df.drop(
                                columns=cols_actually_in_df, errors="ignore"
                            )
                            # st.write(f"- Dropped columns: {', '.join(cols_actually_in_df)}")  # User feedback

                    # 1b. Rename Columns
                    rename_map = st.session_state.get("data_rename_map_tab1", {})
                    actual_rename_map = {
                        k: v
                        for k, v in rename_map.items()
                        if k in manipulated_df.columns
                    }
                    if actual_rename_map:
                        manipulated_df = manipulated_df.rename(
                            columns=actual_rename_map
                        )
                        # st.write(f"- Renamed columns: {actual_rename_map}")  # User feedback

                    # 1c. Pivot Data
                    pivot_enabled = st.session_state.get("pivot_enabled_tab1", False)
                    if pivot_enabled:
                        pivot_index_orig = st.session_state.get(
                            "pivot_index_col_tab1", "<None>"
                        )
                        pivot_columns_orig = st.session_state.get(
                            "pivot_columns_col_tab1", "<None>"
                        )
                        pivot_values_orig = st.session_state.get(
                            "pivot_values_col_tab1", "<None>"
                        )
                        pivot_aggfunc = st.session_state.get(
                            "pivot_aggfunc_tab1", "first"
                        )

                        # Use potentially renamed columns for pivoting
                        pivot_index = actual_rename_map.get(
                            pivot_index_orig, pivot_index_orig
                        )
                        pivot_columns = actual_rename_map.get(
                            pivot_columns_orig, pivot_columns_orig
                        )
                        pivot_values = actual_rename_map.get(
                            pivot_values_orig, pivot_values_orig
                        )

                        # Validation
                        valid_pivot = True
                        available_cols_after_rename = manipulated_df.columns.tolist()
                        if (
                            pivot_index == "<None>"
                            or pivot_index not in available_cols_after_rename
                        ):
                            st.error(
                                f"Pivot Error: Index column '{pivot_index_orig}' (as '{pivot_index}') not found after drop/rename."
                            )
                            valid_pivot = False
                        if (
                            pivot_columns == "<None>"
                            or pivot_columns not in available_cols_after_rename
                        ):
                            st.error(
                                f"Pivot Error: Columns column '{pivot_columns_orig}' (as '{pivot_columns}') not found after drop/rename."
                            )
                            valid_pivot = False
                        if (
                            pivot_values == "<None>"
                            or pivot_values not in available_cols_after_rename
                        ):
                            st.error(
                                f"Pivot Error: Values column '{pivot_values_orig}' (as '{pivot_values}') not found after drop/rename."
                            )
                            valid_pivot = False

                        if valid_pivot:
                            # st.write(
                            #     f"- Pivoting data: Index='{pivot_index}', Columns='{pivot_columns}', Values='{pivot_values}', AggFunc='{pivot_aggfunc}'"
                            # )
                            try:
                                # Ensure the index column isn't the actual df index before pivoting
                                if manipulated_df.index.name == pivot_index:
                                    manipulated_df = manipulated_df.reset_index()

                                pivoted_df = pd.pivot_table(
                                    manipulated_df,
                                    index=pivot_index,
                                    columns=pivot_columns,
                                    values=pivot_values,
                                    aggfunc=pivot_aggfunc,
                                )
                                # Handle potential MultiIndex columns
                                if isinstance(pivoted_df.columns, pd.MultiIndex):
                                    pivoted_df.columns = [
                                        "_".join(map(str, col)).strip()
                                        for col in pivoted_df.columns.values
                                    ]

                                manipulated_df = (
                                    pivoted_df  # IMPORTANT: Update the main df variable
                                )
                                # st.success("Pivoting successful.")
                            except Exception as e:
                                st.error(f"Pivoting failed: {e}")
                                st.exception(e)
                                st.stop()  # Stop processing if pivot fails
                        else:
                            st.warning(
                                "Pivoting skipped due to invalid column selections."
                            )
                            st.stop()  # Stop if selections invalid

                    # Store the manipulated dataframe in session state
                    st.session_state.manipulated_df_tab1 = manipulated_df
                    # st.success("Data manipulations applied.")
                    # Optional: Show preview
                    # st.write("Preview of Manipulated Data:")
                    # st.dataframe(manipulated_df.head())

                    # --- Phase 2: Prepare Data for Plotting ---
                    data_for_plot = (
                        manipulated_df.copy()
                    )  # Start with the manipulated data

                    selected_index_col = st.session_state.get(
                        "data_index_col_tab1", "<None>"
                    )
                    xaxis_is_date = st.session_state.get(
                        "data_xaxis_is_date_tab1", True
                    )

                    # Handle specific plot types that don't use index directly
                    if plot_type_display_tab1 == "Bar Chart":
                        numeric_df = data_for_plot.select_dtypes(include=np.number)
                        if numeric_df.empty:
                            st.error("No numeric columns for Bar Chart.")
                            st.stop()
                        data_for_plot = numeric_df.mean().copy()  # Aggregate
                        if data_for_plot.isnull().all():
                            st.error("Aggregation failed for Bar Chart.")
                            st.stop()
                        data_for_plot.index = data_for_plot.index.astype(str)
                        xaxis_is_date = False  # Bar chart X is categorical
                        # st.write("- Prepared data for Bar Chart (aggregated means).")
                    elif plot_type_display_tab1 == "Horizontal Bar Chart":
                        numeric_df = data_for_plot.select_dtypes(include=np.number)
                        if numeric_df.empty:
                            st.error("No numeric columns for Horizontal Bar.")
                            st.stop()
                        data_for_plot = numeric_df.mean().copy()  # Aggregate
                        if data_for_plot.isnull().all():
                            st.error("Aggregation failed for Horizontal Bar.")
                            st.stop()
                        data_for_plot.index = data_for_plot.index.astype(str)
                        # Sorting happens within the plot function for HBar
                        xaxis_is_date = False  # HBar Y is categorical
                        # st.write(
                        #     "- Prepared data for Horizontal Bar Chart (aggregated means)."
                        # )
                    elif plot_type_display_tab1 == "Point Scatter Plot":
                        # Point Scatter Plot with explicit x_column and y_column doesn't need index manipulation
                        # The columns will be accessed directly by the plot function
                        # Keep the data as-is for column-based access
                        pass
                    elif plot_type_display_tab1 == "Plotly Table":
                        xaxis_is_date = False  # Not relevant for table structure
                        # `data_for_plot` (which is `manipulated_df`) is used directly.
                        # No specific index setting logic needed here for table_plot.
                        pass
                    elif (
                        plot_type_display_tab1 in INDEX_REQUIRED_PLOTS
                        or plot_type_display_tab1 == "Table (AG-Grid)"
                    ):
                        # Set index for plots that require it (or for the table)
                        if selected_index_col == "<None>":
                            # Use the DataFrame's existing index if none selected (common after pivot)
                            if data_for_plot.index.name:
                                # st.write(
                                #     f"- Using existing index '{data_for_plot.index.name}' as X-axis."
                                # )
                                pass
                            else:
                                # st.warning(
                                #     "No X-axis column selected, using default index (may not be suitable)."
                                # )
                                pass
                        elif selected_index_col == data_for_plot.index.name:
                            # st.write(
                            #     f"- Using existing index '{selected_index_col}' as X-axis."
                            # )
                            # Index is already set
                            pass
                        elif selected_index_col in data_for_plot.columns:
                            try:
                                data_for_plot = data_for_plot.set_index(
                                    selected_index_col
                                )
                                # st.write(f"- Set index to '{selected_index_col}'.")
                            except Exception as e:
                                st.error(
                                    f"Failed to set index to '{selected_index_col}': {e}"
                                )
                                st.stop()
                        else:
                            st.error(
                                f"Selected X-axis column '{selected_index_col}' not found in the manipulated data."
                            )
                            st.stop()

                        # Convert index to datetime if specified *AND* it's not already datetime
                        if xaxis_is_date and not isinstance(
                            data_for_plot.index, pd.DatetimeIndex
                        ):
                            try:
                                original_name = data_for_plot.index.name
                                data_for_plot.index = pd.to_datetime(
                                    data_for_plot.index, errors="coerce"
                                )
                                data_for_plot.index.name = original_name
                                if data_for_plot.index.isnull().any():
                                    st.warning(
                                        "Some index values failed date conversion (NaT). Dropping rows."
                                    )
                                    data_for_plot = data_for_plot.dropna(
                                        axis=0,
                                        subset=(
                                            [data_for_plot.index.name]
                                            if data_for_plot.index.name
                                            else None
                                        ),
                                    )  # Drop rows with NaT index
                                # st.write("- Converted index to datetime.")
                            except Exception as e:
                                st.error(f"Failed to convert index to datetime: {e}")
                                xaxis_is_date = False  # Fallback if conversion fails
                                # st.warning("Proceeding with non-datetime index.")

                        # Sort index (important for time series)
                        if isinstance(
                            data_for_plot.index, pd.DatetimeIndex
                        ) or pd.api.types.is_numeric_dtype(data_for_plot.index):
                            try:
                                data_for_plot = data_for_plot.sort_index()
                                # st.write("- Sorted data by index.")
                            except TypeError as e:
                                st.warning(
                                    f"Could not sort index (possibly mixed types): {e}"
                                )
                        # else: data has categorical index, usually don't sort

                    else:
                        # Default case or other plot types - use dataframe as is
                        # Make sure index is reasonable if needed later
                        xaxis_is_date = isinstance(
                            data_for_plot.index, pd.DatetimeIndex
                        )
                        pass

                    # --- Phase 3: Apply Filtering / Resampling / Smoothing ---
                    filter_mode = st.session_state.get(
                        "data_filter_mode_tab1", "Lookback"
                    )
                    lookback_days = st.session_state.get("data_lookback_days_tab1", 0)
                    start_date_str = st.session_state.get("data_window_start_tab1", "")
                    end_date_str = st.session_state.get("data_window_end_tab1", "")
                    resample_freq = st.session_state.get(
                        "data_resample_freq_tab1", "<None>"
                    )
                    smoothing_window = st.session_state.get(
                        "data_smoothing_window_tab1", 0
                    )

                    is_datetime_index = isinstance(
                        data_for_plot.index, pd.DatetimeIndex
                    )

                    # Filtering
                    if (
                        plot_type_display_tab1 in FILTERING_PLOT_TYPES
                        and is_datetime_index
                    ):
                        if filter_mode == "Lookback" and lookback_days > 0:
                            end_date_filter = data_for_plot.index.max()
                            start_date_filter = end_date_filter - pd.Timedelta(
                                days=lookback_days - 1
                            )
                            data_for_plot = data_for_plot.loc[
                                start_date_filter:end_date_filter
                            ]
                            # st.write(f"- Applied {lookback_days}-day lookback filter.")
                        elif filter_mode == "Date Window" and (
                            start_date_str or end_date_str
                        ):
                            try:
                                start_f = (
                                    pd.to_datetime(
                                        start_date_str, dayfirst=True, errors="coerce"
                                    )
                                    if start_date_str
                                    else None
                                )
                                end_f = (
                                    pd.to_datetime(
                                        end_date_str, dayfirst=True, errors="coerce"
                                    )
                                    if end_date_str
                                    else None
                                )
                                # Timezone handling (copy from original if needed)
                                if data_for_plot.index.tz is not None:
                                    index_tz = data_for_plot.index.tz
                                    if start_f is not None and start_f.tzinfo is None:
                                        start_f = start_f.tz_localize(index_tz)
                                    if end_f is not None and end_f.tzinfo is None:
                                        end_f = end_f.tz_localize(index_tz)
                                data_for_plot = data_for_plot.loc[start_f:end_f]
                                # st.write(
                                #     f"- Applied date window filter: {start_f} to {end_f}."
                                # )
                            except Exception as e:
                                st.error(f"Error applying date window filter: {e}")

                    # Resampling
                    if (
                        plot_type_display_tab1 in RESAMPLING_PLOT_TYPES
                        and resample_freq != "<None>"
                        and is_datetime_index
                    ):
                        try:
                            numeric_cols = data_for_plot.select_dtypes(
                                include="number"
                            ).columns
                            data_for_plot = (
                                data_for_plot[numeric_cols]
                                .resample(resample_freq)
                                .sum()
                            )
                            # st.write(
                            #     f"- Resampled data to '{resample_freq}' frequency (sum)."
                            # )
                        except Exception as e:
                            st.error(f"Failed to resample data: {e}")

                    # Smoothing
                    if (
                        plot_type_display_tab1 in SMOOTHING_PLOT_TYPES
                        and smoothing_window > 1
                        and is_datetime_index
                        and plot_type_display_tab1
                        != "Metric Share Area Plot"  # Skip for this type, handled internally
                    ):
                        try:
                            numeric_cols = data_for_plot.select_dtypes(
                                include="number"
                            ).columns
                            data_for_plot[numeric_cols] = (
                                data_for_plot[numeric_cols]
                                .rolling(window=smoothing_window, min_periods=1)
                                .mean()
                            )
                            # st.write(
                            #     f"- Applied {smoothing_window}-period rolling average."
                            # )
                        except Exception as e:
                            st.error(f"Failed to apply smoothing: {e}")

                    # Final check on data_for_plot
                    if data_for_plot is None or (
                        hasattr(data_for_plot, "empty") and data_for_plot.empty
                    ):
                        st.error("No data available to plot after processing steps.")
                        st.stop()

                    # --- Phase 4: Build and Display Output ---
                    # st.info("Generating output...")
                    plot_title = st.session_state.get(
                        "plot_title_tab1", "My Data Display"
                    )
                    plot_subtitle = st.session_state.get(
                        "plot_subtitle_tab1", "Generated from uploaded data"
                    )
                    plot_source = st.session_state.get(
                        "plot_source_tab1", "Uploaded Data"
                    )
                    y_prefix = st.session_state.get("y_prefix_tab1", "")
                    y_suffix = st.session_state.get("y_suffix_tab1", "")

                    # --- Retrieve plot date override ---
                    plot_date_override_value = st.session_state.get(
                        "plot_date_override_tab1", ""
                    ).strip()

                    # --- Retrieve conditional axis titles ---
                    current_xaxis_is_date = st.session_state.get(
                        "data_xaxis_is_date_tab1", True
                    )
                    x_axis_title_val = ""
                    y_axis_title_val = ""
                    if not current_xaxis_is_date:
                        x_axis_title_val = st.session_state.get(
                            "plot_xaxis_title_tab1", ""
                        )
                        y_axis_title_val = st.session_state.get(
                            "plot_yaxis_title_tab1", ""
                        )

                    is_plotly_chart = plot_type_display_tab1 != "Table (AG-Grid)"
                    is_aggrid_table = plot_type_display_tab1 == "Table (AG-Grid)"

                    # --- BEGIN ADDITION: Create custom config with watermark settings ---
                    # Build custom config for BWRPlots
                    current_custom_config = {"watermark": {}}

                    # Watermark selection from UI
                    watermark_options = list(
                        DEFAULT_BWR_CONFIG["watermark"]["available_watermarks"].keys()
                    )
                    if watermark_options:  # Check if selectbox was created
                        selected_watermark_label = st.session_state.get(
                            "watermark_svg_select_tab1",
                            (
                                DEFAULT_BWR_CONFIG["watermark"][
                                    "selected_watermark_key"
                                ]
                                if watermark_options
                                else None
                            ),
                        )
                        if (
                            selected_watermark_label
                        ):  # Ensure a selection was made/default exists
                            current_custom_config["watermark"][
                                "selected_watermark_key"
                            ] = selected_watermark_label

                    # Watermark usage toggle from UI
                    current_custom_config["watermark"]["default_use"] = (
                        st.session_state.get("use_watermark_toggle_tab1", True)
                    )

                    # Initialize BWRPlots with the custom config
                    plotter_re_init = BWRPlots(config=current_custom_config)
                    # --- END ADDITION: Create custom config with watermark settings ---

                    if is_aggrid_table:
                        if not isinstance(data_for_plot, pd.DataFrame):
                            st.error("AG-Grid requires DataFrame.")
                            st.stop()

                        # --- MODIFY SOURCE TEXT WITH DATE OVERRIDE IF PROVIDED ---
                        display_source = plot_source
                        if plot_date_override_value:
                            display_source = f"Data as of {plot_date_override_value} | Source: {plot_source}"
                        # --- END MODIFICATION ---

                        render_aggrid_table(
                            df=data_for_plot,
                            title=plot_title,
                            subtitle=plot_subtitle,
                            source=display_source,
                        )
                        csv_bytes = dataframe_to_csv_bytes(data_for_plot)
                        st.download_button(
                            label="Download Table Data as CSV",
                            data=csv_bytes,
                            file_name=f"{plot_title.lower().replace(' ', '_')}_data.csv",
                            mime="text/csv",
                        )

                    elif is_plotly_chart:
                        if plotter_re_init is None:
                            st.error("Plotter instance error.")
                            # Add check for required plotter instance
                            if (
                                "plotter_instance_tab1" not in st.session_state
                                or st.session_state.plotter_instance_tab1 is None
                            ):
                                st.error(
                                    "Plotter not initialized. Please re-upload data."
                                )
                                st.stop()
                            st.stop()
                        with st.spinner("Generating plot..."):
                            # --- Prepare plot-specific arguments ---
                            plot_specific_args = {}
                            if plot_type_display_tab1 == "Metric Share Area Plot":
                                # Get smoothing value from session state for this plot type
                                smoothing_val = st.session_state.get(
                                    "data_smoothing_window_tab1", 0
                                )
                                # Only pass if > 1, as 0 or 1 means no smoothing
                                if smoothing_val > 1:
                                    plot_specific_args["smoothing_window"] = (
                                        smoothing_val
                                    )

                            # Add other plot-specific args here if needed in the future

                            # --- Prepare data and axis options for Secondary Y-Axis ---
                            plot_data_arg = (
                                data_for_plot  # Default to the processed DataFrame
                            )
                            current_local_axis_options = (
                                {}
                            )  # Initialize axis options dict

                            if (
                                plot_type_display_tab1 == "Scatter Plot"
                                and st.session_state.get(
                                    "scatter_enable_secondary_yaxis_tab1", False
                                )
                            ):
                                primary_cols_selected = st.session_state.get(
                                    "scatter_primary_y_cols_tab1", []
                                )
                                secondary_cols_selected = st.session_state.get(
                                    "scatter_secondary_y_cols_tab1", []
                                )

                                if not secondary_cols_selected:
                                    st.error(
                                        "Secondary Y-Axis is enabled, but no columns were selected for it. Please select columns or disable the secondary axis."
                                    )
                                    st.stop()

                                # Ensure no overlap between primary and secondary columns if primary are explicitly selected
                                if primary_cols_selected:
                                    overlap = set(primary_cols_selected) & set(
                                        secondary_cols_selected
                                    )
                                    if overlap:
                                        st.error(
                                            f"Columns {overlap} cannot be in both primary and secondary Y-axes."
                                        )
                                        st.stop()

                                    primary_df_data = data_for_plot[
                                        primary_cols_selected
                                    ]
                                else:
                                    # If no primary columns explicitly selected, use all numeric columns NOT in secondary
                                    all_numeric_cols = data_for_plot.select_dtypes(
                                        include=np.number
                                    ).columns.tolist()
                                    primary_cols_auto = [
                                        col
                                        for col in all_numeric_cols
                                        if col not in secondary_cols_selected
                                    ]
                                    if not primary_cols_auto:
                                        st.error(
                                            "No primary columns available after selecting secondary columns. Please select primary columns explicitly."
                                        )
                                        st.stop()
                                    primary_df_data = data_for_plot[primary_cols_auto]

                                secondary_df_data = data_for_plot[
                                    secondary_cols_selected
                                ]

                                # Preserve original index for both
                                primary_df_data = primary_df_data.set_index(
                                    data_for_plot.index
                                )
                                secondary_df_data = secondary_df_data.set_index(
                                    data_for_plot.index
                                )

                                plot_data_arg = {
                                    "primary": primary_df_data,
                                    "secondary": secondary_df_data,
                                }

                                # Add secondary axis display options
                                current_local_axis_options["secondary_title"] = (
                                    st.session_state.get(
                                        "scatter_secondary_yaxis_title_tab1", ""
                                    )
                                )
                                current_local_axis_options["secondary_prefix"] = (
                                    st.session_state.get(
                                        "scatter_secondary_yaxis_prefix_tab1", ""
                                    )
                                )
                                current_local_axis_options["secondary_suffix"] = (
                                    st.session_state.get(
                                        "scatter_secondary_yaxis_suffix_tab1", ""
                                    )
                                )

                            # --- BEGIN MODIFICATION: Populate column_mappings for Point Scatter Plot ---
                            current_column_mappings = {}  # Initialize as empty

                            if plot_type_display_tab1 == "Point Scatter Plot":
                                # Retrieve selected X and Y columns for Point Scatter
                                selected_x_col = st.session_state.get(
                                    "point_scatter_x_col_tab1", "<None>"
                                )
                                selected_y_col = st.session_state.get(
                                    "point_scatter_y_col_tab1", "<None>"
                                )

                                if (
                                    selected_x_col == "<None>"
                                    or selected_y_col == "<None>"
                                ):
                                    st.error(
                                        "For Point Scatter Plot, please select both an X-axis data column and a Y-axis data column."
                                    )
                                    st.stop()  # Halt execution if columns are not selected

                                current_column_mappings["x_column"] = selected_x_col
                                current_column_mappings["y_column"] = selected_y_col

                                # Add color, symbol, and name column mappings
                                selected_color_col = st.session_state.get(
                                    "point_scatter_color_col_tab1", "<None>"
                                )
                                if selected_color_col != "<None>":
                                    current_column_mappings["color_column"] = (
                                        selected_color_col
                                    )

                            elif plot_type_display_tab1 == "Plotly Table":
                                # For "Plotly Table", no specific column mappings or plot_specific_args are typically needed from UI here.
                                # The `table_plot` method uses its own config.
                                current_column_mappings = (
                                    {}
                                )  # No specific column mappings from UI
                                plot_specific_args = {}  # No specific args from UI here

                            # Determine the correct value for xaxis_is_date based on the UI state
                            if plot_type_display_tab1 == "Point Scatter Plot":
                                # For Point Scatter, "data_xaxis_is_date" checkbox directly controls its X-axis date status
                                current_xaxis_is_date_for_plot = st.session_state.get(
                                    "data_xaxis_is_date_tab1", False
                                )
                            elif plot_type_display_tab1 == "Plotly Table":
                                current_xaxis_is_date_for_plot = False  # Not applicable
                            else:
                                # For other plots, it's based on the generic "Is Date?" checkbox
                                current_xaxis_is_date_for_plot = st.session_state.get(
                                    "data_xaxis_is_date_tab1", True
                                )

                            fig = build_plot(
                                df=plot_data_arg,  # Use the potentially modified plot_data_arg
                                plotter=plotter_re_init,  # Use the re-initialized plotter
                                plot_type_display=plot_type_display_tab1,
                                column_mappings=current_column_mappings,  # MODIFIED: Pass the populated mappings
                                title=plot_title,
                                subtitle=plot_subtitle,
                                source=plot_source,
                                prefix=y_prefix,
                                suffix=y_suffix,
                                xaxis_is_date=current_xaxis_is_date_for_plot,  # Pass the correctly determined value
                                date_override=plot_date_override_value,
                                xaxis_title=x_axis_title_val,
                                yaxis_title=y_axis_title_val,
                                axis_options=current_local_axis_options,  # Pass updated axis options
                                **plot_specific_args,  # Pass the specific args
                            )
                            if fig:
                                plot_html = fig.to_html(
                                    include_plotlyjs="cdn",
                                    full_html=False,
                                    config={"displayModeBar": True},
                                )
                                fig_width = getattr(fig.layout, "width", 1920) or 1920
                                fig_height = getattr(fig.layout, "height", 1080) or 1080
                                # Render plot directly without container wrapper
                                html_to_render = plot_html
                                # Use exact plot height
                                component_height = fig_height
                                st.components.v1.html(
                                    html_to_render,
                                    height=component_height,
                                    scrolling=False,
                                )  # Disable scrolling to remove scrollbars

                except Exception as e:
                    st.error(
                        "An unexpected error occurred during processing or plot generation."
                    )
                    st.exception(e)
        else:
            # Keep the initial message if no data is loaded
            st.info(
                "Upload data and configure settings in the sidebar, then click 'Generate Output'."
            )

# ==============================================================================
# ======================== TAB 2: DEFI LLAMA API EXPLORER ======================
# ==============================================================================
with tab_defi_llama:
    st.header("DeFi Llama API Explorer")
    st.write("Access and download data directly from the DeFi Llama API.")

    @st.cache_resource  # Cache the client instance
    def get_defi_llama_client():
        return defi_llama()

    client = get_defi_llama_client()

    # Dynamically get public methods from the client, excluding some utilities
    available_methods = [
        func
        for func in dir(client)
        if callable(getattr(client, func))
        and not func.startswith("_")
        and func not in ["print_all_functions", "name_to_slug"]
    ]
    method_display_names = {
        method: " ".join(
            word.capitalize() for word in method.replace("_", " ").split(" ")
        )
        for method in available_methods
    }

    selected_display_name = st.selectbox(
        "Select DeFi Llama API Method:",
        list(method_display_names.values()),
        key="defi_llama_method_selector_tab2",
    )

    selected_method_name = None
    for method_name, display_name in method_display_names.items():
        if display_name == selected_display_name:
            selected_method_name = method_name
            break

    api_params = {}  # To store user inputs for parameters
    if selected_method_name:
        method_to_call = getattr(client, selected_method_name)
        sig = inspect.signature(method_to_call)

        st.markdown("---")
        st.subheader(f"Parameters for: `{selected_display_name}`")

        param_cols = st.columns(2)  # Layout parameters in two columns
        col_idx = 0

        for param_name, param_obj in sig.parameters.items():
            if param_name == "self":
                continue

            with param_cols[col_idx % 2]:
                label = param_name.replace("_", " ").capitalize()
                # Try to get help text from docstring (very basic parsing)
                help_text = f"Parameter for {selected_display_name}."
                if method_to_call.__doc__:
                    doc_lines = method_to_call.__doc__.splitlines()
                    for line in doc_lines:
                        if line.strip().startswith(f"{param_name} ("):
                            help_text = line.strip()
                            break

                # Determine input type based on annotation or default value
                if param_obj.annotation == bool or (
                    isinstance(param_obj.default, bool)
                    and param_obj.default is not inspect.Parameter.empty
                ):
                    default_val_bool = (
                        param_obj.default
                        if param_obj.default is not inspect.Parameter.empty
                        else False
                    )
                    api_params[param_name] = st.checkbox(
                        label,
                        value=default_val_bool,
                        key=f"param_{selected_method_name}_{param_name}",
                        help=help_text,
                    )
                elif param_obj.annotation == int or (
                    isinstance(param_obj.default, int)
                    and param_obj.default is not inspect.Parameter.empty
                ):
                    default_val_int = (
                        param_obj.default
                        if param_obj.default is not inspect.Parameter.empty
                        else 0
                    )
                    api_params[param_name] = st.number_input(
                        label,
                        value=default_val_int,
                        step=1,
                        key=f"param_{selected_method_name}_{param_name}",
                        help=help_text,
                    )
                elif param_obj.annotation == float or (
                    isinstance(param_obj.default, float)
                    and param_obj.default is not inspect.Parameter.empty
                ):
                    default_val_float = (
                        param_obj.default
                        if param_obj.default is not inspect.Parameter.empty
                        else 0.0
                    )
                    api_params[param_name] = st.number_input(
                        label,
                        value=default_val_float,
                        format="%.2f",
                        key=f"param_{selected_method_name}_{param_name}",
                        help=help_text,
                    )
                else:  # Default to text input
                    default_val_str = ""
                    if (
                        param_obj.default is not inspect.Parameter.empty
                        and param_obj.default is not None
                    ):
                        default_val_str = str(param_obj.default)
                    placeholder_str = "Enter value"
                    if param_name == "coins":
                        placeholder_str = "e.g., coingecko:bitcoin,ethereum:0x..."
                    elif "chain" in param_name and "slug" not in param_name:
                        placeholder_str = "e.g., ethereum, solana"
                    elif "protocol" in param_name:
                        placeholder_str = "e.g., aave, uniswap"

                    api_params[param_name] = st.text_input(
                        label,
                        value=default_val_str,
                        placeholder=placeholder_str,
                        key=f"param_{selected_method_name}_{param_name}",
                        help=help_text,
                    )
            col_idx += 1
        st.markdown("---")

    if st.button(
        f"Fetch Data: {selected_display_name}", key="fetch_defi_llama_data_button_tab2"
    ):
        if selected_method_name:
            actual_params_to_pass = {}
            method_to_call = getattr(client, selected_method_name)
            sig = inspect.signature(method_to_call)

            for p_name, p_value in api_params.items():
                param_obj = sig.parameters[p_name]
                # Pass parameter if user provided a value OR if it's a boolean (to pass False explicitly)
                # OR if it has a non-None default and user didn't provide a value
                if p_value is not None and p_value != "":
                    actual_params_to_pass[p_name] = p_value
                elif isinstance(p_value, bool):  # Always pass booleans
                    actual_params_to_pass[p_name] = p_value
                elif (
                    param_obj.default is not inspect.Parameter.empty
                    and param_obj.default is not None
                    and p_value == ""
                ):
                    # If user left it blank but there's a default, use default
                    actual_params_to_pass[p_name] = param_obj.default

            with st.spinner(f"Fetching {selected_display_name}..."):
                try:
                    print(
                        f"Calling {selected_method_name} with params: {actual_params_to_pass}"
                    )
                    result = method_to_call(**actual_params_to_pass)
                    st.session_state.defi_llama_result_tab2 = result
                    st.session_state.last_fetched_method_tab2 = selected_display_name
                except Exception as e:
                    st.error(f"Error calling API method {selected_method_name}: {e}")
                    st.exception(e)  # Show full traceback for debugging
                    st.session_state.defi_llama_result_tab2 = {"error": str(e)}
                    st.session_state.last_fetched_method_tab2 = selected_display_name

    # Display results if they exist in session state for the current method
    if (
        "defi_llama_result_tab2" in st.session_state
        and st.session_state.get("last_fetched_method_tab2") == selected_display_name
    ):

        result_tab2 = st.session_state.defi_llama_result_tab2
        st.subheader("API Results:")

        if isinstance(result_tab2, pd.DataFrame):
            if not result_tab2.empty:
                st.dataframe(result_tab2)
                st.download_button(
                    label=f"Download {selected_display_name} as CSV",
                    data=result_tab2.to_csv(
                        index=not isinstance(result_tab2.index, pd.RangeIndex)
                    ).encode("utf-8"),
                    file_name=f"{selected_method_name}_data.csv",
                    mime="text/csv",
                )
            else:
                st.info("The API returned an empty DataFrame.")
        elif isinstance(result_tab2, dict):
            if "error" in result_tab2:
                st.error(f"API Error: {result_tab2['error']}")
            else:
                st.write(
                    "API returned a dictionary. Displaying as JSON and attempting to extract DataFrames:"
                )
                st.json(result_tab2, expanded=False)

                # Attempt to find and display common DataFrame structures within the dictionary
                for key, value in result_tab2.items():
                    if isinstance(value, pd.DataFrame) and not value.empty:
                        with st.expander(f"DataFrame: '{key}'", expanded=True):
                            st.dataframe(value)
                            st.download_button(
                                label=f"Download '{key}' as CSV",
                                data=value.to_csv(
                                    index=not isinstance(value.index, pd.RangeIndex)
                                ).encode("utf-8"),
                                file_name=f"{selected_method_name}_{key}_data.csv",
                                mime="text/csv",
                            )
                    elif isinstance(
                        value, dict
                    ):  # Handle nested dictionaries of DataFrames
                        is_dict_of_dfs = all(
                            isinstance(df_val, pd.DataFrame)
                            for df_val in value.values()
                        )
                        if is_dict_of_dfs:
                            with st.expander(
                                f"Dictionary of DataFrames: '{key}'", expanded=True
                            ):
                                for sub_key, sub_df in value.items():
                                    if (
                                        isinstance(sub_df, pd.DataFrame)
                                        and not sub_df.empty
                                    ):
                                        st.markdown(f"**Sub-DataFrame: `{sub_key}`**")
                                        st.dataframe(sub_df)
                                        st.download_button(
                                            label=f"Download `{key}.{sub_key}` as CSV",
                                            data=sub_df.to_csv(
                                                index=not isinstance(
                                                    sub_df.index, pd.RangeIndex
                                                )
                                            ).encode("utf-8"),
                                            file_name=f"{selected_method_name}_{key}_{sub_key}_data.csv",
                                            mime="text/csv",
                                        )
        elif result_tab2 is None:
            st.info("The API call returned no result (None).")
        else:
            st.write("API returned an unexpected result type:")
            st.write(result_tab2)

# --- Footer ---
# st.divider()
