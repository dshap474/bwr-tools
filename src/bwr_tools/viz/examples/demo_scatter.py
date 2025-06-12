# examples/demo_scatter.py
import os, pandas as pd
from pathlib import Path
import sys

# Add the src directory to the Python path to import bwr_tools
# Get the project root (bwr-tools directory)
examples_dir = Path(__file__).resolve().parent
viz_dir = examples_dir.parent
bwr_tools_dir = viz_dir.parent
src_dir = bwr_tools_dir.parent
project_root = src_dir.parent

# Add src to path
sys.path.insert(0, str(src_dir))

from bwr_tools import BWRPlots, round_and_align_dates, save_plot_image

# --- Configuration ---
# Data is in viz/data directory
DATA_DIR = viz_dir / "data"
# Output PNG will also go to data directory
OUTPUT_DIR = DATA_DIR
CSV_FILE = DATA_DIR / "single_time_series_test.csv"

# Create output directory if it doesn't exist
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# --- Initialize Plotter ---
plotter = BWRPlots()

# --- Data Loading and Preparation ---
print(f"Loading data from {CSV_FILE}...")
try:
    # Check if file exists relative to the script's understanding
    if not CSV_FILE.is_file():
        raise FileNotFoundError(f"{CSV_FILE} not found.")

    df = pd.read_csv(CSV_FILE)
    # Parse dates and set index
    df["DATE"] = pd.to_datetime(df["DATE"], utc=True)
    df.set_index("DATE", inplace=True)
    print("Data loaded successfully.")
except FileNotFoundError as e:
    print(f"Error: {e}. Please ensure the data is in the correct location: {DATA_DIR}")
    exit()
except Exception as e:
    print(f"Error loading or parsing data: {e}")
    exit()

# Optional: Select specific columns if needed
df_plot = df[["APY"]]  # Plotting only two series for clarity


# --- Check for environment variable to open browser ---
# By default, open the plot in the web browser unless explicitly disabled via env var
open_browser = os.environ.get("BWR_PLOTS_OPEN_BROWSER", "1") == "1"

# --- Plotting ---
print("Generating scatter plot...")
fig_scatter = plotter.scatter_plot(
    data=df_plot,
    title="SOL Performance vs. BTC and ETH",
    subtitle="SOL has underperformed BTC year-to-date despite its higher risk profile, though it has outperformed ETH by 20%.",
    source="Test Data CSV",
    prefix="$"
)

# Save as PNG
print("Saving plot as PNG...")
png_path = OUTPUT_DIR / "sol_performance_scatter.png"
# Use Plotly's built-in method to save as PNG
fig_scatter.write_image(str(png_path), width=1200, height=800, scale=2)

print(f"Scatter plot PNG saved to: {png_path}")
print("-" * 30)
