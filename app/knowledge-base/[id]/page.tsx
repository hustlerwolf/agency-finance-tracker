import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { KbDetailClient } from './kb-detail-client'

export default async function KbDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [
    { data: entry },
    { data: configs },
    { data: teamMembersData },
  ] = await Promise.all([
    supabase.from('knowledge_base').select('*').eq('id', params.id).single(),
    supabase.from('kb_config').select('*').order('name'),
    supabase.from('team_members').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  if (!entry) {
    notFound()
  }

  const kbCategories = (configs || []).filter(c => c.type === 'category')
  const kbTags = (configs || []).filter(c => c.type === 'tag')
  const teamMembers = (teamMembersData || []).map(m => m.full_name).filter(Boolean)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <KbDetailClient
        entry={entry}
        teamMembers={teamMembers}
        kbCategories={kbCategories}
        kbTags={kbTags}
      />
    </div>
  )
}
