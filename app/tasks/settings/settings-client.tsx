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
import { Plus, Pencil, Trash2, Columns3, Tag, GripVertical } from 'lucide-react'
import { saveTaskStatus, deleteTaskStatus, saveTaskLabel, deleteTaskLabel } from './actions'

interface Status { id: string; name: string; color: string; status_order: number }
interface TaskLabel { id: string; name: string; color: string }

const COLORS = ['#6b7280', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6', '#3b82f6', '#6366f1', '#a855f7', '#ec4899']

export function TaskSettingsClient({ statuses, labels }: { statuses: Status[]; labels: TaskLabel[] }) {
  const router = useRouter()
  const [statusDialog, setStatusDialog] = useState(false)
  const [editingStatus, setEditingStatus] = useState<Status | null>(null)
  const [labelDialog, setLabelDialog] = useState(false)
  const [editingLabel, setEditingLabel] = useState<TaskLabel | null>(null)

  async function handleStatusSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editingStatus) fd.set('id', editingStatus.id)
    if (!fd.get('status_order')) fd.set('status_order', String(statuses.length))
    const res = await saveTaskStatus(fd)
    if (res.success) { toast.success(editingStatus ? 'Updated' : 'Added'); setStatusDialog(false); setEditingStatus(null); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeleteStatus(id: string) {
    if (!confirm('Delete this status? Tasks using it will become unassigned.')) return
    const res = await deleteTaskStatus(id)
    if (res.success) { toast.success('Deleted'); router.refresh() } else toast.error(res.error)
  }

  async function handleLabelSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editingLabel) fd.set('id', editingLabel.id)
    const res = await saveTaskLabel(fd)
    if (res.success) { toast.success(editingLabel ? 'Updated' : 'Added'); setLabelDialog(false); setEditingLabel(null); router.refresh() }
    else toast.error(res.error)
  }

  async function handleDeleteLabel(id: string) {
    if (!confirm('Delete this label?')) return
    const res = await deleteTaskLabel(id)
    if (res.success) { toast.success('Deleted'); router.refresh() } else toast.error(res.error)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Task Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage pipeline statuses and labels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Statuses */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Columns3 className="w-4 h-4" /> Pipeline Statuses</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingStatus(null); setStatusDialog(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="space-y-2">
            {statuses.map(s => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <span className="text-sm font-medium flex-1">{s.name}</span>
                <span className="text-xs text-muted-foreground">#{s.status_order}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingStatus(s); setStatusDialog(true) }}><Pencil className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => handleDeleteStatus(s.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
            {statuses.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No statuses yet.</p>}
          </div>
        </div>

        {/* Labels */}
        <div className="bg-card rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2"><Tag className="w-4 h-4" /> Labels</h2>
            <Button size="sm" variant="outline" onClick={() => { setEditingLabel(null); setLabelDialog(true) }}>
              <Plus className="w-4 h-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {labels.map(l => (
              <div key={l.id} className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border hover:bg-muted/50 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: l.color }} />
                <span className="text-sm">{l.name}</span>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100" onClick={() => { setEditingLabel(l); setLabelDialog(true) }}><Pencil className="w-3 h-3" /></Button>
                <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 text-red-400" onClick={() => handleDeleteLabel(l.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
            {labels.length === 0 && <p className="text-sm text-muted-foreground text-center py-6 w-full">No labels yet.</p>}
          </div>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={() => { setStatusDialog(false); setEditingStatus(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingStatus ? 'Edit Status' : 'Add Status'}</DialogTitle></DialogHeader>
          <form onSubmit={handleStatusSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input name="name" required defaultValue={editingStatus?.name || ''} />
            </div>
            <div className="space-y-2">
              <Label>Order</Label>
              <Input name="status_order" type="number" defaultValue={editingStatus?.status_order ?? statuses.length} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="color" value={c} defaultChecked={c === (editingStatus?.color || '#6b7280')} className="sr-only peer" />
                    <div className="w-8 h-8 rounded-lg border-2 border-transparent peer-checked:border-white transition-colors" style={{ backgroundColor: c }} />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setStatusDialog(false); setEditingStatus(null) }}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-foreground">{editingStatus ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Label Dialog */}
      <Dialog open={labelDialog} onOpenChange={() => { setLabelDialog(false); setEditingLabel(null) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingLabel ? 'Edit Label' : 'Add Label'}</DialogTitle></DialogHeader>
          <form onSubmit={handleLabelSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input name="name" required defaultValue={editingLabel?.name || ''} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map(c => (
                  <label key={c} className="cursor-pointer">
                    <input type="radio" name="color" value={c} defaultChecked={c === (editingLabel?.color || '#6b7280')} className="sr-only peer" />
                    <div className="w-8 h-8 rounded-lg border-2 border-transparent peer-checked:border-white transition-colors" style={{ backgroundColor: c }} />
                  </label>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setLabelDialog(false); setEditingLabel(null) }}>Cancel</Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90 text-foreground">{editingLabel ? 'Update' : 'Add'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
