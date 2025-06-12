"""
Example test script to demonstrate module usage
"""
import os
from bwr_tools.data_sources.defillama import DefiLlama


def test_basic_functionality():
    """Test basic DeFi Llama functionality"""
    
    # Initialize client
    dl = DefiLlama()
    print("DeFi Llama client initialized successfully")
    
    # Test 1: Get top protocols
    print("\n1. Testing get_all_protocols()...")
    protocols = dl.get_all_protocols()
    if not protocols.empty:
        print(f"✓ Retrieved {len(protocols)} protocols")
        print(f"✓ Top protocol: {protocols.iloc[0]['name']} with TVL ${protocols.iloc[0]['tvl']:,.0f}")
    else:
        print("✗ Failed to retrieve protocols")
    
    # Test 2: Get chain TVL
    print("\n2. Testing get_all_chains_tvl()...")
    chains = dl.get_all_chains_tvl()
    if not chains.empty:
        print(f"✓ Retrieved {len(chains)} chains")
        print(f"✓ Top chain: {chains.iloc[0]['name']} with TVL ${chains.iloc[0]['tvl']:,.0f}")
    else:
        print("✗ Failed to retrieve chains")
    
    # Test 3: Get stablecoin data
    print("\n3. Testing get_stablecoin_circulating_supply()...")
    stables = dl.get_stablecoin_circulating_supply()
    if not stables.empty:
        print(f"✓ Retrieved {len(stables)} stablecoins")
        top_stable = stables.iloc[0]
        print(f"✓ Top stablecoin: {top_stable['symbol']} with ${top_stable['circulating_total']:,.0f}")
    else:
        print("✗ Failed to retrieve stablecoins")
    
    # Test 4: Save sample data
    print("\n4. Testing data export...")
    data_dir = os.path.join(os.path.dirname(__file__), '..', 'data')
    os.makedirs(data_dir, exist_ok=True)
    
    if not protocols.empty:
        output_file = os.path.join(data_dir, 'sample_protocols.csv')
        protocols.head(10).to_csv(output_file, index=False)
        print(f"✓ Saved top 10 protocols to {output_file}")
    
    print("\n✅ All tests completed!")


if __name__ == "__main__":
    print("Running DeFi Llama module tests...\n")
    test_basic_functionality()