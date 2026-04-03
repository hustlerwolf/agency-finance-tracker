// BugHerd API v2 Client
// Docs: https://www.bugherd.com/api_v2

const BUGHERD_BASE = 'https://www.bugherd.com/api_v2'

function authHeader(apiKey: string) {
  return 'Basic ' + Buffer.from(apiKey + ':x').toString('base64')
}

async function bugherdFetch(apiKey: string, path: string, options: RequestInit = {}) {
  const res = await fetch(`${BUGHERD_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader(apiKey),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`BugHerd API ${res.status}: ${text}`)
  }
  return res.json()
}

// ─── Projects ─────────────────────────────────────────────────────────────────

export async function getProjects(apiKey: string) {
  const data = await bugherdFetch(apiKey, '/projects.json')
  return (data.projects || []) as { id: number; name: string; is_active: boolean }[]
}

export async function getProject(apiKey: string, projectId: string) {
  const data = await bugherdFetch(apiKey, `/projects/${projectId}.json`)
  return data.project
}

// ─── Tasks ────────────────────────────────────────────────────────────────────

export async function getProjectTasks(apiKey: string, projectId: string) {
  // Paginated — BugHerd returns 100 per page
  const allTasks: unknown[] = []
  let page = 1
  while (true) {
    const data = await bugherdFetch(apiKey, `/projects/${projectId}/tasks.json?page=${page}`)
    const tasks = data.tasks || []
    allTasks.push(...tasks)
    if (tasks.length < 100) break
    page++
  }
  return allTasks
}

export async function getTask(apiKey: string, projectId: string, taskId: string) {
  const data = await bugherdFetch(apiKey, `/projects/${projectId}/tasks/${taskId}.json`)
  return data.task
}

export async function updateTask(apiKey: string, projectId: string, taskId: string, updates: Record<string, unknown>) {
  return bugherdFetch(apiKey, `/projects/${projectId}/tasks/${taskId}.json`, {
    method: 'PUT',
    body: JSON.stringify({ task: updates }),
  })
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export async function getComments(apiKey: string, projectId: string, taskId: string) {
  const data = await bugherdFetch(apiKey, `/projects/${projectId}/tasks/${taskId}/comments.json`)
  return data.comments || []
}

export async function postComment(apiKey: string, projectId: string, taskId: string, text: string) {
  return bugherdFetch(apiKey, `/projects/${projectId}/tasks/${taskId}/comments.json`, {
    method: 'POST',
    body: JSON.stringify({ comment: { text } }),
  })
}

// ─── Webhooks ─────────────────────────────────────────────────────────────────

export async function getWebhooks(apiKey: string) {
  const data = await bugherdFetch(apiKey, '/webhooks.json')
  return (data.webhooks || []) as { id: number; target_url: string; event: string; project_id: number | null }[]
}

export async function createWebhook(apiKey: string, targetUrl: string, projectId?: string) {
  const body: Record<string, unknown> = {
    webhook: {
      target_url: targetUrl,
      event: 'task_create',
    },
  }
  if (projectId) {
    (body.webhook as Record<string, unknown>).project_id = parseInt(projectId)
  }
  // Register for all event types we need
  const events = ['task_create', 'task_update', 'comment']
  const results = []
  for (const event of events) {
    try {
      const res = await bugherdFetch(apiKey, '/webhooks.json', {
        method: 'POST',
        body: JSON.stringify({ webhook: { target_url: targetUrl, event, ...(projectId ? { project_id: parseInt(projectId) } : {}) } }),
      })
      results.push(res)
    } catch {}
  }
  return results
}

export async function deleteWebhook(apiKey: string, webhookId: number) {
  return bugherdFetch(apiKey, `/webhooks/${webhookId}.json`, { method: 'DELETE' })
}

// ─── Connection Test ──────────────────────────────────────────────────────────

export async function testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    await getProjects(apiKey)
    return { success: true }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}
