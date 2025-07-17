"""
Test script for BWR Tools Backend API
Run this after starting the backend to verify it's working
"""

import requests
import json
import pandas as pd
from io import BytesIO

# API base URL
BASE_URL = "http://localhost:8000"

def test_health():
    """Test health endpoint"""
    print("Testing health endpoint...")
    response = requests.get(f"{BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    print()

def test_session_lifecycle():
    """Test session creation and management"""
    print("Testing session lifecycle...")
    
    # Create session
    response = requests.post(f"{BASE_URL}/api/sessions/create")
    session_data = response.json()
    session_id = session_data["session_id"]
    print(f"Created session: {session_id}")
    
    # Get session info
    response = requests.get(f"{BASE_URL}/api/sessions/{session_id}")
    print(f"Session info: {response.json()}")
    
    return session_id

def test_data_upload(session_id):
    """Test data upload"""
    print("\nTesting data upload...")
    
    # Create sample data
    df = pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=30, freq='D'),
        'value1': [i + 10 for i in range(30)],
        'value2': [i * 1.5 + 5 for i in range(30)],
        'category': ['A' if i % 2 == 0 else 'B' for i in range(30)]
    })
    
    # Convert to CSV bytes
    csv_buffer = BytesIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    # Upload
    files = {'file': ('test_data.csv', csv_buffer, 'text/csv')}
    response = requests.post(
        f"{BASE_URL}/api/data/upload/{session_id}",
        files=files
    )
    
    print(f"Upload status: {response.status_code}")
    result = response.json()
    print(f"Data shape: {result.get('shape')}")
    print(f"Columns: {result.get('columns')}")
    print()

def test_plot_generation(session_id):
    """Test plot generation"""
    print("Testing plot generation...")
    
    # Generate line plot
    plot_request = {
        "session_id": session_id,
        "plot_type": "line",
        "configuration": {
            "title": "Test Line Chart",
            "subtitle": "Generated via API",
            "source": "Test Data",
            "x_column": "date",
            "y_column": "value1",
            "x_axis_is_date": True,
            "y_prefix": "$"
        }
    }
    
    response = requests.post(
        f"{BASE_URL}/api/plots/generate",
        json=plot_request
    )
    
    print(f"Plot generation status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"Success: {result.get('success')}")
        print(f"Plot ID: {result.get('plot_id')}")
        print(f"Data points: {result.get('data_points')}")
    else:
        print(f"Error: {response.text}")
    print()

def test_plot_types():
    """Test getting available plot types"""
    print("Testing plot types endpoint...")
    response = requests.get(f"{BASE_URL}/api/plots/types")
    plot_types = response.json()
    print(f"Available plot types: {len(plot_types)}")
    for pt in plot_types[:3]:  # Show first 3
        print(f"- {pt['name']}: {pt['description']}")
    print()

def test_defillama_methods():
    """Test DeFi Llama methods"""
    print("Testing DeFi Llama methods...")
    response = requests.get(f"{BASE_URL}/api/defillama/methods")
    methods = response.json()
    print(f"Available DeFi Llama methods: {len(methods)}")
    for method in methods[:5]:  # Show first 5
        print(f"- {method['display_name']}: {method['name']}")
    print()

def main():
    """Run all tests"""
    print("BWR Tools Backend API Test")
    print("=" * 50)
    
    try:
        # Test health
        test_health()
        
        # Test session lifecycle
        session_id = test_session_lifecycle()
        
        # Test data upload
        test_data_upload(session_id)
        
        # Test plot generation
        test_plot_generation(session_id)
        
        # Test plot types
        test_plot_types()
        
        # Test DeFi Llama
        test_defillama_methods()
        
        print("\nAll tests completed successfully!")
        
    except requests.exceptions.ConnectionError:
        print("\nError: Could not connect to API. Make sure the backend is running on http://localhost:8000")
    except Exception as e:
        print(f"\nError during testing: {e}")

if __name__ == "__main__":
    main()