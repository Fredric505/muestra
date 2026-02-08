
-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'technician');

-- Create enum for repair status
CREATE TYPE public.repair_status AS ENUM ('received', 'in_progress', 'ready', 'delivered');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create repair types table
CREATE TABLE public.repair_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  estimated_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on repair_types
ALTER TABLE public.repair_types ENABLE ROW LEVEL SECURITY;

-- Repair types policies
CREATE POLICY "All authenticated users can view repair types"
  ON public.repair_types FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can manage repair types"
  ON public.repair_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default repair types
INSERT INTO public.repair_types (name, description, estimated_price) VALUES
  ('Pantalla', 'Cambio o reparación de pantalla', 50.00),
  ('Batería', 'Cambio de batería', 25.00),
  ('Conector de carga', 'Reparación de puerto de carga', 20.00),
  ('Software', 'Actualización o reparación de software', 15.00),
  ('Cámara', 'Reparación de cámara frontal o trasera', 35.00),
  ('Altavoz', 'Reparación de altavoz o micrófono', 20.00),
  ('Botones', 'Reparación de botones físicos', 15.00),
  ('Otro', 'Otro tipo de reparación', 0.00);

-- Create repairs table
CREATE TABLE public.repairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  device_brand TEXT NOT NULL,
  device_model TEXT NOT NULL,
  device_imei TEXT,
  repair_type_id UUID REFERENCES public.repair_types(id),
  repair_description TEXT,
  technical_notes TEXT,
  status repair_status NOT NULL DEFAULT 'received',
  estimated_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  final_price DECIMAL(10,2),
  deposit DECIMAL(10,2) DEFAULT 0,
  delivery_date DATE,
  delivery_time TIME,
  technician_id UUID REFERENCES auth.users(id),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on repairs
ALTER TABLE public.repairs ENABLE ROW LEVEL SECURITY;

-- Repairs policies - all authenticated can view
CREATE POLICY "All authenticated users can view repairs"
  ON public.repairs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "All authenticated users can insert repairs"
  ON public.repairs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "All authenticated users can update repairs"
  ON public.repairs FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete repairs"
  ON public.repairs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updating timestamps
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_repairs_updated_at
  BEFORE UPDATE ON public.repairs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for auto-creating profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to make first user admin
CREATE OR REPLACE FUNCTION public.make_first_user_admin()
RETURNS TRIGGER AS $$
DECLARE
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.user_roles;
  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for making first user admin
CREATE TRIGGER on_first_user_make_admin
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.make_first_user_admin();

-- Enable realtime for repairs
ALTER PUBLICATION supabase_realtime ADD TABLE public.repairs;
