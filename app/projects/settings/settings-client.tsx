'use client'

import { useState } from 'react'
import { addConfigItem, deleteConfigItem, renameConfigItem, ConfigType } from './actions'
import { toast } from 'sonner'
import { Plus, Trash2, Pencil, Check, X, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConfigItem { id: string; name: string; type: string }

interface SectionProps {
  type: ConfigType
  title: string
  description: string
  items: ConfigItem[]
  icon: string
}

function ConfigSection({ type, title, description, items: initialItems, icon }: SectionProps) {
  const [items, setItems] = useState(initialItems)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd() {
    if (!newName.trim()) return
    setLoading(true)
    const result = await addConfigItem(type, newName.trim())
    if (result.success) {
      // Optimistic update
      setItems(prev => [...prev, { id: Date.now().toString(), name: newName.trim(), type }])
      setNewName('')
      setAdding(false)
      toast.success(`${newName.trim()} added`)
    } else {
      toast.error(result.error || 'Failed to add')
    }
    setLoading(false)
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Remove "${name}"?`)) return
    setLoading(true)
    const result = await deleteConfigItem(id)
    if (result.success) {
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success(`${name} removed`)
    } else {
      toast.error(result.error || 'Failed to delete')
    }
    setLoading(false)
  }

  async function handleRename(id: string) {
    if (!editName.trim()) return
    setLoading(true)
    const result = await renameConfigItem(id, editName.trim())
    if (result.success) {
      setItems(prev => prev.map(i => i.id === id ? { ...i, name: editName.trim() } : i))
      setEditingId(null)
      toast.success('Renamed')
    } else {
      toast.error(result.error || 'Failed to rename')
    }
    setLoading(false)
  }

  function startEdit(item: ConfigItem) {
    setEditingId(item.id)
    setEditName(item.name)
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="border-border text-muted-foreground hover:text-foreground hover:border-white/20 gap-1.5 text-xs h-8"
          onClick={() => { setAdding(true); setNewName('') }}
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Items list */}
      <div className="divide-y divide-white/[0.05]">
        {items.length === 0 && !adding && (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">No {title.toLowerCase()} yet.</p>
            <button
              onClick={() => setAdding(true)}
              className="text-xs text-green-500 hover:text-green-400 mt-1"
            >
              Add the first one
            </button>
          </div>
        )}

        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3 group">
            <GripVertical className="w-4 h-4 text-gray-700 flex-shrink-0" />

            {editingId === item.id ? (
              <>
                <Input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleRename(item.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                  autoFocus
                  className="flex-1 h-8 text-sm bg-muted border-white/20"
                />
                <button
                  onClick={() => handleRename(item.id)}
                  disabled={loading}
                  className="p-1 rounded text-green-400 hover:bg-green-900/30 transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 rounded text-muted-foreground hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="flex-1 text-sm text-foreground">{item.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(item)}
                    className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id, item.name)}
                    disabled={loading}
                    className="p-1.5 rounded hover:bg-red-900/30 text-muted-foreground hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}

        {/* Add new row */}
        {adding && (
          <div className="flex items-center gap-3 px-5 py-3 bg-muted/30">
            <div className="w-4 h-4 flex-shrink-0" />
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAdd()
                if (e.key === 'Escape') { setAdding(false); setNewName('') }
              }}
              autoFocus
              placeholder={`New ${title.slice(0, -1).toLowerCase()}…`}
              className="flex-1 h-8 text-sm bg-muted border-white/20"
            />
            <button
              onClick={handleAdd}
              disabled={loading || !newName.trim()}
              className="p-1 rounded text-green-400 hover:bg-green-900/30 transition-colors disabled:opacity-40"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setAdding(false); setNewName('') }}
              className="p-1 rounded text-muted-foreground hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Count */}
      <div className="px-5 py-2 border-t border-white/[0.05] bg-card/50">
        <span className="text-xs text-muted-foreground">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}

interface ProjectSettingsClientProps {
  platforms: ConfigItem[]
  salesChannels: ConfigItem[]
  industries: ConfigItem[]
  teamMembers: ConfigItem[]
}

export function ProjectSettingsClient({ platforms, salesChannels, industries, teamMembers }: ProjectSettingsClientProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConfigSection
          type="team_member"
          title="Team Members"
          description="People who design and build projects"
          items={teamMembers}
          icon="👤"
        />
        <ConfigSection
          type="platform"
          title="Platforms"
          description="Technologies and builders used"
          items={platforms}
          icon="🛠"
        />
        <ConfigSection
          type="sales_channel"
          title="Sales Channels"
          description="How clients find you"
          items={salesChannels}
          icon="📣"
        />
        <ConfigSection
          type="industry"
          title="Industries"
          description="Client industry tags"
          items={industries}
          icon="🏷"
        />
      </div>
    </div>
  )
}
