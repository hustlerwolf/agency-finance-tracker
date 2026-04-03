// Loop prevention for BugHerd ↔ Our App sync
// Prevents: BugHerd change → sync to our DB → our webhook → sync back → infinite loop

const SYNC_BOT_TAG = '[sync-bot]'
const SYNC_BOT_COMMENT_MARKER = '<!-- [sync-bot] -->'

// ─── Tag-based detection (for tasks) ──────────────────────────────────────────

export function isSyncBotTask(payload: Record<string, unknown>): boolean {
  try {
    const task = payload.task as Record<string, unknown> | undefined
    if (!task) return false
    const tags = task.tags as (string | { name: string })[] | undefined
    if (!Array.isArray(tags)) return false
    return tags.some(t => {
      const name = typeof t === 'string' ? t : t?.name
      return name === SYNC_BOT_TAG
    })
  } catch {
    return false
  }
}

// ─── Comment marker detection ─────────────────────────────────────────────────

export function isSyncBotComment(text: string): boolean {
  return text.includes(SYNC_BOT_COMMENT_MARKER)
}

export function markComment(text: string): string {
  return `${SYNC_BOT_COMMENT_MARKER}\n${text}`
}

export function stripCommentMarker(text: string): string {
  return text.replace(SYNC_BOT_COMMENT_MARKER, '').trim()
}

// ─── Source-based detection (for our DB records) ──────────────────────────────

export function isBugherdSource(source: string | null): boolean {
  return source === 'bugherd'
}

export { SYNC_BOT_TAG, SYNC_BOT_COMMENT_MARKER }
