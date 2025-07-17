"""
growthepie API Wrapper
▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬
Class to get a host of functions to access growthepie Layer 2 Data

"""

#############
## Imports ##------------------------------------------------------------------
#############

# # Directory
# import os
# os.chdir(r'C:\Users\dansh\Documents\Investing\ABSTRACTION_CAPITAL\quantitative_trading\src')

# Packages
import pandas as pd
import requests
import matplotlib.pyplot as plt

# # Classes
# from class_velo_api_wrapper import Velo
# from class_data_analysis import data_analysis
# from class_backtest_engine import backtest_engine

# # Initialize Classes
# da = data_analysis()

#%%

class growthepie:

##################
# Initiate Class #-------------------------------------------------------------
##################    
    
    def __init__(self, base_url="https://api.growthepie.xyz/"):
        
        self.base_url = base_url
        
        print("Grow The Pie API Class Loaded")
        
##################
# Core Functions #-------------------------------------------------------------
##################

    def get_master(self):
        """
        Get information on all supported chains and metrics.
        
        Returns:
            dict: JSON response containing meta data like chain names and important links.
        """
        url = f"{self.base_url}v1/master.json"
        response = requests.get(url)
        response.raise_for_status()
        return response.json()
        #----------------------------------------------------------------------
    
    def get_contracts(self, origin_key=None):
        """
        Get all labeled contracts for all covered chains.
        
        Args:
            origin_key (str): If provided, filter the DataFrame to include only rows with this origin_key. Default is None.
        
        Returns:
            pd.DataFrame: DataFrame containing contract details including address, name, project, sub category, and origin.
        """
        url = f"{self.base_url}v1/contracts.json"
        response = requests.get(url)
        response.raise_for_status()
        df = pd.DataFrame(response.json())
        
        if origin_key:
            df = df[df['origin_key'] == origin_key]
        
        return df
        #----------------------------------------------------------------------
    

    def get_fundamentals(self, full=True):
        """
        Get all Layer 2 metrics for all chains on a daily aggregation level.
        
        Args:
            full (bool): If True, fetch the full dataset. Otherwise, fetch the filtered dataset.
        
        Returns:
            pd.DataFrame: DataFrame containing the fundamental metrics.
        """
        if full:
            url = f"{self.base_url}v1/fundamentals_full.json"
        else:
            url = f"{self.base_url}v1/fundamentals.json"
        response = requests.get(url)
        response.raise_for_status()
        return pd.DataFrame(response.json())
        #----------------------------------------------------------------------
    
    def get_metric(self, metric_key, origin_key):
        """
        Visualize data points filtered by metric_key and origin_key.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data to visualize.
            metric_key (str): The metric key to filter on.
            origin_key (str): The origin key to filter on.
        
        Returns:
            None
        """
        df = self.get_fundamentals()
        df_filtered = df[(df['metric_key'] == metric_key) & (df['origin_key'] == origin_key)]
        df_filtered = df_filtered.sort_values('date')
        df_filtered.set_index('date', inplace=True)
        df_filtered = df_filtered[['value']]
        return df_filtered
        #----------------------------------------------------------------------
    
    def plot_metric_share(self, df, metric_key, rolling_avg_days=5, exclude_origins=None):
        """
        Plot a stacked area chart showing each origin's percentage share of a given metric over time
        with a rolling average applied.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data.
            metric_key (str): The metric key to filter on.
            rolling_avg_days (int): The window size for the rolling average. Default is 5 days.
            exclude_origins (list): List of origins to exclude from the plot. Default is None.
        
        Returns:
            pd.DataFrame: The sorted percentage DataFrame used for plotting
        """
        if exclude_origins is None:
            exclude_origins = []
        
        # Filter the DataFrame for the given metric
        metric_df = df[df['metric_key'] == metric_key]

        # Exclude specified origins
        metric_df = metric_df[~metric_df['origin_key'].isin(exclude_origins)]

        # Pivot the DataFrame to get dates as index and origins as columns
        pivot_df = metric_df.pivot(index='date', columns='origin_key', values='value').fillna(0)

        # Apply rolling average
        rolling_df = pivot_df.rolling(window=rolling_avg_days).mean()

        # Normalize each row to get the percentage share
        percentage_df = rolling_df.div(rolling_df.sum(axis=1), axis=0)

        # Sort columns based on the last available value to stack from top to bottom based on current share
        last_values = percentage_df.iloc[-1].sort_values(ascending=False)
        sorted_percentage_df = percentage_df[last_values.index]

        # Plot the stacked area chart
        sorted_percentage_df.plot(kind='area', stacked=True, figsize=(15, 7), title=f'{metric_key} Percentage Share by Origin Over Time (Rolling Average: {rolling_avg_days} days)')
        plt.ylabel('Percentage')
        plt.xlabel('Date')
        plt.legend(title='Origin', bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.show()
        
        return sorted_percentage_df
        #----------------------------------------------------------------------
 
    def get_metric_share(self, df, metric_key, rolling_avg_days=5, exclude_origins=None):
        """
        Plot a stacked area chart showing each origin's percentage share of a given metric over time
        with a rolling average applied.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data.
            metric_key (str): The metric key to filter on.
            rolling_avg_days (int): The window size for the rolling average. Default is 5 days.
            exclude_origins (list): List of origins to exclude from the plot. Default is None.
        
        Returns:
            None
        """
        if exclude_origins is None:
            exclude_origins = []
        
        # Filter the DataFrame for the given metric
        metric_df = df[df['metric_key'] == metric_key]

        # Exclude specified origins
        metric_df = metric_df[~metric_df['origin_key'].isin(exclude_origins)]

        # Pivot the DataFrame to get dates as index and origins as columns
        pivot_df = metric_df.pivot(index='date', columns='origin_key', values='value').fillna(0)

        # Apply rolling average
        rolling_df = pivot_df.rolling(window=rolling_avg_days).mean()

        # Normalize each row to get the percentage share
        percentage_df = rolling_df.div(rolling_df.sum(axis=1), axis=0)

        # Sort columns based on the last available value to stack from top to bottom based on current share
        last_values = percentage_df.iloc[-1].sort_values(ascending=False)
        sorted_percentage_df = percentage_df[last_values.index]

        return sorted_percentage_df
        #----------------------------------------------------------------------
    
###########################
# Visualization Example   #---------------------------------------------------
###########################
    
    def visualize_data(self, metric_key, origin_key):
        """
        Visualize data points filtered by metric_key and origin_key.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data to visualize.
            metric_key (str): The metric key to filter on.
            origin_key (str): The origin key to filter on.
        
        Returns:
            None
        """
        df = self.get_fundamentals()
        df_filtered = df[(df['metric_key'] == metric_key) & (df['origin_key'] == origin_key)]
        df_filtered = df_filtered.sort_values('date')
        df_filtered.plot(x='date', y='value', figsize=(15, 5), title=f'{origin_key.capitalize()} Daily {metric_key.capitalize()}')
        
#####################
# Utility Functions #----------------------------------------------------------
#####################

    def list_unique_metric_keys(self):
        """
        List all unique metric keys in the DataFrame.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data.
        
        Returns:
            list: List of unique metric keys.
        """
        
        df = self.get_fundamentals()    
        return list(df['metric_key'].unique())

    def list_unique_origin_keys(self):
        """
        List all unique metric keys in the DataFrame.
        
        Args:
            df (pd.DataFrame): DataFrame containing the data.
        
        Returns:
            list: List of unique metric keys.
        """
        
        df = self.get_fundamentals()    
        return list(df['origin_key'].unique())


#%% Example Usage:
# gtp = growthepie()

# # # Get master data
# master_data = gtp.get_master()
# print(master_data)

# #%% Contracts

# # # Get contracts data
# contracts_df = gtp.get_contracts('base')
# print(contracts_df)

# #%% Fundamental Data

# # Get fundamentals data (filtered)
# fundamentals_df = gtp.get_fundamentals()
# print(fundamentals_df.head())

# gtp.list_unique_metric_keys()
# gtp.list_unique_origin_keys()

# #%%

# # Visualize data for 'txcount' metric in 'arbitrum'
# gtp.visualize_data(metric_key='fdv_usd', origin_key='optimism')


# #%%
# gtp.plot_metric_share(fundamentals_df, 'txcount', 30, ['ethereum'])

# #%%
# gtp.list_unique_metric_keys()





