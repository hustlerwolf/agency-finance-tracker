'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

interface ForexData {
  invoice: string;
  marketRate: string;
  effectiveRate: string;
  leakagePercent: string;
  date: string;
}

export function ForexChart({ data }: { data: ForexData[] }) {
  const sortedData = [...data].reverse();

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={sortedData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis dataKey="invoice" tick={{ fontSize: 10 }} />
        <YAxis domain={['auto', 'auto']} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip 
           content={({ active, payload }) => {
             if (active && payload && payload.length) {
               const d = payload[0].payload;
               return (
                 <div className="bg-card p-3 border rounded-md shadow-lg text-xs">
                   <p className="font-bold border-b mb-2 pb-1">{d.invoice} ({d.date})</p>
                   <p className="text-slate-600 font-medium">Market Rate: ₹{d.marketRate}</p>
                   <p className="text-blue-600 font-medium">Your Rate: ₹{d.effectiveRate}</p>
                   <p className="text-red-600 font-bold mt-1">Loss: {d.leakagePercent}%</p>
                 </div>
               );
             }
             return null;
           }}
        />
        <Legend verticalAlign="top" align="right" height={36} />
        
        {/* Market Rate Area */}
        <Area 
          type="monotone" 
          dataKey="marketRate" 
          stroke="#94a3b8" 
          fill="#f1f5f9" 
          name="Market Mid-Rate"
        />
        {/* Your Effective Rate Line */}
        <Area 
          type="monotone" 
          dataKey="effectiveRate" 
          stroke="#ef4444" 
          fill="#fee2e2" 
          name="Your Received Rate"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}