-- MAVIC Beauty & Nails Database Schema
-- Run this entire script in Supabase SQL Editor

-- ============================================
-- 1. PROFILES (Admin/Employee users)
-- ============================================
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'employee')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Owners can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 2. CLIENTS (Beauty salon customers)
-- ============================================
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  apellidos text,
  phone text NOT NULL,
  dni text,
  fecha_nacimiento text,
  direccion text,
  poblacion text,
  cp text,
  provincia text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_clients_phone ON clients(phone);
CREATE INDEX idx_clients_name ON clients(name);

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all clients" ON clients
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can insert clients" ON clients
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can update clients" ON clients
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

-- ============================================
-- 3. CONSENT FORMS (1 per client, laser consent)
-- ============================================
CREATE TABLE consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filled_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  form_data jsonb NOT NULL,
  doc_storage_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id)
);

CREATE INDEX idx_consent_client ON consent_forms(client_id);
CREATE INDEX idx_consent_created ON consent_forms(created_at);

ALTER TABLE consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view consent forms" ON consent_forms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can insert consent forms" ON consent_forms
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can update consent forms" ON consent_forms
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

-- ============================================
-- 4. CLINICAL SESSIONS (Many per client, laser history)
-- ============================================
CREATE TABLE clinical_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  filled_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  session_date date NOT NULL,
  form_data jsonb NOT NULL,
  doc_storage_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_sessions_client ON clinical_sessions(client_id);
CREATE INDEX idx_sessions_date ON clinical_sessions(session_date);
CREATE INDEX idx_sessions_created ON clinical_sessions(created_at);

ALTER TABLE clinical_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view sessions" ON clinical_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can insert sessions" ON clinical_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Admins can update sessions" ON clinical_sessions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

-- ============================================
-- 5. SERVICES (Pricing & service catalog)
-- ============================================
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name_es text NOT NULL,
  name_ca text NOT NULL,
  price numeric NOT NULL,
  price_note_es text,
  price_note_ca text,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_services_category ON services(category);
CREATE INDEX idx_services_active ON services(is_active);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active services" ON services
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage services" ON services
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 6. PROMOTIONS (Special offers)
-- ============================================
CREATE TABLE promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_es text NOT NULL,
  title_ca text NOT NULL,
  description_es text,
  description_ca text,
  price numeric,
  valid_until date,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_promotions_active ON promotions(is_active);
CREATE INDEX idx_promotions_valid_until ON promotions(valid_until);

ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view active promotions" ON promotions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Owners can manage promotions" ON promotions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 7. GIFT CARDS (Customer requests & admin mgmt)
-- ============================================
CREATE TABLE gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  amount numeric NOT NULL,
  sender_name text,
  receiver_name text,
  message text,
  delivery_type text NOT NULL CHECK (delivery_type IN ('digital', 'physical')),
  payment_method text NOT NULL CHECK (payment_method IN ('cash', 'card', 'transfer')),
  customer_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'sent', 'cancelled')),
  gc_number text,
  card_image_path text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_created ON gift_cards(created_at);

ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can insert gift cards" ON gift_cards
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all gift cards" ON gift_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Owners can update gift cards" ON gift_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'owner'
    )
  );

-- ============================================
-- 8. TIMESHEETS (Employee work hours - admin only)
-- ============================================
CREATE TABLE timesheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_name text NOT NULL,
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_year integer NOT NULL CHECK (period_year >= 2024),
  day_entries jsonb,
  observations text,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(employee_name, period_month, period_year)
);

CREATE INDEX idx_timesheets_employee ON timesheets(employee_name);
CREATE INDEX idx_timesheets_period ON timesheets(period_year, period_month);

ALTER TABLE timesheets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view all timesheets" ON timesheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

CREATE POLICY "Owners can manage timesheets" ON timesheets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'employee')
    )
  );

-- ============================================
-- Create triggers for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_consent_forms_updated_at BEFORE UPDATE ON consent_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clinical_sessions_updated_at BEFORE UPDATE ON clinical_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gift_cards_updated_at BEFORE UPDATE ON gift_cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. EMPLOYEE LABOR INFO (for timesheet PDF generation)
-- ============================================
CREATE TABLE employee_labor_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  nombre_completo text NOT NULL,
  nif text NOT NULL,
  num_afiliacion_ss text,
  puesto_trabajo text,
  categoria text,
  grupo_cotizacion text,
  fecha_antiguedad text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE employee_labor_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage employee labor info" ON employee_labor_info
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'employee'))
  );

CREATE TRIGGER update_employee_labor_info_updated_at
  BEFORE UPDATE ON employee_labor_info
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 10. CLIENT ATTACHMENTS (optional sub-files per client)
-- ============================================
CREATE TABLE client_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_attachments_client ON client_attachments(client_id);

ALTER TABLE client_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view attachments" ON client_attachments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'employee'))
  );

CREATE POLICY "Admins can insert attachments" ON client_attachments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'employee'))
  );

CREATE POLICY "Admins can delete attachments" ON client_attachments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner', 'employee'))
  );

-- ============================================
-- Done! All tables created with RLS policies
-- ============================================

-- 2026-06-18: add contracted weekly hours to employee profiles
ALTER TABLE employee_labor_info ADD COLUMN weekly_hours integer;
