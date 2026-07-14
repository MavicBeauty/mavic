-- MAVIC-25 — Cuadre de caja (verificación de conteo físico vs. saldo calculado).
-- Applied to prod via Supabase Management API on 2026-07-14.
--
-- Reglas:
--   * Un "cuadre" registra un conteo físico del cajón contra el saldo que el
--     ledger dice que debería haber. Dos tipos:
--       'apertura' → al abrir el salón (verifica el cierre de ayer)
--       'cierre'   → botón "Cierre de caja" en Movimientos (típicamente tras
--                    marcar todo pagado)
--   * diferencia = contado − calculado (columna generada; >0 sobra, <0 falta).
--   * Si hay diferencia, un trigger inserta el movimiento de ajuste en el
--     cajón (origen 'cuadre') para que el ledger vuelva a reflejar la
--     realidad física — el historial de cuadres conserva la discrepancia.
--   * Append-only, solo admins (owner/employee), igual que movimientos.

create table if not exists registro_cuadres (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('apertura', 'cierre')),
  saldo_calculado numeric(10,2) not null,
  saldo_contado numeric(10,2) not null check (saldo_contado >= 0),
  diferencia numeric(10,2) generated always as (saldo_contado - saldo_calculado) stored,
  nota text,
  quien_registro uuid not null references profiles(id) on delete restrict,
  quien_nombre text not null,
  created_at timestamptz not null default now()
);

alter table registro_cuadres enable row level security;

create policy cuadres_select_admin on registro_cuadres
  for select using (
    exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

create policy cuadres_insert_admin on registro_cuadres
  for insert with check (
    quien_registro = auth.uid()
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid() and profiles.role in ('owner', 'employee')
    )
  );

-- Sin UPDATE/DELETE a propósito: los cuadres son historial inmutable.

-- Enlace del movimiento de ajuste a su cuadre (mismo patrón que venta_id y
-- liquidacion_id).
alter table registro_movimientos
  add column if not exists cuadre_id uuid references registro_cuadres(id);

alter table registro_movimientos drop constraint registro_movimientos_origen_check;
alter table registro_movimientos add constraint registro_movimientos_origen_check
  check (origen in ('manual', 'venta', 'liquidacion', 'cuadre'));

-- SECURITY DEFINER: igual que los espejos de ventas y liquidaciones — la
-- policy de INSERT de movimientos exige quien_registro = auth.uid() y el
-- trigger inserta en nombre de quien hizo el cuadre.
create or replace function registro_cuadre_to_movimiento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.diferencia <> 0 then
    insert into registro_movimientos (direccion, importe, nota, quien_registro, quien_nombre, origen, cuadre_id)
    values (
      case when new.diferencia > 0 then '+' else '-' end,
      abs(new.diferencia),
      'Ajuste por cuadre de caja: '
        || case when new.diferencia > 0 then 'sobraban ' else 'faltaban ' end
        || to_char(abs(new.diferencia), 'FM999G990D00') || ' €'
        || ' (contado ' || to_char(new.saldo_contado, 'FM999G990D00')
        || ' €, esperado ' || to_char(new.saldo_calculado, 'FM999G990D00') || ' €)',
      new.quien_registro, new.quien_nombre, 'cuadre', new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_registro_cuadre_to_movimiento on registro_cuadres;
create trigger trg_registro_cuadre_to_movimiento
  after insert on registro_cuadres
  for each row
  execute function registro_cuadre_to_movimiento();
