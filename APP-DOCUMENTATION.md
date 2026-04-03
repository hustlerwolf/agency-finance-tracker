# Onlee Agency Finance Tracker

Internal management tool for creative agencies — finance, CRM, projects, knowledge base, and HRMS in one place.

## Tech Stack

- **Framework:** Next.js 14+ (App Router, TypeScript)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **UI:** shadcn/ui + Tailwind CSS + next-themes (dark/light)
- **Rich Text:** Tiptap (Notion-like slash commands + bubble menu)

## Modules

### Dashboard (`/dashboard`)
Overview page with key metrics.

### CRM (`/crm`)
- **Leads** — Kanban board + table view, drag-and-drop stage management, rich-text notes, activity timeline
- **Companies** (`/customers`) — Company directory with website, industry, notes; linked contacts
- **Contacts** (`/customers/contacts`) — Contact management linked to companies (name, email, phone, designation, LinkedIn)
- Leads can be linked to companies and contacts

### Projects (`/projects`)
- Table, Gallery, and Kanban views
- Advanced filter builder with sortable columns and column visibility
- Project brief with Notion-like rich text editor
- Project settings for platforms, sales channels, industries, team members
- Image uploads via Supabase Storage (`project-assets` bucket)

### Knowledge Base (`/knowledge-base`)
- Gallery and table views for team resources
- Fields: Name, Category, Tags, URL, Description (rich text), Created By, Thumbnail
- Settings page for managing categories and tags
- File attachments via Supabase Storage (`kb-assets` bucket)

### Team / HRMS (`/team`)
- **Directory** (`/team`) — Card and table views, full CRUD with payroll/compliance fields
  - Basic info, role/department, employment type, reporting hierarchy
  - Payroll: salary type, monthly CTC, payment mode, bank details, PAN, Aadhaar, PF, ESI
- **Leaves** (`/team/leaves`) — Apply leave (PL/LWP), half-day support, admin approve/reject with notes, auto PL balance deduction
  - Policy: 12 PL/year, 1/month accrual, max 3/month, no carry forward
- **Attendance** (`/team/attendance`) — Daily check-in/out, status tracking (present/absent/half-day/on-leave/holiday/weekend), daily work updates
- **Payroll** (`/team/payroll`) — Monthly payroll runs, auto-generate salary slips for active employees, appreciation bonus, LWP deductions, finalize and mark paid workflow
- **Settings** (`/team/settings`) — Manage departments

### Finance
- **Invoices** (`/invoices`) — Invoice management
- **Income** (`/income`) — Income tracking
- **Expenses** (`/expenses`) — Expense tracking
- **Categories** (`/categories`) — Expense categorization
- **Vendors** (`/vendors`) — Vendor management

### Reports
- Expense Breakdown (`/reports`)
- Revenue & Growth (`/reports/revenue`)
- Profit & Loss (`/reports/profit`)
- Forex Analysis (`/reports/forex`)

### Settings (`/settings`)
Application configuration.

## Database Tables

| Table | Purpose |
|---|---|
| `customers` | Companies (CRM) |
| `contacts` | Contacts linked to companies |
| `leads` | CRM leads with stage/source/company/contact |
| `lead_stages` / `lead_sources` | CRM config |
| `projects` | Project tracking |
| `project_config` | Platforms, channels, industries, team members |
| `knowledge_base` | KB entries |
| `kb_config` | KB categories and tags |
| `team_members` | Employees with payroll/compliance data |
| `departments` | Company departments |
| `leave_requests` | Leave applications |
| `attendance` | Daily attendance + work updates |
| `payroll_runs` | Monthly payroll runs |
| `payroll_slips` | Per-employee salary slips |
| Finance tables | invoices, income, expenses, categories, vendors |

## SQL Migrations

Run these in order in Supabase SQL Editor:
1. `supabase-customers-refactor.sql` — Companies + Contacts
2. `supabase-kb-migration.sql` — Knowledge Base
3. `supabase-hrms-migration.sql` — Team, Leaves, Attendance, Payroll

## Storage Buckets

| Bucket | Access | Purpose |
|---|---|---|
| `project-assets` | Public read, auth write | Project images |
| `kb-assets` | Public read, auth write | KB thumbnails + attachments |
| `team-photos` | Public read, auth write | Team member profile photos |
