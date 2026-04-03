'use client'

import { useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  ArrowLeft, Pencil, Trash2, Link as LinkIcon, Upload,
  FileText, ImageIcon, File, X, ExternalLink, Save,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  saveKbEntry, deleteKbEntry, updateKbDescription, updateKbAttachments,
} from '../actions'

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

export interface KbAttachment {
  name: string
  url: string
  type: string
  size: number
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
  attachments: KbAttachment[]
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN')
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function fileTypeCategory(type: string): 'pdf' | 'image' | 'other' {
  if (type === 'application/pdf') return 'pdf'
  if (type.startsWith('image/')) return 'image'
  return 'other'
}

// ─── Attachment Card ──────────────────────────────────────────────────────────

function AttachmentCard({
  attachment,
  onDelete,
}: {
  attachment: KbAttachment
  onDelete: () => void
}) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const kind = fileTypeCategory(attachment.type)

  return (
    <>
      <div className="relative group border border-border rounded-lg overflow-hidden bg-muted/30 hover:bg-muted/50 transition-colors">
        {/* Delete button */}
        <button
          onClick={onDelete}
          className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-destructive text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-all"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {kind === 'image' ? (
          <div
            className="cursor-pointer"
            onClick={() => setPreviewOpen(true)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={attachment.url}
              alt={attachment.name}
              className="w-full h-28 object-cover"
            />
            <div className="p-2">
              <p className="text-xs font-medium truncate">{attachment.name}</p>
              <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</p>
            </div>
          </div>
        ) : kind === 'pdf' ? (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-8 h-8 text-red-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs h-7"
              onClick={() => setPreviewOpen(true)}
            >
              Preview
            </Button>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <File className="w-8 h-8 text-muted-foreground flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</p>
              </div>
            </div>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button variant="outline" size="sm" className="w-full text-xs h-7">
                <ExternalLink className="w-3 h-3 mr-1" />
                Download
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="truncate">{attachment.name}</DialogTitle>
          </DialogHeader>
          {kind === 'pdf' ? (
            <iframe
              src={attachment.url}
              width="100%"
              height="600px"
              title={attachment.name}
              className="rounded border border-border"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={attachment.url} alt={attachment.name} className="max-w-full rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function KbDetailClient({
  entry: initialEntry,
  teamMembers,
  kbCategories,
  kbTags,
}: {
  entry: KbEntry
  teamMembers: string[]
  kbCategories: KbConfig[]
  kbTags: KbConfig[]
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [entry, setEntry] = useState(initialEntry)
  const [description, setDescription] = useState(entry.description || '')
  const [descriptionSaving, setDescriptionSaving] = useState(false)
  const [attachments, setAttachments] = useState<KbAttachment[]>(
    Array.isArray(entry.attachments) ? entry.attachments : []
  )
  const [uploading, setUploading] = useState(false)

  // Edit dialog
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editDescription, setEditDescription] = useState(entry.description || '')
  const [editSelectedTags, setEditSelectedTags] = useState<string[]>(entry.tags || [])
  const [editLoading, setEditLoading] = useState(false)

  const color = categoryColor(entry.category)

  // ─── Description save ──────────────────────────────────────────────────────

  async function handleSaveDescription() {
    setDescriptionSaving(true)
    const result = await updateKbDescription(entry.id, description)
    if (result.success) {
      toast.success('Description saved')
      setEntry(prev => ({ ...prev, description, updated_at: new Date().toISOString() }))
    } else {
      toast.error('Error: ' + result.error)
    }
    setDescriptionSaving(false)
  }

  // ─── File upload ───────────────────────────────────────────────────────────

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.')
      return
    }

    setUploading(true)
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `kb-entries/${entry.id}/${Date.now()}-${file.name}`

    const { data, error } = await supabase.storage
      .from('kb-assets')
      .upload(path, file, { upsert: false })

    if (error) {
      toast.error('Upload failed: ' + error.message)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('kb-assets').getPublicUrl(data.path)

    const newAttachment: KbAttachment = {
      name: file.name,
      url: publicUrl,
      type: file.type,
      size: file.size,
    }

    const updated = [...attachments, newAttachment]
    setAttachments(updated)

    const result = await updateKbAttachments(entry.id, updated)
    if (result.success) {
      toast.success('File uploaded')
    } else {
      toast.error('Saved locally but failed to persist: ' + result.error)
    }

    setUploading(false)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ─── Delete attachment ─────────────────────────────────────────────────────

  async function handleDeleteAttachment(index: number) {
    if (!confirm('Remove this attachment?')) return
    const updated = attachments.filter((_, i) => i !== index)
    setAttachments(updated)
    const result = await updateKbAttachments(entry.id, updated)
    if (result.success) {
      toast.success('Attachment removed')
    } else {
      toast.error('Error: ' + result.error)
      setAttachments(attachments) // revert
    }
  }

  // ─── Delete entry ──────────────────────────────────────────────────────────

  async function handleDeleteEntry() {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    const result = await deleteKbEntry(entry.id)
    if (result.success) {
      toast.success('Entry deleted')
      router.push('/knowledge-base')
    } else {
      toast.error('Error: ' + result.error)
    }
  }

  // ─── Edit form submit ──────────────────────────────────────────────────────

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditLoading(true)
    const fd = new FormData(e.currentTarget)
    fd.set('id', entry.id)
    fd.set('description', editDescription)
    fd.delete('tags')
    editSelectedTags.forEach(t => fd.append('tags', t))

    const result = await saveKbEntry(fd)
    if (result.success) {
      toast.success('Entry updated')
      setIsEditOpen(false)
      router.refresh()
    } else {
      toast.error('Error: ' + result.error)
    }
    setEditLoading(false)
  }

  function openEditDialog() {
    setEditDescription(entry.description || '')
    setEditSelectedTags(entry.tags || [])
    setIsEditOpen(true)
  }

  function addEditTag(tag: string) {
    if (!editSelectedTags.includes(tag)) setEditSelectedTags(prev => [...prev, tag])
  }

  function removeEditTag(tag: string) {
    setEditSelectedTags(prev => prev.filter(t => t !== tag))
  }

  return (
    <div className="space-y-6">

      {/* Back + header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{entry.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {entry.category && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
                >
                  {entry.category}
                </span>
              )}
              {(entry.tags || []).map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openEditDialog}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={handleDeleteEntry}>
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">

        {/* Main content */}
        <div className="space-y-6">

          {/* Description */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Description</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDescription}
                disabled={descriptionSaving}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {descriptionSaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-2">
              Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
            </p>
            <div className="rounded-lg border border-input bg-background px-2 py-2 min-h-[160px]">
              <NotionEditor
                content={description}
                onChange={setDescription}
                placeholder="Start writing a description… Type '/' for formatting"
                minHeight="140px"
              />
            </div>
          </div>

          {/* Attachments */}
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Attachments</h2>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileUpload}
                  accept="*/*"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="w-4 h-4 mr-1.5" />
                  {uploading ? 'Uploading…' : 'Upload File'}
                </Button>
              </div>
            </div>

            {attachments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No attachments yet</p>
                <p className="text-xs mt-1">Upload files up to 20MB</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {attachments.map((attachment, index) => (
                  <AttachmentCard
                    key={index}
                    attachment={attachment}
                    onDelete={() => handleDeleteAttachment(index)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div>
          <div className="bg-card border border-border rounded-xl p-5 space-y-4 sticky top-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Details
            </h2>

            {entry.url && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">URL</p>
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-sm text-blue-500 hover:underline break-all"
                >
                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  {entry.url}
                </a>
              </div>
            )}

            {entry.category && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Category</p>
                <span
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: color + '20', color, border: `1px solid ${color}40` }}
                >
                  {entry.category}
                </span>
              </div>
            )}

            {(entry.tags || []).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.created_by && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Created By</p>
                <p className="text-sm">{entry.created_by}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Created At</p>
              <p className="text-sm">{formatDate(entry.created_at)}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Last Updated</p>
              <p className="text-sm">{formatDate(entry.updated_at)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={isEditOpen} onOpenChange={open => { if (!open) setIsEditOpen(false) }}>
        <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-5">
            <input type="hidden" name="id" value={entry.id} />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="edit-kb-name">Name *</Label>
              <Input
                id="edit-kb-name"
                name="name"
                required
                defaultValue={entry.name}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="edit-kb-category">Category</Label>
                <select
                  id="edit-kb-category"
                  name="category"
                  defaultValue={entry.category || ''}
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
                <Label htmlFor="edit-kb-created-by">Created By</Label>
                {teamMembers.length > 0 ? (
                  <select
                    id="edit-kb-created-by"
                    name="created_by"
                    defaultValue={entry.created_by || ''}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">Select member</option>
                    {teamMembers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="edit-kb-created-by"
                    name="created_by"
                    defaultValue={entry.created_by || ''}
                  />
                )}
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-kb-url">URL</Label>
                <Input
                  id="edit-kb-url"
                  name="url"
                  placeholder="https://"
                  defaultValue={entry.url || ''}
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-2">
                <Label htmlFor="edit-kb-thumbnail">Thumbnail URL</Label>
                <Input
                  id="edit-kb-thumbnail"
                  name="thumbnail_url"
                  placeholder="https://…"
                  defaultValue={entry.thumbnail_url || ''}
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {editSelectedTags.map(tag => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    {tag}
                    <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-destructive">×</button>
                  </span>
                ))}
              </div>
              <select
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                onChange={e => { if (e.target.value) { addEditTag(e.target.value); e.target.value = '' } }}
                defaultValue=""
              >
                <option value="">Add a tag…</option>
                {kbTags
                  .filter(t => !editSelectedTags.includes(t.name))
                  .map(t => <option key={t.id} value={t.name}>{t.name}</option>)
                }
              </select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
              </p>
              <div className="rounded-lg border border-input bg-background px-2 py-2 min-h-[140px]">
                <NotionEditor
                  content={editDescription}
                  onChange={setEditDescription}
                  placeholder="Describe this resource…"
                  minHeight="120px"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={editLoading}>
              {editLoading ? 'Saving…' : 'Update Entry'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  )
}
