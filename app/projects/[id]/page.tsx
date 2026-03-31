import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Edit, Calendar, Globe } from 'lucide-react'
import { BriefEditor } from './brief-editor'
import { ProjectForm } from '../project-form'

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-gray-700 text-gray-300',
  in_progress:  'bg-blue-900/50 text-blue-400 border border-blue-800/50',
  review:       'bg-yellow-900/50 text-yellow-400 border border-yellow-800/50',
  on_hold:      'bg-orange-900/50 text-orange-400 border border-orange-800/50',
  completed:    'bg-green-900/50 text-green-400 border border-green-800/50',
}
const STATUS_LABELS: Record<string, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  review:      'Review',
  on_hold:     'On Hold',
  completed:   'Completed',
}

function LinkChip({ href, label, icon: Icon }: { href: string; label: string; icon?: React.ElementType }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 hover:text-white border border-white/10 transition-colors"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  )
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()

  const [{ data: project }, { data: customers }, { data: config }] = await Promise.all([
    supabase.from('projects').select('*, customers(name)').eq('id', params.id).single(),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('project_config').select('*').order('sort_order', { ascending: true }),
  ])

  if (!project) notFound()

  const all = config || []
  const options = {
    platforms:     all.filter(c => c.type === 'platform'),
    salesChannels: all.filter(c => c.type === 'sales_channel'),
    industries:    all.filter(c => c.type === 'industry'),
    teamMembers:   all.filter(c => c.type === 'team_member'),
  }

  const customerName = Array.isArray(project.customers)
    ? project.customers[0]?.name
    : project.customers?.name

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Projects
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{project.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status] || STATUS_STYLES.not_started}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
            {customerName && <span>Client: <span className="text-gray-300">{customerName}</span></span>}
            {project.platform && <span>Platform: <span className="text-gray-300">{project.platform}</span></span>}
            {project.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(project.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {project.complete_date && (
                  <> → {new Date(project.complete_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>
                )}
              </span>
            )}
          </div>
        </div>

        {project.hero_image && (
          <img
            src={project.hero_image}
            alt={project.name}
            className="w-28 h-20 object-cover rounded-xl border border-white/10 flex-shrink-0 shadow-lg"
          />
        )}
      </div>

      {/* ── Quick links ── */}
      {(project.live_link || project.staging_link || project.readonly_link || project.figma_sales_link || project.figma_dev_link) && (
        <div className="flex flex-wrap gap-2">
          {project.live_link         && <LinkChip href={project.live_link}         label="Live Site"      icon={Globe} />}
          {project.staging_link      && <LinkChip href={project.staging_link}      label="Staging"        icon={Globe} />}
          {project.readonly_link     && <LinkChip href={project.readonly_link}     label="Read-Only"      icon={Globe} />}
          {project.figma_sales_link  && <LinkChip href={project.figma_sales_link}  label="Figma (Sales)" />}
          {project.figma_dev_link    && <LinkChip href={project.figma_dev_link}    label="Figma (Dev)"   />}
        </div>
      )}

      {/* ── Industry tags ── */}
      {project.industry && project.industry.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {project.industry.map((tag: string) => (
            <span key={tag} className="px-2.5 py-0.5 rounded-full bg-green-900/30 text-green-400 text-xs font-medium border border-green-800/40">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* ── Team / meta cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {project.designed_by && (
          <div className="bg-gray-900/50 border border-white/10 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Designed by</p>
            <p className="text-sm font-medium text-white">{project.designed_by}</p>
          </div>
        )}
        {project.developed_by && (
          <div className="bg-gray-900/50 border border-white/10 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Developed by</p>
            <p className="text-sm font-medium text-white">{project.developed_by}</p>
          </div>
        )}
        {project.sales_channel && (
          <div className="bg-gray-900/50 border border-white/10 rounded-lg p-3">
            <p className="text-xs text-gray-500 mb-1">Sales channel</p>
            <p className="text-sm font-medium text-white">{project.sales_channel}</p>
          </div>
        )}
        <div className="bg-gray-900/50 border border-white/10 rounded-lg p-3">
          <p className="text-xs text-gray-500 mb-1">Portfolio</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {project.show_publicly    && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/40">Public</span>}
            {project.design_portfolio && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/40">Design</span>}
            {project.dev_portfolio    && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-800/40">Dev</span>}
            {!project.show_publicly && !project.design_portfolio && !project.dev_portfolio && (
              <span className="text-xs text-gray-600">Private</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Rich-text brief ── */}
      <div className="bg-gray-900/30 border border-white/10 rounded-xl p-6">
        <BriefEditor projectId={project.id} initialBrief={project.brief || ''} />
      </div>

      {/* ── Collapsible edit form ── */}
      <details className="bg-gray-900/30 border border-white/10 rounded-xl overflow-hidden">
        <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-sm font-medium text-gray-400 hover:text-white transition-colors select-none">
          <Edit className="w-4 h-4" />
          Edit Project Details
        </summary>
        <div className="px-6 pb-6 border-t border-white/10 pt-6">
          <ProjectForm customers={customers || []} options={options} project={project} />
        </div>
      </details>
    </div>
  )
}
