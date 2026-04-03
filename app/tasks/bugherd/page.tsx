import { createAdminClient } from '@/lib/supabase/admin'
import { BugherdSettingsClient } from './bugherd-client'

export const dynamic = 'force-dynamic'

export default async function BugherdPage() {
  const admin = createAdminClient()

  const [
    { data: settings },
    { data: mappings },
    { data: statusMappings },
    { data: projects },
    { data: taskStatuses },
  ] = await Promise.all([
    admin.from('bugherd_settings').select('*').limit(1).single(),
    admin.from('bugherd_project_mappings').select('*, projects(name)').order('created_at', { ascending: false }),
    admin.from('bugherd_status_mappings').select('*, task_statuses(name)').order('bugherd_status'),
    admin.from('projects').select('id, name').order('name'),
    admin.from('task_statuses').select('*').order('status_order'),
  ])

  // Get task counts per mapping
  const mappingsWithCounts = await Promise.all((mappings || []).map(async m => {
    const { count: total } = await admin.from('bugherd_task_mappings').select('*', { count: 'exact', head: true }).eq('mapping_id', m.id)
    const { count: errors } = await admin.from('bugherd_task_mappings').select('*', { count: 'exact', head: true }).eq('mapping_id', m.id).eq('sync_status', 'error')
    return { ...m, total_tasks: total || 0, error_tasks: errors || 0 }
  }))

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BugherdSettingsClient
        settings={settings}
        mappings={mappingsWithCounts}
        statusMappings={statusMappings || []}
        projects={projects || []}
        taskStatuses={taskStatuses || []}
      />
    </div>
  )
}
