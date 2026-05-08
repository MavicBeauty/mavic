'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

interface FileRecord {
  id: string;
  type: 'consent' | 'session';
  date: string;
  title: string;
  description?: string;
}

interface ClientProfile {
  id: string;
  name: string;
  phone: string;
  dni?: string;
  files: FileRecord[];
}

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock client data
    const mockClient: ClientProfile = {
      id: params.id,
      name: 'María García',
      phone: '+34 612 345 678',
      dni: '12345678A',
      files: [
        {
          id: 'consent-1',
          type: 'consent',
          date: '2024-01-15',
          title: 'Consentimiento Informado',
          description: 'Consentimiento para depilación láser',
        },
        {
          id: 'session-1',
          type: 'session',
          date: '2024-02-10',
          title: 'Sesión 1 - Depilación Láser',
          description: 'Piernas completas | Potencia: 18J | Zona tratada',
        },
        {
          id: 'session-2',
          type: 'session',
          date: '2024-03-15',
          title: 'Sesión 2 - Depilación Láser',
          description: 'Piernas completas | Potencia: 19J | Sin reacciones',
        },
        {
          id: 'session-3',
          type: 'session',
          date: '2024-04-20',
          title: 'Sesión 3 - Depilación Láser',
          description: 'Piernas completas | Potencia: 19J | Excelente evolución',
        },
      ],
    };

    setClient(mockClient);
    setLoading(false);
  }, [params.id]);

  if (loading || !client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  const consentFile = client.files.find((f) => f.type === 'consent');
  const sessionFiles = client.files.filter((f) => f.type === 'session');

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{client.name}</h1>
            <p className="text-white/80 mt-1">{client.phone}</p>
          </div>
          <Link
            href="/admin/clientes"
            className="text-white hover:text-gray-100 font-semibold transition"
          >
            ← Volver a Clientes
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-mavic-black mb-4">Información del Cliente</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-600">Nombre</p>
              <p className="text-lg font-semibold text-mavic-black">{client.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="text-lg font-semibold text-mavic-black">{client.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">DNI</p>
              <p className="text-lg font-semibold text-mavic-black">{client.dni || '—'}</p>
            </div>
          </div>
        </div>

        {/* Consent Form */}
        {consentFile && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-mavic-black">📋 Consentimiento</h2>
              <button className="text-mavic-pink hover:text-mavic-pink/70 font-semibold transition">
                Descargar
              </button>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">
                Fecha: {new Date(consentFile.date).toLocaleDateString('es-ES')}
              </p>
              <p className="text-gray-700 mt-2">{consentFile.description}</p>
            </div>
          </div>
        )}

        {/* Clinical History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-mavic-black">📊 Historial Clínico</h2>
            <Link
              href={`/admin/clientes/${client.id}/nueva-sesion`}
              className="bg-mavic-pink hover:bg-mavic-pink/90 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              + Nueva Sesión
            </Link>
          </div>

          {sessionFiles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No hay sesiones registradas</p>
              <Link
                href={`/admin/clientes/${client.id}/nueva-sesion`}
                className="inline-block text-mavic-pink hover:text-mavic-pink/70 font-semibold transition"
              >
                Registrar Primera Sesión →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionFiles.reverse().map((file) => (
                <div
                  key={file.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-mavic-black">{file.title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(file.date).toLocaleDateString('es-ES', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <button className="text-mavic-pink hover:text-mavic-pink/70 font-semibold transition">
                      Descargar
                    </button>
                  </div>
                  {file.description && (
                    <p className="text-gray-700 text-sm">{file.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
