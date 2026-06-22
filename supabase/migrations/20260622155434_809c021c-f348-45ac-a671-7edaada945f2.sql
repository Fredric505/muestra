UPDATE public.brand_settings SET theme_preset = 'indigo' WHERE theme_preset = 'green' OR theme_preset IS NULL;
ALTER TABLE public.brand_settings ALTER COLUMN theme_preset SET DEFAULT 'indigo';