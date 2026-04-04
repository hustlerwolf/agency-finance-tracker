'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProject } from './actions'
import { toast } from 'sonner'
import {
  LayoutGrid, List, Columns, ExternalLink, Trash2, Edit,
  Calendar, Globe, Filter, Search, Plus, X, ChevronDown,
  SlidersHorizontal, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  status: string
  platform?: string | null
  live_link?: string | null
  staging_link?: string | null
  hero_image?: string | null
  start_date?: string | null
  complete_date?: string | null
  designed_by?: string | null
  developed_by?: string | null
  sales_channel?: string | null
  industry?: string[] | null
  show_publicly?: boolean
  design_portfolio?: boolean
  dev_portfolio?: boolean
  customers?: { name: string } | { name: string }[] | null
}

type FieldType = 'text' | 'select' | 'date' | 'array' | 'boolean'
type Operator =
  | 'contains' | 'not_contains' | 'is' | 'is_not' | 'is_empty' | 'is_not_empty'
  | 'before' | 'after' | 'is_true' | 'is_false'

interface FieldDef {
  key: keyof Project | 'customer_name'
  label: string
  type: FieldType
  options?: string[]
}

interface FilterRule {
  id: string
  field: FieldDef['key']
  operator: Operator
  value: string
}

type Conjunction = 'AND' | 'OR'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-muted',       text: 'text-muted-foreground',   dot: 'bg-gray-500' },
  in_progress:  { bg: 'bg-blue-500/10',   text: 'text-blue-400',   dot: 'bg-blue-500' },
  review:       { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  on_hold:      { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-500' },
  completed:    { bg: 'bg-green-500/10',  text: 'text-green-400',  dot: 'bg-green-500' },
}
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started', in_progress: 'In Progress',
  review: 'Review', on_hold: 'On Hold', completed: 'Completed',
}
const KANBAN_COLUMNS = ['not_started', 'in_progress', 'review', 'on_hold', 'completed']

const FIELD_DEFS: FieldDef[] = [
  { key: 'name',           label: 'Project Name',    type: 'text' },
  { key: 'customer_name',  label: 'Client',           type: 'text' },
  { key: 'status',         label: 'Status',           type: 'select', options: ['not_started','in_progress','review','on_hold','completed'] },
  { key: 'platform',       label: 'Platform',         type: 'text' },
  { key: 'sales_channel',  label: 'Sales Channel',    type: 'text' },
  { key: 'designed_by',    label: 'Designed By',      type: 'text' },
  { key: 'developed_by',   label: 'Developed By',     type: 'text' },
  { key: 'industry',       label: 'Industry',         type: 'array' },
  { key: 'start_date',     label: 'Start Date',       type: 'date' },
  { key: 'complete_date',  label: 'Completion Date',  type: 'date' },
  { key: 'show_publicly',  label: 'Show Publicly',    type: 'boolean' },
  { key: 'design_portfolio', label: 'Design Portfolio', type: 'boolean' },
  { key: 'dev_portfolio',  label: 'Dev Portfolio',    type: 'boolean' },
  { key: 'live_link',      label: 'Live Link',        type: 'text' },
]

const OPERATORS_BY_TYPE: Record<FieldType, { op: Operator; label: string }[]> = {
  text: [
    { op: 'contains',      label: 'contains' },
    { op: 'not_contains',  label: 'does not contain' },
    { op: 'is',            label: 'is exactly' },
    { op: 'is_not',        label: 'is not' },
    { op: 'is_empty',      label: 'is empty' },
    { op: 'is_not_empty',  label: 'is not empty' },
  ],
  select: [
    { op: 'is',     label: 'is' },
    { op: 'is_not', label: 'is not' },
  ],
  date: [
    { op: 'before',       label: 'before' },
    { op: 'after',        label: 'after' },
    { op: 'is',           label: 'on' },
    { op: 'is_empty',     label: 'is empty' },
    { op: 'is_not_empty', label: 'is not empty' },
  ],
  array: [
    { op: 'contains',     label: 'contains' },
    { op: 'not_contains', label: 'does not contain' },
    { op: 'is_empty',     label: 'is empty' },
    { op: 'is_not_empty', label: 'is not empty' },
  ],
  boolean: [
    { op: 'is_true',  label: 'is checked' },
    { op: 'is_false', label: 'is unchecked' },
  ],
}

