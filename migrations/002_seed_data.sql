-- Seed data for development and testing
-- This migration adds sample data for testing the system

-- Insert sample tenant
INSERT INTO tenants (name, priority_alpha, priority_beta) VALUES
('Demo Tenant', 0.4, 0.6);

-- Insert sample inboxes
INSERT INTO inboxes (tenant_id, phone_number, display_name) VALUES
(1, '+1234567890', 'Customer Support'),
(1, '+1234567891', 'Sales Team'),
(1, '+1234567892', 'Technical Support');

-- Insert sample operators
INSERT INTO operators (tenant_id, email, name, role) VALUES
(1, 'operator1@example.com', 'John Doe', 'OPERATOR'),
(1, 'operator2@example.com', 'Jane Smith', 'OPERATOR'),
(1, 'manager@example.com', 'Mike Manager', 'MANAGER'),
(1, 'admin@example.com', 'Alice Admin', 'ADMIN');

-- Subscribe operators to inboxes
INSERT INTO operator_inbox_subscriptions (operator_id, inbox_id) VALUES
(1, 1), -- John to Customer Support
(1, 2), -- John to Sales Team
(2, 1), -- Jane to Customer Support
(2, 3), -- Jane to Technical Support
(3, 1), -- Manager to all inboxes
(3, 2),
(3, 3),
(4, 1), -- Admin to all inboxes
(4, 2),
(4, 3);

-- Insert operator status
INSERT INTO operator_status (operator_id, status, last_status_change_at) VALUES
(1, 'AVAILABLE', NOW()),
(2, 'AVAILABLE', NOW()),
(3, 'AVAILABLE', NOW()),
(4, 'AVAILABLE', NOW());

-- Insert sample conversations
INSERT INTO conversations (
    tenant_id, 
    inbox_id, 
    external_conversation_id, 
    customer_phone_number, 
    state, 
    message_count, 
    last_message_at
) VALUES
(1, 1, 'ext_conv_001', '+19876543210', 'QUEUED', 5, NOW() - INTERVAL '10 minutes'),
(1, 1, 'ext_conv_002', '+19876543211', 'QUEUED', 12, NOW() - INTERVAL '30 minutes'),
(1, 1, 'ext_conv_003', '+19876543212', 'QUEUED', 3, NOW() - INTERVAL '5 minutes'),
(1, 2, 'ext_conv_004', '+19876543213', 'QUEUED', 8, NOW() - INTERVAL '45 minutes'),
(1, 3, 'ext_conv_005', '+19876543214', 'ALLOCATED', 15, NOW() - INTERVAL '2 minutes'),
(1, 1, 'ext_conv_006', '+19876543215', 'RESOLVED', 20, NOW() - INTERVAL '2 hours'),
(1, 2, 'ext_conv_007', '+19876543216', 'QUEUED', 2, NOW() - INTERVAL '1 minute');

-- Update allocated conversation
UPDATE conversations 
SET assigned_operator_id = 1, updated_at = NOW()
WHERE external_conversation_id = 'ext_conv_005';

-- Update resolved conversation
UPDATE conversations 
SET assigned_operator_id = 2, resolved_at = NOW() - INTERVAL '1 hour'
WHERE external_conversation_id = 'ext_conv_006';

-- Calculate priority scores for queued conversations
UPDATE conversations 
SET priority_score = calculate_priority_score(
    message_count, 
    last_message_at, 
    (SELECT priority_alpha FROM tenants WHERE id = tenant_id),
    (SELECT priority_beta FROM tenants WHERE id = tenant_id)
)
WHERE state = 'QUEUED';

-- Insert sample labels
INSERT INTO labels (tenant_id, inbox_id, name, color, created_by) VALUES
(1, 1, 'Urgent', '#FF0000', 3),
(1, 1, 'Follow-up', '#FFA500', 3),
(1, 1, 'Bug Report', '#FF00FF', 3),
(1, 2, 'Hot Lead', '#00FF00', 3),
(1, 3, 'Technical Issue', '#0000FF', 3);

-- Attach labels to conversations
INSERT INTO conversation_labels (conversation_id, label_id) VALUES
(2, 1), -- ext_conv_002 is Urgent
(4, 4), -- ext_conv_004 is Hot Lead
(5, 5); -- ext_conv_005 is Technical Issue

COMMENT ON TABLE tenants IS 'Sample tenant added for testing';
