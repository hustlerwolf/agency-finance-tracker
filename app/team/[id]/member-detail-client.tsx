'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ArrowLeft, Mail, Phone, Calendar, Building2, Briefcase,
  CreditCard, IndianRupee, Clock, FileCheck, Shield, Key, ChevronDown,
} from 'lucide-react'
import { ALL_MODULES, MODULE_LABELS, type ModuleSlug } from '@/lib/modules'
import { MODULE_FIELDS, MODULES_WITH_FIELDS, type FieldDef } from '@/lib/field-access'
import { createTeamMemberAccount, updateTeamMemberAccess, applyPresetToMember, resetTeamMemberPassword } from '../auth-actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department { id: string; name: string }
interface Member {
  id: string; full_name: string; email: string | null; phone: string | null
  date_of_birth: string | null; profile_photo_url: string | null
  designation: string | null; department_id: string | null
  departments: { name: string } | null; employment_type: string
  status: string; date_of_joining: string | null; reporting_to: string | null
  salary_type: string; monthly_ctc: number; payment_mode: string
  bank_account: string | null; ifsc_code: string | null; pan_number: string | null
  aadhaar_last_four: string | null; pf_number: string | null; esi_number: string | null
  paid_leaves_balance: number; created_at: string
  auth_user_id: string | null
}
interface MemberProfile {
  role: string
  allowed_modules: string[]
  hidden_fields: Record<string, string[]>
}
interface AccessPreset {
  id: string; name: string; allowed_modules: string[]
  hidden_fields: Record<string, string[]>
}
interface LeaveReq {
  id: string; leave_type: string; start_date: string; end_date: string
  is_half_day: boolean; half_day_period: string | null; reason: string | null
  status: string; total_days: number; created_at: string
}
interface AttendanceEntry {
  id: string; date: string; status: string; check_in: string | null
  check_out: string | null; daily_update: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400', inactive: 'bg-gray-500/15 text-gray-400', on_leave: 'bg-yellow-500/15 text-yellow-400',
}
const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400', approved: 'bg-green-500/15 text-green-400', rejected: 'bg-red-500/15 text-red-400',
}
const ATT_STATUS_COLORS: Record<string, string> = {
  present: 'bg-green-500/15 text-green-400', absent: 'bg-red-500/15 text-red-400',
  half_day: 'bg-yellow-500/15 text-yellow-400', on_leave: 'bg-blue-500/15 text-blue-400',
  holiday: 'bg-purple-500/15 text-purple-400', weekend: 'bg-gray-500/15 text-gray-400',
}
const EMP_TYPES: Record<string, string> = { full_time: 'Full-time', part_time: 'Part-time', freelancer: 'Freelancer', intern: 'Intern' }

function fmt(d: string | null) { return d ? new Date(d).toLocaleDateString('en-IN') : '—' }
function fmtCurrency(n: number) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n) }

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}
const AVATAR_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-emerald-600']
function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Detail Section ───────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | null }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm text-muted-foreground w-32 flex-shrink-0">{label}</span>
      <span className="text-sm font-medium">{value || '—'}</span>
    </div>
  )
}

// ─── Access Configurator (module + field checkboxes) ──────────────────────────

