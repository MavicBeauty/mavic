'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { generateTimesheetPDF } from '@/lib/timesheet-pdf';
import SignaturePad from '@/components/SignaturePad';

interface DayEntry {
  day: number;
  entry1: string;
  exit1: string;
  entry2: string;
  exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
}

interface EmployeeLaborInfo {
  id: string;
  display_name: string;
  nombre_completo: string;
  nif: string;
  num_afiliacion_ss?: string;
  puesto_trabajo?: string;
  categoria?: string;
  grupo_cotizacion?: string;
  fecha_antiguedad?: string;
  weekly_hours?: number | null;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];


function emptyDays(): DayEntry[] {
  return Array.from({ length: 31 }, (_, i) => ({
    day: i + 1, entry1: '', exit1: '', entry2: '', exit2: '', absence: 'none', notes: '',
  }));
}

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<EmployeeLaborInfo[]>([]);
  const [employee, setEmployee] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<DayEntry[]>(emptyDays());
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sigState, setSigState] = useState({ employee_signature_path: null as string | null, employer_signature_path: null as string | null, employee_signed_at: null as string | null, employer_signed_at: null as string | null });
  const [showSignPad, setShowSignPad] = useState(false);
  const [sigWorking, setSigWorking] = useState(false);
  const [sigMsg, setSigMsg] = useState('');
  const [observations, setObservations] = useState('');
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState('');
  const [showGestoriaConfirm, setShowGestoriaConfirm] = useState(false);
  const [gestoriaTargets, setGestoriaTargets] = useState<string[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const supabase = createClient();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const daysInMonth = new Date(year, month, 0).getDate();

  useEffect(() => {
    supabase
      .from('employee_labor_info')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .then(({ data }: { data: EmployeeLaborInfo[] | null }) => {
        if (data && data.length > 0) {
          setEmployees(data);
          setEmployee(data[0].display_name);
        }
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!employee) return;
    const { data } = await supabase
      .from('timesheets')
      .select('day_entries, observations, employee_signature_path, employer_signature_path, employee_signed_at, employer_signed_at')
      .eq('employee_name', employee)
      .eq('period_month', month)
      .eq('period_year', year)
      .single();
    const row = data as { day_entries: DayEntry[]; observations: string | null; employee_signature_path: string | null; employer_signature_path: string | null; employee_signed_at: string | null; employer_signed_at: string | null } | null;
    setDays(row?.day_entries ?? emptyDays());
    setObservations(row?.observations ?? '');
    setSigState({
      employee_signature_path: row?.employee_signature_path ?? null,
      employer_signature_path: row?.employer_signature_path ?? null,
      employee_signed_at: row?.employee_signed_at ?? null,
      employer_signed_at: row?.employer_signed_at ?? null,
    });
  }, [employee, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDayChange = (day: number, field: string, value: string) => {
    setDays(days.map((d) => d.day === day ? { ...d, [field]: value } : d));
  };

  const calcDailyHours = (d: DayEntry): number => {
    if (d.absence === 'all' || !d.entry1 || !d.exit1) return 0;
    const [h1, m1] = d.entry1.split(':').map(Number);
    const [h2, m2] = d.exit1.split(':').map(Number);
    let h = h2 - h1 + (m2 - m1) / 60;
    if (d.entry2 && d.exit2) {
      const [h3, m3] = d.entry2.split(':').map(Number);
      const [h4, m4] = d.exit2.split(':').map(Number);
      h += h4 - h3 + (m4 - m3) / 60;
    }
    return Math.max(0, h);
  };

  const totalHours = days.filter((d) => d.day <= daysInMonth).reduce((s, d) => s + calcDailyHours(d), 0);
  const bothSigned = !!(sigState.employee_signature_path && sigState.employer_signature_path);
  // expectedHours will be derived from weekly_hours once the formula is decided
  const expectedHours = null as number | null;
  const extraHours = null as number | null;

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('timesheets').upsert({
      employee_name: employee,
      period_month: month,
      period_year: year,
      day_entries: days,
      observations: observations || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_name,period_month,period_year' });

    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : '✓ Guardado');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handlePrint = () => window.print();

  const downloadSig = async (path: string): Promise<Uint8Array | undefined> => {
    const { data } = await supabase.storage.from('signatures').download(path);
    if (!data) return undefined;
    const buf = await data.arrayBuffer();
    return new Uint8Array(buf);
  };

  const handleGeneratePdf = async () => {
    const empProfile = employees.find(e => e.display_name === employee);
    if (!empProfile) return;
    setGeneratingPdf(true);
    try {
      const [empSig, emplrSig] = await Promise.all([
        sigState.employee_signature_path ? downloadSig(sigState.employee_signature_path) : Promise.resolve(undefined),
        sigState.employer_signature_path ? downloadSig(sigState.employer_signature_path) : Promise.resolve(undefined),
      ]);
      const pdfBytes = await generateTimesheetPDF({
        employee: empProfile,
        month,
        year,
        days,
        totalHours,
        observations: observations || undefined,
        employeeSignature: empSig,
        employerSignature: emplrSig,
        employeeSignedAt: sigState.employee_signed_at ?? undefined,
        employerSignedAt: sigState.employer_signed_at ?? undefined,
      });
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `registro_jornada_${employee.toLowerCase()}_${String(month).padStart(2,'0')}_${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleEmployerSign = async (dataUrl: string) => {
    const empProfile = employees.find(e => e.display_name === employee);
    if (!empProfile) return;
    setShowSignPad(false);
    setSigWorking(true);
    setSigMsg('');

    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `employer/${empProfile.id}/${year}-${String(month).padStart(2,'0')}.png`;
    const { error: upErr } = await supabase.storage
      .from('signatures')
      .upload(path, bytes, { contentType: 'image/png', upsert: true });

    if (upErr) {
      setSigMsg('Error al guardar la firma.');
      setSigWorking(false);
      return;
    }

    const signedAt = new Date().toISOString();
    const { error: dbErr } = await supabase.from('timesheets').update({
      employer_signature_path: path,
      employer_signed_at: signedAt,
    }).eq('employee_name', employee)
      .eq('period_month', month)
      .eq('period_year', year);

    if (dbErr) {
      setSigMsg('Error al registrar la firma en la base de datos.');
      setSigWorking(false);
      return;
    }

    setSigState(s => ({ ...s, employer_signature_path: path, employer_signed_at: signedAt }));
    setSigMsg('✓ Mes firmado como empresa');
    setSigWorking(false);
    setTimeout(() => setSigMsg(''), 4000);
  };

  const fmtTs = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  };

  const handleSendToGestoria = async () => {
    const empProfile = employees.find(e => e.display_name === employee);
    if (!empProfile) return;
    setSending(true);
    setSendMsg('');
    try {
      const [empSig, emplrSig] = await Promise.all([
        sigState.employee_signature_path ? downloadSig(sigState.employee_signature_path) : Promise.resolve(undefined),
        sigState.employer_signature_path ? downloadSig(sigState.employer_signature_path) : Promise.resolve(undefined),
      ]);
      const pdfBytes = await generateTimesheetPDF({
        employee: empProfile, month, year, days, totalHours,
        observations: observations || undefined,
        employeeSignature: empSig, employerSignature: emplrSig,
        employeeSignedAt: sigState.employee_signed_at ?? undefined,
        employerSignedAt: sigState.employer_signed_at ?? undefined,
      });
      // Convert to base64
      const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/send-timesheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pdfBase64, employeeName: employee, month, year }),
      });
      const json = await res.json();
      if (json.error) {
        setSendMsg(`Error: ${json.error}`);
      } else {
        setSendMsg('✓ Enviado a la gestoría');
        setTimeout(() => setSendMsg(''), 5000);
      }
    } catch (e) {
      setSendMsg(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setSending(false);
    }
  };

  const handleGestoriaClick = async () => {
    setLoadingTargets(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/send-timesheet', {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    const json = await res.json();
    setGestoriaTargets(json.targets ?? []);
    setLoadingTargets(false);
    setShowGestoriaConfirm(true);
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      {showGestoriaConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-mavic-black mb-2">Enviar a la gestoría</h3>
            <p className="text-sm text-gray-600 mb-3">
              Vas a enviar el registro de <strong>{employee}</strong> — {MONTHS[month - 1]} {year} a:
            </p>
            <ul className="bg-gray-50 rounded-lg px-4 py-3 mb-4 space-y-1">
              {gestoriaTargets.length > 0
                ? gestoriaTargets.map(t => (
                    <li key={t} className="text-sm font-medium text-gray-700">{t}</li>
                  ))
                : <li className="text-sm text-red-500">No hay destinatarios configurados (GESTORIA_EMAIL)</li>
              }
            </ul>
            <p className="text-xs text-gray-400 mb-5">¿Confirmas el envío?</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowGestoriaConfirm(false); handleSendToGestoria(); }}
                disabled={gestoriaTargets.length === 0 || sending}
                className="flex-1 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-50"
              >
                Confirmar envío
              </button>
              <button
                onClick={() => setShowGestoriaConfirm(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {showSignPad && (
        <SignaturePad
          title="Firmar como empresa"
          subtitle={`${MONTHS[month - 1]} ${year} — ${employee}`}
          onConfirm={handleEmployerSign}
          onCancel={() => setShowSignPad(false)}
        />
      )}

      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Control de Horarios</h1>
            <p className="text-white/80 mt-1">Registro diario de horas trabajadas</p>
          </div>
          <Link href="/admin/empleadas" className="text-white/80 hover:text-white font-semibold transition text-sm">← Volver</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="grid md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Empleada</label>
              <select value={employee} onChange={(e) => setEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                disabled={employees.length === 0}>
                {employees.length === 0
                  ? <option>Sin empleadas registradas</option>
                  : employees.map((e) => <option key={e.id} value={e.display_name}>{e.display_name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Mes</label>
              <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Año</label>
              <select value={year} onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink">
                {years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || bothSigned}
                className="flex-1 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button onClick={handleGeneratePdf} disabled={generatingPdf || employees.length === 0}
                className="flex-1 bg-mavic-gold hover:bg-mavic-gold/90 text-white font-bold py-2 px-4 rounded-lg transition disabled:opacity-50">
                {generatingPdf ? 'Generando...' : 'Generar PDF'}
              </button>
            </div>
            <div>
              {saveMsg && (
                <p className={`text-sm font-semibold ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS TRABAJADAS</p>
            <p className="text-3xl font-bold text-mavic-pink">{totalHours.toFixed(1)}</p>
            <p className="text-gray-500 text-xs mt-2">
              {expectedHours != null ? `de ${expectedHours.toFixed(1)} esperadas` : 'horas este mes'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">HORAS EXTRAS</p>
            <p className="text-3xl font-bold text-mavic-gold">
              {extraHours != null ? extraHours.toFixed(1) : '—'}
            </p>
            {expectedHours != null && (
              <p className="text-gray-500 text-xs mt-2">
                {totalHours < expectedHours
                  ? `faltan ${(expectedHours - totalHours).toFixed(1)}h`
                  : totalHours === expectedHours
                  ? 'completo ✓'
                  : `+${extraHours!.toFixed(1)}h sobre lo esperado`}
              </p>
            )}
          </div>
        </div>

        {/* Signature status */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Firmas del mes</h3>
            <button
              onClick={() => load()}
              className="text-xs text-gray-400 hover:text-mavic-pink font-semibold transition"
            >
              ↻ Actualizar
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mb-5">
            {/* Employee */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${sigState.employee_signature_path ? 'border-green-200 bg-green-50/40' : 'border-gray-100 bg-gray-50/60'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{employee}</p>
              {sigState.employee_signature_path ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">✓</span>
                    <span className="text-sm font-bold text-green-700">Firmado</span>
                  </div>
                  {sigState.employee_signed_at && (
                    <p className="text-xs text-gray-400 mt-1 ml-7">{fmtTs(sigState.employee_signed_at)}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-400">Pendiente de firma</span>
                </div>
              )}
            </div>

            {/* Employer */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${sigState.employer_signature_path ? 'border-green-200 bg-green-50/40' : 'border-gray-100 bg-gray-50/60'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Empresa</p>
              {sigState.employer_signature_path ? (
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">✓</span>
                    <span className="text-sm font-bold text-green-700">Firmado</span>
                  </div>
                  {sigState.employer_signed_at && (
                    <p className="text-xs text-gray-400 mt-1 ml-7">{fmtTs(sigState.employer_signed_at)}</p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                  <span className="text-sm font-semibold text-gray-400">Pendiente de firma</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {(sigMsg || sendMsg) && (
              <span className={`text-sm font-semibold ${(sigMsg || sendMsg).startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {sigMsg || sendMsg}
              </span>
            )}
            {!sigState.employer_signature_path && (
              <button
                onClick={() => setShowSignPad(true)}
                disabled={sigWorking || !sigState.employee_signature_path}
                title={!sigState.employee_signature_path ? 'La empleada debe firmar primero' : undefined}
                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-mavic-pink to-mavic-gold rounded-lg hover:shadow-lg transition disabled:opacity-40"
              >
                {sigWorking ? 'Procesando...' : 'Firmar como empresa'}
              </button>
            )}
            {sigState.employee_signature_path && sigState.employer_signature_path && (
              <button
                onClick={handleGestoriaClick}
                disabled={sending || loadingTargets}
                className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition disabled:opacity-40"
              >
                {sending ? 'Enviando...' : loadingTargets ? 'Cargando...' : 'Enviar a gestoría'}
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-mavic-black">{MONTHS[month - 1]} {year} — {employee}</h3>
            {bothSigned && (
              <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                Bloqueado — ambas partes han firmado
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">Día</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Total h</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Ausencia</th>
                </tr>
              </thead>
              <tbody>
                {days.filter((d) => d.day <= daysInMonth).map((day) => {
                  const dow = new Date(year, month - 1, day.day).getDay();
                  const isWeekend = dow === 0 || dow === 6;
                  const hours = calcDailyHours(day);

                  return (
                    <tr key={day.day} className={isWeekend ? 'bg-gray-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2 font-semibold text-gray-700">
                        {day.day}
                        <span className="text-gray-400 text-xs ml-1">
                          {['D','L','M','X','J','V','S'][dow]}
                        </span>
                      </td>
                      {(['entry1','exit1','entry2','exit2'] as const).map((field) => (
                        <td key={field} className="px-2 py-2">
                          <input type="time" value={day[field]}
                            onChange={(e) => handleDayChange(day.day, field, e.target.value)}
                            disabled={day.absence === 'all' || bothSigned}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink disabled:bg-gray-100 disabled:text-gray-400" />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center font-semibold text-mavic-black">
                        {hours > 0 ? hours.toFixed(1) : day.absence !== 'none' ? '—' : ''}
                      </td>
                      <td className="px-2 py-2">
                        <select value={day.absence} onChange={(e) => handleDayChange(day.day, 'absence', e.target.value)}
                          disabled={bothSigned}
                          className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink disabled:bg-gray-100 disabled:text-gray-400">
                          <option value="none">—</option>
                          <option value="morning">Mañana</option>
                          <option value="afternoon">Tarde</option>
                          <option value="all">Todo el día</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black" colSpan={5}>TOTAL DEL MES</td>
                  <td className="px-3 py-3 text-center text-mavic-pink text-lg">{totalHours.toFixed(1)}</td>
                  <td className="px-3 py-3 text-gray-500 text-sm">
                    {expectedHours != null
                      ? totalHours > expectedHours
                        ? `+${(totalHours - expectedHours).toFixed(1)}h extras`
                        : totalHours < expectedHours
                        ? `${(expectedHours - totalHours).toFixed(1)}h pendientes`
                        : 'Completo ✓'
                      : ''}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Observaciones */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">Observaciones</label>
          <textarea
            value={observations}
            onChange={e => setObservations(e.target.value)}
            rows={2}
            placeholder="Texto libre que aparecerá en el apartado de observaciones del PDF..."
            disabled={bothSigned}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink resize-none disabled:bg-gray-50 disabled:text-gray-400"
          />
          <p className="text-xs text-gray-400 mt-1">Se guarda junto con el registro y se incluye en el PDF generado.</p>
        </div>

        {/* Bottom save bar */}
        <div className="mt-4 flex items-center justify-end gap-4">
          {saveMsg && (
            <p className={`text-sm font-semibold ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </p>
          )}
          <button
            onClick={handleSave}
            disabled={saving || bothSigned}
            className="bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-2 px-6 rounded-lg transition disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </main>
    </div>
  );
}
