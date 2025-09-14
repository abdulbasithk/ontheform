-- Migration: Add is_displayed column to forms table
-- This migration adds the is_displayed column to track which form should be displayed on the main page
-- Only one form can have is_displayed=true at a time

-- Add is_displayed column to forms table
ALTER TABLE forms ADD COLUMN is_displayed BOOLEAN DEFAULT false;

-- Add a unique partial index to ensure only one form can be displayed at a time
CREATE UNIQUE INDEX idx_forms_is_displayed_unique 
ON forms (is_displayed) 
WHERE is_displayed = true;

-- Add comment to document the new column
COMMENT ON COLUMN forms.is_displayed IS 'Indicates if this form should be displayed on the main page. Only one form can have this set to true at a time.';

-- Update the schema comment to reflect the new column
COMMENT ON TABLE forms IS 'Forms table with fields stored as JSONB. Each form can have: id, title, description, fields (JSONB), is_active, is_displayed (only one can be true), submission_count, unique constraints, banner, QR code settings, email notifications, and audit fields.';