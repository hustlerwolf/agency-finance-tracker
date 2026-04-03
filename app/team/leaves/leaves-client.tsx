'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Search, Check, X, Clock,
} from 'lucide-react'
import { submitLeaveRequest, updateLeaveStatus, deleteLeaveRequest } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeaveRequest {
  id: string
  team_member_id: string
  team_members: { full_name: string } | null
  leave_type: string
  start_date: string
  end_date: string
  is_half_day: boolean
  half_day_period: string | null
  reason: string | null
  status: string
  admin_note: string | null
  total_days: number
  created_at: string
}

interface Member {
  id: string
  full_name: string
  paid_leaves_balance: number
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
}
const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: Clock, approved: Check, rejected: X,
}

function fmt(d: string) { return new Date(d).toLocaleDateString('en-IN') }

// ─── Main Component ───────────────────────────────────────────────────────────

export function LeavesClient({ leaves, members, isAdmin = true }: { leaves: LeaveRequest[]; members: Member[]; isAdmin?: boolean }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isHalfDay, setIsHalfDay] = useState(false)
  const [approveDialogId, setApproveDialogId] = useState<string | null>(null)
  const [adminNote, setAdminNote] = useState('')
  const [approveAction, setApproveAction] = useState<'approved' | 'rejected'>('approved')

  const filtered = leaves.filter(l => {
    if (search && !l.team_members?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && l.status !== filterStatus) return false
    return true
  })

  const pendingCount = leaves.filter(l => l.status === 'pending').length

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    fd.set('is_half_day', isHalfDay.toString())
    const res = await submitLeaveRequest(fd)
    if (res.success) {
      toast.success('Leave request submitted')
      setDialogOpen(false)
      setIsHalfDay(false)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleStatusUpdate() {
    if (!approveDialogId) return
    const res = await updateLeaveStatus(approveDialogId, approveAction, adminNote)
    if (res.success) {
      toast.success(`Leave ${approveAction}`)
      setApproveDialogId(null)
      setAdminNote('')
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this leave request?')) return
    const res = await deleteLeaveRequest(id)
    if (res.success) toast.success('Leave request deleted')
    else toast.error(res.error)
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Leave Management' : 'My Leaves'}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pendingCount > 0 ? `${pendingCount} pending request${pendingCount > 1 ? 's' : ''}` : 'No pending requests'}
          </p>
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setDialogOpen(true)}><Plus className="w-4 h-4 mr-1" /> Apply Leave</Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {isAdmin && (
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        )}
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Leave List */}
      <div className="space-y-3">
        {filtered.map(l => {
          const Icon = STATUS_ICONS[l.status] || Clock
          return (
            <div key={l.id} className="bg-card rounded-lg border border-border p-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${STATUS_COLORS[l.status]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm">{l.team_members?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.leave_type === 'paid' ? 'Paid Leave' : 'LWP'}
                    {l.is_half_day ? ` (Half day - ${l.half_day_period?.replace('_', ' ')})` : ''}
                    {' · '}{l.total_days} day{l.total_days > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{fmt(l.start_date)} {l.start_date !== l.end_date ? `— ${fmt(l.end_date)}` : ''}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUS_COLORS[l.status]}`}>{l.status}</span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {isAdmin && l.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => { setApproveDialogId(l.id); setApproveAction('approved') }}>
                      <Check className="w-3.5 h-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => { setApproveDialogId(l.id); setApproveAction('rejected') }}>
                      <X className="w-3.5 h-3.5 mr-1" /> Reject
                    </Button>
                  </>
                )}
                {l.reason && (
                  <span className="text-xs text-muted-foreground max-w-[150px] truncate hidden lg:block" title={l.reason}>{l.reason}</span>
                )}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No leave requests found.</div>
        )}
      </div>

      {/* Apply Leave Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              {members.length === 1 ? (
                <>
                  <input type="hidden" name="team_member_id" value={members[0].id} />
                  <p className="text-sm font-medium py-2">{members[0].full_name} <span className="text-muted-foreground">(PL: {members[0].paid_leaves_balance})</span></p>
                </>
              ) : (
                <select id="team_member_id" name="team_member_id" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select member</option>
                  {members.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name} (PL: {m.paid_leaves_balance})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="leave_type">Leave Type</Label>
              <select id="leave_type" name="leave_type" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="paid">Paid Leave (PL)</option>
                <option value="lwp">Leave Without Pay (LWP)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="half_day_check" checked={isHalfDay} onChange={e => setIsHalfDay(e.target.checked)} className="rounded" />
              <Label htmlFor="half_day_check" className="cursor-pointer">Half day</Label>
            </div>
            {isHalfDay && (
              <div className="space-y-2">
                <Label htmlFor="half_day_period">Half Day Period</Label>
                <select id="half_day_period" name="half_day_period" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="first_half">First Half</option>
                  <option value="second_half">Second Half</option>
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input id="start_date" name="start_date" type="date" required />
              </div>
              {!isHalfDay && (
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input id="end_date" name="end_date" type="date" required />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea id="reason" name="reason" rows={2} placeholder="Reason for leave..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Submit Request</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Approve/Reject Dialog */}
      <Dialog open={!!approveDialogId} onOpenChange={() => { setApproveDialogId(null); setAdminNote('') }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{approveAction === 'approved' ? 'Approve' : 'Reject'} Leave</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin_note">Note (optional)</Label>
              <Textarea id="admin_note" rows={2} value={adminNote} onChange={e => setAdminNote(e.target.value)} placeholder="Add a note..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setApproveDialogId(null); setAdminNote('') }}>Cancel</Button>
              <Button variant={approveAction === 'approved' ? 'default' : 'destructive'} onClick={handleStatusUpdate}>
                {approveAction === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
