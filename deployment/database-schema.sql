-- =====================================================================
-- RepairControl — Esquema completo de base de datos
-- Generado a partir del historial de migraciones (supabase/migrations)
-- Ejecutar en un proyecto Supabase NUEVO y VACÍO, de una sola vez.
-- Incluye: enums, tablas, GRANTs, RLS, funciones, triggers, buckets y cron.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Origen: 20260114042028_4594f9a5-d286-40b3-8224-4c48a8c0f4b0.sql
-- ---------------------------------------------------------------------

-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'technician');

-- Create enum for repair status
CREATE TYPE public.repair_status AS ENUM ('received', 'in_progress', 'ready', 'delivered');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create repair types table
CREATE TABLE public.repair_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  estimated_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on repair_types
ALTER TABLE public.repair_types ENABLE ROW LEVEL SECURITY;

-- Repair types policies
CREATE POLICY "All authenticated users can view repair types"
  ON public.repair_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage repair types"
  ON public.repair_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default repair types
INSERT INTO public.repair_types (name, description, estimated_price) VALUES
  ('Pantalla', 'Cambio o reparación de pantalla', 50.00),
  ('Batería', 'Cambio de batería', 25.00),
  ('Conector de carga', 'Reparación de puerto de carga', 20.00),
  ('Software', 'Actualización o reparación de software', 15.00),
  ('Cámara', 'Reparación de cámara frontal o trasera', 35.00),
  ('Altavoz', 'Reparación de altavoz o micrófono', 20.00),
  ('Botones', 'Reparación de botones físicos', 15.00),
  ('Otro', 'Otro tipo de reparación', 0.00);

-- Create repairs table
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_imei TEXT,
  repair_type_id UUID REFERENCES public.repair_types(id),
  repair_description TEXT,
  technical_notes TEXT,
  status repair_status NOT NULL DEFAULT 'received',
  estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_price DECIMAL(10,2),
  deposit DECIMAL(10,2) DEFAULT 0,
  delivery_date DATE,
  delivery_time TIME,
  technician_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on repairs
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Repairs policies - all authenticated can view
CREATE POLICY "All authenticated users can view repairs"
  ON public.repairs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert repairs"
  ON public.repairs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated users can update repairs"
  ON public.repairs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete repairs"
  ON public.repairs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to make first user admin
CREATE OR REPLACE FUNCTION public.make_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for making first user admin
CREATE TRIGGER on_first_user_make_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.make_first_user_admin();

-- Enable realtime for repairs
ALTER PUBLICATION supabase_realtime ADD TABLE public.repairs;


-- ---------------------------------------------------------------------
-- Origen: 20260114042037_74846d44-4bef-43b9-8c5d-b9083fccb3df.sql
-- ---------------------------------------------------------------------

-- Drop the overly permissive update policy
DROP POLICY IF EXISTS "All authenticated users can update repairs" ON public.repairs;

-- Create a more restrictive update policy
-- Users can only update repairs they created OR that are assigned to them as technician
CREATE POLICY "Users can update their own or assigned repairs"
  ON public.repairs FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() 
    OR technician_id = auth.uid() 
    OR public.has_role(auth.uid(), 'admin')
  );


-- ---------------------------------------------------------------------
-- Origen: 20260114043357_5efe4a87-5749-45aa-93f0-60c004eb20fb.sql
-- ---------------------------------------------------------------------

-- Add parts_cost column to repairs table for calculating net profit
ALTER TABLE public.repairs ADD COLUMN parts_cost numeric DEFAULT 0;

-- Create employees table with commission info
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  monthly_commission_rate numeric NOT NULL DEFAULT 0,
  base_salary numeric DEFAULT 0,
  is_active boolean DEFAULT true,
  hired_at date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create employee loans table
CREATE TABLE public.employee_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL,
  description text,
  loan_date date DEFAULT CURRENT_DATE NOT NULL,
  is_paid boolean DEFAULT false,
  paid_at timestamptz,
  created_by uuid REFERENCES auth.users(id) NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create daily earnings tracking table
CREATE TABLE public.daily_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  repair_id uuid REFERENCES public.repairs(id) ON DELETE CASCADE NOT NULL,
  earnings_date date DEFAULT CURRENT_DATE NOT NULL,
  gross_income numeric NOT NULL DEFAULT 0,
  parts_cost numeric NOT NULL DEFAULT 0,
  net_profit numeric NOT NULL DEFAULT 0,
  commission_earned numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(repair_id)
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_earnings ENABLE ROW LEVEL SECURITY;

