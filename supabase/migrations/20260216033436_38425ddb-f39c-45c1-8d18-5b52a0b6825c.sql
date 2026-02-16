
-- Fix: SELECT policy on user_roles must be PERMISSIVE, not RESTRICTIVE
DROP POLICY IF EXISTS "Users can view roles" ON public.user_roles;

CREATE POLICY "Users can view roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Also make the other restrictive SELECT policies on other tables permissive where needed
-- to prevent similar silent failures
