'use client'

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'

interface ForexData {
  invoice: string; marketRate: string; effectiveRate: string;
  leakagePercent: string; date: string;
}

export function ForexChart({ data }: { data: ForexData[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? '#374151' : '#e2e8f0'
  const tickColor = isDark ? '#9ca3af' : '#64748b'
  const sortedData = [...data].reverse()

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis dataKey="invoice" tick={{ fontSize: 10, fill: tickColor }} />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const d = payload[0].payload
              return (
                <div className="bg-card border rounded-lg shadow-lg p-3 text-xs">
                  <p className="font-bold border-b border-border mb-2 pb-1 text-foreground">
                    {d.invoice} ({d.date})
                  </p>
                  <p className="text-muted-foreground font-medium">Market Rate: ₹{d.marketRate}</p>
                  <p className="text-blue-500 font-medium">Your Rate: ₹{d.effectiveRate}</p>
                  <p className="text-red-500 font-bold mt-1">Loss: {d.leakagePercent}%</p>
                </div>
              )
            }
            return null
          }}
        />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          wrapperStyle={{ color: tickColor, fontSize: '12px' }}
        />
        <Area
          type="monotone"
          dataKey="marketRate"
          stroke="#94a3b8"
          fill={isDark ? 'rgba(148,163,184,0.1)' : '#f1f5f9'}
          name="Market Mid-Rate"
        />
        <Area
          type="monotone"
          dataKey="effectiveRate"
          stroke="#ef4444"
          fill={isDark ? 'rgba(239,68,68,0.1)' : '#fee2e2'}
          name="Your Received Rate"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
