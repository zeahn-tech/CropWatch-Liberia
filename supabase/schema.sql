-- ====================================================================
-- CropWatch Liberia — Supabase Schema Migration
-- Database: PostgreSQL (Supabase)
-- Target Project: https://fdpikbdoheqezvrbteol.supabase.co
-- ====================================================================

-- 1. PROFILES (Extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'farmer' CHECK (role IN ('farmer', 'expert', 'senior_expert', 'admin')),
  county TEXT NOT NULL DEFAULT 'Bong',
  organization TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are readable by authenticated users"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 2. FARMS
CREATE TABLE IF NOT EXISTS public.farms (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  county TEXT NOT NULL,
  district TEXT NOT NULL,
  size_hectares NUMERIC DEFAULT 1.0,
  soil_type TEXT,
  irrigation_source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.farms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can manage their own farms"
  ON public.farms FOR ALL
  TO authenticated
  USING (auth.uid() = user_id);

-- 3. FIELDS
CREATE TABLE IF NOT EXISTS public.fields (
  id TEXT PRIMARY KEY,
  farm_id TEXT REFERENCES public.farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area_hectares NUMERIC DEFAULT 0.5,
  topography TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can manage fields on their farms"
  ON public.fields FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms WHERE public.farms.id = public.fields.farm_id AND public.farms.user_id = auth.uid()
  ));

-- 4. PLANTINGS
CREATE TABLE IF NOT EXISTS public.plantings (
  id TEXT PRIMARY KEY,
  farm_id TEXT REFERENCES public.farms(id) ON DELETE CASCADE,
  field_id TEXT REFERENCES public.fields(id) ON DELETE SET NULL,
  crop_id TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  variety_name TEXT NOT NULL,
  planting_date DATE NOT NULL,
  expected_harvest_date DATE NOT NULL,
  stage TEXT NOT NULL,
  health_status TEXT NOT NULL DEFAULT 'healthy',
  target_yield_kg NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.plantings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Farmers can manage plantings on their farms"
  ON public.plantings FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.farms WHERE public.farms.id = public.plantings.farm_id AND public.farms.user_id = auth.uid()
  ));

-- 5. OBSERVATIONS
CREATE TABLE IF NOT EXISTS public.observations (
  id TEXT PRIMARY KEY,
  farmer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  planting_id TEXT REFERENCES public.plantings(id) ON DELETE SET NULL,
  crop_name TEXT NOT NULL,
  county TEXT NOT NULL,
  date_recorded TIMESTAMPTZ DEFAULT NOW(),
  image_url TEXT,
  farmer_notes TEXT,
  ai_analysis JSONB,
  severity TEXT DEFAULT 'low',
  status TEXT DEFAULT 'pending_review',
  requires_expert BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Observations are viewable by owner, experts and admins"
  ON public.observations FOR SELECT
  TO authenticated
  USING (
    farmer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('expert', 'senior_expert', 'admin'))
  );

CREATE POLICY "Farmers can insert observations"
  ON public.observations FOR INSERT
  TO authenticated
  WITH CHECK (farmer_id = auth.uid());

-- 6. EXPERT REVIEW CASES
CREATE TABLE IF NOT EXISTS public.expert_cases (
  id TEXT PRIMARY KEY,
  observation_id TEXT REFERENCES public.observations(id) ON DELETE CASCADE,
  farmer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  farmer_name TEXT NOT NULL,
  county TEXT NOT NULL,
  crop_name TEXT NOT NULL,
  assigned_expert_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_expert_name TEXT,
  status TEXT DEFAULT 'open',
  priority TEXT DEFAULT 'medium',
  flag_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.expert_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Expert cases access"
  ON public.expert_cases FOR ALL
  TO authenticated
  USING (
    farmer_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('expert', 'senior_expert', 'admin'))
  );

-- 7. TRIGGER: Auto-create profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, county, organization)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'farmer'),
    COALESCE(NEW.raw_user_meta_data->>'county', 'Bong'),
    NEW.raw_user_meta_data->>'organization'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
