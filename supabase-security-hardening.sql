-- =============================================================================
-- Supabase Security Hardening Script for Pahadi Vibes
-- Description: Enforces strict Row Level Security (RLS) policies across all
--              tables to safeguard customer PII, order data, products, and
--              autonomous agent recovery cases.
-- Instructions: Run this script in the Supabase SQL Editor.
-- =============================================================================

-- 1. Enable Row Level Security (RLS) on all public tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.revenue_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.recovery_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.agent_actions ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- 2. USERS TABLE SECURITY
-- Protect customer PII (names, emails, phones). Users may only see and update
-- their own user record.
-- =============================================================================

-- Drop overly permissive legacy policies
DROP POLICY IF EXISTS "Allow public read access to users profiles" ON public.users;
DROP POLICY IF EXISTS "Allow users to read their own profile" ON public.users;
DROP POLICY IF EXISTS "Allow users to update their own profiles" ON public.users;
DROP POLICY IF EXISTS "Allow users to insert their own profiles" ON public.users;

-- Users can only SELECT their own record
CREATE POLICY "Allow users to read their own profile" ON public.users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Users can only UPDATE their own record
CREATE POLICY "Allow users to update their own profiles" ON public.users
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their initial profile
CREATE POLICY "Allow users to insert their own profiles" ON public.users
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- =============================================================================
-- 3. ADDRESSES TABLE SECURITY
-- Customers can only manage their own shipping addresses.
-- =============================================================================

DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can view their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can insert their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can update their own addresses" ON public.addresses;
DROP POLICY IF EXISTS "Users can delete their own addresses" ON public.addresses;

CREATE POLICY "Users can manage their own addresses" ON public.addresses
    FOR ALL TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- 4. CATEGORIES TABLE SECURITY
-- Anyone can view categories. Modifications are restricted to server-side admin.
-- =============================================================================

DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
DROP POLICY IF EXISTS "Allow admin manage access to categories" ON public.categories;

-- Public read access
CREATE POLICY "Allow public read access to categories" ON public.categories
    FOR SELECT TO public
    USING (true);

-- (Admin writes occur via supabaseAdmin / service-role key which bypasses RLS)

-- =============================================================================
-- 5. PRODUCTS TABLE SECURITY
-- Public and regular users can ONLY read active products.
-- Direct client writes/deletes are blocked (admin writes via service role).
-- =============================================================================

DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
DROP POLICY IF EXISTS "Allow public read active products" ON public.products;
DROP POLICY IF EXISTS "Allow admin manage access to products" ON public.products;

-- Public users can ONLY read Active products
CREATE POLICY "Allow public read active products" ON public.products
    FOR SELECT TO public
    USING (status = 'Active');

-- =============================================================================
-- 6. ORDERS TABLE SECURITY
-- Protect customer orders, addresses, phone numbers, and payment details.
-- - Authenticated users can only view their own orders.
-- - Direct public inserts are REVOKED to prevent malicious order injection.
-- - All order creation and status updates happen through verified server routes.
-- =============================================================================

DROP POLICY IF EXISTS "Allow public insert access to orders" ON public.orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Allow admin manage access to orders" ON public.orders;

-- Authenticated users can only read their own orders
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- (Order creation & updates happen exclusively via supabaseAdmin server-side)

-- =============================================================================
-- 7. PAHADI AI & REVENUE RECOVERY TABLE SECURITY
-- Sensitive business metrics, revenue events, and customer recovery cases
-- must NOT be accessible to regular authenticated customers directly via anon key.
-- =============================================================================

DROP POLICY IF EXISTS "Allow admin full access to revenue_events" ON public.revenue_events;
DROP POLICY IF EXISTS "Allow admin full access to recovery_cases" ON public.recovery_cases;
DROP POLICY IF EXISTS "Allow admin full access to agent_actions" ON public.agent_actions;

-- By not granting SELECT/ALL to 'authenticated' or 'public', direct client access
-- is blocked. Server-side APIs (using supabaseAdmin / service-role) retain full access.

-- Completed security hardening verification notice
SELECT 'Pahadi Vibes security hardening policies successfully applied.' AS status;
