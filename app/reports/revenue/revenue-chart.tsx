'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts'

interface RevenueData {
  name: string;
  amount: number;
}

interface TooltipItem {
  name: string;
  value: number;
  payload: RevenueData;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipItem[];
}

export function RevenueChart({ data }: { data: RevenueData[] }) {
  
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload
      return (
        <div className="bg-card p-3 border rounded-md shadow-lg">
          <p className="font-bold text-slate-900 mb-1">{item.name}</p>
          <p className="text-green-600 font-mono text-sm font-bold">
            ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
        <XAxis type="number" hide />
        <YAxis 
          dataKey="name" 
          type="category" 
          width={100} 
          tick={{ fontSize: 12, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Bar 
          dataKey="amount" 
          radius={[0, 4, 4, 0]} 
          barSize={30}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#0f172a'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}