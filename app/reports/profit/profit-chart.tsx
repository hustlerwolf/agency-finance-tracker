'use client'

import { 
  ComposedChart, 
  Area, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts'

interface ProfitData {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

// 1. Define the specific shape of a single line/area data point in the tooltip
interface TooltipPayloadEntry {
  value: number;
  name: string;
  color: string;
  dataKey: string;
  payload: ProfitData; // The original data object
}

// 2. Define the props for our CustomTooltip
interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

export function ProfitChart({ data }: { data: ProfitData[] }) {
  
  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    // Check for active state and ensure we have at least 2 items (Income & Expenses)
    if (active && payload && payload.length >= 2) {
      const incomeValue = payload[0].value;
      const expenseValue = payload[1].value;
      const netProfit = incomeValue - expenseValue;

      return (
        <div className="bg-white p-4 border rounded-md shadow-lg border-slate-200 space-y-2">
          <p className="font-bold text-slate-900 border-b pb-1">{label}</p>
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-blue-600 font-medium">Income:</span>
              <span className="font-mono text-slate-700">₹{incomeValue.toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-red-500 font-medium">Expenses:</span>
              <span className="font-mono text-slate-700">₹{expenseValue.toLocaleString('en-IN')}</span>
            </div>
            <div className={`pt-1 border-t flex justify-between gap-8 font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="month" 
          tick={{ fontSize: 12, fill: '#64748b' }} 
          axisLine={false} 
          tickLine={false}
          dy={10}
        />
        <YAxis 
          tick={{ fontSize: 12, fill: '#64748b' }} 
          axisLine={false} 
          tickLine={false}
          tickFormatter={(value) => `₹${(value / 1000)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend verticalAlign="top" align="right" height={36}/>
        
        <Area 
          type="monotone" 
          dataKey="income" 
          fill="#3b82f6" 
          fillOpacity={0.1} 
          stroke="#3b82f6" 
          strokeWidth={2}
          name="Income"
          isAnimationActive={true}
        />
        
        <Line 
          type="monotone" 
          dataKey="expenses" 
          stroke="#ef4444" 
          strokeWidth={3} 
          dot={{ r: 4, fill: '#ef4444' }}
          name="Expenses"
          isAnimationActive={true}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}