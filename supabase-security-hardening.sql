-- =============================================================================
-- Supabase Security Hardening Script for Pahadi Vibes
-- Description: Enforces strict Row Level Security (RLS) policies across all
--              tables to safeguard customer PII, order data, products, and
--              autonomous agent recovery cases.
-- Instructions: Copy and run this script in the Supabase SQL Editor.
-- =============================================================================

-- =============================================================================
-- 1. ENSURE OPTIONAL AI TABLES EXIST BEFORE ENABLING RLS
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.revenue_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(100) NOT NULL,
    order_id VARCHAR(255),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255),
    customer_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    status VARCHAR(50) NOT NULL DEFAULT 'RECORDED',
    failure_reason TEXT,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.recovery_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id VARCHAR(255) NOT NULL UNIQUE,
    order_id VARCHAR(255) NOT NULL UNIQUE,
    razorpay_order_id VARCHAR(255),
    customer_id VARCHAR(255),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    amount NUMERIC NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'INR',
    stage VARCHAR(50) NOT NULL DEFAULT 'CHECKOUT_INITIATED',
    recovery_status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    failure_reason TEXT,
    last_event_id VARCHAR(255),
    cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    recovered_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.agent_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.recovery_cases(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
    status VARCHAR(50) NOT NULL DEFAULT 'RECORDED',
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    reasoning TEXT,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- 2. ENABLE ROW LEVEL SECURITY SAFELY
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.users ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.addresses') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.categories') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.products') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.products ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.orders') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.revenue_events') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.revenue_events ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.recovery_cases') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.recovery_cases ENABLE ROW LEVEL SECURITY';
    END IF;

    IF to_regclass('public.agent_actions') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.agent_actions ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- =============================================================================
-- 3. USERS TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.users') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read access to users profiles" ON public.users';
        EXECUTE 'DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.users';
        EXECUTE 'DROP POLICY IF EXISTS "Allow users to update their own profiles" ON public.users';
        EXECUTE 'DROP POLICY IF EXISTS "Allow users to insert their own profiles" ON public.users';

        EXECUTE 'CREATE POLICY "Allow users to read their own profile" ON public.users FOR SELECT TO authenticated USING (auth.uid()::text = id::text)';
        EXECUTE 'CREATE POLICY "Allow users to update their own profiles" ON public.users FOR UPDATE TO authenticated USING (auth.uid()::text = id::text) WITH CHECK (auth.uid()::text = id::text)';
        EXECUTE 'CREATE POLICY "Allow users to insert their own profiles" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid()::text = id::text)';
    END IF;
END $$;

-- =============================================================================
-- 4. ADDRESSES TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.addresses') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses';
        EXECUTE 'DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses';

        EXECUTE 'CREATE POLICY "Users can manage their own addresses" ON public.addresses FOR ALL TO authenticated USING (auth.uid()::text = user_id::text) WITH CHECK (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- =============================================================================
-- 5. CATEGORIES TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.categories') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin manage access to categories" ON public.categories';

        EXECUTE 'CREATE POLICY "Allow public read access to categories" ON public.categories FOR SELECT TO public USING (true)';
    END IF;
END $$;

-- =============================================================================
-- 6. PRODUCTS TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.products') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read access to products" ON public.products';
        EXECUTE 'DROP POLICY IF EXISTS "Allow public read active products" ON public.products';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin manage access to products" ON public.products';

        EXECUTE 'CREATE POLICY "Allow public read active products" ON public.products FOR SELECT TO public USING (status = ''Active'')';
    END IF;
END $$;

-- =============================================================================
-- 7. ORDERS TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.orders') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow public insert access to orders" ON public.orders';
        EXECUTE 'DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders';
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin manage access to orders" ON public.orders';

        EXECUTE 'CREATE POLICY "Users can view their own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid()::text = user_id::text)';
    END IF;
END $$;

-- =============================================================================
-- 8. PAHADI AI & REVENUE RECOVERY TABLE SECURITY POLICIES
-- =============================================================================

DO $$
BEGIN
    IF to_regclass('public.revenue_events') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin full access to revenue_events" ON public.revenue_events';
    END IF;

    IF to_regclass('public.recovery_cases') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin full access to recovery_cases" ON public.recovery_cases';
    END IF;

    IF to_regclass('public.agent_actions') IS NOT NULL THEN
        EXECUTE 'DROP POLICY IF EXISTS "Allow admin full access to agent_actions" ON public.agent_actions';
    END IF;
END $$;

-- Output confirmation
SELECT 'Pahadi Vibes security hardening policies successfully applied.' AS status;
