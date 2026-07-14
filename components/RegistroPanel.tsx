'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VentasPanel from '@/components/VentasPanel';
import RegistroStats from '@/components/RegistroStats';
import MonthNav from '@/components/MonthNav';
import { MONTHS, fmtEuros, fmtFecha, fmtFechaHora, round2 } from '@/lib/registro-format';

interface Movimiento {
  id: string;
  fecha: string;
  direccion: '+' | '-';
  importe: number;
  categoria?: string | null;
  nota: string | null;
  origen: 'manual' | 'venta' | 'liquidacion' | 'cuadre';
  quien_nombre: string;
  created_at: string;
}

// Etiqueta del chip de origen — 'manual' no lleva chip (es el caso normal).
const ORIGEN_LABEL: Record<Movimiento['origen'], string | null> = {
  manual: null,
  venta: 'Venta',
  liquidacion: 'Liquidación',
  cuadre: 'Cuadre',
};

interface Cuadre {
  id: string;
  tipo: 'apertura' | 'cierre';
  saldo_calculado: number;
  saldo_contado: number;
  diferencia: number;
  nota: string | null;
  quien_nombre: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
}

interface RegistroPanelProps {
  homeHref: string;
  loginHref: string;
  configHref?: string;
  isAdmin?: boolean;
}

const PAGE_SIZES = [20, 50, 100] as const;
type PageSize = typeof PAGE_SIZES[number] | 'mes-completo';

const MODAL_TRANSITION_MS = 200;

