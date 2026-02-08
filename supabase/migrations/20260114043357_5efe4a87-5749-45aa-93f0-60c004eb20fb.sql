
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
