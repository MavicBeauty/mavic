'use client';

import Link from 'next/link';
import { useState } from 'react';

interface Promotion {
  id: string;
  title_es: string;
  title_ca: string;
  description_es: string;
  description_ca: string;
  price: number;
  valid_until: string;
  is_active: boolean;
  created_at: string;
}

export default function OfertasPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([
    {
      id: '1',
      title_es: 'Primer Tratamiento Láser',
      title_ca: 'Primer Tractament Làser',
      description_es: 'Descuento 20% en el primer tratamiento de depilación láser',
      description_ca: 'Descompte 20% en el primer tractament de depilació làser',
      price: 48,
      valid_until: '2026-06-30',
      is_active: true,
      created_at: '2026-05-01',
    },
    {
      id: '2',
      title_es: 'Combo Manicura + Pedicura',
      title_ca: 'Combo Manicura + Pedicura',
      description_es: 'Manicura gel + pedicura clásica por €35',
      description_ca: 'Manicura gel + pedicura clàssica per €35',
      price: 35,
      valid_until: '2026-05-31',
      is_active: true,
      created_at: '2026-05-01',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Promotion, 'id' | 'created_at'>>({
    title_es: '',
    title_ca: '',
    description_es: '',
    description_ca: '',
    price: 0,
    valid_until: new Date().toISOString().split('T')[0],
    is_active: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      setPromotions(
        promotions.map((p) =>
          p.id === editingId ? { ...p, ...formData } : p
        )
      );
      setEditingId(null);
    } else {
      setPromotions([
        ...promotions,
        {
          ...formData,
          id: Date.now().toString(),
          created_at: new Date().toISOString().split('T')[0],
        },
      ]);
    }
    resetForm();
  };

  const handleEdit = (promotion: Promotion) => {
    const { id, created_at, ...rest } = promotion;
    setFormData(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta oferta?')) {
      setPromotions(promotions.filter((p) => p.id !== id));
    }
  };

  const resetForm = () => {
    setFormData({
      title_es: '',
      title_ca: '',
      description_es: '',
      description_ca: '',
      price: 0,
      valid_until: new Date().toISOString().split('T')[0],
      is_active: true,
    });
    setShowForm(false);
    setEditingId(null);
  };

  const toggleActive = (id: string) => {
    setPromotions(
      promotions.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    );
  };

  const today = new Date().toISOString().split('T')[0];
  const expiredCount = promotions.filter((p) => p.valid_until < today).length;
  const activeCount = promotions.filter((p) => p.is_active).length;

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Ofertas Especiales</h1>
            <p className="text-white/80 mt-1">Crear y gestionar promociones</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-white hover:text-gray-100 font-semibold transition"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">TOTAL OFERTAS</p>
            <p className="text-3xl font-bold text-mavic-pink">{promotions.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">ACTIVAS</p>
            <p className="text-3xl font-bold text-mavic-gold">{activeCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">EXPIRADAS</p>
            <p className="text-3xl font-bold text-red-600">{expiredCount}</p>
          </div>
        </div>

        {/* Add Promotion Button */}
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            + Nueva Oferta
          </button>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-mavic-black mb-6">
              {editingId ? 'Editar Oferta' : 'Nueva Oferta'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título en Español *
                  </label>
                  <input
                    type="text"
                    name="title_es"
                    value={formData.title_es}
                    onChange={handleChange}
                    placeholder="Ej: Primer Tratamiento Láser"
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Título en Catalán *
                  </label>
                  <input
                    type="text"
                    name="title_ca"
                    value={formData.title_ca}
                    onChange={handleChange}
                    placeholder="Ej: Primer Tractament Làser"
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción en Español *
                </label>
                <textarea
                  name="description_es"
                  value={formData.description_es}
                  onChange={handleChange}
                  placeholder="Describe la oferta en detalle"
                  rows={3}
                  className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descripción en Catalán *
                </label>
                <textarea
                  name="description_ca"
                  value={formData.description_ca}
                  onChange={handleChange}
                  placeholder="Descriu l'oferta en detall"
                  rows={3}
                  className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Precio Especial (€) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    placeholder="0.00"
                    step="0.01"
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Válida hasta *
                  </label>
                  <input
                    type="date"
                    name="valid_until"
                    value={formData.valid_until}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="w-4 h-4 rounded text-mavic-pink focus:ring-mavic-pink"
                  />
                  <span className="text-gray-700">Mostrar en el sitio web</span>
                </label>
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition"
                >
                  {editingId ? 'Actualizar' : 'Crear'} Oferta
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Promotions List */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">
              Ofertas Actuales ({promotions.length})
            </h3>
          </div>

          {promotions.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-4">No hay ofertas registradas</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Oferta (ES / CA)
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Precio
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Válida hasta
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => {
                    const isExpired = promo.valid_until < today;
                    return (
                      <tr key={promo.id} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-mavic-black">
                            {promo.title_es}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">{promo.title_ca}</div>
                          <div className="text-xs text-gray-600 mt-2">
                            {promo.description_es}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-mavic-pink">
                          €{promo.price.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {new Date(promo.valid_until).toLocaleDateString('es-ES')}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => toggleActive(promo.id)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition w-fit ${
                                promo.is_active
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }`}
                            >
                              {promo.is_active ? 'Activa' : 'Inactiva'}
                            </button>
                            {isExpired && (
                              <span className="text-xs text-red-600 font-semibold">
                                Expirada
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm space-x-2">
                          <button
                            onClick={() => handleEdit(promo)}
                            className="text-mavic-pink hover:text-mavic-pink/70 font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(promo.id)}
                            className="text-red-600 hover:text-red-800 font-semibold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
