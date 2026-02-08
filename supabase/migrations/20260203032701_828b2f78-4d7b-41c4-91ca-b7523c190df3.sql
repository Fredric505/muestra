-- Drop the current SELECT policy that allows all users to view all repairs
DROP POLICY IF EXISTS "All authenticated users can view repairs" ON public.repairs;

-- Create new RLS policy: Admins see all, technicians see only their own
CREATE POLICY "Users can view their own or assigned repairs" 
  ON public.repairs 
  FOR SELECT 
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) 
    OR created_by = auth.uid() 
    OR technician_id = auth.uid()
  );