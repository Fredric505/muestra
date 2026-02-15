
-- Platform settings table for super admin to configure global settings
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_name text NOT NULL DEFAULT 'RepairControl',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read platform settings
CREATE POLICY "Anyone can view platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

-- Only super_admins can update
CREATE POLICY "Only super_admins can update platform settings"
  ON public.platform_settings FOR UPDATE
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Only super_admins can insert platform settings"
  ON public.platform_settings FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Insert default row
INSERT INTO public.platform_settings (platform_name) VALUES ('RepairControl');

-- Trigger for updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON public.platform_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
