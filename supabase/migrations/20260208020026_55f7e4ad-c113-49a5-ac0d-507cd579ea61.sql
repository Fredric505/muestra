-- Create brand settings table
CREATE TABLE public.brand_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL DEFAULT 'WEN-TECH',
  tagline TEXT DEFAULT 'Nicaragua Unlock 505',
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can view brand settings
CREATE POLICY "Anyone can view brand settings"
ON public.brand_settings
FOR SELECT
USING (true);

-- Only admins can update brand settings
CREATE POLICY "Only admins can update brand settings"
ON public.brand_settings
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Only admins can insert brand settings
CREATE POLICY "Only admins can insert brand settings"
ON public.brand_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_brand_settings_updated_at
BEFORE UPDATE ON public.brand_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.brand_settings (business_name, tagline)
VALUES ('WEN-TECH', 'Nicaragua Unlock 505');

-- Create storage bucket for logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true);

-- Storage policies for brand assets
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'brand-assets');

CREATE POLICY "Only admins can upload brand assets"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update brand assets"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete brand assets"
ON storage.objects
FOR DELETE
USING (bucket_id = 'brand-assets' AND has_role(auth.uid(), 'admin'::app_role));