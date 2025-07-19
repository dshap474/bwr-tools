'use client'

import { Card, CardContent } from '@/components/ui/card'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RevenueIndexData {
  date: string
  index_value: number
  index_change: number
  top_protocols: string[]
  total_revenue: number
  protocol_revenues?: any[]
}

interface RevenueChartProps {
  data: RevenueIndexData[]
}

export default function RevenueChart({ data }: RevenueChartProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString()
                }}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toFixed(2)}%`, 'Index Change']}
                labelFormatter={(label) => {
                  const date = new Date(label)
                  return date.toLocaleDateString()
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="index_change" 
                stroke="#2563eb" 
                strokeWidth={2}
                name="Top 25 Revenue Index - Market Cap Weighted"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
} 