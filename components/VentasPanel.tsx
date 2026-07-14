'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fmtEuros, fmtFecha, fmtFechaHora, round2, plural } from '@/lib/registro-format';
import MonthNav from '@/components/MonthNav';

interface Venta {
  id: string;
  fecha: string;
  producto_id: string | null;
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
  efectivo_origen: 'cajon' | 'otro';
  efectivo_nota: string | null;
}

interface Edicion {
  id: string;
  venta_id: string;
  editado_por_nombre: string;
  editado_at: string;
  cambios: Array<{ campo: string; antes: string; despues: string }>;
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
  // Tras un pago correcto (admin): saltar a Movimientos para ver la salida del cajón (MAVIC-23)
  onLiquidado?: () => void;
}

type SortKey = 'fecha-desc' | 'fecha-asc' | 'importe-desc' | 'importe-asc' | 'empleada' | 'estado';

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'fecha-desc',   label: 'Fecha ↓ (recientes primero)' },
  { value: 'fecha-asc',    label: 'Fecha ↑' },
  { value: 'importe-desc', label: 'Importe ↓' },
  { value: 'importe-asc',  label: 'Importe ↑' },
  { value: 'empleada',     label: 'Empleada' },
  { value: 'estado',       label: 'Estado (pendientes primero)' },
];

const CAMPO_LABELS: Record<string, string> = {
  fecha: 'Fecha', producto: 'Servicio', precio: 'Precio (€)', empleada: 'Empleada',
  comision: 'Comisión %', pago: 'Pago', booksy: 'En Booksy', nota: 'Nota',
};

function fmtValorCambio(campo: string, valor: string) {
  if (campo === 'fecha' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) return fmtFecha(valor);
  if (campo === 'pago') return valor === 'datafono' ? 'Datáfono' : 'Efectivo';
  return valor === '' ? '—' : valor;
}

// Valor del select de producto cuando se conserva el producto original de la
// venta (p.ej. si ya no está activo en el catálogo).
const PRODUCTO_ACTUAL = '__actual__';

