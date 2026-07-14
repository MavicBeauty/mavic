'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MONTHS, fmtEuros, round2, plural } from '@/lib/registro-format';
import MonthNav from '@/components/MonthNav';

interface Venta {
  id: string;
  fecha: string;
  precio: number;
  empleada_id: string;
  empleada_nombre: string;
  parte_empleada: number;
  parte_negocio: number;
  liquidacion_id: string | null;
  metodo_pago: 'efectivo' | 'datafono';
  en_booksy: boolean;
}

interface Bucket {
  count: number;
  total: number;        // PVP cobrado
  parteEmpleada: number;
  parteNegocio: number;
}

const emptyBucket = (): Bucket => ({ count: 0, total: 0, parteEmpleada: 0, parteNegocio: 0 });

function addTo(b: Bucket, v: Venta) {
  b.count += 1;
  b.total = round2(b.total + v.precio);
  b.parteEmpleada = round2(b.parteEmpleada + v.parte_empleada);
  b.parteNegocio = round2(b.parteNegocio + v.parte_negocio);
}

export default function RegistroStats({ isAdmin = false }: { isAdmin?: boolean }) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('registro_ventas')
      .select('id, fecha, precio, empleada_id, empleada_nombre, parte_empleada, parte_negocio, liquidacion_id, metodo_pago, en_booksy');
    type VentaRaw = Omit<Venta, 'precio' | 'parte_empleada' | 'parte_negocio'> & {
      precio: number | string; parte_empleada: number | string; parte_negocio: number | string;
    };
    // numeric columns come back from PostgREST as strings — coerce before summing.
    setVentas(((data as VentaRaw[] | null) ?? []).map(v => ({
      ...v,
      precio: Number(v.precio),
      parte_empleada: Number(v.parte_empleada),
      parte_negocio: Number(v.parte_negocio),
    })));
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return <p className="text-gray-500 py-10 text-center">Cargando...</p>;
  }

  // ── Pendiente de pago (histórico, sin filtro de mes) ─────────────
  interface PendEmpleada {
    nombre: string;
    total: Bucket;
    efectivo: Bucket;
    datafono: Bucket;
  }
  const pendientes = ventas.filter(v => !v.liquidacion_id);
  const pendPorEmpleada = new Map<string, PendEmpleada>();
  for (const v of pendientes) {
    const cur = pendPorEmpleada.get(v.empleada_id)
      ?? { nombre: v.empleada_nombre, total: emptyBucket(), efectivo: emptyBucket(), datafono: emptyBucket() };
    addTo(cur.total, v);
    addTo(v.metodo_pago === 'datafono' ? cur.datafono : cur.efectivo, v);
    pendPorEmpleada.set(v.empleada_id, cur);
  }

  // ── Mes seleccionado ─────────────────────────────────────────────
  const ventasMes = ventas.filter(v => {
    const [y, mo] = v.fecha.split('-').map(Number);
    return y === year && mo === month;
  });

  // Matriz método × Booksy
  const celda = {
    efectivoBooksy: emptyBucket(), efectivoNo: emptyBucket(),
    datafonoBooksy: emptyBucket(), datafonoNo: emptyBucket(),
  };
  for (const v of ventasMes) {
    if (v.metodo_pago === 'datafono') addTo(v.en_booksy ? celda.datafonoBooksy : celda.datafonoNo, v);
    else addTo(v.en_booksy ? celda.efectivoBooksy : celda.efectivoNo, v);
  }
  const filaEfectivo = emptyBucket(); const filaDatafono = emptyBucket(); const totalMes = emptyBucket();
  for (const v of ventasMes) {
    addTo(v.metodo_pago === 'datafono' ? filaDatafono : filaEfectivo, v);
    addTo(totalMes, v);
  }

  // Por empleada (mes)
  interface EmpMes { nombre: string; total: Bucket; pendiente: number; pagado: number }
  const porEmpleadaMes = new Map<string, EmpMes>();
  for (const v of ventasMes) {
    const cur = porEmpleadaMes.get(v.empleada_id) ?? { nombre: v.empleada_nombre, total: emptyBucket(), pendiente: 0, pagado: 0 };
    addTo(cur.total, v);
    if (v.liquidacion_id) cur.pagado = round2(cur.pagado + v.parte_empleada);
    else cur.pendiente = round2(cur.pendiente + v.parte_empleada);
    porEmpleadaMes.set(v.empleada_id, cur);
  }

  // Avisos: datáfono fuera de Booksy (mes) — hay que pasarlos a Booksy
  const datafonoFueraBooksy = celda.datafonoNo;

  const CellContent = ({ b }: { b: Bucket }) => (
    b.count === 0 ? <span className="text-gray-300">—</span> : (
      <>
        <span className="font-bold text-mavic-black tabular-nums">{fmtEuros(b.total)}</span>
        <span className="block text-xs text-gray-500">
          {plural(b.count, 'servicio', 'servicios')} · neg. {fmtEuros(b.parteNegocio)} · emp. {fmtEuros(b.parteEmpleada)}
        </span>
      </>
    )
  );

  // ── Vista portal: solo sus propias estadísticas ──────────────────
  // RLS ya limita `ventas` a las suyas — aquí solo cambia qué se muestra
  // (sin matriz del negocio ni tabla por empleada) y el tono (segunda persona).
  if (!isAdmin) {
    const mes = Array.from(porEmpleadaMes.values())[0];
    return (
      <div>
        {/* Pendiente de cobrar (histórico) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Pendiente de cobrar (todo el histórico)</h2>
          {pendPorEmpleada.size === 0 ? (
            <p className="text-sm text-gray-400">No tienes nada pendiente de cobrar. 🎉</p>
          ) : (
            <div className="space-y-4">
              {Array.from(pendPorEmpleada.entries()).map(([id, p]) => (
                <div key={id}>
                  <p className="text-sm font-bold text-mavic-black mb-1">
                    Tienes {fmtEuros(p.total.parteEmpleada)} pendientes de cobrar ({plural(p.total.count, 'servicio', 'servicios')})
                  </p>
                  <ul className="space-y-1">
                    {p.datafono.count > 0 && (
                      <li className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                        💳 En <span className="font-semibold">datáfono</span> cobraste {fmtEuros(p.datafono.total)}
                        ({plural(p.datafono.count, 'servicio', 'servicios')}) — de eso,{' '}
                        <span className="font-bold">{fmtEuros(p.datafono.parteEmpleada)} pendientes de cobrar</span>.
                      </li>
                    )}
                    {p.efectivo.count > 0 && (
                      <li className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                        💶 En <span className="font-semibold">efectivo</span> cobraste {fmtEuros(p.efectivo.total)}
                        ({plural(p.efectivo.count, 'servicio', 'servicios')}) —{' '}
                        <span className="font-bold">{fmtEuros(p.efectivo.parteEmpleada)} pendientes de cobrar</span>.
                      </li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filtro de mes */}
        <div className="mb-3">
          <MonthNav month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        </div>

        {/* Tu resumen del mes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Servicios del mes</p>
            <p className="text-2xl font-bold text-mavic-black tabular-nums">{totalMes.count}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tus ventas del mes</p>
            <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(totalMes.total)}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tu comisión del mes</p>
            <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(totalMes.parteEmpleada)}</p>
          </div>
        </div>

        {/* Detalle del mes */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 pt-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
              {MONTHS[month - 1]} {year} — Detalle
            </h2>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Servicios</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Cobrado</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Tu parte</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2 font-semibold text-green-700 whitespace-nowrap">💶 Efectivo</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{filaEfectivo.count || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{filaEfectivo.count ? `${fmtEuros(filaEfectivo.total)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-mavic-black tabular-nums">{filaEfectivo.count ? `${fmtEuros(filaEfectivo.parteEmpleada)}` : '—'}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-4 py-2 font-semibold text-blue-700 whitespace-nowrap">💳 Datáfono</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{filaDatafono.count || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{filaDatafono.count ? `${fmtEuros(filaDatafono.total)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-mavic-black tabular-nums">{filaDatafono.count ? `${fmtEuros(filaDatafono.parteEmpleada)}` : '—'}</td>
                </tr>
                <tr className="bg-gray-50 font-bold border-t border-gray-200">
                  <td className="px-4 py-3 text-mavic-black">Total</td>
                  <td className="px-3 py-3 text-right text-mavic-black tabular-nums">{totalMes.count || '—'}</td>
                  <td className="px-3 py-3 text-right text-mavic-black tabular-nums">{totalMes.count ? `${fmtEuros(totalMes.total)}` : '—'}</td>
                  <td className="px-3 py-3 text-right text-mavic-black tabular-nums">{totalMes.count ? `${fmtEuros(totalMes.parteEmpleada)}` : '—'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="px-5 pb-4 flex flex-wrap gap-x-6 gap-y-1">
            <p className="text-sm text-green-700">
              <span className="font-semibold">Ya cobrado este mes:</span> {fmtEuros(mes?.pagado ?? 0)}
            </p>
            <p className="text-sm text-amber-700">
              <span className="font-semibold">Pendiente este mes:</span> {fmtEuros(mes?.pendiente ?? 0)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Lo importante primero: pendiente de pago por método */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Pendiente de pagar (todo el histórico)</h2>
        {pendPorEmpleada.size === 0 ? (
          <p className="text-sm text-gray-400">No hay nada pendiente de pagar. 🎉</p>
        ) : (
          <div className="space-y-4">
            {Array.from(pendPorEmpleada.entries()).map(([id, p]) => (
              <div key={id}>
                <p className="text-sm font-bold text-mavic-black mb-1">
                  {p.nombre} — {fmtEuros(p.total.parteEmpleada)} pendientes ({plural(p.total.count, 'servicio', 'servicios')})
                </p>
                <ul className="space-y-1">
                  {p.datafono.count > 0 && (
                    <li className="text-sm text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      💳 En <span className="font-semibold">datáfono</span> {p.nombre} cobró {fmtEuros(p.datafono.total)}
                      ({plural(p.datafono.count, 'servicio', 'servicios')}) — de eso,{' '}
                      <span className="font-bold">{fmtEuros(p.datafono.parteEmpleada)} pendientes de pagarle</span>{' '}
                      (ese dinero está en el banco, no en la caja).
                    </li>
                  )}
                  {p.efectivo.count > 0 && (
                    <li className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      💶 En <span className="font-semibold">efectivo</span> cobró {fmtEuros(p.efectivo.total)}
                      ({plural(p.efectivo.count, 'servicio', 'servicios')}) —{' '}
                      <span className="font-bold">{fmtEuros(p.efectivo.parteEmpleada)} pendientes de pagarle</span> de la caja.
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Filtro de mes */}
      <div className="mb-3">
        <MonthNav month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
      </div>

      {/* Resumen del mes — antes vivía en la pestaña Servicios (MAVIC-24) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Ventas del mes</p>
          <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(totalMes.total)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Parte negocio</p>
          <p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmtEuros(totalMes.parteNegocio)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Parte empleadas</p>
          <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(totalMes.parteEmpleada)}</p>
        </div>
      </div>

      {/* Aviso Booksy */}
      {datafonoFueraBooksy.count > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4">
          <p className="text-sm text-amber-900">
            ⚠️ Este mes hay <span className="font-bold">{plural(datafonoFueraBooksy.count, 'servicio', 'servicios')} cobrados con datáfono que NO están en Booksy</span>{' '}
            ({fmtEuros(datafonoFueraBooksy.total)}) — hay que pasarlos a Booksy.
          </p>
        </div>
      )}

      {/* Matriz método × Booksy */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            {MONTHS[month - 1]} {year} — ¿Cómo entró el dinero?
          </h2>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700"></th>
                <th className="px-4 py-3 text-left font-semibold text-purple-700">En Booksy</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Fuera de Booksy</th>
                <th className="px-4 py-3 text-left font-semibold text-mavic-black">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-semibold text-green-700 whitespace-nowrap">💶 Efectivo</td>
                <td className="px-4 py-3"><CellContent b={celda.efectivoBooksy} /></td>
                <td className="px-4 py-3"><CellContent b={celda.efectivoNo} /></td>
                <td className="px-4 py-3"><CellContent b={filaEfectivo} /></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap">💳 Datáfono</td>
                <td className="px-4 py-3"><CellContent b={celda.datafonoBooksy} /></td>
                <td className="px-4 py-3"><CellContent b={celda.datafonoNo} /></td>
                <td className="px-4 py-3"><CellContent b={filaDatafono} /></td>
              </tr>
              <tr className="bg-gray-50 font-bold border-t border-gray-200">
                <td className="px-4 py-3 text-mavic-black">Total</td>
                <td className="px-4 py-3">
                  <CellContent b={{
                    count: celda.efectivoBooksy.count + celda.datafonoBooksy.count,
                    total: round2(celda.efectivoBooksy.total + celda.datafonoBooksy.total),
                    parteEmpleada: round2(celda.efectivoBooksy.parteEmpleada + celda.datafonoBooksy.parteEmpleada),
                    parteNegocio: round2(celda.efectivoBooksy.parteNegocio + celda.datafonoBooksy.parteNegocio),
                  }} />
                </td>
                <td className="px-4 py-3">
                  <CellContent b={{
                    count: celda.efectivoNo.count + celda.datafonoNo.count,
                    total: round2(celda.efectivoNo.total + celda.datafonoNo.total),
                    parteEmpleada: round2(celda.efectivoNo.parteEmpleada + celda.datafonoNo.parteEmpleada),
                    parteNegocio: round2(celda.efectivoNo.parteNegocio + celda.datafonoNo.parteNegocio),
                  }} />
                </td>
                <td className="px-4 py-3"><CellContent b={totalMes} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Por empleada (mes) */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-5 pt-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            {MONTHS[month - 1]} {year} — Por empleada
          </h2>
        </div>
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="px-4 py-3 text-left font-semibold text-gray-700">Empleada</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Servicios</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Ventas</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Su parte</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Negocio</th>
                <th className="px-3 py-3 text-right font-semibold text-amber-700">Pendiente</th>
                <th className="px-3 py-3 text-right font-semibold text-green-700">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {porEmpleadaMes.size === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No hay servicios registrados este mes.
                  </td>
                </tr>
              ) : Array.from(porEmpleadaMes.entries()).map(([id, e]) => (
                <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 font-semibold text-gray-700">{e.nombre}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{e.total.count}</td>
                  <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtEuros(e.total.total)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-mavic-black tabular-nums">{fmtEuros(e.total.parteEmpleada)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700 tabular-nums">{fmtEuros(e.total.parteNegocio)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-amber-700 tabular-nums">{e.pendiente > 0 ? `${fmtEuros(e.pendiente)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700 tabular-nums">{e.pagado > 0 ? `${fmtEuros(e.pagado)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
