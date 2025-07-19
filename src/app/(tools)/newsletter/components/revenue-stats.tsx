'use client'

interface RevenueIndexData {
  date: string
  index_value: number
  index_change: number
  top_protocols: string[]
  total_revenue: number
  protocol_revenues?: any[]
}

interface RevenueStatsProps {
  data: RevenueIndexData[]
}

export default function RevenueStats({ data }: RevenueStatsProps) {
  if (data.length === 0) return null
  
  const latest = data[data.length - 1]
  const previous = data[data.length - 2]
  
  const stats = {
    currentChange: latest.index_change,
    dailyChange: previous ? ((latest.index_value - previous.index_value) / previous.index_value) * 100 : 0,
    totalRevenue: latest.total_revenue,
    topProtocols: latest.top_protocols
  }

  return (
    <div className="grid grid-cols-5 gap-6">
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Period Change</div>
        <div className={`text-2xl font-bold ${stats.currentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {stats.currentChange >= 0 ? '+' : ''}{stats.currentChange.toFixed(2)}%
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Total Revenue (90d)</div>
        <div className="text-lg font-semibold">${(stats.totalRevenue || 0).toLocaleString()}</div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Top 5 Protocols</div>
        <div className="text-xs space-y-1">
          {stats.topProtocols?.slice(0, 5).map((protocol, i) => (
            <div key={i}>{protocol}</div>
          ))}
        </div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Rebalance</div>
        <div className="text-lg font-semibold">Monthly</div>
      </div>
      <div className="text-center">
        <div className="text-sm text-muted-foreground">Protocols</div>
        <div className="text-lg font-semibold">25</div>
      </div>
    </div>
  )
} 