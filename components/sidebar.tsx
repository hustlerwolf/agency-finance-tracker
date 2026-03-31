'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, FileText, Wallet, Receipt, Briefcase,
  Users, Store, Tags, BarChart3, Settings, Sun, Moon,
  ChevronLeft, ChevronRight, LogOut, ChevronDown,
  PieChart, TrendingUp, DollarSign, Globe, FolderKanban,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Nav config ───────────────────────────────────────────────────────────────

const MAIN_NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Income', href: '/income', icon: Wallet },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
  { name: 'CRM', href: '/crm', icon: Briefcase },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Vendors', href: '/vendors', icon: Store },
]

const EXPENSES_NAV = [
  { name: 'All Expenses', href: '/expenses', icon: Receipt },
  { name: 'Categories', href: '/categories', icon: Tags },
]

const REPORTS_NAV = [
  { name: 'Expense Breakdown', href: '/reports', icon: PieChart },
  { name: 'Revenue & Growth', href: '/reports/revenue', icon: TrendingUp },
  { name: 'Profit & Loss', href: '/reports/profit', icon: DollarSign },
  { name: 'Forex Analysis', href: '/reports/forex', icon: Globe },
]

// ─── Sub-menu link ────────────────────────────────────────────────────────────

function SubLink({ href, icon: Icon, name, isActive }: {
  href: string
  icon: React.ElementType
  name: string
  isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors',
        isActive
          ? 'text-green-400 bg-white/5'
          : 'text-gray-500 hover:text-gray-200 hover:bg-white/5',
      ].join(' ')}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="truncate">{name}</span>
    </Link>
  )
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [expensesOpen, setExpensesOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  const isExpensesActive = pathname.startsWith('/expenses') || pathname.startsWith('/categories')
  const isReportsActive = pathname.startsWith('/reports')

  // Auto-open accordion when navigating to a sub-page
  useEffect(() => {
    if (isExpensesActive) setExpensesOpen(true)
  }, [isExpensesActive])

  useEffect(() => {
    if (isReportsActive) setReportsOpen(true)
  }, [isReportsActive])

  // Hide sidebar on login page
  if (pathname === '/login') return null

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  function navItemClass(isActive: boolean, extra = '') {
    return [
      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
      isActive
        ? 'bg-white/12 text-white'
        : 'text-gray-400 hover:text-white hover:bg-white/6',
      collapsed ? 'justify-center' : '',
      extra,
    ].join(' ')
  }

  // Reusable accordion section (collapsed → plain link, expanded → toggle)
  function AccordionSection({
    label, icon: Icon, isActive, isOpen, onToggle, rootHref, children,
  }: {
    label: string
    icon: React.ElementType
    isActive: boolean
    isOpen: boolean
    onToggle: () => void
    rootHref: string
    children: React.ReactNode
  }) {
    if (collapsed) {
      return (
        <Link href={rootHref} title={label} className={navItemClass(isActive)}>
          <Icon className="w-[18px] h-[18px] flex-shrink-0" />
        </Link>
      )
    }
    return (
      <div>
        <button
          onClick={onToggle}
          className={navItemClass(isActive, 'w-full justify-between')}
        >
          <span className="flex items-center gap-3">
            <Icon className="w-[18px] h-[18px] flex-shrink-0" />
            <span>{label}</span>
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="mt-1 ml-[14px] pl-4 border-l border-white/[0.08] space-y-0.5">
            {children}
          </div>
        )}
      </div>
    )
  }

  return (
    <aside
      className={[
        'relative flex flex-col h-screen flex-shrink-0',
        'bg-gray-900 dark:bg-[#0d1117]',
        'border-r border-white/[0.06]',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      ].join(' ')}
    >
      {/* ── Logo / App name ── */}
      <div className={`flex items-center h-[60px] px-3 border-b border-white/[0.06] flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm">
          <span className="text-white font-bold text-sm leading-none">O</span>
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="font-semibold text-white text-sm leading-tight truncate">Onlee Agency</p>
            <p className="text-[11px] text-gray-500 leading-tight">Finance Tracker</p>
          </div>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 scrollbar-none">

        {/* Flat nav items */}
        {MAIN_NAV.map(({ name, href, icon: Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? name : undefined}
              className={navItemClass(isActive)}
            >
              <Icon className="w-[18px] h-[18px] flex-shrink-0" />
              {!collapsed && <span className="truncate">{name}</span>}
            </Link>
          )
        })}

        {/* Expenses accordion */}
        <AccordionSection
          label="Expenses"
          icon={Receipt}
          isActive={isExpensesActive}
          isOpen={expensesOpen}
          onToggle={() => setExpensesOpen(p => !p)}
          rootHref="/expenses"
        >
          {EXPENSES_NAV.map(({ name, href, icon: Icon }) => (
            <SubLink
              key={href}
              href={href}
              icon={Icon}
              name={name}
              isActive={pathname.startsWith(href)}
            />
          ))}
        </AccordionSection>

        {/* Divider */}
        <div className="my-2 border-t border-white/[0.06]" />

        {/* Reports accordion */}
        <AccordionSection
          label="Reports"
          icon={BarChart3}
          isActive={isReportsActive}
          isOpen={reportsOpen}
          onToggle={() => setReportsOpen(p => !p)}
          rootHref="/reports"
        >
          {REPORTS_NAV.map(({ name, href, icon: Icon }) => (
            <SubLink
              key={href}
              href={href}
              icon={Icon}
              name={name}
              isActive={pathname === href}
            />
          ))}
        </AccordionSection>

        {/* Settings */}
        <Link
          href="/settings"
          title={collapsed ? 'Settings' : undefined}
          className={navItemClass(pathname.startsWith('/settings'))}
        >
          <Settings className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Settings</span>}
        </Link>
      </nav>

      {/* ── Footer: theme + sign out ── */}
      <div className="flex-shrink-0 border-t border-white/[0.06] p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          title={collapsed ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
          className={navItemClass(false, 'w-full')}
        >
          {mounted ? (
            resolvedTheme === 'dark'
              ? <Sun className="w-[18px] h-[18px] flex-shrink-0" />
              : <Moon className="w-[18px] h-[18px] flex-shrink-0" />
          ) : (
            <div className="w-[18px] h-[18px] flex-shrink-0" />
          )}
          {!collapsed && (
            <span>{resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          )}
        </button>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={[
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
            'text-gray-400 hover:text-red-400 hover:bg-white/5',
            collapsed ? 'justify-center' : '',
          ].join(' ')}
        >
          <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>

      {/* ── Collapse toggle ── */}
      <button
        onClick={() => setCollapsed(p => !p)}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-800 border border-gray-600 hover:bg-gray-700 flex items-center justify-center transition-colors z-20 shadow-md"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          : <ChevronLeft className="w-3.5 h-3.5 text-gray-300" />
        }
      </button>
    </aside>
  )
}