// Column definitions for table
interface ColDef { key: string; label: string; defaultVisible: boolean }
const ALL_COLUMNS: ColDef[] = [
  { key: 'name',         label: 'Project',          defaultVisible: true },
  { key: 'client',       label: 'Client',           defaultVisible: true },
  { key: 'status',       label: 'Status',           defaultVisible: true },
  { key: 'platform',     label: 'Platform',         defaultVisible: true },
  { key: 'sales_channel',label: 'Sales Channel',    defaultVisible: false },
  { key: 'designed_by',  label: 'Designer',         defaultVisible: true },
  { key: 'developed_by', label: 'Developer',        defaultVisible: true },
  { key: 'industry',     label: 'Industry',         defaultVisible: false },
  { key: 'start_date',   label: 'Start',            defaultVisible: true },
  { key: 'complete_date',label: 'Deadline',         defaultVisible: false },
  { key: 'portfolio',    label: 'Portfolio',        defaultVisible: false },
  { key: 'live_link',    label: 'Live',             defaultVisible: true },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCustomerName(p: Project): string {
  if (!p.customers) return ''
  return (Array.isArray(p.customers) ? p.customers[0]?.name : (p.customers as { name: string })?.name) || ''
}

function getFieldValue(p: Project, key: FieldDef['key']): string | string[] | boolean | null | undefined {
  if (key === 'customer_name') return getCustomerName(p)
  return p[key as keyof Project] as string | string[] | boolean | null | undefined
}

function applyRule(p: Project, rule: FilterRule): boolean {
  const def = FIELD_DEFS.find(f => f.key === rule.field)
  if (!def) return true
  const raw = getFieldValue(p, rule.field)

  switch (def.type) {
    case 'boolean': {
      const val = !!raw
      if (rule.operator === 'is_true')  return val === true
      if (rule.operator === 'is_false') return val === false
      return true
    }
    case 'array': {
      const arr = (raw as string[] | null | undefined) || []
      if (rule.operator === 'is_empty')     return arr.length === 0
      if (rule.operator === 'is_not_empty') return arr.length > 0
      if (rule.operator === 'contains')     return arr.some(t => t.toLowerCase().includes(rule.value.toLowerCase()))
      if (rule.operator === 'not_contains') return !arr.some(t => t.toLowerCase().includes(rule.value.toLowerCase()))
      return true
    }
    case 'date': {
      const str = (raw as string | null | undefined) || ''
      if (rule.operator === 'is_empty')     return !str
      if (rule.operator === 'is_not_empty') return !!str
      if (!str || !rule.value) return true
      if (rule.operator === 'before') return new Date(str) < new Date(rule.value)
      if (rule.operator === 'after')  return new Date(str) > new Date(rule.value)
      if (rule.operator === 'is')     return str === rule.value
      return true
    }
    case 'select':
    case 'text':
    default: {
      const str = ((raw as string | null | undefined) || '').toLowerCase()
      const val = rule.value.toLowerCase()
      if (rule.operator === 'is_empty')     return !str
      if (rule.operator === 'is_not_empty') return !!str
      if (rule.operator === 'contains')     return str.includes(val)
      if (rule.operator === 'not_contains') return !str.includes(val)
      if (rule.operator === 'is')           return str === val
      if (rule.operator === 'is_not')       return str !== val
      return true
    }
  }
}

function applyFilters(projects: Project[], rules: FilterRule[], conjunction: Conjunction): Project[] {
  if (rules.length === 0) return projects
  return projects.filter(p =>
    conjunction === 'AND'
      ? rules.every(r => applyRule(p, r))
      : rules.some(r => applyRule(p, r))
  )
}

function uid() { return Math.random().toString(36).slice(2) }

// ─── Shared UI ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.not_started
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text} whitespace-nowrap`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
      {STATUS_LABELS[status] || status}
    </span>
  )
}

function ProjectActions({ id, name }: { id: string; name: string }) {
  const router = useRouter()
  async function handleDelete() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const res = await deleteProject(id)
    if (res.success) toast.success('Project deleted')
    else toast.error('Failed: ' + res.error)
    router.refresh()
  }
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => router.push(`/projects/${id}`)}
        className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Edit className="w-3.5 h-3.5" />
      </button>
      <button onClick={handleDelete} className="p-1.5 rounded hover:bg-red-900/30 text-muted-foreground hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Filter Builder ───────────────────────────────────────────────────────────

function FilterValueInput({ def, operator, value, onChange }: {
  def: FieldDef; operator: Operator; value: string; onChange: (v: string) => void
}) {
  const noValue: Operator[] = ['is_empty','is_not_empty','is_true','is_false']
  if (noValue.includes(operator)) return null

  if (def.type === 'select' && def.options) {
    return (
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 rounded-lg border border-border bg-muted text-xs text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-green-500 min-w-[120px]"
      >
        <option value="">Select…</option>
        {def.options.map(o => (
          <option key={o} value={o}>{STATUS_LABELS[o] || o}</option>
        ))}
      </select>
    )
  }
  if (def.type === 'date') {
    return (
      <input
        type="date"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="h-8 rounded-lg border border-border bg-muted text-xs text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
    )
  }
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Value…"
      className="h-8 rounded-lg border border-border bg-muted text-xs text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-green-500 min-w-[120px]"
    />
  )
}

function FilterRow({ rule, onUpdate, onRemove, showConjunction, conjunction, onConjunctionChange }: {
  rule: FilterRule
  onUpdate: (updated: FilterRule) => void
  onRemove: () => void
  showConjunction: boolean
  conjunction: Conjunction
  onConjunctionChange: (c: Conjunction) => void
}) {
  const def = FIELD_DEFS.find(f => f.key === rule.field)!
  const operators = OPERATORS_BY_TYPE[def.type]

  function changeField(key: FieldDef['key']) {
    const newDef = FIELD_DEFS.find(f => f.key === key)!
    const defaultOp = OPERATORS_BY_TYPE[newDef.type][0].op
    onUpdate({ ...rule, field: key, operator: defaultOp, value: '' })
  }

  function changeOperator(op: Operator) {
    onUpdate({ ...rule, operator: op, value: '' })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* AND / OR pill */}
      {showConjunction ? (
        <button
          onClick={() => onConjunctionChange(conjunction === 'AND' ? 'OR' : 'AND')}
          className="w-10 h-8 rounded-lg bg-muted hover:bg-gray-600 border border-border text-xs font-bold text-foreground transition-colors"
        >
          {conjunction}
        </button>
      ) : (
        <span className="w-10 text-xs text-muted-foreground text-center">Where</span>
      )}

      {/* Field picker */}
      <select
        value={rule.field}
        onChange={e => changeField(e.target.value as FieldDef['key'])}
        className="h-8 rounded-lg border border-border bg-muted text-xs text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        {FIELD_DEFS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
      </select>

      {/* Operator picker */}
      <select
        value={rule.operator}
        onChange={e => changeOperator(e.target.value as Operator)}
        className="h-8 rounded-lg border border-border bg-muted text-xs text-foreground px-2 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        {operators.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
      </select>

      {/* Value */}
      <FilterValueInput
        def={def}
        operator={rule.operator}
        value={rule.value}
        onChange={v => onUpdate({ ...rule, value: v })}
      />

      {/* Remove */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

function FilterPanel({ rules, setRules, conjunction, setConjunction }: {
  rules: FilterRule[]
  setRules: (r: FilterRule[]) => void
  conjunction: Conjunction
  setConjunction: (c: Conjunction) => void
}) {
  function addRule() {
    setRules([...rules, { id: uid(), field: 'name', operator: 'contains', value: '' }])
  }
  function updateRule(id: string, updated: FilterRule) {
    setRules(rules.map(r => r.id === id ? updated : r))
  }
  function removeRule(id: string) {
    setRules(rules.filter(r => r.id !== id))
  }

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-2xl">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Filter rules</span>
        {rules.length > 1 && (
          <span className="text-xs text-muted-foreground">Click AND/OR to toggle</span>
        )}
      </div>

      {rules.length === 0 && (
        <p className="text-xs text-muted-foreground py-2">No filters applied. Add a rule below.</p>
      )}

      <div className="space-y-2">
        {rules.map((rule, i) => (
          <FilterRow
            key={rule.id}
            rule={rule}
            onUpdate={updated => updateRule(rule.id, updated)}
            onRemove={() => removeRule(rule.id)}
            showConjunction={i > 0}
            conjunction={conjunction}
            onConjunctionChange={setConjunction}
          />
        ))}
      </div>

      <button
        onClick={addRule}
        className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 hover:text-green-400 font-medium mt-1 transition-colors"
      >
        <Plus className="w-3.5 h-3.5" />
        Add filter rule
      </button>

      {rules.length > 0 && (
        <div className="flex justify-end pt-1 border-t border-border">
          <button
            onClick={() => setRules([])}
            className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Column Visibility Panel ──────────────────────────────────────────────────

function ColumnPanel({ visible, setVisible }: {
  visible: Set<string>
  setVisible: (v: Set<string>) => void
}) {
  function toggle(key: string) {
    const next = new Set(visible)
    if (next.has(key)) { if (next.size > 1) next.delete(key) }
    else next.add(key)
    setVisible(next)
  }
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-1 shadow-2xl min-w-[200px]">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest block mb-2">Columns</span>
      {ALL_COLUMNS.map(col => (
        <button
          key={col.key}
          onClick={() => toggle(col.key)}
          className="flex items-center gap-2.5 w-full px-1 py-1.5 rounded hover:bg-white/5 text-xs text-left transition-colors"
        >
          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
            visible.has(col.key) ? 'bg-green-600 border-green-600' : 'border-white/20 bg-muted'
          }`}>
            {visible.has(col.key) && <Check className="w-2.5 h-2.5 text-foreground" />}
          </div>
          <span className={visible.has(col.key) ? 'text-foreground' : 'text-muted-foreground'}>{col.label}</span>
        </button>
      ))}
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function TableView({ projects, visibleCols }: { projects: Project[]; visibleCols: Set<string> }) {
  const [sortKey, setSortKey] = useState<string>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sorted = [...projects].sort((a, b) => {
    let av: string = '', bv: string = ''
    if (sortKey === 'client') { av = getCustomerName(a); bv = getCustomerName(b) }
    else if (sortKey === 'status') { av = a.status; bv = b.status }
    else if (sortKey === 'platform') { av = a.platform || ''; bv = b.platform || '' }
    else if (sortKey === 'start_date') { av = a.start_date || ''; bv = b.start_date || '' }
    else if (sortKey === 'complete_date') { av = a.complete_date || ''; bv = b.complete_date || '' }
    else if (sortKey === 'sales_channel') { av = a.sales_channel || ''; bv = b.sales_channel || '' }
    else if (sortKey === 'designed_by') { av = a.designed_by || ''; bv = b.designed_by || '' }
    else if (sortKey === 'developed_by') { av = a.developed_by || ''; bv = b.developed_by || '' }
    else { av = a.name; bv = b.name }
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  const dateColumns = new Set(['start_date', 'complete_date'])

  function SortTh({ colKey, label }: { colKey: string; label: string }) {
    const active = sortKey === colKey
    const isSortable = dateColumns.has(colKey)
    return (
      <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">
        {isSortable ? (
          <button
            onClick={() => handleSort(colKey)}
            className={`flex items-center gap-1 hover:text-foreground transition-colors ${active ? 'text-foreground' : ''}`}
          >
            {label}
            {active && sortDir === 'asc' && <ArrowUp className="w-3 h-3" />}
            {active && sortDir === 'desc' && <ArrowDown className="w-3 h-3" />}
            {!active && <ArrowUpDown className="w-3 h-3 opacity-30" />}
          </button>
        ) : (
          <span>{label}</span>
        )}
      </th>
    )
  }

  const v = visibleCols
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card/80">
            {v.has('name')          && <SortTh colKey="name"          label="Project" />}
            {v.has('client')        && <SortTh colKey="client"        label="Client" />}
            {v.has('status')        && <SortTh colKey="status"        label="Status" />}
            {v.has('platform')      && <SortTh colKey="platform"      label="Platform" />}
            {v.has('sales_channel') && <SortTh colKey="sales_channel" label="Sales Channel" />}
            {v.has('designed_by')   && <SortTh colKey="designed_by"   label="Designer" />}
            {v.has('developed_by')  && <SortTh colKey="developed_by"  label="Developer" />}
            {v.has('industry')      && <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Industry</th>}
            {v.has('start_date')    && <SortTh colKey="start_date"    label="Start" />}
            {v.has('complete_date') && <SortTh colKey="complete_date" label="Deadline" />}
            {v.has('portfolio')     && <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Portfolio</th>}
            {v.has('live_link')     && <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Links</th>}
            <th className="px-3 py-3 w-16" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {sorted.map(p => {
            const customerName = getCustomerName(p)
            return (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                {v.has('name') && (
                  <td className="px-3 py-3 max-w-[220px]">
                    <Link href={`/projects/${p.id}`} className="font-medium text-foreground hover:text-green-400 transition-colors block truncate">
                      {p.name}
                    </Link>
                  </td>
                )}
                {v.has('client') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap">{customerName || '—'}</td>
                )}
                {v.has('status') && (
                  <td className="px-3 py-3"><StatusBadge status={p.status} /></td>
                )}
                {v.has('platform') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">{p.platform || '—'}</td>
                )}
                {v.has('sales_channel') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">{p.sales_channel || '—'}</td>
                )}
                {v.has('designed_by') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">{p.designed_by || '—'}</td>
                )}
                {v.has('developed_by') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">{p.developed_by || '—'}</td>
                )}
                {v.has('industry') && (
                  <td className="px-3 py-3">
                    {p.industry && p.industry.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {p.industry.map(t => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 whitespace-nowrap">{t}</span>
                        ))}
                      </div>
                    ) : <span className="text-muted-foreground text-xs">—</span>}
                  </td>
                )}
                {v.has('start_date') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                )}
                {v.has('complete_date') && (
                  <td className="px-3 py-3 text-muted-foreground whitespace-nowrap text-xs">
                    {p.complete_date ? new Date(p.complete_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' }) : '—'}
                  </td>
                )}
                {v.has('portfolio') && (
                  <td className="px-3 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {p.show_publicly    && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 whitespace-nowrap">Public</span>}
                      {p.design_portfolio && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 whitespace-nowrap">Design</span>}
                      {p.dev_portfolio    && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 whitespace-nowrap">Dev</span>}
                      {!p.show_publicly && !p.design_portfolio && !p.dev_portfolio && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                )}
                {v.has('live_link') && (
                  <td className="px-3 py-3">
                    <div className="flex flex-col gap-1">
                      {p.live_link && (
                        <a href={p.live_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 whitespace-nowrap">
                          <Globe className="w-3 h-3" /> Live
                        </a>
                      )}
                      {p.staging_link && (
                        <a href={p.staging_link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground whitespace-nowrap">
                          <Globe className="w-3 h-3" /> Staging
                        </a>
                      )}
                      {!p.live_link && !p.staging_link && <span className="text-xs text-muted-foreground">—</span>}
                    </div>
                  </td>
                )}
                <td className="px-3 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ProjectActions id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {sorted.length === 0 && (
        <div className="py-12 text-center text-muted-foreground text-sm">No projects match your filters.</div>
      )}
    </div>
  )
}

// ─── Gallery View ─────────────────────────────────────────────────────────────

function GalleryView({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map(p => {
        const customerName = getCustomerName(p)
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="group">
            <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-white/20 transition-all hover:shadow-lg hover:shadow-black/20">
              <div className="relative h-40 bg-muted">
                {p.hero_image ? (
                  <img src={p.hero_image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                      <Globe className="w-6 h-6 text-muted-foreground" />
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2"><StatusBadge status={p.status} /></div>
              </div>
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-foreground group-hover:text-green-400 transition-colors truncate">{p.name}</h3>
                {customerName && <p className="text-xs text-muted-foreground truncate">{customerName}</p>}
                <div className="flex items-center justify-between">
                  {p.platform && <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground">{p.platform}</span>}
                  {p.live_link && (
                    <button
                      onClick={e => { e.preventDefault(); e.stopPropagation(); window.open(p.live_link!, '_blank', 'noopener,noreferrer') }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {p.industry && p.industry.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.industry.slice(0, 3).map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

// ─── Kanban View ──────────────────────────────────────────────────────────────

function KanbanView({ projects }: { projects: Project[] }) {
  const grouped = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col] = projects.filter(p => p.status === col)
    return acc
  }, {} as Record<string, Project[]>)

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {KANBAN_COLUMNS.map(col => {
        const s = STATUS_STYLES[col]
        const items = grouped[col]
        return (
          <div key={col} className="flex-shrink-0 w-72 space-y-3">
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${s.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-sm font-semibold ${s.text}`}>{STATUS_LABELS[col]}</span>
              </div>
              <span className={`text-xs font-bold ${s.text} opacity-60`}>{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.map(p => {
                const customerName = getCustomerName(p)
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="bg-card/60 border border-border rounded-lg p-3 hover:border-white/20 transition-all cursor-pointer group space-y-2">
                      {p.hero_image && <img src={p.hero_image} alt={p.name} className="w-full h-20 object-cover rounded-lg" />}
                      <p className="text-sm font-medium text-foreground group-hover:text-green-400 transition-colors">{p.name}</p>
                      {customerName && <p className="text-xs text-muted-foreground">{customerName}</p>}
                      <div className="flex items-center justify-between">
                        {p.platform && <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.platform}</span>}
                        {p.start_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {p.industry && p.industry.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.industry.slice(0, 2).map(t => (
                            <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-500/20">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
              {items.length === 0 && (
                <div className="border border-dashed border-border rounded-lg p-4 text-center">
                  <p className="text-xs text-muted-foreground">No projects</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Popover wrapper ──────────────────────────────────────────────────────────

function Popover({ trigger, children, align = 'left' }: {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen(p => !p)}>{trigger}</div>
      {open && (
        <div className={`absolute top-full mt-2 z-50 ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

type View = 'table' | 'gallery' | 'kanban'

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const [view, setView]               = useState<View>('gallery')
  const [search, setSearch]           = useState('')
  const [rules, setRules]             = useState<FilterRule[]>([])
  const [conjunction, setConjunction] = useState<Conjunction>('AND')
  const [visibleCols, setVisibleCols] = useState<Set<string>>(
    new Set(ALL_COLUMNS.filter(c => c.defaultVisible).map(c => c.key))
  )

  // Search filter
  const searchFiltered = projects.filter(p => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.name.toLowerCase().includes(q) ||
      getCustomerName(p).toLowerCase().includes(q) ||
      (p.platform || '').toLowerCase().includes(q) ||
      (p.status || '').toLowerCase().includes(q)
    )
  })

  // Advanced filter rules
  const filtered = applyFilters(searchFiltered, rules, conjunction)

  const activeRules = rules.length
  const completed = projects.filter(p => p.status === 'completed').length
  const active    = projects.filter(p => p.status === 'in_progress').length

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {filtered.length !== projects.length
              ? `${filtered.length} of ${projects.length} shown`
              : `${projects.length} total · ${active} active · ${completed} completed`}
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-sm w-56"
          />
        </div>

        {/* Filter builder */}
        <Popover
          align="left"
          trigger={
            <button className={[
              'flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm font-medium transition-colors',
              activeRules > 0
                ? 'border-green-600/60 bg-green-500/10 text-green-400'
                : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-white/20',
            ].join(' ')}>
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeRules > 0 && (
                <span className="ml-0.5 bg-green-600 text-foreground text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  {activeRules}
                </span>
              )}
            </button>
          }
        >
          <div className="w-[520px] max-w-[95vw]">
            <FilterPanel
              rules={rules}
              setRules={setRules}
              conjunction={conjunction}
              setConjunction={setConjunction}
            />
          </div>
        </Popover>

        {/* Clear filters pill */}
        {activeRules > 0 && (
          <button
            onClick={() => setRules([])}
            className="flex items-center gap-1 h-9 px-2.5 rounded-lg border border-border bg-card text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-3 h-3" />
            Clear filters
          </button>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Column visibility (table only) */}
        {view === 'table' && (
          <Popover
            align="right"
            trigger={
              <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
                <Eye className="w-3.5 h-3.5" />
                Columns
              </button>
            }
          >
            <ColumnPanel visible={visibleCols} setVisible={setVisibleCols} />
          </Popover>
        )}

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([
            { v: 'table',   icon: List,       label: 'Table' },
            { v: 'gallery', icon: LayoutGrid, label: 'Gallery' },
            { v: 'kanban',  icon: Columns,    label: 'Kanban' },
          ] as { v: View; icon: React.ElementType; label: string }[]).map(({ v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                view === v ? 'bg-white/15 text-foreground' : 'text-muted-foreground hover:text-foreground',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Active filter summary chips */}
      {activeRules > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-muted-foreground">Filtering by:</span>
          {rules.map((r, i) => {
            const def = FIELD_DEFS.find(f => f.key === r.field)
            const opLabel = OPERATORS_BY_TYPE[def?.type || 'text'].find(o => o.op === r.operator)?.label
            return (
              <span key={r.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted border border-border text-xs text-foreground">
                {i > 0 && <span className="text-muted-foreground font-bold text-[10px]">{conjunction}</span>}
                <span className="text-muted-foreground">{def?.label}</span>
                <span className="text-muted-foreground">{opLabel}</span>
                {r.value && <span className="text-foreground font-medium">{STATUS_LABELS[r.value] || r.value}</span>}
                <button onClick={() => setRules(rules.filter(x => x.id !== r.id))} className="text-muted-foreground hover:text-foreground ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No projects match your filters</h3>
          <p className="text-muted-foreground text-sm mt-1">Try adjusting or clearing your filters.</p>
          <button onClick={() => { setRules([]); setSearch('') }} className="mt-4 text-sm text-green-600 dark:text-green-400 hover:text-green-400">
            Clear all filters
          </button>
        </div>
      ) : (
        <>
          {view === 'table'   && <TableView   projects={filtered} visibleCols={visibleCols} />}
          {view === 'gallery' && <GalleryView projects={filtered} />}
          {view === 'kanban'  && <KanbanView  projects={filtered} />}
        </>
      )}
    </div>
  )
}
