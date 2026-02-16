
-- Allow employees/technicians to view the workshop they belong to
CREATE POLICY "Members can view their workshop"
ON public.workshops
FOR SELECT
USING (
  id = get_user_workshop_id(auth.uid())
);
