'use client'

import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Plus, Settings, Search, LayoutGrid, List, Calendar,
  Pencil, Trash2, CheckSquare, Square, X, Users,
  FolderKanban, AlertCircle, Clock, Play, StopCircle, MessageSquare, Timer,
} from 'lucide-react'
import { ImageUpload } from '@/components/image-upload'
import { MentionInput, parseMentions } from './mention-input'
import { saveTask, deleteTask, updateTaskStatus, saveChecklistItem, toggleChecklistItem, deleteChecklistItem, addTaskComment, deleteTaskComment, startTimer, stopTimer, deleteTimeLog } from './actions'

const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  { ssr: false, loading: () => <div className="h-32 rounded border border-border animate-pulse bg-muted" /> }
)

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskStatus { id: string; name: string; color: string; status_order: number }
interface TaskLabel { id: string; name: string; color: string }
interface Member { id: string; full_name: string; profile_photo_url: string | null }
interface Project { id: string; name: string }
interface ChecklistItem { id: string; title: string; is_completed: boolean; sort_order: number }
interface TaskComment { id: string; content: string; created_at: string; team_member_id: string | null; source: string | null; team_members: { full_name: string; profile_photo_url: string | null } | null }
interface TimeLog { id: string; started_at: string; stopped_at: string | null; duration_minutes: number; description: string | null; team_member_id: string; team_members: { full_name: string } | null }

interface Task {
  id: string; title: string; description: string | null
  status_id: string | null; priority: string; due_date: string | null
  thumbnail_url: string | null; project_id: string | null
  created_by: string | null; task_order: number
  created_at: string; updated_at: string
  task_assignees: { team_member_id: string; team_members: Member | null }[]
  task_label_assignments: { label_id: string; task_labels: TaskLabel | null }[]
  task_checklist_items: ChecklistItem[]
  task_comments: TaskComment[]
  task_time_logs: TimeLog[]
  metadata: Record<string, unknown> | null
  source: string | null
  projects: { id: string; name: string } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-500/15 text-red-400 border-red-500/30',
  Medium: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Low: 'bg-green-500/15 text-green-400 border-green-500/30',
}

