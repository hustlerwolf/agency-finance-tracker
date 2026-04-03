import { createClient } from '@/lib/supabase/server'
import { TeamClient } from './team-client'

export const dynamic = 'force-dynamic'

export default async function TeamPage() {
  const supabase = createClient()

  const [
    { data: members },
    { data: departments },
  ] = await Promise.all([
    supabase
      .from('team_members')
      .select('*, departments(name)')
      .order('full_name'),
    supabase.from('departments').select('*').order('name'),
  ])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TeamClient
        members={members || []}
        departments={departments || []}
      />
    </div>
  )
}
