"""
Data processing service for manipulating dataframes
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta

from .models import DataProcessingConfig


class DataService:
    """Service for data processing operations"""
    
    async def process_data(
        self, 
        df: pd.DataFrame, 
        config: DataProcessingConfig
    ) -> pd.DataFrame:
        """Apply data processing operations to dataframe"""
        
        # Create a copy to avoid modifying original
        processed_df = df.copy()
        
        # Apply operations in order
        processed_df = await self._drop_columns(processed_df, config.drop_columns)
        processed_df = await self._rename_columns(processed_df, config.rename_columns)
        
        if config.pivot_enabled:
            processed_df = await self._pivot_data(
                processed_df,
                config.pivot_index,
                config.pivot_columns,
                config.pivot_values,
                config.pivot_aggfunc
            )
        
        # Date-based processing
        if config.date_column:
            processed_df = await self._process_dates(processed_df, config)
        
        # Resampling
        if config.resample_frequency:
            processed_df = await self._resample_data(
                processed_df,
                config.resample_frequency,
                config.resample_method,
                config.date_column
            )
        
        # Smoothing
        if config.smoothing_window and config.smoothing_window > 1:
            processed_df = await self._smooth_data(
                processed_df,
                config.smoothing_window,
                config.smoothing_method
            )
        
        return processed_df
    
    async def _drop_columns(
        self, 
        df: pd.DataFrame, 
        columns_to_drop: List[str]
    ) -> pd.DataFrame:
        """Drop specified columns from dataframe"""
        if not columns_to_drop:
            return df
        
        # Only drop columns that exist
        existing_cols = [col for col in columns_to_drop if col in df.columns]
        if existing_cols:
            return df.drop(columns=existing_cols)
        
        return df
    
    async def _rename_columns(
        self,
        df: pd.DataFrame,
        rename_map: Dict[str, str]
    ) -> pd.DataFrame:
        """Rename columns in dataframe"""
        if not rename_map:
            return df
        
        # Only rename columns that exist
        valid_renames = {
            old: new for old, new in rename_map.items() 
            if old in df.columns
        }
        
        if valid_renames:
            return df.rename(columns=valid_renames)
        
        return df
    
    async def _pivot_data(
        self,
        df: pd.DataFrame,
        index: Optional[str],
        columns: Optional[str],
        values: Optional[str],
        aggfunc: str = "mean"
    ) -> pd.DataFrame:
        """Pivot dataframe"""
        if not all([index, columns, values]):
            raise ValueError("Pivot requires index, columns, and values to be specified")
        
        # Validate columns exist
        for col, name in [(index, "index"), (columns, "columns"), (values, "values")]:
            if col not in df.columns:
                raise ValueError(f"Pivot {name} column '{col}' not found in data")
        
        # Ensure index column isn't already the dataframe index
        if df.index.name == index:
            df = df.reset_index()
        
        # Perform pivot
        pivoted = pd.pivot_table(
            df,
            index=index,
            columns=columns,
            values=values,
            aggfunc=aggfunc
        )
        
        # Handle MultiIndex columns
        if isinstance(pivoted.columns, pd.MultiIndex):
            pivoted.columns = ['_'.join(map(str, col)).strip() for col in pivoted.columns.values]
        
        return pivoted
    
    async def _process_dates(
        self,
        df: pd.DataFrame,
        config: DataProcessingConfig
    ) -> pd.DataFrame:
        """Process date column and apply date-based filtering"""
        
        date_col = config.date_column
        if date_col not in df.columns:
            return df
        
        # Convert to datetime
        df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        df = df.dropna(subset=[date_col])
        
        # Sort by date
        df = df.sort_values(date_col)
        
        # Apply lookback filter
        if config.lookback_days:
            cutoff_date = df[date_col].max() - timedelta(days=config.lookback_days)
            df = df[df[date_col] >= cutoff_date]
        
        # Apply date range filter
        if config.start_date:
            start = pd.to_datetime(config.start_date)
            df = df[df[date_col] >= start]
        
        if config.end_date:
            end = pd.to_datetime(config.end_date)
            df = df[df[date_col] <= end]
        
        return df
    
    async def _resample_data(
        self,
        df: pd.DataFrame,
        frequency: str,
        method: str = "mean",
        date_column: Optional[str] = None
    ) -> pd.DataFrame:
        """Resample time series data"""
        
        # Determine date column
        if date_column and date_column in df.columns:
            df = df.set_index(date_column)
        elif not isinstance(df.index, pd.DatetimeIndex):
            # Try to find a date column
            date_cols = df.select_dtypes(include=['datetime64']).columns
            if len(date_cols) > 0:
                df = df.set_index(date_cols[0])
            else:
                raise ValueError("No date column found for resampling")
        
        # Get numeric columns only
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) == 0:
            raise ValueError("No numeric columns to resample")
        
        # Resample based on method
        if method == "sum":
            resampled = df[numeric_cols].resample(frequency).sum()
        elif method == "mean":
            resampled = df[numeric_cols].resample(frequency).mean()
        elif method == "median":
            resampled = df[numeric_cols].resample(frequency).median()
        elif method == "min":
            resampled = df[numeric_cols].resample(frequency).min()
        elif method == "max":
            resampled = df[numeric_cols].resample(frequency).max()
        elif method == "first":
            resampled = df[numeric_cols].resample(frequency).first()
        elif method == "last":
            resampled = df[numeric_cols].resample(frequency).last()
        else:
            resampled = df[numeric_cols].resample(frequency).mean()
        
        # Reset index to make date a column again
        resampled = resampled.reset_index()
        
        return resampled
    
    async def _smooth_data(
        self,
        df: pd.DataFrame,
        window: int,
        method: str = "rolling_mean"
    ) -> pd.DataFrame:
        """Apply smoothing to numeric columns"""
        
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if method == "rolling_mean":
                df[col] = df[col].rolling(window=window, min_periods=1).mean()
            elif method == "rolling_median":
                df[col] = df[col].rolling(window=window, min_periods=1).median()
            elif method == "ewm":
                df[col] = df[col].ewm(span=window, min_periods=1).mean()
        
        return df
    
    async def validate_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Validate dataframe and return information"""
        
        info = {
            "shape": list(df.shape),
            "columns": df.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            "memory_usage": float(df.memory_usage(deep=True).sum() / 1024 / 1024),  # MB
            "has_nulls": df.isnull().any().any(),
            "null_counts": df.isnull().sum().to_dict(),
            "numeric_columns": df.select_dtypes(include=[np.number]).columns.tolist(),
            "datetime_columns": df.select_dtypes(include=['datetime64']).columns.tolist(),
            "object_columns": df.select_dtypes(include=['object']).columns.tolist()
        }
        
        # Add date range info for datetime columns
        for col in info["datetime_columns"]:
            info[f"{col}_range"] = {
                "min": df[col].min().isoformat() if pd.notna(df[col].min()) else None,
                "max": df[col].max().isoformat() if pd.notna(df[col].max()) else None
            }
        
        return info