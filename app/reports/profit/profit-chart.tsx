'use client'

import {
  ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useTheme } from 'next-themes'

interface ProfitData { month: string; income: number; expenses: number; profit: number }

interface TooltipPayloadEntry {
  value: number; name: string; color: string; dataKey: string; payload: ProfitData
}
interface CustomTooltipProps {
  active?: boolean; payload?: TooltipPayloadEntry[]; label?: string
}

export function ProfitChart({ data }: { data: ProfitData[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? '#374151' : '#e2e8f0'
  const tickColor = isDark ? '#9ca3af' : '#64748b'

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length >= 2) {
      const incomeValue  = payload[0].value
      const expenseValue = payload[1].value
      const netProfit    = incomeValue - expenseValue

      return (
        <div className="bg-card border rounded-lg shadow-lg p-4 space-y-2">
          <p className="font-bold text-foreground border-b border-border pb-1">{label}</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-blue-500 font-medium">Income:</span>
              <span className="font-mono text-foreground">₹{incomeValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-red-500 font-medium">Expenses:</span>
              <span className="font-mono text-foreground">₹{expenseValue.toLocaleString('en-IN')}</span>
            </div>
            <div className={`pt-1 border-t border-border flex justify-between gap-8 font-bold ${
              netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <span>Net Profit:</span>
              <span>₹{netProfit.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridColor} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `₹${value / 1000}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          align="right"
          height={36}
          wrapperStyle={{ color: tickColor, fontSize: '12px' }}
        />
        <Area
          type="monotone"
          dataKey="income"
          fill="#3b82f6"
          fillOpacity={isDark ? 0.15 : 0.1}
          stroke="#3b82f6"
          strokeWidth={2}
          name="Income"
        />
        <Line
          type="monotone"
          dataKey="expenses"
          stroke="#ef4444"
          strokeWidth={3}
          dot={{ r: 4, fill: '#ef4444' }}
          name="Expenses"
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
