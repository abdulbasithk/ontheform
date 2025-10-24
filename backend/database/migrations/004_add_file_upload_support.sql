-- Migration: Add file upload support
-- This migration prepares the database for file uploads in form submissions
-- The existing JSONB columns can already store file metadata, so this is primarily
-- for documentation and any future enhancements

-- No schema changes needed as the current structure supports storing file information in JSONB:
-- Example structure in responses for a file field:
-- {
--   "fieldId": {
--     "filename": "myfile.jpg",
--     "path": "/api/submissions/uploads/submissions/myfile-timestamp.jpg",
--     "mimetype": "image/jpeg",
--     "size": 51234
--   }
-- }

-- Add index on responses for better query performance
CREATE INDEX IF NOT EXISTS idx_form_submissions_responses ON form_submissions USING GIN(responses);

-- Add comments documenting file storage
COMMENT ON TABLE form_submissions IS 'Stores form submissions including file upload metadata in JSONB responses';
COMMENT ON COLUMN form_submissions.responses IS 'JSONB column storing form field responses, including file metadata with filename, path, mimetype, and size';