-- Employees policies
CREATE POLICY "All authenticated can view employees"
  ON public.employees FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert employees"
  ON public.employees FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update employees"
  ON public.employees FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete employees"
  ON public.employees FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Employee loans policies
CREATE POLICY "All authenticated can view loans"
  ON public.employee_loans FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert loans"
  ON public.employee_loans FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update loans"
  ON public.employee_loans FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete loans"
  ON public.employee_loans FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Daily earnings policies
CREATE POLICY "All authenticated can view earnings"
  ON public.daily_earnings FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can insert earnings"
  ON public.daily_earnings FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Only admins can update earnings"
  ON public.daily_earnings FOR UPDATE
  USING (has_role(auth.uid(), 'admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- Origen: 20260115012720_69e71381-ca6c-4740-b893-4fbb97d71b20.sql
-- ---------------------------------------------------------------------
-- Add currency column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN currency TEXT NOT NULL DEFAULT 'NIO' CHECK (currency IN ('NIO', 'USD'));

-- Add currency column to daily_earnings table
ALTER TABLE public.daily_earnings
ADD COLUMN currency TEXT NOT NULL DEFAULT 'NIO' CHECK (currency IN ('NIO', 'USD'));

-- ---------------------------------------------------------------------
-- Origen: 20260118044624_3c782365-ce3e-44b9-8b46-dfebefde38f5.sql
-- ---------------------------------------------------------------------
-- Add warranty_days column to repairs table
ALTER TABLE public.repairs 
ADD COLUMN warranty_days integer DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN public.repairs.warranty_days IS 'Días de garantía para la reparación';

-- ---------------------------------------------------------------------
-- Origen: 20260203032622_d3c65f6f-4331-4d05-9551-1775e3d27eb4.sql
-- ---------------------------------------------------------------------
-- Add 'failed' to the repair_status enum
ALTER TYPE public.repair_status ADD VALUE IF NOT EXISTS 'failed';

-- Add a column to store the failure reason
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- ---------------------------------------------------------------------
-- Origen: 20260203032701_828b2f78-4d7b-41c4-91ca-b7523c190df3.sql
-- ---------------------------------------------------------------------
-- Drop the current SELECT policy that allows all users to view all repairs
DROP POLICY IF EXISTS "All authenticated users can view repairs" ON public.repairs;

-- Create new RLS policy: Admins see all, technicians see only their own
CREATE POLICY "Users can view their own or assigned repairs" 
  ON public.repairs 
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR created_by = auth.uid() 
    OR technician_id = auth.uid()
  );

-- ---------------------------------------------------------------------
-- Origen: 20260208020026_55f7e4ad-c113-49a5-ac0d-507cd579ea61.sql
-- ---------------------------------------------------------------------
-- Create brand settings table
CREATE TABLE public.brand_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'WEN-TECH',
  tagline TEXT DEFAULT 'Nicaragua Unlock 505',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view brand settings
CREATE POLICY "Anyone can view brand settings"
ON public.brand_settings
FOR SELECT
USING (true);

-- Only admins can update brand settings
CREATE POLICY "Only admins can update brand settings"
ON public.brand_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert brand settings
CREATE POLICY "Only admins can insert brand settings"
ON public.brand_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.brand_settings (business_name, tagline)
VALUES ('WEN-TECH', 'Nicaragua Unlock 505');

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Storage policies for brand assets
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Only admins can upload brand assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update brand assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete brand assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

-- ---------------------------------------------------------------------
-- Origen: 20260213061533_fa288103-7a2f-406c-b287-1cdceacfc80a.sql
-- ---------------------------------------------------------------------

-- Step 1: Add super_admin to app_role enum (must be committed separately)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';


-- ---------------------------------------------------------------------
-- Origen: 20260213061619_b59b6596-3023-47ed-ad06-f75ceb9d82be.sql
-- ---------------------------------------------------------------------

-- Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  monthly_price numeric NOT NULL DEFAULT 0,
  annual_price numeric NOT NULL DEFAULT 0,
  features jsonb DEFAULT '[]'::jsonb,
  has_free_trial boolean DEFAULT false,
  trial_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Only super_admins can manage plans" ON public.plans FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Workshops table (tenants)
CREATE TABLE public.workshops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  address text,
  logo_url text,
  plan_id uuid REFERENCES public.plans(id),
  subscription_status text NOT NULL DEFAULT 'pending' CHECK (subscription_status IN ('pending', 'trial', 'active', 'expired', 'cancelled')),
  trial_ends_at timestamptz,
  subscription_ends_at timestamptz,
  is_active boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.workshops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all workshops" ON public.workshops FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owners can view their own workshop" ON public.workshops FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Anyone authenticated can insert workshops" ON public.workshops FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Super admins can update any workshop" ON public.workshops FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Owners can update their own workshop" ON public.workshops FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Super admins can delete workshops" ON public.workshops FOR DELETE USING (has_role(auth.uid(), 'super_admin'));

-- Payment methods (super admin config)
CREATE TABLE public.payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('bank_transfer', 'binance')),
  label text NOT NULL,
  bank_name text,
  account_number text,
  account_holder text,
  binance_id text,
  instructions text,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active payment methods" ON public.payment_methods FOR SELECT USING (true);
