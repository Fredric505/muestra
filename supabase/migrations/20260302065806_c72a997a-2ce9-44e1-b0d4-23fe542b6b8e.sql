
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
