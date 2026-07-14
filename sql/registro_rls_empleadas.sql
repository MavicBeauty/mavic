-- MAVIC-17 — Restrict Registro visibility for portal (empleada) users.
-- Applied to prod via Supabase Management API on 2026-07-14.
--
-- Before this: any authenticated profile could SELECT every row of
-- registro_movimientos / registro_ventas / registro_liquidaciones.
-- After this:
--   * Cash drawer (registro_movimientos): admin-only (owner/employee), read and write.
--     The espejo-del-cajón trigger (registro_venta_to_movimiento) is SECURITY DEFINER,
--     so cash sales registered by empleadas still auto-create drawer movements.
--   * Sales (registro_ventas): admins see all; portal users only rows where they are
--     the empleada. Portal users can only INSERT sales attributed to themselves.
--   * Liquidaciones: admins see all; portal users only their own.
--   * registro_productos unchanged (any authenticated reads — needed for the sale form).

-- ── Cash drawer: admin-only ─────────────────────────────────────────
drop policy if exists registro_select_all on registro_movimientos;
drop policy if exists registro_insert_own on registro_movimientos;

create policy registro_select_admin on registro_movimientos
  for select to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

create policy registro_insert_admin on registro_movimientos
  for insert to authenticated
  with check (
    quien_registro = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

-- ── Sales: own rows for portal, all for admin ───────────────────────
drop policy if exists ventas_select on registro_ventas;
create policy ventas_select on registro_ventas
  for select to authenticated
  using (
    empleada_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

drop policy if exists ventas_insert_own on registro_ventas;
create policy ventas_insert_own on registro_ventas
  for insert to authenticated
  with check (
    quien_registro = auth.uid()
    and (
      empleada_id = auth.uid()
      or exists (
        select 1 from profiles
        where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
      )
    )
  );

-- ── Liquidaciones: own rows for portal, all for admin ───────────────
drop policy if exists liquidaciones_select on registro_liquidaciones;
create policy liquidaciones_select on registro_liquidaciones
  for select to authenticated
  using (
    empleada_id = auth.uid()
    or exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );
