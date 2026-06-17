'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Zone { name: string; fot: string; power: string; }

const ADVERSE_LABELS: Record<string, string> = {
  sun_exposure: 'Sol/UVA últimas 4 semanas',
  wax:          'Cera/Pinzas últimas 4 semanas',
  accutane:     'Reacutan últimos 6 meses',
  herpes:       'Herpes recidivante',
  bronzers:     'Uso bronceadores',
  bleaching:    'Decoloración 15 días previos',
  cosmetics:    'Cosméticos Ac.Glicólico/retinóico',
  chloasma:     'Cloasma/melasma',
};

const emptyZone = (): Zone => ({ name: '', fot: '', power: '' });

export default function NuevaSesionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [zones, setZones] = useState<Zone[]>([emptyZone()]);
  const [zonesReady, setZonesReady] = useState(false);
  const [observations, setObservations] = useState('');
  const [adverseReactions, setAdverseReactions] = useState<Record<string, boolean>>({
    sun_exposure: false, wax: false, accutane: false, herpes: false,
    bronzers: false, bleaching: false, cosmetics: false, chloasma: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('clinical_sessions')
      .select('form_data')
      .eq('client_id', params.id)
      .order('session_date', { ascending: true })
      .order('created_at', { ascending: true })
      .then(({ data }: { data: Array<{ form_data: Record<string, unknown> }> | null }) => {
        const seen: string[] = [];
        (data || []).forEach((s) => {
          const fd = s.form_data;
          if (Array.isArray(fd.zones)) {
            (fd.zones as Zone[]).forEach(z => { if (z.name && !seen.includes(z.name)) seen.push(z.name); });
          } else if (fd.zonas) {
            const n = String(fd.zonas);
            if (!seen.includes(n)) seen.push(n);
          }
        });
        if (seen.length) setZones(seen.map(name => ({ name, fot: '', power: '' })));
        setZonesReady(true);
      });
  }, [params.id]);

  function updateZone(idx: number, field: keyof Zone, value: string) {
    setZones(z => z.map((zone, i) => i === idx ? { ...zone, [field]: value } : zone));
  }

  function addZone() {
    if (zones.length < 6) setZones(z => [...z, emptyZone()]);
  }

  function removeZone(idx: number) {
    setZones(z => z.filter((_, i) => i !== idx));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const filledZones = zones.filter(z => z.name.trim());
    if (!filledZones.length) { setError('Añade al menos una zona'); return; }
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { data: { session: authSession } } = await supabase.auth.getSession();
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authSession?.access_token}` },
        body: JSON.stringify({
          client_id: params.id,
          session_date: sessionDate,
          zones: filledZones,
          observations,
          adverse_reactions: adverseReactions,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }
      router.push(`/admin/clientes/${params.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Nueva Sesión Clínica</h1>
            <p className="text-white/80 mt-1">Registrar nueva sesión de tratamiento</p>
          </div>
          <Link href={`/admin/clientes/${params.id}`} className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Date */}
            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Fecha de Sesión</h2>
              <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                required disabled={loading} />
            </div>

            {/* Zones */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-mavic-black">
                  Zonas Tratadas
                  {zonesReady && zones.some(z => z.name) && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      (precargadas del historial)
                    </span>
                  )}
                </h2>
                {zones.length < 6 && (
                  <button type="button" onClick={addZone} disabled={loading}
                    className="text-sm bg-mavic-pink text-white px-3 py-1 rounded-lg hover:bg-mavic-pink/80 transition">
                    + Añadir zona
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {zones.map((zone, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-gray-50 p-3 rounded-lg">
                    <input type="text" value={zone.name} placeholder="Zona (ej: Axilas)"
                      onChange={e => updateZone(idx, 'name', e.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading} />
                    <select value={zone.fot} onChange={e => updateZone(idx, 'fot', e.target.value)}
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading}>
                      <option value="">FOT</option>
                      <option value="30">30</option>
                      <option value="100">100</option>
                    </select>
                    <select value={zone.power} onChange={e => updateZone(idx, 'power', e.target.value)}
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading}>
                      <option value="">J</option>
                      <option value="14 J">14 J</option>
                      <option value="16 J">16 J</option>
                      <option value="18 J">18 J</option>
                      <option value="20 J">20 J</option>
                    </select>
                    {zones.length > 1 && (
                      <button type="button" onClick={() => removeZone(idx)} disabled={loading}
                        className="text-red-400 hover:text-red-600 text-lg px-1 transition">×</button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Adverse reactions */}
            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Reacciones Adversas / Contraindicaciones</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
                {Object.entries(ADVERSE_LABELS).map(([key, label]) => (
                  <label key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition ${
                      adverseReactions[key] ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <input type="checkbox" checked={adverseReactions[key]}
                      onChange={e => setAdverseReactions(r => ({ ...r, [key]: e.target.checked }))}
                      disabled={loading} className="w-4 h-4 rounded text-mavic-pink focus:ring-mavic-pink" />
                    <span className="text-gray-700 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Observations */}
            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Observaciones</h2>
              <textarea value={observations} onChange={e => setObservations(e.target.value)}
                placeholder="Notas adicionales sobre la sesión..." rows={4}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                disabled={loading} />
            </div>

            <div className="flex gap-4 pt-6">
              <button type="submit" disabled={loading}
                className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? 'Guardando y generando PDF...' : 'Guardar Sesión'}
              </button>
              <Link href={`/admin/clientes/${params.id}`}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-4 rounded-lg transition text-center">
                Cancelar
              </Link>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
