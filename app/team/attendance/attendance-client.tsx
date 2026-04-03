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
  Plus, Search, Clock, CheckCircle2, XCircle, AlertCircle,
} from 'lucide-react'
import { saveAttendance } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceEntry {
  id: string
  team_member_id: string
  team_members: { full_name: string } | null
  date: string
  status: string
  check_in: string | null
  check_out: string | null
  daily_update: string | null
  created_at: string
}

interface Member {
  id: string
  full_name: string
  status: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType; label: string }> = {
  present: { color: 'bg-green-500/15 text-green-400 border-green-500/30', icon: CheckCircle2, label: 'Present' },
  absent: { color: 'bg-red-500/15 text-red-400 border-red-500/30', icon: XCircle, label: 'Absent' },
  half_day: { color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30', icon: AlertCircle, label: 'Half Day' },
  on_leave: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: Clock, label: 'On Leave' },
  holiday: { color: 'bg-purple-500/15 text-purple-400 border-purple-500/30', icon: CheckCircle2, label: 'Holiday' },
  weekend: { color: 'bg-gray-500/15 text-muted-foreground border-gray-500/30', icon: Clock, label: 'Weekend' },
}

function fmt(d: string) { return new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) }
function fmtTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AttendanceClient({ attendance, members, today, isAdmin = true }: { attendance: AttendanceEntry[]; members: Member[]; today: string; isAdmin?: boolean }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterDate, setFilterDate] = useState<string>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AttendanceEntry | null>(null)

  const filtered = attendance.filter(a => {
    if (search && !a.team_members?.full_name?.toLowerCase().includes(search.toLowerCase())) return false
    if (filterStatus && a.status !== filterStatus) return false
    if (filterDate && a.date !== filterDate) return false
    return true
  })

  // Group by date
  const grouped = filtered.reduce<Record<string, AttendanceEntry[]>>((acc, a) => {
    if (!acc[a.date]) acc[a.date] = []
    acc[a.date].push(a)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  function openAdd() {
    setEditing(null)
    setDialogOpen(true)
  }

  function openEdit(a: AttendanceEntry) {
    setEditing(a)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editing) fd.set('id', editing.id)

    // Build check_in/check_out as timestamps
    const date = fd.get('date') as string
    const checkInTime = fd.get('check_in_time') as string
    const checkOutTime = fd.get('check_out_time') as string
    if (checkInTime) fd.set('check_in', `${date}T${checkInTime}:00`)
    if (checkOutTime) fd.set('check_out', `${date}T${checkOutTime}:00`)

    const res = await saveAttendance(fd)
    if (res.success) {
      toast.success(editing ? 'Attendance updated' : 'Attendance marked')
      setDialogOpen(false)
      setEditing(null)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Attendance' : 'My Attendance'}</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days · {attendance.length} records</p>
        </div>
        <Button size="sm" className="bg-primary hover:bg-primary/90 text-foreground" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Mark Attendance</Button>
      </div>

      {/* Today's quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {(['present', 'absent', 'half_day', 'on_leave'] as const).map(s => {
          const cfg = STATUS_CONFIG[s]
          const count = attendance.filter(a => a.date === today && a.status === s).length
          return (
            <div key={s} className="bg-card rounded-lg border border-border p-4">
              <div className="flex items-center gap-2 mb-1">
                <cfg.icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{cfg.label} Today</span>
              </div>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          )
        })}
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
          <option value="present">Present</option>
          <option value="absent">Absent</option>
          <option value="half_day">Half Day</option>
          <option value="on_leave">On Leave</option>
        </select>
        <Input type="date" className="h-10 w-auto" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        {filterDate && <Button size="sm" variant="ghost" className="h-9 text-xs" onClick={() => setFilterDate('')}>Clear date</Button>}
      </div>

      {/* Attendance grouped by date */}
      <div className="space-y-6">
        {sortedDates.map(date => (
          <div key={date}>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">{fmt(date)}</h3>
            <div className="space-y-2">
              {grouped[date].map(a => {
                const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.present
                const Icon = cfg.icon
                return (
                  <div key={a.id} className="bg-card rounded-lg border border-border p-3 flex flex-col sm:flex-row sm:items-start gap-3 cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openEdit(a)}>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{a.team_members?.full_name || 'Unknown'}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className={`font-medium px-1.5 py-0.5 rounded border ${cfg.color}`}>{cfg.label}</span>
                          <span>In: {fmtTime(a.check_in)}</span>
                          <span>Out: {fmtTime(a.check_out)}</span>
                        </div>
                      </div>
                    </div>
                    {a.daily_update && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 flex-1 min-w-0 line-clamp-2">{a.daily_update}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
        {sortedDates.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">No attendance records found.</div>
        )}
      </div>

      {/* Mark/Edit Attendance Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => { setDialogOpen(false); setEditing(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Attendance' : 'Mark Attendance'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team_member_id">Team Member *</Label>
              {members.length === 1 ? (
                <>
                  <input type="hidden" name="team_member_id" value={members[0].id} />
                  <p className="text-sm font-medium py-2">{members[0].full_name}</p>
                </>
              ) : (
                <select id="team_member_id" name="team_member_id" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.team_member_id || ''}>
                  <option value="">Select member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input id="date" name="date" type="date" required defaultValue={editing?.date || today} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="att_status">Status</Label>
              <select id="att_status" name="status" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editing?.status || 'present'}>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="half_day">Half Day</option>
                <option value="on_leave">On Leave</option>
                <option value="holiday">Holiday</option>
                <option value="weekend">Weekend</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="check_in_time">Check In</Label>
                <Input id="check_in_time" name="check_in_time" type="time" defaultValue={editing?.check_in ? new Date(editing.check_in).toTimeString().slice(0, 5) : ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="check_out_time">Check Out</Label>
                <Input id="check_out_time" name="check_out_time" type="time" defaultValue={editing?.check_out ? new Date(editing.check_out).toTimeString().slice(0, 5) : ''} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily_update">Daily Update</Label>
              <Textarea id="daily_update" name="daily_update" rows={4} placeholder="What did you work on today?" defaultValue={editing?.daily_update || ''} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditing(null) }}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-foreground">{editing ? 'Update' : 'Mark Attendance'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
