import { createAdminClient } from '@/lib/supabase/admin'
import * as bugherd from './client'
import { isSyncBotComment, SYNC_BOT_TAG } from './loop-guard'

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getApiKey() {
  const admin = createAdminClient()
  const { data } = await admin.from('bugherd_settings').select('api_key, is_enabled').limit(1).single()
  if (!data?.is_enabled || !data?.api_key) return null
  return data.api_key as string
}

async function getActiveMapping(bugherdProjectId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bugherd_project_mappings')
    .select('*')
    .eq('bugherd_project_id', bugherdProjectId)
    .eq('is_active', true)
    .single()
  return data
}

async function getTaskMapping(bugherdTaskId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('bugherd_task_mappings')
    .select('*, bugherd_project_mappings(project_id, bugherd_project_id)')
    .eq('bugherd_task_id', bugherdTaskId)
    .single()
  return data
}

async function getStatusMappings() {
  const admin = createAdminClient()
  const { data } = await admin.from('bugherd_status_mappings').select('*, task_statuses(id, name)')
  return data || []
}

async function mapBugherdStatus(bugherdStatus: string): Promise<string | null> {
  const mappings = await getStatusMappings()
  const match = mappings.find(m => m.bugherd_status.toLowerCase() === bugherdStatus.toLowerCase())
  return match?.task_status_id || null
}

// Our status name → BugHerd column name (exact match)
const OUR_STATUS_TO_BUGHERD: Record<string, string> = {
  'To Do': 'To-Do',
  'Blocked': 'Blocked',
  'In Progress': 'In Progress',
  'In Review': 'In Review',
  'Done': 'Done',
}

async function mapOurStatusToBugherd(taskStatusId: string): Promise<string | null> {
  const admin = createAdminClient()
  const { data: status } = await admin.from('task_statuses').select('name').eq('id', taskStatusId).single()
  if (!status) return null
  return OUR_STATUS_TO_BUGHERD[status.name] || null
}

function extractTitle(task: Record<string, unknown>): string {
  return (task.description as string) || (task.title as string) || 'Untitled Task'
}

function buildDescription(task: Record<string, unknown>): string {
  const parts: string[] = []

  // Client feedback text
  const desc = task.description as string
  if (desc) parts.push(`<p>${desc}</p>`)

  // Page URL
  const site = task.site as string || ''
  const pageUrl = task.url as string || ''
  const fullUrl = pageUrl.startsWith('http') ? pageUrl : (site ? `${site}${pageUrl}` : pageUrl)
  if (fullUrl) parts.push(`<p><strong>Page:</strong> <a href="${fullUrl}" target="_blank">${fullUrl}</a></p>`)

  // Technical info — all fields BugHerd provides
  const meta: string[] = []
  if (task.requester_os) meta.push(`<li><strong>OS:</strong> ${task.requester_os}</li>`)
  if (task.requester_browser) meta.push(`<li><strong>Browser:</strong> ${task.requester_browser}</li>`)
  if (task.requester_resolution) meta.push(`<li><strong>Screen Resolution:</strong> ${task.requester_resolution}</li>`)
  if (task.requester_browser_size) meta.push(`<li><strong>Browser Size:</strong> ${task.requester_browser_size}</li>`)

  // Selector info (CSS path to the element clicked)
  const selectorInfo = task.selector_info as Record<string, unknown> | undefined
  if (selectorInfo?.path) meta.push(`<li><strong>CSS Selector:</strong> <code>${selectorInfo.path}</code></li>`)

  // Priority
  if (task.priority && task.priority !== 'not set') meta.push(`<li><strong>Priority:</strong> ${task.priority}</li>`)

  if (meta.length > 0) parts.push(`<p><strong>Technical Info:</strong></p><ul>${meta.join('')}</ul>`)

  // Reporter
  const requester = task.requester as Record<string, unknown> | undefined
  if (requester) {
    const name = requester.display_name || requester.email || 'Unknown'
    const email = requester.email || ''
    parts.push(`<p><strong>Reported by:</strong> ${name}${email && email !== name ? ` (${email})` : ''}</p>`)
  }

  return parts.join('<hr/>')
}

