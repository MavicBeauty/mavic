-- ============================================================
-- Registro — ledger de movimientos de caja (MAVIC-09)
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================
-- Puente ligero, no un sistema completo: solo registra movimientos
-- y expone un saldo corriente. Sin edición ni borrado — un error se
-- corrige con un movimiento nuevo en sentido contrario, no editando
-- el histórico.

-- 1. Tabla
CREATE TABLE IF NOT EXISTS registro_movimientos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha           date NOT NULL DEFAULT CURRENT_DATE,
  direccion       text NOT NULL CHECK (direccion IN ('+', '-')),
  importe         numeric(10,2) NOT NULL CHECK (importe > 0),
  categoria       text NOT NULL CHECK (categoria IN (
                    'Pago Yuranny', 'Pago Angelica', 'Nómina socios', 'Gastos varios', 'Otro'
                  )),
  nota            text,
  -- quien_registro es la FK de integridad; quien_nombre es una copia de
  -- profiles.name en el momento del registro. Se denormaliza a propósito
  -- (mismo patrón que timesheets.employee_name) porque la policy de
  -- "profiles" solo deja leer la fila propia — sin esto, la lista no
  -- podría mostrar el nombre de otras personas que registraron movimientos.
  quien_registro  uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  quien_nombre    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registro_fecha ON registro_movimientos(fecha);

-- 2. RLS
ALTER TABLE registro_movimientos ENABLE ROW LEVEL SECURITY;

-- Acceso sin niveles: José, María, Angelica, Kelly, Keren ven y registran
-- por igual (spec: "sin sistema de permisos nuevo"). Cualquier usuario
-- autenticado con una fila en profiles puede leer todo el ledger.
CREATE POLICY "registro_select_all" ON registro_movimientos
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid())
  );

-- Solo se puede insertar a nombre de uno mismo.
CREATE POLICY "registro_insert_own" ON registro_movimientos
  FOR INSERT TO authenticated
  WITH CHECK (quien_registro = auth.uid());

-- Sin policies de UPDATE/DELETE a propósito — ledger de solo-append.
