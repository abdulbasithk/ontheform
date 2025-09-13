-- Migration: Add proper user role management
-- This migration updates the user role system to support super_admin and admin roles

-- Update the role column to use proper enum-like values
-- Current roles: 'admin' -> change to support 'super_admin' and 'admin'

-- Update existing admin user to be super_admin
UPDATE users SET role = 'super_admin' WHERE email = 'admin@ontheform.com';

-- Add constraint to ensure only valid roles are used
ALTER TABLE users ADD CONSTRAINT check_user_role 
    CHECK (role IN ('super_admin', 'admin'));

-- Add indexes for better performance on role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_role_active ON users(role, is_active);

-- Add created_by tracking to users table for audit purposes
ALTER TABLE users ADD COLUMN created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Update the existing admin user to be self-created
UPDATE users SET created_by = id WHERE email = 'admin@ontheform.com';

-- Add comment to document the role system
COMMENT ON COLUMN users.role IS 'User role: super_admin (can manage users and all forms), admin (can manage only own forms)';
COMMENT ON COLUMN users.created_by IS 'ID of the user who created this user account (for audit trail)';

-- Create a view for user management (excluding sensitive data)
CREATE VIEW user_management_view AS
SELECT 
    u.id,
    u.name,
    u.email,
    u.role,
    u.is_active,
    u.created_at,
    u.updated_at,
    creator.name as created_by_name,
    creator.email as created_by_email,
    (
        SELECT COUNT(*) 
        FROM forms f 
        WHERE f.created_by = u.id AND f.is_active = true
    ) as active_forms_count,
    (
        SELECT COUNT(*) 
        FROM form_submissions fs 
        JOIN forms f ON fs.form_id = f.id 
        WHERE f.created_by = u.id
    ) as total_submissions_count
FROM users u
LEFT JOIN users creator ON u.created_by = creator.id;

-- Grant appropriate permissions
GRANT SELECT ON user_management_view TO PUBLIC;