-- Migration: Add updated_at column to form_submissions table
-- This migration adds support for tracking submission updates

-- Add updated_at column to form_submissions table
ALTER TABLE form_submissions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Set initial updated_at values to submitted_at for existing records
UPDATE form_submissions SET updated_at = submitted_at WHERE updated_at IS NULL;

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add index for better performance on updated_at queries
CREATE INDEX idx_form_submissions_updated_at ON form_submissions(updated_at);

-- Add comment to document the new column
COMMENT ON COLUMN form_submissions.updated_at IS 'Timestamp when the submission was last updated (for admin edits)';