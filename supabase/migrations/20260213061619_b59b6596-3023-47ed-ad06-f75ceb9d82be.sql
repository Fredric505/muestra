
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
