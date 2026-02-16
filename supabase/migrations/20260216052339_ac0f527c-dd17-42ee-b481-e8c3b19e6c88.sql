
-- Drop old conflicting repair_types policies that don't allow NULL workshop_id
DROP POLICY IF EXISTS "Users can view workshop repair types" ON public.repair_types;
DROP POLICY IF EXISTS "Admins can manage workshop repair types" ON public.repair_types;
