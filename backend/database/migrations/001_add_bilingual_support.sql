-- Migration: Add bilingual field support
-- This migration adds secondary_label support to existing form fields
-- Run this after the main schema.sql

-- Since fields are stored as JSONB, we don't need to alter table structure
-- The secondary_label will be added to individual field objects in the JSONB

-- Update existing sample forms to include secondary labels (Indonesian translations)
UPDATE forms SET fields = '[
  {"id": "name", "type": "text", "label": "Full Name", "secondary_label": "Nama Lengkap", "placeholder": "Enter your full name", "required": true},
  {"id": "email", "type": "email", "label": "Email Address", "secondary_label": "Alamat Email", "placeholder": "Enter your email", "required": true},
  {"id": "subject", "type": "select", "label": "Subject", "secondary_label": "Subjek", "required": true, "options": ["General Inquiry", "Support", "Sales", "Partnership"], "allow_other": true},
  {"id": "message", "type": "textarea", "label": "Message", "secondary_label": "Pesan", "placeholder": "Tell us how we can help...", "required": true}
]' WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';

UPDATE forms SET fields = '[
  {"id": "name", "type": "text", "label": "Full Name", "secondary_label": "Nama Lengkap", "required": true},
  {"id": "email", "type": "email", "label": "Email", "secondary_label": "Email", "required": true},
  {"id": "company", "type": "text", "label": "Company", "secondary_label": "Perusahaan", "required": false},
  {"id": "attendance", "type": "radio", "label": "Attendance Type", "secondary_label": "Jenis Kehadiran", "required": true, "options": ["In-person", "Virtual"], "allow_other": false}
]' WHERE id = 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789';

UPDATE forms SET fields = '[
  {"id": "rating", "type": "select", "label": "Overall Rating", "secondary_label": "Penilaian Keseluruhan", "required": true, "options": ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"], "allow_other": false},
  {"id": "feedback", "type": "textarea", "label": "Your Feedback", "secondary_label": "Masukan Anda", "placeholder": "Please share your thoughts...", "required": true}
]' WHERE id = 'b2c3d4e5-f6a7-4890-b123-c4d5e6f7a890';

-- Add comment to document the new field structure
COMMENT ON COLUMN forms.fields IS 'JSONB array of form fields. Each field can have: id, type, label, secondary_label (optional), placeholder, required, options (for select/radio), allow_other (for select fields)';