import { createClient } from '@/lib/supabase/server'
import { PayrollClient } from './payroll-client'

export const dynamic = 'force-dynamic'

export default async function PayrollPage() {
  const supabase = createClient()

  const [
    { data: runs },
    { data: slips },
    { data: members },
    { data: agencySettings },
  ] = await Promise.all([
    supabase
      .from('payroll_runs')
      .select('*')
      .order('year', { ascending: false })
      .order('month', { ascending: false }),
    supabase
      .from('payroll_slips')
      .select('*, team_members(full_name, designation, department_id, departments(name))')
      .order('created_at', { ascending: false }),
    supabase.from('team_members').select('id, full_name, monthly_ctc, status').eq('status', 'active').order('full_name'),
    supabase.from('agency_settings').select('name, address').limit(1).single(),
  ])

  const agency = {
    name: agencySettings?.name || 'Agency',
    address: agencySettings?.address || null,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <PayrollClient
        runs={runs || []}
        slips={slips || []}
        members={members || []}
        agency={agency}
      />
    </div>
  )
}
