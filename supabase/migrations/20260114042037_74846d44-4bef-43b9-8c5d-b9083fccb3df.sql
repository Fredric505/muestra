
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
