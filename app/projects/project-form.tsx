'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveProject } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ImageUpload } from '@/components/image-upload'
import { toast } from 'sonner'
import { X, Plus } from 'lucide-react'

const STATUSES = [
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'review',      label: 'Review' },
  { value: 'on_hold',     label: 'On Hold' },
  { value: 'completed',   label: 'Completed' },
]

interface Customer    { id: string; name: string }
interface ConfigItem  { id: string; name: string; type: string }

interface ProjectOptions {
  platforms:    ConfigItem[]
  salesChannels: ConfigItem[]
  industries:   ConfigItem[]
  teamMembers:  ConfigItem[]
}

interface Project {
  id?: string
  name?: string
  live_link?: string | null
  staging_link?: string | null
  readonly_link?: string | null
  figma_sales_link?: string | null
  figma_dev_link?: string | null
  hero_image?: string | null
  designed_by?: string | null
  developed_by?: string | null
  sales_channel?: string | null
  industry?: string[] | null
  show_publicly?: boolean
  design_portfolio?: boolean
  dev_portfolio?: boolean
  customer_id?: string | null
  status?: string
  start_date?: string | null
  complete_date?: string | null
  platform?: string | null
}

interface ProjectFormProps {
  customers: Customer[]
  options: ProjectOptions
  project?: Project
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest border-b border-white/10 pb-2">
        {title}
      </h3>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-gray-400">{label}</Label>
      {children}
    </div>
  )
}

function SelectField({ label, name, value, options, onChange, placeholder = '— Select —' }: {
  label: string
  name: string
  value: string
  options: string[]
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <select
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  )
}

