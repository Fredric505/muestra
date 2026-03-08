
ALTER TABLE public.brand_settings
  ADD COLUMN IF NOT EXISTS theme_preset text NOT NULL DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS custom_primary_color text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS color_mode text NOT NULL DEFAULT 'dark';
