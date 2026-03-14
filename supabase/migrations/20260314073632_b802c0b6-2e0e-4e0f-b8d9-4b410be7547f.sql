ALTER TABLE public.brand_settings
ADD COLUMN IF NOT EXISTS invoice_text_overrides jsonb NOT NULL DEFAULT '{}'::jsonb;