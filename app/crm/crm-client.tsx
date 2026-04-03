'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  { ssr: false, loading: () => <div className="min-h-[120px] rounded-md border border-input bg-muted/20 animate-pulse" /> }
)
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  LayoutGrid, List, Plus, Settings2, Search,
  Calendar, Pencil, Trash2,
} from 'lucide-react'
import {
  saveLead, deleteLead, updateLeadStage,
  saveLeadStage, deleteLeadStage, saveLeadSource, deleteLeadSource,
} from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeadStage {
  id: string
  name: string
  color: string
  stage_order: number
}

export interface LeadSource {
  id: string
  name: string
}

export interface CrmCompany { id: string; name: string }
export interface CrmContact { id: string; company_id: string; name: string; designation?: string | null }

export interface Lead {
  id: string
  company_name?: string | null
  contact_person: string
  email?: string | null
  phone?: string | null
  website?: string | null
  linkedin_url?: string | null
  stage_id?: string | null
  source_id?: string | null
  priority: 'High' | 'Medium' | 'Low'
  requirements?: string | null
  next_action_date?: string | null
  status: 'open' | 'won' | 'lost'
  lost_reason?: string | null
  converted_customer_id?: string | null
  company_id?: string | null
  contact_id?: string | null
  created_at: string
  updated_at: string
  stage?: LeadStage | null
  source?: LeadSource | null
  company?: CrmCompany | null
  contact?: CrmContact | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border border-amber-200',
  Low: 'bg-green-100 text-green-700 border border-green-200',
}

const STATUS_STYLE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  won: 'bg-emerald-100 text-emerald-700',
  lost: 'bg-gray-100 text-gray-500',
}

