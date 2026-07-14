-- Portal permissions (2026-07-14) — per-employee visibility flags for /empleada.
-- Applied to prod via Supabase Management API on 2026-07-14.
--
-- Admins toggle these from /admin/empleados/perfiles (API: /api/admin/employee-account).
-- Defaults are FALSE: a new portal account sees nothing until an admin grants sections.
-- `timesheet_permission` ('read'|'edit') remains the read/edit sub-level under
-- portal_horario (UI-level; signing a timesheet is an UPDATE and must work for
-- 'read' accounts too, so the write policies keep their original shape).

alter table profiles
  add column if not exists portal_registro boolean not null default false,
  add column if not exists portal_nominas boolean not null default false,
  add column if not exists portal_horario boolean not null default false;

-- Seed: the testing portal account keeps full access; the real employees get
-- Nóminas + Horarios (their current sections) but not Registro.
update profiles
  set portal_registro = true, portal_nominas = true, portal_horario = true
  where id = 'ee5543f5-359f-4f05-9b3e-b8ffb93c0f5f';

update profiles
  set portal_nominas = true, portal_horario = true
  where id in (
    '2f3203c3-492e-425b-a2f0-82c44afa30ac',
    'f35995e6-121f-4906-9cf6-733f13dd9c20'
  );

-- ── Registro: portal access requires portal_registro ────────────────
drop policy if exists ventas_select on registro_ventas;
create policy ventas_select on registro_ventas
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_ventas.empleada_id = p.id and p.portal_registro))
    )
  );

drop policy if exists ventas_insert_own on registro_ventas;
create policy ventas_insert_own on registro_ventas
  for insert to authenticated
  with check (
    quien_registro = auth.uid()
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_ventas.empleada_id = p.id and p.portal_registro))
    )
  );

drop policy if exists liquidaciones_select on registro_liquidaciones;
create policy liquidaciones_select on registro_liquidaciones
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_liquidaciones.empleada_id = p.id and p.portal_registro))
    )
  );

drop policy if exists liquidaciones_update on registro_liquidaciones;
create policy liquidaciones_update on registro_liquidaciones
  for update to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_liquidaciones.empleada_id = p.id and p.portal_registro))
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_liquidaciones.empleada_id = p.id and p.portal_registro))
    )
  );

drop policy if exists productos_select on registro_productos;
create policy productos_select on registro_productos
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee') or p.portal_registro)
    )
  );

-- ── Nóminas: portal read requires portal_nominas ────────────────────
drop policy if exists nominas_employee_read_own on nominas;
create policy nominas_employee_read_own on nominas
  for select to authenticated
  using (
    employee_id = (
      select employee_labor_info_id from profiles
      where id = auth.uid() and portal_nominas
    )
  );

-- ── Horarios: portal access requires portal_horario ─────────────────
-- Same four policies as before, each with the portal_horario gate added.
drop policy if exists "Portal employees can view own timesheets" on timesheets;
create policy "Portal employees can view own timesheets" on timesheets
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      join employee_labor_info eli on eli.id = p.employee_labor_info_id
      where p.id = auth.uid() and p.role = 'portal'
        and eli.display_name = timesheets.employee_name
        and p.portal_horario
    )
  );

drop policy if exists "Portal employees can insert own timesheets" on timesheets;
create policy "Portal employees can insert own timesheets" on timesheets
  for insert to authenticated
  with check (
    exists (
      select 1 from profiles p
      join employee_labor_info eli on eli.id = p.employee_labor_info_id
      where p.id = auth.uid() and p.role = 'portal'
        and eli.display_name = timesheets.employee_name
        and p.timesheet_permission = 'edit'
        and p.portal_horario
    )
  );

drop policy if exists "Portal employees can update own timesheets" on timesheets;
create policy "Portal employees can update own timesheets" on timesheets
  for update to authenticated
  using (
    exists (
      select 1 from profiles p
      join employee_labor_info eli on eli.id = p.employee_labor_info_id
      where p.id = auth.uid() and p.role = 'portal'
        and eli.display_name = timesheets.employee_name
        and p.timesheet_permission = 'edit'
        and p.portal_horario
    )
  );

drop policy if exists "Portal users can manage their own timesheets" on timesheets;
create policy "Portal users can manage their own timesheets" on timesheets
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      join employee_labor_info eli on eli.id = p.employee_labor_info_id
      where p.id = auth.uid() and p.role = 'portal'
        and eli.display_name = timesheets.employee_name
        and p.portal_horario
    )
  );
