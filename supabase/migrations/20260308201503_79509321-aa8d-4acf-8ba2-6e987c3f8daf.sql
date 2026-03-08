
-- Add translation columns for plans
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_en TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_pt TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS name_fr TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_en TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_pt TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS description_fr TEXT;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_en JSONB;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_pt JSONB;
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS features_fr JSONB;

-- Populate English translations
UPDATE public.plans SET
  name_en = 'Basic',
  description_en = 'Perfect for small workshops just getting started',
  features_en = '["Unlimited repairs", "2 employees", "Repair labels", "WhatsApp support"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_en = 'Professional',
  description_en = 'For growing workshops that need more control',
  features_en = '["Unlimited repairs", "Up to 5 employees", "Income reports", "Priority support"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_en = 'Enterprise',
  description_en = 'For workshop chains and large operations',
  features_en = '["Everything in Professional", "Unlimited employees", "Dedicated support"]'::jsonb
WHERE name = 'Enterprise';

-- Populate Portuguese translations
UPDATE public.plans SET
  name_pt = 'Básico',
  description_pt = 'Perfeito para oficinas pequenas que estão começando',
  features_pt = '["Reparos ilimitados", "2 funcionários", "Etiquetas de reparo", "Suporte por WhatsApp"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_pt = 'Profissional',
  description_pt = 'Para oficinas em crescimento que precisam de mais controle',
  features_pt = '["Reparos ilimitados", "Até 5 funcionários", "Relatórios de receita", "Suporte prioritário"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_pt = 'Enterprise',
  description_pt = 'Para redes de oficinas e grandes operações',
  features_pt = '["Tudo no Profissional", "Funcionários ilimitados", "Suporte dedicado"]'::jsonb
WHERE name = 'Enterprise';

-- Populate French translations
UPDATE public.plans SET
  name_fr = 'Basique',
  description_fr = 'Parfait pour les petits ateliers qui débutent',
  features_fr = '["Réparations illimitées", "2 employés", "Étiquettes de réparation", "Support WhatsApp"]'::jsonb
WHERE name = 'Básico';

UPDATE public.plans SET
  name_fr = 'Professionnel',
  description_fr = 'Pour les ateliers en croissance qui ont besoin de plus de contrôle',
  features_fr = '["Réparations illimitées", "Jusqu''à 5 employés", "Rapports de revenus", "Support prioritaire"]'::jsonb
WHERE name = 'Profesional';

UPDATE public.plans SET
  name_fr = 'Enterprise',
  description_fr = 'Pour les chaînes d''ateliers et les grandes opérations',
  features_fr = '["Tout dans Professionnel", "Employés illimités", "Support dédié"]'::jsonb
WHERE name = 'Enterprise';
