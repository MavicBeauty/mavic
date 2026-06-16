'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Session {
  id: string;
  session_date: string;
  doc_storage_path?: string;
  form_data: {
    zones?: Array<{ name: string; fot: string; power: string }>;
    zonas?: string;
    power?: string;
    fot?: string;
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

interface ClientAttachment {
  id: string;
  file_name: string;
  storage_path: string;
  created_at: string;
}

function UploadConsentButton({ clientId, onDone }: { clientId: string; onDone: () => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const fileName = `consentimiento_${clientId}_${Date.now()}.${file.name.split('.').pop()}`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, file, { upsert: false });
    if (!uploadError) {
      await supabase.from('consent_forms').insert([{
        client_id: clientId,
        form_data: {},
        doc_storage_path: fileName,
      }]);
      onDone();
    }
    setUploading(false);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFile}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex-1 bg-white border-2 border-yellow-400 hover:border-mavic-pink text-yellow-800 hover:text-mavic-pink font-semibold px-4 py-2.5 rounded-lg transition text-sm disabled:opacity-50">
        {uploading ? 'Subiendo...' : '📎 Subir / fotografiar consentimiento físico'}
      </button>
    </>
  );
}

function UploadAttachmentButton({ clientId, onDone }: { clientId: string; onDone: (a: ClientAttachment) => void }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const storagePath = `adjunto_${clientId}_${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(storagePath, file, { upsert: false });
    if (!uploadError) {
      const { data } = await supabase
        .from('client_attachments')
        .insert([{ client_id: clientId, file_name: file.name, storage_path: storagePath }])
        .select()
        .single();
      if (data) onDone(data as ClientAttachment);
    }
    if (inputRef.current) inputRef.current.value = '';
    setUploading(false);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="text-sm font-semibold text-mavic-pink hover:text-mavic-pink/70 transition disabled:opacity-50"
      >
        {uploading ? 'Subiendo...' : '+ Añadir documento'}
      </button>
    </>
  );
}

function DownloadDocButton({ path, label = 'Descargar PDF →' }: { path: string; label?: string }) {
  const supabase = createClient();
  const handleDownload = async () => {
    const { data } = await supabase.storage.from('client-documents').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  };
  return (
    <button onClick={handleDownload}
      className="text-mavic-pink hover:text-mavic-pink/70 font-semibold text-sm transition">
      {label}
    </button>
  );
}

export default function ClientProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [client, setClient] = useState<ClientProfile | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [consent, setConsent] = useState<ConsentForm | null>(null);
  const [attachments, setAttachments] = useState<ClientAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deletingSession, setDeletingSession] = useState<string | null>(null);
  const [deletingAttachment, setDeletingAttachment] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '', apellidos: '', phone: '', dni: '',
    fecha_nacimiento: '', direccion: '', poblacion: '', cp: '', provincia: '',
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleDeleteSession = async (sessionId: string, sessionDate: string) => {
    if (!confirm(`¿Eliminar la sesión del ${new Date(sessionDate).toLocaleDateString('es-ES')}? Esta acción no se puede deshacer.`)) return;
    setDeletingSession(sessionId);
    const res = await fetch(`/api/sessions/${sessionId}`, { method: 'DELETE' });
    if (res.ok) {
      setSessions(s => s.filter(sess => sess.id !== sessionId));
    }
    setDeletingSession(null);
  };

  const handleDeleteAttachment = async (attachment: ClientAttachment) => {
    if (!confirm(`¿Eliminar "${attachment.file_name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingAttachment(attachment.id);
    const supabase = createClient();
    await supabase.storage.from('client-documents').remove([attachment.storage_path]);
    await supabase.from('client_attachments').delete().eq('id', attachment.id);
    setAttachments(a => a.filter(x => x.id !== attachment.id));
    setDeletingAttachment(null);
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar a ${client?.name} ${client?.apellidos}? Se borrarán también sus sesiones y consentimiento. Esta acción no se puede deshacer.`)) return;
    setDeleting(true);
    const supabase = createClient();
    const { data: forms } = await supabase.from('consent_forms').select('doc_storage_path').eq('client_id', params.id);
    const { data: attachs } = await supabase.from('client_attachments').select('storage_path').eq('client_id', params.id);
    const paths = [
      ...(forms || []).map((f: { doc_storage_path: string }) => f.doc_storage_path),
      ...(attachs || []).map((a: { storage_path: string }) => a.storage_path),
    ].filter(Boolean);
    if (paths.length) await supabase.storage.from('client-documents').remove(paths);
    await supabase.from('consent_forms').delete().eq('client_id', params.id);
    await supabase.from('clinical_sessions').delete().eq('client_id', params.id);
    await supabase.from('clients').delete().eq('id', params.id);
    router.push('/admin/clientes');
  };

  const handleEditStart = () => {
    if (!client) return;
    setEditData({
      name: client.name || '',
      apellidos: client.apellidos || '',
      phone: client.phone || '',
      dni: client.dni || '',
      fecha_nacimiento: client.fecha_nacimiento ? client.fecha_nacimiento.slice(0, 10) : '',
      direccion: client.direccion || '',
      poblacion: client.poblacion || '',
      cp: client.cp || '',
      provincia: client.provincia || '',
    });
    setSaveError('');
    setEditing(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    setSaveError('');
    const supabase = createClient();
    const { error } = await supabase.from('clients').update(editData).eq('id', params.id);
    if (error) {
      setSaveError('Error al guardar: ' + error.message);
    } else {
      setClient(c => c ? { ...c, ...editData } : c);
      setEditing(false);
    }
    setSaving(false);
  };

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
      supabase
        .from('client_attachments')
        .select('*')
        .eq('client_id', params.id)
        .order('created_at', { ascending: true }),
    ]).then(([clientRes, sessionsRes, consentRes, attachmentsRes]) => {
      if (clientRes.data) setClient(clientRes.data);
      if (sessionsRes.data) setSessions(sessionsRes.data);
      if (consentRes.data) setConsent(consentRes.data);
      if (attachmentsRes.data) setAttachments(attachmentsRes.data);
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
          <div className="flex items-center gap-4">
            <Link href="/admin/clientes" className="text-white hover:text-gray-100 font-semibold transition">
              ← Volver a Clientes
            </Link>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-white/20 hover:bg-red-500 text-white font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50">
              {deleting ? 'Eliminando...' : 'Eliminar cliente'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Client Info */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-mavic-black">Información del Cliente</h2>
            {!editing && (
              <button
                onClick={handleEditStart}
                className="text-sm font-semibold text-mavic-pink hover:text-mavic-pink/70 transition"
              >
                Editar
              </button>
            )}
          </div>

          {editing ? (
            <div className="space-y-6">
              {saveError && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{saveError}</div>
              )}
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { name: 'name', label: 'Nombre *', type: 'text', required: true },
                  { name: 'apellidos', label: 'Apellidos', type: 'text' },
                  { name: 'phone', label: 'Teléfono *', type: 'tel', required: true },
                  { name: 'dni', label: 'DNI/NIE', type: 'text' },
                  { name: 'fecha_nacimiento', label: 'Fecha de Nacimiento', type: 'date' },
                ].map(({ name, label, type, required }) => (
                  <div key={name}>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                    <input
                      type={type}
                      value={editData[name as keyof typeof editData]}
                      onChange={e => setEditData(d => ({ ...d, [name]: e.target.value }))}
                      required={required}
                      disabled={saving}
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
                  <input
                    type="text"
                    value={editData.direccion}
                    onChange={e => setEditData(d => ({ ...d, direccion: e.target.value }))}
                    disabled={saving}
                    className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:opacity-50"
                  />
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                  {[
                    { name: 'poblacion', label: 'Población' },
                    { name: 'cp', label: 'Código Postal' },
                    { name: 'provincia', label: 'Provincia' },
                  ].map(({ name, label }) => (
                    <div key={name}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
                      <input
                        type="text"
                        value={editData[name as keyof typeof editData]}
                        onChange={e => setEditData(d => ({ ...d, [name]: e.target.value }))}
                        disabled={saving}
                        className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:opacity-50"
                      />
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleEditSave}
                  disabled={saving}
                  className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold px-6 py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
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
          )}
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
                <DownloadDocButton path={consent.doc_storage_path} />
              )}
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg space-y-3">
              <div>
                <p className="text-yellow-800 font-semibold">⚠ Sin consentimiento registrado</p>
                <p className="text-yellow-700 text-sm mt-1">Es obligatorio antes del primer tratamiento.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href={`/consentimiento?clientId=${client.id}`}
                  className="flex-1 text-center bg-mavic-pink hover:bg-mavic-pink/90 text-white font-semibold px-4 py-2.5 rounded-lg transition text-sm">
                  📋 Rellenar consentimiento digital
                </Link>
                <UploadConsentButton clientId={client.id} onDone={() => window.location.reload()} />
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm font-semibold text-gray-600">Documentos adicionales</p>
              <UploadAttachmentButton
                clientId={client.id}
                onDone={attachment => setAttachments(a => [...a, attachment])}
              />
            </div>
            {attachments.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Sin documentos adjuntos</p>
            ) : (
              <ul className="space-y-2">
                {attachments.map(attachment => (
                  <li key={attachment.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5">
                    <div>
                      <p className="text-sm font-medium text-mavic-black">{attachment.file_name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(attachment.created_at).toLocaleDateString('es-ES', {
                          day: 'numeric', month: 'long', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <DownloadDocButton path={attachment.storage_path} label="Descargar →" />
                      <button
                        onClick={() => handleDeleteAttachment(attachment)}
                        disabled={deletingAttachment === attachment.id}
                        className="text-red-400 hover:text-red-600 text-sm font-semibold transition disabled:opacity-50"
                      >
                        {deletingAttachment === attachment.id ? '...' : 'Eliminar'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
              {sessions.map((session, idx) => {
                const zonesSummary = session.form_data?.zones?.length
                  ? session.form_data.zones.map(z => `${z.name}${z.fot ? ` FOT${z.fot}` : ''}${z.power ? ` ${z.power}` : ''}`).join(', ')
                  : session.form_data?.zonas
                    ? `${session.form_data.zonas}${session.form_data.power ? ` ${session.form_data.power}` : ''}${session.form_data.fot ? ` · FOT ${session.form_data.fot}` : ''}`
                    : null;
                return (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold text-mavic-black">
                          Sesión {sessions.length - idx}
                          {zonesSummary ? ` — ${zonesSummary}` : ''}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(session.session_date).toLocaleDateString('es-ES', {
                            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {session.doc_storage_path && (
                          <DownloadDocButton path={session.doc_storage_path} label="PDF →" />
                        )}
                        <Link
                          href={`/admin/clientes/${client.id}/editar-sesion/${session.id}`}
                          className="text-blue-500 hover:text-blue-700 font-semibold text-sm transition">
                          Editar
                        </Link>
                        <button
                          onClick={() => handleDeleteSession(session.id, session.session_date)}
                          disabled={deletingSession === session.id}
                          className="text-red-400 hover:text-red-600 font-semibold text-sm transition disabled:opacity-50">
                          {deletingSession === session.id ? '...' : 'Eliminar'}
                        </button>
                      </div>
                    </div>
                    {session.form_data?.observations && (
                      <p className="text-gray-700 text-sm mt-2">{session.form_data.observations}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
