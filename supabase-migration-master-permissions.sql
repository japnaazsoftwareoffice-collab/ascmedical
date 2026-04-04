-- Master Permission Update
-- 1. Ensure all sidebar-related permissions exist
INSERT INTO permissions (name, description) VALUES
('view_manager_dashboard', 'Access to the operational Manager Dashboard'),
('view_surgeon_dashboard', 'Access to the performance-focused Surgeon Dashboard'),
('view_cost_analysis', 'Access detailed financial cost analysis and profit trends'),
('use_ai_analyst', 'Use the AI-powered schedule optimization and analytics'),
('manage_cancellations', 'Manage surgery cancellations and rescheduling'),
('view_audit_logs', 'Access system audit logs and activity history'),
('manage_chatbot', 'Can manage chatbot instructions and question list')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 2. Assign all permissions to ADMIN
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions
ON CONFLICT DO NOTHING;

-- 3. Assign key permissions to MANAGER
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name IN (
    'view_manager_dashboard',
    'view_surgeon_dashboard',
    'view_cost_analysis',
    'use_ai_analyst',
    'manage_cancellations',
    'view_audit_logs',
    'view_surgery_schedule',
    'manage_patients',
    'view_claims',
    'manage_surgeries'
)
ON CONFLICT DO NOTHING;

-- 4. Check for any other used permissions and ensure they are assigned
-- (Standard ones from schema are already handled)
