-- Add module_permissions (create/edit/delete per module) to access_presets
ALTER TABLE access_presets
  ADD COLUMN IF NOT EXISTS module_permissions jsonb DEFAULT '{}'::jsonb;
