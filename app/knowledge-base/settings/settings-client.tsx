'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Pencil, Trash2, Plus, Check, X } from 'lucide-react'
import { addKbConfigItem, deleteKbConfigItem, renameKbConfigItem } from './actions'

export interface KbConfig {
  id: string
  type: string
  name: string
}

// ─── Config Item Row ──────────────────────────────────────────────────────────

function ConfigItem({
  item,
  onDelete,
  onRename,
}: {
  item: KbConfig
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(item.name)
  const [loading, setLoading] = useState(false)

  async function handleSave() {
    if (!editValue.trim() || editValue.trim() === item.name) {
      setIsEditing(false)
      setEditValue(item.name)
      return
    }
    setLoading(true)
    const result = await renameKbConfigItem(item.id, editValue.trim())
    if (result.success) {
      toast.success('Renamed successfully')
      onRename(item.id, editValue.trim())
    } else {
      toast.error('Error: ' + result.error)
      setEditValue(item.name)
    }
    setIsEditing(false)
    setLoading(false)
  }

  async function handleDelete() {
    if (!confirm(`Delete "${item.name}"?`)) return
    setLoading(true)
    const result = await deleteKbConfigItem(item.id)
    if (result.success) {
      toast.success('Deleted')
      onDelete(item.id)
    } else {
      toast.error('Error: ' + result.error)
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-border bg-muted/30 group">
      {isEditing ? (
        <div className="flex items-center gap-2 flex-1">
          <Input
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            className="h-7 text-sm flex-1"
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setIsEditing(false); setEditValue(item.name) }
            }}
          />
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={handleSave} disabled={loading}>
            <Check className="w-3.5 h-3.5 text-green-500" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => { setIsEditing(false); setEditValue(item.name) }}
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
        </div>
      ) : (
        <>
          <span className="text-sm font-medium truncate flex-1">{item.name}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={handleDelete}
              disabled={loading}
            >
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Add Item Form ────────────────────────────────────────────────────────────

function AddItemForm({ type, onAdd }: { type: string; onAdd: (item: KbConfig) => void }) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!value.trim()) return
    setLoading(true)
    const result = await addKbConfigItem(type, value.trim())
    if (result.success) {
      toast.success(`${type === 'category' ? 'Category' : 'Tag'} added`)
      // optimistically add — server revalidates anyway
      onAdd({ id: crypto.randomUUID(), type, name: value.trim() })
      setValue('')
    } else {
      toast.error('Error: ' + result.error)
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-3">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder={type === 'category' ? 'New category name…' : 'New tag name…'}
        className="h-9 text-sm flex-1"
      />
      <Button type="submit" size="sm" disabled={loading || !value.trim()} className="gap-1.5">
        <Plus className="w-4 h-4" />
        Add
      </Button>
    </form>
  )
}

// ─── Section ─────────────────────────────────────────────────────────────────

function ConfigSection({
  title,
  type,
  items,
}: {
  title: string
  type: string
  items: KbConfig[]
}) {
  const [localItems, setLocalItems] = useState(items)

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <h2 className="text-base font-semibold mb-4">{title}</h2>
      <div className="space-y-1.5">
        {localItems.length === 0 && (
          <p className="text-sm text-muted-foreground py-2">No {type}s yet. Add one below.</p>
        )}
        {localItems.map(item => (
          <ConfigItem
            key={item.id}
            item={item}
            onDelete={id => setLocalItems(prev => prev.filter(i => i.id !== id))}
            onRename={(id, name) =>
              setLocalItems(prev => prev.map(i => i.id === id ? { ...i, name } : i))
            }
          />
        ))}
      </div>
      <AddItemForm
        type={type}
        onAdd={item => setLocalItems(prev => [...prev, item])}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KbSettingsClient({
  categories,
  tags,
}: {
  categories: KbConfig[]
  tags: KbConfig[]
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage categories and tags for your knowledge base entries
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConfigSection title="Categories" type="category" items={categories} />
        <ConfigSection title="Tags" type="tag" items={tags} />
      </div>
    </div>
  )
}
