-- ============================================================
-- Nóminas — tabla + RLS + storage bucket
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================

-- 1. Tabla
CREATE TABLE IF NOT EXISTS nominas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     uuid NOT NULL REFERENCES employee_labor_info(id) ON DELETE CASCADE,
  period_month    smallint NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     smallint NOT NULL CHECK (period_year >= 2020),
  file_path       text NOT NULL,
  file_name       text NOT NULL,
  importe_liquido numeric(10,2),
  paid            boolean NOT NULL DEFAULT false,
  paid_at         timestamptz,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- 2. RLS
ALTER TABLE nominas ENABLE ROW LEVEL SECURITY;

-- Admin: acceso total
CREATE POLICY "nominas_admin_all" ON nominas
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Empleada: solo puede leer sus propias nóminas
CREATE POLICY "nominas_employee_read_own" ON nominas
  FOR SELECT TO authenticated
  USING (
    employee_id = (
      SELECT employee_labor_info_id FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );

-- ============================================================
-- 3. Storage bucket "nominas" (privado)
-- Crear el bucket en el Dashboard: Storage → New bucket → "nominas" → Private
-- Después ejecutar estas políticas:
-- ============================================================

-- Admin: subir, leer y eliminar cualquier archivo
CREATE POLICY "nominas_storage_admin_all" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'nominas'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'nominas'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Empleada: solo puede leer archivos de su propia carpeta ({employee_labor_info_id}/...)
CREATE POLICY "nominas_storage_employee_read_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'nominas'
    AND (storage.foldername(name))[1] = (
      SELECT employee_labor_info_id::text FROM profiles
      WHERE profiles.id = auth.uid()
    )
  );
