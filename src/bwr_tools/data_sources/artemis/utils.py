"""Utility functions for working with Artemis API responses."""

from typing import Dict, List, Any, Optional
import pandas as pd


def parse_metrics_response(metrics_data: Dict[str, Any]) -> pd.DataFrame:
    """
    Parse the metrics response into a useful DataFrame.
    
    Args:
        metrics_data: Raw metrics response from API
        
    Returns:
        DataFrame with metric information
    """
    if not isinstance(metrics_data, dict) or 'metrics' not in metrics_data:
        return pd.DataFrame()
    
    metrics_list = []
    for metric_dict in metrics_data['metrics']:
        for metric_key, metric_info in metric_dict.items():
            flat_metric = {
                'metric_id': metric_key,
                'label': metric_info.get('label', ''),
                'description': metric_info.get('description', ''),
                'unit': metric_info.get('unit', ''),
                'tags': ', '.join([tag.get('label', '') for tag in metric_info.get('tags', [])]),
                'source': metric_info.get('source', ''),
                'granularity': metric_info.get('cuts', [{}])[0].get('granularity', '') if metric_info.get('cuts') else '',
                'aggregation_type': metric_info.get('aggregation_type', ''),
            }
            metrics_list.append(flat_metric)
    
    return pd.DataFrame(metrics_list)


def filter_metrics_by_tag(metrics_df: pd.DataFrame, tag: str) -> pd.DataFrame:
    """
    Filter metrics DataFrame by tag.
    
    Args:
        metrics_df: DataFrame from parse_metrics_response
        tag: Tag to filter by (e.g., 'Market Data', 'Financial Metrics')
        
    Returns:
        Filtered DataFrame
    """
    return metrics_df[metrics_df['tags'].str.contains(tag, case=False, na=False)]


def get_metric_categories(metrics_df: pd.DataFrame) -> List[str]:
    """
    Get unique categories (tags) from metrics DataFrame.
    
    Args:
        metrics_df: DataFrame from parse_metrics_response
        
    Returns:
        List of unique tags
    """
    all_tags = []
    for tags_str in metrics_df['tags'].dropna():
        all_tags.extend([tag.strip() for tag in tags_str.split(',')])
    return sorted(list(set(all_tags)))


def format_ecosystem_data(ecosystems_data: List[Dict[str, Any]]) -> pd.DataFrame:
    """
    Format ecosystem data into a clean DataFrame.
    
    Args:
        ecosystems_data: Raw ecosystem list from API
        
    Returns:
        Formatted DataFrame
    """
    df = pd.DataFrame(ecosystems_data)
    
    # Clean up the data
    if 'value' in df.columns:
        df['ecosystem_id'] = df['value']
    if 'label' in df.columns:
        df['ecosystem_name'] = df['label']
    
    # Select relevant columns
    cols = ['ecosystem_id', 'ecosystem_name', 'symbol']
    return df[[col for col in cols if col in df.columns]]


def check_api_permissions(client) -> Dict[str, bool]:
    """
    Check which API endpoints are accessible with current permissions.
    
    Args:
        client: ArtemisClient instance
        
    Returns:
        Dictionary mapping endpoint names to availability
    """
    permissions = {}
    
    # Test metadata endpoints
    try:
        client.list_supported_assets()
        permissions['list_assets'] = True
    except:
        permissions['list_assets'] = False
    
    try:
        client.list_available_metrics('BTC')
        permissions['list_metrics'] = True
    except:
        permissions['list_metrics'] = False
    
    try:
        client.list_supported_ecosystems()
        permissions['list_ecosystems'] = True
    except:
        permissions['list_ecosystems'] = False
    
    # Test data endpoints
    try:
        from datetime import datetime, timedelta
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)
        client.fetch_asset_metrics('BTC', 'price', start_date, end_date)
        permissions['fetch_asset_data'] = True
    except:
        permissions['fetch_asset_data'] = False
    
    # Test developer activity endpoints
    try:
        client.fetch_weekly_commits('ethereum', days_back=7)
        permissions['fetch_developer_activity'] = True
    except:
        permissions['fetch_developer_activity'] = False
    
    return permissions


def print_available_metrics(client, asset_id: str = 'BTC'):
    """
    Pretty print available metrics for an asset.
    
    Args:
        client: ArtemisClient instance
        asset_id: Asset to check metrics for
    """
    try:
        metrics_data = client.list_available_metrics(asset_id)
        df = parse_metrics_response(metrics_data)
        
        if df.empty:
            print(f"No metrics found for {asset_id}")
            return
        
        categories = get_metric_categories(df)
        
        print(f"\nAvailable Metrics for {asset_id}:")
        print("=" * 60)
        
        for category in categories:
            if not category:
                continue
            print(f"\n{category}:")
            category_metrics = filter_metrics_by_tag(df, category)
            for _, metric in category_metrics.iterrows():
                print(f"  - {metric['metric_id']}: {metric['label']}")
                if metric['description']:
                    print(f"    {metric['description'][:80]}...")
    except Exception as e:
        print(f"Error fetching metrics: {e}")