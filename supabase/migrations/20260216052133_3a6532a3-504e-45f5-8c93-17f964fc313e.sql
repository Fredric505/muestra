
-- Fix repair_types RLS: allow access to global types (workshop_id IS NULL) AND workshop-specific types
DROP POLICY IF EXISTS "Users can view repair types" ON public.repair_types;
CREATE POLICY "Users can view repair types"
  ON public.repair_types FOR SELECT
  TO authenticated
  USING (
    workshop_id IS NULL 
    OR workshop_id = public.get_user_workshop_id(auth.uid())
  );

-- Fix repair_types insert/update for workshop-specific types
DROP POLICY IF EXISTS "Admins can manage repair types" ON public.repair_types;
CREATE POLICY "Admins can manage repair types"
  ON public.repair_types FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') 
    AND (workshop_id IS NULL OR workshop_id = public.get_user_workshop_id(auth.uid()))
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND (workshop_id IS NULL OR workshop_id = public.get_user_workshop_id(auth.uid()))
  );

-- Ensure payment-receipts storage policies exist for upload and signed URL access
-- Allow authenticated users to upload receipts to their workshop folder
DROP POLICY IF EXISTS "Workshop users can upload receipts" ON storage.objects;
CREATE POLICY "Workshop users can upload receipts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-receipts');

-- Allow super admins to read all receipts
DROP POLICY IF EXISTS "Super admins can view all receipts" ON storage.objects;
CREATE POLICY "Super admins can view all receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts' 
    AND public.has_role(auth.uid(), 'super_admin')
  );

-- Allow workshop users to view their own receipts
DROP POLICY IF EXISTS "Workshop users can view own receipts" ON storage.objects;
CREATE POLICY "Workshop users can view own receipts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-receipts'
    AND (storage.foldername(name))[1] = public.get_user_workshop_id(auth.uid())::text
  );
