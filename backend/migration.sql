-- Migration to integrate PDF viewer submissions with assignments and submissions tables
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS module_item_id uuid REFERENCES module_items(id) ON DELETE SET NULL;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS assigned_pages text;

-- Add is_editable flag to module_items
ALTER TABLE module_items ADD COLUMN IF NOT EXISTS is_editable boolean DEFAULT false;

