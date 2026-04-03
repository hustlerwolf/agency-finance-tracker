'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ─── Team Members ─────────────────────────────────────────────────────────────

export async function saveTeamMember(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const data: Record<string, unknown> = {
    full_name: formData.get('full_name') as string,
    email: (formData.get('email') as string) || null,
    phone: (formData.get('phone') as string) || null,
    date_of_birth: (formData.get('date_of_birth') as string) || null,
    profile_photo_url: (formData.get('profile_photo_url') as string) || null,
    designation: (formData.get('designation') as string) || null,
    department_id: (formData.get('department_id') as string) || null,
    employment_type: (formData.get('employment_type') as string) || 'full_time',
    status: (formData.get('status') as string) || 'active',
    date_of_joining: (formData.get('date_of_joining') as string) || null,
    reporting_to: (formData.get('reporting_to') as string) || null,
    salary_type: (formData.get('salary_type') as string) || 'monthly',
    monthly_ctc: parseFloat(formData.get('monthly_ctc') as string) || 0,
    payment_mode: (formData.get('payment_mode') as string) || 'bank_transfer',
    bank_account: (formData.get('bank_account') as string) || null,
    ifsc_code: (formData.get('ifsc_code') as string) || null,
    pan_number: (formData.get('pan_number') as string) || null,
    aadhaar_last_four: (formData.get('aadhaar_last_four') as string) || null,
    pf_number: (formData.get('pf_number') as string) || null,
    esi_number: (formData.get('esi_number') as string) || null,
    paid_leaves_balance: parseFloat(formData.get('paid_leaves_balance') as string) || 12,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('team_members').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('team_members').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/team')
  return { success: true }
}

export async function deleteTeamMember(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('team_members').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/team')
  return { success: true }
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function saveDepartment(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string
  const data = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || null,
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('departments').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('departments').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/team')
  revalidatePath('/team/settings')
  return { success: true }
}

export async function deleteDepartment(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/team')
  revalidatePath('/team/settings')
  return { success: true }
}

// ─── Leave Requests ───────────────────────────────────────────────────────────

export async function submitLeaveRequest(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const startDate = formData.get('start_date') as string
  const endDate = formData.get('end_date') as string
  const isHalfDay = formData.get('is_half_day') === 'true'

  // Calculate total days
  let totalDays = 0
  if (isHalfDay) {
    totalDays = 0.5
  } else {
    const start = new Date(startDate)
    const end = new Date(endDate)
    totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const data: Record<string, unknown> = {
    team_member_id: formData.get('team_member_id') as string,
    leave_type: (formData.get('leave_type') as string) || 'paid',
    start_date: startDate,
    end_date: isHalfDay ? startDate : endDate,
    is_half_day: isHalfDay,
    half_day_period: isHalfDay ? (formData.get('half_day_period') as string) || 'first_half' : null,
    reason: (formData.get('reason') as string) || null,
    total_days: totalDays,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('leave_requests').update(data).eq('id', id)
    error = e
  } else {
    data.status = 'pending'
    const { error: e } = await supabase.from('leave_requests').insert([data])
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/team/leaves')
  return { success: true }
}

export async function updateLeaveStatus(id: string, status: string, adminNote?: string, approvedBy?: string) {
  const supabase = createClient()

  const updateData: Record<string, unknown> = {
    status,
    admin_note: adminNote || null,
    approved_by: approvedBy || null,
    updated_at: new Date().toISOString(),
  }

  // If approved, deduct from balance
  if (status === 'approved') {
    const { data: leave } = await supabase.from('leave_requests').select('*').eq('id', id).single()
    if (leave && leave.leave_type === 'paid') {
      const { data: member } = await supabase.from('team_members').select('paid_leaves_balance').eq('id', leave.team_member_id).single()
      if (member) {
        await supabase.from('team_members').update({
          paid_leaves_balance: Math.max(0, (member.paid_leaves_balance || 0) - leave.total_days),
        }).eq('id', leave.team_member_id)
      }
    }
  }

  const { error } = await supabase.from('leave_requests').update(updateData).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/team/leaves')
  return { success: true }
}

export async function deleteLeaveRequest(id: string) {
  const supabase = createClient()
  const { error } = await supabase.from('leave_requests').delete().eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/team/leaves')
  return { success: true }
}

// ─── Attendance ───────────────────────────────────────────────────────────────

export async function saveAttendance(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const data: Record<string, unknown> = {
    team_member_id: formData.get('team_member_id') as string,
    date: formData.get('date') as string,
    status: (formData.get('status') as string) || 'present',
    check_in: (formData.get('check_in') as string) || null,
    check_out: (formData.get('check_out') as string) || null,
    daily_update: (formData.get('daily_update') as string) || null,
    updated_at: new Date().toISOString(),
  }

  let error
  if (id) {
    const { error: e } = await supabase.from('attendance').update(data).eq('id', id)
    error = e
  } else {
    const { error: e } = await supabase.from('attendance').upsert([data], { onConflict: 'team_member_id,date' })
    error = e
  }

  if (error) return { success: false, error: error.message }
  revalidatePath('/team/attendance')
  return { success: true }
}

// ─── Payroll ──────────────────────────────────────────────────────────────────

export async function createPayrollRun(month: number, year: number) {
  const supabase = createClient()

  // Create the run
  const { data: run, error: runError } = await supabase
    .from('payroll_runs')
    .insert([{ month, year, status: 'draft' }])
    .select()
    .single()

  if (runError) return { success: false, error: runError.message }

  // Fetch all active team members
  const { data: members } = await supabase
    .from('team_members')
    .select('*')
    .eq('status', 'active')
    .eq('employment_type', 'full_time')

  if (!members || members.length === 0) return { success: true, data: run }

  // Create slips for each member
  const slips = members.map(m => ({
    payroll_run_id: run.id,
    team_member_id: m.id,
    base_salary: m.monthly_ctc || 0,
    working_days: 0,
    days_present: 0,
    leaves_taken: 0,
    lwp_days: 0,
    lwp_deduction: 0,
    appreciation_bonus: 0,
    other_deductions: 0,
    net_payable: m.monthly_ctc || 0,
    status: 'draft',
  }))

  const { error: slipError } = await supabase.from('payroll_slips').insert(slips)
  if (slipError) return { success: false, error: slipError.message }

  revalidatePath('/team/payroll')
  return { success: true, data: run }
}

export async function updatePayrollSlip(formData: FormData) {
  const supabase = createClient()
  const id = formData.get('id') as string

  const baseSalary = parseFloat(formData.get('base_salary') as string) || 0
  const lwpDeduction = parseFloat(formData.get('lwp_deduction') as string) || 0
  const appreciationBonus = parseFloat(formData.get('appreciation_bonus') as string) || 0
  const otherDeductions = parseFloat(formData.get('other_deductions') as string) || 0
  const netPayable = baseSalary - lwpDeduction - otherDeductions + appreciationBonus

  const data = {
    base_salary: baseSalary,
    working_days: parseInt(formData.get('working_days') as string) || 0,
    days_present: parseInt(formData.get('days_present') as string) || 0,
    leaves_taken: parseFloat(formData.get('leaves_taken') as string) || 0,
    lwp_days: parseFloat(formData.get('lwp_days') as string) || 0,
    lwp_deduction: lwpDeduction,
    appreciation_bonus: appreciationBonus,
    other_deductions: otherDeductions,
    deduction_note: (formData.get('deduction_note') as string) || null,
    net_payable: netPayable,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('payroll_slips').update(data).eq('id', id)
  if (error) return { success: false, error: error.message }
  revalidatePath('/team/payroll')
  return { success: true }
}

export async function finalizePayrollRun(runId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('payroll_runs').update({ status: 'finalized', updated_at: new Date().toISOString() }).eq('id', runId)
  if (error) return { success: false, error: error.message }

  await supabase.from('payroll_slips').update({ status: 'finalized' }).eq('payroll_run_id', runId)
  revalidatePath('/team/payroll')
  return { success: true }
}

export async function markPayrollPaid(runId: string) {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase.from('payroll_runs').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('id', runId)
  if (error) return { success: false, error: error.message }

  await supabase.from('payroll_slips').update({ status: 'paid', paid_on: today }).eq('payroll_run_id', runId)
  revalidatePath('/team/payroll')
  return { success: true }
}
