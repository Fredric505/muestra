
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
