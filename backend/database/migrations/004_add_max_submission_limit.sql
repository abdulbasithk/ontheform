-- Migration: Add max submission limit to forms
-- This migration adds support for limiting total submissions per form.
-- Value 0 means unlimited submissions.

ALTER TABLE forms
ADD COLUMN IF NOT EXISTS max_submission_count INTEGER DEFAULT 0;

-- Ensure invalid negative values are not stored.
ALTER TABLE forms
DROP CONSTRAINT IF EXISTS check_forms_max_submission_count;

ALTER TABLE forms
ADD CONSTRAINT check_forms_max_submission_count
CHECK (max_submission_count >= 0);

COMMENT ON COLUMN forms.max_submission_count IS 'Maximum number of allowed submissions for this form. 0 means unlimited.';
