'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import VentasPanel from '@/components/VentasPanel';
import RegistroStats from '@/components/RegistroStats';

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

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const PAGE_SIZES = [20, 50, 100] as const;
type PageSize = typeof PAGE_SIZES[number] | 'mes-completo';

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
    const { data } = await supabase
      .from('registro_movimientos')
      .select('id, fecha, direccion, importe, nota, quien_nombre, created_at')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false });
    const rows = (data as Array<Omit<Movimiento, 'importe'> & { importe: number | string }> | null) ?? [];
    // numeric(10,2) columns come back from PostgREST as strings — coerce before summing.
    setMovimientos(rows.map(r => ({ ...r, importe: Number(r.importe) })));
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
          <VentasPanel profile={profile} isAdmin={isAdmin} />
        ) : (
          <>
        {/* Saldo */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-emerald-400">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Saldo actual</p>
          <p className={`text-3xl font-bold ${saldo < 0 ? 'text-red-600' : 'text-mavic-black'}`}>
            {fmtEuros(saldo)} €
          </p>
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
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
            >
              {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Mostrar</label>
            <select
              value={pageSize}
              onChange={e => setPageSize(e.target.value === 'mes-completo' ? 'mes-completo' : parseInt(e.target.value) as typeof PAGE_SIZES[number])}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
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
                      {m.direccion === '+' ? '+' : '−'} {fmtEuros(m.importe)} €
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
                    {totalPeriodo >= 0 ? '+' : '−'} {fmtEuros(Math.abs(totalPeriodo))} €
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
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
                    {detalleMov.direccion === '+' ? '+' : '−'} {fmtEuros(detalleMov.importe)} €
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
    </div>
  );
}