CREATE POLICY "Only super_admins can manage payment methods" ON public.payment_methods FOR ALL USING (has_role(auth.uid(), 'super_admin'));

-- Payment requests
CREATE TABLE public.payment_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workshop_id uuid NOT NULL REFERENCES public.workshops(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  payment_method_id uuid REFERENCES public.payment_methods(id),
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'NIO',
  receipt_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes text,
  admin_notes text,
  billing_period text CHECK (billing_period IN ('monthly', 'annual')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can view all payment requests" ON public.payment_requests FOR SELECT USING (has_role(auth.uid(), 'super_admin'));
CREATE POLICY "Workshop owners can view their own requests" ON public.payment_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.workshops WHERE id = payment_requests.workshop_id AND owner_id = auth.uid())
);
CREATE POLICY "Workshop owners can insert requests" ON public.payment_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.workshops WHERE id = payment_requests.workshop_id AND owner_id = auth.uid())
);
CREATE POLICY "Super admins can update requests" ON public.payment_requests FOR UPDATE USING (has_role(auth.uid(), 'super_admin'));

-- Add workshop_id to existing tables
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.repair_types ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.daily_earnings ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);
ALTER TABLE public.employee_loans ADD COLUMN IF NOT EXISTS workshop_id uuid REFERENCES public.workshops(id);

-- Storage bucket for receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false) ON CONFLICT DO NOTHING;
CREATE POLICY "Workshop owners can upload receipts" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can view own receipts or super admin" ON storage.objects FOR SELECT USING (bucket_id = 'payment-receipts' AND (has_role(auth.uid(), 'super_admin') OR auth.uid()::text = (storage.foldername(name))[1]));

-- Triggers
CREATE TRIGGER update_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_workshops_updated_at BEFORE UPDATE ON public.workshops FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Default plans
INSERT INTO public.plans (name, description, monthly_price, annual_price, has_free_trial, trial_days, display_order, features) VALUES
('Básico', 'Perfecto para talleres pequeños que están comenzando', 299, 2990, true, 7, 1, '["Hasta 50 reparaciones/mes", "1 empleado", "Etiquetas de reparación", "Soporte por WhatsApp"]'::jsonb),
('Profesional', 'Para talleres en crecimiento que necesitan más control', 599, 5990, false, 0, 2, '["Reparaciones ilimitadas", "Hasta 5 empleados", "Etiquetas + Facturas", "Historial completo", "Reportes de ingresos", "Soporte prioritario"]'::jsonb),
('Enterprise', 'Para cadenas de talleres y operaciones grandes', 999, 9990, false, 0, 3, '["Todo en Profesional", "Empleados ilimitados", "Multi-sucursal", "API personalizada", "Soporte dedicado", "Personalización de marca"]'::jsonb);

-- Update user_roles policy for super_admin
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view roles" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin'));


-- ---------------------------------------------------------------------
-- Origen: 20260215230521_50d03e76-9914-490b-9189-dff28d335623.sql
-- ---------------------------------------------------------------------

-- Platform settings table for super admin to configure global settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'RepairControl',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only super_admins can update
CREATE POLICY "Only super_admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super_admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default row
INSERT INTO public.platform_settings (platform_name) VALUES ('RepairControl');

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- Origen: 20260215233823_8d9bb111-58c5-46f5-8d15-340fcf36d7c8.sql
-- ---------------------------------------------------------------------

-- Trigger: auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-assign admin role when a workshop is created
CREATE OR REPLACE FUNCTION public.handle_new_workshop()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign admin role to the workshop owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_id, 'admin')
  ON CONFLICT DO NOTHING;
  
  -- Link profile to workshop
  UPDATE public.profiles
  SET workshop_id = NEW.id
  WHERE user_id = NEW.owner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_workshop_created ON public.workshops;
CREATE TRIGGER on_workshop_created
  AFTER INSERT ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workshop();

-- Fix: allow the profile creation trigger to work by adding unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- Origen: 20260215233931_c1c6c088-5625-46c5-bb8d-266557f66f85.sql
-- ---------------------------------------------------------------------