// Build a screenshot URL with marker overlay position data stored as JSON
function getMarkerData(task: Record<string, unknown>): Record<string, unknown> | null {
  const screenshotData = task.screenshot_data as Record<string, unknown> | undefined
  if (!screenshotData) return null

  // BugHerd pin_x/pin_y are pixel coordinates on a viewport-sized capture.
  // screenshot_width is the viewport width (e.g. 1470).
  // screenshot_height is ALSO viewport width (BugHerd bug) — NOT the actual image height.
  // The actual image is 2x retina and has its own height.
  // We store pin as percentage of viewport width for X,
  // and raw pin_y + viewport width so the client can calculate Y using actual image aspect ratio.
  return {
    pin_x: screenshotData.screenshot_pin_x,
    pin_y: screenshotData.screenshot_pin_y,
    viewport_width: screenshotData.screenshot_width,
    // Store browser size if available for accurate Y calculation
    browser_height: task.requester_browser_size
      ? parseInt(String(task.requester_browser_size).split('x')[1]?.trim() || '0')
      : null,
  }
}

// ─── BugHerd → Our App ───────────────────────────────────────────────────────

export async function onBugherdTaskCreated(bugherdProjectId: string, bugherdTask: Record<string, unknown>) {
  const apiKey = await getApiKey()
  if (!apiKey) return

  const admin = createAdminClient()
  const mapping = await getActiveMapping(bugherdProjectId)
  if (!mapping) return

  const bugherdTaskId = String(bugherdTask.id || bugherdTask.local_task_id)

  // Check if already mapped (prevent duplicates)
  const existing = await getTaskMapping(bugherdTaskId)
  if (existing) return

  // Fetch full task details
  let fullTask = bugherdTask
  try {
    fullTask = await bugherd.getTask(apiKey, bugherdProjectId, bugherdTaskId)
  } catch {}

  // Screenshot URL
  const screenshotUrl = (fullTask.screenshot_url as string) || null

  // Upload screenshot to Supabase Storage if available
  let storedScreenshotUrl = screenshotUrl
  if (screenshotUrl) {
    try {
      const imgRes = await fetch(screenshotUrl)
      if (imgRes.ok) {
        const blob = await imgRes.blob()
        const ext = 'jpg'
        const path = `bugherd/${bugherdTaskId}-${Date.now()}.${ext}`
        const arrayBuffer = await blob.arrayBuffer()
        const { error } = await admin.storage.from('task-assets').upload(path, Buffer.from(arrayBuffer), { contentType: 'image/jpeg', upsert: true })
        if (!error) {
          const { data: urlData } = admin.storage.from('task-assets').getPublicUrl(path)
          storedScreenshotUrl = urlData.publicUrl
        }
      }
    } catch {}
  }

  // Map status
  const bugherdStatus = (fullTask.status_name || fullTask.status || 'backlog') as string
  const statusId = await mapBugherdStatus(bugherdStatus)

  // Get default status if no mapping
  let finalStatusId = statusId
  if (!finalStatusId) {
    const { data: defaultStatus } = await admin.from('task_statuses').select('id').order('status_order').limit(1).single()
    finalStatusId = defaultStatus?.id || null
  }

  // Get marker data for screenshot overlay
  const markerData = getMarkerData(fullTask)

  // Create task in our DB
  const title = extractTitle(fullTask)
  const description = buildDescription(fullTask)

  const { data: newTask, error: taskError } = await admin.from('tasks').insert([{
    title: title.slice(0, 200),
    description,
    status_id: finalStatusId,
    project_id: mapping.project_id,
    thumbnail_url: storedScreenshotUrl,
    source: 'bugherd',
    metadata: {
      bugherd_task_id: bugherdTaskId,
      bugherd_project_id: bugherdProjectId,
      screenshot_marker: markerData,
      admin_link: fullTask.admin_link || null,
      page_url: String(fullTask.site || '') + String(fullTask.url || ''),
    },
  }]).select('id').single()

  if (taskError || !newTask) {
    await admin.from('bugherd_task_mappings').insert([{
      mapping_id: mapping.id,
      bugherd_task_id: bugherdTaskId,
      task_id: '00000000-0000-0000-0000-000000000000', // placeholder
      sync_status: 'error',
      error_message: taskError?.message || 'Failed to create task',
    }])
    return
  }

  // Create mapping
  await admin.from('bugherd_task_mappings').insert([{
    mapping_id: mapping.id,
    bugherd_task_id: bugherdTaskId,
    task_id: newTask.id,
    sync_status: 'active',
  }])

  // Auto-assign task to project's developers
  const { data: project } = await admin.from('projects').select('developers').eq('id', mapping.project_id).single()
  if (project) {
    const developerNames = (project.developers || []) as string[]
    if (developerNames.length > 0) {
      const { data: matchedMembers } = await admin
        .from('team_members')
        .select('id')
        .in('full_name', developerNames)
        .eq('status', 'active')
      if (matchedMembers && matchedMembers.length > 0) {
        const assigneeRows = matchedMembers.map(m => ({ task_id: newTask.id, team_member_id: m.id }))
        await admin.from('task_assignees').insert(assigneeRows)
      }
    }
  }

  // Update project mapping last_synced_at
  await admin.from('bugherd_project_mappings').update({ last_synced_at: new Date().toISOString() }).eq('id', mapping.id)
}

