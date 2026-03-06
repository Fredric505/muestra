
-- Table to track registration IPs
CREATE TABLE public.registration_ips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  user_id uuid NOT NULL,
  workshop_id uuid REFERENCES public.workshops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_blocked boolean NOT NULL DEFAULT false,
  blocked_reason text,
  blocked_at timestamptz,
  unblocked_at timestamptz
);

-- Index for fast IP lookups
CREATE INDEX idx_registration_ips_ip ON public.registration_ips(ip_address);
CREATE INDEX idx_registration_ips_user ON public.registration_ips(user_id);

-- Enable RLS
ALTER TABLE public.registration_ips ENABLE ROW LEVEL SECURITY;

-- Only super admins can view and manage
CREATE POLICY "Super admins can view all registration IPs"
  ON public.registration_ips FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update registration IPs"
  ON public.registration_ips FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can delete registration IPs"
  ON public.registration_ips FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Anyone authenticated can insert (during registration)
CREATE POLICY "Authenticated users can insert registration IPs"
  ON public.registration_ips FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Anon users can also insert (registration happens before full auth)  
CREATE POLICY "Anon can insert registration IPs"
  ON public.registration_ips FOR INSERT
  TO anon
  WITH CHECK (true);
