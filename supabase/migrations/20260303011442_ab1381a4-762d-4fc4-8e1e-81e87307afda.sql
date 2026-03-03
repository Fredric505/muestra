
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
