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
import {
  Bug, Plus, Trash2, RefreshCw, Pause, Play, CheckCircle2,
  AlertCircle, Link as LinkIcon, ArrowRight,
} from 'lucide-react'
import {
  saveBugherdSettings, testBugherdConnection, fetchBugherdProjects,
  createProjectMapping, deleteProjectMapping, toggleProjectMapping, resyncMapping,
  saveStatusMapping, deleteStatusMapping,
} from './actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Settings { id: string; api_key: string; is_enabled: boolean; cleanup_interval_hours: number; last_cleanup_at: string | null }
interface ProjectMapping {
  id: string; bugherd_project_id: string; bugherd_project_name: string
  project_id: string; projects: { name: string } | null; is_active: boolean
  last_synced_at: string | null; total_tasks: number; error_tasks: number
}
interface StatusMapping {
  id: string; bugherd_status: string; task_status_id: string
  task_statuses: { name: string } | null
}
interface Project { id: string; name: string }
interface TaskStatus { id: string; name: string; status_order: number }

// ─── Main Component ───────────────────────────────────────────────────────────

export function BugherdSettingsClient({ settings, mappings, statusMappings, projects, taskStatuses }: {
  settings: Settings | null; mappings: ProjectMapping[]
  statusMappings: StatusMapping[]; projects: Project[]; taskStatuses: TaskStatus[]
}) {
  const router = useRouter()
  const [apiKey, setApiKey] = useState(settings?.api_key || '')
  const [isEnabled, setIsEnabled] = useState(settings?.is_enabled || false)
  const [cleanupInterval, setCleanupInterval] = useState(settings?.cleanup_interval_hours || 3)
  const [testing, setTesting] = useState(false)
  const [mappingDialog, setMappingDialog] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)
  const [bugherdProjects, setBugherdProjects] = useState<{ id: number; name: string }[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [resyncing, setResyncing] = useState<string | null>(null)

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhooks/bugherd`
    : '/api/webhooks/bugherd'

  // ─── Settings handlers ──────────────────────────────────────────────────

  async function handleSaveSettings() {
    const fd = new FormData()
    if (settings?.id) fd.set('id', settings.id)
    fd.set('api_key', apiKey)
    fd.set('is_enabled', isEnabled.toString())
    fd.set('webhook_url', webhookUrl)
    fd.set('cleanup_interval_hours', String(cleanupInterval))
    const res = await saveBugherdSettings(fd)
    if (res.success) { toast.success('Settings saved'); router.refresh() }
    else toast.error(res.error)
  }

  async function handleTestConnection() {
    setTesting(true)
    const res = await testBugherdConnection(apiKey)
    setTesting(false)
    if (res.success) toast.success('Connected to BugHerd successfully')
    else toast.error(`Connection failed: ${res.error}`)
  }

  // ─── Mapping handlers ──────────────────────────────────────────────────

  async function openMappingDialog() {
    setMappingDialog(true)
    if (apiKey) {
      setLoadingProjects(true)
      const res = await fetchBugherdProjects(apiKey)
      if (res.success) setBugherdProjects(res.projects)
      else toast.error('Failed to load BugHerd projects')
      setLoadingProjects(false)
    }
  }

  async function handleCreateMapping(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    // Set bugherd project name from selected option
    const bhId = fd.get('bugherd_project_id') as string
    const bhProject = bugherdProjects.find(p => String(p.id) === bhId)
    fd.set('bugherd_project_name', bhProject?.name || bhId)
    const res = await createProjectMapping(fd)
    if (res.success) { toast.success('Mapping created'); setMappingDialog(false); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this mapping? All linked task mappings will also be removed.')) return
    const res = await deleteProjectMapping(id)
    if (res.success) { toast.success('Deleted'); router.refresh() } else toast.error(res.error)
  }

  async function handleToggle(id: string) {
    const res = await toggleProjectMapping(id)
    if (res.success) { toast.success('Toggled'); router.refresh() } else toast.error(res.error)
  }

  async function handleResync(id: string) {
    setResyncing(id)
    const res = await resyncMapping(id)
    setResyncing(null)
    if (res.success) {
      toast.success(`Resync complete: ${res.created} created, ${res.skipped} skipped, ${'deleted' in res ? (res as unknown as {deleted:number}).deleted : 0} removed, ${res.errors} errors`)
      router.refresh()
    } else toast.error(res.error)
  }

  // ─── Status mapping handlers ───────────────────────────────────────────

  async function handleSaveStatus(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await saveStatusMapping(fd)
    if (res.success) { toast.success('Status mapping saved'); setStatusDialog(false); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeleteStatus(id: string) {
    const res = await deleteStatusMapping(id)
    if (res.success) { toast.success('Deleted'); router.refresh() } else toast.error(res.error)
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Bug className="w-6 h-6" /> BugHerd Integration</h1>
        <p className="text-sm text-muted-foreground mt-1">Sync client feedback from BugHerd to your task board</p>
      </div>

      <div className="space-y-8">
        {/* ═══ API Configuration ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">API Configuration</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-xs text-muted-foreground">{isEnabled ? 'Enabled' : 'Disabled'}</span>
              <input type="checkbox" checked={isEnabled} onChange={e => setIsEnabled(e.target.checked)} className="rounded" />
            </label>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>BugHerd API Key</Label>
              <Input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Your BugHerd API key" type="password" />
            </div>
            <div className="space-y-2">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input readOnly value={webhookUrl} className="bg-muted font-mono text-xs" />
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied') }}>Copy</Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Paste this URL in BugHerd → Settings → Webhooks</p>
            </div>
            <div className="space-y-2">
              <Label>Auto-Cleanup Interval</Label>
              <div className="flex items-center gap-2">
                <select value={cleanupInterval} onChange={e => setCleanupInterval(Number(e.target.value))} className="flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value={1}>Every 1 hour</option>
                  <option value={2}>Every 2 hours</option>
                  <option value={3}>Every 3 hours</option>
                  <option value={6}>Every 6 hours</option>
                  <option value={12}>Every 12 hours</option>
                  <option value={24}>Every 24 hours</option>
                </select>
                {settings?.last_cleanup_at && (
                  <span className="text-[10px] text-muted-foreground">Last cleanup: {new Date(settings.last_cleanup_at).toLocaleString('en-IN')}</span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">Automatically checks for tasks deleted on BugHerd and removes them from our app</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleSaveSettings}>Save Settings</Button>
              <Button size="sm" variant="outline" onClick={handleTestConnection} disabled={!apiKey || testing}>
                {testing ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        </div>

        {/* ═══ Project Mappings ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Project Mappings</h2>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={openMappingDialog} disabled={!apiKey}>
              <Plus className="w-4 h-4 mr-1" /> Add Mapping
            </Button>
          </div>

          <div className="space-y-3">
            {mappings.map(m => (
              <div key={m.id} className={`p-4 rounded-xl border transition-colors ${m.is_active ? 'border-border' : 'border-border opacity-50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{m.bugherd_project_name}</span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{(m.projects as { name: string } | null)?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title={m.is_active ? 'Pause' : 'Resume'} onClick={() => handleToggle(m.id)}>
                      {m.is_active ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-green-400" />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Resync" onClick={() => handleResync(m.id)} disabled={resyncing === m.id}>
                      <RefreshCw className={`w-3.5 h-3.5 ${resyncing === m.id ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {m.is_active ? <CheckCircle2 className="w-3 h-3 text-green-400" /> : <AlertCircle className="w-3 h-3 text-yellow-400" />}
                    {m.is_active ? 'Active' : 'Paused'}
                  </span>
                  <span>{m.total_tasks} tasks synced</span>
                  {m.error_tasks > 0 && <span className="text-red-400">{m.error_tasks} errors</span>}
                  {m.last_synced_at && <span>Last sync: {new Date(m.last_synced_at).toLocaleDateString('en-IN')}</span>}
                </div>
              </div>
            ))}
            {mappings.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No project mappings yet.</p>}
          </div>
        </div>

        {/* ═══ Status Mappings ═══ */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Status Mappings</h2>
            <Button size="sm" variant="outline" onClick={() => setStatusDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {statusMappings.map(s => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-0.5 rounded bg-muted font-mono text-xs">{s.bugherd_status}</span>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <span className="font-medium">{(s.task_statuses as { name: string } | null)?.name || 'Unknown'}</span>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeleteStatus(s.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {statusMappings.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No status mappings.</p>}
          </div>
        </div>
      </div>

      {/* ═══ Create Mapping Dialog ═══ */}
      <Dialog open={mappingDialog} onOpenChange={setMappingDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Map BugHerd Project</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateMapping} className="space-y-4">
            <div className="space-y-2">
              <Label>BugHerd Project</Label>
              {loadingProjects ? (
                <p className="text-sm text-muted-foreground py-2">Loading BugHerd projects...</p>
              ) : (
                <select name="bugherd_project_id" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select BugHerd project</option>
                  {bugherdProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Our Project</Label>
              <select name="project_id" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setMappingDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Create Mapping</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ═══ Status Mapping Dialog ═══ */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Status Mapping</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveStatus} className="space-y-4">
            <div className="space-y-2">
              <Label>BugHerd Status</Label>
              <Input name="bugherd_status" required placeholder="e.g. backlog, doing, done" />
            </div>
            <div className="space-y-2">
              <Label>Our Task Status</Label>
              <select name="task_status_id" required className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select status</option>
                {taskStatuses.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setStatusDialog(false)}>Cancel</Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Add</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
