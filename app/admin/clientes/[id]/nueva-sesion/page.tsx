'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NuevaSesionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    session_date: new Date().toISOString().split('T')[0],
    zonas: '',
    fot: '',
    sesion_number: '1',
    power: '',
    observations: '',
    adverse_reactions: {
      sun_exposure: false,
      wax: false,
      accutane: false,
      herpes: false,
      bronzers: false,
      bleaching: false,
      cosmetics: false,
      chloasma: false,
    },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const [section, key] = name.split('.');
      if (section === 'adverse_reactions') {
        setFormData({
          ...formData,
          adverse_reactions: {
            ...formData.adverse_reactions,
            [key as keyof typeof formData.adverse_reactions]: (e.target as HTMLInputElement).checked,
          },
        });
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: params.id, ...formData }),
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

  const adverseReactionLabels: Record<string, string> = {
    sun_exposure: 'Sol/UVA últimas 4 semanas',
    wax: 'Cera/Pinzas últimas 4 semanas',
    accutane: 'Reacutan últimos 6 meses',
    herpes: 'Herpes recidivante',
    bronzers: 'Uso bronceadores',
    bleaching: 'Decoloración 15 días previos',
    cosmetics: 'Cosméticos Ac.Glicólico/retinóico',
    chloasma: 'Cloasma/melasma',
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
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Información de Sesión</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Sesión *</label>
                  <input type="date" name="session_date" value={formData.session_date} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Número de Sesión</label>
                  <input type="number" name="sesion_number" value={formData.sesion_number} onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Zonas Tratadas *</label>
                  <input type="text" name="zonas" value={formData.zonas} onChange={handleChange}
                    placeholder="Ej: Piernas, Brazos"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Potencia/Energía (J)</label>
                  <input type="text" name="power" value={formData.power} onChange={handleChange}
                    placeholder="Ej: 18"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">FOT</label>
                  <input type="text" name="fot" value={formData.fot} onChange={handleChange}
                    placeholder="Ej: 12"
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading} />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Reacciones Adversas / Contraindicaciones</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-50 p-4 rounded-lg">
                {Object.entries(adverseReactionLabels).map(([key, label]) => (
                  <label key={key}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer border-2 transition ${
                      formData.adverse_reactions[key as keyof typeof formData.adverse_reactions]
                        ? 'border-red-400 bg-red-50'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}>
                    <input type="checkbox" name={`adverse_reactions.${key}`}
                      checked={formData.adverse_reactions[key as keyof typeof formData.adverse_reactions]}
                      onChange={handleChange} disabled={loading}
                      className="w-4 h-4 rounded text-mavic-pink focus:ring-mavic-pink" />
                    <span className="text-gray-700 text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Observaciones</h2>
              <textarea name="observations" value={formData.observations} onChange={handleChange}
                placeholder="Notas adicionales sobre la sesión..."
                rows={4}
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
          <p className="text-sm text-gray-500 mt-6 text-center">* Campos obligatorios</p>
        </div>
      </main>
    </div>
  );
}
