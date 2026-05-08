'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

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

const emptyForm = {
  title_es: '',
  title_ca: '',
  description_es: '',
  description_ca: '',
  price: 0,
  valid_until: new Date().toISOString().split('T')[0],
  is_active: true,
};

export default function OfertasPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (data) setPromotions(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split('T')[0];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : type === 'number' ? parseFloat(value) : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editingId) {
      await supabase.from('promotions').update(formData).eq('id', editingId);
    } else {
      await supabase.from('promotions').insert([formData]);
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (p: Promotion) => {
    const { id, created_at, ...rest } = p;
    setFormData(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta oferta?')) return;
    await supabase.from('promotions').delete().eq('id', id);
    setPromotions(promotions.filter((p) => p.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('promotions').update({ is_active: !current }).eq('id', id);
    setPromotions(promotions.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  const activeCount = promotions.filter((p) => p.is_active && p.valid_until >= today).length;
  const expiredCount = promotions.filter((p) => p.valid_until < today).length;

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Ofertas Especiales</h1>
            <p className="text-white/80 mt-1">Crear y gestionar promociones</p>
          </div>
          <Link href="/admin/dashboard" className="text-white hover:text-gray-100 font-semibold transition">← Volver</Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
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

        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="mb-8 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-6 rounded-lg transition">
            + Nueva Oferta
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-mavic-black mb-6">{editingId ? 'Editar Oferta' : 'Nueva Oferta'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Título en Español *</label>
                  <input type="text" name="title_es" value={formData.title_es} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Título en Catalán *</label>
                  <input type="text" name="title_ca" value={formData.title_ca} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción en Español *</label>
                <textarea name="description_es" value={formData.description_es} onChange={handleChange} rows={3} required
                  className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción en Catalán *</label>
                <textarea name="description_ca" value={formData.description_ca} onChange={handleChange} rows={3} required
                  className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio Especial (€) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} step="0.01" required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Válida hasta *</label>
                  <input type="date" name="valid_until" value={formData.valid_until} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange}
                  className="w-4 h-4 rounded text-mavic-pink focus:ring-mavic-pink" />
                <span className="text-gray-700">Mostrar en el sitio web</span>
              </label>
              <div className="flex gap-4 pt-4">
                <button type="submit" disabled={saving}
                  className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition disabled:opacity-50">
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" onClick={resetForm}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">Ofertas ({promotions.length})</h3>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600">Cargando...</div>
          ) : promotions.length === 0 ? (
            <div className="p-12 text-center text-gray-600">No hay ofertas registradas</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Oferta</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Válida hasta</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-mavic-black">{promo.title_es}</div>
                        <div className="text-xs text-gray-500">{promo.title_ca}</div>
                        <div className="text-xs text-gray-600 mt-1">{promo.description_es}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-mavic-pink">€{Number(promo.price).toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(promo.valid_until).toLocaleDateString('es-ES')}
                        {promo.valid_until < today && <span className="ml-2 text-xs text-red-600 font-semibold">Expirada</span>}
                      </td>
                      <td className="px-6 py-4">
                        <button onClick={() => toggleActive(promo.id, promo.is_active)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition ${promo.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                          {promo.is_active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm space-x-2">
                        <button onClick={() => handleEdit(promo)} className="text-mavic-pink hover:text-mavic-pink/70 font-semibold">Editar</button>
                        <button onClick={() => handleDelete(promo.id)} className="text-red-600 hover:text-red-800 font-semibold">Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
