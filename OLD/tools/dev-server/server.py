"""
Python Comparison Server
---
bwr-tools/tools/dev-server/server.py
---
Development server that generates plots using the original bwr_plots Python library
for visual comparison with the TypeScript implementation.
"""

import sys
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
from io import BytesIO
import json

# Add the bwr-plots source to Python path
sys.path.insert(0, os.path.abspath('../../reference/bwr-plots/src'))

try:
    from bwr_plots import BWRPlots
except ImportError:
    print("Error: Could not import bwr_plots. Make sure bwr-plots is available.")
    print("Expected path: ../../reference/bwr-plots/src/bwr_plots")
    sys.exit(1)

app = Flask(__name__)
CORS(app)

# Initialize BWR Plots
bwr = BWRPlots()

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'bwr_plots': 'loaded'})

@app.route('/generate', methods=['POST'])
def generate_plot():
    """Generate a plot using Python bwr_plots library"""
    try:
        data = request.json
        
        plot_type = data.get('type')
        plot_data = data.get('data')
        config = data.get('config', {})
        
        # Map plot types to BWR methods
        plot_methods = {
            'scatter': bwr.scatter_plot,
            'bar': bwr.bar_chart,
            'horizontal_bar': bwr.horizontal_bar,
            'multi_bar': bwr.multi_bar,
            'stacked_bar': bwr.stacked_bar_chart,
            'metric_share_area': bwr.metric_share_area_plot,
            'table': bwr.table_plot,
        }
        
        if plot_type not in plot_methods:
            return jsonify({'error': f'Unknown plot type: {plot_type}'}), 400
        
        # Generate the plot
        plot_method = plot_methods[plot_type]
        
        # Convert data to pandas DataFrame if needed
        import pandas as pd
        if isinstance(plot_data, list) and len(plot_data) > 0:
            df = pd.DataFrame(plot_data)
        elif isinstance(plot_data, dict):
            df = pd.DataFrame(plot_data)
        else:
            df = plot_data
        
        # Generate the figure
        if plot_type == 'scatter':
            # Handle scatter plot specific parameters
            title = config.get('title', '')
            subtitle = config.get('subtitle', '')
            fig = plot_method(df, title=title, subtitle=subtitle)
        elif plot_type in ['bar', 'horizontal_bar']:
            # Handle bar chart specific parameters
            x_column = config.get('x_column', config.get('xColumn'))
            y_column = config.get('y_column', config.get('yColumn'))
            title = config.get('title', '')
            subtitle = config.get('subtitle', '')
            
            if not x_column or not y_column:
                # If specific columns not provided, try to infer from data
                if len(df.columns) >= 2:
                    x_column = df.columns[0]
                    y_column = df.columns[1]
                else:
                    raise ValueError("Bar chart requires at least 2 columns or explicit x_column/y_column specification")
            
            # Call with appropriate parameters based on bwr_plots API
            if plot_type == 'horizontal_bar':
                fig = plot_method(df, x_column, y_column, title=title, subtitle=subtitle)
            else:
                fig = plot_method(df, x_column, y_column, title=title, subtitle=subtitle)
        else:
            # Handle other plot types
            fig = plot_method(df, **config)
        
        # Convert to PNG
        img_bytes = fig.to_image(format='png', width=1920, height=1080)
        img_base64 = base64.b64encode(img_bytes).decode('utf-8')
        
        # Get Plotly JSON (as string, not dict to avoid serialization issues)
        plotly_json = fig.to_json()
        
        return jsonify({
            'success': True,
            'image': img_base64,
            'plotly_json': plotly_json,
            'plot_type': plot_type,
            'data_shape': df.shape if hasattr(df, 'shape') else None
        })
        
    except Exception as e:
        import traceback
        return jsonify({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/config', methods=['GET'])
def get_config():
    """Get the default BWR configuration"""
    try:
        from bwr_plots.config import DEFAULT_BWR_CONFIG
        return jsonify({
            'success': True,
            'config': DEFAULT_BWR_CONFIG
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting BWR Python Comparison Server...")
    print("Make sure bwr-plots is available at: ../../../bwr-plots")
    app.run(host='0.0.0.0', port=5001, debug=True)