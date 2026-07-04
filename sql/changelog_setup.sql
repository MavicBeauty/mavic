-- ============================================================
-- Novedades (changelog) — columna de seguimiento de lectura
-- Ejecutar en el SQL Editor de Supabase
-- ============================================================
-- Las novedades en sí viven en código (lib/changelog.ts), no en la base de datos.
-- Esto solo guarda, por usuario, cuándo fue la última vez que abrió el panel.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS changelog_last_seen_at timestamptz;

-- No hace falta ninguna policy de RLS nueva:
-- - La lectura ya la cubre la policy existente "Users can view their own profile".
-- - La escritura pasa por /api/changelog/mark-seen usando la service role key,
--   así que no se necesita (ni se quiere) permitir que un usuario actualice
--   su propia fila de "profiles" directamente desde el cliente.