export default function RegistroPanel({ homeHref, loginHref, configHref, isAdmin = false }: RegistroPanelProps) {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  // El cajón (movimientos) es solo para admin — las empleadas entran directo a servicios.
  const [tab, setTab] = useState<'movimientos' | 'servicios' | 'estadisticas'>(isAdmin ? 'movimientos' : 'servicios');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const [pageSize, setPageSize] = useState<PageSize>(20);
  const [formOpen, setFormOpen] = useState(false);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [direccion, setDireccion] = useState<'+' | '-'>('+');
  const [importe, setImporte] = useState('');
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const [detalleMov, setDetalleMov] = useState<Movimiento | null>(null);
  const [detalleVisible, setDetalleVisible] = useState(false);

  // Cuadre de caja (MAVIC-25): conteo físico del cajón vs. saldo calculado.
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);
  const [cuadreTipo, setCuadreTipo] = useState<'apertura' | 'cierre' | null>(null);
  const [cuadreVisible, setCuadreVisible] = useState(false);
  const [noCoincide, setNoCoincide] = useState(false);
  const [contado, setContado] = useState('');
  const [cuadreNota, setCuadreNota] = useState('');
  const [cuadreSaving, setCuadreSaving] = useState(false);
  const [cuadreError, setCuadreError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace(loginHref); return; }
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, portal_registro')
        .eq('id', session.user.id)
        .single();
      if (!prof) { router.replace(loginHref); return; }
      // Empleadas sin acceso al Registro vuelven al dashboard (RLS bloquea los datos igualmente).
      if (!isAdmin && !(prof as { portal_registro: boolean }).portal_registro) { router.replace(homeHref); return; }
      setProfile({ id: session.user.id, name: (prof as { name: string }).name });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMovimientos = useCallback(async () => {
    // Las empleadas ya no ven el cajón (RLS lo bloquea igualmente) — no consultar.
    if (!isAdmin) { setLoading(false); return; }
    const [{ data }, { data: cuadresData }] = await Promise.all([
      supabase
        .from('registro_movimientos')
        .select('id, fecha, direccion, importe, nota, origen, quien_nombre, created_at')
        .order('fecha', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('registro_cuadres')
        .select('id, tipo, saldo_calculado, saldo_contado, diferencia, nota, quien_nombre, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
    const rows = (data as Array<Omit<Movimiento, 'importe'> & { importe: number | string }> | null) ?? [];
    // numeric(10,2) columns come back from PostgREST as strings — coerce before summing.
    setMovimientos(rows.map(r => ({ ...r, importe: Number(r.importe) })));
    const cRows = (cuadresData as Array<Omit<Cuadre, 'saldo_calculado' | 'saldo_contado' | 'diferencia'> & {
      saldo_calculado: number | string; saldo_contado: number | string; diferencia: number | string;
    }> | null) ?? [];
    setCuadres(cRows.map(c => ({
      ...c,
      saldo_calculado: Number(c.saldo_calculado),
      saldo_contado: Number(c.saldo_contado),
      diferencia: Number(c.diferencia),
    })));
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (profile) loadMovimientos();
  }, [profile, loadMovimientos]);

  const saldo = movimientos.reduce((s, m) => s + (m.direccion === '+' ? m.importe : -m.importe), 0);

  const delPeriodo = movimientos.filter(m => {
    const [y, mo] = m.fecha.split('-').map(Number);
    return y === year && mo === month;
  });
  const totalPeriodo = delPeriodo.reduce((s, m) => s + (m.direccion === '+' ? m.importe : -m.importe), 0);

  // "Mes completo" solo tiene sentido (y solo se muestra) si el mes tiene más
  // movimientos que el tope más alto de la lista fija (100).
  const permiteMesCompleto = delPeriodo.length > 100;
  const visiblesPeriodo = pageSize === 'mes-completo' ? delPeriodo : delPeriodo.slice(0, pageSize);

  // Estilo extracto bancario: los movimientos visibles agrupados por día.
  const gruposPorDia = visiblesPeriodo.reduce<{ fecha: string; movs: Movimiento[] }[]>((acc, m) => {
    const ultimo = acc[acc.length - 1];
    if (ultimo && ultimo.fecha === m.fecha) ultimo.movs.push(m);
    else acc.push({ fecha: m.fecha, movs: [m] });
    return acc;
  }, []);

  const fechaGrupo = (fecha: string) => {
    const hoy = new Date();
    const ayer = new Date(hoy.getTime() - 86400000);
    if (fecha === hoy.toISOString().slice(0, 10)) return 'Hoy';
    if (fecha === ayer.toISOString().slice(0, 10)) return 'Ayer';
    const [y, mo, d] = fecha.split('-').map(Number);
    const txt = new Date(y, mo - 1, d).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  };


  useEffect(() => {
    // Si veníamos en "mes completo" y el nuevo mes ya no lo necesita, volver al default.
    if (pageSize === 'mes-completo' && delPeriodo.length <= 100) {
      setPageSize(20);
    }
  }, [month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const monto = parseFloat(importe);
    if (!monto || monto <= 0) { setSaveMsg('Error: importe inválido'); return; }
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('registro_movimientos').insert({
      fecha,
      direccion,
      importe: monto,
      nota: nota.trim() || null,
      quien_registro: profile.id,
      quien_nombre: profile.name,
    });
    setSaving(false);
    if (error) {
      setSaveMsg(`Error: ${error.message}`);
      return;
    }
    setSaveMsg('✓ Registrado');
    setImporte('');
    setNota('');
    setTimeout(() => setSaveMsg(''), 3000);
    loadMovimientos();
  };

  const closeDetalle = useCallback(() => {
    setDetalleVisible(false);
    window.setTimeout(() => setDetalleMov(null), MODAL_TRANSITION_MS);
  }, []);

  useEffect(() => {
    if (!detalleMov) return;
    const raf = requestAnimationFrame(() => setDetalleVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [detalleMov]);

  useEffect(() => {
    if (!detalleMov) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeDetalle(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [detalleMov, closeDetalle]);

  // ¿Ya se cuadró la caja hoy? (para el aviso de apertura)
  const hayCuadreHoy = cuadres.some(c => new Date(c.created_at).toDateString() === new Date().toDateString());

  const openCuadre = (tipo: 'apertura' | 'cierre') => {
    setNoCoincide(false);
    setContado('');
    setCuadreNota('');
    setCuadreError('');
    setCuadreTipo(tipo);
  };

  const closeCuadre = useCallback(() => {
    setCuadreVisible(false);
    window.setTimeout(() => setCuadreTipo(null), MODAL_TRANSITION_MS);
  }, []);

  useEffect(() => {
    if (!cuadreTipo) return;
    const raf = requestAnimationFrame(() => setCuadreVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [cuadreTipo]);

  useEffect(() => {
    if (!cuadreTipo) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCuadre(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [cuadreTipo, closeCuadre]);

  const saveCuadre = async (contadoValor: number) => {
    if (!profile || !cuadreTipo) return;
    if (isNaN(contadoValor) || contadoValor < 0) {
      setCuadreError('Cantidad contada inválida');
      return;
    }
    setCuadreSaving(true);
    setCuadreError('');
    // La diferencia la calcula la BD (columna generada); si hay descuadre, un
    // trigger inserta el movimiento de ajuste para que el saldo vuelva a la realidad.
    const { error } = await supabase.from('registro_cuadres').insert({
      tipo: cuadreTipo,
      saldo_calculado: round2(saldo),
      saldo_contado: round2(contadoValor),
      nota: cuadreNota.trim() || null,
      quien_registro: profile.id,
      quien_nombre: profile.name,
    });
    setCuadreSaving(false);
    if (error) {
      setCuadreError(error.message);
      return;
    }
    closeCuadre();
    loadMovimientos();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* La marca queda como línea de acento; el header es sobrio (MAVIC-14). */}
      <div className="h-1 bg-gradient-to-r from-mavic-pink to-mavic-gold" />
      <header className="bg-white border-b border-gray-200">
        <div className={`${tab === 'movimientos' ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 py-3 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => router.push(homeHref)}
              className="flex items-center gap-1 rounded-full border border-gray-200 pl-2 pr-3.5 py-1.5 text-sm font-semibold text-gray-500 hover:text-mavic-black hover:border-gray-300 transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              <span className="hidden sm:inline">Panel de control</span>
              <span className="sm:hidden">Panel</span>
            </button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-mavic-black leading-tight">Registro</h1>
              <p className="text-xs text-gray-400 truncate">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {configHref && (
              <Link
                href={configHref}
                aria-label="Configuración"
                title="Configuración"
                className="p-2 rounded-full text-gray-400 hover:text-mavic-black hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </Link>
            )}
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push(loginHref); }}
              className="px-3 py-2 rounded-full text-sm font-semibold text-gray-400 hover:text-mavic-black hover:bg-gray-100 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className={`${tab === 'movimientos' ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 py-6`}>
        {/* Pestañas — control segmentado */}
        <div className="inline-flex bg-gray-200/70 rounded-full p-1 mb-5">
          {([
            ...(isAdmin ? [['movimientos', 'Movimientos'] as const] : []),
            ['servicios', 'Servicios vendidos'] as const,
            ['estadisticas', 'Estadísticas'] as const,
          ]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                tab === key
                  ? 'bg-white text-mavic-black shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'estadisticas' ? (
          <RegistroStats isAdmin={isAdmin} />
        ) : tab === 'servicios' && profile ? (
          <VentasPanel
            profile={profile}
            isAdmin={isAdmin}
            // Tras pagar, volver a Movimientos para ver la salida del cajón (MAVIC-23)
            onLiquidado={isAdmin ? () => { loadMovimientos(); setTab('movimientos'); } : undefined}
          />
        ) : (
          <>
        {/* Saldo — tarjeta hero */}
        <div className="bg-mavic-black rounded-2xl p-6 mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-1">Saldo actual</p>
            <p className={`text-4xl font-bold tabular-nums ${saldo < 0 ? 'text-red-400' : 'text-white'}`}>
              {fmtEuros(saldo)}
            </p>
          </div>
          <button
            onClick={() => openCuadre('cierre')}
            className="bg-white/10 border border-white/20 text-white text-sm font-bold px-5 py-2.5 rounded-full hover:bg-white/20 transition"
          >
            Cierre de caja
          </button>
        </div>

        {/* Aviso de apertura: sin cuadre registrado hoy (MAVIC-25) */}
        {!hayCuadreHoy && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-3 mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-800">Aún no has cuadrado la caja hoy.</p>
            <button
              onClick={() => openCuadre('apertura')}
              className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-amber-600 transition"
            >
              Contar ahora
            </button>
          </div>
        )}

        {/* Nuevo movimiento — plegado tras un botón para que el saldo y el
            extracto (lo que más se consulta) queden arriba (MAVIC-14) */}
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="w-full bg-white border border-gray-200 hover:border-gray-300 rounded-2xl px-5 py-3.5 mb-4 flex items-center gap-2.5 text-sm font-bold text-mavic-black transition"
          >
            <span className="w-6 h-6 rounded-full bg-mavic-pink/25 text-mavic-black flex items-center justify-center text-base leading-none">+</span>
            Nuevo movimiento
          </button>
        ) : (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Nuevo movimiento</h2>
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
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                  required
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dirección</label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDireccion('+')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                      direccion === '+'
                        ? 'bg-green-50 border-green-300 text-green-700'
                        : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Entrada +
                  </button>
                  <button
                    type="button"
                    onClick={() => setDireccion('-')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                      direccion === '-'
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    Salida −
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Importe</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={importe}
                  onChange={e => setImporte(e.target.value)}
                  required
                  placeholder="0,00"
                  className="w-28 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nota (opcional)</label>
              <input
                type="text"
                value={nota}
                onChange={e => setNota(e.target.value)}
                placeholder="Detalle breve..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="bg-mavic-pink text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
              >
                {saving ? 'Registrando...' : 'Registrar movimiento'}
              </button>
              {saveMsg && (
                <span className={`text-sm font-semibold ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </span>
              )}
            </div>
          </form>
        </div>
        )}

        {/* Navegación de mes + tamaño de página */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <MonthNav month={month} year={year} onChange={(m, y) => { setMonth(m); setYear(y); }} />
          <select
            value={pageSize}
            aria-label="Movimientos a mostrar"
            onChange={e => setPageSize(e.target.value === 'mes-completo' ? 'mes-completo' : parseInt(e.target.value) as typeof PAGE_SIZES[number])}
            className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-mavic-pink select-mavic"
          >
            {PAGE_SIZES.map(n => <option key={n} value={n}>Últimos {n}</option>)}
            {permiteMesCompleto && <option value="mes-completo">Mes completo</option>}
          </select>
        </div>

        {visiblesPeriodo.length < delPeriodo.length && (
          <p className="text-xs text-gray-500 mb-2">
            Mostrando {visiblesPeriodo.length} de {delPeriodo.length} movimientos.
          </p>
        )}

        {/* Extracto — movimientos agrupados por día, fila = transacción (MAVIC-14) */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {visiblesPeriodo.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-gray-400">No hay movimientos este mes.</p>
          ) : gruposPorDia.map(g => (
            <div key={g.fecha}>
              <div className="px-5 pt-3.5 pb-1.5 text-xs font-semibold text-gray-400">
                {fechaGrupo(g.fecha)}
              </div>
              {g.movs.map(m => (
                <button
                  key={m.id}
                  onClick={() => setDetalleMov(m)}
                  className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-semibold text-mavic-black truncate">
                        {m.nota || (ORIGEN_LABEL[m.origen] ?? 'Movimiento')}
                      </span>
                      {ORIGEN_LABEL[m.origen] && (
                        <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                          {ORIGEN_LABEL[m.origen]}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{m.quien_nombre}</p>
                  </div>
                  <span className={`flex-shrink-0 text-sm font-bold tabular-nums ${m.direccion === '+' ? 'text-green-600' : 'text-red-600'}`}>
                    {m.direccion === '+' ? '+' : '−'} {fmtEuros(m.importe)}
                  </span>
                </button>
              ))}
            </div>
          ))}

          <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total del mes</span>
            <span className={`text-base font-bold tabular-nums ${totalPeriodo < 0 ? 'text-red-600' : 'text-mavic-black'}`}>
              {totalPeriodo >= 0 ? '+' : '−'} {fmtEuros(Math.abs(totalPeriodo))}
            </span>
          </div>
        </div>

        {/* Últimos cuadres (MAVIC-25) */}
        {cuadres.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-2xl p-5 mt-4">
            <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Últimos cuadres de caja</h2>
            <ul className="divide-y divide-gray-100">
              {cuadres.map(c => (
                <li key={c.id} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500 w-28">{fmtFechaHora(c.created_at)}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                    c.tipo === 'cierre' ? 'bg-mavic-black text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.tipo === 'cierre' ? 'Cierre' : 'Apertura'}
                  </span>
                  <span className={`font-semibold tabular-nums ${
                    c.diferencia === 0 ? 'text-green-600' : c.diferencia < 0 ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {c.diferencia === 0
                      ? '✓ Cuadró'
                      : c.diferencia < 0
                        ? `Faltaron ${fmtEuros(-c.diferencia)}`
                        : `Sobraron ${fmtEuros(c.diferencia)}`}
                  </span>
                  <span className="text-gray-400">{c.quien_nombre}</span>
                  {c.nota && <span className="text-gray-500 italic basis-full sm:basis-auto">«{c.nota}»</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
          </>
        )}
      </main>

      {detalleMov && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Detalle del movimiento">
          <div
            onClick={closeDetalle}
            className={`absolute inset-0 bg-black/40 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out ${
              detalleVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
              detalleVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
              <h2 className="text-base font-bold text-mavic-black">Detalle del movimiento</h2>
              <button
                onClick={closeDetalle}
                aria-label="Cerrar"
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mavic-pink flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <p className={`text-3xl font-bold tabular-nums text-center mb-1 ${detalleMov.direccion === '+' ? 'text-green-600' : 'text-red-600'}`}>
                {detalleMov.direccion === '+' ? '+' : '−'} {fmtEuros(detalleMov.importe)}
              </p>
              {ORIGEN_LABEL[detalleMov.origen] && (
                <p className="text-center mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full px-2 py-0.5">
                    {ORIGEN_LABEL[detalleMov.origen]}
                  </span>
                </p>
              )}
              <div className="space-y-3 mt-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</span>
                  <span className="text-sm font-semibold text-mavic-black tabular-nums">{fmtFecha(detalleMov.fecha)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrado por</span>
                  <span className="text-sm text-gray-700">{detalleMov.quien_nombre}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hora de registro</span>
                  <span className="text-sm text-gray-700 tabular-nums">{fmtFechaHora(detalleMov.created_at)}</span>
                </div>
                <div className="pt-1 border-t border-gray-100">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 mt-2">Nota</span>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {detalleMov.nota ?? <span className="text-gray-300">Sin nota</span>}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de cuadre de caja (MAVIC-25) */}
      {cuadreTipo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Cuadre de caja">
          <div
            onClick={cuadreSaving ? undefined : closeCuadre}
            className={`absolute inset-0 bg-black/40 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out ${
              cuadreVisible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
              cuadreVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4 flex-shrink-0">
              <h2 className="text-base font-bold text-mavic-black">{cuadreTipo === 'cierre' ? 'Cierre de caja' : 'Cuadre de caja'}</h2>
              <button
                onClick={closeCuadre}
                disabled={cuadreSaving}
                aria-label="Cerrar"
                className="p-2 -mr-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mavic-pink flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Según el registro, en el cajón debería haber
                </p>
                <p className="text-3xl font-bold text-mavic-black tabular-nums">{fmtEuros(saldo)}</p>

                {!noCoincide ? (
                  <>
                    <p className="text-sm text-gray-600 mt-4">
                      Cuenta el efectivo del cajón. ¿Coincide con esta cantidad?
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        onClick={() => saveCuadre(saldo)}
                        disabled={cuadreSaving}
                        className="bg-green-600 text-white font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition hover:bg-green-700"
                      >
                        {cuadreSaving ? 'Guardando...' : '✓ Sí, cuadra'}
                      </button>
                      <button
                        onClick={() => setNoCoincide(true)}
                        disabled={cuadreSaving}
                        className="bg-white border border-red-300 text-red-700 font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition hover:bg-red-50"
                      >
                        No coincide
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">¿Cuánto hay realmente?</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={contado}
                        onChange={e => setContado(e.target.value)}
                        autoFocus
                        placeholder="0,00"
                        className="w-36 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      />
                    </div>
                    {contado !== '' && !isNaN(parseFloat(contado)) && (() => {
                      const diff = round2(parseFloat(contado) - saldo);
                      return (
                        <p className={`text-sm font-bold ${
                          diff === 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'
                        }`}>
                          {diff === 0
                            ? '✓ Coincide — se registrará sin diferencia'
                            : diff < 0
                              ? `Faltan ${fmtEuros(-diff)}`
                              : `Sobran ${fmtEuros(diff)}`}
                        </p>
                      );
                    })()}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Nota (opcional)</label>
                      <input
                        type="text"
                        value={cuadreNota}
                        onChange={e => setCuadreNota(e.target.value)}
                        placeholder="Ej: pagué algo y olvidé apuntarlo..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      El saldo se ajustará automáticamente a lo contado y la diferencia quedará registrada en los movimientos.
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => saveCuadre(parseFloat(contado))}
                        disabled={cuadreSaving || contado === ''}
                        className="bg-mavic-pink text-white font-bold px-5 py-2.5 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
                      >
                        {cuadreSaving ? 'Guardando...' : 'Guardar cuadre'}
                      </button>
                      <button
                        onClick={() => { setNoCoincide(false); setContado(''); setCuadreError(''); }}
                        disabled={cuadreSaving}
                        className="bg-white border border-gray-200 text-gray-500 font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50 transition hover:text-gray-700"
                      >
                        ← Volver
                      </button>
                    </div>
                  </div>
                )}

                {cuadreError && (
                  <p className="text-sm font-semibold text-red-600 mt-3">Error: {cuadreError}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
