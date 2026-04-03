import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cleanupDeletedBugherdTasks } from '@/lib/bugherd/sync-engine'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()

    // Check if BugHerd is enabled and cleanup is due
    const { data: settings } = await admin.from('bugherd_settings').select('*').limit(1).single()
    if (!settings?.is_enabled) {
      return NextResponse.json({ status: 'skipped', reason: 'BugHerd disabled' })
    }

    const intervalHours = settings.cleanup_interval_hours || 3
    const lastCleanup = settings.last_cleanup_at ? new Date(settings.last_cleanup_at) : new Date(0)
    const hoursSinceLastCleanup = (Date.now() - lastCleanup.getTime()) / (1000 * 60 * 60)

    if (hoursSinceLastCleanup < intervalHours) {
      return NextResponse.json({
        status: 'skipped',
        reason: `Next cleanup in ${Math.round(intervalHours - hoursSinceLastCleanup)}h`,
        last_cleanup: settings.last_cleanup_at,
      })
    }

    // Get all active project mappings
    const { data: mappings } = await admin
      .from('bugherd_project_mappings')
      .select('id, bugherd_project_name')
      .eq('is_active', true)

    if (!mappings || mappings.length === 0) {
      return NextResponse.json({ status: 'skipped', reason: 'No active mappings' })
    }

    // Run cleanup for each mapping
    let totalDeleted = 0
    const results: Record<string, number> = {}
    for (const mapping of mappings) {
      const deleted = await cleanupDeletedBugherdTasks(mapping.id)
      results[mapping.bugherd_project_name] = deleted
      totalDeleted += deleted
    }

    // Update last_cleanup_at
    await admin.from('bugherd_settings').update({
      last_cleanup_at: new Date().toISOString(),
    }).eq('id', settings.id)

    return NextResponse.json({
      status: 'ok',
      total_deleted: totalDeleted,
      results,
      next_cleanup_in: `${intervalHours}h`,
    })
  } catch (error) {
    console.error('[BugHerd Cleanup] Error:', error)
    return NextResponse.json({ status: 'error', message: String(error) }, { status: 500 })
  }
}
