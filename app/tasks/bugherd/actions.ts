'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import * as bugherdClient from '@/lib/bugherd/client'
import { manualResync, cleanupDeletedBugherdTasks } from '@/lib/bugherd/sync-engine'
import { revalidatePath } from 'next/cache'

// ─── BugHerd Settings ─────────────────────────────────────────────────────────

export async function saveBugherdSettings(formData: FormData) {
  const admin = createAdminClient()
  const id = formData.get('id') as string
  const apiKey = formData.get('api_key') as string
  const isEnabled = formData.get('is_enabled') === 'true'
  const webhookUrl = formData.get('webhook_url') as string

  const cleanupIntervalHours = parseInt(formData.get('cleanup_interval_hours') as string) || 3

  const data = {
    api_key: apiKey,
    is_enabled: isEnabled,
    cleanup_interval_hours: cleanupIntervalHours,
    updated_at: new Date().toISOString(),
  }

  if (id) {
    const { error } = await admin.from('bugherd_settings').update(data).eq('id', id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await admin.from('bugherd_settings').insert([data])
    if (error) return { success: false, error: error.message }
  }

  // Auto-register webhooks with BugHerd when saving settings
  if (apiKey && isEnabled && webhookUrl) {
    registerBugherdWebhooks(apiKey, webhookUrl).catch(() => {})
  }

  revalidatePath('/tasks/bugherd')
  return { success: true }
}

async function registerBugherdWebhooks(apiKey: string, webhookUrl: string) {
  try {
    // First check existing webhooks
    const existing = await bugherdClient.getWebhooks(apiKey)
    const ourWebhooks = existing.filter(w => w.target_url === webhookUrl)
    const registeredEvents = new Set(ourWebhooks.map(w => w.event))

    // Register missing event types
    const requiredEvents = ['task_create', 'task_update', 'comment']
    for (const event of requiredEvents) {
      if (!registeredEvents.has(event)) {
        try {
          // Use flat body format (BugHerd API requirement)
          const res = await fetch('https://www.bugherd.com/api_v2/webhooks.json', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Basic ' + Buffer.from(apiKey + ':x').toString('base64'),
            },
            body: JSON.stringify({ target_url: webhookUrl, event }),
          })
          if (!res.ok) console.warn(`Failed to register BugHerd webhook for ${event}`)
        } catch {}
      }
    }
  } catch (e) {
    console.error('Failed to register BugHerd webhooks:', e)
  }
}

export async function testBugherdConnection(apiKey: string) {
  return bugherdClient.testConnection(apiKey)
}

export async function fetchBugherdProjects(apiKey: string) {
  try {
    const projects = await bugherdClient.getProjects(apiKey)
    return { success: true, projects }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Failed', projects: [] }
  }
}

// ─── Project Mappings ─────────────────────────────────────────────────────────

export async function createProjectMapping(formData: FormData) {
  const admin = createAdminClient()
  const data = {
    bugherd_project_id: formData.get('bugherd_project_id') as string,
    bugherd_project_name: formData.get('bugherd_project_name') as string,
    project_id: formData.get('project_id') as string,
  }

  const { error } = await admin.from('bugherd_project_mappings').insert([data])
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks/bugherd')
  return { success: true }
}

export async function deleteProjectMapping(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('bugherd_project_mappings').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks/bugherd')
  return { success: true }
}

export async function toggleProjectMapping(id: string) {
  const admin = createAdminClient()
  const { data: mapping } = await admin.from('bugherd_project_mappings').select('is_active').eq('id', id).single()
  if (!mapping) return { success: false, error: 'Not found' }
  const { error } = await admin.from('bugherd_project_mappings').update({ is_active: !mapping.is_active }).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks/bugherd')
  return { success: true }
}

export async function resyncMapping(id: string) {
  try {
    // First cleanup deleted tasks, then sync new ones
    const deleted = await cleanupDeletedBugherdTasks(id)
    const results = await manualResync(id)
    revalidatePath('/tasks/bugherd')
    revalidatePath('/tasks')
    return { success: true, ...results, deleted }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Resync failed', created: 0, skipped: 0, errors: 0, deleted: 0 }
  }
}

// ─── Status Mappings ──────────────────────────────────────────────────────────

export async function saveStatusMapping(formData: FormData) {
  const admin = createAdminClient()
  const id = formData.get('id') as string
  const data = {
    bugherd_status: formData.get('bugherd_status') as string,
    task_status_id: formData.get('task_status_id') as string,
  }

  let error
  if (id) {
    const { error: e } = await admin.from('bugherd_status_mappings').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await admin.from('bugherd_status_mappings').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks/bugherd')
  return { success: true }
}

export async function deleteStatusMapping(id: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('bugherd_status_mappings').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/tasks/bugherd')
  return { success: true }
}
