-- Migration to add display_mode to forms table
ALTER TABLE forms ADD COLUMN IF NOT EXISTS display_mode VARCHAR(20) DEFAULT 'classic';
