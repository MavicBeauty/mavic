'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Movimiento {
  id: string;
  fecha: string;
  direccion: '+' | '-';
  importe: number;
  categoria: string;
  nota: string | null;
  quien_nombre: string;
  created_at: string;
}

interface Profile {
  id: string;
  name: string;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CATEGORIAS = ['Pago Yuranny', 'Pago Angelica', 'Nómina socios', 'Gastos varios', 'Otro'] as const;

function fmtEuros(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtFecha(fecha: string) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

export default function EmpleadaCajaBPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);

  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const [fecha, setFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [direccion, setDireccion] = useState<'+' | '-'>('+');
  const [importe, setImporte] = useState('');
  const [categoria, setCategoria] = useState<typeof CATEGORIAS[number]>(CATEGORIAS[0]);
  const [nota, setNota] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/empleada'); return; }
      const { data: prof } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();
      if (!prof) { router.replace('/empleada'); return; }
      setProfile({ id: session.user.id, name: (prof as { name: string }).name });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMovimientos = useCallback(async () => {
    const { data } = await supabase
      .from('caja_b_movimientos')
      .select('id, fecha, direccion, importe, categoria, nota, quien_nombre, created_at')
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const monto = parseFloat(importe);
    if (!monto || monto <= 0) { setSaveMsg('Error: importe inválido'); return; }
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('caja_b_movimientos').insert({
      fecha,
      direccion,
      importe: monto,
      categoria,
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
            <h1 className="text-xl font-bold">Caja B</h1>
            <p className="text-white/80 text-sm">{profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/empleada/dashboard')}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              ← Inicio
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/empleada'); }}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
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
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
                <select
                  value={categoria}
                  onChange={e => setCategoria(e.target.value as typeof CATEGORIAS[number])}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
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
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Fecha</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Categoría</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Importe</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Nota</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Registrado por</th>
                </tr>
              </thead>
              <tbody>
                {delPeriodo.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                      No hay movimientos este mes.
                    </td>
                  </tr>
                ) : delPeriodo.map(m => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-700">{fmtFecha(m.fecha)}</td>
                    <td className="px-3 py-2 text-gray-700">{m.categoria}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${m.direccion === '+' ? 'text-green-600' : 'text-red-600'}`}>
                      {m.direccion === '+' ? '+' : '−'} {fmtEuros(m.importe)} €
                    </td>
                    <td className="px-3 py-2 text-gray-500">{m.nota || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{m.quien_nombre}</td>
                  </tr>
                ))}

                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black" colSpan={2}>TOTAL DEL MES</td>
                  <td className={`px-3 py-3 text-right text-lg ${totalPeriodo < 0 ? 'text-red-600' : 'text-mavic-pink'}`}>
                    {totalPeriodo >= 0 ? '+' : '−'} {fmtEuros(Math.abs(totalPeriodo))} €
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
