-- Add view_audit_logs permission
INSERT INTO permissions (name, description)
SELECT 'view_audit_logs', 'Access system audit logs and activity history'
WHERE NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'view_audit_logs');

-- Assign view_audit_logs permission to admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions WHERE name = 'view_audit_logs'
ON CONFLICT DO NOTHING;

-- Also assign to manager role (optional)
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions WHERE name = 'view_audit_logs'
ON CONFLICT DO NOTHING;
