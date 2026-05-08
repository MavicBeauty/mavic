'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  session_date: string;
  form_data: {
    zonas?: string;
    power?: string;
    sesion_number?: string;
    observations?: string;
    adverse_reactions?: Record<string, boolean>;
  };
  created_at: string;
}

interface ConsentForm {
  id: string;
  created_at: string;
  form_data: Record<string, string>;
  doc_storage_path: string;
}

interface ClientProfile {
  id: string;
  name: string;
  apellidos: string;
  phone: string;
  dni?: string;
  fecha_nacimiento?: string;
  direccion?: string;
  poblacion?: string;
  cp?: string;
  provincia?: string;
  created_at: string;
}

function DownloadConsentButton({ path }: { path: string }) {
  const supabase = createClient();
  const handleDownload = async () => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };
  return (
    <button onClick={handleDownload}
      className="text-mavic-pink hover:text-mavic-pink/70 font-semibold text-sm transition">
      Descargar PDF →
    </button>
  );
}

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [consent, setConsent] = useState<ConsentForm | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    Promise.all([
      supabase.from('clients').select('*').eq('id', params.id).single(),
      supabase
        .from('clinical_sessions')
        .select('*')
        .eq('client_id', params.id)
        .order('session_date', { ascending: false }),
      supabase
        .from('consent_forms')
        .select('*')
        .eq('client_id', params.id)
        .single(),
    ]).then(([clientRes, sessionsRes, consentRes]) => {
      if (clientRes.data) setClient(clientRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (consentRes.data) setConsent(consentRes.data);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Cliente no encontrado</p>
          <Link href="/admin/clientes" className="text-mavic-pink font-semibold">
            ← Volver a Clientes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{client.name} {client.apellidos}</h1>
            <p className="text-white/80 mt-1">{client.phone}</p>
          </div>
          <Link href="/admin/clientes" className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver a Clientes
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-mavic-black mb-4">Información del Cliente</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-600">Nombre completo</p>
              <p className="text-lg font-semibold text-mavic-black">{client.name} {client.apellidos}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="text-lg font-semibold text-mavic-black">{client.phone}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">DNI/NIE</p>
              <p className="text-lg font-semibold text-mavic-black">{client.dni || '—'}</p>
            </div>
            {client.fecha_nacimiento && (
              <div>
                <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                <p className="text-lg font-semibold text-mavic-black">
                  {new Date(client.fecha_nacimiento).toLocaleDateString('es-ES')}
                </p>
              </div>
            )}
            {client.direccion && (
              <div className="md:col-span-2">
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="text-lg font-semibold text-mavic-black">
                  {client.direccion}{client.poblacion ? `, ${client.poblacion}` : ''}{client.cp ? ` ${client.cp}` : ''}{client.provincia ? ` (${client.provincia})` : ''}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Consent Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-mavic-black">Consentimiento Informado</h2>
          </div>
          {consent ? (
            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <p className="text-green-700 font-semibold">✓ Consentimiento registrado</p>
                <p className="text-sm text-gray-600 mt-1">
                  Firmado el {new Date(consent.created_at).toLocaleDateString('es-ES', {
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>
              {consent.doc_storage_path && (
                <DownloadConsentButton path={consent.doc_storage_path} />
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-yellow-800 font-semibold">⚠ Sin consentimiento registrado</p>
              <p className="text-yellow-700 text-sm mt-1">El cliente no tiene consentimiento informado. Es obligatorio antes del primer tratamiento.</p>
            </div>
          )}
        </div>

        {/* Clinical History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-mavic-black">Historial Clínico</h2>
            <Link
              href={`/admin/clientes/${client.id}/nueva-sesion`}
              className="bg-mavic-pink hover:bg-mavic-pink/90 text-white font-semibold px-4 py-2 rounded-lg transition"
            >
              + Nueva Sesión
            </Link>
          </div>

          {sessions.length === 0 ? (
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
              {sessions.map((session) => (
                <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-mavic-black">
                        Sesión {session.form_data?.sesion_number || '—'}
                        {session.form_data?.zonas ? ` — ${session.form_data.zonas}` : ''}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(session.session_date).toLocaleDateString('es-ES', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                        })}
                      </p>
                    </div>
                    {session.form_data?.power && (
                      <span className="text-sm text-mavic-pink font-semibold">
                        {session.form_data.power} J
                      </span>
                    )}
                  </div>
                  {session.form_data?.observations && (
                    <p className="text-gray-700 text-sm mt-2">{session.form_data.observations}</p>
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
