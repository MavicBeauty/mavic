'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Venta {
  id: string;
  fecha: string;
  producto_nombre: string;
  precio: number;
  empleada_id: string;
  empleada_nombre: string;
  comision_pct: number;
  parte_empleada: number;
  parte_negocio: number;
  nota: string | null;
  quien_nombre: string;
  liquidacion_id: string | null;
  metodo_pago: 'efectivo' | 'datafono';
  en_booksy: boolean;
  created_at: string;
}

interface Liquidacion {
  id: string;
  empleada_id: string;
  empleada_nombre: string;
  total: number;
  num_servicios: number;
  pagado_por_nombre: string;
  pagado_at: string;
  recibido_por_nombre: string | null;
  recibido_at: string | null;
}

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
}

interface Empleada {
  id: string;
  name: string;
  comision_pct: number | null;
}

interface VentasPanelProps {
  profile: { id: string; name: string };
  isAdmin: boolean;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

type SortKey = 'fecha-desc' | 'fecha-asc' | 'importe-desc' | 'importe-asc' | 'empleada' | 'estado';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'fecha-desc',   label: 'Fecha ↓ (recientes primero)' },
  { value: 'fecha-asc',    label: 'Fecha ↑' },
  { value: 'importe-desc', label: 'Importe ↓' },
  { value: 'importe-asc',  label: 'Importe ↑' },
  { value: 'empleada',     label: 'Empleada' },
  { value: 'estado',       label: 'Estado (pendientes primero)' },
];