-- Fix: The SELECT policy on user_roles targets 'public' role instead of 'authenticated'
-- Drop and recreate with correct role
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));


-- ---------------------------------------------------------------------
-- Origen: 20260216033051_49dbcef4-0cd4-445c-a195-dfe5e5b471d7.sql
-- ---------------------------------------------------------------------

-- 1. Add currency column to plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NIO';

-- 2. Create function to fully clean up employee data when deleted
-- This allows ex-employees to register their own workshop later
CREATE OR REPLACE FUNCTION public.cleanup_employee(p_employee_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get user_id from employee
  SELECT user_id INTO v_user_id FROM employees WHERE id = p_employee_id;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Employee not found';
  END IF;
  
  -- Delete technician role
  DELETE FROM user_roles WHERE user_id = v_user_id AND role = 'technician';
  
  -- Unlink profile from workshop
  UPDATE profiles SET workshop_id = NULL WHERE user_id = v_user_id;
  
  -- Delete employee record entirely
  DELETE FROM employees WHERE id = p_employee_id;
END;
$$;

-- 3. Fix workshops INSERT policy to be PERMISSIVE so new users can insert
DROP POLICY IF EXISTS "Anyone authenticated can insert workshops" ON public.workshops;
CREATE POLICY "Anyone authenticated can insert workshops"
ON public.workshops
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);


-- ---------------------------------------------------------------------
-- Origen: 20260216033436_38425ddb-f39c-45c1-8d18-5b52a0b6825c.sql
-- ---------------------------------------------------------------------

-- Fix: SELECT policy on user_roles must be PERMISSIVE, not RESTRICTIVE
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Also make the other restrictive SELECT policies on other tables permissive where needed
-- to prevent similar silent failures


-- ---------------------------------------------------------------------
-- Origen: 20260216034010_860c9b59-dbe1-4adb-8277-9af5b9465fab.sql
-- ---------------------------------------------------------------------

-- 1. Create a security definer function to get user's workshop_id
CREATE OR REPLACE FUNCTION public.get_user_workshop_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT workshop_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 2. Fix repairs RLS - scope by workshop_id
DROP POLICY IF EXISTS "Users can view their own or assigned repairs" ON public.repairs;
CREATE POLICY "Users can view workshop repairs"
ON public.repairs
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "Users can update their own or assigned repairs" ON public.repairs;
CREATE POLICY "Users can update workshop repairs"
ON public.repairs
FOR UPDATE
TO authenticated
USING (
  (workshop_id = get_user_workshop_id(auth.uid()))
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

DROP POLICY IF EXISTS "All authenticated users can insert repairs" ON public.repairs;
CREATE POLICY "Users can insert repairs in their workshop"
ON public.repairs
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = created_by
  AND (workshop_id IS NULL OR workshop_id = get_user_workshop_id(auth.uid()))
);

DROP POLICY IF EXISTS "Only admins can delete repairs" ON public.repairs;
CREATE POLICY "Admins can delete workshop repairs"
ON public.repairs
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND workshop_id = get_user_workshop_id(auth.uid())
);

-- 3. Fix employees RLS - scope by workshop_id
DROP POLICY IF EXISTS "All authenticated can view employees" ON public.employees;
CREATE POLICY "Users can view workshop employees"
ON public.employees
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 4. Fix daily_earnings RLS - scope by workshop_id
DROP POLICY IF EXISTS "All authenticated can view earnings" ON public.daily_earnings;
CREATE POLICY "Users can view workshop earnings"
ON public.daily_earnings
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 5. Fix employee_loans RLS - scope by workshop_id
DROP POLICY IF EXISTS "All authenticated can view loans" ON public.employee_loans;
CREATE POLICY "Users can view workshop loans"
ON public.employee_loans
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 6. Fix brand_settings RLS - scope by workshop_id
DROP POLICY IF EXISTS "Anyone can view brand settings" ON public.brand_settings;
CREATE POLICY "Users can view workshop brand settings"
ON public.brand_settings
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 7. Fix repair_types RLS - scope by workshop_id
DROP POLICY IF EXISTS "All authenticated users can view repair types" ON public.repair_types;
CREATE POLICY "Users can view workshop repair types"
ON public.repair_types
FOR SELECT
TO authenticated
USING (
  workshop_id = get_user_workshop_id(auth.uid())
  OR has_role(auth.uid(), 'super_admin'::app_role)
);


-- ---------------------------------------------------------------------
-- Origen: 20260216034405_aa6cdc31-a3e5-4719-aa6d-0817a72e9b5a.sql
-- ---------------------------------------------------------------------

