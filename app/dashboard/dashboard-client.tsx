'use client'

import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet } from 'lucide-react'
// Removed YAxis to clear the unused warning
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

interface Activity {
  id: string;
  date: string;
  type: 'income' | 'expense';
  amount: number;
  name?: string;
  description?: string;
}

interface DashboardClientProps {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  recentActivity: Activity[];
}

export function DashboardClient({ totalIncome, totalExpenses, netProfit, recentActivity }: DashboardClientProps) {
  
  // Format numbers to Indian Rupee format standard
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // NEW: Strictly format dates so the Server and Client always match
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // Data for the Recharts Bar Chart
  const chartData = [
    { name: 'Income', amount: totalIncome, color: '#16a34a' }, // Green-600
    { name: 'Expenses', amount: totalExpenses, color: '#dc2626' }, // Red-600
  ]

  return (
    <div className="space-y-8">
      
      {/* 1. TOP METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card p-6 rounded-lg border shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Income</p>
            <div className="h-10 w-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(totalIncome)}</h2>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
            <div className="h-10 w-10 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(totalExpenses)}</h2>
        </div>

        <div className="bg-card p-6 rounded-lg border shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h2 className="text-3xl font-bold">{formatCurrency(netProfit)}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* 2. CASH FLOW CHART */}
        <div className="bg-card p-6 rounded-lg border shadow-sm lg:col-span-1 space-y-6">
          <h3 className="font-semibold text-lg flex items-center">
            <Wallet className="h-5 w-5 mr-2 text-muted-foreground" />
            Cash Flow Overview
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280' }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  // Fixed Tooltip Formatter Type
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]} maxBarSize={60}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. RECENT ACTIVITY FEED */}
        <div className="bg-card p-6 rounded-lg border shadow-sm lg:col-span-2 space-y-6">
          <h3 className="font-semibold text-lg">Recent Transactions</h3>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Client / Vendor</TableHead>
                  <TableHead className="text-right">Amount (INR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentActivity.map((activity) => (
                  <TableRow key={`${activity.type}-${activity.id}`}>
                    <TableCell>{formatDate(activity.date)}</TableCell>
                    <TableCell>
                      {activity.type === 'income' ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Income</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Expense</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{activity.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${activity.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {activity.type === 'income' ? '+' : '-'}{formatCurrency(activity.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                {recentActivity.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No recent activity found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

      </div>
    </div>
  )
}