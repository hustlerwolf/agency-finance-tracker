'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteProject } from './actions'
import { toast } from 'sonner'
import {
  LayoutGrid, List, Columns, ExternalLink, Trash2, Edit,
  Calendar, Globe, Filter, Search, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  not_started: { bg: 'bg-gray-800', text: 'text-gray-400', dot: 'bg-gray-500' },
  in_progress:  { bg: 'bg-blue-900/30', text: 'text-blue-400', dot: 'bg-blue-500' },
  review:       { bg: 'bg-yellow-900/30', text: 'text-yellow-400', dot: 'bg-yellow-500' },
  on_hold:      { bg: 'bg-orange-900/30', text: 'text-orange-400', dot: 'bg-orange-500' },
  completed:    { bg: 'bg-green-900/30', text: 'text-green-400', dot: 'bg-green-500' },
}

const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  review: 'Review',
  on_hold: 'On Hold',
  completed: 'Completed',
}

const KANBAN_COLUMNS = ['not_started', 'in_progress', 'review', 'on_hold', 'completed']

interface Project {
  id: string
  name: string
  status: string
  platform?: string | null
  live_link?: string | null
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
  customers?: { name: string } | null
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.not_started
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
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
      <Link href={`/projects/${id}`}>
        <button className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <Edit className="w-3.5 h-3.5" />
        </button>
      </Link>
      <button
        onClick={handleDelete}
        className="p-1.5 rounded hover:bg-red-900/30 text-gray-400 hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Table View ─────────────────────────────────────────────────────────────

function TableView({ projects }: { projects: Project[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 bg-gray-900/80">
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Project</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Platform</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Team</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Timeline</th>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Links</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.05]">
          {projects.map(p => {
            const customerName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
            return (
              <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium text-white hover:text-green-400 transition-colors">
                    {p.name}
                  </Link>
                  {p.industry && p.industry.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {p.industry.slice(0, 2).map(t => (
                        <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-400">{customerName || '—'}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-3 text-gray-400">{p.platform || '—'}</td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-500">
                    {p.designed_by && <div>Design: {p.designed_by}</div>}
                    {p.developed_by && <div>Dev: {p.developed_by}</div>}
                    {!p.designed_by && !p.developed_by && '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs text-gray-500">
                    {p.start_date && (
                      <div>{new Date(p.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    )}
                    {p.complete_date && (
                      <div className="text-gray-600">→ {new Date(p.complete_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                    )}
                    {!p.start_date && '—'}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {p.live_link && (
                    <a
                      href={p.live_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                    >
                      <Globe className="w-3 h-3" /> Live
                    </a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ProjectActions id={p.id} name={p.name} />
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Gallery View ────────────────────────────────────────────────────────────

function GalleryView({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {projects.map(p => {
        const customerName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
        return (
          <Link key={p.id} href={`/projects/${p.id}`} className="group">
            <div className="bg-gray-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-white/20 transition-all hover:shadow-lg hover:shadow-black/20">
              {/* Thumbnail */}
              <div className="relative h-40 bg-gray-800">
                {p.hero_image ? (
                  <img
                    src={p.hero_image}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                      <Globe className="w-6 h-6 text-gray-600" />
                    </div>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <StatusBadge status={p.status} />
                </div>
              </div>

              {/* Content */}
              <div className="p-4 space-y-2">
                <h3 className="font-semibold text-white group-hover:text-green-400 transition-colors truncate">
                  {p.name}
                </h3>
                {customerName && (
                  <p className="text-xs text-gray-500 truncate">{customerName}</p>
                )}
                <div className="flex items-center justify-between">
                  {p.platform && (
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{p.platform}</span>
                  )}
                  {p.live_link && (
                    <a
                      href={p.live_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                {p.industry && p.industry.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {p.industry.slice(0, 3).map(t => (
                      <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-500 border border-green-800/30">{t}</span>
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

// ─── Kanban View ─────────────────────────────────────────────────────────────

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
            {/* Column header */}
            <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${s.bg}`}>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className={`text-sm font-semibold ${s.text}`}>{STATUS_LABELS[col]}</span>
              </div>
              <span className={`text-xs font-bold ${s.text} opacity-60`}>{items.length}</span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {items.map(p => {
                const customerName = Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name
                return (
                  <Link key={p.id} href={`/projects/${p.id}`}>
                    <div className="bg-gray-900/60 border border-white/10 rounded-lg p-3 hover:border-white/20 transition-all cursor-pointer group space-y-2">
                      {p.hero_image && (
                        <img src={p.hero_image} alt={p.name} className="w-full h-20 object-cover rounded-md" />
                      )}
                      <p className="text-sm font-medium text-white group-hover:text-green-400 transition-colors">
                        {p.name}
                      </p>
                      {customerName && <p className="text-xs text-gray-500">{customerName}</p>}
                      <div className="flex items-center justify-between">
                        {p.platform && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{p.platform}</span>
                        )}
                        {p.start_date && (
                          <span className="text-xs text-gray-600 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(p.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                      {p.industry && p.industry.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.industry.slice(0, 2).map(t => (
                            <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-green-900/20 text-green-600 border border-green-900/40">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
              {items.length === 0 && (
                <div className="border border-dashed border-white/10 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-600">No projects</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Client Component ───────────────────────────────────────────────────

type View = 'table' | 'gallery' | 'kanban'

export function ProjectsClient({ projects }: { projects: Project[] }) {
  const [view, setView] = useState<View>('gallery')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      (Array.isArray(p.customers) ? p.customers[0]?.name : p.customers?.name || '')
        .toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  const completed = projects.filter(p => p.status === 'completed').length
  const active = projects.filter(p => p.status === 'in_progress').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length} total · {active} active · {completed} completed
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-green-600 hover:bg-green-500 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <Input
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gray-900 border-white/10 text-sm"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-white/10 bg-gray-900 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="all">All Status</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="review">Review</option>
            <option value="on_hold">On Hold</option>
            <option value="completed">Completed</option>
          </select>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-gray-900 border border-white/10 rounded-lg p-1 ml-auto">
          {([
            { v: 'table', icon: List, label: 'Table' },
            { v: 'gallery', icon: LayoutGrid, label: 'Gallery' },
            { v: 'kanban', icon: Columns, label: 'Kanban' },
          ] as { v: View; icon: React.ElementType; label: string }[]).map(({ v, icon: Icon, label }) => (
            <button
              key={v}
              onClick={() => setView(v)}
              title={label}
              className={[
                'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                view === v ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300',
              ].join(' ')}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Globe className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-400">No projects found</h3>
          <p className="text-gray-600 text-sm mt-1">
            {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Create your first project to get started.'}
          </p>
          {!search && statusFilter === 'all' && (
            <Link href="/projects/new" className="inline-block mt-4">
              <Button className="bg-green-600 hover:bg-green-500 text-white gap-2">
                <Plus className="w-4 h-4" /> New Project
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <>
          {view === 'table' && <TableView projects={filtered} />}
          {view === 'gallery' && <GalleryView projects={filtered} />}
          {view === 'kanban' && <KanbanView projects={filtered} />}
        </>
      )}
    </div>
  )
}
