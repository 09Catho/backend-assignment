-- Initial Schema for Conversation Allocation System
-- This migration creates all necessary tables, enums, and indexes

-- Create custom enum types
CREATE TYPE operator_role AS ENUM ('OPERATOR', 'MANAGER', 'ADMIN');
CREATE TYPE conversation_state AS ENUM ('QUEUED', 'ALLOCATED', 'RESOLVED');
CREATE TYPE operator_status_type AS ENUM ('AVAILABLE', 'OFFLINE');
CREATE TYPE grace_reason AS ENUM ('OFFLINE', 'MANUAL');

-- Tenants table (assumed to exist, but creating for completeness)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    priority_alpha FLOAT DEFAULT 0.4,
    priority_beta FLOAT DEFAULT 0.6,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inboxes table
CREATE TABLE inboxes (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    phone_number VARCHAR(20) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, phone_number)
);

-- Operators table
CREATE TABLE operators (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role operator_role NOT NULL DEFAULT 'OPERATOR',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);

-- Operator Inbox Subscriptions table
CREATE TABLE operator_inbox_subscriptions (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(operator_id, inbox_id)
);

-- Conversations table
CREATE TABLE conversations (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    external_conversation_id VARCHAR(255) NOT NULL,
    customer_phone_number VARCHAR(20) NOT NULL,
    state conversation_state NOT NULL DEFAULT 'QUEUED',
    assigned_operator_id INTEGER REFERENCES operators(id) ON DELETE SET NULL,
    last_message_at TIMESTAMP NOT NULL DEFAULT NOW(),
    message_count INTEGER DEFAULT 0,
    priority_score FLOAT DEFAULT 0.0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    UNIQUE(tenant_id, external_conversation_id)
);

-- Labels table
CREATE TABLE labels (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    inbox_id INTEGER NOT NULL REFERENCES inboxes(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7),
    created_by INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(inbox_id, name)
);

-- Conversation Labels junction table
CREATE TABLE conversation_labels (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    label_id INTEGER NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id, label_id)
);

-- Operator Status table
CREATE TABLE operator_status (
    id SERIAL PRIMARY KEY,
    operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    status operator_status_type NOT NULL DEFAULT 'OFFLINE',
    last_status_change_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(operator_id)
);

-- Grace Period Assignments table
CREATE TABLE grace_period_assignments (
    id SERIAL PRIMARY KEY,
    conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    operator_id INTEGER NOT NULL REFERENCES operators(id) ON DELETE CASCADE,
    expires_at TIMESTAMP NOT NULL,
    reason grace_reason NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(conversation_id)
);

-- Create indexes for performance optimization
-- Conversations indexes
CREATE INDEX idx_conversations_state_tenant ON conversations(state, tenant_id);
CREATE INDEX idx_conversations_state_operator ON conversations(state, assigned_operator_id);
CREATE INDEX idx_conversations_inbox_state ON conversations(inbox_id, state);
CREATE INDEX idx_conversations_priority ON conversations(priority_score DESC, last_message_at DESC);
CREATE INDEX idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX idx_conversations_customer_phone ON conversations(customer_phone_number);

-- Operator subscriptions indexes
CREATE INDEX idx_operator_subscriptions_operator ON operator_inbox_subscriptions(operator_id);
CREATE INDEX idx_operator_subscriptions_inbox ON operator_inbox_subscriptions(inbox_id);

-- Labels indexes
CREATE INDEX idx_labels_inbox ON labels(inbox_id);

-- Grace period indexes
CREATE INDEX idx_grace_period_expires ON grace_period_assignments(expires_at);
CREATE INDEX idx_grace_period_operator ON grace_period_assignments(operator_id);

-- Operator status index
CREATE INDEX idx_operator_status_operator ON operator_status(operator_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inboxes_updated_at BEFORE UPDATE ON inboxes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operators_updated_at BEFORE UPDATE ON operators
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
    p_message_count INTEGER,
    p_last_message_at TIMESTAMP,
    p_alpha FLOAT,
    p_beta FLOAT
)
RETURNS FLOAT AS $$
DECLARE
    v_normalized_messages FLOAT;
    v_normalized_delay FLOAT;
    v_delay_minutes FLOAT;
    v_max_message_count INTEGER := 100;
    v_max_delay_minutes INTEGER := 1440; -- 24 hours
BEGIN
    -- Normalize message count (0 to 1)
    v_normalized_messages := LEAST(p_message_count::FLOAT / v_max_message_count, 1.0);
    
    -- Calculate delay in minutes
    v_delay_minutes := EXTRACT(EPOCH FROM (NOW() - p_last_message_at)) / 60;
    
    -- Normalize delay (0 to 1)
    v_normalized_delay := LEAST(v_delay_minutes / v_max_delay_minutes, 1.0);
    
    -- Calculate weighted score
    RETURN (p_alpha * v_normalized_messages) + (p_beta * v_normalized_delay);
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE inboxes IS 'Stores inbox information for each tenant';
COMMENT ON TABLE operators IS 'Stores operator information and their roles';
COMMENT ON TABLE conversations IS 'Stores conversation metadata and allocation state';
COMMENT ON TABLE labels IS 'Stores labels for organizing conversations';
COMMENT ON TABLE grace_period_assignments IS 'Tracks conversations in grace period when operator goes offline';