export async function onBugherdScreenshotReady(bugherdProjectId: string, bugherdTaskId: string, screenshotUrl: string, task: Record<string, unknown>) {
  const apiKey = await getApiKey()
  if (!apiKey) return

  const admin = createAdminClient()

  // Retry up to 5 times waiting for task mapping (task_create webhook may still be processing)
  let taskMapping = null
  for (let i = 0; i < 5; i++) {
    taskMapping = await getTaskMapping(String(bugherdTaskId))
    if (taskMapping) break
    await new Promise(r => setTimeout(r, 2000))
  }
  if (!taskMapping) return

  // Download screenshot and upload to Supabase Storage
  let storedUrl = screenshotUrl
  try {
    const imgRes = await fetch(screenshotUrl)
    if (imgRes.ok) {
      const blob = await imgRes.blob()
      const path = `bugherd/${bugherdTaskId}-${Date.now()}.jpg`
      const arrayBuffer = await blob.arrayBuffer()
      const { error } = await admin.storage.from('task-assets').upload(path, Buffer.from(arrayBuffer), { contentType: 'image/jpeg', upsert: true })
      if (!error) {
        const { data: urlData } = admin.storage.from('task-assets').getPublicUrl(path)
        storedUrl = urlData.publicUrl
      }
    }
  } catch {}

  // Get marker data
  const markerData = getMarkerData(task)

  // Update our task with the screenshot
  await admin.from('tasks').update({
    thumbnail_url: storedUrl,
    metadata: {
      bugherd_task_id: bugherdTaskId,
      bugherd_project_id: bugherdProjectId,
      screenshot_marker: markerData,
      page_url: String(task.site || '') + String(task.url || ''),
    },
    updated_at: new Date().toISOString(),
  }).eq('id', taskMapping.task_id)

  // Update mapping
  await admin.from('bugherd_task_mappings').update({
    sync_status: 'active',
    last_synced_at: new Date().toISOString(),
  }).eq('id', taskMapping.id)
}

export async function onBugherdCommentAdded(bugherdProjectId: string, bugherdTaskId: string, comment: Record<string, unknown>) {
  const admin = createAdminClient()

  const commentText = (comment.text || comment.body || '') as string

  const taskMapping = await getTaskMapping(String(bugherdTaskId))
  if (!taskMapping) return

  // Loop prevention: check if we recently synced a comment TO BugHerd for this task.
  // If so, this webhook is the echo — consume the flag and skip.
  const { data: pendingEcho } = await admin
    .from('task_comments')
    .select('id')
    .eq('task_id', taskMapping.task_id)
    .eq('synced_to_bugherd', true)
    .order('created_at', { ascending: false })
    .limit(1)

  if (pendingEcho && pendingEcho.length > 0) {
    // Consume the flag — this webhook is the echo of our own sync
    await admin.from('task_comments').update({ synced_to_bugherd: false }).eq('id', pendingEcho[0].id)
    return
  }

  // Also check for old sync-bot marker
  if (isSyncBotComment(commentText)) return

  // Extract client name from BugHerd comment
  const user = comment.user as Record<string, unknown> | undefined
  const clientName = (user?.display_name || user?.email || 'Client') as string

  await admin.from('task_comments').insert([{
    task_id: taskMapping.task_id,
    team_member_id: null as unknown as string,
    content: commentText,
    source: `bugherd:${clientName}`, // Store client name in source for display
  }])

  // Update sync status
  await admin.from('bugherd_task_mappings').update({
    sync_status: 'active',
    last_synced_at: new Date().toISOString(),
    error_message: null,
  }).eq('id', taskMapping.id)
}

