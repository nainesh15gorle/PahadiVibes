-- pahadi-ai-schema.sql
-- DDL Schema for Pahadi AI: Autonomous Revenue Recovery Agent (Event & Case Layer)
-- Run this script in your Supabase SQL Editor.

-- 1. Create the revenue_events table
-- Captures raw immutable commerce and payment events
CREATE TABLE IF NOT EXISTS public.revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE, -- Idempotency key (e.g. evt_ord_xxx_created, rzp_pay_xxx_failed)
    event_type VARCHAR(100) NOT NULL,      -- 'ORDER_CREATED' | 'PAYMENT_PENDING' | 'PAYMENT_SUCCESS' | 'PAYMENT_FAILED' | 'MODAL_DISMISSED' | 'ORDER_ABANDONED' | 'REFUND_PROCESSED'
    order_id VARCHAR(255),                 -- Internal order ID
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    customer_id VARCHAR(255),              -- User ID or anonymous session identifier
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'RECORDED', -- 'RECORDED' | 'PROCESSED' | 'FAILED'
    failure_reason TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

-- 2. Create the recovery_cases table
-- Tracks active revenue recovery lifecycles for abandoned checkouts and failed payments
CREATE TABLE IF NOT EXISTS public.recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(255) NOT NULL UNIQUE,  -- Human-friendly Case ID (e.g. rcase_xxx)
    order_id VARCHAR(255) NOT NULL UNIQUE, -- 1-to-1 relationship with internal order
    razorpay_order_id VARCHAR(255),
    customer_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    stage VARCHAR(50) NOT NULL DEFAULT 'CHECKOUT_INITIATED', -- 'CHECKOUT_INITIATED' | 'GATEWAY_PENDING' | 'PAYMENT_FAILED' | 'ABANDONED'
    recovery_status VARCHAR(50) NOT NULL DEFAULT 'OPEN',     -- 'OPEN' | 'IN_RECOVERY' | 'RECOVERED' | 'LOST' | 'DISMISSED'
    failure_reason TEXT,
    last_event_id VARCHAR(255),
    cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recovered_at TIMESTAMPTZ
);

-- 3. Create the agent_actions table
-- Immutable log of actions recorded, scheduled, or executed for each recovery case
CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.recovery_cases(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL, -- 'EVENT_CAPTURED' | 'PAYMENT_FAILURE_CAPTURED' | 'PAYMENT_COMPLETED' | 'CASE_INITIALIZED' | 'MANUAL_NOTE'
    channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM', -- 'SYSTEM' | 'WHATSAPP' | 'SMS' | 'EMAIL' | 'ADMIN'
    status VARCHAR(50) NOT NULL DEFAULT 'RECORDED', -- 'RECORDED' | 'QUEUED' | 'EXECUTED' | 'FAILED' | 'CANCELLED'
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasoning TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Create Indexes for High Performance Querying
CREATE INDEX IF NOT EXISTS idx_revenue_events_event_id ON public.revenue_events(event_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_order_id ON public.revenue_events(order_id);
CREATE INDEX IF NOT EXISTS idx_revenue_events_event_type ON public.revenue_events(event_type);
CREATE INDEX IF NOT EXISTS idx_revenue_events_created_at ON public.revenue_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_recovery_cases_order_id ON public.recovery_cases(order_id);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_status ON public.recovery_cases(recovery_status);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_created_at ON public.recovery_cases(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_customer_email ON public.recovery_cases(customer_email);
CREATE INDEX IF NOT EXISTS idx_recovery_cases_customer_phone ON public.recovery_cases(customer_phone);

CREATE INDEX IF NOT EXISTS idx_agent_actions_case_id ON public.agent_actions(case_id);
CREATE INDEX IF NOT EXISTS idx_agent_actions_created_at ON public.agent_actions(created_at DESC);

-- 5. Row Level Security (RLS) Setup
ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY;

-- Allow authenticated / admin full access
DROP POLICY IF EXISTS "Allow admin full access to revenue_events" ON public.revenue_events;
CREATE POLICY "Allow admin full access to revenue_events" ON public.revenue_events
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin full access to recovery_cases" ON public.recovery_cases;
CREATE POLICY "Allow admin full access to recovery_cases" ON public.recovery_cases
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin full access to agent_actions" ON public.agent_actions;
CREATE POLICY "Allow admin full access to agent_actions" ON public.agent_actions
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
