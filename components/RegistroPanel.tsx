'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VentasPanel from '@/components/VentasPanel';
import RegistroStats from '@/components/RegistroStats';
import { MONTHS, fmtEuros, fmtFecha, fmtFechaHora, round2 } from '@/lib/registro-format';

interface Movimiento {
  id: string;
  fecha: string;
  direccion: '+' | '-';
  importe: number;
  categoria?: string | null;
  nota: string | null;
  quien_nombre: string;
  created_at: string;
}

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
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const [pageSize, setPageSize] = useState<PageSize>(20);

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
        .select('id, fecha, direccion, importe, nota, quien_nombre, created_at')
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
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Registro</h1>
            <p className="text-white/80 text-sm">{profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            {configHref && (
              <Link
                href={configHref}
                className="text-white/80 hover:text-white text-sm font-semibold transition"
              >
                ⚙ Configuración
              </Link>
            )}
            <button
              onClick={() => router.push(homeHref)}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              ← Inicio
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push(loginHref); }}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className={`${tab === 'movimientos' ? 'max-w-3xl' : 'max-w-5xl'} mx-auto px-4 py-6`}>
        {/* Pestañas */}
        <div className="flex gap-2 mb-5">
          {isAdmin && (
            <button
              onClick={() => setTab('movimientos')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                tab === 'movimientos'
                  ? 'bg-mavic-pink text-white shadow'
                  : 'bg-white text-gray-500 hover:text-gray-700 shadow-sm'
              }`}
            >
              Movimientos
            </button>
          )}
          <button
            onClick={() => setTab('servicios')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              tab === 'servicios'
                ? 'bg-mavic-pink text-white shadow'
                : 'bg-white text-gray-500 hover:text-gray-700 shadow-sm'
            }`}
          >
            Servicios vendidos
          </button>
          <button
            onClick={() => setTab('estadisticas')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              tab === 'estadisticas'
                ? 'bg-mavic-pink text-white shadow'
                : 'bg-white text-gray-500 hover:text-gray-700 shadow-sm'
            }`}
          >
            Estadísticas
          </button>
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
        {/* Aviso de apertura: sin cuadre registrado hoy (MAVIC-25) */}
        {!hayCuadreHoy && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-amber-800">Aún no has cuadrado la caja hoy.</p>
            <button
              onClick={() => openCuadre('apertura')}
              className="bg-amber-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-amber-600 transition"
            >
              Contar ahora
            </button>
          </div>
        )}

        {/* Saldo */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-emerald-400 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Saldo actual</p>
            <p className={`text-3xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-mavic-black'}`}>
              {fmtEuros(saldo)}
            </p>
          </div>
          <button
            onClick={() => openCuadre('cierre')}
            className="bg-mavic-black text-white text-sm font-bold px-5 py-2.5 rounded-lg hover:bg-mavic-black/85 transition"
          >
            Cierre de caja
          </button>
        </div>

        {/* Nuevo movimiento */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-mavic-pink">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Nuevo movimiento</h2>
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

        {/* Filtro */}
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink select-mavic"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink select-mavic"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mostrar</label>
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value === 'mes-completo' ? 'mes-completo' : parseInt(e.target.value) as typeof PAGE_SIZES[number])}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink select-mavic"
            >
              {PAGE_SIZES.map(n => <option key={n} value={n}>{n}</option>)}
              {permiteMesCompleto && <option value="mes-completo">Mes completo</option>}
            </select>
          </div>
        </div>

        {visiblesPeriodo.length < delPeriodo.length && (
          <p className="text-xs text-gray-500 mb-2">
            Mostrando {visiblesPeriodo.length} de {delPeriodo.length} movimientos.
          </p>
        )}

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Importe</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Nota</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {visiblesPeriodo.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No hay movimientos este mes.
                    </td>
                  </tr>
                ) : visiblesPeriodo.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{fmtFecha(m.fecha)}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${m.direccion === '+' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.direccion === '+' ? '+' : '−'} {fmtEuros(m.importe)}
                    </td>
                    <td className="px-3 py-2 text-gray-500">
                      {m.nota ? (
                        <button
                          type="button"
                          onClick={() => setDetalleMov(m)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-mavic-pink hover:text-mavic-pink/80 transition"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124M15.75 17.25h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                          </svg>
                          Ver nota
                        </button>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{m.quien_nombre}</td>
                  </tr>
                ))}

                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black">TOTAL DEL MES</td>
                  <td className={`px-3 py-3 text-right text-lg ${totalPeriodo < 0 ? 'text-red-600' : 'text-mavic-pink'}`}>
                    {totalPeriodo >= 0 ? '+' : '−'} {fmtEuros(Math.abs(totalPeriodo))}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimos cuadres (MAVIC-25) */}
        {cuadres.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-5 mt-5">
            <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Últimos cuadres de caja</h2>
            <ul className="divide-y divide-gray-100">
              {cuadres.map(c => (
                <li key={c.id} className="py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <span className="text-gray-500 w-28">{fmtFechaHora(c.created_at)}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    c.tipo === 'cierre' ? 'bg-mavic-black text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {c.tipo === 'cierre' ? 'Cierre' : 'Apertura'}
                  </span>
                  <span className={`font-semibold ${
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
            className={`relative bg-mavic-beige rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
              detalleVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0 rounded-t-xl">
              <h2 className="text-lg font-bold">Detalle del movimiento</h2>
              <button
                onClick={closeDetalle}
                aria-label="Cerrar"
                className="p-2.5 -mr-2 -mt-1 rounded-full hover:bg-white/15 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="bg-white rounded-xl shadow p-5 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Fecha</span>
                  <span className="text-sm font-semibold text-mavic-black">{fmtFecha(detalleMov.fecha)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Importe</span>
                  <span className={`text-lg font-bold ${detalleMov.direccion === '+' ? 'text-green-600' : 'text-red-600'}`}>
                    {detalleMov.direccion === '+' ? '+' : '−'} {fmtEuros(detalleMov.importe)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registrado por</span>
                  <span className="text-sm text-gray-700">{detalleMov.quien_nombre}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hora de registro</span>
                  <span className="text-sm text-gray-700">{fmtFechaHora(detalleMov.created_at)}</span>
                </div>
                <div className="pt-1 border-t border-gray-100">
                  <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 mt-2">Nota</span>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                    {detalleMov.nota}
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
            className={`relative bg-mavic-beige rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
              cuadreVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0 rounded-t-xl">
              <h2 className="text-lg font-bold">{cuadreTipo === 'cierre' ? 'Cierre de caja' : 'Cuadre de caja'}</h2>
              <button
                onClick={closeCuadre}
                disabled={cuadreSaving}
                aria-label="Cerrar"
                className="p-2.5 -mr-2 -mt-1 rounded-full hover:bg-white/15 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="bg-white rounded-xl shadow p-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Según el registro, en el cajón debería haber
                </p>
                <p className="text-3xl font-bold text-mavic-black">{fmtEuros(saldo)}</p>

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
