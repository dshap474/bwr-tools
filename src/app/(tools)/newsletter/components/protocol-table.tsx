'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { protocolMappingService } from '@/lib/services/protocol-mapping-service'
import type { ProtocolMappingResult } from '@/lib/api-wrappers/coingecko-api-wrapper'

interface ProtocolRevenue {
  name: string
  slug: string
  quarterly_revenue: number
  monthly_revenue?: number
  market_cap: number
  weight: number
  token?: string
  coingecko_id?: string | null
  mapping_confidence?: number
  mapping_status?: 'success' | 'partial' | 'failed'
  match_method?: string
  defillama_slug?: string | null
  defillama_name?: string | null
  is_tokenless?: boolean
}

interface ProtocolTableProps {
  protocols: ProtocolRevenue[]
}

type TableTab = 'revenue'

export default function ProtocolTable({ protocols }: ProtocolTableProps) {
  const [activeTab, setActiveTab] = useState<TableTab>('revenue')
  const [enhancedProtocols, setEnhancedProtocols] = useState<ProtocolRevenue[]>(protocols)
  const [mappingStats, setMappingStats] = useState<any>(null)

  // Enhance protocols with DeFiLlama data and additional mapping info on mount
  useEffect(() => {
    const enhanceProtocols = async () => {
      console.log('🔧 Enhancing protocols with comprehensive mapping data...')
      
      const enhanced = await Promise.all(
        protocols.map(async (protocol) => {
          try {
            // Get DeFiLlama data from the mapping service
            const defillamaSlug = protocolMappingService.getDeFiLlamaSlug(protocol.name)
            const defillamaName = protocolMappingService.getDeFiLlamaName(protocol.name)
            
            // Get CoinGecko ID from mapping service (synchronously from cache)
            const coingeckoId = protocolMappingService.getCoinGeckoId(protocol.name)
            
            // Check if protocol is tokenless using the mapping service
            const isTokenless = protocolMappingService.isTokenlessProtocol(protocol.name) ||
                              protocolMappingService.isTokenlessProtocol(protocol.name.replace(/\s+(AMM|V3|Spot Orderbook|Slipstream)/i, ''))
            
            return {
              ...protocol,
              defillama_slug: defillamaSlug,
              defillama_name: defillamaName,
              coingecko_id: coingeckoId,
              is_tokenless: isTokenless
            }
          } catch (error) {
            console.warn(`Failed to enhance protocol ${protocol.name}:`, error)
            return protocol
          }
        })
      )
      
      setEnhancedProtocols(enhanced)
      
      // Get and set mapping statistics
      const stats = protocolMappingService.getMappingStatistics()
      setMappingStats(stats)
      
      console.log(`✅ Enhanced ${enhanced.length} protocols with DeFiLlama and CoinGecko data`)
    }

    if (protocols.length > 0) {
      enhanceProtocols()
    }
  }, [protocols])

  const formatCurrency = (value: number) => {
    if (value === 0) return 'N/A'
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`
    } else {
      return `$${value.toFixed(2)}`
    }
  }

  const getStatusBadge = (protocol: ProtocolRevenue) => {
    if (protocol.is_tokenless) {
      return <Badge variant="secondary" className="text-xs">Tokenless</Badge>
    }
    
    switch (protocol.mapping_status) {
      case 'success':
        return <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Success</Badge>
      case 'partial':
        return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">Partial</Badge>
      case 'failed':
        return <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">Unknown</Badge>
    }
  }

  const renderRevenueTable = () => (
    <div className="max-h-[800px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="text-left p-2 font-medium">#</th>
            <th className="text-left p-2 font-medium">Protocol</th>
            <th className="text-left p-2 font-medium">Token</th>
            <th className="text-left p-2 font-medium">CoinGecko ID</th>
            <th className="text-right p-2 font-medium">Market Cap</th>
            <th className="text-right p-2 font-medium">Revenue 30D</th>
            <th className="text-right p-2 font-medium">Revenue 90D</th>
          </tr>
        </thead>
        <tbody>
          {enhancedProtocols.slice(0, 50).map((protocol, index) => (
            <tr key={index} className="border-b hover:bg-muted/30">
              <td className="p-2 text-muted-foreground">{index + 1}</td>
              <td className="p-2 font-medium">
                <div className="flex flex-col">
                  <span>{protocol.name}</span>
                  {protocol.defillama_name && protocol.defillama_name !== protocol.name && (
                    <span className="text-xs text-muted-foreground">
                      DeFiLlama: {protocol.defillama_name}
                    </span>
                  )}
                </div>
              </td>
              <td className="p-2">
                {protocol.token ? (
                  <span className="font-medium text-foreground">
                    {protocol.token}
                  </span>
                ) : protocol.is_tokenless ? (
                  <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded">
                    Tokenless
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="p-2">
                {protocol.coingecko_id ? (
                  <span className="text-xs font-mono text-foreground">
                    {protocol.coingecko_id}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">N/A</span>
                )}
              </td>
              <td className="p-2 text-right">
                {formatCurrency(protocol.market_cap)}
              </td>
              <td className="p-2 text-right">
                {protocol.monthly_revenue ? formatCurrency(protocol.monthly_revenue) : formatCurrency(protocol.quarterly_revenue / 3)}
              </td>
              <td className="p-2 text-right">
                {formatCurrency(protocol.quarterly_revenue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top 50 Protocols</CardTitle>
        <CardDescription>
          Revenue Data - Market Cap Weighted | 
          {enhancedProtocols.filter(p => p.mapping_status === 'success').length}/{Math.min(enhancedProtocols.length, 50)} successful mappings
          {enhancedProtocols.some(p => p.defillama_slug) && (
            <span className="ml-2 text-blue-600">
              • Enhanced with DeFiLlama mappings
            </span>
          )}
        </CardDescription>
        
        {/* Tab Navigation */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'revenue'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Revenue
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {activeTab === 'revenue' && renderRevenueTable()}
      </CardContent>
    </Card>
  )
} 