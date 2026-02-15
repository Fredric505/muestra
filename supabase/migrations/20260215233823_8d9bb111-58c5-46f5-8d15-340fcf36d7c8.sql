
-- Trigger: auto-create profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Usuario'))
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists to avoid duplicate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: auto-assign admin role when a workshop is created
CREATE OR REPLACE FUNCTION public.handle_new_workshop()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-assign admin role to the workshop owner
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.owner_id, 'admin')
  ON CONFLICT DO NOTHING;
  
  -- Link profile to workshop
  UPDATE public.profiles
  SET workshop_id = NEW.id
  WHERE user_id = NEW.owner_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_workshop_created ON public.workshops;
CREATE TRIGGER on_workshop_created
  AFTER INSERT ON public.workshops
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_workshop();

-- Fix: allow the profile creation trigger to work by adding unique constraint if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_roles_user_id_role_key'
  ) THEN
    ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);
  END IF;
END $$;
