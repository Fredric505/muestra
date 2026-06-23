-- 1. payment_methods: restrict reads to authenticated users
DROP POLICY IF EXISTS "Anyone can view active payment methods" ON public.payment_methods;
CREATE POLICY "Authenticated users can view active payment methods"
ON public.payment_methods FOR SELECT TO authenticated
USING (true);

-- 2. profiles: scope reads to own profile / same workshop / super admin
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view profiles in their workshop"
ON public.profiles FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR (workshop_id IS NOT NULL AND workshop_id = public.get_user_workshop_id(auth.uid()))
);

-- 3. user_roles: prevent privilege escalation
DROP POLICY IF EXISTS "Only admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Only admins can delete roles" ON public.user_roles;

CREATE POLICY "Manage employee roles or super admin"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

CREATE POLICY "Update employee roles or super admin"
ON public.user_roles FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

CREATE POLICY "Delete employee roles or super admin"
ON public.user_roles FOR DELETE TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR (has_role(auth.uid(), 'admin'::app_role) AND role = 'technician'::app_role)
);

-- 4. payment-receipts: restrict uploads to user's own folder
DROP POLICY IF EXISTS "Workshop owners can upload receipts" ON storage.objects;
DROP POLICY IF EXISTS "Workshop users can upload receipts" ON storage.objects;

CREATE POLICY "Users can upload receipts to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'payment-receipts'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR (storage.foldername(name))[1] = public.get_user_workshop_id(auth.uid())::text
  )
);