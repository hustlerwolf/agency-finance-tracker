'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PieChart, TrendingUp, DollarSign, ShieldCheck, Globe } from 'lucide-react'

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const sidebarLinks = [
    { name: 'Expense Breakdown', href: '/reports', icon: PieChart },
    { name: 'Revenue & Growth', href: '/reports/revenue', icon: TrendingUp },
    { name: 'Profit & Loss', href: '/reports/profit', icon: DollarSign },
    { name: 'Tax & Compliance', href: '/reports/tax', icon: ShieldCheck },
    { name: 'Forex Analysis', href: '/reports/forex', icon: Globe }, 
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Financial Reports</h1>
        <p className="text-muted-foreground">Analyze your agency performance and tax liabilities.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar */}
        <nav className="w-full md:w-64 flex-shrink-0 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="truncate">{link.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* Main Content Area */}
        <div className="flex-1 bg-white border rounded-lg shadow-sm p-6 min-h-[600px]">
          {children}
        </div>
      </div>
    </div>
  )
}