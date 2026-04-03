'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

// ─── Tasks CRUD ───────────────────────────────────────────────────────────────

export async function saveTask(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const assigneeIds = JSON.parse(formData.get('assignee_ids') as string || '[]') as string[]
  const labelIds = JSON.parse(formData.get('label_ids') as string || '[]') as string[]

  const data: Record<string, unknown> = {
    title: formData.get('title') as string,
    description: (formData.get('description') as string) || null,
    status_id: (formData.get('status_id') as string) || null,
    priority: (formData.get('priority') as string) || 'Medium',
    due_date: (formData.get('due_date') as string) || null,
    thumbnail_url: (formData.get('thumbnail_url') as string) || null,
    project_id: (formData.get('project_id') as string) || null,
    created_by: (formData.get('created_by') as string) || null,
    updated_at: new Date().toISOString(),
  }

  let taskId = id

  if (id) {
    const { error } = await supabase.from('tasks').update(data).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { data: newTask, error } = await supabase.from('tasks').insert([data]).select('id').single()
    if (error) return { success: false, error: error.message }
    taskId = newTask.id
  }

  // Sync assignees: delete all, re-insert
  await supabase.from('task_assignees').delete().eq('task_id', taskId)
  if (assigneeIds.length > 0) {
    const rows = assigneeIds.map(mid => ({ task_id: taskId, team_member_id: mid }))
    await supabase.from('task_assignees').insert(rows)
  }

  // Sync labels: delete all, re-insert
  await supabase.from('task_label_assignments').delete().eq('task_id', taskId)
  if (labelIds.length > 0) {
    const rows = labelIds.map(lid => ({ task_id: taskId, label_id: lid }))
    await supabase.from('task_label_assignments').insert(rows)
  }

  revalidatePath('/tasks')
  return { success: true, taskId }
}

