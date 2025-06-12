"""
Quick examples to demonstrate the DeFi Llama module
"""
from bwr_tools.data_sources.defillama import DefiLlama


def example_tvl_analysis():
    """Example: Analyze TVL data"""
    dl = DefiLlama()
    
    # Get top protocols
    protocols = dl.get_all_protocols()
    print("Top 5 DeFi Protocols by TVL:")
    print("-" * 50)
    
    for i, row in protocols.head(5).iterrows():
        print(f"{i+1}. {row['name']}")
        print(f"   TVL: ${row['tvl']:,.0f}")
        print(f"   Market Share: {row['market_share']:.2f}%")
        print()


def example_stablecoin_analysis():
    """Example: Analyze stablecoin data"""
    dl = DefiLlama()
    
    # Get stablecoin data
    stables = dl.get_stablecoin_circulating_supply()
    print("\nTop 5 Stablecoins by Market Cap:")
    print("-" * 50)
    
    for i, row in stables.head(5).iterrows():
        print(f"{i+1}. {row['name']} ({row['symbol']})")
        print(f"   Circulating: ${row['circulating_total']:,.0f}")
        print(f"   Peg Type: {row['pegType']}")
        print()


def example_chain_analysis():
    """Example: Analyze chain TVL data"""
    dl = DefiLlama()
    
    # Get chain data
    chains = dl.get_all_chains_tvl()
    print("\nTop 5 Chains by TVL:")
    print("-" * 50)
    
    for i, row in chains.head(5).iterrows():
        print(f"{i+1}. {row['name']}")
        print(f"   TVL: ${row['tvl']:,.0f}")
        print(f"   Market Share: {row['market_share']:.2f}%")
        print()


if __name__ == "__main__":
    print("DeFi Llama Module Examples")
    print("=" * 50)
    
    try:
        example_tvl_analysis()
        example_stablecoin_analysis()
        example_chain_analysis()
    except Exception as e:
        print(f"Error running examples: {e}")
        print("Make sure you have an internet connection and the API is accessible.")