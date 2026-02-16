
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