-- Recreate trigger for auto-creating profile on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate trigger for auto-assigning admin role when workshop is created
CREATE OR REPLACE TRIGGER on_workshop_created
  AFTER INSERT ON public.workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workshop();

-- Recreate updated_at triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_workshops_updated_at
  BEFORE UPDATE ON public.workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();


-- ---------------------------------------------------------------------
-- Origen: 20260216035622_66b17e42-3460-4670-a352-bb2b3fb5cab7.sql
-- ---------------------------------------------------------------------

-- Fix employee_loans policies (drop old names first)
DROP POLICY IF EXISTS "Only admins can insert loans" ON public.employee_loans;
DROP POLICY IF EXISTS "Only admins can update loans" ON public.employee_loans;
DROP POLICY IF EXISTS "Only admins can delete loans" ON public.employee_loans;

CREATE POLICY "Admins can insert workshop loans"
  ON public.employee_loans FOR INSERT
  TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND (workshop_id IS NULL OR workshop_id = get_user_workshop_id(auth.uid()))
  );

CREATE POLICY "Admins can update workshop loans"
  ON public.employee_loans FOR UPDATE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Admins can delete workshop loans"
  ON public.employee_loans FOR DELETE
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Fix daily_earnings INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert earnings" ON public.daily_earnings;
CREATE POLICY "Users can insert workshop earnings"
  ON public.daily_earnings FOR INSERT
  TO authenticated
  WITH CHECK (workshop_id IS NULL OR workshop_id = get_user_workshop_id(auth.uid()));

-- Fix repair_types ALL policy
DROP POLICY IF EXISTS "Only admins can manage repair types" ON public.repair_types;
CREATE POLICY "Admins can manage workshop repair types"
  ON public.repair_types FOR ALL
  TO authenticated
  USING (
    (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()))
    OR has_role(auth.uid(), 'super_admin'::app_role)
  );

-- Create brand_settings for existing workshops that don't have one
INSERT INTO public.brand_settings (workshop_id, business_name)
SELECT w.id, w.name
FROM public.workshops w
LEFT JOIN public.brand_settings bs ON bs.workshop_id = w.id
WHERE bs.id IS NULL;


-- ---------------------------------------------------------------------
-- Origen: 20260216052133_3a6532a3-504e-45f5-8c93-17f964fc313e.sql
-- ---------------------------------------------------------------------

-- Fix repair_types RLS: allow access to global types (workshop_id IS NULL) AND workshop-specific types
DROP POLICY IF EXISTS "Users can view repair types" ON public.repair_types;
CREATE POLICY "Users can view repair types"
  ON public.repair_types FOR SELECT
  TO authenticated
  USING (
    workshop_id IS NULL 
    OR workshop_id = public.get_user_workshop_id(auth.uid())
  );

-- Fix repair_types insert/update for workshop-specific types
DROP POLICY IF EXISTS "Admins can manage repair types" ON public.repair_types;
CREATE POLICY "Admins can manage repair types"
  ON public.repair_types FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND (workshop_id IS NULL OR workshop_id = public.get_user_workshop_id(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (workshop_id IS NULL OR workshop_id = public.get_user_workshop_id(auth.uid()))
  );

-- Ensure payment-receipts storage policies exist for upload and signed URL access
-- Allow authenticated users to upload receipts to their workshop folder
DROP POLICY IF EXISTS "Workshop users can upload receipts" ON storage.objects;
CREATE POLICY "Workshop users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

-- Allow super admins to read all receipts
DROP POLICY IF EXISTS "Super admins can view all receipts" ON storage.objects;
CREATE POLICY "Super admins can view all receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts' 
    AND public.has_role(auth.uid(), 'super_admin')
  );

-- Allow workshop users to view their own receipts
DROP POLICY IF EXISTS "Workshop users can view own receipts" ON storage.objects;
CREATE POLICY "Workshop users can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.get_user_workshop_id(auth.uid())::text
  );


-- ---------------------------------------------------------------------
-- Origen: 20260216052339_ac0f527c-dd17-42ee-b481-e8c3b19e6c88.sql
-- ---------------------------------------------------------------------

-- Drop old conflicting repair_types policies that don't allow NULL workshop_id
DROP POLICY IF EXISTS "Users can view workshop repair types" ON public.repair_types;
DROP POLICY IF EXISTS "Admins can manage workshop repair types" ON public.repair_types;


-- ---------------------------------------------------------------------
-- Origen: 20260216055547_5e1dac9d-bb46-4122-9121-1b0021962b9a.sql
-- ---------------------------------------------------------------------

-- Add max_employees to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_employees integer DEFAULT 5;

-- Add device photo columns to repairs table
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_photo_received text;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_photo_delivered text;