const STATUS_LABEL: Record<string, string> = { open: 'Open', won: 'Won', lost: 'Lost' }

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function CrmClient({
  leads: initialLeads,
  stages,
  sources: initialSources,
  companies,
  contacts: allContacts,
}: {
  leads: Lead[]
  stages: LeadStage[]
  sources: LeadSource[]
  companies: CrmCompany[]
  contacts: CrmContact[]
}) {
  const [localLeads, setLocalLeads] = useState(initialLeads)
  const [localSources, setLocalSources] = useState(initialSources)
  const [view, setView] = useState<'table' | 'kanban'>('table')

  // Filters
  const [search, setSearch] = useState('')
  const [filterStage, setFilterStage] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  // Lead form
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formStatus, setFormStatus] = useState('open')
  const [formRequirements, setFormRequirements] = useState('')
  const [formCompanyId, setFormCompanyId] = useState('')
  const [formContactId, setFormContactId] = useState('')

  // Admin settings
  const [isAdminOpen, setIsAdminOpen] = useState(false)
  const [adminLoading, setAdminLoading] = useState(false)
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null)
  const [editingSource, setEditingSource] = useState<LeadSource | null>(null)

  // Kanban DnD
  const [dragLeadId, setDragLeadId] = useState<string | null>(null)
  const [dragOverColId, setDragOverColId] = useState<string | null>(null)

  // Sync server updates
  useEffect(() => { setLocalLeads(initialLeads) }, [initialLeads])
  useEffect(() => { setLocalSources(initialSources) }, [initialSources])

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = localLeads.filter(l => {
    if (search) {
      const q = search.toLowerCase()
      const hit = l.contact_person.toLowerCase().includes(q)
        || (l.company_name || '').toLowerCase().includes(q)
        || (l.email || '').toLowerCase().includes(q)
      if (!hit) return false
    }
    if (filterStage && l.stage_id !== filterStage) return false
    if (filterStatus && l.status !== filterStatus) return false
    if (filterPriority && l.priority !== filterPriority) return false
    return true
  })

  // ─── Stats ──────────────────────────────────────────────────────────────────

  const stats = [
    { label: 'Total Leads', value: localLeads.length, color: 'text-gray-900' },
    { label: 'Open', value: localLeads.filter(l => l.status === 'open').length, color: 'text-blue-600' },
    { label: 'Won', value: localLeads.filter(l => l.status === 'won').length, color: 'text-emerald-600' },
    {
      label: 'High Priority',
      value: localLeads.filter(l => l.priority === 'High' && l.status === 'open').length,
      color: 'text-red-600',
    },
  ]

  // ─── Lead Form Handlers ─────────────────────────────────────────────────────

  function openAddForm() {
    setEditingLead(null)
    setFormStatus('open')
    setFormRequirements('')
    setFormCompanyId('')
    setFormContactId('')
    setIsFormOpen(true)
  }

  function openEditForm(lead: Lead) {
    setEditingLead(lead)
    setFormStatus(lead.status)
    setFormRequirements(lead.requirements || '')
    setFormCompanyId(lead.company_id || '')
    setFormContactId(lead.contact_id || '')
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingLead(null)
    setFormStatus('open')
    setFormRequirements('')
    setFormCompanyId('')
    setFormContactId('')
  }

  async function handleLeadSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('requirements', formRequirements)
    fd.set('company_id', formCompanyId)
    fd.set('contact_id', formContactId)
    const result = await saveLead(fd)
    if (result.success) {
      toast.success(editingLead ? 'Lead updated' : 'Lead added')
      closeForm()
    } else {
      toast.error('Error: ' + result.error)
    }
    setFormLoading(false)
  }

  async function handleDeleteLead(id: string) {
    if (!confirm('Delete this lead and all its notes?')) return
    const result = await deleteLead(id)
    if (result.success) toast.success('Lead deleted')
    else toast.error('Error: ' + result.error)
  }

  // ─── Kanban DnD ─────────────────────────────────────────────────────────────

  async function handleDrop(targetColId: string | null) {
    if (!dragLeadId) return
    const prev = localLeads
    setLocalLeads(all =>
      all.map(l =>
        l.id === dragLeadId
          ? { ...l, stage_id: targetColId, stage: stages.find(s => s.id === targetColId) || null }
          : l
      )
    )
    setDragLeadId(null)
    setDragOverColId(null)
    const result = await updateLeadStage(dragLeadId, targetColId || '')
    if (!result.success) {
      toast.error('Failed to update stage')
      setLocalLeads(prev)
    }
  }

  // ─── Admin Handlers ─────────────────────────────────────────────────────────

  async function handleSaveStage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAdminLoading(true)
    const result = await saveLeadStage(new FormData(e.currentTarget))
    if (result.success) {
      toast.success('Stage saved')
      setEditingStage(null)
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error('Error: ' + result.error)
    }
    setAdminLoading(false)
  }

  async function handleDeleteStage(id: string) {
    if (!confirm('Delete this stage? Leads in it will become unassigned.')) return
    const result = await deleteLeadStage(id)
    if (result.success) toast.success('Stage deleted')
    else toast.error('Error: ' + result.error)
  }

  async function handleSaveSource(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setAdminLoading(true)
    const fd = new FormData(e.currentTarget)
    const result = await saveLeadSource(
      fd.get('source_name') as string,
      (fd.get('source_id') as string) || undefined
    )
    if (result.success) {
      toast.success('Source saved')
      setEditingSource(null)
      ;(e.target as HTMLFormElement).reset()
    } else {
      toast.error('Error: ' + result.error)
    }
    setAdminLoading(false)
  }

  async function handleDeleteSource(id: string) {
    if (!confirm('Delete this source?')) return
    const result = await deleteLeadSource(id)
    if (result.success) toast.success('Source deleted')
    else toast.error('Error: ' + result.error)
  }

  // ─── Kanban columns (Unassigned + each stage) ────────────────────────────────

  const kanbanCols = [
    { id: null as string | null, name: 'Unassigned', color: '#94a3b8' },
    ...stages.map(s => ({ id: s.id as string | null, name: s.name, color: s.color })),
  ]

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM — Leads</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsAdminOpen(true)}>
            <Settings2 className="w-4 h-4 mr-2" />
            Pipeline Settings
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={openAddForm}>
            <Plus className="w-4 h-4 mr-1" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="border rounded-lg p-4 bg-card shadow-sm text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, company, email…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          value={filterStage}
          onChange={e => setFilterStage(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Stages</option>
          {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
        <select
          value={filterPriority}
          onChange={e => setFilterPriority(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <div className="flex border rounded-md overflow-hidden">
          <button
            onClick={() => setView('table')}
            title="Table view"
            className={`px-3 py-2 transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView('kanban')}
            title="Kanban view"
            className={`px-3 py-2 transition-colors ${view === 'kanban' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="border rounded-md bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Next Action</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(lead => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/crm/${lead.id}`} className="hover:underline">
                      <p className="font-medium">{lead.contact_person}</p>
                      {lead.company_name && (
                        <p className="text-sm text-muted-foreground">{lead.company_name}</p>
                      )}
                      {lead.email && (
                        <p className="text-xs text-muted-foreground">{lead.email}</p>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.company ? (
                      <Link href={`/customers/${lead.company_id}`} className="text-primary hover:underline text-sm">
                        {lead.company.name}
                      </Link>
                    ) : lead.company_name ? (
                      <span className="text-muted-foreground">{lead.company_name}</span>
                    ) : <span className="text-muted-foreground">—</span>}
                    {lead.contact && (
                      <p className="text-xs text-muted-foreground">{lead.contact.name}</p>
                    )}
                  </TableCell>
                  <TableCell>
                    {lead.stage ? (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: lead.stage.color + '25',
                          color: lead.stage.color,
                          border: `1px solid ${lead.stage.color}50`,
                        }}
                      >
                        {lead.stage.name}
                      </span>
                    ) : <span className="text-muted-foreground text-sm">—</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {lead.source?.name || '—'}
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_STYLE[lead.priority]}`}>
                      {lead.priority}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[lead.status]}`}>
                      {STATUS_LABEL[lead.status]}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(lead.next_action_date)}
                  </TableCell>
                  <TableCell className="text-right space-x-1.5">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/crm/${lead.id}`}>View</Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEditForm(lead)}>Edit</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteLead(lead.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    No leads found. Add your first lead to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${kanbanCols.length * 300}px` }}>
            {kanbanCols.map(col => {
              const colKey = col.id || '__unassigned__'
              const colLeads = filtered.filter(l =>
                col.id === null ? !l.stage_id : l.stage_id === col.id
              )
              const isOver = dragOverColId === colKey

              return (
                <div
                  key={colKey}
                  className={`w-72 flex-shrink-0 flex flex-col rounded-lg border transition-colors ${
                    isOver ? 'border-primary bg-primary/5' : 'border-border bg-muted/30'
                  }`}
                  onDragOver={e => { e.preventDefault(); setDragOverColId(colKey) }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDragOverColId(null)
                    }
                  }}
                  onDrop={async e => { e.preventDefault(); await handleDrop(col.id) }}
                >
                  {/* Column header */}
                  <div
                    className="px-3 py-2.5 flex items-center justify-between rounded-t-lg border-b"
                    style={{
                      backgroundColor: col.color + '20',
                      borderColor: col.color + '40',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                      <span className="font-semibold text-sm">{col.name}</span>
                    </div>
                    <span className="text-xs bg-card border rounded-full px-2 py-0.5 text-muted-foreground">
                      {colLeads.length}
                    </span>
                  </div>

                  {/* Cards */}
                  <div className="flex flex-col gap-2 p-2 min-h-[80px] flex-1">
                    {colLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.effectAllowed = 'move'
                          e.dataTransfer.setData('text/plain', lead.id)
                          setDragLeadId(lead.id)
                        }}
                        onDragEnd={() => { setDragLeadId(null); setDragOverColId(null) }}
                        className={`bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all select-none ${
                          dragLeadId === lead.id ? 'opacity-40 scale-95' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1.5">
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/crm/${lead.id}`}
                              className="font-medium text-sm hover:underline block truncate"
                              onClick={e => e.stopPropagation()}
                            >
                              {lead.contact_person}
                            </Link>
                            {lead.company_name && (
                              <p className="text-xs text-muted-foreground truncate">{lead.company_name}</p>
                            )}
                          </div>
                          <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${PRIORITY_STYLE[lead.priority]}`}>
                            {lead.priority[0]}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                          {lead.source?.name
                            ? <span className="truncate">{lead.source.name}</span>
                            : <span />
                          }
                          {lead.next_action_date && (
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <Calendar className="w-3 h-3" />
                              {new Date(lead.next_action_date).toLocaleDateString('en-IN', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLE[lead.status]}`}>
                            {STATUS_LABEL[lead.status]}
                          </span>
                          <button
                            onClick={() => openEditForm(lead)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {colLeads.length === 0 && (
                      <p className="text-center text-xs text-muted-foreground py-6">
                        {isOver ? 'Drop here' : 'No leads'}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LEAD FORM DIALOG ── */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleLeadSubmit} className="space-y-4">
            {editingLead && <input type="hidden" name="id" value={editingLead.id} />}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_person">Contact Person *</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  defaultValue={editingLead?.contact_person || ''}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name</Label>
                <Input id="company_name" name="company_name" defaultValue={editingLead?.company_name || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" defaultValue={editingLead?.email || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" defaultValue={editingLead?.phone || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" placeholder="https://" defaultValue={editingLead?.website || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  placeholder="https://linkedin.com/in/…"
                  defaultValue={editingLead?.linkedin_url || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage_id">Stage</Label>
                <select
                  id="stage_id"
                  name="stage_id"
                  defaultValue={editingLead?.stage_id || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Stage</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source_id">Lead Source</Label>
                <select
                  id="source_id"
                  name="source_id"
                  defaultValue={editingLead?.source_id || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unknown</option>
                  {localSources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue={editingLead?.priority || 'Medium'}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="next_action_date">Next Action Date</Label>
                <Input
                  id="next_action_date"
                  name="next_action_date"
                  type="date"
                  defaultValue={editingLead?.next_action_date || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  name="status"
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              {formStatus === 'lost' && (
                <div className="space-y-2">
                  <Label htmlFor="lost_reason">Lost Reason</Label>
                  <Input
                    id="lost_reason"
                    name="lost_reason"
                    placeholder="Why was this lost?"
                    defaultValue={editingLead?.lost_reason || ''}
                  />
                </div>
              )}
            </div>

            {/* Link to Company & Contact */}
            <div className="border-t pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Link to Company</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company</Label>
                  <select
                    value={formCompanyId}
                    onChange={e => { setFormCompanyId(e.target.value); setFormContactId('') }}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— No Company —</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <select
                    value={formContactId}
                    onChange={e => setFormContactId(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">— No Contact —</option>
                    {allContacts
                      .filter(c => !formCompanyId || c.company_id === formCompanyId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}{c.designation ? ` (${c.designation})` : ''}
                        </option>
                      ))
                    }
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Requirements & Details</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
              </p>
              <div className="rounded-lg border border-input bg-background px-2 py-2 min-h-[140px]">
                <NotionEditor
                  content={formRequirements}
                  onChange={setFormRequirements}
                  placeholder="Service needed, budget range, timeline, scope of work… Type '/' for formatting"
                  minHeight="120px"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? 'Saving…' : editingLead ? 'Update Lead' : 'Add Lead'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── ADMIN / PIPELINE SETTINGS DIALOG ── */}
      <Dialog open={isAdminOpen} onOpenChange={setIsAdminOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pipeline Settings</DialogTitle>
          </DialogHeader>

          <div className="space-y-8 pt-2">

            {/* Stages section */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Pipeline Stages
              </h3>
              <div className="space-y-2 mb-4">
                {stages.map(stage => (
                  <div key={stage.id} className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/40">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: stage.color }} />
                      <span className="text-sm font-medium">{stage.name}</span>
                      <span className="text-xs text-muted-foreground">order: {stage.stage_order}</span>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditingStage(stage)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteStage(stage.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {stages.length === 0 && (
                  <p className="text-sm text-muted-foreground">No stages yet.</p>
                )}
              </div>
              <form onSubmit={handleSaveStage} className="border rounded-md p-3 bg-card space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {editingStage ? 'Edit Stage' : 'New Stage'}
                </p>
                {editingStage && <input type="hidden" name="id" value={editingStage.id} />}
                <div className="grid grid-cols-[1fr_80px_auto_auto] gap-2 items-center">
                  <Input
                    key={`stage-name-${editingStage?.id || 'new'}`}
                    name="name"
                    placeholder="Stage name"
                    defaultValue={editingStage?.name || ''}
                    required
                  />
                  <Input
                    key={`stage-order-${editingStage?.id || 'new'}`}
                    name="stage_order"
                    type="number"
                    placeholder="Order"
                    defaultValue={editingStage?.stage_order ?? ''}
                    required
                  />
                  <input
                    key={`stage-color-${editingStage?.id || 'new'}`}
                    type="color"
                    name="color"
                    defaultValue={editingStage?.color || '#cbd5e1'}
                    className="h-10 w-10 rounded border cursor-pointer p-0.5"
                  />
                  <Button type="submit" size="sm" disabled={adminLoading}>Save</Button>
                </div>
                {editingStage && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingStage(null)}>
                    Cancel
                  </Button>
                )}
              </form>
            </div>

            {/* Sources section */}
            <div>
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
                Lead Sources
              </h3>
              <div className="space-y-2 mb-4">
                {localSources.map(source => (
                  <div key={source.id} className="flex items-center justify-between border rounded-md px-3 py-2 bg-muted/40">
                    <span className="text-sm font-medium">{source.name}</span>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" onClick={() => setEditingSource(source)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteSource(source.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {localSources.length === 0 && (
                  <p className="text-sm text-muted-foreground">No sources yet.</p>
                )}
              </div>
              <form onSubmit={handleSaveSource} className="border rounded-md p-3 bg-card space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  {editingSource ? 'Edit Source' : 'New Source'}
                </p>
                {editingSource && <input type="hidden" name="source_id" value={editingSource.id} />}
                <div className="flex gap-2">
                  <Input
                    key={`source-name-${editingSource?.id || 'new'}`}
                    name="source_name"
                    placeholder="e.g. LinkedIn, Upwork, Website, Referral…"
                    defaultValue={editingSource?.name || ''}
                    required
                    className="flex-1"
                  />
                  <Button type="submit" size="sm" disabled={adminLoading}>Save</Button>
                </div>
                {editingSource && (
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingSource(null)}>
                    Cancel
                  </Button>
                )}
              </form>
            </div>

          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
