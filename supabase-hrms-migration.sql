-- ═══════════════════════════════════════════════════════════════════════════════
-- HRMS Module Migration
-- Team Directory, Leave Management, Attendance, Payroll
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── Departments ──────────────────────────────────────────────────────────────
create table if not exists public.departments (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  created_at timestamptz default now()
);

-- Seed default departments
insert into public.departments (name) values
  ('Design'),
  ('Development'),
  ('Marketing'),
  ('Operations'),
  ('Management')
on conflict (name) do nothing;

-- ─── Team Members (Employees) ─────────────────────────────────────────────────
create table if not exists public.team_members (
  id uuid default gen_random_uuid() primary key,
  -- Auth link (optional, for members who can log in)
  auth_user_id uuid references auth.users(id) on delete set null,
  -- Basic info
  full_name text not null,
  email text,
  phone text,
  date_of_birth date,
  profile_photo_url text,
  -- Role & Department
  designation text,
  department_id uuid references public.departments(id) on delete set null,
  employment_type text default 'full_time' check (employment_type in ('full_time', 'part_time', 'freelancer', 'intern')),
  status text default 'active' check (status in ('active', 'inactive', 'on_leave')),
  date_of_joining date,
  reporting_to uuid references public.team_members(id) on delete set null,
  -- Payroll
  salary_type text default 'monthly' check (salary_type in ('monthly', 'hourly')),
  monthly_ctc numeric(12,2) default 0,
  payment_mode text default 'bank_transfer' check (payment_mode in ('bank_transfer', 'upi', 'cash', 'cheque')),
  bank_account text,
  ifsc_code text,
  pan_number text,
  -- Compliance
  aadhaar_last_four text,
  pf_number text,
  esi_number text,
  -- Leave balances (12 PL per year, 1/month accrual, no carry forward)
  paid_leaves_balance numeric(4,1) default 12,
  -- Meta
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Leave Requests ───────────────────────────────────────────────────────────
create table if not exists public.leave_requests (
  id uuid default gen_random_uuid() primary key,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  leave_type text not null default 'paid' check (leave_type in ('paid', 'lwp')),
  start_date date not null,
  end_date date not null,
  is_half_day boolean default false,
  half_day_period text check (half_day_period in ('first_half', 'second_half')),
  reason text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  approved_by uuid references public.team_members(id) on delete set null,
  admin_note text,
  total_days numeric(4,1) not null default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ─── Attendance ───────────────────────────────────────────────────────────────
create table if not exists public.attendance (
  id uuid default gen_random_uuid() primary key,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  date date not null default current_date,
  check_in timestamptz,
  check_out timestamptz,
  status text default 'present' check (status in ('present', 'absent', 'half_day', 'on_leave', 'holiday', 'weekend')),
  daily_update text, -- what they did throughout the day
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(team_member_id, date)
);

-- ─── Payroll Runs ─────────────────────────────────────────────────────────────
create table if not exists public.payroll_runs (
  id uuid default gen_random_uuid() primary key,
  month int not null check (month between 1 and 12),
  year int not null,
  status text default 'draft' check (status in ('draft', 'finalized', 'paid')),
  generated_by uuid references public.team_members(id) on delete set null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(month, year)
);

-- ─── Payroll Slips (per employee per run) ─────────────────────────────────────
create table if not exists public.payroll_slips (
  id uuid default gen_random_uuid() primary key,
  payroll_run_id uuid not null references public.payroll_runs(id) on delete cascade,
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  base_salary numeric(12,2) default 0,
  working_days int default 0,
  days_present int default 0,
  leaves_taken numeric(4,1) default 0,
  lwp_days numeric(4,1) default 0,
  lwp_deduction numeric(12,2) default 0,
  appreciation_bonus numeric(12,2) default 0,
  other_deductions numeric(12,2) default 0,
  deduction_note text,
  net_payable numeric(12,2) default 0,
  status text default 'draft' check (status in ('draft', 'finalized', 'paid')),
  paid_on date,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(payroll_run_id, team_member_id)
);

-- ─── Storage bucket for profile photos ────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('team-photos', 'team-photos', true)
on conflict (id) do nothing;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
alter table public.departments enable row level security;
create policy "Allow all for authenticated" on public.departments for all using (auth.role() = 'authenticated');

alter table public.team_members enable row level security;
create policy "Allow all for authenticated" on public.team_members for all using (auth.role() = 'authenticated');

alter table public.leave_requests enable row level security;
create policy "Allow all for authenticated" on public.leave_requests for all using (auth.role() = 'authenticated');

alter table public.attendance enable row level security;
create policy "Allow all for authenticated" on public.attendance for all using (auth.role() = 'authenticated');

alter table public.payroll_runs enable row level security;
create policy "Allow all for authenticated" on public.payroll_runs for all using (auth.role() = 'authenticated');

alter table public.payroll_slips enable row level security;
create policy "Allow all for authenticated" on public.payroll_slips for all using (auth.role() = 'authenticated');

-- Storage policies for team-photos
create policy "Allow authenticated uploads to team-photos"
on storage.objects for insert
to authenticated
with check (bucket_id = 'team-photos');

create policy "Allow public read of team-photos"
on storage.objects for select
using (bucket_id = 'team-photos');

create policy "Allow authenticated delete of team-photos"
on storage.objects for delete
to authenticated
using (bucket_id = 'team-photos');
