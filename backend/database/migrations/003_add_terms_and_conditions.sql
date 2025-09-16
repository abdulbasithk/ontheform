-- Migration: Add Terms and Conditions fields to forms table
-- This migration adds fields to support Terms and Conditions agreement functionality

-- Add TnC fields to forms table
ALTER TABLE forms ADD COLUMN show_terms_checkbox BOOLEAN DEFAULT false;
ALTER TABLE forms ADD COLUMN terms_text TEXT;
ALTER TABLE forms ADD COLUMN terms_secondary_text TEXT;
ALTER TABLE forms ADD COLUMN terms_link_url TEXT;
ALTER TABLE forms ADD COLUMN terms_link_text VARCHAR(255);

-- Add comments to document the new columns
COMMENT ON COLUMN forms.show_terms_checkbox IS 'Whether to show Terms and Conditions checkbox on the form';
COMMENT ON COLUMN forms.terms_text IS 'The text content for Terms and Conditions agreement';
COMMENT ON COLUMN forms.terms_link_url IS 'Optional URL link for Terms and Conditions document';
COMMENT ON COLUMN forms.terms_link_text IS 'Display text for the Terms and Conditions link';

-- Update the schema comment to reflect the new columns
COMMENT ON TABLE forms IS 'Forms table with fields stored as JSONB. Includes Terms and Conditions settings, banner configuration, QR code settings, email notifications, and audit fields.';