-- Create storage bucket for device photos
INSERT INTO storage.buckets (id, name, public) VALUES ('device-photos', 'device-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for device photos
CREATE POLICY "Users can upload device photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'device-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view device photos" ON storage.objects
FOR SELECT USING (bucket_id = 'device-photos');

CREATE POLICY "Users can update device photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'device-photos' AND auth.role() = 'authenticated');


-- ---------------------------------------------------------------------
-- Origen: 20260216071858_2a900206-7fca-4cf1-b14f-ac5d467cda1e.sql
-- ---------------------------------------------------------------------

-- Allow employees/technicians to view the workshop they belong to
CREATE POLICY "Members can view their workshop"
ON public.workshops
FOR SELECT
USING (
  id = get_user_workshop_id(auth.uid())
);


-- ---------------------------------------------------------------------
-- Origen: 20260302065806_c72a997a-2ce9-44e1-b0d4-23fe542b6b8e.sql
-- ---------------------------------------------------------------------

-- Allow super admins to delete brand_settings
CREATE POLICY "Super admins can delete brand settings"
ON public.brand_settings FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete daily_earnings
CREATE POLICY "Super admins can delete daily earnings"
ON public.daily_earnings FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete employee_loans
CREATE POLICY "Super admins can delete employee loans"
ON public.employee_loans FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete repairs
CREATE POLICY "Super admins can delete repairs"
ON public.repairs FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete repair_types
CREATE POLICY "Super admins can delete repair types"
ON public.repair_types FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete employees
CREATE POLICY "Super admins can delete employees"
ON public.employees FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to delete payment_requests
CREATE POLICY "Super admins can delete payment requests"
ON public.payment_requests FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Allow super admins to update profiles (to unlink workshop_id)
CREATE POLICY "Super admins can update profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));


-- ---------------------------------------------------------------------
-- Origen: 20260303003513_ca1a9aec-932f-4be9-9b49-77f6990776c4.sql
-- ---------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;


-- ---------------------------------------------------------------------
-- Origen: 20260303011442_ab1381a4-762d-4fc4-8e1e-81e87307afda.sql
-- ---------------------------------------------------------------------

-- 1. Employee type enum
CREATE TYPE public.employee_type AS ENUM ('technician', 'seller');

-- 2. Add employee_type column to employees table
ALTER TABLE public.employees ADD COLUMN employee_type public.employee_type NOT NULL DEFAULT 'technician';

-- 3. Add compensation_type to employees
ALTER TABLE public.employees ADD COLUMN compensation_type text NOT NULL DEFAULT 'commission'; -- 'fixed', 'commission', 'both'

-- 4. Products table (inventory)
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'celular', -- 'celular', 'accesorio'
  condition TEXT NOT NULL DEFAULT 'nuevo', -- 'nuevo', 'usado'
  purchase_price NUMERIC DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 0,
  photo_url TEXT,
  warranty_days INTEGER DEFAULT 0,
  notes TEXT,
  currency TEXT NOT NULL DEFAULT 'NIO',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workshop products" ON public.products
  FOR SELECT USING (workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can manage products" ON public.products
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()));

CREATE POLICY "Super admins can delete products" ON public.products
  FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES public.employees(id),
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  sale_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'NIO',
  status TEXT NOT NULL DEFAULT 'pending_cost', -- 'pending_cost', 'completed'
  product_cost NUMERIC,
  admin_notes TEXT,
  cost_registered_by UUID,
  cost_registered_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workshop sales" ON public.sales
  FOR SELECT USING (workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert workshop sales" ON public.sales
  FOR INSERT WITH CHECK (auth.uid() = created_by AND (workshop_id IS NULL OR workshop_id = get_user_workshop_id(auth.uid())));

CREATE POLICY "Admins can update workshop sales" ON public.sales
  FOR UPDATE USING (workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admins can delete workshop sales" ON public.sales
  FOR DELETE USING ((has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Sale items table
CREATE TABLE public.sale_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  condition TEXT DEFAULT 'nuevo',
  warranty_days INTEGER DEFAULT 0,
  condition_notes TEXT,
  device_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sale items" ON public.sale_items
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND (sales.workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role))));

CREATE POLICY "Users can insert sale items" ON public.sale_items
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND sales.created_by = auth.uid()));

CREATE POLICY "Admins can update sale items" ON public.sale_items
  FOR UPDATE USING (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND (sales.workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role))));

CREATE POLICY "Admins can delete sale items" ON public.sale_items
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.sales WHERE sales.id = sale_items.sale_id AND ((has_role(auth.uid(), 'admin'::app_role) AND sales.workshop_id = get_user_workshop_id(auth.uid())) OR has_role(auth.uid(), 'super_admin'::app_role))));