function LinkField({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string | null }) {
  return (
    <Field label={label}>
      <Input
        name={name}
        defaultValue={defaultValue || ''}
        placeholder="https://"
        className="bg-gray-800 border-white/10 text-sm"
      />
    </Field>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function ProjectForm({ customers, options, project }: ProjectFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [loading, setLoading]           = useState(false)
  const [status, setStatus]             = useState(project?.status || 'not_started')
  const [platform, setPlatform]         = useState(project?.platform || '')
  const [salesChannel, setSalesChannel] = useState(project?.sales_channel || '')
  const [designedBy, setDesignedBy]     = useState(project?.designed_by || '')
  const [developedBy, setDevelopedBy]   = useState(project?.developed_by || '')
  const [customerId, setCustomerId]     = useState(project?.customer_id || '')
  const [industry, setIndustry]         = useState<string[]>(project?.industry || [])
  const [showPublicly, setShowPublicly] = useState(project?.show_publicly ?? false)
  const [designPortfolio, setDesignPortfolio] = useState(project?.design_portfolio ?? false)
  const [devPortfolio, setDevPortfolio] = useState(project?.dev_portfolio ?? false)
  const [heroImage, setHeroImage]       = useState<string | null>(project?.hero_image || null)

  const platformNames     = options.platforms.map(p => p.name)
  const salesChannelNames = options.salesChannels.map(s => s.name)
  const industryNames     = options.industries.map(i => i.name)
  const teamMemberNames   = options.teamMembers.map(t => t.name)

  function addIndustry(tag: string) {
    if (tag && !industry.includes(tag)) setIndustry(prev => [...prev, tag])
  }
  function removeIndustry(tag: string) {
    setIndustry(prev => prev.filter(t => t !== tag))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const fd = new FormData(formRef.current!)

    fd.set('show_publicly',    showPublicly    ? 'true' : 'false')
    fd.set('design_portfolio', designPortfolio ? 'true' : 'false')
    fd.set('dev_portfolio',    devPortfolio    ? 'true' : 'false')
    fd.set('hero_image',       heroImage || '')
    fd.delete('industry')
    industry.forEach(t => fd.append('industry', t))

    const result = await saveProject(fd)
    if (result.success) {
      toast.success(project?.id ? 'Project updated!' : 'Project created!')
      router.push('/projects')
      router.refresh()
    } else {
      toast.error('Failed: ' + result.error)
    }
    setLoading(false)
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-8">
      {project?.id && <input type="hidden" name="id" value={project.id} />}

      {/* ── Basic Info ── */}
      <FormSection title="Basic Info">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Field label="Project Name *">
              <Input
                name="name"
                defaultValue={project?.name || ''}
                required
                placeholder="My Awesome Project"
                className="bg-gray-800 border-white/10 text-base font-medium"
              />
            </Field>
          </div>

          <Field label="Status">
            <select
              name="status"
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              {STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Client">
            <select
              name="customer_id"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">— Select Client —</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <SelectField label="Platform" name="platform" value={platform} options={platformNames} onChange={setPlatform} />
          <SelectField label="Sales Channel" name="sales_channel" value={salesChannel} options={salesChannelNames} onChange={setSalesChannel} />

          <Field label="Start Date">
            <Input type="date" name="start_date" defaultValue={project?.start_date || ''} className="bg-gray-800 border-white/10 text-sm" />
          </Field>
          <Field label="Completion Date">
            <Input type="date" name="complete_date" defaultValue={project?.complete_date || ''} className="bg-gray-800 border-white/10 text-sm" />
          </Field>
        </div>
      </FormSection>

      {/* ── Thumbnail ── */}
      <FormSection title="Thumbnail Image">
        <ImageUpload value={heroImage} onChange={setHeroImage} />
      </FormSection>

      {/* ── Team ── */}
      <FormSection title="Team">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Designed By">
            <select
              name="designed_by"
              value={designedBy}
              onChange={e => setDesignedBy(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">— Select —</option>
              {teamMemberNames.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <Field label="Developed By">
            <select
              name="developed_by"
              value={developedBy}
              onChange={e => setDevelopedBy(e.target.value)}
              className="w-full h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">— Select —</option>
              {teamMemberNames.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
        </div>
        {teamMemberNames.length === 0 && (
          <p className="text-xs text-gray-600 mt-1">
            No team members yet.{' '}
            <a href="/projects/settings" className="text-green-500 hover:text-green-400">Add them in Project Settings →</a>
          </p>
        )}
      </FormSection>

      {/* ── Links ── */}
      <FormSection title="Links">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LinkField label="Live Link" name="live_link" defaultValue={project?.live_link} />
          <LinkField label="Staging Link" name="staging_link" defaultValue={project?.staging_link} />
          <LinkField label="Read-Only Link" name="readonly_link" defaultValue={project?.readonly_link} />
          <LinkField label="Figma (Sales)" name="figma_sales_link" defaultValue={project?.figma_sales_link} />
          <LinkField label="Figma (Dev)" name="figma_dev_link" defaultValue={project?.figma_dev_link} />
        </div>
      </FormSection>

      {/* ── Industry Tags ── */}
      <FormSection title="Industry">
        <div className="space-y-2">
          {industry.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {industry.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-900/40 text-green-400 text-xs font-medium border border-green-800/50"
                >
                  {tag}
                  <button type="button" onClick={() => removeIndustry(tag)} className="hover:text-green-200">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            onChange={e => { addIndustry(e.target.value); e.target.value = '' }}
            defaultValue=""
            className="h-9 rounded-md border border-white/10 bg-gray-800 text-sm text-white px-3 focus:outline-none focus:ring-1 focus:ring-green-500"
          >
            <option value="" disabled>+ Add industry tag</option>
            {industryNames.filter(n => !industry.includes(n)).map(n => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          {industryNames.length === 0 && (
            <p className="text-xs text-gray-600">
              No industries yet.{' '}
              <a href="/projects/settings" className="text-green-500 hover:text-green-400">Add them in Project Settings →</a>
            </p>
          )}
        </div>
      </FormSection>

      {/* ── Portfolio & Visibility ── */}
      <FormSection title="Portfolio & Visibility">
        <div className="space-y-3">
          {([
            { label: 'Show Publicly',           state: showPublicly,    setState: setShowPublicly,    desc: 'Include in the public-facing website' },
            { label: 'Show in Design Portfolio', state: designPortfolio, setState: setDesignPortfolio, desc: 'Feature in design showcase' },
            { label: 'Show in Dev Portfolio',    state: devPortfolio,    setState: setDevPortfolio,    desc: 'Feature in development showcase' },
          ] as { label: string; state: boolean; setState: (v: (p: boolean) => boolean) => void; desc: string }[]).map(({ label, state, setState, desc }) => (
            <label key={label} className="flex items-start gap-3 cursor-pointer group" onClick={() => setState(p => !p)}>
              <div className={[
                'mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-colors',
                state ? 'bg-green-600 border-green-600' : 'bg-gray-800 border-white/20 group-hover:border-white/40',
              ].join(' ')}>
                {state && (
                  <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm text-white font-medium">{label}</p>
                <p className="text-xs text-gray-500">{desc}</p>
              </div>
            </label>
          ))}
        </div>
      </FormSection>

      {/* ── Actions ── */}
      <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
        <Button type="button" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-500 text-white min-w-[120px]">
          {loading ? 'Saving…' : (project?.id ? 'Save Changes' : 'Create Project')}
        </Button>
      </div>
    </form>
  )
}
