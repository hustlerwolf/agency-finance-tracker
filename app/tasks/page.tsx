import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserAccess } from '@/lib/auth-utils'
import { TasksClient } from './tasks-client'

export const dynamic = 'force-dynamic'

export default async function TasksPage() {
  const { isAdmin, teamMemberId, allowedModules } = await getCurrentUserAccess()
  const canManage = isAdmin || (allowedModules || []).includes('tasks')
  const supabase = createAdminClient()

  // For members, first get their assigned task IDs
  let assignedTaskIds: string[] | null = null
  if (!isAdmin && teamMemberId) {
    const { data: assignments } = await supabase
      .from('task_assignees')
      .select('task_id')
      .eq('team_member_id', teamMemberId)
    assignedTaskIds = (assignments || []).map(a => a.task_id)
  }

  // Build task query
  let taskQuery = supabase
    .from('tasks')
    .select('*, task_assignees(team_member_id, team_members(id, full_name, profile_photo_url)), task_label_assignments(label_id, task_labels(id, name, color)), task_checklist_items(id, title, is_completed, sort_order), task_comments(id, content, created_at, team_member_id, source, team_members(full_name, profile_photo_url)), task_time_logs(id, started_at, stopped_at, duration_minutes, description, team_member_id, team_members(full_name)), projects(id, name)')
    .order('task_order', { ascending: true })

  if (!isAdmin && assignedTaskIds) {
    if (assignedTaskIds.length === 0) {
      // No assigned tasks — pass empty array
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <TasksClient tasks={[]} statuses={[]} labels={[]} members={[]} projects={[]} isAdmin={false} currentMemberId={teamMemberId} canManage={canManage} />
        </div>
      )
    }
    taskQuery = taskQuery.in('id', assignedTaskIds)
  }

  const [
    { data: tasks },
    { data: statuses },
    { data: labels },
    { data: members },
    { data: projects },
  ] = await Promise.all([
    taskQuery,
    supabase.from('task_statuses').select('*').order('status_order'),
    supabase.from('task_labels').select('*').order('name'),
    supabase.from('team_members').select('id, full_name, profile_photo_url').eq('status', 'active').order('full_name'),
    supabase.from('projects').select('id, name').order('name'),
  ])

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <TasksClient
        tasks={tasks || []}
        statuses={statuses || []}
        labels={labels || []}
        members={members || []}
        projects={projects || []}
        isAdmin={isAdmin}
        currentMemberId={teamMemberId}
        canManage={canManage}
      />
    </div>
  )
}
