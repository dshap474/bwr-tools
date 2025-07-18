"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { defiLlamaAPI } from "@/lib/api-wrappers/defillama-api-wrapper"

interface ProtocolData {
  name: string;
  slug: string;
  tvl: number;
  mcap?: number;
  market_share?: number;
  change_1h?: number;
  change_1d?: number;
  change_7d?: number;
}

interface ChainData {
  name: string;
  tvl: number;
  market_share?: number;
}

interface StablecoinData {
  id: number;
  name: string;
  symbol: string;
  circulating_total: number;
  pegType: string;
}

export default function DefiLlamaPage() {
  const [protocols, setProtocols] = useState<ProtocolData[]>([])
  const [chains, setChains] = useState<ChainData[]>([])
  const [stablecoins, setStablecoins] = useState<StablecoinData[]>([])
  const [activeTab, setActiveTab] = useState<'protocols' | 'chains' | 'stablecoins'>('protocols')
  const [loading, setLoading] = useState({
    protocols: false,
    chains: false,
    stablecoins: false,
  })

  const loadProtocols = async () => {
    setLoading(prev => ({ ...prev, protocols: true }))
    try {
      const data = await defiLlamaAPI.getAllProtocols()
      setProtocols(data.slice(0, 20)) // Show top 20
    } catch (error) {
      console.error('Error loading protocols:', error)
    } finally {
      setLoading(prev => ({ ...prev, protocols: false }))
    }
  }

  const loadChains = async () => {
    setLoading(prev => ({ ...prev, chains: true }))
    try {
      const data = await defiLlamaAPI.getAllChainsTVL()
      setChains(data.slice(0, 15)) // Show top 15
    } catch (error) {
      console.error('Error loading chains:', error)
    } finally {
      setLoading(prev => ({ ...prev, chains: false }))
    }
  }

  const loadStablecoins = async () => {
    setLoading(prev => ({ ...prev, stablecoins: true }))
    try {
      const data = await defiLlamaAPI.getStablecoinCirculatingSupply()
      setStablecoins(data.slice(0, 15)) // Show top 15
    } catch (error) {
      console.error('Error loading stablecoins:', error)
    } finally {
      setLoading(prev => ({ ...prev, stablecoins: false }))
    }
  }

  const formatCurrency = (value: number) => {
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`
    }
    return `$${value.toFixed(2)}`
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">DeFiLlama Analytics</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Advanced DeFi data analysis and visualization tool. Access comprehensive 
          protocol data and create insightful visualizations for the decentralized finance ecosystem.
        </p>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex space-x-1 bg-muted rounded-lg p-1">
          <Button
            variant={activeTab === 'protocols' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('protocols')}
            className="px-6"
          >
            Top Protocols
          </Button>
          <Button
            variant={activeTab === 'chains' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('chains')}
            className="px-6"
          >
            Blockchain Chains
          </Button>
          <Button
            variant={activeTab === 'stablecoins' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('stablecoins')}
            className="px-6"
          >
            Stablecoins
          </Button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'protocols' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Top DeFi Protocols by TVL</h2>
            <Button 
              onClick={loadProtocols}
              disabled={loading.protocols}
            >
              {loading.protocols ? "Loading..." : "Load Data"}
            </Button>
          </div>
          
          <div className="grid gap-4">
            {protocols.map((protocol, index) => (
              <Card key={protocol.slug}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-lg font-medium">#{index + 1}</span>
                        {protocol.name}
                      </CardTitle>
                      <CardDescription>
                        TVL: {formatCurrency(protocol.tvl)}
                      </CardDescription>
                    </div>
                    <div className="text-right space-y-1">
                      {protocol.market_share && (
                        <Badge variant="secondary">
                          {protocol.market_share.toFixed(2)}% market share
                        </Badge>
                      )}
                      {protocol.change_1d && (
                        <div className={`text-sm ${protocol.change_1d >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {protocol.change_1d >= 0 ? '+' : ''}{protocol.change_1d.toFixed(2)}% (24h)
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                {protocol.mcap && (
                  <CardContent>
                    <div className="text-sm text-muted-foreground">
                      Market Cap: {formatCurrency(protocol.mcap)}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'chains' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Blockchain Chains by TVL</h2>
            <Button 
              onClick={loadChains}
              disabled={loading.chains}
            >
              {loading.chains ? "Loading..." : "Load Data"}
            </Button>
          </div>
          
          <div className="grid gap-4">
            {chains.map((chain, index) => (
              <Card key={chain.name}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-lg font-medium">#{index + 1}</span>
                        {chain.name}
                      </CardTitle>
                      <CardDescription>
                        TVL: {formatCurrency(chain.tvl)}
                      </CardDescription>
                    </div>
                    {chain.market_share && (
                      <Badge variant="secondary">
                        {chain.market_share.toFixed(2)}% of total TVL
                      </Badge>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'stablecoins' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Top Stablecoins by Supply</h2>
            <Button 
              onClick={loadStablecoins}
              disabled={loading.stablecoins}
            >
              {loading.stablecoins ? "Loading..." : "Load Data"}
            </Button>
          </div>
          
          <div className="grid gap-4">
            {stablecoins.map((stablecoin, index) => (
              <Card key={stablecoin.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <span className="text-lg font-medium">#{index + 1}</span>
                        {stablecoin.name}
                        <Badge variant="outline">{stablecoin.symbol}</Badge>
                      </CardTitle>
                      <CardDescription>
                        Circulating Supply: {formatCurrency(stablecoin.circulating_total)}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {stablecoin.pegType}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Protocol Analytics</h3>
          <ul className="space-y-2 text-sm">
            <li>• Real-time TVL tracking</li>
            <li>• Protocol rankings</li>
            <li>• Category breakdowns</li>
            <li>• Chain distribution</li>
            <li>• Historical performance</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Market Insights</h3>
          <ul className="space-y-2 text-sm">
            <li>• Market share analysis</li>
            <li>• Trend identification</li>
            <li>• Correlation studies</li>
            <li>• Volume tracking</li>
            <li>• Yield analysis</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Chain Analysis</h3>
          <ul className="space-y-2 text-sm">
            <li>• Cross-chain comparisons</li>
            <li>• Bridge flow tracking</li>
            <li>• Network TVL distribution</li>
            <li>• Gas fee analysis</li>
            <li>• Ecosystem growth metrics</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Visualization Tools</h3>
          <ul className="space-y-2 text-sm">
            <li>• Interactive charts</li>
            <li>• Customizable dashboards</li>
            <li>• Time series analysis</li>
            <li>• Heatmap visualizations</li>
            <li>• Comparative analysis</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Data Export</h3>
          <ul className="space-y-2 text-sm">
            <li>• CSV data downloads</li>
            <li>• API integration</li>
            <li>• Historical snapshots</li>
            <li>• Custom reports</li>
            <li>• Scheduled exports</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Advanced Features</h3>
          <ul className="space-y-2 text-sm">
            <li>• Alert notifications</li>
            <li>• Portfolio tracking</li>
            <li>• Risk assessment</li>
            <li>• Backtesting tools</li>
            <li>• Predictive analytics</li>
          </ul>
        </div>
      </div>

      {/* Data Sources */}
      <div className="border rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold">Data Sources & Coverage</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium mb-2">Supported Protocols</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Access data from 2000+ DeFi protocols across all major chains
            </p>
            <ul className="space-y-1 text-sm">
              <li>• DEXs & AMMs (Uniswap, SushiSwap, PancakeSwap)</li>
              <li>• Lending platforms (Aave, Compound, Maker)</li>
              <li>• Yield farming protocols</li>
              <li>• Cross-chain bridges</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Supported Chains</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Comprehensive coverage across 100+ blockchain networks
            </p>
            <ul className="space-y-1 text-sm">
              <li>• Ethereum, Binance Smart Chain, Polygon</li>
              <li>• Avalanche, Fantom, Arbitrum, Optimism</li>
              <li>• Solana, Terra, Cosmos ecosystem</li>
              <li>• Layer 2 solutions and sidechains</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Getting Started */}
      <div className="border rounded-lg p-8 text-center space-y-6">
        <h2 className="text-2xl font-semibold">Start Analyzing DeFi Data</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Dive into comprehensive DeFi analytics and uncover insights 
          across protocols, chains, and market trends.
        </p>
        <Button size="lg" className="px-8">
          Launch DeFi Dashboard
        </Button>
      </div>
    </div>
  )
}