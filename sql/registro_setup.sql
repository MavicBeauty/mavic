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
  -- Ya no se pide en el alta (columna se conserva sólo para leer histórico;
  -- ver ALTER TABLE ... DROP NOT NULL más abajo).
  categoria       text CHECK (categoria IN (
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

-- 3. Migración — quitar "Categoría" del alta de movimientos (idempotente)
-- La UI dejó de pedir categoría; se conserva la columna para no perder
-- histórico, pero ya no puede ser obligatoria o los inserts nuevos fallarían.
ALTER TABLE registro_movimientos ALTER COLUMN categoria DROP NOT NULL;

-- ============================================================
-- NOTA: registro_ventas y registro_liquidaciones (tablas de "Servicios
-- vendidos", commit 8bafdef) se crearon vía Management API en una sesión
-- anterior pero su DDL nunca se guardó en este repo. Falta de archivo, no
-- de tablas — ambas existen en producción. Ver components/VentasPanel.tsx
-- para las columnas usadas. Pendiente: reconstruir y documentar aquí si se
-- vuelve a tocar ese módulo.
-- ============================================================

-- 4. "Espejo del cajón" — mirror automático de ventas en efectivo (MAVIC-09,
-- batch de auto-movimiento). Preparación de esquema para trazabilidad
-- (liquidaciones y futuro cuadre de caja usarán las mismas columnas).
ALTER TABLE registro_movimientos
  ADD COLUMN IF NOT EXISTS venta_id uuid REFERENCES registro_ventas(id) ON DELETE SET NULL;

ALTER TABLE registro_movimientos
  ADD COLUMN IF NOT EXISTS origen text NOT NULL DEFAULT 'manual' CHECK (origen IN ('manual', 'venta', 'liquidacion'));

-- Trigger: toda venta en efectivo que NO esté en Booksy entra físicamente
-- en el cajón, así que el ledger debe reflejarlo solo. El importe es el
-- precio COMPLETO del servicio (todo el efectivo entra en el cajón, no solo
-- la parte del negocio) — la parte de la empleada se liquida después con
-- dinero del propio cajón (próximo batch). SECURITY DEFINER porque la
-- policy de INSERT de registro_movimientos exige quien_registro = auth.uid();
-- el trigger fija quien_registro/quien_nombre con los datos de quien
-- registró la venta, así que no depende de permisos de quien dispara el
-- trigger.
CREATE OR REPLACE FUNCTION registro_venta_to_movimiento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.metodo_pago = 'efectivo' AND NEW.en_booksy = false THEN
    INSERT INTO registro_movimientos (
      fecha, direccion, importe, nota, quien_registro, quien_nombre, origen, venta_id
    ) VALUES (
      NEW.fecha,
      '+',
      NEW.precio,
      'Venta: ' || NEW.producto_nombre || ' — ' || NEW.empleada_nombre,
      NEW.quien_registro,
      NEW.quien_nombre,
      'venta',
      NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_registro_venta_to_movimiento ON registro_ventas;
CREATE TRIGGER trg_registro_venta_to_movimiento
  AFTER INSERT ON registro_ventas
  FOR EACH ROW
  EXECUTE FUNCTION registro_venta_to_movimiento();