export default function VentasPanel({ profile, isAdmin, onLiquidado }: VentasPanelProps) {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [empleadas, setEmpleadas] = useState<Empleada[]>([]);
  const [msg, setMsg] = useState('');

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [sort, setSort] = useState<SortKey>('fecha-desc');
  const [formOpen, setFormOpen] = useState(false);

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

  // Popup de pago (MAVIC-22/23): qué se paga y de dónde sale el efectivo
  const [pagoVentas, setPagoVentas] = useState<Venta[] | null>(null);
  const [pagoOrigen, setPagoOrigen] = useState<'cajon' | 'otro'>('cajon');
  const [pagoNota, setPagoNota] = useState('');

  // Edición de servicios sin liquidar (MAVIC-26)
  const [ediciones, setEdiciones] = useState<Edicion[]>([]);
  const [editVenta, setEditVenta] = useState<Venta | null>(null);
  const [editForm, setEditForm] = useState({
    fecha: '', productoId: PRODUCTO_ACTUAL, precio: '', empleadaId: '', pct: '',
    metodoPago: 'efectivo' as 'efectivo' | 'datafono', enBooksy: false, nota: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [historialVenta, setHistorialVenta] = useState<Venta | null>(null);

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 4000);
  };

  const load = useCallback(async () => {
    const [ventasRes, liqRes, prodRes, empRes, edicRes] = await Promise.all([
      supabase
        .from('registro_ventas')
        .select('id, fecha, producto_id, producto_nombre, precio, empleada_id, empleada_nombre, comision_pct, parte_empleada, parte_negocio, nota, quien_nombre, liquidacion_id, metodo_pago, en_booksy, created_at')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('registro_liquidaciones')
        .select('id, empleada_id, empleada_nombre, total, num_servicios, pagado_por_nombre, pagado_at, recibido_por_nombre, recibido_at, efectivo_origen, efectivo_nota')
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
      supabase
        .from('registro_ventas_ediciones')
        .select('id, venta_id, editado_por_nombre, editado_at, cambios')
        .order('editado_at', { ascending: true }),
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
    setEdiciones((edicRes.data as Edicion[] | null) ?? []);
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

  // ── Edición de servicios sin liquidar (MAVIC-26) ─────────────────
  const edicionesPorVenta = new Map<string, Edicion[]>();
  for (const ed of ediciones) {
    const list = edicionesPorVenta.get(ed.venta_id) ?? [];
    list.push(ed);
    edicionesPorVenta.set(ed.venta_id, list);
  }

  const puedeEditar = (v: Venta) =>
    !v.liquidacion_id && (isAdmin || v.empleada_id === profile.id);

  const openEdit = (v: Venta) => {
    const enCatalogo = v.producto_id != null && productos.some(p => p.id === v.producto_id);
    setEditForm({
      fecha: v.fecha,
      productoId: enCatalogo ? (v.producto_id as string) : PRODUCTO_ACTUAL,
      precio: String(v.precio),
      empleadaId: v.empleada_id,
      pct: String(v.comision_pct),
      metodoPago: v.metodo_pago,
      enBooksy: v.en_booksy,
      nota: v.nota ?? '',
    });
    setEditVenta(v);
  };

  const editPrecioNum = parseFloat(editForm.precio) || 0;
  const editPctNum = parseFloat(editForm.pct) || 0;
  const editParteEmpleada = round2(editPrecioNum * editPctNum / 100);
  const editParteNegocio = round2(editPrecioNum - editParteEmpleada);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVenta) return;
    if (!editPrecioNum || editPrecioNum <= 0) { flash('Error: precio inválido'); return; }
    if (editPctNum < 0 || editPctNum > 100) { flash('Error: % inválido (0-100)'); return; }

    let prodId = editVenta.producto_id;
    let prodNombre = editVenta.producto_nombre;
    if (editForm.productoId !== PRODUCTO_ACTUAL) {
      const prod = productos.find(p => p.id === editForm.productoId);
      if (!prod) { flash('Error: elige un producto'); return; }
      prodId = prod.id;
      prodNombre = prod.nombre;
    }

    let empId = editVenta.empleada_id;
    let empNombre = editVenta.empleada_nombre;
    if (isAdmin && editForm.empleadaId !== editVenta.empleada_id) {
      const emp = empleadas.find(x => x.id === editForm.empleadaId);
      if (!emp) { flash('Error: elige una empleada'); return; }
      empId = emp.id;
      empNombre = emp.name;
    }

    setSavingEdit(true);
    const { data: updated, error } = await supabase
      .from('registro_ventas')
      .update({
        fecha: editForm.fecha,
        producto_id: prodId,
        producto_nombre: prodNombre,
        precio: editPrecioNum,
        empleada_id: empId,
        empleada_nombre: empNombre,
        comision_pct: editPctNum,
        parte_empleada: editParteEmpleada,
        parte_negocio: editParteNegocio,
        metodo_pago: editForm.metodoPago,
        en_booksy: editForm.enBooksy,
        nota: editForm.nota.trim() || null,
      })
      .eq('id', editVenta.id)
      .is('liquidacion_id', null)
      .select('id');
    setSavingEdit(false);
    if (error) { flash(`Error: ${error.message}`); return; }
    if (!updated || (updated as Array<{ id: string }>).length === 0) {
      flash('Aviso: no se pudo corregir — puede que ya esté liquidado');
      setEditVenta(null);
      load();
      return;
    }
    flash('✓ Servicio corregido');
    setEditVenta(null);
    load();
  };

  // ── Totales sin liquidar (MAVIC-24/18) ───────────────────────────
  // Las tarjetas solo cuentan servicios SIN liquidar: se ponen a 0 al marcar
  // pagado. Lo acumulado por mes vive en la pestaña Estadísticas.
  const ventasMes = ventas.filter(v => {
    const [y, mo] = v.fecha.split('-').map(Number);
    return y === year && mo === month;
  });

  const pendientes = ventas.filter(v => !v.liquidacion_id);
  const pendNegocio = round2(pendientes.reduce((s, v) => s + v.parte_negocio, 0));
  const pendDatafono = round2(pendientes.filter(v => v.metodo_pago === 'datafono').reduce((s, v) => s + v.precio, 0));
  const pendEfectivo = round2(pendientes.filter(v => v.metodo_pago === 'efectivo').reduce((s, v) => s + v.precio, 0));
  const pendientePorEmpleada = new Map<string, { nombre: string; total: number; count: number }>();
  for (const v of pendientes) {
    const cur = pendientePorEmpleada.get(v.empleada_id) ?? { nombre: v.empleada_nombre, total: 0, count: 0 };
    cur.total = round2(cur.total + v.parte_empleada);
    cur.count += 1;
    pendientePorEmpleada.set(v.empleada_id, cur);
  }
  const miPendiente = pendientePorEmpleada.get(profile.id);
  const totalPendTodas = round2(pendientes.reduce((s, v) => s + v.parte_empleada, 0));

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
  const totalSel = round2(ventasSel.reduce((s, v) => s + v.parte_empleada, 0));

  // MAVIC-22/23: el pago (selección o todo) se confirma en un popup que
  // pregunta de dónde sale el efectivo. Admite varias empleadas a la vez:
  // se crea una liquidación por empleada.
  const abrirPago = (vs: Venta[]) => {
    setPagoOrigen('cajon');
    setPagoNota('');
    setPagoVentas(vs.filter(v => !v.liquidacion_id));
  };

  const gruposPago = new Map<string, { nombre: string; ventas: Venta[]; total: number }>();
  for (const v of pagoVentas ?? []) {
    const cur = gruposPago.get(v.empleada_id) ?? { nombre: v.empleada_nombre, ventas: [], total: 0 };
    cur.ventas.push(v);
    cur.total = round2(cur.total + v.parte_empleada);
    gruposPago.set(v.empleada_id, cur);
  }
  const totalPago = round2(Array.from(gruposPago.values()).reduce((s, g) => s + g.total, 0));

  const handleConfirmarPago = async () => {
    if (!pagoVentas || pagoVentas.length === 0) return;
    const notaOtro = pagoNota.trim();
    if (pagoOrigen === 'otro' && !notaOtro) { flash('Error: indica de dónde sale el dinero'); return; }
    setPagando(true);
    const avisos: string[] = [];
    for (const [empId, g] of gruposPago) {
      const { data: liq, error } = await supabase
        .from('registro_liquidaciones')
        .insert({
          empleada_id: empId,
          empleada_nombre: g.nombre,
          total: g.total,
          num_servicios: g.ventas.length,
          pagado_por: profile.id,
          pagado_por_nombre: profile.name,
          efectivo_origen: pagoOrigen,
          efectivo_nota: pagoOrigen === 'otro' ? notaOtro : null,
        })
        .select('id')
        .single();
      if (error || !liq) {
        avisos.push(`${g.nombre}: ${error?.message ?? 'no se pudo crear la liquidación'}`);
        continue;
      }
      const ids = g.ventas.map(v => v.id);
      const { data: updated, error: updErr } = await supabase
        .from('registro_ventas')
        .update({ liquidacion_id: (liq as { id: string }).id })
        .in('id', ids)
        .is('liquidacion_id', null)
        .select('id');
      const n = (updated as Array<{ id: string }> | null)?.length ?? 0;
      if (updErr) avisos.push(`${g.nombre}: ${updErr.message}`);
      else if (n !== ids.length) avisos.push(`${g.nombre}: solo ${n} de ${ids.length} servicios se marcaron`);
    }
    setPagando(false);
    setPagoVentas(null);
    setSeleccion(new Set());
    load();
    if (avisos.length > 0) {
      flash(`Aviso: ${avisos.join(' · ')} — revisa la lista`);
      return;
    }
    flash(`✓ Pagado: ${fmtEuros(totalPago)}`);
    onLiquidado?.();
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
  const selectCls = `${inputCls} select-mavic`;

  return (
    <div>
      {msg && (
        <p className={`mb-4 text-sm font-semibold ${msg.startsWith('Error') || msg.startsWith('Aviso') ? 'text-red-600' : 'text-green-600'}`}>
          {msg}
        </p>
      )}

      {/* Tarjetas de lo sin liquidar — se ponen a 0 al marcar pagado (MAVIC-24/18).
          La vista portal solo recibe lo suyo (RLS). Lo acumulado del mes está en Estadísticas. */}
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {isAdmin ? 'Sin liquidar — se pone a 0 al marcar pagado' : 'Pendiente de cobrar — se pone a 0 cuando te pagan'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {isAdmin && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Parte negocio</p>
            <p className="text-2xl font-bold text-emerald-700 tabular-nums">{fmtEuros(pendNegocio)}</p>
          </div>
        )}
        {isAdmin ? (
          Array.from(pendientePorEmpleada.entries()).map(([id, p]) => (
            <div key={id} className="bg-white border border-gray-200 rounded-2xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{p.nombre}</p>
              <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(p.total)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{plural(p.count, 'servicio', 'servicios')}</p>
            </div>
          ))
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Tu comisión</p>
            <p className="text-2xl font-bold text-mavic-black tabular-nums">{fmtEuros(miPendiente?.total ?? 0)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{plural(miPendiente?.count ?? 0, 'servicio', 'servicios')}</p>
          </div>
        )}
        <div className="bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">¿Cómo se cobró?</p>
          <p className="text-sm text-blue-800">
            💳 Datáfono (TPV Booksy): <span className="font-bold tabular-nums">{fmtEuros(pendDatafono)}</span>
          </p>
          <p className="text-sm text-green-800">
            💶 Efectivo: <span className="font-bold tabular-nums">{fmtEuros(pendEfectivo)}</span>
          </p>
        </div>
      </div>

      {/* Nueva venta — plegada tras un botón, igual que Nuevo movimiento (MAVIC-14) */}
      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-2xl px-5 py-3.5 mb-4 flex items-center gap-2.5 text-sm font-bold text-mavic-black transition"
        >
          <span className="w-6 h-6 rounded-full bg-mavic-pink/25 text-mavic-black flex items-center justify-center text-base leading-none">+</span>
          Registrar servicio vendido
        </button>
      ) : (
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Registrar servicio vendido</h2>
          <button
            onClick={() => setFormOpen(false)}
            aria-label="Cerrar formulario"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleAddVenta} className="space-y-3">
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} required className={inputCls} />
            </div>
            <div className="flex-1 min-w-52">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Producto</label>
              <select value={productoId} onChange={e => handleProductoChange(e.target.value)} required className={`w-full ${selectCls}`}>
                <option value="">— Elegir —</option>
                {Array.from(new Set(productos.map(p => p.categoria))).map(cat => (
                  <optgroup key={cat} label={cat}>
                    {productos.filter(p => p.categoria === cat).map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} — {fmtEuros(p.precio)}</option>
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
                <select value={empleadaId} onChange={e => handleEmpleadaChange(e.target.value)} required className={selectCls}>
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
                → Empleada: <span className="font-bold">{fmtEuros(parteEmpleadaPreview)}</span>
                {' · '}Negocio: <span className="font-bold">{fmtEuros(parteNegocioPreview)}</span>
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
      )}

      {/* Filtros y orden */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <MonthNav month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
        <select
          value={sort}
          aria-label="Ordenar por"
          onChange={e => setSort(e.target.value as SortKey)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-mavic-pink select-mavic"
        >
          {SORT_OPTIONS.filter(o => isAdmin || o.value !== 'empleada').map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {isAdmin && seleccion.size > 0 && (
          <div className="ml-auto">
            <button
              onClick={() => abrirPago(ventasSel)}
              disabled={ventasSel.length === 0 || pagando}
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-sm disabled:opacity-50 transition hover:bg-emerald-700"
            >
              {`Marcar pagado — ${fmtEuros(totalSel)} (${ventasSel.length})`}
            </button>
          </div>
        )}
        {isAdmin && seleccion.size === 0 && pendientes.length > 0 && (
          <div className="ml-auto">
            <button
              onClick={() => abrirPago(pendientes)}
              disabled={pagando}
              className="bg-emerald-600 text-white font-bold px-4 py-2 rounded-full text-sm disabled:opacity-50 transition hover:bg-emerald-700"
            >
              {`Marcar todo pagado — ${fmtEuros(totalPendTodas)} (${pendientes.length})`}
            </button>
          </div>
        )}
      </div>

      {/* Tabla de ventas */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden mb-4">
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
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ventasOrdenadas.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 12 : 9} className="px-4 py-8 text-center text-gray-400">
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
                      {edicionesPorVenta.has(v.id) && (
                        <button
                          onClick={() => setHistorialVenta(v)}
                          className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition"
                          title="Ver historial de cambios"
                        >
                          ✎ editado
                        </button>
                      )}
                      {v.nota && <span className="block text-xs text-gray-400">{v.nota}</span>}
                    </td>
                    {isAdmin && <td className="px-3 py-2 text-gray-700">{v.empleada_nombre}</td>}
                    <td className="px-3 py-2 text-right text-gray-700 tabular-nums">{fmtEuros(v.precio)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className={`text-xs font-semibold ${v.metodo_pago === 'datafono' ? 'text-blue-700' : 'text-green-700'}`}>
                        {v.metodo_pago === 'datafono' ? '💳 Datáfono' : '💶 Efectivo'}
                      </span>
                      {v.en_booksy && (
                        <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">Booksy</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{v.comision_pct}%</td>
                    <td className="px-3 py-2 text-right font-semibold text-mavic-black tabular-nums">{fmtEuros(v.parte_empleada)}</td>
                    {isAdmin && <td className="px-3 py-2 text-right font-semibold text-emerald-700 tabular-nums">{fmtEuros(v.parte_negocio)}</td>}
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
                    <td className="px-3 py-2">
                      {puedeEditar(v) && (
                        <button
                          onClick={() => openEdit(v)}
                          className="text-gray-300 hover:text-mavic-pink transition text-base leading-none"
                          title="Corregir este servicio"
                        >
                          ✎
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log de liquidaciones */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
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
                  <span className="font-bold">{fmtEuros(l.total)}</span> ({l.num_servicios}{' '}
                  {l.num_servicios === 1 ? 'servicio' : 'servicios'}) a{' '}
                  <span className="font-semibold">{l.empleada_nombre}</span>
                </span>
                {l.efectivo_origen === 'otro' && (
                  <span className="text-xs text-gray-400">🏦 efectivo de: {l.efectivo_nota}</span>
                )}
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

      {/* Popup de pago: ¿de dónde sale el efectivo? (MAVIC-22/23) */}
      {pagoVentas && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !pagando && setPagoVentas(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Confirmar pago</h3>
            <ul className="mb-2 space-y-1">
              {Array.from(gruposPago.entries()).map(([id, g]) => (
                <li key={id} className="text-sm text-gray-700">
                  <span className="font-semibold">{g.nombre}:</span>{' '}
                  <span className="font-bold">{fmtEuros(g.total)}</span> ({plural(g.ventas.length, 'servicio', 'servicios')})
                </li>
              ))}
            </ul>
            {gruposPago.size > 1 && (
              <p className="text-sm font-bold text-mavic-black mb-2">Total: {fmtEuros(totalPago)}</p>
            )}
            <p className="text-xs font-semibold text-gray-600 mb-1.5 mt-3">¿De dónde sale el dinero?</p>
            <div className="space-y-2 mb-3">
              <button
                type="button"
                onClick={() => setPagoOrigen('cajon')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold border transition ${
                  pagoOrigen === 'cajon'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                }`}
              >
                💶 Del cajón
                <span className="block text-xs font-normal">Se apunta la salida en Movimientos automáticamente</span>
              </button>
              <button
                type="button"
                onClick={() => setPagoOrigen('otro')}
                className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-bold border transition ${
                  pagoOrigen === 'otro'
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                }`}
              >
                🏦 De otro sitio (Booksy, banco...)
                <span className="block text-xs font-normal">El cajón no se toca — apunta de dónde sale</span>
              </button>
            </div>
            {pagoOrigen === 'otro' && (
              <div className="mb-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">¿De dónde exactamente?</label>
                <input
                  type="text"
                  value={pagoNota}
                  onChange={e => setPagoNota(e.target.value)}
                  placeholder="Ej: transferencia de Booksy"
                  autoFocus
                  className={`w-full ${inputCls}`}
                />
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleConfirmarPago}
                disabled={pagando || (pagoOrigen === 'otro' && !pagoNota.trim())}
                className="bg-emerald-600 text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-emerald-700"
              >
                {pagando ? 'Pagando...' : `Confirmar pago — ${fmtEuros(totalPago)}`}
              </button>
              <button
                type="button"
                onClick={() => setPagoVentas(null)}
                disabled={pagando}
                className="bg-white text-gray-500 font-bold px-5 py-2 rounded-lg text-sm border border-gray-200 transition hover:text-gray-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de corrección (solo servicios sin liquidar) */}
      {editVenta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditVenta(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Corregir servicio</h3>
            <p className="text-xs text-gray-400 mb-4">Cada corrección queda registrada en el historial de cambios.</p>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={editForm.fecha} onChange={e => setEditForm(f => ({ ...f, fecha: e.target.value }))} required className={inputCls} />
                </div>
                <div className="flex-1 min-w-52">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Producto</label>
                  <select
                    value={editForm.productoId}
                    onChange={e => {
                      const id = e.target.value;
                      const prod = productos.find(p => p.id === id);
                      setEditForm(f => ({ ...f, productoId: id, precio: prod ? String(prod.precio) : f.precio }));
                    }}
                    required
                    className={`w-full ${selectCls}`}
                  >
                    {(editVenta.producto_id == null || !productos.some(p => p.id === editVenta.producto_id)) && (
                      <option value={PRODUCTO_ACTUAL}>{editVenta.producto_nombre} (actual)</option>
                    )}
                    {Array.from(new Set(productos.map(p => p.categoria))).map(cat => (
                      <optgroup key={cat} label={cat}>
                        {productos.filter(p => p.categoria === cat).map(p => (
                          <option key={p.id} value={p.id}>{p.nombre} — {fmtEuros(p.precio)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Precio €</label>
                  <input type="number" step="0.01" min="0.01" value={editForm.precio} onChange={e => setEditForm(f => ({ ...f, precio: e.target.value }))} required className={`w-24 ${inputCls}`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">¿Cómo se cobró?</label>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, metodoPago: 'efectivo' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                        editForm.metodoPago === 'efectivo'
                          ? 'bg-green-50 border-green-300 text-green-700'
                          : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      💶 Efectivo
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, metodoPago: 'datafono' }))}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                        editForm.metodoPago === 'datafono'
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
                      onClick={() => setEditForm(f => ({ ...f, enBooksy: true }))}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                        editForm.enBooksy
                          ? 'bg-purple-50 border-purple-300 text-purple-700'
                          : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      Sí
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditForm(f => ({ ...f, enBooksy: false }))}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                        !editForm.enBooksy
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
                    <select
                      value={editForm.empleadaId}
                      onChange={e => {
                        const id = e.target.value;
                        const emp = empleadas.find(x => x.id === id);
                        setEditForm(f => ({ ...f, empleadaId: id, pct: emp?.comision_pct != null ? String(emp.comision_pct) : f.pct }));
                      }}
                      required
                      className={selectCls}
                    >
                      {!empleadas.some(x => x.id === editVenta.empleada_id) && (
                        <option value={editVenta.empleada_id}>{editVenta.empleada_nombre}</option>
                      )}
                      {empleadas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  ) : (
                    <p className="px-3 py-2 text-sm font-semibold text-gray-700">{editVenta.empleada_nombre}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Comisión %</label>
                  <input type="number" step="0.5" min="0" max="100" value={editForm.pct} onChange={e => setEditForm(f => ({ ...f, pct: e.target.value }))} required className={`w-20 ${inputCls} text-right`} />
                </div>
                {editPrecioNum > 0 && (
                  <p className="text-sm text-gray-600 pb-2">
                    → Empleada: <span className="font-bold">{fmtEuros(editParteEmpleada)}</span>
                    {' · '}Negocio: <span className="font-bold">{fmtEuros(editParteNegocio)}</span>
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nota (opcional)</label>
                <input type="text" value={editForm.nota} onChange={e => setEditForm(f => ({ ...f, nota: e.target.value }))} placeholder="Detalle breve..." className={`w-full ${inputCls}`} />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="bg-mavic-pink text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar corrección'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditVenta(null)}
                  className="bg-white text-gray-500 font-bold px-5 py-2 rounded-lg text-sm border border-gray-200 transition hover:text-gray-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de historial de cambios */}
      {historialVenta && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setHistorialVenta(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Historial de cambios</h3>
            <p className="text-xs text-gray-400 mb-4">
              {historialVenta.producto_nombre} · {fmtFecha(historialVenta.fecha)} · {historialVenta.empleada_nombre}
            </p>
            <ul className="space-y-3">
              {(edicionesPorVenta.get(historialVenta.id) ?? []).map(ed => (
                <li key={ed.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <p className="text-xs text-gray-500 mb-1">
                    {fmtFechaHora(ed.editado_at)} — <span className="font-semibold">{ed.editado_por_nombre}</span>
                  </p>
                  <ul className="space-y-0.5">
                    {ed.cambios.map((c, i) => (
                      <li key={i} className="text-sm text-gray-700">
                        <span className="font-semibold">{CAMPO_LABELS[c.campo] ?? c.campo}:</span>{' '}
                        <span className="text-gray-400 line-through">{fmtValorCambio(c.campo, c.antes)}</span>
                        {' → '}
                        <span className="font-semibold">{fmtValorCambio(c.campo, c.despues)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
            <button
              onClick={() => setHistorialVenta(null)}
              className="mt-4 bg-white text-gray-500 font-bold px-5 py-2 rounded-lg text-sm border border-gray-200 transition hover:text-gray-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
