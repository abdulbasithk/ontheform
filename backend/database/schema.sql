-- OnTheForm Database Schema
-- Execute this SQL script in your PostgreSQL database

-- Create database (run this separately if needed)
-- CREATE DATABASE ontheform_db;

-- Connect to the database
-- \c ontheform_db;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table for authentication
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Forms table
CREATE TABLE forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    submission_count INTEGER DEFAULT 0,
    unique_constraint_type VARCHAR(50) DEFAULT 'none', -- 'none', 'ip', 'field'
    unique_constraint_field VARCHAR(255), -- field ID when type is 'field'
    banner_url TEXT, -- URL to the banner image
    show_qr_code BOOLEAN DEFAULT false, -- Show QR code after submission
    send_email_notification BOOLEAN DEFAULT false, -- Send email notification to submitter
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Form submissions table
CREATE TABLE form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    responses JSONB NOT NULL DEFAULT '{}',
    submitter_email VARCHAR(255),
    submitter_ip INET,
    user_agent TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table for JWT token management (optional)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_forms_created_by ON forms(created_by);
CREATE INDEX idx_forms_is_active ON forms(is_active);
CREATE INDEX idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX idx_form_submissions_submitted_at ON form_submissions(submitted_at);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forms_updated_at BEFORE UPDATE ON forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update form submission count
CREATE OR REPLACE FUNCTION update_form_submission_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE forms SET submission_count = submission_count + 1 WHERE id = NEW.form_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE forms SET submission_count = submission_count - 1 WHERE id = OLD.form_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ language 'plpgsql';

-- Trigger to automatically update submission count
CREATE TRIGGER update_submission_count_trigger
    AFTER INSERT OR DELETE ON form_submissions
    FOR EACH ROW EXECUTE FUNCTION update_form_submission_count();

-- Insert default admin user (password: 'admin123' - change this!)
INSERT INTO users (name, email, password_hash, role) VALUES 
('Admin User', 'admin@ontheform.com', '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QJgusgqSK', 'admin');

-- Insert sample forms (matching frontend mock data)
INSERT INTO forms (id, title, description, fields, is_active, created_by) VALUES 
('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Contact Us Form', 'Get in touch with our team', 
'[
  {"id": "name", "type": "text", "label": "Full Name", "placeholder": "Enter your full name", "required": true},
  {"id": "email", "type": "email", "label": "Email Address", "placeholder": "Enter your email", "required": true},
  {"id": "subject", "type": "select", "label": "Subject", "required": true, "options": ["General Inquiry", "Support", "Sales", "Partnership"]},
  {"id": "message", "type": "textarea", "label": "Message", "placeholder": "Tell us how we can help...", "required": true}
]', true, (SELECT id FROM users WHERE email = 'admin@ontheform.com')),

('a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789', 'Event Registration', 'Register for our upcoming conference',
'[
  {"id": "name", "type": "text", "label": "Full Name", "required": true},
  {"id": "email", "type": "email", "label": "Email", "required": true},
  {"id": "company", "type": "text", "label": "Company", "required": false},
  {"id": "attendance", "type": "radio", "label": "Attendance Type", "required": true, "options": ["In-person", "Virtual"]}
]', true, (SELECT id FROM users WHERE email = 'admin@ontheform.com')),

('b2c3d4e5-f6a7-4890-b123-c4d5e6f7a890', 'Customer Feedback', 'Help us improve our services',
'[
  {"id": "rating", "type": "select", "label": "Overall Rating", "required": true, "options": ["1 - Poor", "2 - Fair", "3 - Good", "4 - Very Good", "5 - Excellent"]},
  {"id": "feedback", "type": "textarea", "label": "Your Feedback", "placeholder": "Please share your thoughts...", "required": true}
]', true, (SELECT id FROM users WHERE email = 'admin@ontheform.com'));

-- Insert sample submissions
INSERT INTO form_submissions (id, form_id, responses, submitter_email, submitted_at) VALUES 
('d1e2f3a4-b5c6-4789-a012-b3c4d5e6f001', 'f47ac10b-58cc-4372-a567-0e02b2c3d479', 
'{
  "name": "John Doe", 
  "email": "john.doe@example.com", 
  "subject": "General Inquiry", 
  "message": "Hello, I would like to know more about your services."
}', 
'john.doe@example.com', '2024-02-10 10:30:00'),

('e2f3a4b5-c6d7-4890-b123-c4d5e6f7a002', 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
'{
  "name": "Sarah Wilson", 
  "email": "sarah.wilson@company.com", 
  "subject": "Support", 
  "message": "I am having trouble with my account settings. Can you help?"
}',
'sarah.wilson@company.com', '2024-02-10 14:15:00'),

('f3a4b5c6-d7e8-4901-c234-d5e6f7a8b003', 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
'{
  "name": "Mike Chen", 
  "email": "mike.chen@tech.io", 
  "company": "TechCorp", 
  "attendance": "In-person"
}',
'mike.chen@tech.io', '2024-02-09 16:45:00'),

('a4b5c6d7-e8f9-4012-d345-e6f7a8b9c004', 'a1b2c3d4-e5f6-4789-a012-b3c4d5e6f789',
'{
  "name": "Lisa Brown", 
  "email": "lisa.brown@startup.com", 
  "company": "InnovateCorp", 
  "attendance": "Virtual"
}',
'lisa.brown@startup.com', '2024-02-08 09:20:00'),

('b5c6d7e8-f9a0-4123-e456-f7a8b9c0d005', 'b2c3d4e5-f6a7-4890-b123-c4d5e6f7a890',
'{
  "rating": "4 - Very Good", 
  "feedback": "Great service overall, but could improve response time."
}',
'alex.smith@example.org', '2024-02-07 11:10:00');

-- Update submission counts
UPDATE forms SET submission_count = (
    SELECT COUNT(*) FROM form_submissions WHERE form_id = forms.id
);