-- 7. Sales earnings for seller commissions
CREATE TABLE public.sale_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  sale_id UUID NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE UNIQUE,
  earnings_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sale_amount NUMERIC NOT NULL DEFAULT 0,
  product_cost NUMERIC NOT NULL DEFAULT 0,
  net_profit NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  workshop_id UUID REFERENCES public.workshops(id),
  currency TEXT NOT NULL DEFAULT 'NIO',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sale_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workshop sale earnings" ON public.sale_earnings
  FOR SELECT USING (workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Users can insert workshop sale earnings" ON public.sale_earnings
  FOR INSERT WITH CHECK (workshop_id IS NULL OR workshop_id = get_user_workshop_id(auth.uid()));

CREATE POLICY "Admins can update sale earnings" ON public.sale_earnings
  FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role) AND workshop_id = get_user_workshop_id(auth.uid()));

CREATE POLICY "Super admins can delete sale earnings" ON public.sale_earnings
  FOR DELETE USING (has_role(auth.uid(), 'super_admin'::app_role));


-- ---------------------------------------------------------------------
-- Origen: 20260304033259_6b174e9c-0a74-494a-88ed-479dfe5e9b3b.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.workshops ADD COLUMN currency text NOT NULL DEFAULT 'USD';

-- ---------------------------------------------------------------------
-- Origen: 20260306023851_375eeae0-9e84-4a80-b822-37eed9985ff9.sql
-- ---------------------------------------------------------------------

-- Table to track registration IPs
CREATE TABLE public.registration_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid NOT NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  unblocked_at timestamptz
);

-- Index for fast IP lookups
CREATE INDEX idx_registration_ips_ip ON public.registration_ips(ip_address);
CREATE INDEX idx_registration_ips_user ON public.registration_ips(user_id);

-- Enable RLS
ALTER TABLE public.registration_ips ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage
CREATE POLICY "Super admins can view all registration IPs"
  ON public.registration_ips FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update registration IPs"
  ON public.registration_ips FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete registration IPs"
  ON public.registration_ips FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone authenticated can insert (during registration)
CREATE POLICY "Authenticated users can insert registration IPs"
  ON public.registration_ips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anon users can also insert (registration happens before full auth)  
CREATE POLICY "Anon can insert registration IPs"
  ON public.registration_ips FOR INSERT
  TO anon
  WITH CHECK (true);


-- ---------------------------------------------------------------------
-- Origen: 20260306023858_d43345fb-1997-4c6a-ab97-67c91bdadbbb.sql
-- ---------------------------------------------------------------------

-- Drop the overly permissive anon policy and replace with a more controlled one
DROP POLICY "Anon can insert registration IPs" ON public.registration_ips;


-- ---------------------------------------------------------------------
-- Origen: 20260308055556_acf6db87-03a3-4424-9bf8-6614e168eb53.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.workshops 
ADD COLUMN IF NOT EXISTS pause_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_estimated_resume timestamp with time zone DEFAULT NULL;

-- ---------------------------------------------------------------------
-- Origen: 20260308071059_9b80d949-f7ea-4427-88a6-2ddf11aa6e19.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.workshops DROP CONSTRAINT IF EXISTS workshops_subscription_status_check;

-- ---------------------------------------------------------------------
-- Origen: 20260308073323_c681b5cb-aa44-46d6-8ab0-3552e1517ba7.sql
-- ---------------------------------------------------------------------

ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS theme_preset text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS custom_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_mode text NOT NULL DEFAULT 'dark';


-- ---------------------------------------------------------------------
-- Origen: 20260308100544_2637ec8d-d169-48a2-9c40-6610428e1370.sql
-- ---------------------------------------------------------------------

-- Table for multiple product images
CREATE TABLE public.product_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Users can view images of products in their workshop
CREATE POLICY "Users can view product images"
ON public.product_images
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND (p.workshop_id = get_user_workshop_id(auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role))
  )
);

-- Admins can insert product images
CREATE POLICY "Admins can insert product images"
ON public.product_images
FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND p.workshop_id = get_user_workshop_id(auth.uid())
  )
);

-- Admins can delete product images
CREATE POLICY "Admins can delete product images"
ON public.product_images
FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) AND
  EXISTS (
    SELECT 1 FROM public.products p
    WHERE p.id = product_images.product_id
    AND p.workshop_id = get_user_workshop_id(auth.uid())
  )
);

-- Super admins can manage all
CREATE POLICY "Super admins can manage product images"
ON public.product_images
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));


