// ─── Module Access Constants ──────────────────────────────────────────────────
// Single source of truth for module slugs and their route prefixes.
// Used by middleware (route protection) and sidebar (nav filtering).

export const ALL_MODULES = [
  'dashboard',
  'crm',
  'projects',
  'tasks',
  'knowledge-base',
  'team',
  'finance',
  'reports',
  'settings',
] as const

export type ModuleSlug = (typeof ALL_MODULES)[number]

export const MODULE_LABELS: Record<ModuleSlug, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  projects: 'Projects',
  tasks: 'Tasks',
  'knowledge-base': 'Knowledge Base',
  team: 'Team',
  finance: 'Finance',
  reports: 'Reports',
  settings: 'Settings',
}

// ─── Module Action Permissions ────────────────────────────────────────────────

export const MODULE_ACTIONS = ['create', 'edit', 'delete'] as const
export type ModuleAction = (typeof MODULE_ACTIONS)[number]

export type ModulePermissions = Record<string, Record<string, boolean>>

// Modules that support action-level permissions
export const MODULES_WITH_ACTIONS: ModuleSlug[] = ['crm', 'projects', 'tasks', 'knowledge-base', 'team', 'finance']

export function hasPermission(
  modulePermissions: ModulePermissions | null | undefined,
  module: string,
  action: ModuleAction,
  isAdmin: boolean
): boolean {
  if (isAdmin) return true
  if (!modulePermissions) return true // No restrictions = all allowed (backward compatible)
  const perms = modulePermissions[module]
  if (!perms) return true // Module not in permissions = all allowed
  return perms[action] !== false // Default true unless explicitly false
}

// Maps each module to the URL prefixes it owns
const MODULE_ROUTES: Record<ModuleSlug, string[]> = {
  dashboard: ['/dashboard'],
  crm: ['/crm', '/customers'],
  projects: ['/projects'],
  tasks: ['/tasks'],
  'knowledge-base': ['/knowledge-base'],
  team: ['/team'],
  finance: ['/finance', '/invoices', '/income', '/expenses', '/categories', '/vendors'],
  reports: ['/reports'],
  settings: ['/settings'],
}

export function getModuleForPath(pathname: string): ModuleSlug | null {
  for (const [mod, prefixes] of Object.entries(MODULE_ROUTES)) {
    for (const prefix of prefixes) {
      if (pathname === prefix || pathname.startsWith(prefix + '/')) {
        return mod as ModuleSlug
      }
    }
  }
  return null
}

// Routes accessible to all team members (self-service)
const SELF_SERVICE_ROUTES = [
  '/team/leaves',
  '/team/attendance',
  '/tasks',
]

export function isSelfServiceRoute(pathname: string): boolean {
  return SELF_SERVICE_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))
}

// Returns the first accessible route for a member (used as landing page)
export function getFirstAllowedRoute(allowedModules: string[]): string {
  for (const mod of allowedModules) {
    const routes = MODULE_ROUTES[mod as ModuleSlug]
    if (routes?.[0]) return routes[0]
  }
  // Fallback to self-service
  return '/team/leaves'
}

export function canAccessPath(
  pathname: string,
  role: string | null,
  allowedModules: string[]
): boolean {
  // Admins can access everything
  if (role === 'admin') return true

  // Root redirect
  if (pathname === '/') return true

  // Self-service routes (leaves, attendance) are always accessible
  if (isSelfServiceRoute(pathname)) return true

  const mod = getModuleForPath(pathname)
  // Unknown routes (e.g. /api, /login) are allowed
  if (!mod) return true

  return allowedModules.includes(mod)
}
