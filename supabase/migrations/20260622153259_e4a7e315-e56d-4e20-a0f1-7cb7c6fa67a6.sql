ALTER TABLE public.repairs
  ADD COLUMN IF NOT EXISTS device_unlock_type text,
  ADD COLUMN IF NOT EXISTS device_unlock_value text;