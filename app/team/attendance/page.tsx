import { getCurrentUserAccess } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { AttendanceClient } from './attendance-client'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const { isAdmin, teamMemberId } = await getCurrentUserAccess()

  // Use admin client to bypass RLS for data fetching
  const supabase = createAdminClient()

  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  let attendanceQuery = supabase
    .from('attendance')
    .select('*, team_members(full_name)')
    .gte('date', thirtyDaysAgo)
    .lte('date', today)
    .order('date', { ascending: false })

  if (!isAdmin && teamMemberId) {
    attendanceQuery = attendanceQuery.eq('team_member_id', teamMemberId)
  }

  const [
    { data: attendance },
    { data: members },
  ] = await Promise.all([
    attendanceQuery,
    supabase.from('team_members').select('id, full_name, status').eq('status', 'active').order('full_name'),
  ])

  const filteredMembers = isAdmin
    ? (members || [])
    : (members || []).filter(m => m.id === teamMemberId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AttendanceClient
        attendance={attendance || []}
        members={filteredMembers}
        today={today}
        isAdmin={isAdmin}
      />
    </div>
  )
}