function fmtEuros(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(fecha: string) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function fmtFechaHora(ts: string) {
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export default function VentasPanel({ profile, isAdmin }: VentasPanelProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [empleadas, setEmpleadas] = useState<Empleada[]>([]);
  const [msg, setMsg] = useState('');

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const [sort, setSort] = useState<SortKey>('fecha-desc');

  // Formulario nueva venta
  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [productoId, setProductoId] = useState('');
  const [precio, setPrecio] = useState('');
  const [empleadaId, setEmpleadaId] = useState('');
  const [pct, setPct] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'datafono'>('efectivo');
  const [enBooksy, setEnBooksy] = useState(false);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);

  // Selección para liquidar (solo admin)
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [pagando, setPagando] = useState(false);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const load = useCallback(async () => {
    const [ventasRes, liqRes, prodRes, empRes] = await Promise.all([
      supabase
        .from('registro_ventas')
        .select('id, fecha, producto_nombre, precio, empleada_id, empleada_nombre, comision_pct, parte_empleada, parte_negocio, nota, quien_nombre, liquidacion_id, metodo_pago, en_booksy, created_at')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('registro_liquidaciones')
        .select('id, empleada_id, empleada_nombre, total, num_servicios, pagado_por_nombre, pagado_at, recibido_por_nombre, recibido_at')
        .order('pagado_at', { ascending: false }),
      supabase
        .from('registro_productos')
        .select('id, nombre, categoria, precio')
        .eq('activo', true)
        .order('categoria')
        .order('nombre'),
      supabase
        .from('profiles')
        .select('id, name, comision_pct')
        .eq('role', 'portal')
        .eq('portal_registro', true)
        .order('name'),
    ]);
    // numeric columns come back from PostgREST as strings — coerce before summing.
    type VentaRaw = Omit<Venta, 'precio' | 'comision_pct' | 'parte_empleada' | 'parte_negocio'> & {
      precio: number | string; comision_pct: number | string; parte_empleada: number | string; parte_negocio: number | string;
    };
    setVentas(((ventasRes.data as VentaRaw[] | null) ?? []).map(v => ({
      ...v,
      precio: Number(v.precio),
      comision_pct: Number(v.comision_pct),
      parte_empleada: Number(v.parte_empleada),
      parte_negocio: Number(v.parte_negocio),
    })));
    type LiqRaw = Omit<Liquidacion, 'total'> & { total: number | string };
    setLiquidaciones(((liqRes.data as LiqRaw[] | null) ?? []).map(l => ({ ...l, total: Number(l.total) })));
    type ProdRaw = Omit<Producto, 'precio'> & { precio: number | string };
    setProductos(((prodRes.data as ProdRaw[] | null) ?? []).map(p => ({ ...p, precio: Number(p.precio) })));
    type EmpRaw = Omit<Empleada, 'comision_pct'> & { comision_pct: number | string | null };
    setEmpleadas(((empRes.data as EmpRaw[] | null) ?? []).map(e => ({
      ...e,
      comision_pct: e.comision_pct === null ? null : Number(e.comision_pct),
    })));
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  // Defaults del formulario: empleada fija para portal, % según la empleada elegida
  useEffect(() => {
    if (!isAdmin && !empleadaId) setEmpleadaId(profile.id);
  }, [isAdmin, empleadaId, profile.id]);

  const empleadaSel = empleadas.find(e => e.id === empleadaId)
    ?? (!isAdmin ? { id: profile.id, name: profile.name, comision_pct: null } : undefined);

  const handleEmpleadaChange = (id: string) => {
    setEmpleadaId(id);
    const emp = empleadas.find(e => e.id === id);
    setPct(emp?.comision_pct != null ? String(emp.comision_pct) : '');
  };

  const handleProductoChange = (id: string) => {
    setProductoId(id);
    const prod = productos.find(p => p.id === id);
    if (prod) setPrecio(String(prod.precio));
  };

  // Cuando cargan las empleadas, precargar el % de la empleada por defecto (lado portal)
  useEffect(() => {
    if (!isAdmin && empleadaId && pct === '') {
      const emp = empleadas.find(e => e.id === empleadaId);
      if (emp?.comision_pct != null) setPct(String(emp.comision_pct));
    }
  }, [empleadas, isAdmin, empleadaId]); // eslint-disable-line react-hooks/exhaustive-deps

  const precioNum = parseFloat(precio) || 0;
  const pctNum = parseFloat(pct) || 0;
  const parteEmpleadaPreview = round2(precioNum * pctNum / 100);
  const parteNegocioPreview = round2(precioNum - parteEmpleadaPreview);
  const pctDefecto = empleadaSel?.comision_pct;
  const esManual = pct !== '' && pctDefecto != null && parseFloat(pct) !== pctDefecto;

  const handleAddVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = productos.find(p => p.id === productoId);
    if (!prod) { flash('Error: elige un producto'); return; }
    if (!empleadaSel) { flash('Error: elige una empleada'); return; }
    if (!precioNum || precioNum <= 0) { flash('Error: precio inválido'); return; }
    if (pctNum < 0 || pctNum > 100) { flash('Error: % inválido (0-100)'); return; }
    setSaving(true);
    const { error } = await supabase.from('registro_ventas').insert({
      fecha,
      producto_id: prod.id,
      producto_nombre: prod.nombre,
      precio: precioNum,
      empleada_id: empleadaSel.id,
      empleada_nombre: empleadaSel.name,
      comision_pct: pctNum,
      parte_empleada: parteEmpleadaPreview,
      parte_negocio: parteNegocioPreview,
      nota: nota.trim() || null,
      metodo_pago: metodoPago,
      en_booksy: enBooksy,
      quien_registro: profile.id,
      quien_nombre: profile.name,
    });
    setSaving(false);
    if (error) { flash(`Error: ${error.message}`); return; }
    flash('✓ Servicio registrado');
    setProductoId('');
    setPrecio('');
    setNota('');
    setMetodoPago('efectivo');
    setEnBooksy(false);
    load();
  };

  // ── Totales ──────────────────────────────────────────────────────
  const ventasMes = ventas.filter(v => {
    const [y, mo] = v.fecha.split('-').map(Number);
    return y === year && mo === month;
  });
  const totalMes = ventasMes.reduce((s, v) => s + v.precio, 0);
  const parteNegocioMes = ventasMes.reduce((s, v) => s + v.parte_negocio, 0);
  const parteEmpleadasMes = ventasMes.reduce((s, v) => s + v.parte_empleada, 0);

  // Pendiente de pago por empleada (histórico, sin filtro de mes)
  const pendientes = ventas.filter(v => !v.liquidacion_id);
  const pendientePorEmpleada = new Map<string, { nombre: string; total: number; count: number }>();
  for (const v of pendientes) {
    const cur = pendientePorEmpleada.get(v.empleada_id) ?? { nombre: v.empleada_nombre, total: 0, count: 0 };
    cur.total = round2(cur.total + v.parte_empleada);
    cur.count += 1;
    pendientePorEmpleada.set(v.empleada_id, cur);
  }

  // ── Orden de la lista ────────────────────────────────────────────
  const estadoDe = (v: Venta): { orden: number; texto: string; detalle: string | null } => {
    if (!v.liquidacion_id) return { orden: 0, texto: 'Pendiente', detalle: null };
    const liq = liquidaciones.find(l => l.id === v.liquidacion_id);
    if (!liq) return { orden: 1, texto: 'Pagado', detalle: null };
    if (liq.recibido_at) return { orden: 2, texto: 'Recibido', detalle: fmtFechaHora(liq.recibido_at) };
    return { orden: 1, texto: 'Pagado', detalle: fmtFechaHora(liq.pagado_at) };
  };

  const ventasOrdenadas = [...ventasMes].sort((a, b) => {
    switch (sort) {
      case 'fecha-asc':    return a.fecha.localeCompare(b.fecha) || a.created_at.localeCompare(b.created_at);
      case 'importe-desc': return b.precio - a.precio;
      case 'importe-asc':  return a.precio - b.precio;
      case 'empleada':     return a.empleada_nombre.localeCompare(b.empleada_nombre) || b.fecha.localeCompare(a.fecha);
      case 'estado':       return estadoDe(a).orden - estadoDe(b).orden || b.fecha.localeCompare(a.fecha);
      default:             return b.fecha.localeCompare(a.fecha) || b.created_at.localeCompare(a.created_at);
    }
  });

  // ── Selección y liquidación (admin) ──────────────────────────────
  const toggleSel = (id: string) => {
    setSeleccion(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const ventasSel = ventas.filter(v => seleccion.has(v.id) && !v.liquidacion_id);
  const empleadasEnSel = new Set(ventasSel.map(v => v.empleada_id));
  const selValida = ventasSel.length > 0 && empleadasEnSel.size === 1;
  const totalSel = round2(ventasSel.reduce((s, v) => s + v.parte_empleada, 0));

  const handleMarcarPagado = async () => {
    if (!selValida) return;
    setPagando(true);
    const empId = ventasSel[0].empleada_id;
    const { data: liq, error } = await supabase
      .from('registro_liquidaciones')
      .insert({
        empleada_id: empId,
        empleada_nombre: ventasSel[0].empleada_nombre,
        total: totalSel,
        num_servicios: ventasSel.length,
        pagado_por: profile.id,
        pagado_por_nombre: profile.name,
      })
      .select('id')
      .single();
    if (error || !liq) {
      setPagando(false);
      flash(`Error: ${error?.message ?? 'no se pudo crear la liquidación'}`);
      return;
    }
    const ids = ventasSel.map(v => v.id);
    const { data: updated, error: updErr } = await supabase
      .from('registro_ventas')
      .update({ liquidacion_id: (liq as { id: string }).id })
      .in('id', ids)
      .is('liquidacion_id', null)
      .select('id');
    setPagando(false);
    if (updErr) { flash(`Error: ${updErr.message}`); return; }
    const n = (updated as Array<{ id: string }> | null)?.length ?? 0;
    if (n !== ids.length) {
      flash(`Aviso: solo ${n} de ${ids.length} servicios se marcaron — recarga y revisa`);
    } else {
      flash(`✓ Pagado: ${fmtEuros(totalSel)} € (${ids.length} servicios)`);
    }
    setSeleccion(new Set());
    load();
  };

  const handleConfirmarRecibido = async (liqId: string) => {
    setConfirmando(liqId);
    const { error } = await supabase
      .from('registro_liquidaciones')
      .update({
        recibido_por: profile.id,
        recibido_por_nombre: profile.name,
        recibido_at: new Date().toISOString(),
      })
      .eq('id', liqId)
      .is('recibido_at', null);
    setConfirmando(null);
    if (error) { flash(`Error: ${error.message}`); return; }
    flash('✓ Confirmado como recibido');
    load();
  };

  if (loading) {
    return <p className="text-gray-500 py-10 text-center">Cargando...</p>;
  }

  const inputCls = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink';

  return (
    <div>
      {msg && (
        <p className={`mb-4 text-sm font-semibold ${msg.startsWith('Error') || msg.startsWith('Aviso') ? 'text-red-600' : 'text-green-600'}`}>
          {msg}
        </p>
      )}

      {/* Totales del mes + pendientes — la vista portal solo recibe (RLS) y muestra lo suyo */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-3' : 'sm:grid-cols-2'} gap-3 mb-5`}>
        <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-l-gray-300">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{isAdmin ? 'Ventas del mes' : 'Tus ventas del mes'}</p>
          <p className="text-2xl font-bold text-mavic-black">{fmtEuros(totalMes)} €</p>
        </div>
        {isAdmin && (
          <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-l-emerald-400">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Parte negocio</p>
            <p className="text-2xl font-bold text-emerald-700">{fmtEuros(parteNegocioMes)} €</p>
          </div>
        )}
        <div className="bg-white rounded-lg shadow-lg p-4 border-l-4 border-l-mavic-gold">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{isAdmin ? 'Parte empleadas' : 'Tu comisión del mes'}</p>
          <p className="text-2xl font-bold text-mavic-black">{fmtEuros(parteEmpleadasMes)} €</p>
        </div>
      </div>

      {pendientePorEmpleada.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">{isAdmin ? 'Pendiente de pago (histórico)' : 'Pendiente de cobrar (histórico)'}</p>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            {Array.from(pendientePorEmpleada.entries()).map(([id, p]) => (
              <p key={id} className="text-sm text-amber-900">
                <span className="font-bold">{p.nombre}:</span> {fmtEuros(p.total)} € ({p.count} {p.count === 1 ? 'servicio' : 'servicios'})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Nueva venta */}
      <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-mavic-pink">
        <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Registrar servicio vendido</h2>
        <form onSubmit={handleAddVenta} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className={inputCls} />
            </div>
            <div className="flex-1 min-w-52">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Producto</label>
              <select value={productoId} onChange={e => handleProductoChange(e.target.value)} required className={`w-full ${inputCls}`}>
                <option value="">— Elegir —</option>
                {Array.from(new Set(productos.map(p => p.categoria))).map(cat => (
                  <optgroup key={cat} label={cat}>
                    {productos.filter(p => p.categoria === cat).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} — {fmtEuros(p.precio)} €</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio €</label>
              <input type="number" step="0.01" min="0.01" value={precio} onChange={e => setPrecio(e.target.value)} required placeholder="0,00" className={`w-24 ${inputCls}`} />
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">¿Cómo se cobró?</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setMetodoPago('efectivo')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                    metodoPago === 'efectivo'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  💶 Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setMetodoPago('datafono')}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                    metodoPago === 'datafono'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  💳 Datáfono
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">¿Está en Booksy?</label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEnBooksy(true)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                    enBooksy
                      ? 'bg-purple-50 border-purple-300 text-purple-700'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  Sí
                </button>
                <button
                  type="button"
                  onClick={() => setEnBooksy(false)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                    !enBooksy
                      ? 'bg-gray-100 border-gray-300 text-gray-700'
                      : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                  }`}
                >
                  No
                </button>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Empleada</label>
              {isAdmin ? (
                <select value={empleadaId} onChange={e => handleEmpleadaChange(e.target.value)} required className={inputCls}>
                  <option value="">— Elegir —</option>
                  {empleadas.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              ) : (
                <p className="px-3 py-2 text-sm font-semibold text-gray-700">{profile.name}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Comisión % {esManual && <span className="text-mavic-pink">(manual)</span>}
              </label>
              <input type="number" step="0.5" min="0" max="100" value={pct} onChange={e => setPct(e.target.value)} required placeholder="%" className={`w-20 ${inputCls} text-right`} />
            </div>
            {precioNum > 0 && (
              <p className="text-sm text-gray-600 pb-2">
                → Empleada: <span className="font-bold">{fmtEuros(parteEmpleadaPreview)} €</span>
                {' · '}Negocio: <span className="font-bold">{fmtEuros(parteNegocioPreview)} €</span>
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nota (opcional)</label>
            <input type="text" value={nota} onChange={e => setNota(e.target.value)} placeholder="Detalle breve..." className={`w-full ${inputCls}`} />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-mavic-pink text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
          >
            {saving ? 'Registrando...' : 'Registrar servicio'}
          </button>
        </form>
      </div>

      {/* Filtros y orden */}
      <div className="flex flex-wrap items-end gap-4 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
          <select value={month} onChange={e => setMonth(parseInt(e.target.value))} className={inputCls}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className={inputCls}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Ordenar por</label>
          <select value={sort} onChange={e => setSort(e.target.value as SortKey)} className={inputCls}>
            {SORT_OPTIONS.filter(o => isAdmin || o.value !== 'empleada').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {isAdmin && seleccion.size > 0 && (
          <div className="ml-auto flex items-center gap-3">
            {!selValida && ventasSel.length > 0 && (
              <span className="text-xs font-semibold text-red-600">Elige servicios de una sola empleada</span>
            )}
            <button
              onClick={handleMarcarPagado}
              disabled={!selValida || pagando}
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-emerald-700"
            >
              {pagando ? 'Pagando...' : `Marcar pagado — ${fmtEuros(totalSel)} € (${ventasSel.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {isAdmin && <th className="px-3 py-3 w-8"></th>}
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Servicio</th>
                {isAdmin && <th className="px-3 py-3 text-left font-semibold text-gray-700">Empleada</th>}
                <th className="px-3 py-3 text-right font-semibold text-gray-700">Precio</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Pago</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">%</th>
                <th className="px-3 py-3 text-right font-semibold text-gray-700">{isAdmin ? 'Su parte' : 'Tu parte'}</th>
                {isAdmin && <th className="px-3 py-3 text-right font-semibold text-gray-700">Negocio</th>}
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Estado</th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">Registró</th>
              </tr>
            </thead>
            <tbody>
              {ventasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 11 : 8} className="px-4 py-8 text-center text-gray-400">
                    No hay servicios registrados este mes.
                  </td>
                </tr>
              ) : ventasOrdenadas.map(v => {
                const est = estadoDe(v);
                return (
                  <tr key={v.id} className="border-b border-gray-100 hover:bg-gray-50">
                    {isAdmin && (
                      <td className="px-3 py-2">
                        {!v.liquidacion_id && (
                          <input
                            type="checkbox"
                            checked={seleccion.has(v.id)}
                            onChange={() => toggleSel(v.id)}
                            className="w-4 h-4 accent-mavic-pink"
                          />
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtFecha(v.fecha)}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.producto_nombre}
                      {v.nota && <span className="block text-xs text-gray-400">{v.nota}</span>}
                    </td>
                    {isAdmin && <td className="px-3 py-2 text-gray-700">{v.empleada_nombre}</td>}
                    <td className="px-3 py-2 text-right text-gray-700">{fmtEuros(v.precio)} €</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${v.metodo_pago === 'datafono' ? 'text-blue-700' : 'text-green-700'}`}>
                        {v.metodo_pago === 'datafono' ? '💳 Datáfono' : '💶 Efectivo'}
                      </span>
                      {v.en_booksy && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Booksy</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">{v.comision_pct}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-mavic-black">{fmtEuros(v.parte_empleada)} €</td>
                    {isAdmin && <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmtEuros(v.parte_negocio)} €</td>}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {est.texto === 'Pendiente' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-300">Pendiente</span>
                      )}
                      {est.texto === 'Pagado' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-300" title={est.detalle ?? ''}>Pagado</span>
                      )}
                      {est.texto === 'Recibido' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-300" title={est.detalle ?? ''}>Recibido ✓</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{v.quien_nombre}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log de liquidaciones */}
      <div className="bg-white rounded-lg shadow-lg p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Liquidaciones (historial de pagos)</h2>
        {liquidaciones.length === 0 ? (
          <p className="text-sm text-gray-400">Todavía no hay pagos registrados.</p>
        ) : (
          <ul className="space-y-2">
            {liquidaciones.map(l => (
              <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm border-b border-gray-100 pb-2 last:border-0">
                <span className="text-gray-500 whitespace-nowrap">{fmtFechaHora(l.pagado_at)}</span>
                <span className="text-gray-700">
                  <span className="font-semibold">{l.pagado_por_nombre}</span> pagó{' '}
                  <span className="font-bold">{fmtEuros(l.total)} €</span> ({l.num_servicios}{' '}
                  {l.num_servicios === 1 ? 'servicio' : 'servicios'}) a{' '}
                  <span className="font-semibold">{l.empleada_nombre}</span>
                </span>
                {l.recibido_at ? (
                  <span className="text-green-700 text-xs font-semibold">
                    ✓ Recibido {fmtFechaHora(l.recibido_at)} por {l.recibido_por_nombre}
                  </span>
                ) : l.empleada_id === profile.id ? (
                  <button
                    onClick={() => handleConfirmarRecibido(l.id)}
                    disabled={confirmando === l.id}
                    className="bg-green-600 text-white font-bold px-3 py-1 rounded-lg text-xs disabled:opacity-50 transition hover:bg-green-700"
                  >
                    {confirmando === l.id ? 'Confirmando...' : 'Confirmar recibido'}
                  </button>
                ) : (
                  <span className="text-amber-600 text-xs font-semibold">⏳ Pendiente de confirmar</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
