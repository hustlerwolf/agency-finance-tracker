import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserAccess } from '@/lib/auth-utils'
import Link from 'next/link'
import {
  CheckSquare, Calendar, ArrowRight, Clock, CalendarDays,
  Users, AlertCircle, Bug, Timer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { QuoteCard } from '@/components/quote-card'

export const dynamic = 'force-dynamic'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}

function formatDate(d: string | null) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function daysUntil(d: string) {
  const diff = Math.ceil((new Date(d).getTime() - new Date(new Date().toDateString()).getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return `Due in ${diff} days`
}

export default async function DashboardPage() {
  const supabase = createClient()
  const admin = createAdminClient()
  const { teamMemberId, isAdmin } = await getCurrentUserAccess()

  // Get team member name for greeting
  let memberName = 'there'
  if (teamMemberId) {
    const { data: tm } = await admin.from('team_members').select('full_name').eq('id', teamMemberId).single()
    if (tm) memberName = tm.full_name.split(' ')[0] // First name only
  }

  // ─── DATA FOR TEAM MEMBERS ──────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let myTasks: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let upcomingDeadlines: any[] = []
  let leaveBalance = 12
  let attendanceMarked = false
  let activeTimer: { task_title: string; started_at: string } | null = null
  let tasksCompleted = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentMentions: any[] = []

  if (teamMemberId) {
    // My pending tasks
    const { data: assignments } = await admin.from('task_assignees').select('task_id').eq('team_member_id', teamMemberId)
    const taskIds = (assignments || []).map(a => a.task_id)

    if (taskIds.length > 0) {
      // Pending tasks (not Done)
      const { data: pending } = await admin
        .from('tasks')
        .select('id, title, priority, due_date, status_id, task_statuses:status_id(name, color), projects(name)')
        .in('id', taskIds)
        .order('due_date', { ascending: true })
      myTasks = (pending || []).filter(t => {
        const status = (t.task_statuses as unknown as { name: string } | null)
        return status?.name !== 'Done'
      })

      // Upcoming deadlines (next 7 days)
      const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      upcomingDeadlines = myTasks.filter(t => t.due_date && t.due_date <= sevenDaysLater)

      // Completed today
      const today = new Date().toISOString().split('T')[0]
      const { count } = await admin
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .in('id', taskIds)
        .gte('updated_at', today + 'T00:00:00')
      tasksCompleted = count || 0
    }

    // Leave balance
    const { data: tmData } = await admin.from('team_members').select('paid_leaves_balance').eq('id', teamMemberId).single()
    leaveBalance = tmData?.paid_leaves_balance || 0

    // Attendance today
    const today = new Date().toISOString().split('T')[0]
    const { count: attCount } = await admin
      .from('attendance')
      .select('*', { count: 'exact', head: true })
      .eq('team_member_id', teamMemberId)
      .eq('date', today)
    attendanceMarked = (attCount || 0) > 0

    // Active timer
    const { data: runningTimer } = await admin
      .from('task_time_logs')
      .select('started_at, tasks(title)')
      .eq('team_member_id', teamMemberId)
      .is('stopped_at', null)
      .limit(1)
      .single()
    if (runningTimer) {
      activeTimer = {
        task_title: (runningTimer.tasks as unknown as { title: string } | null)?.title || 'Unknown task',
        started_at: runningTimer.started_at,
      }
    }

    // Recent mentions/notifications
    const { data: notifs } = await admin
      .from('notifications')
      .select('id, title, body, task_id, created_at, type')
      .eq('recipient_id', teamMemberId)
      .eq('is_read', false)
      .order('created_at', { ascending: false })
      .limit(5)
    recentMentions = notifs || []
  }

  // ─── DATA FOR ADMIN ─────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let teamOnLeave: any[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let pendingLeaves: any[] = []
  let taskStatusCounts: Record<string, number> = {}
  let totalTeamMembers = 0
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recentBugherdTasks: any[] = []

  if (isAdmin) {
    // Team members on leave today
    const today = new Date().toISOString().split('T')[0]
    const { data: onLeave } = await admin
      .from('leave_requests')
      .select('team_members(full_name)')
      .eq('status', 'approved')
      .lte('start_date', today)
      .gte('end_date', today)
    teamOnLeave = onLeave || []

    // Pending leave approvals
    const { data: pending } = await admin
      .from('leave_requests')
      .select('id, start_date, end_date, total_days, leave_type, team_members!leave_requests_team_member_id_fkey(full_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)
    pendingLeaves = pending || []

    // Task status counts
    const { data: statuses } = await admin.from('task_statuses').select('id, name').order('status_order')
    if (statuses) {
      for (const s of statuses) {
        const { count } = await admin.from('tasks').select('*', { count: 'exact', head: true }).eq('status_id', s.id)
        taskStatusCounts[s.name] = count || 0
      }
    }

    // Total team members
    const { count: tmCount } = await admin.from('team_members').select('*', { count: 'exact', head: true }).eq('status', 'active')
    totalTeamMembers = tmCount || 0

    // Recent BugHerd tasks (last 24h)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: bugherd } = await admin
      .from('tasks')
      .select('id, title, created_at, projects(name)')
      .eq('source', 'bugherd')
      .gte('created_at', yesterday)
      .order('created_at', { ascending: false })
      .limit(5)
    recentBugherdTasks = bugherd || []
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hey {memberName}, {getGreeting()}!</h1>
        <p className="text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      {/* ═══ TEAM MEMBER DASHBOARD ═══ */}
      {!isAdmin && (
        <>
          {/* Stats (2x2) + Quote side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
            {/* Left: 2x2 stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><CheckSquare className="w-3.5 h-3.5" /> Pending Tasks</div>
                <p className="text-2xl font-bold">{myTasks.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><AlertCircle className="w-3.5 h-3.5" /> Deadlines</div>
                <p className="text-2xl font-bold">{upcomingDeadlines.length}</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><CalendarDays className="w-3.5 h-3.5" /> Leave Balance</div>
                <p className="text-2xl font-bold">{leaveBalance} <span className="text-sm font-normal text-muted-foreground">PL</span></p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Clock className="w-3.5 h-3.5" /> Today</div>
                <p className="text-sm font-medium mt-1">{attendanceMarked ? '✓ Checked in' : 'Not checked in'}</p>
              </div>
            </div>
            {/* Right: Quote */}
            <QuoteCard />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            {!attendanceMarked && (
              <Link href="/team/attendance"><Button size="sm" variant="outline"><Clock className="w-4 h-4 mr-1" /> Mark Attendance</Button></Link>
            )}
            <Link href="/team/leaves"><Button size="sm" variant="outline"><CalendarDays className="w-4 h-4 mr-1" /> Apply Leave</Button></Link>
            {activeTimer && (
              <Link href="/tasks" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                <Timer className="w-4 h-4" /> Timer running: {activeTimer.task_title}
              </Link>
            )}
          </div>

          {/* My Pending Tasks */}
          {myTasks.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> My Tasks</h2>
                <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Task</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Project</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Priority</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTasks.slice(0, 10).map(t => {
                      const overdue = t.due_date && new Date(t.due_date) < new Date(new Date().toDateString())
                      const statusColor = (t.task_statuses as { color: string } | null)?.color || '#6b7280'
                      const statusName = (t.task_statuses as { name: string } | null)?.name || '—'
                      return (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                          <td className="px-3 py-2.5">
                            <Link href={`/tasks?task=${t.id}`} className="font-medium hover:text-primary">{t.title}</Link>
                          </td>
                          <td className="px-3 py-2.5 text-muted-foreground">{(t.projects as { name: string } | null)?.name || '—'}</td>
                          <td className="px-3 py-2.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-lg border ${t.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : t.priority === 'Low' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{t.priority}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="text-xs px-2 py-0.5 rounded-lg" style={{ backgroundColor: statusColor + '20', color: statusColor }}>{statusName}</span>
                          </td>
                          <td className={`px-3 py-2.5 text-sm ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                            {t.due_date ? daysUntil(t.due_date) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent Mentions */}
          {recentMentions.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <h2 className="font-semibold mb-3">Unread Notifications</h2>
              <div className="space-y-2">
                {recentMentions.map(n => (
                  <Link key={n.id} href={n.task_id ? `/tasks?task=${n.task_id}` : '/tasks'} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'mention' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{n.title}</p>
                      {n.body && <p className="text-xs text-muted-foreground truncate">{n.body}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {myTasks.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CheckSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">All caught up!</p>
              <p className="text-sm">No pending tasks assigned to you.</p>
            </div>
          )}
        </>
      )}

      {/* ═══ ADMIN DASHBOARD ═══ */}
      {isAdmin && (
        <>
          {/* Stats (2x2) + Quote side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-4">
            {/* Left: 2x2 stat cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Users className="w-3.5 h-3.5" /> Team</div>
                <p className="text-2xl font-bold">{totalTeamMembers}</p>
                {teamOnLeave.length > 0 && <p className="text-xs text-yellow-500 mt-1">{teamOnLeave.length} on leave</p>}
              </div>
              {Object.entries(taskStatusCounts).slice(0, 3).map(([name, count]) => (
                <div key={name} className="bg-card rounded-xl border border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{name}</div>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
            {/* Right: Quote */}
            <QuoteCard />
          </div>
          {/* Remaining status counts */}
          {Object.entries(taskStatusCounts).length > 3 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(taskStatusCounts).slice(3).map(([name, count]) => (
                <div key={name} className="bg-card rounded-xl border border-border p-4">
                  <div className="text-xs text-muted-foreground mb-1">{name}</div>
                  <p className="text-2xl font-bold">{count}</p>
                </div>
              ))}
            </div>
          )}

          {/* Two-column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Leave Approvals */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Pending Leave Approvals</h2>
                <Link href="/team/leaves" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {pendingLeaves.length > 0 ? (
                <div className="space-y-2">
                  {pendingLeaves.map(l => (
                    <Link key={l.id} href="/team/leaves" className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{(l.team_members as { full_name: string } | null)?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(l.start_date)} — {formatDate(l.end_date)} · {l.total_days}d {l.leave_type === 'paid' ? 'PL' : 'LWP'}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">Pending</span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No pending approvals</p>
              )}
            </div>

            {/* Recent BugHerd Activity */}
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><Bug className="w-4 h-4" /> Client Feedback (24h)</h2>
                <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              {recentBugherdTasks.length > 0 ? (
                <div className="space-y-2">
                  {recentBugherdTasks.map(t => (
                    <Link key={t.id} href={`/tasks?task=${t.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <Bug className="w-4 h-4 text-orange-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{(t.projects as { name: string } | null)?.name || 'No project'}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">No new client feedback</p>
              )}
            </div>
          </div>

          {/* My Tasks (admin also has assigned tasks) */}
          {myTasks.length > 0 && (
            <div className="bg-card rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4" /> My Tasks</h2>
                <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></Link>
              </div>
              <div className="space-y-2">
                {myTasks.slice(0, 5).map(t => {
                  const statusColor = (t.task_statuses as { color: string } | null)?.color || '#6b7280'
                  const statusName = (t.task_statuses as { name: string } | null)?.name || '—'
                  return (
                    <Link key={t.id} href={`/tasks?task=${t.id}`} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                      <div className="w-2 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: statusColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.title}</p>
                        <span className="text-xs" style={{ color: statusColor }}>{statusName}</span>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-lg border ${t.priority === 'High' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'}`}>{t.priority}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
