'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard, FileText, Wallet, Receipt, Briefcase,
  Users, Store, Tags, BarChart3, Settings, Sun, Moon,
  ChevronLeft, ChevronRight, LogOut, ChevronDown,
  PieChart, TrendingUp, DollarSign, Globe, FolderKanban, BookOpen,
  Building2, UserCircle, BadgeDollarSign, UserCheck, CalendarDays,
  ClipboardList, IndianRupee, CheckSquare, Bug,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { ModuleSlug } from '@/lib/modules'
import { NotificationBell } from './notification-bell'

// ─── Nav config ───────────────────────────────────────────────────────────────

const MAIN_NAV = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
]

const CRM_NAV = [
  { name: 'Leads', href: '/crm', icon: Briefcase },
  { name: 'Companies', href: '/customers', icon: Building2 },
  { name: 'Contacts', href: '/customers/contacts', icon: UserCircle },
]

const FINANCE_NAV = [
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Income', href: '/income', icon: Wallet },
  { name: 'Expenses', href: '/expenses', icon: Receipt },
  { name: 'Expense Categories', href: '/categories', icon: Tags },
  { name: 'Vendors', href: '/vendors', icon: Store },
]


const PROJECTS_NAV = [
  { name: 'All Projects', href: '/projects', icon: FolderKanban },
  { name: 'Settings', href: '/projects/settings', icon: Settings },
]

