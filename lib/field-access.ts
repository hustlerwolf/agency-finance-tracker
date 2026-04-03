// ─── Field-Level Access Control ───────────────────────────────────────────────
// Defines which fields can be hidden per module.
// Only "sensitive" or "optional-visibility" fields are listed here.
// Fields NOT listed here are always visible.

export interface FieldDef {
  key: string
  label: string
  group?: string // visual grouping in the admin UI
}

export const MODULE_FIELDS: Record<string, FieldDef[]> = {
  projects: [
    { key: 'customer', label: 'Client / Customer', group: 'General' },
    { key: 'brief', label: 'Project Brief', group: 'General' },
    { key: 'live_link', label: 'Live Link', group: 'Links' },
    { key: 'staging_link', label: 'Staging Link', group: 'Links' },
    { key: 'readonly_link', label: 'Read-only Link', group: 'Links' },
    { key: 'figma_sales_link', label: 'Figma Sales Link', group: 'Links' },
    { key: 'figma_dev_link', label: 'Figma Dev Link', group: 'Links' },
    { key: 'designed_by', label: 'Designed By', group: 'Team' },
    { key: 'developed_by', label: 'Developed By', group: 'Team' },
  ],
  crm: [
    { key: 'email', label: 'Email', group: 'Contact' },
    { key: 'phone', label: 'Phone', group: 'Contact' },
    { key: 'website', label: 'Website', group: 'Contact' },
    { key: 'linkedin_url', label: 'LinkedIn URL', group: 'Contact' },
    { key: 'requirements', label: 'Requirements', group: 'Details' },
    { key: 'priority', label: 'Priority', group: 'Details' },
    { key: 'next_action_date', label: 'Next Action Date', group: 'Details' },
  ],
  'knowledge-base': [
    { key: 'url', label: 'Resource URL', group: 'Content' },
    { key: 'created_by', label: 'Created By', group: 'Content' },
    { key: 'description', label: 'Description', group: 'Content' },
    { key: 'attachments', label: 'Attachments', group: 'Content' },
  ],
  team: [
    { key: 'email', label: 'Email', group: 'Personal' },
    { key: 'phone', label: 'Phone', group: 'Personal' },
    { key: 'date_of_birth', label: 'Date of Birth', group: 'Personal' },
    { key: 'monthly_ctc', label: 'Salary / CTC', group: 'Payroll' },
    { key: 'bank_account', label: 'Bank Account', group: 'Payroll' },
    { key: 'ifsc_code', label: 'IFSC Code', group: 'Payroll' },
    { key: 'pan_number', label: 'PAN Number', group: 'Compliance' },
    { key: 'aadhaar_last_four', label: 'Aadhaar', group: 'Compliance' },
    { key: 'pf_number', label: 'PF Number', group: 'Compliance' },
    { key: 'esi_number', label: 'ESI Number', group: 'Compliance' },
  ],
  tasks: [
    { key: 'description', label: 'Description', group: 'Content' },
    { key: 'due_date', label: 'Due Date', group: 'Details' },
    { key: 'priority', label: 'Priority', group: 'Details' },
    { key: 'assignees', label: 'Assignees', group: 'Team' },
    { key: 'labels', label: 'Labels', group: 'Details' },
    { key: 'checklist', label: 'Checklist', group: 'Content' },
    { key: 'project', label: 'Project Link', group: 'Details' },
  ],
  finance: [
    { key: 'amount', label: 'Amount', group: 'Financial' },
    { key: 'gst_details', label: 'GST Details', group: 'Financial' },
    { key: 'payment_method', label: 'Payment Method', group: 'Financial' },
    { key: 'bank_details', label: 'Bank Details', group: 'Financial' },
    { key: 'notes', label: 'Notes', group: 'Details' },
  ],
  reports: [
    { key: 'revenue_figures', label: 'Revenue Figures', group: 'Data' },
    { key: 'expense_figures', label: 'Expense Figures', group: 'Data' },
    { key: 'profit_figures', label: 'Profit / Loss', group: 'Data' },
  ],
}

// Modules that have configurable fields
export const MODULES_WITH_FIELDS = Object.keys(MODULE_FIELDS)

export type HiddenFieldsMap = Record<string, string[]>

// Check if a specific field is hidden for the user
export function isFieldHidden(
  hiddenFields: HiddenFieldsMap | null | undefined,
  module: string,
  fieldKey: string
): boolean {
  if (!hiddenFields) return false
  const moduleFields = hiddenFields[module]
  if (!moduleFields || !Array.isArray(moduleFields)) return false
  return moduleFields.includes(fieldKey)
}

// Get all hidden field keys for a module
export function getHiddenFields(
  hiddenFields: HiddenFieldsMap | null | undefined,
  module: string
): string[] {
  if (!hiddenFields) return []
  return hiddenFields[module] || []
}
