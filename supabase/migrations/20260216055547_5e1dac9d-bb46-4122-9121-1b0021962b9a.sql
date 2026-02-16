
-- Add max_employees to plans table
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_employees integer DEFAULT 5;

-- Add device photo columns to repairs table
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_photo_received text;
ALTER TABLE public.repairs ADD COLUMN IF NOT EXISTS device_photo_delivered text;

-- Create storage bucket for device photos
INSERT INTO storage.buckets (id, name, public) VALUES ('device-photos', 'device-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for device photos
CREATE POLICY "Users can upload device photos" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'device-photos' AND auth.role() = 'authenticated');

CREATE POLICY "Anyone can view device photos" ON storage.objects
FOR SELECT USING (bucket_id = 'device-photos');

CREATE POLICY "Users can update device photos" ON storage.objects
FOR UPDATE USING (bucket_id = 'device-photos' AND auth.role() = 'authenticated');
