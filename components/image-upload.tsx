'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

interface ImageUploadProps {
  value?: string | null
  onChange: (url: string | null) => void
  bucket?: string
  folder?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'project-assets',
  folder = 'hero',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5 MB')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop()
      const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path)

      onChange(publicUrl)
      toast.success('Image uploaded')
    } catch (err: unknown) {
      toast.error('Upload failed: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove() {
    onChange(null)
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleFileChange}
      />

      {value ? (
        <div className="relative group w-full h-40 rounded-lg overflow-hidden border border-white/10 bg-gray-800">
          <img
            src={value}
            alt="Project thumbnail"
            className="w-full h-full object-cover"
          />
          {/* Overlay on hover */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-300 text-xs font-medium transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-32 rounded-lg border-2 border-dashed border-white/10 hover:border-white/20 bg-gray-800/50 hover:bg-gray-800 transition-all flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-gray-400"
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <ImageIcon className="w-6 h-6" />
              <span className="text-xs font-medium">Click to upload thumbnail</span>
              <span className="text-xs opacity-60">PNG, JPG, WebP — max 5 MB</span>
            </>
          )}
        </button>
      )}
    </div>
  )
}
