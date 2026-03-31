'use client'

import { useState, useCallback } from 'react'
import { RichTextEditor } from '@/components/rich-text-editor'
import { updateProjectBrief } from '../actions'
import { toast } from 'sonner'
import { Save, Check } from 'lucide-react'

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
        <h2 className="text-base font-semibold text-white">Project Brief</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className={[
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
            saved
              ? 'bg-green-900/40 text-green-400 border border-green-800/50'
              : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-white/10',
          ].join(' ')}
        >
          {saved ? (
            <><Check className="w-3.5 h-3.5" /> Saved</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save Brief'}</>
          )}
        </button>
      </div>
      <RichTextEditor
        content={content}
        onChange={setContent}
        placeholder="Write your project brief here — goals, scope, tech stack, design notes, client requirements…"
      />
    </div>
  )
}
