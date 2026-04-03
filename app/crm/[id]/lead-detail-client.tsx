'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// Lazy-load Notion editor (browser-only)
const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  { ssr: false, loading: () => <div className="min-h-[80px] rounded-lg border border-border bg-muted/30 animate-pulse" /> }
)

function NoteEditorWrapper({ content, onChange }: { content: string; onChange: (v: string) => void }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-2 min-h-[80px]">
      <NotionEditor
        content={content}
        onChange={onChange}
        placeholder="Write your note… Type '/' for formatting"
        minHeight="60px"
      />
    </div>
  )
}
import {
  ArrowLeft, Building2, User, Mail, Phone, Globe, Linkedin,
  Calendar, MessageSquare, PhoneCall, AtSign, Users2,
  CheckCircle2, XCircle, UserPlus, Pencil, Trash2,
  ExternalLink, AlertTriangle, Clock,
} from 'lucide-react'
import { saveLead, addLeadNote, deleteLeadNote, convertLeadToCustomer } from '../actions'
import { LeadBrief } from './lead-brief'
import type { Lead, LeadStage, LeadSource } from '../crm-client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface LeadNote {
  id: string
  lead_id: string
  note_content: string
  note_type: 'general' | 'call' | 'email' | 'meeting'
  created_by?: string | null
  created_at: string
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
  lost: 'bg-gray-100 text-muted-foreground',
}

