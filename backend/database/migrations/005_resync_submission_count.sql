-- Migration: Resync form submission_count values with actual submissions
-- This corrects any historical drift caused by multiple count update paths.

UPDATE forms
SET submission_count = (
  SELECT COUNT(*)::int
  FROM form_submissions fs
  WHERE fs.form_id = forms.id
);
