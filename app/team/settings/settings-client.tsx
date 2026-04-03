'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, Building2, Shield, ChevronDown, MessageSquare } from 'lucide-react'
import { saveDepartment, deleteDepartment } from '../actions'
import { savePreset, deletePreset, saveNotificationSettings, updateTeamMemberSlackId } from '../auth-actions'
import { ALL_MODULES, MODULE_LABELS, type ModuleSlug } from '@/lib/modules'
import { MODULE_FIELDS, MODULES_WITH_FIELDS, type FieldDef } from '@/lib/field-access'

interface Department { id: string; name: string; description: string | null; created_at: string }
interface Preset {
  id: string; name: string; allowed_modules: string[]
  hidden_fields: Record<string, string[]>; created_at: string
}
interface NotifSettings { id: string; slack_webhook_url: string | null; slack_bot_token: string | null; slack_enabled: boolean }
interface SlackMember { id: string; full_name: string; email: string | null; slack_member_id: string | null; slack_email?: string | null }

// ─── Field Selector Component ─────────────────────────────────────────────────

function FieldSelector({ module, hiddenFields, onChange }: {
  module: string; hiddenFields: string[]; onChange: (fields: string[]) => void
}) {
  const fields = MODULE_FIELDS[module] || []
  if (fields.length === 0) return null

  const groups = fields.reduce<Record<string, FieldDef[]>>((acc, f) => {
    const g = f.group || 'Other'
    if (!acc[g]) acc[g] = []
    acc[g].push(f)
    return acc
  }, {})

  function toggle(key: string) {
    onChange(hiddenFields.includes(key) ? hiddenFields.filter(k => k !== key) : [...hiddenFields, key])
  }

  return (
    <div className="ml-6 mt-2 space-y-2">
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
      <p className="text-[10px] text-muted-foreground">Green = visible, Red = hidden for this preset</p>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function TeamSettingsClient({ departments, presets, notifSettings, teamMembers }: { departments: Department[]; presets: Preset[]; notifSettings?: NotifSettings | null; teamMembers?: SlackMember[] }) {
  const router = useRouter()
  const [deptDialogOpen, setDeptDialogOpen] = useState(false)
  const [editingDept, setEditingDept] = useState<Department | null>(null)

  const [presetDialogOpen, setPresetDialogOpen] = useState(false)
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null)
  const [presetName, setPresetName] = useState('')
  const [presetModules, setPresetModules] = useState<string[]>([])
  const [presetHiddenFields, setPresetHiddenFields] = useState<Record<string, string[]>>({})
  const [expandedModule, setExpandedModule] = useState<string | null>(null)

  // Slack state
  const [slackToken, setSlackToken] = useState(notifSettings?.slack_bot_token || '')
  const [slackEnabled, setSlackEnabled] = useState(notifSettings?.slack_enabled || false)

  // ─── Department handlers ────────────────────────────────────────────────────

  async function handleDeptSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editingDept) fd.set('id', editingDept.id)
    const res = await saveDepartment(fd)
    if (res.success) { toast.success(editingDept ? 'Updated' : 'Added'); setDeptDialogOpen(false); setEditingDept(null); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeleteDept(id: string) {
    if (!confirm('Delete this department?')) return
    const res = await deleteDepartment(id)
    if (res.success) { toast.success('Deleted'); router.refresh() }
    else toast.error(res.error)
  }

  // ─── Preset handlers ───────────────────────────────────────────────────────

  function openPresetAdd() {
    setEditingPreset(null)
    setPresetName('')
    setPresetModules(['dashboard'])
    setPresetHiddenFields({})
    setExpandedModule(null)
    setPresetDialogOpen(true)
  }

  function openPresetEdit(p: Preset) {
    setEditingPreset(p)
    setPresetName(p.name)
    setPresetModules(p.allowed_modules || [])
    setPresetHiddenFields(p.hidden_fields || {})
    setExpandedModule(null)
    setPresetDialogOpen(true)
  }

  function togglePresetModule(slug: string) {
    setPresetModules(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  async function handlePresetSubmit() {
    const fd = new FormData()
    if (editingPreset) fd.set('id', editingPreset.id)
    fd.set('name', presetName)
    fd.set('allowed_modules', JSON.stringify(presetModules))
    fd.set('hidden_fields', JSON.stringify(presetHiddenFields))
    const res = await savePreset(fd)
    if (res.success) { toast.success(editingPreset ? 'Preset updated' : 'Preset created'); setPresetDialogOpen(false); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeletePreset(id: string) {
    if (!confirm('Delete this preset?')) return
    const res = await deletePreset(id)
    if (res.success) { toast.success('Preset deleted'); router.refresh() }
    else toast.error(res.error)
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Team Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage departments & access presets</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* ═══ Departments ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Building2 className="w-4 h-4" /> Departments</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingDept(null); setDeptDialogOpen(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {departments.map(d => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-md border border-border hover:bg-muted/50 transition-colors">
                <div>
                  <p className="text-sm font-medium">{d.name}</p>
                  {d.description && <p className="text-xs text-muted-foreground">{d.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingDept(d); setDeptDialogOpen(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeleteDept(d.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
            {departments.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No departments yet.</p>}
          </div>
        </div>

        {/* ═══ Access Presets ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Access Presets</h2>
              <p className="text-xs text-muted-foreground mt-1">Create reusable access configurations to quickly assign to team members</p>
            </div>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={openPresetAdd}>
              <Plus className="w-4 h-4 mr-1" /> New Preset
            </Button>
          </div>
          <div className="space-y-3">
            {presets.map(p => (
              <div key={p.id} className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm">{p.name}</p>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openPresetEdit(p)}><Pencil className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeletePreset(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(p.allowed_modules || []).map(m => (
                    <span key={m} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">{MODULE_LABELS[m as ModuleSlug] || m}</span>
                  ))}
                </div>
                {Object.keys(p.hidden_fields || {}).some(k => ((p.hidden_fields as Record<string, string[]>)[k] || []).length > 0) && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {Object.entries(p.hidden_fields || {}).filter(([, v]) => (v as string[]).length > 0).map(([mod, fields]) =>
                      `${MODULE_LABELS[mod as ModuleSlug] || mod}: ${(fields as string[]).length} hidden`
                    ).join(' · ')}
                  </p>
                )}
              </div>
            ))}
            {presets.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No presets yet. Create one to quickly assign access to team members.</p>}
          </div>
        </div>

        {/* ═══ Slack Integration ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Slack Integration</h2>
              <p className="text-xs text-muted-foreground mt-1">Send task comment notifications to team members on Slack</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground">{slackEnabled ? 'Enabled' : 'Disabled'}</span>
              <input type="checkbox" checked={slackEnabled} onChange={e => setSlackEnabled(e.target.checked)} className="rounded" />
            </label>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Slack Bot Token</Label>
              <Input value={slackToken} onChange={e => setSlackToken(e.target.value)} placeholder="xoxb-..." type="password" />
              <p className="text-[10px] text-muted-foreground">Create a Slack app at api.slack.com, add chat:write scope, install to workspace, and paste the Bot Token here.</p>
            </div>

            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white" onClick={async () => {
              const fd = new FormData()
              if (notifSettings?.id) fd.set('id', notifSettings.id)
              fd.set('slack_bot_token', slackToken)
              fd.set('slack_enabled', slackEnabled.toString())
              const res = await saveNotificationSettings(fd)
              if (res.success) { toast.success('Slack settings saved'); router.refresh() } else toast.error(res.error)
            }}>Save Slack Settings</Button>

            {/* Team member Slack ID mapping */}
            {slackEnabled && teamMembers && teamMembers.length > 0 && (
              <div className="pt-4 border-t border-border">
                <Label className="mb-3 block">Team Member Slack Emails</Label>
                <p className="text-[10px] text-muted-foreground mb-3">Enter the email each member uses on Slack. If left empty, their regular email will be used to find them on Slack.</p>
                <div className="space-y-2">
                  {teamMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-3">
                      <span className="text-sm w-36 truncate">{m.full_name}</span>
                      <Input
                        className="flex-1 h-8 text-xs"
                        placeholder={m.email || 'slack@email.com'}
                        defaultValue={m.slack_email || ''}
                        onBlur={async (e) => {
                          const val = e.target.value.trim()
                          const res = await updateTeamMemberSlackId(m.id, val)
                          if (res.success) toast.success(`Updated for ${m.full_name}`)
                          else toast.error(res.error)
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══ Department Dialog ═══ */}
      <Dialog open={deptDialogOpen} onOpenChange={() => { setDeptDialogOpen(false); setEditingDept(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingDept ? 'Edit Department' : 'Add Department'}</DialogTitle></DialogHeader>
          <form onSubmit={handleDeptSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" name="name" required defaultValue={editingDept?.name || ''} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" defaultValue={editingDept?.description || ''} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setDeptDialogOpen(false); setEditingDept(null) }}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-white">{editingDept ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Preset Dialog ═══ */}
      <Dialog open={presetDialogOpen} onOpenChange={() => setPresetDialogOpen(false)}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPreset ? 'Edit Preset' : 'New Access Preset'}</DialogTitle></DialogHeader>
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Preset Name *</Label>
              <Input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="e.g. Designer, Developer, Accountant" />
            </div>

            {/* Module Access */}
            <div className="space-y-2">
              <Label>Module Access</Label>
              <div className="space-y-1">
                {ALL_MODULES.map(slug => {
                  const enabled = presetModules.includes(slug)
                  const hasFields = MODULES_WITH_FIELDS.includes(slug)
                  const isExpanded = expandedModule === slug
                  const hiddenCount = (presetHiddenFields[slug] || []).length

                  return (
                    <div key={slug}>
                      <div className="flex items-center gap-2">
                        <label className={`flex-1 flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${enabled ? 'border-green-500/50 bg-green-500/10' : 'border-border hover:bg-muted/50'}`}>
                          <input type="checkbox" checked={enabled} onChange={() => togglePresetModule(slug)} className="rounded" />
                          <span className="text-sm font-medium">{MODULE_LABELS[slug]}</span>
                          {hiddenCount > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 ml-auto">{hiddenCount} hidden</span>
                          )}
                        </label>
                        {enabled && hasFields && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setExpandedModule(isExpanded ? null : slug)}>
                            <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        )}
                      </div>
                      {enabled && hasFields && isExpanded && (
                        <FieldSelector
                          module={slug}
                          hiddenFields={presetHiddenFields[slug] || []}
                          onChange={fields => setPresetHiddenFields(prev => ({ ...prev, [slug]: fields }))}
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setPresetDialogOpen(false)}>Cancel</Button>
              <Button className="bg-primary hover:bg-primary/90 text-white" onClick={handlePresetSubmit} disabled={!presetName.trim()}>
                {editingPreset ? 'Update Preset' : 'Create Preset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
