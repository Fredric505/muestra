
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
