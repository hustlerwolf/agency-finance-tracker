'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { updateLeadBrief } from '../actions'
import { toast } from 'sonner'
import { Save, Check, FileText } from 'lucide-react'

const NotionEditor = dynamic(
  () => import('@/components/notion-editor').then(m => m.NotionEditor),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[160px] flex items-center justify-center">
        <span className="text-xs text-muted-foreground animate-pulse">Loading editor…</span>
      </div>
    ),
  }
)

export function LeadBrief({ leadId, initialBrief }: { leadId: string; initialBrief: string }) {
  const [content, setContent] = useState(initialBrief || '')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    const result = await updateLeadBrief(leadId, content)
    if (result.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      toast.error('Failed to save: ' + result.error)
    }
    setSaving(false)
  }, [leadId, content])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Lead Brief</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Type <kbd className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">/</kbd> for headings, lists, to-dos and more
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
            saved
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50'
              : 'bg-background text-muted-foreground hover:text-foreground border-border hover:border-border/80',
          ].join(' ')}
        >
          {saved
            ? <><Check className="w-3.5 h-3.5" /> Saved</>
            : <><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Brief'}</>
          }
        </button>
      </div>

      <div className="rounded-lg border border-border bg-muted/20 px-2 py-3 min-h-[160px]">
        <NotionEditor
          content={content}
          onChange={setContent}
          placeholder="Describe the client's requirements, goals, budget, timeline… Type '/' for commands"
          minHeight="140px"
        />
      </div>
    </div>
  )
}
