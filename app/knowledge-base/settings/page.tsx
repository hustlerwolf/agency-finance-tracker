import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { KbSettingsClient } from './settings-client'

export default async function KbSettingsPage() {
  const supabase = createClient()
  const { data: configs } = await supabase
    .from('kb_config')
    .select('*')
    .order('name')

  const categories = (configs || []).filter(c => c.type === 'category')
  const tags = (configs || []).filter(c => c.type === 'tag')

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/knowledge-base"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Knowledge Base
        </Link>
      </div>
      <KbSettingsClient categories={categories} tags={tags} />
    </div>
  )
}
