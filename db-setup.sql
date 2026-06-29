-- db-setup.sql
-- Run this script in your Supabase SQL Editor to set up the authentication schema.

-- 1. Create the public users table
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    provider VARCHAR(50) NOT NULL DEFAULT 'email',
    profile_image TEXT,
    phone VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create the addresses table aligning with the requirements
CREATE TABLE IF NOT EXISTS public.addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    landmark TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_addresses_user_id ON public.addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

-- Policies for users table
DROP POLICY IF EXISTS "Allow public read access to users profiles" ON public.users;
CREATE POLICY "Allow public read access to users profiles" ON public.users
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow users to update their own profiles" ON public.users;
CREATE POLICY "Allow users to update their own profiles" ON public.users
    FOR UPDATE TO authenticated USING (auth.jwt() ->> 'sub' = id::text);

DROP POLICY IF EXISTS "Allow users to insert their own profiles" ON public.users;
CREATE POLICY "Allow users to insert their own profiles" ON public.users
    FOR INSERT TO authenticated WITH CHECK (auth.jwt() ->> 'sub' = id::text);

-- Policies for addresses table
DROP POLICY IF EXISTS "Users can manage their own addresses" ON public.addresses;
CREATE POLICY "Users can manage their own addresses" ON public.addresses
    FOR ALL TO authenticated 
    USING (auth.jwt() ->> 'sub' = user_id::text)
    WITH CHECK (auth.jwt() ->> 'sub' = user_id::text);

-- 3. Trigger Function to sync Supabase auth.users with public.users
-- This handles automatic profile creation on Google Sign-In and email sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    full_name, 
    email, 
    password_hash, 
    provider, 
    profile_image, 
    phone, 
    created_at, 
    updated_at
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Valued Customer'),
    new.email,
    new.encrypted_password,
    COALESCE(new.raw_app_meta_data->>'provider', 'email'),
    new.raw_user_meta_data->>'avatar_url',
    new.phone,
    new.created_at,
    new.updated_at
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    profile_image = EXCLUDED.profile_image,
    phone = COALESCE(EXCLUDED.phone, public.users.phone),
    updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Create the categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    image TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Create the products table
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    category VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL,
    original_price NUMERIC,
    stock INTEGER NOT NULL DEFAULT 0,
    description TEXT NOT NULL,
    story TEXT,
    materials TEXT,
    dimensions TEXT,
    featured BOOLEAN NOT NULL DEFAULT false,
    bestseller BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    images JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Create the orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(255) NOT NULL,
    state VARCHAR(255) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    total NUMERIC NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Processing',
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    payment_method VARCHAR(100),
    payment_status VARCHAR(100),
    razorpay_order_id VARCHAR(255),
    razorpay_payment_id VARCHAR(255)
);

-- Enable RLS on new tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies for categories
DROP POLICY IF EXISTS "Allow public read access to categories" ON public.categories;
CREATE POLICY "Allow public read access to categories" ON public.categories
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admin manage access to categories" ON public.categories;
CREATE POLICY "Allow admin manage access to categories" ON public.categories
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for products
DROP POLICY IF EXISTS "Allow public read access to products" ON public.products;
CREATE POLICY "Allow public read access to products" ON public.products
    FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow admin manage access to products" ON public.products;
CREATE POLICY "Allow admin manage access to products" ON public.products
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Policies for orders
DROP POLICY IF EXISTS "Allow public insert access to orders" ON public.orders;
CREATE POLICY "Allow public insert access to orders" ON public.orders
    FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;
CREATE POLICY "Users can view their own orders" ON public.orders
    FOR SELECT TO authenticated USING (auth.jwt() ->> 'sub' = user_id::text);

DROP POLICY IF EXISTS "Allow admin manage access to orders" ON public.orders;
CREATE POLICY "Allow admin manage access to orders" ON public.orders
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
