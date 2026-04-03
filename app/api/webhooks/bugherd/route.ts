import { NextRequest, NextResponse } from 'next/server'
import { onBugherdTaskCreated, onBugherdCommentAdded, onBugherdStatusChanged, onBugherdScreenshotReady, onBugherdTaskClosed } from '@/lib/bugherd/sync-engine'
import { isSyncBotTask } from '@/lib/bugherd/loop-guard'

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json()

    console.log('[BugHerd Webhook] Full payload:', JSON.stringify(payload))

    // Loop prevention — ignore sync-bot originated events
    if (isSyncBotTask(payload)) {
      return NextResponse.json({ status: 'ignored', reason: 'sync-bot' })
    }

    // Detect event type
    const eventType = detectEventType(payload)

    // Normalize: BugHerd sometimes nests task inside comment
    const comment = payload.comment as Record<string, unknown> | undefined
    let task = payload.task as Record<string, unknown> | undefined
    if (!task && comment?.task) {
      task = comment.task as Record<string, unknown>
    }

    const projectId = String(task?.project_id || payload.project_id || '')

    if (!projectId) {
      return NextResponse.json({ status: 'ignored', reason: 'no project_id' })
    }

    switch (eventType) {
      case 'task_create':
        if (task) {
          await onBugherdTaskCreated(projectId, task)
        }
        break

      case 'task_update':
        if (task) {
          const taskId = String(task.id || task.local_task_id)
          const screenshotUrl = task.screenshot_url as string | undefined
          const status = task.status_name || task.status

          // Check if task was closed/archived/deleted on BugHerd
          const statusStr = String(status || '').toLowerCase()
          const deletedAt = task.deleted_at as string | null
          const closedAt = task.closed_at as string | null
          if (statusStr === 'closed' || statusStr === 'archived' || deletedAt || closedAt) {
            await onBugherdTaskClosed(taskId)
            break
          }

          // Check if this is a screenshot update (comes ~3s after task_create)
          if (screenshotUrl) {
            await onBugherdScreenshotReady(projectId, taskId, screenshotUrl, task)
          }

          if (status) {
            await onBugherdStatusChanged(taskId, String(status))
          }
        }
        break

      case 'comment':
        if (comment && task) {
          const taskId = String(task.id || task.local_task_id)
          await onBugherdCommentAdded(projectId, taskId, comment)
        }
        break

      default:
        console.log('[BugHerd Webhook] Unknown event type:', eventType)
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[BugHerd Webhook] Error:', error)
    // Always return 200 to BugHerd to prevent retries
    return NextResponse.json({ status: 'error' })
  }
}

function detectEventType(payload: Record<string, unknown>): string {
  // Check explicit event field
  const event = payload.event || payload.trigger || payload.action || payload.type
  if (event) return String(event)

  // Infer from payload structure
  if (payload.comment) return 'comment'
  const task = payload.task as Record<string, unknown> | undefined
  if (task) {
    const createdAt = task.created_at as string
    const updatedAt = task.updated_at as string
    if (createdAt && updatedAt && createdAt === updatedAt) return 'task_create'
    return 'task_update'
  }

  return 'unknown'
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'BugHerd Webhook Receiver' })
}
