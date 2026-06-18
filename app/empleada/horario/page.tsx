'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateTimesheetPDF } from '@/lib/timesheet-pdf';
import SignaturePad from '@/components/SignaturePad';

interface DayEntry {
  day: number;
  entry1: string; exit1: string;
  entry2: string; exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
  ent_comp?: string;
  sal_comp?: string;
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

interface EmployeeProfile {
  name: string;
  timesheet_permission: 'read' | 'edit';
  employee_labor_info_id: string;
}

interface SigState {
  employee_signature_path: string | null;
  employer_signature_path: string | null;
  employee_signed_at: string | null;
  employer_signed_at: string | null;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DOW_LETTER = ['D','L','M','X','J','V','S'];
const ABSENCE_LABELS: Record<string, string> = { morning: 'Mañana', afternoon: 'Tarde', all: 'Todo el día' };

const EMPLOYEE_COLORS = [
  { borderL: 'border-l-rose-400',   dot: 'bg-rose-400'   },
  { borderL: 'border-l-violet-400', dot: 'bg-violet-400' },
  { borderL: 'border-l-sky-400',    dot: 'bg-sky-400'    },
  { borderL: 'border-l-teal-400',   dot: 'bg-teal-400'   },
  { borderL: 'border-l-amber-500',  dot: 'bg-amber-500'  },
  { borderL: 'border-l-indigo-400', dot: 'bg-indigo-400' },
] as const;

function emptyDays(): DayEntry[] {
  return Array.from({ length: 31 }, (_, i) => ({
    day: i + 1, entry1: '', exit1: '', entry2: '', exit2: '', absence: 'none', notes: '',
  }));
}

function calcDailyHours(d: DayEntry): number {
  if (d.absence === 'all' || !d.entry1 || !d.exit1) return 0;
  const [h1, m1] = d.entry1.split(':').map(Number);
  const [h2, m2] = d.exit1.split(':').map(Number);
  let h = h2 - h1 + (m2 - m1) / 60;
  if (d.entry2 && d.exit2) {
    const [h3, m3] = d.entry2.split(':').map(Number);
    const [h4, m4] = d.exit2.split(':').map(Number);
    h += h4 - h3 + (m4 - m3) / 60;
  }
  if (d.ent_comp && d.sal_comp) {
    const [h5, m5] = d.ent_comp.split(':').map(Number);
    const [h6, m6] = d.sal_comp.split(':').map(Number);
    h += h6 - h5 + (m6 - m5) / 60;
  }
  return Math.max(0, h);
}

function fmtTs(iso: string) {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

export default function EmpleadaHorarioPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [days, setDays] = useState<DayEntry[]>(emptyDays());
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sigState, setSigState] = useState<SigState>({ employee_signature_path: null, employer_signature_path: null, employee_signed_at: null, employer_signed_at: null });
  const [showSignPad, setShowSignPad] = useState(false);
  const [sigWorking, setSigWorking] = useState(false);
  const [sigMsg, setSigMsg] = useState('');
  const [changeRequestedAt, setChangeRequestedAt] = useState<string | null>(null);
  const [laborInfo, setLaborInfo] = useState<EmployeeLaborInfo | null>(null);
  const [observations, setObservations] = useState('');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [fading, setFading] = useState(false);

  const supabase = createClient();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalHours = days
    .filter(d => d.day <= daysInMonth)
    .reduce((s, d) => s + calcDailyHours(d), 0);

