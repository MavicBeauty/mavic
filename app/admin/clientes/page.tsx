'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Client {
  id: string;
  name: string;
  apellidos: string;
  phone: string;
  dni?: string;
  created_at: string;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchType, setSearchType] = useState<'name' | 'phone'>('name');
  const [loading, setLoading] = useState(true);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('clients')
      .select('id, name, apellidos, phone, dni, created_at')
      .order('created_at', { ascending: false })
      .then(({ data, error }: { data: Client[] | null; error: unknown }) => {
        if (!error && data) {
          setClients(data);
          setFilteredClients(data);
        }
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredClients(clients);
      return;
    }
    const filtered = clients.filter((client) => {
      if (searchType === 'name') {
        const fullName = `${client.name} ${client.apellidos || ''}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      } else {
        return client.phone.includes(searchTerm);
      }
    });
    setFilteredClients(filtered);
  }, [searchTerm, searchType, clients]);

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gestión de Clientes</h1>
            <p className="text-white/80 mt-1">Buscar, ver y editar clientes</p>
          </div>
          <Link
            href="/admin/clientes/nuevo"
            className="bg-white text-mavic-pink font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            + Nuevo Cliente
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-mavic-black mb-4">Buscar Cliente</h2>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar por:</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSearchType('name')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${searchType === 'name' ? 'bg-mavic-pink text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Nombre
                </button>
                <button
                  onClick={() => setSearchType('phone')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${searchType === 'phone' ? 'bg-mavic-pink text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  Teléfono
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {searchType === 'name' ? 'Nombre' : 'Teléfono'}
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={searchType === 'name' ? 'Ej: María García' : 'Ej: 612345678'}
                className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-bold text-mavic-black">
              Clientes ({filteredClients.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-center text-gray-600">Cargando...</div>
          ) : filteredClients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'No se encontraron clientes' : 'No hay clientes registrados aún'}
              </p>
              <Link
                href="/admin/clientes/nuevo"
                className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-semibold px-6 py-2 rounded-lg transition"
              >
                Crear Nuevo Cliente
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Nombre</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Teléfono</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">DNI</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Registro</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-mavic-black">
                        {client.name} {client.apellidos}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{client.phone}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{client.dni || '—'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(client.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <Link
                          href={`/admin/clientes/${client.id}`}
                          className="text-mavic-pink hover:text-mavic-pink/70 font-semibold transition"
                        >
                          Ver Perfil →
                        </Link>
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
