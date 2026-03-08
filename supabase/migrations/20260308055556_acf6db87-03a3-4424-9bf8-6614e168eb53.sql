ALTER TABLE public.workshops 
ADD COLUMN IF NOT EXISTS pause_type text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_reason text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pause_estimated_resume timestamp with time zone DEFAULT NULL;