export async function onBugherdStatusChanged(bugherdTaskId: string, newStatus: string) {
  const admin = createAdminClient()
  const taskMapping = await getTaskMapping(String(bugherdTaskId))
  if (!taskMapping) return

  const statusId = await mapBugherdStatus(newStatus)
  if (!statusId) return

  await admin.from('tasks').update({
    status_id: statusId,
    source: 'bugherd',
    updated_at: new Date().toISOString(),
  }).eq('id', taskMapping.task_id)

  await admin.from('bugherd_task_mappings').update({
    sync_status: 'active',
    last_synced_at: new Date().toISOString(),
  }).eq('id', taskMapping.id)
}

// ─── Our App → BugHerd (reverse sync) ────────────────────────────────────────

export async function syncCommentToBugherd(taskId: string, commentText: string, commenterName: string) {
  const apiKey = await getApiKey()
  if (!apiKey) return

  const admin = createAdminClient()

  // Find BugHerd task mapping
  const { data: taskMapping } = await admin
    .from('bugherd_task_mappings')
    .select('bugherd_task_id, bugherd_project_mappings(bugherd_project_id)')
    .eq('task_id', taskId)
    .eq('sync_status', 'active')
    .single()

  if (!taskMapping) return

  const projectMapping = taskMapping.bugherd_project_mappings as unknown as { bugherd_project_id: string }
  if (!projectMapping) return

  // Post comment to BugHerd — posted under the admin account (API key owner)
  const cleanComment = `${commenterName}: ${commentText}`

  try {
    await bugherd.postComment(apiKey, projectMapping.bugherd_project_id, taskMapping.bugherd_task_id, cleanComment)
  } catch (e) {
    console.error('Failed to sync comment to BugHerd:', e)
  }
}

export async function syncStatusToBugherd(taskId: string, newStatusId: string) {
  const apiKey = await getApiKey()
  if (!apiKey) return

  const admin = createAdminClient()

  const { data: taskMapping } = await admin
    .from('bugherd_task_mappings')
    .select('bugherd_task_id, bugherd_project_mappings(bugherd_project_id)')
    .eq('task_id', taskId)
    .eq('sync_status', 'active')
    .single()

  if (!taskMapping) return

  const projectMapping = taskMapping.bugherd_project_mappings as unknown as { bugherd_project_id: string }
  if (!projectMapping) return

  const bugherdStatus = await mapOurStatusToBugherd(newStatusId)
  if (!bugherdStatus) return

  try {
    await bugherd.updateTask(apiKey, projectMapping.bugherd_project_id, taskMapping.bugherd_task_id, {
      status: bugherdStatus,
      tag_names: [SYNC_BOT_TAG],
    })
  } catch (e) {
    console.error('Failed to sync status to BugHerd:', e)
  }
}

// ─── Delete Sync ──────────────────────────────────────────────────────────────

// Our App → BugHerd: close the task on BugHerd when deleted here
export async function syncDeleteToBugherd(taskId: string) {
  const apiKey = await getApiKey()
  if (!apiKey) return

  const admin = createAdminClient()

  const { data: taskMapping } = await admin
    .from('bugherd_task_mappings')
    .select('bugherd_task_id, bugherd_project_mappings(bugherd_project_id)')
    .eq('task_id', taskId)
    .single()

  if (!taskMapping) return

  const projectMapping = taskMapping.bugherd_project_mappings as unknown as { bugherd_project_id: string }
  if (!projectMapping) return

  try {
    // BugHerd doesn't have delete API — close the task instead
    await bugherd.updateTask(apiKey, projectMapping.bugherd_project_id, taskMapping.bugherd_task_id, {
      status: 'closed',
    })
  } catch (e) {
    console.error('Failed to close BugHerd task:', e)
  }
}

