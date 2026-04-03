'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  LayoutGrid, List, Plus, Search, Pencil, Trash2, Eye,
  Phone, Mail, MapPin, Calendar,
} from 'lucide-react'
import { saveTeamMember, deleteTeamMember } from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Department {
  id: string
  name: string
  description: string | null
}

export interface TeamMember {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  profile_photo_url: string | null
  designation: string | null
  department_id: string | null
  departments: { name: string } | null
  employment_type: string
  status: string
  date_of_joining: string | null
  reporting_to: string | null
  salary_type: string
  monthly_ctc: number
  payment_mode: string
  bank_account: string | null
  ifsc_code: string | null
  pan_number: string | null
  aadhaar_last_four: string | null
  pf_number: string | null
  esi_number: string | null
  paid_leaves_balance: number
  created_at: string
  updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  on_leave: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
}

const EMP_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  freelancer: 'Freelancer',
  intern: 'Intern',
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN')
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600',
  'bg-teal-600', 'bg-emerald-600', 'bg-orange-600', 'bg-cyan-600',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

// ─── Card ─────────────────────────────────────────────────────────────────────

function MemberCard({ m, onEdit, onDelete }: { m: TeamMember; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="group relative bg-card rounded-xl border border-border hover:border-primary/30 transition-all overflow-hidden">
      {/* Actions */}
      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <Link href={`/team/${m.id}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7"><Eye className="w-3.5 h-3.5" /></Button>
        </Link>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}><Pencil className="w-3.5 h-3.5" /></Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></Button>
      </div>

      <div className="p-5">
        {/* Avatar + Name */}
        <div className="flex items-center gap-3 mb-4">
          {m.profile_photo_url ? (
            <img src={m.profile_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
          ) : (
            <div className={`w-12 h-12 rounded-full ${avatarColor(m.full_name)} flex items-center justify-center text-white font-semibold text-sm`}>
              {getInitials(m.full_name)}
            </div>
          )}
          <div className="min-w-0">
            <Link href={`/team/${m.id}`} className="font-semibold text-sm hover:text-primary truncate block">{m.full_name}</Link>
            <p className="text-xs text-muted-foreground truncate">{m.designation || 'No designation'}</p>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {m.departments?.name && (
            <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" />{m.departments.name}</p>
          )}
          {m.email && (
            <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" /><span className="truncate">{m.email}</span></p>
          )}
          {m.phone && (
            <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{m.phone}</p>
          )}
          {m.date_of_joining && (
            <p className="flex items-center gap-1.5"><Calendar className="w-3 h-3" />Joined {formatDate(m.date_of_joining)}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[m.status] || STATUS_COLORS.inactive}`}>
            {m.status.replace('_', ' ')}
          </span>
          <span className="text-[10px] text-muted-foreground ml-auto">{EMP_TYPE_LABELS[m.employment_type] || m.employment_type}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamClient({ members, departments }: { members: TeamMember[]; departments: Department[] }) {
  const [view, setView] = useState<'grid' | 'table'>('grid')
  const [search, setSearch] = useState('')
  const [filterDept, setFilterDept] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<TeamMember | null>(null)
  const [showPayroll, setShowPayroll] = useState(false)

  const filtered = members.filter(m => {
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) && !m.designation?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterDept && m.department_id !== filterDept) return false
    if (filterStatus && m.status !== filterStatus) return false
    return true
  })

  function openAdd() {
    setEditing(null)
    setShowPayroll(false)
    setDialogOpen(true)
  }

  function openEdit(m: TeamMember) {
    setEditing(m)
    setShowPayroll(false)
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this team member?')) return
    const res = await deleteTeamMember(id)
    if (res.success) toast.success('Member deleted')
    else toast.error(res.error)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editing) fd.set('id', editing.id)
    const res = await saveTeamMember(fd)
    if (res.success) {
      toast.success(editing ? 'Member updated' : 'Member added')
      setDialogOpen(false)
    } else {
      toast.error(res.error)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Directory</h1>
          <p className="text-sm text-muted-foreground mt-1">{members.length} team member{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('grid')}><LayoutGrid className="w-4 h-4" /></Button>
          <Button variant={view === 'table' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('table')}><List className="w-4 h-4" /></Button>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Member</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by name or designation..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterDept} onChange={e => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="on_leave">On Leave</option>
        </select>
      </div>

      {/* Grid View */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(m => (
            <MemberCard key={m.id} m={m} onEdit={() => openEdit(m)} onDelete={() => handleDelete(m.id)} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">No team members found.</div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-xl border border-border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>PL Balance</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link href={`/team/${m.id}`} className="flex items-center gap-2 hover:text-primary">
                      {m.profile_photo_url ? (
                        <img src={m.profile_photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full ${avatarColor(m.full_name)} flex items-center justify-center text-white font-medium text-xs`}>{getInitials(m.full_name)}</div>
                      )}
                      <span className="font-medium text-sm">{m.full_name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.designation || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{m.departments?.name || '—'}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{EMP_TYPE_LABELS[m.employment_type]}</TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[m.status]}`}>{m.status.replace('_', ' ')}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(m.date_of_joining)}</TableCell>
                  <TableCell className="text-sm">{m.paid_leaves_balance}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(m)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(m.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No team members found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Basic Info</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input id="full_name" name="full_name" required defaultValue={editing?.full_name || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editing?.email || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" defaultValue={editing?.phone || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input id="date_of_birth" name="date_of_birth" type="date" defaultValue={editing?.date_of_birth || ''} />
                </div>
              </div>
            </div>

            {/* Role & Department */}
            <div>
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Role & Department</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="designation">Designation</Label>
                  <Input id="designation" name="designation" placeholder="e.g. Senior Designer" defaultValue={editing?.designation || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department_id">Department</Label>
                  <select id="department_id" name="department_id" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.department_id || ''}>
                    <option value="">Select department</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <select id="employment_type" name="employment_type" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.employment_type || 'full_time'}>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="freelancer">Freelancer</option>
                    <option value="intern">Intern</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select id="status" name="status" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.status || 'active'}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date_of_joining">Date of Joining</Label>
                  <Input id="date_of_joining" name="date_of_joining" type="date" defaultValue={editing?.date_of_joining || ''} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reporting_to">Reporting To</Label>
                  <select id="reporting_to" name="reporting_to" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.reporting_to || ''}>
                    <option value="">None</option>
                    {members.filter(mm => mm.id !== editing?.id).map(mm => <option key={mm.id} value={mm.id}>{mm.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_leaves_balance">PL Balance</Label>
                  <Input id="paid_leaves_balance" name="paid_leaves_balance" type="number" step="0.5" defaultValue={editing?.paid_leaves_balance ?? 12} />
                </div>
              </div>
            </div>

            {/* Payroll section (collapsible) */}
            <div>
              <button type="button" className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider flex items-center gap-2" onClick={() => setShowPayroll(!showPayroll)}>
                Payroll & Compliance {showPayroll ? '▾' : '▸'}
              </button>
              {showPayroll && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salary_type">Salary Type</Label>
                    <select id="salary_type" name="salary_type" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.salary_type || 'monthly'}>
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monthly_ctc">Monthly CTC (INR)</Label>
                    <Input id="monthly_ctc" name="monthly_ctc" type="number" step="0.01" defaultValue={editing?.monthly_ctc || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="payment_mode">Payment Mode</Label>
                    <select id="payment_mode" name="payment_mode" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.payment_mode || 'bank_transfer'}>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="upi">UPI</option>
                      <option value="cash">Cash</option>
                      <option value="cheque">Cheque</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bank_account">Bank Account</Label>
                    <Input id="bank_account" name="bank_account" defaultValue={editing?.bank_account || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ifsc_code">IFSC Code</Label>
                    <Input id="ifsc_code" name="ifsc_code" defaultValue={editing?.ifsc_code || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input id="pan_number" name="pan_number" defaultValue={editing?.pan_number || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="aadhaar_last_four">Aadhaar (last 4)</Label>
                    <Input id="aadhaar_last_four" name="aadhaar_last_four" maxLength={4} defaultValue={editing?.aadhaar_last_four || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pf_number">PF Number</Label>
                    <Input id="pf_number" name="pf_number" defaultValue={editing?.pf_number || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="esi_number">ESI Number</Label>
                    <Input id="esi_number" name="esi_number" defaultValue={editing?.esi_number || ''} />
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">{editing ? 'Update' : 'Add Member'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
