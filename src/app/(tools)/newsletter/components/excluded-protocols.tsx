'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ExcludedProtocolsProps {
  excludedProtocols: string[]
}

interface ProtocolCategory {
  protocol: string
  category: 'Stablecoin' | 'Wallet/Infrastructure' | 'Exchange' | 'Other'
  reason: string
}

export default function ExcludedProtocols({ excludedProtocols }: ExcludedProtocolsProps) {
  // Enhanced categorization of excluded protocols
  const categorizeProtocol = (protocol: string): ProtocolCategory => {
    const protocolLower = protocol.toLowerCase()
    
    if (protocolLower.includes('tether') || protocolLower.includes('usdt')) {
      return {
        protocol,
        category: 'Stablecoin',
        reason: 'Stable value asset, not suitable for growth index'
      }
    }
    
    if (protocolLower.includes('circle') || protocolLower.includes('usdc')) {
      return {
        protocol,
        category: 'Stablecoin', 
        reason: 'Stable value asset, not suitable for growth index'
      }
    }
    
    if (protocolLower.includes('phantom') || protocolLower.includes('wallet')) {
      return {
        protocol,
        category: 'Wallet/Infrastructure',
        reason: 'Infrastructure service, not revenue-generating protocol'
      }
    }
    
    if (protocolLower.includes('coinbase') && protocolLower.includes('wallet')) {
      return {
        protocol,
        category: 'Wallet/Infrastructure',
        reason: 'Wallet service, focus on tradeable protocol tokens'
      }
    }
    
    if (protocolLower.includes('metamask')) {
      return {
        protocol,
        category: 'Wallet/Infrastructure',
        reason: 'Browser wallet, not a tradeable protocol token'
      }
    }
    
    if (protocolLower.includes('axiom')) {
      return {
        protocol,
        category: 'Wallet/Infrastructure',
        reason: 'Infrastructure service, not suitable for revenue index'
      }
    }
    
    if (protocolLower.includes('trojan')) {
      return {
        protocol,
        category: 'Wallet/Infrastructure',
        reason: 'Infrastructure service, not suitable for revenue index'
      }
    }
    
    if (protocolLower.includes('gmgn')) {
      return {
        protocol,
        category: 'Other',
        reason: 'Trading tool, not a tradeable protocol token'
      }
    }
    
    if (protocolLower.includes('bloom trading bot')) {
      return {
        protocol,
        category: 'Other',
        reason: 'Trading bot service, not a tradeable protocol token'
      }
    }
    
    return {
      protocol,
      category: 'Other',
      reason: 'Does not meet index criteria for revenue-generating protocols'
    }
  }

  const categorizedProtocols = excludedProtocols.map(categorizeProtocol)
  
  // Get category badge styling
  const getCategoryBadgeClass = (category: ProtocolCategory['category']): string => {
    switch (category) {
      case 'Stablecoin':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Wallet/Infrastructure':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'Exchange':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'Other':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Excluded Protocols</CardTitle>
        <CardDescription>
          Protocols excluded from index • {categorizedProtocols.length} protocols filtered
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {categorizedProtocols.map((item, index) => (
            <div key={index} className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.protocol}</span>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getCategoryBadgeClass(item.category)}`}
                >
                  {item.category}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.reason}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm font-medium text-blue-900 mb-1">
            Index Focus
          </div>
          <div className="text-xs text-blue-800">
            Excluded protocols are filtered out before ranking. Index focuses on revenue-generating 
            protocols with tradeable tokens, excluding wallets, infrastructure, stablecoins, and 
            other non-qualifying assets.
          </div>
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground">
          <strong>Categories:</strong> Protocols are automatically categorized and excluded 
          based on their primary function and token characteristics.
        </div>
      </CardContent>
    </Card>
  )
} 