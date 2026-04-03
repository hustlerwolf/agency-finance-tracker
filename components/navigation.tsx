'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Receipt, Wallet, FileText, Users, Store, Tags, BarChart3, Briefcase } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', href: '/invoices', icon: FileText },
    { name: 'Income', href: '/income', icon: Wallet },
    { name: 'Expenses', href: '/expenses', icon: Receipt },
    { name: 'CRM', href: '/crm', icon: Briefcase },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Vendors', href: '/vendors', icon: Store },
    { name: 'Categories', href: '/categories', icon: Tags },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ]

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center font-bold text-xl tracking-tight">
              Onlee Agency
            </div>
            {/* Added overflow-x-auto to handle more links gracefully on smaller screens */}
            <div className="hidden sm:-my-px sm:ml-8 sm:flex sm:space-x-6 overflow-x-auto">
              {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors whitespace-nowrap ${
                      isActive
                        ? 'border-green-600 text-green-600'
                        : 'border-transparent text-muted-foreground hover:text-gray-900 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}