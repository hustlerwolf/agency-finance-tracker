'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Plus, FileText, CheckCircle2, Clock, Pencil, Download,
  Calendar, IndianRupee, ArrowRight, ChevronUp,
} from 'lucide-react'
import { createPayrollRun, updatePayrollSlip, finalizePayrollRun, markPayrollPaid } from '../actions'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PayrollRun {
  id: string; month: number; year: number; status: string
  notes: string | null; created_at: string
}

interface PayrollSlip {
  id: string; payroll_run_id: string; team_member_id: string
  team_members: {
    full_name: string; designation: string | null
    department_id: string | null; departments: { name: string } | null
  } | null
  base_salary: number; working_days: number; days_present: number
  leaves_taken: number; lwp_days: number; lwp_deduction: number
  appreciation_bonus: number; other_deductions: number
  deduction_note: string | null; net_payable: number
  status: string; paid_on: string | null
}

interface Member { id: string; full_name: string; monthly_ctc: number; status: string }

interface AgencyInfo { name: string; address: string | null }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
  draft: { color: 'text-yellow-400', bg: 'bg-yellow-500/15 border-yellow-500/30', icon: Clock, label: 'Draft' },
  finalized: { color: 'text-blue-400', bg: 'bg-blue-500/15 border-blue-500/30', icon: FileText, label: 'Finalized' },
  paid: { color: 'text-green-400', bg: 'bg-green-500/15 border-green-500/30', icon: CheckCircle2, label: 'Paid' },
}

function fmtCurrency(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string | null) {
  return d ? new Date(d).toLocaleDateString('en-IN') : '—'
}

// ─── PDF Payslip Generator ───────────────────────────────────────────────────

