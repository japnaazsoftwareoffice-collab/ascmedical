-- Add Manager Dashboard permission
INSERT INTO permissions (name, description) 
VALUES ('view_manager_dashboard', 'Access to the operational Manager Dashboard')
ON CONFLICT (name) DO NOTHING;

-- Assign to admin by default
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE name = 'view_manager_dashboard'
ON CONFLICT DO NOTHING;

-- Assign to manager by default
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE name = 'view_manager_dashboard'
ON CONFLICT DO NOTHING;
