import { createClient } from '@/lib/supabase/server'
import { KbClient } from './kb-client'

export default async function KnowledgeBasePage() {
  const supabase = createClient()

  const [
    { data: entries },
    { data: configs },
    { data: teamMembersData },
  ] = await Promise.all([
    supabase
      .from('knowledge_base')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase.from('kb_config').select('*').order('name'),
    supabase.from('team_members').select('id, full_name').eq('status', 'active').order('full_name'),
  ])

  const kbCategories = (configs || []).filter(c => c.type === 'category')
  const kbTags = (configs || []).filter(c => c.type === 'tag')

  const categories = kbCategories.map(c => c.name)
  const tags = kbTags.map(t => t.name)
  const teamMembers = (teamMembersData || []).map(m => m.full_name).filter(Boolean)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <KbClient
        entries={entries || []}
        categories={categories}
        tags={tags}
        teamMembers={teamMembers}
        kbCategories={kbCategories}
        kbTags={kbTags}
      />
    </div>
  )
}