function generatePayslipHTML(slip: PayrollSlip, run: PayrollRun, agency: AgencyInfo) {
  const period = `${MONTHS_FULL[run.month - 1]} ${run.year}`
  const emp = slip.team_members
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Payslip - ${emp?.full_name} - ${period}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #16a34a; padding-bottom: 20px; margin-bottom: 24px; }
  .company { font-size: 22px; font-weight: 700; color: #16a34a; }
  .company-addr { font-size: 11px; color: #666; margin-top: 4px; white-space: pre-line; }
  .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-paid { background: #dcfce7; color: #16a34a; }
  .badge-draft { background: #fef9c3; color: #a16207; }
  .badge-finalized { background: #dbeafe; color: #2563eb; }
  .title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 20px; color: #333; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
  .info-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 4px; }
  .info-value { font-size: 14px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #f1f5f9; text-align: left; padding: 10px 14px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; border-bottom: 2px solid #e2e8f0; }
  td { padding: 10px 14px; font-size: 13px; border-bottom: 1px solid #f1f5f9; }
  .text-right { text-align: right; }
  .text-green { color: #16a34a; }
  .text-red { color: #ef4444; }
  .total-row td { font-weight: 700; font-size: 15px; border-top: 2px solid #e2e8f0; background: #f8fafc; }
  .footer { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="company">${agency.name}</div>
    ${agency.address ? `<div class="company-addr">${agency.address}</div>` : ''}
  </div>
  <div style="text-align:right">
    <span class="badge badge-${run.status}">${run.status}</span>
    <div style="font-size:12px;color:#666;margin-top:6px">${fmtDate(slip.paid_on)}</div>
  </div>
</div>

<div class="title">Salary Slip &mdash; ${period}</div>

<div class="info-grid">
  <div class="info-box">
    <div class="info-label">Employee Name</div>
    <div class="info-value">${emp?.full_name || 'N/A'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Designation</div>
    <div class="info-value">${emp?.designation || 'N/A'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Department</div>
    <div class="info-value">${emp?.departments?.name || 'N/A'}</div>
  </div>
  <div class="info-box">
    <div class="info-label">Pay Period</div>
    <div class="info-value">${period}</div>
  </div>
</div>

<table>
  <thead><tr><th>Description</th><th class="text-right">Amount</th></tr></thead>
  <tbody>
    <tr><td><strong>Base Salary</strong></td><td class="text-right">${fmtCurrency(slip.base_salary)}</td></tr>
    <tr><td>Working Days</td><td class="text-right">${slip.working_days}</td></tr>
    <tr><td>Days Present</td><td class="text-right">${slip.days_present}</td></tr>
    <tr><td>Leaves Taken</td><td class="text-right">${slip.leaves_taken}</td></tr>
    ${slip.lwp_days > 0 ? `<tr><td>LWP Days</td><td class="text-right">${slip.lwp_days}</td></tr>` : ''}
    ${slip.lwp_deduction > 0 ? `<tr><td class="text-red">LWP Deduction</td><td class="text-right text-red">-${fmtCurrency(slip.lwp_deduction)}</td></tr>` : ''}
    ${slip.appreciation_bonus > 0 ? `<tr><td class="text-green">Appreciation Bonus</td><td class="text-right text-green">+${fmtCurrency(slip.appreciation_bonus)}</td></tr>` : ''}
    ${slip.other_deductions > 0 ? `<tr><td class="text-red">Other Deductions${slip.deduction_note ? ` (${slip.deduction_note})` : ''}</td><td class="text-right text-red">-${fmtCurrency(slip.other_deductions)}</td></tr>` : ''}
    <tr class="total-row"><td>Net Payable</td><td class="text-right">${fmtCurrency(slip.net_payable)}</td></tr>
  </tbody>
</table>

<div class="footer">
  This is a system-generated payslip from ${agency.name}. For queries, contact your HR department.
</div>
</body></html>`
}

function downloadPayslip(slip: PayrollSlip, run: PayrollRun, agency: AgencyInfo) {
  const html = generatePayslipHTML(slip, run, agency)
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    setTimeout(() => w.print(), 300)
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PayrollClient({ runs, slips, members, agency }: {
  runs: PayrollRun[]; slips: PayrollSlip[]; members: Member[]; agency: AgencyInfo
}) {
  const router = useRouter()
  const [tab, setTab] = useState<'current' | 'history'>('current')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editSlip, setEditSlip] = useState<PayrollSlip | null>(null)
  const [viewRun, setViewRun] = useState<PayrollRun | null>(null)
  const [newMonth, setNewMonth] = useState(new Date().getMonth() + 1)
  const [newYear, setNewYear] = useState(new Date().getFullYear())

  // Current run = most recent draft or finalized; past = everything else
  const currentRun = runs.find(r => r.status === 'draft' || r.status === 'finalized') || null
  const paidRuns = runs.filter(r => r.status === 'paid')

  const activeRun = tab === 'history' && viewRun ? viewRun : currentRun
  const activeSlips = activeRun ? slips.filter(s => s.payroll_run_id === activeRun.id) : []
  const totalPayable = activeSlips.reduce((sum, s) => sum + s.net_payable, 0)
  const totalBonus = activeSlips.reduce((sum, s) => sum + s.appreciation_bonus, 0)
  const totalDeductions = activeSlips.reduce((sum, s) => sum + s.lwp_deduction + s.other_deductions, 0)
  const totalBase = activeSlips.reduce((sum, s) => sum + s.base_salary, 0)

  async function handleCreateRun() {
    const res = await createPayrollRun(newMonth, newYear)
    if (res.success) {
      toast.success('Payroll run created')
      setCreateDialogOpen(false)
      router.refresh()
    } else {
      toast.error(res.error)
    }
  }

  async function handleFinalize() {
    if (!activeRun || !confirm('Finalize this payroll? Amounts will be locked.')) return
    const res = await finalizePayrollRun(activeRun.id)
    if (res.success) { toast.success('Payroll finalized'); router.refresh() }
    else toast.error(res.error)
  }

  async function handleMarkPaid() {
    if (!activeRun || !confirm('Mark this payroll as paid?')) return
    const res = await markPayrollPaid(activeRun.id)
    if (res.success) { toast.success('Payroll marked as paid'); router.refresh() }
    else toast.error(res.error)
  }

  async function handleUpdateSlip(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (editSlip) fd.set('id', editSlip.id)
    const res = await updatePayrollSlip(fd)
    if (res.success) { toast.success('Slip updated'); setEditSlip(null); router.refresh() }
    else toast.error(res.error)
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-sm text-muted-foreground mt-1">{runs.length} payroll run{runs.length !== 1 ? 's' : ''} total</p>
        </div>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> New Payroll Run
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        <button onClick={() => { setTab('current'); setViewRun(null) }} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'current' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Current Payroll
        </button>
        <button onClick={() => setTab('history')} className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          Past Payrolls ({paidRuns.length})
        </button>
      </div>

      {/* ═══ CURRENT PAYROLL TAB ═══ */}
      {tab === 'current' && (
        currentRun ? (
          <div className="space-y-6">
            {/* Run Header */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-600/15 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{MONTHS_FULL[currentRun.month - 1]} {currentRun.year}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      {(() => { const cfg = STATUS_CONFIG[currentRun.status]; const Icon = cfg.icon; return (
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}><Icon className="w-3 h-3 inline mr-1" />{cfg.label}</span>
                      ) })()}
                      <span className="text-xs text-muted-foreground">{activeSlips.length} employee{activeSlips.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentRun.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={handleFinalize}>
                      <FileText className="w-4 h-4 mr-1" /> Finalize
                    </Button>
                  )}
                  {currentRun.status === 'finalized' && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={handleMarkPaid}>
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Mark as Paid
                    </Button>
                  )}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <IndianRupee className="w-3.5 h-3.5" /> Base Total
                  </div>
                  <p className="text-lg font-bold">{fmtCurrency(totalBase)}</p>
                </div>
                <div className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                    <Plus className="w-3.5 h-3.5" /> Bonuses
                  </div>
                  <p className="text-lg font-bold text-green-400">{fmtCurrency(totalBonus)}</p>
                </div>
                <div className="rounded-lg border border-border p-4 bg-background">
                  <div className="flex items-center gap-2 text-xs text-red-400/70 mb-1">
                    <ArrowRight className="w-3.5 h-3.5" /> Deductions
                  </div>
                  <p className="text-lg font-bold text-red-400">{fmtCurrency(totalDeductions)}</p>
                </div>
                <div className="rounded-lg border border-green-500/20 p-4 bg-green-500/5">
                  <div className="flex items-center gap-2 text-xs text-green-400/70 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Net Payable
                  </div>
                  <p className="text-lg font-bold text-green-400">{fmtCurrency(totalPayable)}</p>
                </div>
              </div>
            </div>

            {/* Slips Table */}
            <PayslipTable
              slips={activeSlips}
              run={currentRun}
              agency={agency}
              onEdit={currentRun.status === 'draft' ? setEditSlip : undefined}
            />
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No Active Payroll</h3>
            <p className="text-sm text-muted-foreground mb-4">Create a new payroll run to get started for this month.</p>
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> New Payroll Run
            </Button>
          </div>
        )
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        viewRun ? (
          <div className="space-y-6">
            {/* Back + Run header */}
            <div className="flex items-center justify-between">
              <button onClick={() => setViewRun(null)} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                <ChevronUp className="w-4 h-4" /> Back to all payrolls
              </button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{MONTHS_FULL[viewRun.month - 1]} {viewRun.year}</span>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full border bg-green-500/15 text-green-400 border-green-500/30">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />Paid
                </span>
              </div>
            </div>

            {/* Summary row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Employees</p>
                <p className="text-lg font-bold">{activeSlips.length}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Paid</p>
                <p className="text-lg font-bold text-green-400">{fmtCurrency(totalPayable)}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Bonuses</p>
                <p className="text-lg font-bold text-blue-400">{fmtCurrency(totalBonus)}</p>
              </div>
              <div className="bg-card rounded-lg border border-border p-4">
                <p className="text-xs text-muted-foreground mb-1">Deductions</p>
                <p className="text-lg font-bold text-red-400">{fmtCurrency(totalDeductions)}</p>
              </div>
            </div>

            <PayslipTable slips={activeSlips} run={viewRun} agency={agency} />
          </div>
        ) : (
          <div className="space-y-3">
            {paidRuns.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">No past payrolls yet.</div>
            ) : (
              paidRuns.map(run => {
                const runSlips = slips.filter(s => s.payroll_run_id === run.id)
                const total = runSlips.reduce((sum, s) => sum + s.net_payable, 0)
                return (
                  <button key={run.id} onClick={() => setViewRun(run)}
                    className="w-full text-left bg-card rounded-xl border border-border p-5 hover:border-primary/30 transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                          <p className="font-semibold">{MONTHS_FULL[run.month - 1]} {run.year}</p>
                          <p className="text-xs text-muted-foreground">{runSlips.length} employee{runSlips.length !== 1 ? 's' : ''} · Paid {fmtDate(runSlips[0]?.paid_on)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-green-400">{fmtCurrency(total)}</p>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        )
      )}

      {/* ═══ DIALOGS ═══ */}

      {/* Create Run Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Payroll Run</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Month</Label>
                <select className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" value={newMonth} onChange={e => setNewMonth(Number(e.target.value))}>
                  {MONTHS_FULL.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Input type="number" value={newYear} onChange={e => setNewYear(Number(e.target.value))} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Salary slips will be auto-generated for all {members.length} active full-time employee{members.length !== 1 ? 's' : ''}.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleCreateRun}>Create</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Slip Dialog */}
      <Dialog open={!!editSlip} onOpenChange={() => setEditSlip(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Salary — {editSlip?.team_members?.full_name}</DialogTitle>
          </DialogHeader>
          {editSlip && (
            <form onSubmit={handleUpdateSlip} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_salary">Base Salary</Label>
                  <Input id="base_salary" name="base_salary" type="number" step="0.01" defaultValue={editSlip.base_salary} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="working_days">Working Days</Label>
                  <Input id="working_days" name="working_days" type="number" defaultValue={editSlip.working_days} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="days_present">Days Present</Label>
                  <Input id="days_present" name="days_present" type="number" defaultValue={editSlip.days_present} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="leaves_taken">Leaves Taken</Label>
                  <Input id="leaves_taken" name="leaves_taken" type="number" step="0.5" defaultValue={editSlip.leaves_taken} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lwp_days">LWP Days</Label>
                  <Input id="lwp_days" name="lwp_days" type="number" step="0.5" defaultValue={editSlip.lwp_days} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lwp_deduction">LWP Deduction</Label>
                  <Input id="lwp_deduction" name="lwp_deduction" type="number" step="0.01" defaultValue={editSlip.lwp_deduction} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="appreciation_bonus">Appreciation Bonus</Label>
                  <Input id="appreciation_bonus" name="appreciation_bonus" type="number" step="0.01" defaultValue={editSlip.appreciation_bonus} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="other_deductions">Other Deductions</Label>
                  <Input id="other_deductions" name="other_deductions" type="number" step="0.01" defaultValue={editSlip.other_deductions} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deduction_note">Note</Label>
                <Input id="deduction_note" name="deduction_note" defaultValue={editSlip.deduction_note || ''} placeholder="Reason for deductions/bonus..." />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditSlip(null)}>Cancel</Button>
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// ─── Payslip Table (reused in current + history) ──────────────────────────────

function PayslipTable({ slips, run, agency, onEdit }: {
  slips: PayrollSlip[]; run: PayrollRun; agency: AgencyInfo
  onEdit?: (s: PayrollSlip) => void
}) {
  return (
    <div className="rounded-xl border border-border overflow-auto bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Employee</TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="text-right">Base</TableHead>
            <TableHead className="text-right">Deductions</TableHead>
            <TableHead className="text-right">Bonus</TableHead>
            <TableHead className="text-right font-semibold">Net Payable</TableHead>
            <TableHead className="w-20 text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {slips.map(s => {
            const totalDed = s.lwp_deduction + s.other_deductions
            return (
              <TableRow key={s.id}>
                <TableCell>
                  <p className="font-medium text-sm">{s.team_members?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground">{s.team_members?.designation || ''}</p>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{s.team_members?.departments?.name || '—'}</TableCell>
                <TableCell className="text-right text-sm">{fmtCurrency(s.base_salary)}</TableCell>
                <TableCell className="text-right text-sm text-red-400">{totalDed > 0 ? `-${fmtCurrency(totalDed)}` : '—'}</TableCell>
                <TableCell className="text-right text-sm text-green-400">{s.appreciation_bonus > 0 ? `+${fmtCurrency(s.appreciation_bonus)}` : '—'}</TableCell>
                <TableCell className="text-right text-sm font-bold">{fmtCurrency(s.net_payable)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => onEdit(s)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Download Payslip" onClick={() => downloadPayslip(s, run, agency)}>
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
          {slips.length === 0 && (
            <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">No salary slips in this run.</TableCell></TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
