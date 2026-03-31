-- ─────────────────────────────────────────────────────────────────────────────
-- Projects table migration
-- Run this in your Supabase SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists projects (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- Basic info
  name            text not null,
  status          text not null default 'not_started'
                    check (status in ('not_started','in_progress','review','on_hold','completed')),
  platform        text,
  sales_channel   text,

  -- Dates
  start_date      date,
  complete_date   date,

  -- Team
  designed_by     text,
  developed_by    text,

  -- Client (FK to existing customers table)
  customer_id     uuid references customers(id) on delete set null,

  -- Links
  live_link       text,
  staging_link    text,
  readonly_link   text,
  figma_sales_link text,
  figma_dev_link  text,
  hero_image      text,

  -- Tags
  industry        text[] default '{}',

  -- Visibility flags
  show_publicly   boolean not null default false,
  design_portfolio boolean not null default false,
  dev_portfolio   boolean not null default false,

  -- Rich text brief (HTML from Tiptap)
  brief           text
);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists projects_updated_at on projects;
create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

-- Enable Row Level Security
alter table projects enable row level security;

-- Allow authenticated users full access (adjust as needed)
create policy "Authenticated users can do everything on projects"
  on projects for all
  to authenticated
  using (true)
  with check (true);

-- Index for common queries
create index if not exists projects_status_idx on projects(status);
create index if not exists projects_customer_idx on projects(customer_id);
