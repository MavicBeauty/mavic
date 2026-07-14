-- MAVIC-22/23 — Origen del efectivo al marcar servicios como pagados, con
-- espejo del cajón para liquidaciones.
-- Applied to prod via Supabase Management API on 2026-07-14.
--
-- Reglas:
--   * Al crear una liquidación se indica de dónde sale el efectivo:
--       'cajon' → el dinero sale del cajón del sistema: un trigger inserta
--                 automáticamente el movimiento '-' correspondiente
--                 (append-only, igual que el espejo de ventas).
--       'otro'  → Booksy / banco / otro sitio: el cajón no se toca y la
--                 procedencia queda en efectivo_nota (obligatoria en la UI).
--   * Las liquidaciones históricas (anteriores a este cambio) quedan como
--     'cajon' por el DEFAULT del ALTER — nunca generaron movimiento porque
--     el trigger solo actúa sobre INSERTs nuevos.

alter table registro_liquidaciones
  add column if not exists efectivo_origen text not null default 'cajon'
    check (efectivo_origen in ('cajon', 'otro')),
  add column if not exists efectivo_nota text;

-- Enlace del movimiento a su liquidación (venta_id ya existía para ventas).
alter table registro_movimientos
  add column if not exists liquidacion_id uuid references registro_liquidaciones(id);

-- SECURITY DEFINER: la policy de INSERT de movimientos exige rol admin y
-- quien_registro = auth.uid(); el trigger inserta a nombre de quien pagó.
create or replace function registro_liquidacion_to_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.efectivo_origen = 'cajon' then
    insert into registro_movimientos (direccion, importe, nota, quien_registro, quien_nombre, origen, liquidacion_id)
    values ('-', new.total,
            'Pago comisión a ' || new.empleada_nombre || ' (' || new.num_servicios
              || case when new.num_servicios = 1 then ' servicio)' else ' servicios)' end,
            new.pagado_por, new.pagado_por_nombre, 'liquidacion', new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registro_liquidacion_to_movimiento on registro_liquidaciones;
create trigger trg_registro_liquidacion_to_movimiento
  after insert on registro_liquidaciones
  for each row
  execute function registro_liquidacion_to_movimiento();
