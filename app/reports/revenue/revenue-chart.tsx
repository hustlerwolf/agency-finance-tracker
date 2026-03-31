'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useTheme } from 'next-themes'

interface RevenueData { name: string; amount: number }
interface TooltipItem { name: string; value: number; payload: RevenueData }
interface CustomTooltipProps { active?: boolean; payload?: TooltipItem[] }

export function RevenueChart({ data }: { data: RevenueData[] }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor  = isDark ? '#374151' : '#e2e8f0'
  const tickColor  = isDark ? '#9ca3af' : '#64748b'
  const cursorFill = isDark ? 'rgba(255,255,255,0.04)' : '#f1f5f9'

  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-card border rounded-md shadow-lg p-3">
          <p className="font-bold text-foreground mb-1">{item.name}</p>
          <p className="text-green-600 dark:text-green-400 font-mono text-sm font-bold">
            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={gridColor} />
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={100}
          tick={{ fontSize: 12, fill: tickColor }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
        <Bar dataKey="amount" radius={[0, 4, 4, 0]} barSize={30}>
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
