'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  LayoutGrid, List, Plus, Settings, Search,
  Link as LinkIcon, MoreVertical, Pencil, Trash2, Eye,
} from 'lucide-react'
import { saveKbEntry, deleteKbEntry } from './actions'

// ─── Dynamic editor ───────────────────────────────────────────────────────────

const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  {
    ssr: false,
    loading: () => <div className="h-40 rounded border border-border animate-pulse bg-muted" />,
  }
)

// ─── Types ────────────────────────────────────────────────────────────────────

export interface KbConfig {
  id: string
  type: string
  name: string
}

export interface KbEntry {
  id: string
  name: string
  category: string | null
  tags: string[]
  url: string | null
  description: string | null
  created_by: string | null
  thumbnail_url: string | null
  attachments: unknown[]
  created_at: string
  updated_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
]

function categoryColor(name: string | null): string {
  if (!name) return CATEGORY_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return CATEGORY_COLORS[Math.abs(hash) % CATEGORY_COLORS.length]
}

function stripHtml(html: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN')
}

// ─── Gallery Card ─────────────────────────────────────────────────────────────

function GalleryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: KbEntry
  onEdit: (e: KbEntry) => void
  onDelete: (id: string) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const color = categoryColor(entry.category)

  return (
    <div
      className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200 cursor-pointer relative group"
      onClick={() => router.push(`/knowledge-base/${entry.id}`)}
    >
      {/* Color band / thumbnail */}
      <div
        className="h-[60px] w-full flex-shrink-0"
        style={
          entry.thumbnail_url
            ? {
                backgroundImage: `url(${entry.thumbnail_url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : { backgroundColor: color + '33', borderBottom: `3px solid ${color}` }
        }
      />

      {/* Three-dot menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <div className="relative">
          <button
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
            className="bg-black/50 hover:bg-black/70 text-white rounded-full p-1 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-7 bg-popover border border-border rounded-md shadow-lg py-1 w-28 z-50"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); onEdit(entry) }}
              >
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-destructive hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); onDelete(entry.id) }}
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-3 space-y-1.5">
        <p className="font-semibold text-sm leading-tight line-clamp-2">{entry.name}</p>

        {entry.category && (
          <span
            className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
          >
            {entry.category}
          </span>
        )}

        {entry.tags && entry.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {entry.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                {tag}
              </span>
            ))}
            {entry.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                +{entry.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {entry.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {stripHtml(entry.description)}
          </p>
        )}

        {entry.url && (
          <div className="flex items-center gap-1.5 text-xs text-blue-500 truncate">
            <LinkIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{entry.url.replace(/^https?:\/\//, '')}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/50">
          <span>{entry.created_by || 'Unknown'}</span>
          <span>{formatDate(entry.created_at)}</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KbClient({
  entries,
  categories,
  tags,
  teamMembers,
  kbCategories,
  kbTags,
}: {
  entries: KbEntry[]
  categories: string[]
  tags: string[]
  teamMembers: string[]
  kbCategories: KbConfig[]
  kbTags: KbConfig[]
}) {
  const router = useRouter()

  // View
  const [view, setView] = useState<'gallery' | 'table'>('gallery')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [createdByFilter, setCreatedByFilter] = useState('')

  // Form state
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<KbEntry | null>(null)
  const [formDescription, setFormDescription] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [formLoading, setFormLoading] = useState(false)

  // ─── Filtering ──────────────────────────────────────────────────────────────

  const filtered = entries.filter(e => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!e.name.toLowerCase().includes(q)) return false
    }
    if (categoryFilter && e.category !== categoryFilter) return false
    if (tagFilter && !(e.tags || []).includes(tagFilter)) return false
    if (createdByFilter && e.created_by !== createdByFilter) return false
    return true
  })

  // ─── Form helpers ───────────────────────────────────────────────────────────

  function openAddForm() {
    setEditingEntry(null)
    setFormDescription('')
    setSelectedTags([])
    setIsFormOpen(true)
  }

  function openEditForm(entry: KbEntry) {
    setEditingEntry(entry)
    setFormDescription(entry.description || '')
    setSelectedTags(entry.tags || [])
    setIsFormOpen(true)
  }

  function closeForm() {
    setIsFormOpen(false)
    setEditingEntry(null)
    setFormDescription('')
    setSelectedTags([])
  }

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('description', formDescription)
    // Remove any existing tags from the form and re-add from state
    fd.delete('tags')
    selectedTags.forEach(t => fd.append('tags', t))

    const result = await saveKbEntry(fd)
    if (result.success) {
      toast.success(editingEntry ? 'Entry updated' : 'Entry added')
      closeForm()
      router.refresh()
    } else {
      toast.error('Error: ' + result.error)
    }
    setFormLoading(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return
    const result = await deleteKbEntry(id)
    if (result.success) {
      toast.success('Entry deleted')
      router.refresh()
    } else {
      toast.error('Error: ' + result.error)
    }
  }

  function addTag(tag: string) {
    if (!selectedTags.includes(tag)) setSelectedTags(prev => [...prev, tag])
  }

  function removeTag(tag: string) {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  // Unique created_by values from entries for filter dropdown
  const createdByOptions = Array.from(new Set(entries.map(e => e.created_by).filter(Boolean))) as string[]

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-sm text-muted-foreground mt-1">Team resources, guides &amp; references</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href="/knowledge-base/settings">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView('gallery')}
              title="Gallery view"
              className={`px-3 py-2 transition-colors ${view === 'gallery' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('table')}
              title="Table view"
              className={`px-3 py-2 transition-colors ${view === 'table' ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <Button size="sm" onClick={openAddForm} className="bg-primary hover:bg-primary/90 text-white">
            <Plus className="w-4 h-4 mr-1" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={tagFilter}
          onChange={e => setTagFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Tags</option>
          {tags.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={createdByFilter}
          onChange={e => setCreatedByFilter(e.target.value)}
          className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="">All Members</option>
          {createdByOptions.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* ── GALLERY VIEW ── */}
      {view === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(entry => (
            <GalleryCard
              key={entry.id}
              entry={entry}
              onEdit={openEditForm}
              onDelete={handleDelete}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <p className="text-lg font-medium mb-1">No entries found</p>
              <p className="text-sm">Add your first knowledge base entry to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TABLE VIEW ── */}
      {view === 'table' && (
        <div className="border border-border rounded-xl bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>URL</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(entry => {
                const color = categoryColor(entry.category)
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Link
                        href={`/knowledge-base/${entry.id}`}
                        className="font-medium hover:underline"
                      >
                        {entry.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {entry.category ? (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
                        >
                          {entry.category}
                        </span>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(entry.tags || []).map(tag => (
                          <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                            {tag}
                          </span>
                        ))}
                        {(!entry.tags || entry.tags.length === 0) && (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      {entry.url ? (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline text-sm flex items-center gap-1 truncate"
                          onClick={e => e.stopPropagation()}
                        >
                          <LinkIcon className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{entry.url.replace(/^https?:\/\//, '')}</span>
                        </a>
                      ) : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {entry.created_by || '—'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(entry.created_at)}
                    </TableCell>
                    <TableCell className="text-right space-x-1.5">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/knowledge-base/${entry.id}`}>
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEditForm(entry)}>
                        <Pencil className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(entry.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No entries found. Add your first entry to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* ── ADD / EDIT DIALOG ── */}
      <Dialog open={isFormOpen} onOpenChange={open => { if (!open) closeForm() }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-5">
            {editingEntry && <input type="hidden" name="id" value={editingEntry.id} />}

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="kb-name">Name *</Label>
              <Input
                id="kb-name"
                name="name"
                required
                placeholder="Resource name"
                defaultValue={editingEntry?.name || ''}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="kb-category">Category</Label>
                <select
                  id="kb-category"
                  name="category"
                  defaultValue={editingEntry?.category || ''}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No Category</option>
                  {kbCategories.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Created By */}
              <div className="space-y-2">
                <Label htmlFor="kb-created-by">Created By</Label>
                {teamMembers.length > 0 ? (
                  <select
                    id="kb-created-by"
                    name="created_by"
                    defaultValue={editingEntry?.created_by || ''}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select member</option>
                    {teamMembers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="kb-created-by"
                    name="created_by"
                    placeholder="Author name"
                    defaultValue={editingEntry?.created_by || ''}
                  />
                )}
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="kb-url">URL</Label>
                <Input
                  id="kb-url"
                  name="url"
                  placeholder="https://"
                  defaultValue={editingEntry?.url || ''}
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="kb-thumbnail">Thumbnail URL</Label>
                <Input
                  id="kb-thumbnail"
                  name="thumbnail_url"
                  placeholder="https://… (optional cover image)"
                  defaultValue={editingEntry?.thumbnail_url || ''}
                />
              </div>
            </div>

            {/* Tags multi-select */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {selectedTags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-destructive transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                onChange={e => { if (e.target.value) { addTag(e.target.value); e.target.value = '' } }}
                defaultValue=""
              >
                <option value="">Add a tag…</option>
                {kbTags
                  .filter(t => !selectedTags.includes(t.name))
                  .map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                }
              </select>
            </div>

            {/* Description / NotionEditor */}
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
              </p>
              <div className="rounded-lg border border-input bg-background px-2 py-2 min-h-[140px]">
                <NotionEditor
                  content={formDescription}
                  onChange={setFormDescription}
                  placeholder="Describe this resource… Type '/' for formatting"
                  minHeight="120px"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? 'Saving…' : editingEntry ? 'Update Entry' : 'Add Entry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