function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() }
const AVATAR_COLORS = ['bg-blue-600', 'bg-purple-600', 'bg-pink-600', 'bg-indigo-600', 'bg-teal-600', 'bg-emerald-600']
function avatarColor(name: string) {
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function formatDate(d: string | null) { return d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '' }
function formatDateTime(d: string) { return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) }
function isOverdue(d: string | null) { return d ? new Date(d) < new Date(new Date().toDateString()) : false }
function formatDuration(mins: number) {
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
function getTotalMinutes(logs: TimeLog[]) { return logs.filter(l => l.stopped_at).reduce((s, l) => s + l.duration_minutes, 0) }

// ─── Task Card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick, currentMemberId, onStartTimer, onStopTimer, isSelected, onToggleSelect, showCheckbox }: {
  task: Task; onClick: () => void; currentMemberId?: string | null
  onStartTimer?: (taskId: string) => void; onStopTimer?: (logId: string) => void
  isSelected?: boolean; onToggleSelect?: () => void; showCheckbox?: boolean
}) {
  const assignees = task.task_assignees?.map(a => a.team_members).filter(Boolean) as Member[] || []
  const labels = task.task_label_assignments?.map(a => a.task_labels).filter(Boolean) as TaskLabel[] || []
  const checklist = task.task_checklist_items || []
  const doneCount = checklist.filter(c => c.is_completed).length
  const overdue = isOverdue(task.due_date)
  const totalMins = getTotalMinutes(task.task_time_logs || [])
  const commentCount = (task.task_comments || []).length
  const runningLog = (task.task_time_logs || []).find(l => !l.stopped_at)
  const isMyRunning = runningLog && runningLog.team_member_id === currentMemberId

  return (
    <div onClick={onClick} className="bg-card rounded-xl border border-border overflow-hidden cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group">
      {/* Thumbnail — cropped on kanban card */}
      {task.thumbnail_url && (
        <img src={task.thumbnail_url} alt="" className="w-full h-36 object-cover object-top" />
      )}

      <div className="p-3">
      {/* Checkbox for bulk select */}
      {showCheckbox && (
        <div className="flex items-center mb-2">
          <input type="checkbox" checked={isSelected} onChange={e => { e.stopPropagation(); onToggleSelect?.() }} className="rounded mr-2" onClick={e => e.stopPropagation()} />
        </div>
      )}
      {/* Labels */}
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {labels.map(l => (
            <span key={l.id} className="h-2 w-10 rounded-full" style={{ backgroundColor: l.color }} title={l.name} />
          ))}
        </div>
      )}

      {/* Title */}
      <p className="font-medium text-sm leading-snug mb-2">{task.title}</p>

      {/* Meta row */}
      <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        {task.due_date && (
          <span className={`flex items-center gap-1 ${overdue ? 'text-red-400' : ''}`}>
            <Calendar className="w-3 h-3" /> {formatDate(task.due_date)}
          </span>
        )}
        {task.priority && task.priority !== 'Medium' && (
          <span className={`px-1.5 py-0.5 rounded border text-[10px] font-medium ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        )}
        {checklist.length > 0 && (
          <span className={`flex items-center gap-1 ${doneCount === checklist.length ? 'text-green-400' : ''}`}>
            <CheckSquare className="w-3 h-3" /> {doneCount}/{checklist.length}
          </span>
        )}
        {totalMins > 0 && (
          <span className="flex items-center gap-1 text-blue-400">
            <Clock className="w-3 h-3" /> {formatDuration(totalMins)}
          </span>
        )}
        {commentCount > 0 && (
          <span className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" /> {commentCount}
          </span>
        )}
        {task.projects && (
          <span className="flex items-center gap-1 truncate max-w-[100px]" title={task.projects.name}>
            <FolderKanban className="w-3 h-3" /> {task.projects.name}
          </span>
        )}
      </div>

      {/* Timer + Assignees row */}
      <div className="flex items-center justify-between mt-2">
        {/* Timer control on card */}
        {currentMemberId && (onStartTimer || onStopTimer) ? (
          runningLog ? (
            isMyRunning ? (
              <button onClick={e => { e.stopPropagation(); onStopTimer?.(runningLog.id) }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors text-[10px] font-medium" title="Stop timer">
                <StopCircle className="w-3 h-3" /> <RunningTimer startedAt={runningLog.started_at} />
              </button>
            ) : (
              <span className="flex items-center gap-1 text-[10px] text-yellow-400"><Clock className="w-3 h-3" /> Running</span>
            )
          ) : (
            <button onClick={e => { e.stopPropagation(); onStartTimer?.(task.id) }} className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors text-[10px] font-medium opacity-0 group-hover:opacity-100" title="Start timer">
              <Play className="w-3 h-3" /> Start
            </button>
          )
        ) : <div />}

        {/* Assignees */}
        {assignees.length > 0 && (
          <div className="flex items-center gap-1">
            {assignees.slice(0, 3).map(a => (
              a.profile_photo_url
                ? <img key={a.id} src={a.profile_photo_url} alt="" className="w-6 h-6 rounded-full object-cover" title={a.full_name} />
                : <div key={a.id} className={`w-6 h-6 rounded-full ${avatarColor(a.full_name)} flex items-center justify-center text-white text-[9px] font-medium`} title={a.full_name}>{getInitials(a.full_name)}</div>
            ))}
            {assignees.length > 3 && <span className="text-[10px] text-muted-foreground">+{assignees.length - 3}</span>}
          </div>
        )}
      </div>
      </div>{/* end p-3 */}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TasksClient({ tasks: initialTasks, statuses, labels, members, projects, isAdmin, currentMemberId }: {
  tasks: Task[]; statuses: TaskStatus[]; labels: TaskLabel[]
  members: Member[]; projects: Project[]; isAdmin: boolean; currentMemberId?: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tasks, setTasks] = useState(initialTasks)
  const [view, setView] = useState<'board' | 'list'>('board')

  // Auto-open task from URL query (e.g. /tasks?task=uuid from notification click)
  useEffect(() => {
    const taskId = searchParams.get('task')
    if (taskId && initialTasks.length > 0) {
      const task = initialTasks.find(t => t.id === taskId)
      if (task) {
        openEdit(task)
        // Clean up the URL
        router.replace('/tasks', { scroll: false })
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Auto-refresh when new tasks are added (e.g. BugHerd webhook creates a task)
  useEffect(() => {
    const supabase = (await import('@/lib/supabase/client')).createClient()
    const channel = supabase
      .channel('tasks-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        router.refresh()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sync tasks + editingTask when server data refreshes (after router.refresh)
  useEffect(() => {
    setTasks(initialTasks)
    setEditingTask(prev => {
      if (!prev) return null
      const updated = initialTasks.find(t => t.id === prev.id)
      return updated || null
    })
  }, [initialTasks])
  const [search, setSearch] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterProject, setFilterProject] = useState('')

  // Task form state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [formDesc, setFormDesc] = useState('')
  const [formAssignees, setFormAssignees] = useState<string[]>([])
  const [formLabels, setFormLabels] = useState<string[]>([])
  const [formThumbnail, setFormThumbnail] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Checklist state for detail view
  const [newCheckItem, setNewCheckItem] = useState('')

  // Comment state
  const [commentText, setCommentText] = useState('')

  // Timer state (unused vars removed — timer is now simple start/stop)

  // Filter tasks
  const filtered = useMemo(() => tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterAssignee && !t.task_assignees?.some(a => a.team_member_id === filterAssignee)) return false
    if (filterPriority && t.priority !== filterPriority) return false
    if (filterProject && t.project_id !== filterProject) return false
    return true
  }), [tasks, search, filterAssignee, filterPriority, filterProject])

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const allFilteredIds = useMemo(() => new Set(filtered.map(t => t.id)), [filtered])
  const allSelected = selectedIds.size > 0 && selectedIds.size === allFilteredIds.size

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }
  function toggleSelectAll() {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(allFilteredIds))
  }
  async function handleBulkDelete() {
    if (!confirm(`Delete ${selectedIds.size} task(s)?`)) return
    for (const id of Array.from(selectedIds)) { await deleteTask(id) }
    setSelectedIds(new Set())
    toast.success('Tasks deleted')
    router.refresh()
  }

  // Group by status for kanban
  const columns = useMemo(() => {
    const cols: Record<string, Task[]> = {}
    statuses.forEach(s => { cols[s.id] = [] })
    cols['unassigned'] = []
    filtered.forEach(t => {
      const key = t.status_id && cols[t.status_id] ? t.status_id : 'unassigned'
      cols[key].push(t)
    })
    return cols
  }, [filtered, statuses])

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const canEdit = isAdmin // only admin/PM can edit tasks

  function openAdd() {
    setEditingTask(null); setFormDesc(''); setFormAssignees([]); setFormLabels([]); setFormThumbnail(null); setDialogOpen(true)
  }

  function openEdit(t: Task) {
    setEditingTask(t)
    setFormDesc(t.description || '')
    setFormAssignees(t.task_assignees?.map(a => a.team_member_id) || [])
    setFormLabels(t.task_label_assignments?.map(a => a.label_id) || [])
    setFormThumbnail(t.thumbnail_url || null)
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    if (editingTask) fd.set('id', editingTask.id)
    fd.set('description', formDesc)
    fd.set('thumbnail_url', formThumbnail || '')
    fd.set('assignee_ids', JSON.stringify(formAssignees))
    fd.set('label_ids', JSON.stringify(formLabels))
    const res = await saveTask(fd)
    setSaving(false)
    if (res.success) { toast.success(editingTask ? 'Task updated' : 'Task created'); setDialogOpen(false); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this task?')) return
    const res = await deleteTask(id)
    if (res.success) { toast.success('Task deleted'); router.refresh() } else toast.error(res.error)
  }

  // Drag & drop
  async function onDragEnd(result: DropResult) {
    if (!result.destination) return
    const { draggableId, destination } = result
    const newStatusId = destination.droppableId === 'unassigned' ? null : destination.droppableId

    // Optimistic update
    setTasks(prev => prev.map(t => t.id === draggableId ? { ...t, status_id: newStatusId } : t))

    const res = await updateTaskStatus(draggableId, newStatusId || '')
    if (!res.success) {
      toast.error('Failed to update status')
      setTasks(initialTasks)
    }
  }

  // Checklist handlers
  async function addCheckItem(taskId: string) {
    if (!newCheckItem.trim()) return
    const fd = new FormData()
    fd.set('task_id', taskId)
    fd.set('title', newCheckItem)
    fd.set('sort_order', String(editingTask?.task_checklist_items?.length || 0))
    const res = await saveChecklistItem(fd)
    if (res.success) { setNewCheckItem(''); router.refresh() } else toast.error(res.error)
  }

  async function toggleCheck(id: string, val: boolean) {
    await toggleChecklistItem(id, val)
    router.refresh()
  }

  async function deleteCheck(id: string) {
    await deleteChecklistItem(id)
    router.refresh()
  }

  // Comment handlers
  async function handleAddComment(taskId: string) {
    if (!commentText.trim() || !currentMemberId) return
    const mentionedIds = parseMentions(commentText, members)
    const res = await addTaskComment(taskId, commentText, currentMemberId, mentionedIds)
    if (res.success) { setCommentText(''); router.refresh() } else toast.error(res.error)
  }

  async function handleDeleteComment(id: string) {
    const res = await deleteTaskComment(id)
    if (res.success) router.refresh()
    else toast.error(res.error)
  }

  // Timer handlers
  async function handleStartTimer(taskId: string) {
    if (!currentMemberId) return
    const res = await startTimer(taskId, currentMemberId)
    if (res.success) router.refresh()
    else toast.error(res.error)
  }

  async function handleStopTimer(logId: string) {
    const res = await stopTimer(logId)
    if (res.success) { toast.success('Timer stopped'); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeleteTimeLog(id: string) {
    const res = await deleteTimeLog(id)
    if (res.success) router.refresh()
    else toast.error(res.error)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Task Board' : 'My Tasks'}</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={view === 'board' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('board')}><LayoutGrid className="w-4 h-4" /></Button>
          <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8" onClick={() => setView('list')}><List className="w-4 h-4" /></Button>
          {isAdmin && (
            <>
              <Button size="sm" variant="outline" asChild><Link href="/tasks/settings"><Settings className="w-4 h-4 mr-1" /> Settings</Link></Button>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={openAdd}><Plus className="w-4 h-4 mr-1" /> Add Task</Button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {isAdmin && members.length > 0 && (
          <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
            <option value="">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
        )}
        <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
          <option value="">All Priority</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        {projects.length > 0 && (
          <select className="h-10 rounded-lg border border-input bg-background px-3 text-sm" value={filterProject} onChange={e => setFilterProject(e.target.value)}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
      </div>

      {/* Bulk action bar */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
          <span className="text-sm font-medium">{selectedIds.size} task{selectedIds.size > 1 ? 's' : ''} selected</span>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete}>
            <Trash2 className="w-4 h-4 mr-1" /> Delete Selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
        </div>
      )}

      {/* ═══ KANBAN VIEW ═══ */}
      {view === 'board' && (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-none" style={{ minHeight: '60vh' }}>
            {statuses.map(status => (
              <Droppable key={status.id} droppableId={status.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-shrink-0 w-[300px] rounded-xl border transition-colors ${snapshot.isDraggingOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}
                  >
                    {/* Column header */}
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                      <span className="font-semibold text-sm flex-1">{status.name}</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{columns[status.id]?.length || 0}</span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-2 min-h-[100px]">
                      {(columns[status.id] || []).map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={snapshot.isDragging ? 'opacity-80 rotate-2' : ''}
                            >
                              <TaskCard task={task} onClick={() => openEdit(task)} currentMemberId={currentMemberId} onStartTimer={handleStartTimer} onStopTimer={handleStopTimer} showCheckbox={isAdmin} isSelected={selectedIds.has(task.id)} onToggleSelect={() => toggleSelect(task.id)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            ))}

            {/* Unassigned column */}
            {columns['unassigned']?.length > 0 && (
              <Droppable droppableId="unassigned">
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={`flex-shrink-0 w-[300px] rounded-xl border ${snapshot.isDraggingOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-muted/30'}`}>
                    <div className="flex items-center gap-2 p-3 border-b border-border">
                      <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-semibold text-sm flex-1">No Status</span>
                      <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{columns['unassigned'].length}</span>
                    </div>
                    <div className="p-2 space-y-2 min-h-[100px]">
                      {columns['unassigned'].map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className={snapshot.isDragging ? 'opacity-80 rotate-2' : ''}>
                              <TaskCard task={task} onClick={() => openEdit(task)} currentMemberId={currentMemberId} onStartTimer={handleStartTimer} onStopTimer={handleStopTimer} showCheckbox={isAdmin} isSelected={selectedIds.has(task.id)} onToggleSelect={() => toggleSelect(task.id)} />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            )}
          </div>
        </DragDropContext>
      )}

      {/* ═══ LIST VIEW ═══ */}
      {view === 'list' && (
        <div className="bg-card rounded-xl border border-border overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {isAdmin && <th className="w-10 px-4 py-3"><input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded" /></th>}
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Task</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assignees</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Project</th>
                <th className="w-16" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => {
                const status = statuses.find(s => s.id === t.status_id)
                const assignees = t.task_assignees?.map(a => a.team_members).filter(Boolean) as Member[]
                return (
                  <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/50 cursor-pointer" onClick={() => openEdit(t)}>
                    {isAdmin && (
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} className="rounded" />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.task_label_assignments?.map(a => a.task_labels).filter(Boolean).map(l => l && (
                          <div key={l.id} className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} title={l.name} />
                        ))}
                        <span className="font-medium">{t.title}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{status ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: status.color + '20', color: status.color }}>{status.name}</span> : '—'}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex -space-x-1">
                        {assignees.slice(0, 3).map(a => (
                          <div key={a.id} className={`w-6 h-6 rounded-full ${avatarColor(a.full_name)} flex items-center justify-center text-white text-[9px] font-medium border-2 border-card`} title={a.full_name}>{getInitials(a.full_name)}</div>
                        ))}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-sm ${isOverdue(t.due_date) ? 'text-red-400' : 'text-muted-foreground'}`}>{formatDate(t.due_date) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{t.projects?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {/* Timer in table */}
                        {currentMemberId && (() => {
                          const rl = (t.task_time_logs || []).find(l => !l.stopped_at)
                          const isMe = rl && rl.team_member_id === currentMemberId
                          return rl ? (
                            isMe ? (
                              <button onClick={e => { e.stopPropagation(); handleStopTimer(rl.id) }} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px]" title="Stop">
                                <StopCircle className="w-3 h-3" /><RunningTimer startedAt={rl.started_at} />
                              </button>
                            ) : <span className="text-[10px] text-yellow-400"><Clock className="w-3 h-3" /></span>
                          ) : (
                            <button onClick={e => { e.stopPropagation(); handleStartTimer(t.id) }} className="p-1 rounded hover:bg-green-500/15 text-muted-foreground hover:text-green-400 transition-colors" title="Start timer">
                              <Play className="w-3.5 h-3.5" />
                            </button>
                          )
                        })()}
                        {isAdmin && <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={e => { e.stopPropagation(); handleDelete(t.id) }}><Trash2 className="w-3.5 h-3.5" /></Button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-16 text-muted-foreground">No tasks found.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* ═══ TASK DIALOG — Edit (admin) / View (member) ═══ */}
      <Dialog open={dialogOpen} onOpenChange={() => setDialogOpen(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{!editingTask ? 'New Task' : canEdit ? 'Edit Task' : 'Task Details'}</DialogTitle>
          </DialogHeader>

          {/* ── ADMIN/PM: Full edit form ── */}
          {canEdit ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input name="title" required defaultValue={editingTask?.title || ''} placeholder="Task title" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <select name="status_id" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editingTask?.status_id || statuses[0]?.id || ''}>
                    {statuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <select name="priority" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editingTask?.priority || 'Medium'}>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input name="due_date" type="date" defaultValue={editingTask?.due_date || ''} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Project (optional)</Label>
                <select name="project_id" className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" defaultValue={editingTask?.project_id || ''}>
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              {/* Thumbnail — show lightbox preview if image exists, upload below */}
              <div className="space-y-2">
                <Label>Thumbnail Image</Label>
                {formThumbnail && editingTask && (
                  <ScreenshotWithLightbox url={formThumbnail} metadata={editingTask.metadata} />
                )}
                {(!formThumbnail || !editingTask) && (
                  <ImageUpload value={formThumbnail} onChange={setFormThumbnail} bucket="task-assets" folder="thumbnails" />
                )}
              </div>

              <div className="space-y-2">
                <Label>Assignees</Label>
                <div className="flex flex-wrap gap-2">
                  {members.map(m => (
                    <label key={m.id} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border cursor-pointer transition-colors text-sm ${formAssignees.includes(m.id) ? 'border-green-500/50 bg-green-500/10 text-green-400' : 'border-border hover:bg-muted/50'}`}>
                      <input type="checkbox" className="sr-only" checked={formAssignees.includes(m.id)} onChange={() => setFormAssignees(prev => prev.includes(m.id) ? prev.filter(x => x !== m.id) : [...prev, m.id])} />
                      {m.full_name}
                    </label>
                  ))}
                </div>
              </div>

              {labels.length > 0 && (
                <div className="space-y-2">
                  <Label>Labels</Label>
                  <div className="flex flex-wrap gap-2">
                    {labels.map(l => (
                      <label key={l.id} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border cursor-pointer transition-colors text-sm ${formLabels.includes(l.id) ? 'border-opacity-50' : 'border-border hover:bg-muted/50 opacity-60'}`} style={formLabels.includes(l.id) ? { borderColor: l.color, backgroundColor: l.color + '20', color: l.color } : {}}>
                        <input type="checkbox" className="sr-only" checked={formLabels.includes(l.id)} onChange={() => setFormLabels(prev => prev.includes(l.id) ? prev.filter(x => x !== l.id) : [...prev, l.id])} />
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
                        {l.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Description</Label>
                <NotionEditor content={formDesc} onChange={setFormDesc} />
              </div>

              {editingTask && (
                <div className="space-y-2">
                  <Label>Checklist</Label>
                  <div className="space-y-1">
                    {(editingTask.task_checklist_items || []).sort((a, b) => a.sort_order - b.sort_order).map(item => (
                      <div key={item.id} className="flex items-center gap-2 group">
                        <button type="button" onClick={() => toggleCheck(item.id, !item.is_completed)}>
                          {item.is_completed ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <span className={`text-sm flex-1 ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                        <button type="button" onClick={() => deleteCheck(item.id)} className="opacity-0 group-hover:opacity-100"><X className="w-3.5 h-3.5 text-red-400" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input placeholder="Add checklist item..." value={newCheckItem} onChange={e => setNewCheckItem(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCheckItem(editingTask.id) } }} />
                    <Button type="button" variant="outline" size="sm" onClick={() => addCheckItem(editingTask.id)}>Add</Button>
                  </div>
                </div>
              )}

              {/* Comments + Timer — only for existing tasks */}
              {editingTask && <TaskCommentsAndTimer task={editingTask} isAdmin={isAdmin} currentMemberId={currentMemberId || null} commentText={commentText} setCommentText={setCommentText} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onStartTimer={handleStartTimer} onStopTimer={handleStopTimer} onDeleteTimeLog={handleDeleteTimeLog} members={members} />}

              <div className="flex justify-end gap-2 pt-2">
                {editingTask && <Button type="button" variant="destructive" size="sm" className="mr-auto" onClick={() => { handleDelete(editingTask.id); setDialogOpen(false) }}>Delete</Button>}
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={saving}>{saving ? 'Saving...' : editingTask ? 'Update' : 'Create Task'}</Button>
              </div>
            </form>
          ) : editingTask && (
            /* ── MEMBER: Read-only view with checklist toggle ── */
            <div className="space-y-5">
              {editingTask.thumbnail_url && (
                <ScreenshotWithLightbox url={editingTask.thumbnail_url} metadata={editingTask.metadata} />
              )}

              <div>
                <h3 className="text-lg font-semibold">{editingTask.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {(() => { const s = statuses.find(st => st.id === editingTask.status_id); return s ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: s.color + '20', color: s.color }}>{s.name}</span> : null })()}
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[editingTask.priority]}`}>{editingTask.priority}</span>
                  {editingTask.due_date && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue(editingTask.due_date) ? 'text-red-400' : 'text-muted-foreground'}`}>
                      <Calendar className="w-3 h-3" /> {formatDate(editingTask.due_date)}
                    </span>
                  )}
                </div>
              </div>

              {editingTask.task_label_assignments?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {editingTask.task_label_assignments.map(a => a.task_labels).filter(Boolean).map(l => l && (
                    <span key={l.id} className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: l.color + '20', color: l.color, border: `1px solid ${l.color}40` }}>{l.name}</span>
                  ))}
                </div>
              )}

              {editingTask.task_assignees?.length > 0 && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Assignees</Label>
                  <div className="flex flex-wrap gap-2">
                    {editingTask.task_assignees.map(a => a.team_members).filter(Boolean).map(m => m && (
                      <span key={m.id} className="text-sm px-2.5 py-1 rounded-lg bg-muted border border-border">{m.full_name}</span>
                    ))}
                  </div>
                </div>
              )}

              {editingTask.description && (
                <div className="space-y-1">
                  <Label className="text-muted-foreground">Description</Label>
                  <div className="text-sm space-y-3 [&_a]:text-blue-400 [&_a]:underline [&_code]:bg-muted/50 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:break-all [&_hr]:border-border [&_hr]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-muted-foreground [&_p]:text-muted-foreground [&_strong]:text-foreground [&_img]:rounded-lg [&_img]:max-w-full" dangerouslySetInnerHTML={{ __html: editingTask.description }} />
                </div>
              )}

              {/* Checklist — members CAN toggle items */}
              {editingTask.task_checklist_items?.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Checklist</Label>
                  <div className="space-y-1">
                    {editingTask.task_checklist_items.sort((a, b) => a.sort_order - b.sort_order).map(item => (
                      <div key={item.id} className="flex items-center gap-2">
                        <button type="button" onClick={() => toggleCheck(item.id, !item.is_completed)}>
                          {item.is_completed ? <CheckSquare className="w-4 h-4 text-green-400" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                        </button>
                        <span className={`text-sm ${item.is_completed ? 'line-through text-muted-foreground' : ''}`}>{item.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comments + Timer for members too */}
              <TaskCommentsAndTimer task={editingTask} isAdmin={isAdmin} currentMemberId={currentMemberId || null} commentText={commentText} setCommentText={setCommentText} onAddComment={handleAddComment} onDeleteComment={handleDeleteComment} onStartTimer={handleStartTimer} onStopTimer={handleStopTimer} onDeleteTimeLog={handleDeleteTimeLog} members={members} />

              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Comments & Timer Section (shared by admin + member views) ────────────────

function TaskCommentsAndTimer({ task, isAdmin, currentMemberId, commentText, setCommentText, onAddComment, onDeleteComment, onStartTimer, onStopTimer, onDeleteTimeLog, members }: {
  task: Task; isAdmin: boolean; currentMemberId: string | null
  commentText: string; setCommentText: (v: string) => void
  onAddComment: (taskId: string) => void; onDeleteComment: (id: string) => void
  onStartTimer: (taskId: string) => void; onStopTimer: (logId: string) => void; onDeleteTimeLog: (id: string) => void
  members: Member[]
}) {
  const comments = (task.task_comments || []).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const timeLogs = (task.task_time_logs || []).sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
  const totalMins = getTotalMinutes(timeLogs)
  const runningLog = timeLogs.find(l => !l.stopped_at)
  const isMyRunning = runningLog && runningLog.team_member_id === currentMemberId

  return (
    <div className="space-y-5 border-t border-border pt-5 mt-2">
      {/* ═══ TIME TRACKING ═══ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label className="flex items-center gap-1.5"><Timer className="w-4 h-4" /> Time Tracking</Label>
          {totalMins > 0 && <span className="text-xs text-blue-400 font-medium">Total: {formatDuration(totalMins)}</span>}
        </div>

        {/* Timer button */}
        {currentMemberId && (
          <div className="mb-3">
            {runningLog ? (
              isMyRunning ? (
                <button type="button" onClick={() => onStopTimer(runningLog.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors w-full">
                  <StopCircle className="w-5 h-5" />
                  <span className="font-medium">Stop Timer</span>
                  <RunningTimer startedAt={runningLog.started_at} />
                </button>
              ) : (
                <p className="text-xs text-yellow-400 flex items-center gap-1.5 py-2"><Clock className="w-3.5 h-3.5" /> {runningLog.team_members?.full_name} has a timer running</p>
              )
            ) : (
              <button type="button" onClick={() => onStartTimer(task.id)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 hover:bg-green-500/20 transition-colors w-full">
                <Play className="w-5 h-5" />
                <span className="font-medium">Start Timer</span>
              </button>
            )}
          </div>
        )}

        {/* Time logs list */}
        {timeLogs.filter(l => l.stopped_at).length > 0 && (
          <div className="space-y-1.5">
            {timeLogs.filter(l => l.stopped_at).map(log => (
              <div key={log.id} className="flex items-center gap-2 text-xs py-1.5 group">
                <Clock className="w-3 h-3 text-blue-400 flex-shrink-0" />
                <span className="font-medium text-blue-400">{formatDuration(log.duration_minutes)}</span>
                <span className="text-muted-foreground">{log.team_members?.full_name}</span>
                <span className="text-muted-foreground ml-auto flex-shrink-0">{formatDateTime(log.started_at)}</span>
                {(isAdmin || log.team_member_id === currentMemberId) && (
                  <button type="button" onClick={() => onDeleteTimeLog(log.id)} className="opacity-0 group-hover:opacity-100"><X className="w-3 h-3 text-red-400" /></button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ═══ COMMENTS ═══ */}
      <div>
        <Label className="flex items-center gap-1.5 mb-3"><MessageSquare className="w-4 h-4" /> Comments ({comments.length})</Label>

        {/* Add comment */}
        {currentMemberId && (
          <div className="flex gap-2 mb-4 items-start">
            <div className="flex-1">
              <MentionInput value={commentText} onChange={setCommentText} onSubmit={() => onAddComment(task.id)} members={members} placeholder="Write a comment... Use @ to mention" />
            </div>
            <Button type="button" size="sm" className="bg-green-600 hover:bg-green-700 text-white mt-0.5" onClick={() => onAddComment(task.id)} disabled={!commentText.trim()}>Post</Button>
          </div>
        )}

        {/* Comment thread */}
        {comments.length > 0 && (
          <div className="space-y-3">
            {comments.map(c => {
              // Get display name: team member name, or BugHerd client name from source field
              const displayName = c.team_members?.full_name || (c.source?.startsWith('bugherd:') ? c.source.split(':')[1] : 'Client')
              const isBugherdComment = c.source?.startsWith('bugherd')
              return (
                <div key={c.id} className="flex gap-2.5 group">
                  {c.team_members?.profile_photo_url
                    ? <img src={c.team_members.profile_photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5" />
                    : <div className={`w-7 h-7 rounded-full ${isBugherdComment ? 'bg-orange-600' : avatarColor(displayName)} flex items-center justify-center text-white text-[9px] font-medium flex-shrink-0 mt-0.5`}>{getInitials(displayName)}</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">{displayName}</span>
                      {isBugherdComment && <span className="text-[9px] px-1 py-0.5 rounded bg-orange-500/15 text-orange-400">BugHerd</span>}
                      <span className="text-[10px] text-muted-foreground">{formatDateTime(c.created_at)}</span>
                      {(isAdmin || c.team_member_id === currentMemberId) && (
                        <button type="button" onClick={() => onDeleteComment(c.id)} className="opacity-0 group-hover:opacity-100 ml-auto"><X className="w-3 h-3 text-red-400" /></button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {comments.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No comments yet.</p>}
      </div>
    </div>
  )
}

// ─── Running Timer Display ────────────────────────────────────────────────────

function RunningTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const start = new Date(startedAt).getTime()
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [startedAt])

  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60
  const pad = (n: number) => n.toString().padStart(2, '0')

  return <span className="ml-auto font-mono text-sm">{pad(h)}:{pad(m)}:{pad(s)}</span>
}

// ─── Screenshot Marker Overlay (BugHerd pin position) ─────────────────────────

function ScreenshotMarker({ metadata }: { metadata: Record<string, unknown> | null }) {
  if (!metadata) return null
  const marker = metadata.screenshot_marker as Record<string, unknown> | null
  if (!marker) return null

  const pinX = marker.pin_x as number | undefined
  const pinY = marker.pin_y as number | undefined
  const viewportW = marker.viewport_width as number | undefined
  const browserH = marker.browser_height as number | undefined

  if (!pinX || !pinY || !viewportW) return null

  // pin_x is relative to viewport width
  const xPercent = (pinX / viewportW) * 100

  // pin_y is relative to viewport/browser height
  // Use browser_height if available, otherwise estimate from viewport width * 0.54 (common ratio)
  const effectiveH = browserH || Math.round(viewportW * 0.54)
  const yPercent = (pinY / effectiveH) * 100

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: `${xPercent}%`, top: `${yPercent}%`, transform: 'translate(-50%, -50%)', zIndex: 10 }}
    >
      <div className="relative">
        <div className="w-6 h-6 rounded-full bg-red-500/25 animate-ping absolute -inset-0.5" />
        <div className="w-5 h-5 rounded-full bg-red-500 border-2 border-white shadow-lg relative" />
      </div>
    </div>
  )
}

// ─── Screenshot with Lightbox (click to view full) ────────────────────────────

function ScreenshotWithLightbox({ url, metadata }: { url: string; metadata: Record<string, unknown> | null }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      {/* Full image with marker — click to enlarge */}
      <div className="relative cursor-zoom-in rounded-lg overflow-hidden border border-border inline-block w-full" onClick={e => { e.stopPropagation(); setOpen(true) }}>
        <img src={url} alt="" className="w-full block" />
        <ScreenshotMarker metadata={metadata} />
      </div>

      {/* Lightbox — rendered via portal at document.body to escape dialog clipping */}
      {open && mounted && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-8"
          style={{ zIndex: 99999 }}
          onClick={e => { e.preventDefault(); e.stopPropagation(); setOpen(false) }}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
        >
          <div className="relative inline-block" onClick={e => e.stopPropagation()} onPointerDown={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
            <img src={url} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', display: 'block' }} />
            <ScreenshotMarker metadata={metadata} />
            <button onClick={e => { e.stopPropagation(); setOpen(false) }} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-lg hover:bg-gray-200">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
