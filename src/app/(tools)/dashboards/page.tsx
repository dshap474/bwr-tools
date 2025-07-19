"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { defiLlamaAPI } from "@/lib/api-wrappers/defillama-api-wrapper"

interface DerivativesData {
  name: string;
  totalVolume30d: number;
  totalVolume7d: number;
  dailyVolume: number;
  change_1d?: number;
  change_7d?: number;
  change_30d?: number;
  dominance?: number;
}

export default function DashboardsPage() {
  const [derivativesData, setDerivativesData] = useState<DerivativesData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadDerivativesData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Loading derivatives data...')
      const data = await defiLlamaAPI.getDerivativesOverview("dailyVolume")
      console.log(`✅ Loaded ${data.length} derivatives protocols`)
      
      setDerivativesData(data.slice(0, 10)) // Top 10
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Error loading derivatives data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load derivatives data')
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadDerivativesData()
  }, [])

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

  const formatPercentage = (value: number | undefined) => {
    if (value === undefined) return 'N/A'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Prepare data for charts
  const pieChartData = derivativesData.map((protocol, index) => ({
    name: protocol.name,
    value: protocol.dominance || 0,
    volume: protocol.totalVolume30d,
    color: `hsl(${(index * 360) / derivativesData.length}, 70%, 50%)`
  }))

  const barChartData = derivativesData.map(protocol => ({
    name: protocol.name.length > 12 ? protocol.name.substring(0, 12) + '...' : protocol.name,
    volume30d: protocol.totalVolume30d / 1e9, // Convert to billions
    volume7d: protocol.totalVolume7d / 1e9,
    dailyVolume: protocol.dailyVolume / 1e6 // Convert to millions
  }))

  const totalVolume30d = derivativesData.reduce((sum, protocol) => sum + protocol.totalVolume30d, 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">Perpetual Futures Market Share Dashboard</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Real-time market share analysis of the top perpetual futures protocols by 30-day trading volume
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total 30d Volume</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalVolume30d)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Top Protocol</CardDescription>
            <CardTitle className="text-xl">
              {derivativesData[0]?.name || 'Loading...'}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Market Leader Share</CardDescription>
            <CardTitle className="text-xl">
              {derivativesData[0]?.dominance?.toFixed(1) || '0'}%
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Last Updated</CardDescription>
            <CardTitle className="text-lg">
              {lastUpdated ? lastUpdated.toLocaleTimeString() : 'Never'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Top 10 Perpetual Futures Protocols</h2>
        <Button onClick={loadDerivativesData} disabled={loading}>
          {loading ? "Loading..." : "Refresh Data"}
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="text-red-600 text-center">
              Error: {error}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      {derivativesData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Market Share Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Market Share Distribution</CardTitle>
              <CardDescription>30-day volume market share by protocol</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${Number(value).toFixed(2)}%`, 'Market Share']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Volume Comparison Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Volume Comparison</CardTitle>
              <CardDescription>30-day vs 7-day vs daily volume</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={100}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'dailyVolume') return [`$${Number(value).toFixed(1)}M`, 'Daily Volume']
                        return [`$${Number(value).toFixed(1)}B`, name === 'volume30d' ? '30d Volume' : '7d Volume']
                      }}
                    />
                    <Legend />
                    <Bar dataKey="volume30d" fill="#3B82F6" name="30d Volume (B)" />
                    <Bar dataKey="volume7d" fill="#10B981" name="7d Volume (B)" />
                    <Bar dataKey="dailyVolume" fill="#F59E0B" name="Daily Volume (M)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Protocol Rankings</CardTitle>
          <CardDescription>
            Comprehensive perpetual futures protocol metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading perpetual futures data...
            </div>
          ) : derivativesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3">#</th>
                    <th className="text-left p-3">Protocol</th>
                    <th className="text-right p-3">30d Volume</th>
                    <th className="text-right p-3">7d Volume</th>
                    <th className="text-right p-3">Daily Volume</th>
                    <th className="text-right p-3">Market Share</th>
                    <th className="text-right p-3">1d Change</th>
                    <th className="text-right p-3">7d Change</th>
                  </tr>
                </thead>
                <tbody>
                  {derivativesData.map((protocol, index) => (
                    <tr key={protocol.name} className="border-b hover:bg-muted/30">
                      <td className="p-3 text-muted-foreground">{index + 1}</td>
                      <td className="p-3 font-medium">{protocol.name}</td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(protocol.totalVolume30d)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(protocol.totalVolume7d)}
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatCurrency(protocol.dailyVolume)}
                      </td>
                      <td className="p-3 text-right">
                        <Badge variant="secondary">
                          {protocol.dominance?.toFixed(2) || '0'}%
                        </Badge>
                      </td>
                      <td className={`p-3 text-right ${
                        (protocol.change_1d || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(protocol.change_1d)}
                      </td>
                      <td className={`p-3 text-right ${
                        (protocol.change_7d || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(protocol.change_7d)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Additional Features Section */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Real-Time Data</h3>
          <ul className="space-y-2 text-sm">
            <li>• Live trading volume tracking</li>
            <li>• Market share calculations</li>
            <li>• Performance metrics</li>
            <li>• Protocol rankings</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Market Analysis</h3>
          <ul className="space-y-2 text-sm">
            <li>• 30-day trend analysis</li>
            <li>• Volume distribution</li>
            <li>• Competitive positioning</li>
            <li>• Growth indicators</li>
          </ul>
        </div>

        <div className="border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Data Sources</h3>
          <ul className="space-y-2 text-sm">
            <li>• DeFiLlama API integration</li>
            <li>• Cross-chain aggregation</li>
            <li>• Protocol-specific metrics</li>
            <li>• Historical comparisons</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 