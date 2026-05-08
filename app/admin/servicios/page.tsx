'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Service {
  id: string;
  category: string;
  name_es: string;
  name_ca: string;
  price: number;
  price_note_es: string;
  price_note_ca: string;
  is_active: boolean;
  sort_order: number;
}

const emptyForm = {
  category: 'MANICURA',
  name_es: '',
  name_ca: '',
  price: 0,
  price_note_es: '',
  price_note_ca: '',
  is_active: true,
  sort_order: 1,
};

export default function ServiciosPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('services').select('*').order('sort_order');
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const categories = Array.from(new Set(services.map((s) => s.category)));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      await supabase.from('services').update(formData).eq('id', editingId);
    } else {
      await supabase.from('services').insert([{ ...formData, sort_order: services.length + 1 }]);
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleEdit = (s: Service) => {
    const { id, ...rest } = s;
    setFormData(rest);
    setEditingId(id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    await supabase.from('services').delete().eq('id', id);
    setServices(services.filter((s) => s.id !== id));
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('services').update({ is_active: !current }).eq('id', id);
    setServices(services.map((s) => (s.id === id ? { ...s, is_active: !current } : s)));
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setShowForm(false);
    setEditingId(null);
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Servicios & Precios</h1>
            <p className="text-white/80 mt-1">Gestionar servicios, precios y categorías</p>
          </div>
          <Link href="/admin/dashboard" className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="mb-8 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            + Nuevo Servicio
          </button>
        )}

        {showForm && (
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-bold text-mavic-black mb-6">
              {editingId ? 'Editar Servicio' : 'Nuevo Servicio'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Categoría *</label>
                  <select name="category" value={formData.category} onChange={handleChange}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                    {['MANICURA','PEDICURA','DEPILACION','TRATAMIENTOS','OTROS'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Precio (€) *</label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange}
                    step="0.01" required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre en Español *</label>
                  <input type="text" name="name_es" value={formData.name_es} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre en Catalán *</label>
                  <input type="text" name="name_ca" value={formData.name_ca} onChange={handleChange} required
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nota Precio ES (ej: "desde")</label>
                  <input type="text" name="price_note_es" value={formData.price_note_es} onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nota Precio CA (ej: "des de")</label>
                  <input type="text" name="price_note_ca" value={formData.price_note_ca} onChange={handleChange}
                    placeholder="Opcional"
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange}
                  className="w-4 h-4 rounded text-mavic-pink focus:ring-mavic-pink" />
                <span className="text-gray-700">Activo en el sitio web</span>
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

        {loading ? (
          <div className="text-center py-12 text-gray-600">Cargando servicios...</div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 mb-4">No hay servicios registrados</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <div key={category} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="px-6 py-4 bg-mavic-pink text-white">
                  <h3 className="text-xl font-bold">{category}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Servicio (ES / CA)</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Precio</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Notas</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                        <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.filter((s) => s.category === category).map((service) => (
                        <tr key={service.id} className="border-b border-gray-200 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-mavic-black">{service.name_es}</div>
                            <div className="text-xs text-gray-500 mt-1">{service.name_ca}</div>
                          </td>
                          <td className="px-6 py-4 text-sm font-semibold text-mavic-pink">
                            €{Number(service.price).toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-600">
                            {service.price_note_es || <span className="text-gray-400">—</span>}
                          </td>
                          <td className="px-6 py-4">
                            <button onClick={() => toggleActive(service.id, service.is_active)}
                              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${service.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}>
                              {service.is_active ? 'Activo' : 'Inactivo'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-sm space-x-2">
                            <button onClick={() => handleEdit(service)} className="text-mavic-pink hover:text-mavic-pink/70 font-semibold">Editar</button>
                            <button onClick={() => handleDelete(service.id)} className="text-red-600 hover:text-red-800 font-semibold">Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
