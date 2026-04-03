'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { updateProjectBrief } from '../actions'
import { toast } from 'sonner'
import { Save, Check } from 'lucide-react'

// Tiptap uses browser-only DOM APIs — must never SSR
const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[200px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground animate-pulse">Loading editor…</span>
      </div>
    ),
  }
)

export function BriefEditor({ projectId, initialBrief }: { projectId: string; initialBrief: string }) {
  const [content, setContent] = useState(initialBrief || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    const result = await updateProjectBrief(projectId, content)
    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error('Failed to save: ' + result.error)
    }
    setSaving(false)
  }, [projectId, content])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Project Brief</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Type <kbd className="px-1 py-0.5 rounded bg-muted text-muted-foreground font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            saved
              ? 'bg-green-900/40 text-green-400 border border-green-500/50'
              : 'bg-muted hover:bg-muted text-foreground hover:text-foreground border border-border',
          ].join(' ')}
        >
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved</> : <><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Brief'}</>}
        </button>
      </div>

      <div className="rounded-xl border border-border bg-card/40 px-2 py-3">
        <NotionEditor
          content={content}
          onChange={setContent}
          placeholder="Write your project brief here… Type '/' for commands"
          minHeight="280px"
        />
      </div>
    </div>
  )
}
