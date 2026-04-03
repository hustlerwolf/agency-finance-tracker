import { createClient } from '@/lib/supabase/server'
import { TaskSettingsClient } from './settings-client'

export const dynamic = 'force-dynamic'

export default async function TaskSettingsPage() {
  const supabase = createClient()
  const [{ data: statuses }, { data: labels }] = await Promise.all([
    supabase.from('task_statuses').select('*').order('status_order'),
    supabase.from('task_labels').select('*').order('name'),
  ])

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TaskSettingsClient statuses={statuses || []} labels={labels || []} />
    </div>
  )
}