export async function deleteTask(id: string) {
  const supabase = createClient()

  // Sync deletion to BugHerd BEFORE deleting locally (need the mapping still in DB)
  try {
    const { syncDeleteToBugherd } = await import('@/lib/bugherd/sync-engine')
    await syncDeleteToBugherd(id)
  } catch {}

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function updateTaskStatus(taskId: string, statusId: string) {
  const supabase = createClient()

  // Check if task source is 'bugherd' — if so, reset to 'manual' and sync back
  const { data: task } = await supabase.from('tasks').select('source').eq('id', taskId).single()

  const { error } = await supabase
    .from('tasks')
    .update({ status_id: statusId, source: 'manual', updated_at: new Date().toISOString() })
    .eq('id', taskId)
  if (error) return { success: false, error: error.message }

  // Reverse sync: status → BugHerd (only if change was made by user, not by BugHerd webhook)
  // The source check prevents: BugHerd changes status → webhook sets source='bugherd' →
  // but next user drag resets to 'manual' and syncs back. This is correct behavior.
  if (statusId) {
    import('@/lib/bugherd/sync-engine').then(({ syncStatusToBugherd }) => {
      syncStatusToBugherd(taskId, statusId).catch(() => {})
    }).catch(() => {})
  }

  revalidatePath('/tasks')
  return { success: true }
}

// ─── Checklist ────────────────────────────────────────────────────────────────

export async function saveChecklistItem(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const data = {
    task_id: formData.get('task_id') as string,
    title: formData.get('title') as string,
    sort_order: parseInt(formData.get('sort_order') as string) || 0,
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('task_checklist_items').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('task_checklist_items').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function toggleChecklistItem(id: string, isCompleted: boolean) {
  const supabase = createClient()
  const { error } = await supabase.from('task_checklist_items').update({ is_completed: isCompleted }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteChecklistItem(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_checklist_items').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function addTaskComment(
  taskId: string,
  content: string,
  teamMemberId: string,
  mentionedMemberIds: string[] = []
) {
  const supabase = createClient()
  const admin = createAdminClient()

  // Save comment — mark synced_to_bugherd so the webhook echo is ignored
  const { error } = await supabase.from('task_comments').insert([{
    task_id: taskId,
    team_member_id: teamMemberId,
    content,
    synced_to_bugherd: true,
  }])
  if (error) return { success: false, error: error.message }

  // Get task info + assignees for notifications
  const [{ data: task }, { data: assignees }, { data: sender }] = await Promise.all([
    admin.from('tasks').select('title, project_id, projects(name)').eq('id', taskId).single(),
    admin.from('task_assignees').select('team_member_id').eq('task_id', taskId),
    admin.from('team_members').select('full_name').eq('id', teamMemberId).single(),
  ])

  const taskTitle = task?.title || 'a task'
  const projectName = (task?.projects as unknown as { name: string } | null)?.name || null
  const senderName = sender?.full_name || 'Someone'

  // Collect all recipients: assignees + mentioned (excluding sender)
  const recipientIds = new Set<string>()
  ;(assignees || []).forEach(a => recipientIds.add(a.team_member_id))
  mentionedMemberIds.forEach(id => recipientIds.add(id))
  recipientIds.delete(teamMemberId) // don't notify yourself

  if (recipientIds.size > 0) {
    // Create in-app notifications
    const notifications = Array.from(recipientIds).map(recipientId => ({
      recipient_id: recipientId,
      type: mentionedMemberIds.includes(recipientId) ? 'mention' : 'comment',
      title: mentionedMemberIds.includes(recipientId)
        ? `${senderName} mentioned you in "${taskTitle}"`
        : `${senderName} commented on "${taskTitle}"`,
      body: content.slice(0, 200),
      task_id: taskId,
      sender_id: teamMemberId,
    }))
    await admin.from('notifications').insert(notifications)

    // Send Slack notifications (fire and forget)
    sendSlackNotifications(admin, senderName, taskTitle, content, Array.from(recipientIds), projectName, taskId).catch(() => {})
  }

  // Reverse sync: comment → BugHerd (fire and forget)
  import('@/lib/bugherd/sync-engine').then(({ syncCommentToBugherd }) => {
    syncCommentToBugherd(taskId, content, senderName).catch(() => {})
  }).catch(() => {})

  revalidatePath('/tasks')
  return { success: true }
}

async function sendSlackNotifications(
  admin: ReturnType<typeof createAdminClient>,
  senderName: string,
  taskTitle: string,
  comment: string,
  recipientIds: string[],
  projectName: string | null,
  taskId: string
) {
  // Get token from DB settings or env var
  const { data: settings } = await admin.from('notification_settings').select('*').limit(1).single()
  const token = settings?.slack_bot_token || process.env.SLACK_BOT_TOKEN
  const enabled = settings?.slack_enabled ?? !!process.env.SLACK_BOT_TOKEN

  if (!enabled || !token) return

  // Get recipients with slack_email, email, and optional slack_member_id
  const { data: recipients } = await admin
    .from('team_members')
    .select('email, slack_email, slack_member_id')
    .in('id', recipientIds)

  if (!recipients || recipients.length === 0) return

  const preview = comment.length > 150 ? comment.slice(0, 150) + '...' : comment
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const taskLink = `${appUrl}/tasks?task=${taskId}`

  for (const r of recipients) {
    try {
      let slackChannel = r.slack_member_id

      const lookupEmail = r.slack_email || r.email
      if (!slackChannel && lookupEmail) {
        const lookupRes = await fetch(`https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(lookupEmail)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const lookupData = await lookupRes.json()
        if (lookupData.ok && lookupData.user?.id) {
          slackChannel = lookupData.user.id
          await admin.from('team_members').update({ slack_member_id: lookupData.user.id }).eq('email', r.email)
        }
      }

      if (!slackChannel) continue

      const projectLine = projectName ? `*Project:* ${projectName}\n` : ''
      const message = `${projectLine}*Task:* <${taskLink}|${taskTitle}>\n*${senderName}* commented:\n>${preview}`

      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          channel: slackChannel,
          text: message,
          unfurl_links: false,
        }),
      })
    } catch {}
  }
}

export async function deleteTaskComment(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_comments').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

// ─── Time Tracking (Start/Stop Timer) ─────────────────────────────────────────

export async function startTimer(taskId: string, teamMemberId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_time_logs').insert([{
    task_id: taskId,
    team_member_id: teamMemberId,
    started_at: new Date().toISOString(),
  }])
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function stopTimer(logId: string, description?: string) {
  const supabase = createClient()
  const now = new Date()

  // Get the log to calculate duration
  const { data: log } = await supabase.from('task_time_logs').select('started_at').eq('id', logId).single()
  if (!log) return { success: false, error: 'Timer not found' }

  const startedAt = new Date(log.started_at)
  const durationMinutes = Math.round((now.getTime() - startedAt.getTime()) / 60000)

  const { error } = await supabase.from('task_time_logs').update({
    stopped_at: now.toISOString(),
    duration_minutes: Math.max(1, durationMinutes),
    description: description || null,
  }).eq('id', logId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTimeLog(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('task_time_logs').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}