function AccessConfigurator({ selectedModules, hiddenFields, expandedModule, onToggleModule, onUpdateHiddenFields, onExpandModule }: {
  selectedModules: string[]; hiddenFields: Record<string, string[]>
  expandedModule: string | null
  onToggleModule: (slug: string) => void
  onUpdateHiddenFields: (module: string, fields: string[]) => void
  onExpandModule: (slug: string | null) => void
}) {
  return (
    <div className="space-y-2">
      <Label>Module & Field Access</Label>
      <div className="space-y-1">
        {ALL_MODULES.map(slug => {
          const enabled = selectedModules.includes(slug)
          const hasFields = MODULES_WITH_FIELDS.includes(slug)
          const isExpanded = expandedModule === slug
          const hiddenCount = (hiddenFields[slug] || []).length
          const fields = MODULE_FIELDS[slug] || []

          return (
            <div key={slug}>
              <div className="flex items-center gap-2">
                <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${enabled ? 'border-green-500/50 bg-green-500/10' : 'border-border hover:bg-muted/50'}`}>
                  <input type="checkbox" checked={enabled} onChange={() => onToggleModule(slug)} className="rounded" />
                  <span className="text-sm font-medium">{MODULE_LABELS[slug as ModuleSlug]}</span>
                  {hiddenCount > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 ml-auto">{hiddenCount} hidden</span>}
                </label>
                {enabled && hasFields && fields.length > 0 && (
                  <button type="button" className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted/50 flex-shrink-0" onClick={() => onExpandModule(isExpanded ? null : slug)}>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>
                )}
              </div>
              {enabled && hasFields && isExpanded && (
                <FieldCheckboxes
                  module={slug}
                  hiddenFields={hiddenFields[slug] || []}
                  onChange={f => onUpdateHiddenFields(slug, f)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function FieldCheckboxes({ module, hiddenFields, onChange }: {
  module: string; hiddenFields: string[]; onChange: (fields: string[]) => void
}) {
  const fields = MODULE_FIELDS[module] || []
  const groups = fields.reduce<Record<string, FieldDef[]>>((acc, f) => {
    const g = f.group || 'Other'; if (!acc[g]) acc[g] = []; acc[g].push(f); return acc
  }, {})

  function toggle(key: string) {
    onChange(hiddenFields.includes(key) ? hiddenFields.filter(k => k !== key) : [...hiddenFields, key])
  }

  return (
    <div className="ml-6 mt-2 mb-1 space-y-2">
      {Object.entries(groups).map(([group, gFields]) => (
        <div key={group}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{group}</p>
          <div className="flex flex-wrap gap-1.5">
            {gFields.map(f => (
              <label key={f.key} className={`text-xs px-2.5 py-1 rounded-md border cursor-pointer transition-colors ${hiddenFields.includes(f.key) ? 'bg-red-500/15 border-red-500/30 text-red-400 line-through' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
                <input type="checkbox" className="sr-only" checked={!hiddenFields.includes(f.key)} onChange={() => toggle(f.key)} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
      ))}
      <p className="text-[10px] text-muted-foreground">Green = visible · Red strikethrough = hidden</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MemberDetailClient({
  member: m, reportingToName, leaves, attendance, isAdmin = false, memberProfile, presets = [],
}: {
  member: Member; departments: Department[]; allMembers: { id: string; full_name: string }[]
  reportingToName: string | null; leaves: LeaveReq[]; attendance: AttendanceEntry[]
  isAdmin?: boolean; memberProfile?: MemberProfile | null; presets?: AccessPreset[]
}) {
  const [tab, setTab] = useState<'overview' | 'leaves' | 'attendance' | 'access'>('overview')
  const [selectedModules, setSelectedModules] = useState<string[]>(memberProfile?.allowed_modules || [])
  const [hiddenFields, setHiddenFields] = useState<Record<string, string[]>>(memberProfile?.hidden_fields || {})
  const [expandedModule, setExpandedModule] = useState<string | null>(null)
  const [accountEmail, setAccountEmail] = useState(m.email || '')
  const [accountPassword, setAccountPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const hasAuthAccount = !!m.auth_user_id

  function toggleModule(slug: string) {
    setSelectedModules(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  function updateHiddenFields(module: string, fields: string[]) {
    setHiddenFields(prev => ({ ...prev, [module]: fields }))
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!accountEmail || !accountPassword) return
    setSaving(true)
    const res = await createTeamMemberAccount(m.id, accountEmail, accountPassword, selectedModules, hiddenFields)
    setSaving(false)
    if (res.success) toast.success('Login account created')
    else toast.error(res.error)
  }

  async function handleUpdateAccess() {
    if (!m.auth_user_id) return
    setSaving(true)
    const res = await updateTeamMemberAccess(m.auth_user_id, selectedModules, hiddenFields)
    setSaving(false)
    if (res.success) toast.success('Access updated')
    else toast.error(res.error)
  }

  async function handleApplyPreset(presetId: string) {
    if (!m.auth_user_id) return
    setSaving(true)
    const res = await applyPresetToMember(m.auth_user_id, presetId)
    setSaving(false)
    if (res.success) {
      toast.success('Preset applied')
      // Update local state from preset
      const preset = presets.find(p => p.id === presetId)
      if (preset) {
        setSelectedModules(preset.allowed_modules)
        setHiddenFields(preset.hidden_fields || {})
      }
    } else toast.error(res.error)
  }

  async function handleResetPassword() {
    if (!m.auth_user_id || !newPassword) return
    setSaving(true)
    const res = await resetTeamMemberPassword(m.auth_user_id, newPassword)
    setSaving(false)
    if (res.success) { toast.success('Password reset'); setNewPassword('') }
    else toast.error(res.error)
  }

  return (
    <>
      {/* Back */}
      <Link href="/team" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Team
      </Link>

      {/* Header */}
      <div className="flex items-start gap-4 mb-8">
        {m.profile_photo_url ? (
          <img src={m.profile_photo_url} alt="" className="w-20 h-20 rounded-xl object-cover" />
        ) : (
          <div className={`w-20 h-20 rounded-xl ${avatarColor(m.full_name)} flex items-center justify-center text-white font-bold text-2xl`}>{getInitials(m.full_name)}</div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{m.full_name}</h1>
          <p className="text-muted-foreground">{m.designation || 'No designation'} {m.departments?.name ? `· ${m.departments.name}` : ''}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[m.status]}`}>{m.status.replace('_', ' ')}</span>
            <span className="text-xs text-muted-foreground">{EMP_TYPES[m.employment_type]}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['overview', 'leaves', 'attendance', ...(isAdmin ? ['access'] as const : [])] as const).map(t => (
          <button key={t} onClick={() => setTab(t as typeof tab)} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {t === 'overview' ? 'Overview' : t === 'leaves' ? `Leaves (${leaves.length})` : t === 'attendance' ? `Attendance (${attendance.length})` : 'Access'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Personal */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">Personal Information</h3>
            <div className="divide-y divide-border">
              <InfoRow icon={Mail} label="Email" value={m.email} />
              <InfoRow icon={Phone} label="Phone" value={m.phone} />
              <InfoRow icon={Calendar} label="Date of Birth" value={fmt(m.date_of_birth)} />
              <InfoRow icon={Calendar} label="Joined" value={fmt(m.date_of_joining)} />
              <InfoRow icon={Building2} label="Department" value={m.departments?.name || null} />
              <InfoRow icon={Briefcase} label="Reporting To" value={reportingToName} />
            </div>
          </div>

          {/* Payroll */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">Payroll & Compliance</h3>
            <div className="divide-y divide-border">
              <InfoRow icon={IndianRupee} label="Monthly CTC" value={fmtCurrency(m.monthly_ctc)} />
              <InfoRow icon={CreditCard} label="Payment Mode" value={m.payment_mode?.replace('_', ' ')} />
              <InfoRow icon={CreditCard} label="Bank Account" value={m.bank_account ? `****${m.bank_account.slice(-4)}` : null} />
              <InfoRow icon={FileCheck} label="PAN" value={m.pan_number} />
              <InfoRow icon={FileCheck} label="Aadhaar" value={m.aadhaar_last_four ? `XXXX-XXXX-${m.aadhaar_last_four}` : null} />
              <InfoRow icon={FileCheck} label="PF Number" value={m.pf_number} />
            </div>
          </div>

          {/* Leave Balance */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">Leave Balance</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{m.paid_leaves_balance}</p>
                <p className="text-xs text-muted-foreground mt-1">Paid Leaves</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-muted-foreground">12</p>
                <p className="text-xs text-muted-foreground mt-1">Total / Year</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{leaves.filter(l => l.status === 'pending').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Pending</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-card rounded-lg border border-border p-5">
            <h3 className="font-semibold text-sm mb-3">Attendance (Last 30 days)</h3>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{attendance.filter(a => a.status === 'present').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Present</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-400">{attendance.filter(a => a.status === 'absent').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Absent</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-400">{attendance.filter(a => a.status === 'half_day').length}</p>
                <p className="text-xs text-muted-foreground mt-1">Half Days</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'leaves' && (
        <div className="bg-card rounded-lg border border-border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">From</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">To</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Days</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Reason</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map(l => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">{l.leave_type === 'paid' ? 'PL' : 'LWP'}{l.is_half_day ? ' (Half)' : ''}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(l.start_date)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmt(l.end_date)}</td>
                  <td className="px-4 py-3">{l.total_days}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{l.reason || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${LEAVE_STATUS_COLORS[l.status]}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
              {leaves.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No leave requests yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-card rounded-lg border border-border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check In</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Check Out</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Daily Update</th>
              </tr>
            </thead>
            <tbody>
              {attendance.map(a => (
                <tr key={a.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{fmt(a.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${ATT_STATUS_COLORS[a.status] || ''}`}>{a.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{a.check_in ? new Date(a.check_in).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.check_out ? new Date(a.check_out).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[300px]">
                    {a.daily_update ? <p className="line-clamp-2 text-xs">{a.daily_update}</p> : '—'}
                  </td>
                </tr>
              ))}
              {attendance.length === 0 && (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No attendance records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'access' && isAdmin && (
        <div className="space-y-6">
          {/* Account Status */}
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Login Account</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ml-auto ${hasAuthAccount ? 'bg-green-500/15 text-green-400' : 'bg-gray-500/15 text-gray-400'}`}>
                {hasAuthAccount ? 'Active' : 'No Account'}
              </span>
            </div>

            {!hasAuthAccount ? (
              <form onSubmit={handleCreateAccount} className="space-y-5">
                <p className="text-sm text-muted-foreground">Create a login account for this team member so they can access the app.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acc_email">Email *</Label>
                    <Input id="acc_email" type="email" required value={accountEmail} onChange={e => setAccountEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="acc_password">Password *</Label>
                    <Input id="acc_password" type="password" required minLength={6} value={accountPassword} onChange={e => setAccountPassword(e.target.value)} placeholder="Min 6 characters" />
                  </div>
                </div>

                {/* Quick preset apply */}
                {presets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Quick Apply Preset</Label>
                    <div className="flex flex-wrap gap-2">
                      {presets.map(p => (
                        <button key={p.id} type="button" className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors" onClick={() => { setSelectedModules(p.allowed_modules); setHiddenFields(p.hidden_fields || {}) }}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Module + field selection */}
                <AccessConfigurator
                  selectedModules={selectedModules}
                  hiddenFields={hiddenFields}
                  expandedModule={expandedModule}
                  onToggleModule={toggleModule}
                  onUpdateHiddenFields={updateHiddenFields}
                  onExpandModule={setExpandedModule}
                />

                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={saving}>
                  {saving ? 'Creating...' : 'Create Login Account'}
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Quick preset apply */}
                {presets.length > 0 && (
                  <div className="space-y-2">
                    <Label>Apply Preset</Label>
                    <div className="flex flex-wrap gap-2">
                      {presets.map(p => (
                        <button key={p.id} className="text-xs px-3 py-1.5 rounded-lg border border-border hover:border-green-500/50 hover:bg-green-500/5 transition-colors" onClick={() => handleApplyPreset(p.id)} disabled={saving}>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Module + field access */}
                <AccessConfigurator
                  selectedModules={selectedModules}
                  hiddenFields={hiddenFields}
                  expandedModule={expandedModule}
                  onToggleModule={toggleModule}
                  onUpdateHiddenFields={updateHiddenFields}
                  onExpandModule={setExpandedModule}
                />

                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleUpdateAccess} disabled={saving}>
                  {saving ? 'Saving...' : 'Save Access Settings'}
                </Button>

                {/* Reset Password */}
                <div className="pt-4 border-t border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-muted-foreground" />
                    <Label>Reset Password</Label>
                  </div>
                  <div className="flex items-center gap-2 max-w-sm">
                    <Input type="password" placeholder="New password (min 6 chars)" minLength={6} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    <Button variant="outline" onClick={handleResetPassword} disabled={saving || !newPassword}>Reset</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