  const isSigned = !!sigState.employee_signature_path;
  const employerSigned = !!sigState.employer_signature_path;
  const canEdit = profile?.timesheet_permission === 'edit' && !isSigned;
  const empColorIdx = laborInfo ? parseInt(laborInfo.id[0], 16) % EMPLOYEE_COLORS.length : 0;
  const empColor = EMPLOYEE_COLORS[empColorIdx];

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/empleada'); return; }
      const { data: prof } = await supabase
        .from('profiles')
        .select('name, timesheet_permission, employee_labor_info_id')
        .eq('id', session.user.id)
        .single();
      if (!prof) { router.replace('/empleada'); return; }
      setProfile(prof as EmployeeProfile);
      const { data: labor } = await supabase
        .from('employee_labor_info')
        .select('*')
        .eq('id', (prof as EmployeeProfile).employee_labor_info_id)
        .single();
      if (labor) {
        setDisplayName((labor as EmployeeLaborInfo).display_name);
        setLaborInfo(labor as EmployeeLaborInfo);
      }
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!displayName) return;
    setFading(true);
    await new Promise<void>(resolve => setTimeout(resolve, 120));
    const { data } = await supabase
      .from('timesheets')
      .select('day_entries, observations, change_requested_at, employee_signature_path, employer_signature_path, employee_signed_at, employer_signed_at')
      .eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year)
      .single();
    const row = data as {
      day_entries: DayEntry[];
      observations: string | null;
      change_requested_at: string | null;
      employee_signature_path: string | null;
      employer_signature_path: string | null;
      employee_signed_at: string | null;
      employer_signed_at: string | null;
    } | null;
    setDays(row?.day_entries ?? emptyDays());
    setObservations(row?.observations ?? '');
    setChangeRequestedAt(row?.change_requested_at ?? null);
    setFading(false);
    setSigState({
      employee_signature_path: row?.employee_signature_path ?? null,
      employer_signature_path: row?.employer_signature_path ?? null,
      employee_signed_at: row?.employee_signed_at ?? null,
      employer_signed_at: row?.employer_signed_at ?? null,
    });
    setEditMode(false);
  }, [displayName, month, year]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleDayChange = (day: number, field: string, value: string) => {
    setDays(days.map(d => d.day === day ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    if (!displayName) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase.from('timesheets').upsert({
      employee_name: displayName,
      period_month: month,
      period_year: year,
      day_entries: days,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_name,period_month,period_year' });
    setSaving(false);
    setSaveMsg(error ? `Error: ${error.message}` : '✓ Guardado');
    setTimeout(() => setSaveMsg(''), 3000);
  };

  const handleSign = async (dataUrl: string) => {
    if (!profile || !displayName) return;
    setShowSignPad(false);
    setSigWorking(true);
    setSigMsg('');

    // Ensure timesheet row exists before signing
    await supabase.from('timesheets').upsert({
      employee_name: displayName,
      period_month: month,
      period_year: year,
      day_entries: days,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'employee_name,period_month,period_year' });

    // Convert dataUrl to Uint8Array
    const base64 = dataUrl.split(',')[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const path = `employee/${profile.employee_labor_info_id}/${year}-${String(month).padStart(2,'0')}.png`;
    const { error: upErr } = await supabase.storage
      .from('signatures')
      .upload(path, bytes, { contentType: 'image/png', upsert: true });

    if (upErr) {
      setSigMsg('Error al guardar la firma. Inténtalo de nuevo.');
      setSigWorking(false);
      return;
    }

    const signedAt = new Date().toISOString();
    const { data: updated, error: dbErr } = await supabase.from('timesheets').update({
      employee_signature_path: path,
      employee_signed_at: signedAt,
    }).eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year)
      .select('id');

    if (dbErr || !updated?.length) {
      setSigMsg('Error al registrar la firma. Sin permiso o fila no encontrada.');
      setSigWorking(false);
      return;
    }

    setSigState(s => ({ ...s, employee_signature_path: path, employee_signed_at: signedAt }));
    setSigMsg('✓ Mes firmado correctamente');
    setSigWorking(false);
    setTimeout(() => setSigMsg(''), 4000);
  };

  const handleDeleteSign = async () => {
    if (!profile || !displayName || !sigState.employee_signature_path) return;
    setSigWorking(true);
    setSigMsg('');

    await supabase.storage.from('signatures').remove([sigState.employee_signature_path]);

    const { data: updated, error } = await supabase.from('timesheets').update({
      employee_signature_path: null,
      employee_signed_at: null,
    }).eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year)
      .select('id');

    if (error || !updated?.length) {
      setSigMsg('Error al anular la firma. Sin permiso.');
      setSigWorking(false);
      return;
    }

    setSigState(s => ({ ...s, employee_signature_path: null, employee_signed_at: null }));
    setSigMsg('Firma anulada');
    setSigWorking(false);
    setTimeout(() => setSigMsg(''), 3000);
  };

  const downloadSig = async (path: string): Promise<Uint8Array | undefined> => {
    const { data } = await supabase.storage.from('signatures').download(path);
    if (!data) return undefined;
    const buf = await data.arrayBuffer();
    return new Uint8Array(buf);
  };

  const handleGeneratePdf = async () => {
    if (!laborInfo) return;
    setGeneratingPdf(true);
    try {
      const [empSig, emplrSig] = await Promise.all([
        sigState.employee_signature_path ? downloadSig(sigState.employee_signature_path) : Promise.resolve(undefined),
        sigState.employer_signature_path ? downloadSig(sigState.employer_signature_path) : Promise.resolve(undefined),
      ]);
      const pdfBytes = await generateTimesheetPDF({
        employee: laborInfo, month, year, days, totalHours,
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
      a.download = `registro_jornada_${displayName.toLowerCase().replace(/\s+/g, '_')}_${String(month).padStart(2,'0')}_${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleUnsignForChange = async () => {
    if (!profile || !displayName || !sigState.employee_signature_path) return;
    setSigWorking(true);
    setSigMsg('');

    await supabase.storage.from('signatures').remove([sigState.employee_signature_path]);

    const { data: updated, error } = await supabase.from('timesheets').update({
      employee_signature_path: null,
      employee_signed_at: null,
      change_requested_at: null,
    }).eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year)
      .select('id');

    if (error || !updated?.length) {
      setSigMsg('Error al retirar la firma. Sin permiso.');
      setSigWorking(false);
      return;
    }

    setSigState(s => ({ ...s, employee_signature_path: null, employee_signed_at: null }));
    setChangeRequestedAt(null);
    setSigMsg('Firma retirada — la empresa puede realizar las correcciones');
    setSigWorking(false);
    setTimeout(() => setSigMsg(''), 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      {showSignPad && (
        <SignaturePad
          title="Firmar registro mensual"
          subtitle={`${MONTHS[month - 1]} ${year} — Dibuja tu firma para confirmar el registro`}
          notice="Firma únicamente si el mes ha terminado y has revisado que las horas reflejadas son correctas. Una vez que firmes, la empresa no podrá realizar ningún cambio en este registro."
          onConfirm={handleSign}
          onCancel={() => setShowSignPad(false)}
        />
      )}

      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Registro de horario</h1>
            <p className="text-white/80 text-sm">{profile?.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/empleada/dashboard')}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              ← Inicio
            </button>
            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/empleada'); }}
              className="text-white/80 hover:text-white text-sm font-semibold transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {changeRequestedAt && (
        <div className="bg-orange-50 border-b-2 border-orange-300 px-4 py-4">
          <div className="max-w-5xl mx-auto flex items-center gap-4 flex-wrap">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-bold text-orange-800">La empresa ha solicitado modificaciones en este registro</p>
                <p className="text-xs text-orange-700 mt-0.5">Retira tu firma para permitir los cambios. Podrás volver a firmar una vez revisado.</p>
              </div>
            </div>
            <button
              onClick={handleUnsignForChange}
              disabled={sigWorking}
              className="flex-shrink-0 px-4 py-2 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition disabled:opacity-50"
            >
              {sigWorking ? 'Procesando...' : 'Retirar mi firma'}
            </button>
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Controls */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5">
          <div className="flex flex-wrap gap-4 items-end justify-between">
            <div className="flex gap-3 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
                <select
                  value={month}
                  onChange={e => setMonth(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
                <select
                  value={year}
                  onChange={e => setYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                >
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-2 items-center flex-wrap">
              {saveMsg && (
                <span className={`text-sm font-semibold ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                  {saveMsg}
                </span>
              )}
              <button
                onClick={handleGeneratePdf}
                disabled={generatingPdf || !laborInfo}
                className="bg-mavic-gold hover:bg-mavic-gold/90 text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition"
              >
                {generatingPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
              {canEdit && (
                <>
                  <button
                    onClick={() => setEditMode(!editMode)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${
                      editMode
                        ? 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
                        : 'bg-mavic-pink/10 text-mavic-pink border-mavic-pink/20 hover:bg-mavic-pink/20'
                    }`}
                  >
                    {editMode ? 'Modo lectura' : 'Editar'}
                  </button>
                  {editMode && (
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-mavic-pink text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            {isSigned
              ? 'Mes firmado — no se pueden modificar los datos'
              : editMode
                ? 'Modo edición activo — recuerda guardar los cambios'
                : profile?.timesheet_permission === 'edit'
                  ? 'Modo lectura — pulsa "Editar" para modificar'
                  : 'Solo lectura'}
          </p>
        </div>

        {/* Signature status panel */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Firmas del mes</h2>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            {/* Employee signature */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${isSigned ? 'border-green-200 bg-green-50/40' : 'border-gray-100 bg-gray-50/60'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{displayName}</p>
              {isSigned ? (
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

            {/* Employer signature */}
            <div className={`rounded-xl border-2 p-4 transition-colors ${employerSigned ? 'border-green-200 bg-green-50/40' : 'border-gray-100 bg-gray-50/60'}`}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Empresa</p>
              {employerSigned ? (
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

          <div className="flex gap-2 items-center flex-wrap">
            {sigMsg && (
              <span className={`text-sm font-semibold ${sigMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {sigMsg}
              </span>
            )}
            {!isSigned && (
              <button
                onClick={() => setShowSignPad(true)}
                disabled={sigWorking}
                className="px-5 py-2 text-sm font-bold text-white bg-gradient-to-r from-mavic-pink to-mavic-gold rounded-lg hover:shadow-lg transition disabled:opacity-50"
              >
                {sigWorking ? 'Procesando...' : 'Firmar mes'}
              </button>
            )}
            {isSigned && !employerSigned && (
              <button
                onClick={handleDeleteSign}
                disabled={sigWorking}
                className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition disabled:opacity-50"
              >
                {sigWorking ? 'Anulando...' : 'Anular mi firma'}
              </button>
            )}
          </div>
        </div>

        {/* Fading content area */}
        <div className={`transition-opacity duration-150 ${fading ? 'opacity-0' : 'opacity-100'}`}>

        {/* Stats */}
        <div className="mb-5">
          <div className={`bg-white p-4 rounded-lg shadow border-l-4 ${empColor.borderL}`}>
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Horas trabajadas</p>
            <p className="text-3xl font-bold text-mavic-pink">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-1">{MONTHS[month - 1]} {year}</p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-14">Día</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 1</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Entrada 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Salida 2</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Total h</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Ausencia</th>
                </tr>
              </thead>
              <tbody>
                {days.filter(d => d.day <= daysInMonth).map(day => {
                  const dow = new Date(year, month - 1, day.day).getDay();
                  const hours = calcDailyHours(day);
                  const hasAbsence = day.absence !== 'none';
                  const isFullDayAbsence = day.absence === 'all';

                  return (
                    <tr key={day.day} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-700">
                        {day.day}
                        <span className="text-gray-400 text-xs ml-1">{DOW_LETTER[dow]}</span>
                      </td>

                      {(['entry1','exit1','entry2','exit2'] as const).map(field => (
                        <td key={field} className="px-2 py-1.5">
                          {editMode && !isFullDayAbsence ? (
                            <input
                              type="time"
                              value={day[field]}
                              onChange={e => handleDayChange(day.day, field, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink"
                            />
                          ) : (
                            <span className="text-xs text-gray-500 block text-center">
                              {isFullDayAbsence ? '—' : (day[field] || '—')}
                            </span>
                          )}
                        </td>
                      ))}

                      <td className="px-3 py-1.5 text-center">
                        {hours > 0 ? (
                          <span className="font-bold text-mavic-pink">{hours.toFixed(1)}</span>
                        ) : hasAbsence ? (
                          <span className="text-xs text-amber-600 font-medium">{ABSENCE_LABELS[day.absence]}</span>
                        ) : null}
                      </td>

                      <td className="px-2 py-1.5">
                        {editMode ? (
                          <select
                            value={day.absence}
                            onChange={e => handleDayChange(day.day, 'absence', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink"
                          >
                            <option value="none">—</option>
                            <option value="morning">Mañana</option>
                            <option value="afternoon">Tarde</option>
                            <option value="all">Todo el día</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500 block text-center">
                            {hasAbsence ? ABSENCE_LABELS[day.absence] : ''}
                          </span>
                        )}
                      </td>

                    </tr>
                  );
                })}

                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black" colSpan={5}>TOTAL DEL MES</td>
                  <td className="px-3 py-3 text-center text-mavic-pink text-lg">{totalHours.toFixed(1)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        </div> {/* end fade wrapper */}
      </main>
    </div>
  );
}