// BugHerd → Our App: delete/close our task when BugHerd task is closed
export async function onBugherdTaskClosed(bugherdTaskId: string) {
  const admin = createAdminClient()

  const taskMapping = await getTaskMapping(String(bugherdTaskId))
  if (!taskMapping) return

  // Delete the task from our DB (cascade deletes assignees, comments, etc.)
  await admin.from('tasks').delete().eq('id', taskMapping.task_id)

  // Remove the mapping too
  await admin.from('bugherd_task_mappings').delete().eq('id', taskMapping.id)
}

// ─── Cleanup: detect BugHerd tasks that were deleted ──────────────────────────

export async function cleanupDeletedBugherdTasks(mappingId: string): Promise<number> {
  const apiKey = await getApiKey()
  if (!apiKey) return 0

  const admin = createAdminClient()

  const { data: mapping } = await admin
    .from('bugherd_project_mappings')
    .select('*')
    .eq('id', mappingId)
    .eq('is_active', true)
    .single()
  if (!mapping) return 0

  // Get all BugHerd tasks — separate active from closed/deleted
  const bugherdTasks = await bugherd.getProjectTasks(apiKey, mapping.bugherd_project_id) as Record<string, unknown>[]
  const activeBugherdIds = new Set<string>()
  const closedBugherdIds = new Set<string>()

  for (const t of bugherdTasks) {
    const tid = String(t.id)
    const status = String(t.status || '').toLowerCase()
    if (status === 'closed' || status === 'archived' || t.closed_at || t.deleted_at) {
      closedBugherdIds.add(tid)
    } else {
      activeBugherdIds.add(tid)
    }
  }

  // Get all our mappings for this project
  const { data: ourMappings } = await admin
    .from('bugherd_task_mappings')
    .select('id, bugherd_task_id, task_id')
    .eq('mapping_id', mappingId)

  if (!ourMappings) return 0

  let deleted = 0
  for (const m of ourMappings) {
    // Delete if task is closed on BugHerd OR no longer exists at all
    if (closedBugherdIds.has(m.bugherd_task_id) || !activeBugherdIds.has(m.bugherd_task_id)) {
      await admin.from('tasks').delete().eq('id', m.task_id)
      await admin.from('bugherd_task_mappings').delete().eq('id', m.id)
      deleted++
    }
  }

  return deleted
}

// ─── Manual Resync ────────────────────────────────────────────────────────────

export async function manualResync(mappingId: string): Promise<{ created: number; skipped: number; errors: number }> {
  const apiKey = await getApiKey()
  if (!apiKey) throw new Error('BugHerd API key not configured')

  const admin = createAdminClient()

  const { data: mapping } = await admin
    .from('bugherd_project_mappings')
    .select('*')
    .eq('id', mappingId)
    .eq('is_active', true)
    .single()

  if (!mapping) throw new Error('Mapping not found or inactive')

  // Fetch all BugHerd tasks
  const tasks = await bugherd.getProjectTasks(apiKey, mapping.bugherd_project_id)

  let created = 0, skipped = 0, errors = 0

  for (const task of tasks as Record<string, unknown>[]) {
    const bugherdTaskId = String(task.id || task.local_task_id)

    // Skip closed/archived/deleted tasks
    const taskStatus = String(task.status || '').toLowerCase()
    if (taskStatus === 'closed' || taskStatus === 'archived' || task.closed_at || task.deleted_at) {
      skipped++
      continue
    }

    // Check if already mapped
    const { data: existing } = await admin
      .from('bugherd_task_mappings')
      .select('id')
      .eq('bugherd_task_id', bugherdTaskId)
      .single()

    if (existing) { skipped++; continue }

    try {
      await onBugherdTaskCreated(mapping.bugherd_project_id, task)
      created++
    } catch {
      errors++
    }
  }

  await admin.from('bugherd_project_mappings').update({ last_synced_at: new Date().toISOString() }).eq('id', mappingId)

  return { created, skipped, errors }
}
