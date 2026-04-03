import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUserAccess } from '@/lib/auth-utils'
import { isFieldHidden } from '@/lib/field-access'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, Edit, Calendar, Globe } from 'lucide-react'
import { BriefEditor } from './brief-editor'
import { ProjectForm } from '../project-form'
import { TasksClient } from '@/app/tasks/tasks-client'

const STATUS_STYLES: Record<string, string> = {
  not_started: 'bg-muted text-foreground',
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
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted text-sm text-foreground hover:text-foreground border border-border transition-colors"
    >
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
      <ExternalLink className="w-3 h-3 opacity-50" />
    </a>
  )
}

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const admin = createAdminClient()
  const { hiddenFields, isAdmin, teamMemberId, allowedModules } = await getCurrentUserAccess()
  const canManageTasks = isAdmin || (allowedModules || []).includes('tasks')
  const h = (field: string) => isFieldHidden(hiddenFields, 'projects', field)

  // For members, get their assigned task IDs in this project
  let memberTaskIds: string[] | null = null
  if (!isAdmin && teamMemberId) {
    const { data: assignments } = await admin
      .from('task_assignees')
      .select('task_id, tasks!inner(project_id)')
      .eq('team_member_id', teamMemberId)
      .eq('tasks.project_id', params.id)
    memberTaskIds = (assignments || []).map((a: { task_id: string }) => a.task_id)
  }

  let projectTaskQuery = admin
    .from('tasks')
    .select('*, task_assignees(team_member_id, team_members(id, full_name, profile_photo_url)), task_label_assignments(label_id, task_labels(id, name, color)), task_checklist_items(id, title, is_completed, sort_order), task_comments(id, content, created_at, team_member_id, source, team_members(full_name, profile_photo_url)), task_time_logs(id, started_at, stopped_at, duration_minutes, description, team_member_id, team_members(full_name)), projects(id, name)')
    .eq('project_id', params.id)
    .order('task_order')

  // Members only see their assigned tasks
  if (!isAdmin && memberTaskIds !== null) {
    if (memberTaskIds.length > 0) {
      projectTaskQuery = projectTaskQuery.in('id', memberTaskIds)
    } else {
      projectTaskQuery = projectTaskQuery.in('id', ['00000000-0000-0000-0000-000000000000']) // no results
    }
  }

  const [{ data: project }, { data: customers }, { data: config }, { data: teamMembersData }, { data: projectTasks }, { data: taskStatuses }, { data: taskLabels }] = await Promise.all([
    supabase.from('projects').select('*, customers(name)').eq('id', params.id).single(),
    supabase.from('customers').select('id, name').order('name'),
    supabase.from('project_config').select('*').order('sort_order', { ascending: true }),
    supabase.from('team_members').select('id, full_name, profile_photo_url').eq('status', 'active').order('full_name'),
    projectTaskQuery,
    admin.from('task_statuses').select('*').order('status_order'),
    admin.from('task_labels').select('*').order('name'),
  ])

  if (!project) notFound()

  const all = config || []
  const teamAsConfig = (teamMembersData || []).map(m => ({ id: m.id, type: 'team_member', name: m.full_name, sort_order: 0 }))
  const options = {
    platforms:     all.filter(c => c.type === 'platform'),
    salesChannels: all.filter(c => c.type === 'sales_channel'),
    industries:    all.filter(c => c.type === 'industry'),
    teamMembers:   teamAsConfig,
  }

  const customerName = Array.isArray(project.customers)
    ? project.customers[0]?.name
    : project.customers?.name

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            All Projects
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{project.name}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[project.status] || STATUS_STYLES.not_started}`}>
              {STATUS_LABELS[project.status] || project.status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customerName && !h('customer') && <span>Client: <span className="text-foreground">{customerName}</span></span>}
            {project.platform && <span>Platform: <span className="text-foreground">{project.platform}</span></span>}
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
            className="w-28 h-20 object-cover rounded-xl border border-border flex-shrink-0 shadow-lg"
          />
        )}
      </div>

      {/* ── Quick links ── */}
      {((!h('live_link') && project.live_link) || (!h('staging_link') && project.staging_link) || (!h('readonly_link') && project.readonly_link) || (!h('figma_sales_link') && project.figma_sales_link) || (!h('figma_dev_link') && project.figma_dev_link)) && (
        <div className="flex flex-wrap gap-2">
          {project.live_link         && !h('live_link')         && <LinkChip href={project.live_link}         label="Live Site"      icon={Globe} />}
          {project.staging_link      && !h('staging_link')      && <LinkChip href={project.staging_link}      label="Staging"        icon={Globe} />}
          {project.readonly_link     && !h('readonly_link')     && <LinkChip href={project.readonly_link}     label="Read-Only"      icon={Globe} />}
          {project.figma_sales_link  && !h('figma_sales_link')  && <LinkChip href={project.figma_sales_link}  label="Figma (Sales)" />}
          {project.figma_dev_link    && !h('figma_dev_link')    && <LinkChip href={project.figma_dev_link}    label="Figma (Dev)"   />}
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
        {project.designed_by && !h('designed_by') && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Designed by</p>
            <p className="text-sm font-medium text-foreground">{project.designed_by}</p>
          </div>
        )}
        {!h('developed_by') && (project.developers?.length > 0 || project.developed_by) && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Developers</p>
            {project.developers?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {project.developers.map((d: string) => (
                  <span key={d} className="text-xs px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-800/40">{d}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">{project.developed_by}</p>
            )}
          </div>
        )}
        {project.sales_channel && (
          <div className="bg-card border border-border rounded-lg p-3">
            <p className="text-xs text-muted-foreground mb-1">Sales channel</p>
            <p className="text-sm font-medium text-foreground">{project.sales_channel}</p>
          </div>
        )}
        <div className="bg-card border border-border rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1">Portfolio</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {project.show_publicly    && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/40">Public</span>}
            {project.design_portfolio && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-800/40">Design</span>}
            {project.dev_portfolio    && <span className="text-xs px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-800/40">Dev</span>}
            {!project.show_publicly && !project.design_portfolio && !project.dev_portfolio && (
              <span className="text-xs text-muted-foreground">Private</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Rich-text brief ── */}
      {!h('brief') && (project.brief || isAdmin) && (
        <div className="bg-card border border-border rounded-xl p-6">
          <BriefEditor projectId={project.id} initialBrief={project.brief || ''} />
        </div>
      )}

      {/* ── Project Tasks ── */}
      <div>
        <TasksClient
          tasks={projectTasks || []}
          statuses={taskStatuses || []}
          labels={taskLabels || []}
          members={(teamMembersData || []).map(m => ({ id: m.id, full_name: m.full_name, profile_photo_url: m.profile_photo_url || null }))}
          projects={[{ id: params.id, name: project.name }]}
          isAdmin={isAdmin}
          currentMemberId={teamMemberId}
          canManage={canManageTasks}
        />
      </div>

      {/* ── Collapsible edit form ── */}
      {isAdmin && (
        <details className="bg-card/50 border border-border rounded-xl overflow-hidden">
          <summary className="flex items-center gap-2 px-6 py-4 cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors select-none">
            <Edit className="w-4 h-4" />
            Edit Project Details
          </summary>
          <div className="px-6 pb-6 border-t border-border pt-6">
            <ProjectForm customers={customers || []} options={options} project={project} />
          </div>
        </details>
      )}
    </div>
  )
}
