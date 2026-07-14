-- MAVIC-26 — Editar servicios vendidos mientras NO estén liquidados, con
-- historial de cambios (auditoría) y ajuste automático del espejo del cajón.
-- Applied to prod via Supabase Management API on 2026-07-14.
--
-- Reglas:
--   * Solo se puede editar un servicio con liquidacion_id NULL (sin pagar).
--     Lo garantiza un trigger BEFORE UPDATE para TODOS los roles (la policy
--     de admin permite cualquier UPDATE porque "marcar pagado" la necesita).
--   * Admins editan cualquier venta sin pagar; una empleada portal solo las
--     suyas (nueva policy ventas_update_own_unpaid).
--   * Cada edición queda registrada en registro_ventas_ediciones vía trigger
--     (el cliente nunca escribe la auditoría directamente).
--   * El cajón es append-only: si la edición cambia cuánto efectivo entró
--     (precio, metodo_pago, en_booksy), un trigger inserta el movimiento de
--     corrección correspondiente — nunca se edita el movimiento original.
--
-- NOTA drift: la policy ventas_update_admin (UPDATE libre para owner/employee)
-- ya existía en prod pero no estaba en ningún archivo de sql/. Se documenta
-- aquí (idempotente) para cerrar ese hueco:
drop policy if exists ventas_update_admin on registro_ventas;
create policy ventas_update_admin on registro_ventas
  for update to authenticated
  using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  )
  with check (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

-- ── 1. Tabla de auditoría ────────────────────────────────────────────
-- empleada_id se denormaliza de la venta para que la policy de SELECT no
-- tenga que anidar RLS sobre registro_ventas.
create table if not exists registro_ventas_ediciones (
  id                  uuid primary key default gen_random_uuid(),
  venta_id            uuid not null references registro_ventas(id) on delete cascade,
  empleada_id         uuid not null,
  editado_por         uuid,
  editado_por_nombre  text not null,
  editado_at          timestamptz not null default now(),
  -- Array de objetos { campo, antes, despues } — solo los campos que cambiaron.
  cambios             jsonb not null
);

create index if not exists idx_ventas_ediciones_venta on registro_ventas_ediciones(venta_id);

alter table registro_ventas_ediciones enable row level security;

-- Lectura: admins todo; portal solo la historia de sus propias ventas.
drop policy if exists ventas_ediciones_select on registro_ventas_ediciones;
create policy ventas_ediciones_select on registro_ventas_ediciones
  for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and (p.role in ('owner', 'employee')
             or (registro_ventas_ediciones.empleada_id = p.id and p.portal_registro))
    )
  );

-- Sin policies de INSERT/UPDATE/DELETE a propósito: solo escribe el trigger
-- (SECURITY DEFINER). La auditoría es inmutable.

-- ── 2. Policy UPDATE para portal (solo sus ventas sin pagar) ─────────
drop policy if exists ventas_update_own_unpaid on registro_ventas;
create policy ventas_update_own_unpaid on registro_ventas
  for update to authenticated
  using (
    liquidacion_id is null
    and exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and registro_ventas.empleada_id = p.id
        and p.portal_registro
    )
  )
  with check (
    liquidacion_id is null
    and empleada_id = auth.uid()
  );

-- ── 3. Guard BEFORE UPDATE — candado de campos y de estado ───────────
-- * Un servicio liquidado no admite cambios de contenido (solo transiciones
--   de liquidacion_id, p.ej. "marcar pagado" toca solo esa columna).
-- * quien_registro es inmutable para todos.
-- * Reasignar la empleada solo puede hacerlo un admin.
create or replace function registro_ventas_guard_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  contenido_cambio boolean;
  es_admin boolean;
begin
  contenido_cambio :=
       new.fecha            is distinct from old.fecha
    or new.producto_id      is distinct from old.producto_id
    or new.producto_nombre  is distinct from old.producto_nombre
    or new.precio           is distinct from old.precio
    or new.empleada_id      is distinct from old.empleada_id
    or new.empleada_nombre  is distinct from old.empleada_nombre
    or new.comision_pct     is distinct from old.comision_pct
    or new.parte_empleada   is distinct from old.parte_empleada
    or new.parte_negocio    is distinct from old.parte_negocio
    or new.metodo_pago      is distinct from old.metodo_pago
    or new.en_booksy        is distinct from old.en_booksy
    or new.nota             is distinct from old.nota;

  if old.liquidacion_id is not null and contenido_cambio then
    raise exception 'No se puede editar un servicio ya liquidado';
  end if;

  if new.quien_registro is distinct from old.quien_registro then
    raise exception 'quien_registro no se puede modificar';
  end if;

  if new.empleada_id is distinct from old.empleada_id then
    select exists (
      select 1 from profiles
      where id = auth.uid() and role in ('owner', 'employee')
    ) into es_admin;
    if not es_admin then
      raise exception 'Solo un admin puede reasignar la empleada de un servicio';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_registro_ventas_guard_edit on registro_ventas;