const NOTE_TYPE_META = {
  general: { label: 'Note', Icon: MessageSquare, color: 'text-slate-500 bg-slate-100' },
  call: { label: 'Call', Icon: PhoneCall, color: 'text-blue-500 bg-blue-100' },
  email: { label: 'Email', Icon: AtSign, color: 'text-violet-500 bg-violet-100' },
  meeting: { label: 'Meeting', Icon: Users2, color: 'text-amber-500 bg-amber-100' },
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LeadDetailClient({
  lead: initialLead,
  notes: initialNotes,
  stages,
  sources,
}: {
  lead: Lead
  notes: LeadNote[]
  stages: LeadStage[]
  sources: LeadSource[]
}) {
  const [lead, setLead] = useState(initialLead)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editStatus, setEditStatus] = useState<'open' | 'won' | 'lost'>(lead.status as 'open' | 'won' | 'lost')
  const [editRequirements, setEditRequirements] = useState(lead.requirements || '')

  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState<'general' | 'call' | 'email' | 'meeting'>('general')
  const [noteLoading, setNoteLoading] = useState(false)

  const [converting, setConverting] = useState(false)

  // ─── Edit lead ─────────────────────────────────────────────────────────────

  function openEdit() {
    setEditStatus(lead.status as 'open' | 'won' | 'lost')
    setEditRequirements(lead.requirements || '')
    setIsEditOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('requirements', editRequirements)
    const result = await saveLead(fd)
    if (result.success) {
      toast.success('Lead updated')
      setIsEditOpen(false)
      // Server revalidates → page re-renders with fresh data
    } else {
      toast.error('Error: ' + result.error)
    }
    setEditLoading(false)
  }

  // ─── Notes ─────────────────────────────────────────────────────────────────

  async function handleAddNote(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const stripped = noteContent.replace(/<[^>]*>/g, '').trim()
    if (!stripped) return
    setNoteLoading(true)
    const fd = new FormData()
    fd.append('lead_id', lead.id)
    fd.append('note_content', noteContent)
    fd.append('note_type', noteType)
    const result = await addLeadNote(fd)
    if (result.success) {
      toast.success('Note added')
      setNoteContent('')
    } else {
      toast.error('Error: ' + result.error)
    }
    setNoteLoading(false)
  }

  async function handleDeleteNote(noteId: string) {
    if (!confirm('Delete this note?')) return
    const result = await deleteLeadNote(noteId, lead.id)
    if (result.success) toast.success('Note deleted')
    else toast.error('Error: ' + result.error)
  }

  // ─── Convert to customer ───────────────────────────────────────────────────

  async function handleConvert() {
    if (!confirm(
      `Convert "${lead.company_name || lead.contact_person}" to a customer? A new customer record will be created.`
    )) return
    setConverting(true)
    const result = await convertLeadToCustomer(lead.id)
    if (result.success) {
      toast.success('Lead converted to customer!')
    } else {
      toast.error('Error: ' + result.error)
    }
    setConverting(false)
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Back + header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <Link href="/crm">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {lead.company_name || lead.contact_person}
            </h1>
            {lead.company_name && (
              <p className="text-muted-foreground">{lead.contact_person}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {lead.stage && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{
                    backgroundColor: lead.stage.color + '25',
                    color: lead.stage.color,
                    border: `1px solid ${lead.stage.color}60`,
                  }}
                >
                  {lead.stage.name}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[lead.status]}`}>
                {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLE[lead.priority]}`}>
                {lead.priority} Priority
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="w-4 h-4 mr-1.5" />
            Edit
          </Button>
          {lead.status !== 'won' && (
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-foreground"
              onClick={handleConvert}
              disabled={converting}
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              {converting ? 'Converting…' : 'Convert to Customer'}
            </Button>
          )}
          {lead.status === 'won' && lead.converted_customer_id && (
            <Button variant="outline" size="sm" asChild>
              <Link href="/customers">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600" />
                View Customer
                <ExternalLink className="w-3 h-3 ml-1.5" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Lost reason banner */}
      {lead.status === 'lost' && lead.lost_reason && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div><span className="font-medium">Lost reason: </span>{lead.lost_reason}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left column: contact info + requirements */}
        <div className="lg:col-span-1 space-y-4">

          {/* Contact details */}
          <div className="border rounded-lg bg-card p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Contact Details
            </h2>
            {[
              { Icon: User, label: 'Contact', value: lead.contact_person },
              { Icon: Building2, label: 'Company', value: lead.company_name },
              { Icon: Mail, label: 'Email', value: lead.email },
              { Icon: Phone, label: 'Phone', value: lead.phone },
              {
                Icon: Globe, label: 'Website', value: lead.website,
                render: (v: string) => (
                  <a href={v} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    {v} <ExternalLink className="w-3 h-3" />
                  </a>
                ),
              },
              {
                Icon: Linkedin, label: 'LinkedIn', value: lead.linkedin_url,
                render: (v: string) => (
                  <a href={v} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    View Profile <ExternalLink className="w-3 h-3" />
                  </a>
                ),
              },
            ].map(({ Icon, label, value, render }) => {
              if (!value) return null
              return (
                <div key={label} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    {render
                      ? render(value)
                      : <p className="text-sm font-medium break-words">{value}</p>
                    }
                  </div>
                </div>
              )
            })}
          </div>

          {/* Pipeline info */}
          <div className="border rounded-lg bg-card p-4 shadow-sm space-y-3">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Pipeline Info
            </h2>
            {[
              { label: 'Source', value: lead.source?.name },
              { label: 'Stage', value: lead.stage?.name },
              { label: 'Priority', value: lead.priority },
              { label: 'Status', value: lead.status.charAt(0).toUpperCase() + lead.status.slice(1) },
              { label: 'Next Action', value: formatDate(lead.next_action_date) },
              { label: 'Created', value: formatDate(lead.created_at) },
              { label: 'Last Updated', value: formatDate(lead.updated_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">{label}</span>
                <span className="text-sm font-medium">{value || '—'}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right column: requirements + activity */}
        <div className="lg:col-span-2 space-y-4">

          {/* Lead Brief — Notion-style editor */}
          <div className="border rounded-lg bg-card p-4 shadow-sm">
            <LeadBrief leadId={lead.id} initialBrief={lead.requirements || ''} />
          </div>

          {/* Add note */}
          <div className="border rounded-lg bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-3">
              Add Activity / Note
            </h2>
            <form onSubmit={handleAddNote} className="space-y-3">
              <div className="flex gap-2">
                {(Object.keys(NOTE_TYPE_META) as Array<keyof typeof NOTE_TYPE_META>).map(type => {
                  const { label, Icon, color } = NOTE_TYPE_META[type]
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNoteType(type)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        noteType === type
                          ? `${color} border-current`
                          : 'bg-background border-border hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  )
                })}
              </div>
              <NoteEditorWrapper content={noteContent} onChange={setNoteContent} />
              <Button type="submit" size="sm" disabled={noteLoading || !noteContent.replace(/<[^>]*>/g,'').trim()}>
                {noteLoading ? 'Adding…' : 'Add Note'}
              </Button>
            </form>
          </div>

          {/* Activity timeline */}
          <div className="border rounded-lg bg-card p-4 shadow-sm">
            <h2 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground mb-4">
              Activity Timeline
            </h2>

            {initialNotes.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No activity yet. Add the first note above.</p>
            ) : (
              <div className="relative space-y-0">
                {/* Vertical line */}
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

                {initialNotes.map((note, idx) => {
                  const meta = NOTE_TYPE_META[note.note_type] || NOTE_TYPE_META.general
                  const Icon = meta.Icon
                  return (
                    <div key={note.id} className={`relative flex gap-4 ${idx < initialNotes.length - 1 ? 'pb-5' : ''}`}>
                      {/* Icon bubble */}
                      <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${meta.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0 pt-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {meta.label}
                            </span>
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatDateTime(note.created_at)}
                            </span>
                          </div>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {note.note_content.startsWith('<') ? (
                          <div className="notion-prose text-sm mt-1" dangerouslySetInnerHTML={{ __html: note.note_content }} />
                        ) : (
                          <p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{note.note_content}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── EDIT LEAD DIALOG ── */}
      <Dialog open={isEditOpen} onOpenChange={open => { if (!open) setIsEditOpen(false) }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <input type="hidden" name="id" value={lead.id} />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_contact_person">Contact Person *</Label>
                <Input
                  id="edit_contact_person"
                  name="contact_person"
                  defaultValue={lead.contact_person}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_company_name">Company Name</Label>
                <Input id="edit_company_name" name="company_name" defaultValue={lead.company_name || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_email">Email</Label>
                <Input id="edit_email" name="email" type="email" defaultValue={lead.email || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_phone">Phone</Label>
                <Input id="edit_phone" name="phone" defaultValue={lead.phone || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_website">Website</Label>
                <Input id="edit_website" name="website" defaultValue={lead.website || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_linkedin_url">LinkedIn URL</Label>
                <Input id="edit_linkedin_url" name="linkedin_url" defaultValue={lead.linkedin_url || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_stage_id">Stage</Label>
                <select
                  id="edit_stage_id"
                  name="stage_id"
                  defaultValue={lead.stage_id || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Stage</option>
                  {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_source_id">Lead Source</Label>
                <select
                  id="edit_source_id"
                  name="source_id"
                  defaultValue={lead.source_id || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Unknown</option>
                  {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_priority">Priority</Label>
                <select
                  id="edit_priority"
                  name="priority"
                  defaultValue={lead.priority}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_next_action_date">Next Action Date</Label>
                <Input
                  id="edit_next_action_date"
                  name="next_action_date"
                  type="date"
                  defaultValue={lead.next_action_date || ''}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_status">Status</Label>
                <select
                  id="edit_status"
                  name="status"
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as 'open' | 'won' | 'lost')}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              {editStatus === 'lost' && (
                <div className="space-y-2">
                  <Label htmlFor="edit_lost_reason">Lost Reason</Label>
                  <Input
                    id="edit_lost_reason"
                    name="lost_reason"
                    defaultValue={lead.lost_reason || ''}
                    placeholder="Why was this lost?"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Requirements & Details</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
              </p>
              <div className="rounded-lg border border-input bg-background px-2 py-2 min-h-[140px]">
                <NotionEditor
                  content={editRequirements}
                  onChange={setEditRequirements}
                  placeholder="Describe the client's requirements… Type '/' for formatting"
                  minHeight="120px"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Update Lead'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
