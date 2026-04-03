import { getCurrentUserAccess } from '@/lib/auth-utils'
import { createAdminClient } from '@/lib/supabase/admin'
import { LeavesClient } from './leaves-client'

export const dynamic = 'force-dynamic'

export default async function LeavesPage() {
  const { isAdmin, teamMemberId } = await getCurrentUserAccess()

  // Use admin client to bypass RLS for data fetching
  const supabase = createAdminClient()

  // Build leaves query — admin sees all, member sees only their own
  let leavesQuery = supabase
    .from('leave_requests')
    .select('*, team_members!leave_requests_team_member_id_fkey(full_name)')
    .order('created_at', { ascending: false })

  if (!isAdmin && teamMemberId) {
    leavesQuery = leavesQuery.eq('team_member_id', teamMemberId)
  }

  const [
    { data: leaves },
    { data: members },
  ] = await Promise.all([
    leavesQuery,
    supabase.from('team_members').select('id, full_name, paid_leaves_balance, status').eq('status', 'active').order('full_name'),
  ])

  // For members, only show themselves in the member list
  const filteredMembers = isAdmin
    ? (members || [])
    : (members || []).filter(m => m.id === teamMemberId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <LeavesClient
        leaves={leaves || []}
        members={filteredMembers}
        isAdmin={isAdmin}
      />
    </div>
  )
}