-- ---------------------------------------------------------------------
-- Origen: 20260308201503_79509321-aa8d-4acf-8ba2-6e987c3f8daf.sql
-- ---------------------------------------------------------------------

-- Add translation columns for plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_pt TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_pt TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_fr TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_en JSONB;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_pt JSONB;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_fr JSONB;

-- Populate English translations
UPDATE public.plans SET
  name_en = 'Basic',
  description_en = 'Perfect for small workshops just getting started',
  features_en = '["Unlimited repairs", "2 employees", "Repair labels", "WhatsApp support"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_en = 'Professional',
  description_en = 'For growing workshops that need more control',
  features_en = '["Unlimited repairs", "Up to 5 employees", "Income reports", "Priority support"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_en = 'Enterprise',
  description_en = 'For workshop chains and large operations',
  features_en = '["Everything in Professional", "Unlimited employees", "Dedicated support"]'::jsonb
WHERE name = 'Enterprise';

-- Populate Portuguese translations
UPDATE public.plans SET
  name_pt = 'Básico',
  description_pt = 'Perfeito para oficinas pequenas que estão começando',
  features_pt = '["Reparos ilimitados", "2 funcionários", "Etiquetas de reparo", "Suporte por WhatsApp"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_pt = 'Profissional',
  description_pt = 'Para oficinas em crescimento que precisam de mais controle',
  features_pt = '["Reparos ilimitados", "Até 5 funcionários", "Relatórios de receita", "Suporte prioritário"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_pt = 'Enterprise',
  description_pt = 'Para redes de oficinas e grandes operações',
  features_pt = '["Tudo no Profissional", "Funcionários ilimitados", "Suporte dedicado"]'::jsonb
WHERE name = 'Enterprise';

-- Populate French translations
UPDATE public.plans SET
  name_fr = 'Basique',
  description_fr = 'Parfait pour les petits ateliers qui débutent',
  features_fr = '["Réparations illimitées", "2 employés", "Étiquettes de réparation", "Support WhatsApp"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_fr = 'Professionnel',
  description_fr = 'Pour les ateliers en croissance qui ont besoin de plus de contrôle',
  features_fr = '["Réparations illimitées", "Jusqu''à 5 employés", "Rapports de revenus", "Support prioritaire"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_fr = 'Enterprise',
  description_fr = 'Pour les chaînes d''ateliers et les grandes opérations',
  features_fr = '["Tout dans Professionnel", "Employés illimités", "Support dédié"]'::jsonb
WHERE name = 'Enterprise';


-- ---------------------------------------------------------------------
-- Origen: 20260308210422_2b3883c1-7847-4853-801a-d86a39896e65.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.brand_settings ADD COLUMN IF NOT EXISTS invoice_size text NOT NULL DEFAULT 'commercial';

-- ---------------------------------------------------------------------
-- Origen: 20260314073632_b802c0b6-2e0e-4e0f-b8d9-4b410be7547f.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.brand_settings
ADD COLUMN IF NOT EXISTS invoice_text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------
-- Origen: 20260622153259_e4a7e315-e56d-4e20-a0f1-7cb7c6fa67a6.sql
-- ---------------------------------------------------------------------
ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS device_unlock_type text,
  ADD COLUMN IF NOT EXISTS device_unlock_value text;

-- ---------------------------------------------------------------------
-- Origen: 20260622155434_809c021c-f348-45ac-a671-7edaada945f2.sql
-- ---------------------------------------------------------------------
UPDATE public.brand_settings SET theme_preset = 'indigo' WHERE theme_preset = 'green' OR theme_preset IS NULL;
ALTER TABLE public.brand_settings ALTER COLUMN theme_preset SET DEFAULT 'indigo';

-- ---------------------------------------------------------------------
-- Origen: 20260623041131_a27b15e5-760f-43eb-8066-5d92df64923e.sql
-- ---------------------------------------------------------------------
-- 1. payment_methods: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Authenticated users can view active payment methods"
ON public.payment_methods FOR SELECT TO authenticated
USING (true);

-- 2. profiles: scope reads to own profile / same workshop / super admin
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their workshop"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (workshop_id IS NOT NULL AND workshop_id = public.get_user_workshop_id(auth.uid()))
);

-- 3. user_roles: prevent privilege escalation
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Manage employee roles or super admin"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

CREATE POLICY "Update employee roles or super admin"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

CREATE POLICY "Delete employee roles or super admin"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

-- 4. payment-receipts: restrict uploads to user's own folder
DROP POLICY IF EXISTS "Workshop owners can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Workshop users can upload receipts" ON storage.objects;

CREATE POLICY "Users can upload receipts to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_user_workshop_id(auth.uid())::text
  )
);
