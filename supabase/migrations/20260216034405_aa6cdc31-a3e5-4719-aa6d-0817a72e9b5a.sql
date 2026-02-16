
-- Recreate trigger for auto-creating profile on new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Recreate trigger for auto-assigning admin role when workshop is created
CREATE OR REPLACE TRIGGER on_workshop_created
  AFTER INSERT ON public.workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_workshop();

-- Recreate updated_at triggers
CREATE OR REPLACE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_workshops_updated_at
  BEFORE UPDATE ON public.workshops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
