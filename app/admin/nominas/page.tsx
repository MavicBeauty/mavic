'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmployeeLaborInfo {
  id: string;
  display_name: string;
}

interface Nomina {
  id: string;
  employee_id: string;
  period_month: number;
  period_year: number;
  file_path: string;
  file_name: string;
  importe_liquido: number | null;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  employee_labor_info: { display_name: string };
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function NominasAdminPage() {
  const supabase = createClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [employees, setEmployees] = useState<EmployeeLaborInfo[]>([]);
  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [filterEmployee, setFilterEmployee] = useState<string>('all');

  // Upload form state
  const [uploadEmployee, setUploadEmployee] = useState('');
  const [uploadMonth, setUploadMonth] = useState(new Date().getMonth() + 1);
  const [uploadYear, setUploadYear] = useState(new Date().getFullYear());
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadImporte, setUploadImporte] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const loadEmployees = useCallback(async () => {
    const { data } = await supabase
      .from('employee_labor_info')
      .select('id, display_name')
      .eq('is_active', true)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setEmployees(data as EmployeeLaborInfo[]);
      setUploadEmployee(data[0].id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNominas = useCallback(async () => {
    const { data } = await supabase
      .from('nominas')
      .select('*, employee_labor_info(display_name)')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (data) setNominas(data as unknown as Nomina[]);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadEmployees();
    loadNominas();
  }, [loadEmployees, loadNominas]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadEmployee) return;
    setUploading(true);
    setUploadMsg('');

    const ext = uploadFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') {
      setUploadMsg('Solo se admiten archivos PDF.');
      setUploading(false);
      return;
    }

    const safeFileName = uploadFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `${uploadEmployee}/${uploadYear}-${String(uploadMonth).padStart(2, '0')}-${safeFileName}`;

    const { error: storageErr } = await supabase.storage
      .from('nominas')
      .upload(path, uploadFile, { contentType: 'application/pdf', upsert: true });

    if (storageErr) {
      setUploadMsg(`Error al subir archivo: ${storageErr.message}`);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from('nominas').insert({
      employee_id: uploadEmployee,
      period_month: uploadMonth,
      period_year: uploadYear,
      file_path: path,
      file_name: uploadFile.name,
      importe_liquido: uploadImporte ? parseFloat(uploadImporte) : null,
      notes: uploadNotes || null,
    });

    if (dbErr) {
      // Roll back storage upload on DB failure
      await supabase.storage.from('nominas').remove([path]);
      setUploadMsg(`Error al guardar: ${dbErr.message}`);
      setUploading(false);
      return;
    }

    setUploadMsg('✓ Nómina subida correctamente');
    setUploadFile(null);
    setUploadImporte('');
    setUploadNotes('');
    if (fileRef.current) fileRef.current.value = '';
    setTimeout(() => setUploadMsg(''), 4000);
    setUploading(false);
    loadNominas();
  };

  const handleTogglePaid = async (nomina: Nomina) => {
    const nowPaid = !nomina.paid;
    const { error } = await supabase.from('nominas').update({
      paid: nowPaid,
      paid_at: nowPaid ? new Date().toISOString() : null,
    }).eq('id', nomina.id);
    if (!error) loadNominas();
  };

  const handleDownload = async (nomina: Nomina) => {
    const { data, error } = await supabase.storage
      .from('nominas')
      .createSignedUrl(nomina.file_path, 120);
    if (error || !data?.signedUrl) return;
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = nomina.file_name;
    a.click();
  };

  const handleDelete = async (nomina: Nomina) => {
    if (!confirm(`¿Eliminar nómina de ${nomina.employee_labor_info.display_name} — ${MONTHS[nomina.period_month - 1]} ${nomina.period_year}?`)) return;
    await supabase.storage.from('nominas').remove([nomina.file_path]);
    await supabase.from('nominas').delete().eq('id', nomina.id);
    loadNominas();
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
  };

  const filtered = filterEmployee === 'all'
    ? nominas
    : nominas.filter(n => n.employee_id === filterEmployee);

  const pendingCount = nominas.filter(n => !n.paid).length;

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Nóminas</h1>
            <p className="text-white/80 mt-1">
              {pendingCount > 0
                ? `${pendingCount} nómina${pendingCount > 1 ? 's' : ''} pendiente${pendingCount > 1 ? 's' : ''} de pago`
                : 'Gestión de nóminas'}
            </p>
          </div>
          <Link href="/admin/empleadas" className="text-white/80 hover:text-white font-semibold transition text-sm">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* Upload form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold text-mavic-black mb-5">Subir nómina</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Empleada</label>
                <select
                  value={uploadEmployee}
                  onChange={e => setUploadEmployee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                  disabled={employees.length === 0}
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.display_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                <select
                  value={uploadMonth}
                  onChange={e => setUploadMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
                <select
                  value={uploadYear}
                  onChange={e => setUploadYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Archivo PDF</label>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-mavic-pink/10 file:text-mavic-pink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Importe líquido (€) <span className="font-normal text-gray-400">— opcional</span></label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={uploadImporte}
                  onChange={e => setUploadImporte(e.target.value)}
                  placeholder="Ej: 1350.00"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notas <span className="font-normal text-gray-400">— opcional</span></label>
              <input
                type="text"
                value={uploadNotes}
                onChange={e => setUploadNotes(e.target.value)}
                placeholder="Ej: Incluye paga extra"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              <button
                type="submit"
                disabled={uploading || !uploadFile}
                className="px-6 py-2.5 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white text-sm font-bold rounded-lg hover:shadow-lg transition disabled:opacity-50"
              >
                {uploading ? 'Subiendo...' : 'Subir nómina'}
              </button>
              {uploadMsg && (
                <p className={`text-sm font-semibold ${uploadMsg.startsWith('Error') || uploadMsg.startsWith('Solo') ? 'text-red-600' : 'text-green-600'}`}>
                  {uploadMsg}
                </p>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-mavic-black">Historial</h2>
            <select
              value={filterEmployee}
              onChange={e => setFilterEmployee(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
            >
              <option value="all">Todas las empleadas</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.display_name}</option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-12">No hay nóminas registradas.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-left">
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Empleada</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Período</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Importe</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Estado</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subida</th>
                    <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(nomina => (
                    <tr key={nomina.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-3.5 font-semibold text-mavic-black">
                        {nomina.employee_labor_info.display_name}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {MONTHS[nomina.period_month - 1]} {nomina.period_year}
                        {nomina.notes && (
                          <span className="block text-xs text-gray-400 mt-0.5">{nomina.notes}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700">
                        {nomina.importe_liquido != null
                          ? `${nomina.importe_liquido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                          : <span className="text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        {nomina.paid ? (
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                              ✓ Pagada
                            </span>
                            {nomina.paid_at && (
                              <span className="block text-xs text-gray-400 mt-0.5">{fmtDate(nomina.paid_at)}</span>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-gray-400">
                        {fmtDate(nomina.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleDownload(nomina)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                            title="Descargar PDF"
                          >
                            Descargar
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            onClick={() => handleTogglePaid(nomina)}
                            className={`text-xs font-semibold transition ${nomina.paid ? 'text-gray-400 hover:text-amber-600' : 'text-green-600 hover:text-green-800'}`}
                            title={nomina.paid ? 'Marcar como pendiente' : 'Marcar como pagada'}
                          >
                            {nomina.paid ? 'Desmarcar' : 'Marcar pagada'}
                          </button>
                          <span className="text-gray-200">|</span>
                          <button
                            onClick={() => handleDelete(nomina)}
                            className="text-xs font-semibold text-red-400 hover:text-red-600 transition"
                            title="Eliminar nómina"
                          >
                            Eliminar
                          </button>
                        </div>
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