const TASKS_NAV = [
  { name: 'All Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'BugHerd', href: '/tasks/bugherd', icon: Bug },
  { name: 'Settings', href: '/tasks/settings', icon: Settings },
]

const KB_NAV = [
  { name: 'All Entries', href: '/knowledge-base', icon: BookOpen },
  { name: 'Settings', href: '/knowledge-base/settings', icon: Settings },
]

const TEAM_NAV = [
  { name: 'Directory', href: '/team', icon: Users },
  { name: 'Leaves', href: '/team/leaves', icon: CalendarDays },
  { name: 'Attendance', href: '/team/attendance', icon: ClipboardList },
  { name: 'Payroll', href: '/team/payroll', icon: IndianRupee },
  { name: 'Settings', href: '/team/settings', icon: Settings },
]

// Self-service items always visible to all users
const SELF_SERVICE_NAV = [
  { name: 'Leaves', href: '/team/leaves', icon: CalendarDays },
  { name: 'Attendance', href: '/team/attendance', icon: ClipboardList },
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
          ? 'text-orange-400 bg-white/5'
          : 'text-muted-foreground hover:text-gray-200 hover:bg-white/5',
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
  const [financeOpen, setFinanceOpen] = useState(false)
  const [reportsOpen, setReportsOpen] = useState(false)
  const [projectsOpen, setProjectsOpen] = useState(false)
  const [kbOpen, setKbOpen] = useState(false)
  const [tasksOpen, setTasksOpen] = useState(false)
  const [teamOpen, setTeamOpen] = useState(false)
  const [crmOpen, setCrmOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [myTeamMemberId, setMyTeamMemberId] = useState<string | null>(null)
  const [allowedModules, setAllowedModules] = useState<string[]>([])
  const [permLoaded, setPermLoaded] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  // Fetch user permissions — use sessionStorage cache for instant loads
  useEffect(() => {
    async function loadPerms() {
      try {
        // Check cache first for instant sidebar rendering
        const cached = typeof window !== 'undefined' ? sessionStorage.getItem('sidebar_perms') : null
        if (cached) {
          try {
            const c = JSON.parse(cached)
            setUserRole(c.role)
            setAllowedModules(c.modules)
            if (c.tmId) setMyTeamMemberId(c.tmId)
            setPermLoaded(true)
          } catch {}
        }

        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setPermLoaded(true); return }
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('role, allowed_modules')
          .eq('id', user.id)
          .single()
        if (error) {
          console.error('Failed to load user profile:', error.message)
          setUserRole('admin')
          setAllowedModules([])
          setPermLoaded(true)
          return
        }
        setUserRole(profile.role)
        setAllowedModules(profile.allowed_modules || [])

        // Get team_member_id for notifications
        const { data: tm } = await supabase
          .from('team_members')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()
        if (tm) setMyTeamMemberId(tm.id)

        // Cache for instant loads on navigation
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('sidebar_perms', JSON.stringify({
            role: profile.role,
            modules: profile.allowed_modules || [],
            tmId: tm?.id || null,
          }))
        }
      } catch (e) {
        console.error('Permission load error:', e)
        setUserRole('admin')
      } finally {
        setPermLoaded(true)
      }
    }
    loadPerms()
  }, [])

  function hasModule(slug: ModuleSlug): boolean {
    if (!permLoaded) return false
    if (userRole === 'admin') return true
    return allowedModules.includes(slug)
  }

  const isCrmActive       = pathname.startsWith('/crm') || pathname.startsWith('/customers')
  const isFinanceActive   = pathname.startsWith('/invoices') || pathname.startsWith('/income') || pathname.startsWith('/expenses') || pathname.startsWith('/categories') || pathname.startsWith('/vendors')
  const isReportsActive   = pathname.startsWith('/reports')
  const isProjectsActive  = pathname.startsWith('/projects')
  const isKbActive        = pathname.startsWith('/knowledge-base')
  const isTasksActive     = pathname.startsWith('/tasks')
  const isTeamActive      = pathname.startsWith('/team')

  // Auto-open accordion when navigating to a sub-page
  useEffect(() => {
    if (isCrmActive) setCrmOpen(true)
  }, [isCrmActive])

  useEffect(() => {
    if (isFinanceActive) setFinanceOpen(true)
  }, [isFinanceActive])

  useEffect(() => {
    if (isReportsActive) setReportsOpen(true)
  }, [isReportsActive])

  useEffect(() => {
    if (isProjectsActive) setProjectsOpen(true)
  }, [isProjectsActive])

  useEffect(() => {
    if (isKbActive) setKbOpen(true)
  }, [isKbActive])

  useEffect(() => {
    if (isTasksActive) setTasksOpen(true)
  }, [isTasksActive])

  useEffect(() => {
    if (isTeamActive) setTeamOpen(true)
  }, [isTeamActive])


  // Hide sidebar on login page
  if (pathname === '/login') return null

  async function handleSignOut() {
    if (typeof window !== 'undefined') sessionStorage.removeItem('sidebar_perms')
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
        ? 'bg-white/12 text-foreground'
        : 'text-muted-foreground hover:text-foreground hover:bg-white/6',
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
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {isOpen && (
          <div className="mt-1 ml-[14px] pl-4 border-l border-border space-y-0.5">
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
        'bg-[#1a1a1a] dark:bg-[#0f0f0f]',
        'border-r border-border',
        'transition-all duration-300 ease-in-out',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      ].join(' ')}
    >
      {/* ── Logo / App name ── */}
      <div className={`flex items-center h-[60px] px-3 border-b border-border flex-shrink-0 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        {collapsed ? (
          <img src="/icon.svg" alt="Onlee" className="w-8 h-8 flex-shrink-0" />
        ) : (
          <img src="/logo-light.svg" alt="Onlee ERP" className="h-7 flex-shrink-0" />
        )}
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5 scrollbar-none">

        {/* Loading skeleton while permissions load */}
        {!permLoaded && !collapsed && (
          <div className="space-y-2 px-1">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-9 rounded-lg bg-white/[0.04] animate-pulse" />
            ))}
          </div>
        )}

        {/* Dashboard */}
        {hasModule('dashboard') && MAIN_NAV.map(({ name, href, icon: Icon }) => {
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

        {/* CRM accordion */}
        {hasModule('crm') && (
          <AccordionSection
            label="CRM"
            icon={Briefcase}
            isActive={isCrmActive}
            isOpen={crmOpen}
            onToggle={() => setCrmOpen(p => !p)}
            rootHref="/crm"
          >
            {CRM_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname === href || (href === '/crm' && pathname.startsWith('/crm'))}
              />
            ))}
          </AccordionSection>
        )}

        {/* Projects accordion */}
        {hasModule('projects') && (
          <AccordionSection
            label="Projects"
            icon={FolderKanban}
            isActive={isProjectsActive}
            isOpen={projectsOpen}
            onToggle={() => setProjectsOpen(p => !p)}
            rootHref="/projects"
          >
            {PROJECTS_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname === href || (href === '/projects' && pathname === '/projects')}
              />
            ))}
          </AccordionSection>
        )}

        {/* Tasks accordion — full for admin/tasks module, self-service "My Tasks" for others */}
        {hasModule('tasks') ? (
          <AccordionSection
            label="Tasks"
            icon={CheckSquare}
            isActive={isTasksActive}
            isOpen={tasksOpen}
            onToggle={() => setTasksOpen(p => !p)}
            rootHref="/tasks"
          >
            {TASKS_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink key={href} href={href} icon={Icon} name={name} isActive={pathname === href || (href === '/tasks' && pathname === '/tasks')} />
            ))}
          </AccordionSection>
        ) : permLoaded && (
          <Link href="/tasks" title={collapsed ? 'My Tasks' : undefined} className={navItemClass(isTasksActive)}>
            <CheckSquare className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>My Tasks</span>}
          </Link>
        )}

        {/* Knowledge Base accordion */}
        {hasModule('knowledge-base') && (
          <AccordionSection
            label="Knowledge Base"
            icon={BookOpen}
            isActive={isKbActive}
            isOpen={kbOpen}
            onToggle={() => setKbOpen(p => !p)}
            rootHref="/knowledge-base"
          >
            {KB_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname === href}
              />
            ))}
          </AccordionSection>
        )}

        {/* Team / HRMS accordion — full access for admins/team module, self-service for others */}
        {hasModule('team') ? (
          <AccordionSection
            label="Team"
            icon={UserCheck}
            isActive={isTeamActive}
            isOpen={teamOpen}
            onToggle={() => setTeamOpen(p => !p)}
            rootHref="/team"
          >
            {TEAM_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname === href || (href === '/team' && pathname === '/team')}
              />
            ))}
          </AccordionSection>
        ) : permLoaded && (
          <AccordionSection
            label="Self Service"
            icon={UserCheck}
            isActive={isTeamActive}
            isOpen={teamOpen}
            onToggle={() => setTeamOpen(p => !p)}
            rootHref="/team/leaves"
          >
            {SELF_SERVICE_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname === href}
              />
            ))}
          </AccordionSection>
        )}

        {/* Finance accordion */}
        {hasModule('finance') && (
          <AccordionSection
            label="Finance"
            icon={BadgeDollarSign}
            isActive={isFinanceActive}
            isOpen={financeOpen}
            onToggle={() => setFinanceOpen(p => !p)}
            rootHref="/invoices"
          >
            {FINANCE_NAV.map(({ name, href, icon: Icon }) => (
              <SubLink
                key={href}
                href={href}
                icon={Icon}
                name={name}
                isActive={pathname.startsWith(href)}
              />
            ))}
          </AccordionSection>
        )}

        {/* Divider */}
        {(hasModule('reports') || hasModule('settings')) && (
          <div className="my-2 border-t border-border" />
        )}

        {/* Reports accordion */}
        {hasModule('reports') && (
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
        )}

        {/* Settings */}
        {hasModule('settings') && (
          <Link
            href="/settings"
            title={collapsed ? 'Settings' : undefined}
            className={navItemClass(pathname.startsWith('/settings'))}
          >
            <Settings className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Settings</span>}
          </Link>
        )}
      </nav>

      {/* ── Footer: notifications + theme + sign out ── */}
      <div className="flex-shrink-0 border-t border-border p-2 space-y-0.5">
        {/* Notification Bell */}
        {myTeamMemberId && !collapsed && (
          <NotificationBell teamMemberId={myTeamMemberId} />
        )}
        {myTeamMemberId && collapsed && (
          <div className="relative flex justify-center">
            <NotificationBell teamMemberId={myTeamMemberId} />
          </div>
        )}
      </div>
      <div className="flex-shrink-0 border-t border-border p-2 space-y-0.5">
        <button
          onClick={toggleTheme}
          title={collapsed && mounted ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
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
            <span suppressHydrationWarning>
              {mounted ? (resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode') : 'Dark mode'}
            </span>
          )}
        </button>

        <button
          onClick={handleSignOut}
          title={collapsed ? 'Sign out' : undefined}
          className={[
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors w-full',
            'text-muted-foreground hover:text-red-400 hover:bg-white/5',
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
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-muted border border-gray-600 hover:bg-muted flex items-center justify-center transition-colors z-20 shadow-md"
      >
        {collapsed
          ? <ChevronRight className="w-3.5 h-3.5 text-foreground" />
          : <ChevronLeft className="w-3.5 h-3.5 text-foreground" />
        }
      </button>
    </aside>
  )
}
