-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id BIGSERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create role_permissions table to map roles to permissions
CREATE TABLE IF NOT EXISTS role_permissions (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL, -- 'admin', 'manager', 'surgeon', 'patient'
    permission_id BIGINT REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, permission_id)
);

-- Insert common permissions
INSERT INTO permissions (name, description) VALUES
('view_financial_dashboard', 'View financial stats, revenue, and profit charts'),
('view_surgery_schedule', 'View the master surgery schedule calendar'),
('view_work_queues', 'View administrative work queues'),
('manage_users', 'Add, edit, or delete system users'),
('manage_surgeons', 'Add or edit surgeon profiles'),
('manage_patients', 'Access and edit master patient records'),
('manage_cpt_codes', 'View and edit CPT price list and categories'),
('edit_surgery_details', 'Modify surgery specific data like implants and products'),
('view_claims', 'Access insurance claims management'),
('manage_surgeries', 'Access Surgery Log and OR scheduling'),
('view_or_blocks', 'View and manage OR block schedule'),
('manage_staff', 'Manage nurses and staff profiles'),
('manage_permissions', 'Manage role-based permissions'),
('view_analytics', 'View OR utilization and efficiency analytics'),
('view_scorecards', 'View surgeon performance scorecards'),
('use_auto_updater', 'Use CPT price auto-updater'),
('manage_settings', 'Modify system-wide settings');

-- Map permissions to roles
-- ADMIN Permissions (Everything)
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- MANAGER Permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name IN (
    'view_surgery_schedule', 
    'view_work_queues', 
    'edit_surgery_details', 
    'manage_patients',
    'view_claims'
);

-- SURGEON Permissions
INSERT INTO role_permissions (role, permission_id)
SELECT 'surgeon', id FROM permissions 
WHERE name IN (
    'view_surgery_schedule'
);