create trigger trg_registro_ventas_guard_edit
  before update on registro_ventas
  for each row
  execute function registro_ventas_guard_edit();

-- ── 4. AFTER UPDATE — auditoría + corrección del cajón ───────────────
-- SECURITY DEFINER: escribe en la tabla de auditoría (sin policy de INSERT)
-- y en registro_movimientos (policy de INSERT exige quien_registro=auth.uid()
-- y rol admin — el trigger inserta a nombre de quien editó, sea quien sea).
create or replace function registro_ventas_after_edit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cambios jsonb := '[]'::jsonb;
  editor_id uuid := auth.uid();
  editor_nombre text;
  old_cash boolean := old.metodo_pago = 'efectivo' and old.en_booksy = false;
  new_cash boolean := new.metodo_pago = 'efectivo' and new.en_booksy = false;
begin
  if new.fecha is distinct from old.fecha then
    cambios := cambios || jsonb_build_object('campo','fecha','antes',old.fecha::text,'despues',new.fecha::text);
  end if;
  if new.producto_nombre is distinct from old.producto_nombre then
    cambios := cambios || jsonb_build_object('campo','producto','antes',old.producto_nombre,'despues',new.producto_nombre);
  end if;
  if new.precio is distinct from old.precio then
    cambios := cambios || jsonb_build_object('campo','precio','antes',old.precio::text,'despues',new.precio::text);
  end if;
  if new.empleada_nombre is distinct from old.empleada_nombre then
    cambios := cambios || jsonb_build_object('campo','empleada','antes',old.empleada_nombre,'despues',new.empleada_nombre);
  end if;
  if new.comision_pct is distinct from old.comision_pct then
    cambios := cambios || jsonb_build_object('campo','comision','antes',old.comision_pct::text,'despues',new.comision_pct::text);
  end if;
  if new.metodo_pago is distinct from old.metodo_pago then
    cambios := cambios || jsonb_build_object('campo','pago','antes',old.metodo_pago,'despues',new.metodo_pago);
  end if;
  if new.en_booksy is distinct from old.en_booksy then
    cambios := cambios || jsonb_build_object('campo','booksy','antes',case when old.en_booksy then 'sí' else 'no' end,'despues',case when new.en_booksy then 'sí' else 'no' end);
  end if;
  if new.nota is distinct from old.nota then
    cambios := cambios || jsonb_build_object('campo','nota','antes',coalesce(old.nota,''),'despues',coalesce(new.nota,''));
  end if;

  -- Solo ediciones de contenido dejan huella ("marcar pagado" no pasa por aquí).
  if jsonb_array_length(cambios) = 0 then
    return new;
  end if;

  select name into editor_nombre from profiles where id = editor_id;

  insert into registro_ventas_ediciones (venta_id, empleada_id, editado_por, editado_por_nombre, cambios)
  values (new.id, new.empleada_id, editor_id, coalesce(editor_nombre, 'sistema'), cambios);

  -- Corrección del espejo del cajón (append-only): la fecha del movimiento es
  -- la de HOY (cuándo se corrigió el cajón), no la de la venta — mismo criterio
  -- que una corrección manual.
  if old_cash and not new_cash then
    insert into registro_movimientos (direccion, importe, nota, quien_registro, quien_nombre, origen, venta_id)
    values ('-', old.precio,
            'Corrección venta (ya no es efectivo en cajón): ' || new.producto_nombre || ' — ' || new.empleada_nombre,
            coalesce(editor_id, new.quien_registro), coalesce(editor_nombre, new.quien_nombre), 'venta', new.id);
  elsif new_cash and not old_cash then
    insert into registro_movimientos (direccion, importe, nota, quien_registro, quien_nombre, origen, venta_id)
    values ('+', new.precio,
            'Corrección venta (ahora es efectivo en cajón): ' || new.producto_nombre || ' — ' || new.empleada_nombre,
            coalesce(editor_id, new.quien_registro), coalesce(editor_nombre, new.quien_nombre), 'venta', new.id);
  elsif old_cash and new_cash and new.precio is distinct from old.precio then
    insert into registro_movimientos (direccion, importe, nota, quien_registro, quien_nombre, origen, venta_id)
    values (case when new.precio > old.precio then '+' else '-' end,
            abs(new.precio - old.precio),
            'Corrección venta (precio ' || old.precio || '€ → ' || new.precio || '€): ' || new.producto_nombre || ' — ' || new.empleada_nombre,
            coalesce(editor_id, new.quien_registro), coalesce(editor_nombre, new.quien_nombre), 'venta', new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_registro_ventas_after_edit on registro_ventas;
create trigger trg_registro_ventas_after_edit
  after update on registro_ventas
  for each row
  execute function registro_ventas_after_edit();
