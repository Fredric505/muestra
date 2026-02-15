
-- Fix: The SELECT policy on user_roles targets 'public' role instead of 'authenticated'
-- Drop and recreate with correct role
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));
