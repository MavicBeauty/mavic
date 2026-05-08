'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function NuevoClientePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    apellidos: '',
    phone: '',
    dni: '',
    fecha_nacimiento: '',
    direccion: '',
    poblacion: '',
    cp: '',
    provincia: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { data, error: dbError } = await supabase
      .from('clients')
      .insert([formData])
      .select('id')
      .single();

    if (dbError) {
      setError('Error al crear cliente: ' + dbError.message);
      setLoading(false);
      return;
    }

    router.push(`/admin/clientes/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Nuevo Cliente</h1>
            <p className="text-white/80 mt-1">Registrar nuevo cliente</p>
          </div>
          <Link href="/admin/clientes" className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Información Personal</h2>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Apellidos</label>
                  <input
                    type="text"
                    name="apellidos"
                    value={formData.apellidos}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">DNI/NIE</label>
                  <input
                    type="text"
                    name="dni"
                    value={formData.dni}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    name="fecha_nacimiento"
                    value={formData.fecha_nacimiento}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-mavic-black mb-4">Dirección</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
                  <input
                    type="text"
                    name="direccion"
                    value={formData.direccion}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    disabled={loading}
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Población</label>
                    <input
                      type="text"
                      name="poblacion"
                      value={formData.poblacion}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Código Postal</label>
                    <input
                      type="text"
                      name="cp"
                      value={formData.cp}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provincia</label>
                    <input
                      type="text"
                      name="provincia"
                      value={formData.provincia}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Guardando...' : 'Crear Cliente'}
              </button>
              <Link
                href="/admin/clientes"
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition text-center"
              >
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
