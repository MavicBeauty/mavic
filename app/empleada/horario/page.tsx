'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import SignaturePad from '@/components/SignaturePad';

interface DayEntry {
  day: number;
  entry1: string; exit1: string;
  entry2: string; exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
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

function emptyDays(): DayEntry[] {
  return Array.from({ length: 31 }, (_, i) => ({
    day: i + 1, entry1: '', exit1: '', entry2: '', exit2: '', absence: 'none', notes: '',
  }));
}

function calcDailyHours(d: DayEntry): number {
  if (d.absence !== 'none' || !d.entry1 || !d.exit1) return 0;
  const [h1, m1] = d.entry1.split(':').map(Number);
  const [h2, m2] = d.exit1.split(':').map(Number);
  let h = h2 - h1 + (m2 - m1) / 60;
  if (d.entry2 && d.exit2) {
    const [h3, m3] = d.entry2.split(':').map(Number);
    const [h4, m4] = d.exit2.split(':').map(Number);
    h += h4 - h3 + (m4 - m3) / 60;
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

  const supabase = createClient();
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalHours = days
    .filter(d => d.day <= daysInMonth)
    .reduce((s, d) => s + calcDailyHours(d), 0);

  const isSigned = !!sigState.employee_signature_path;
  const employerSigned = !!sigState.employer_signature_path;
  // Lock editing once the employee has signed
  const canEdit = profile?.timesheet_permission === 'edit' && !isSigned;

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
        .select('display_name')
        .eq('id', (prof as EmployeeProfile).employee_labor_info_id)
        .single();
      if (labor) setDisplayName((labor as { display_name: string }).display_name);
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const load = useCallback(async () => {
    if (!displayName) return;
    const { data } = await supabase
      .from('timesheets')
      .select('day_entries, employee_signature_path, employer_signature_path, employee_signed_at, employer_signed_at')
      .eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year)
      .single();
    const row = data as {
      day_entries: DayEntry[];
      employee_signature_path: string | null;
      employer_signature_path: string | null;
      employee_signed_at: string | null;
      employer_signed_at: string | null;
    } | null;
    setDays(row?.day_entries ?? emptyDays());
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
    const { error: dbErr } = await supabase.from('timesheets').update({
      employee_signature_path: path,
      employee_signed_at: signedAt,
    }).eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year);

    if (dbErr) {
      setSigMsg('Error al registrar la firma. Inténtalo de nuevo.');
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

    const { error } = await supabase.from('timesheets').update({
      employee_signature_path: null,
      employee_signed_at: null,
    }).eq('employee_name', displayName)
      .eq('period_month', month)
      .eq('period_year', year);

    if (error) {
      setSigMsg('Error al anular la firma.');
      setSigWorking(false);
      return;
    }

    setSigState(s => ({ ...s, employee_signature_path: null, employee_signed_at: null }));
    setSigMsg('Firma anulada');
    setSigWorking(false);
    setTimeout(() => setSigMsg(''), 3000);
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
          <h2 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Firmas del mes</h2>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Employee signature */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-gray-500 font-semibold mb-1">Tu firma</p>
              {isSigned ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                    <span>✓</span> Firmado
                  </span>
                  {sigState.employee_signed_at && (
                    <span className="text-xs text-gray-400">{fmtTs(sigState.employee_signed_at)}</span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                  Pendiente de firma
                </span>
              )}
            </div>

            {/* Employer signature */}
            <div className="flex-1 min-w-[200px]">
              <p className="text-xs text-gray-500 font-semibold mb-1">Firma de la empresa</p>
              {employerSigned ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
                    <span>✓</span> Firmado
                  </span>
                  {sigState.employer_signed_at && (
                    <span className="text-xs text-gray-400">{fmtTs(sigState.employer_signed_at)}</span>
                  )}
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                  Pendiente de firma
                </span>
              )}
            </div>

            {/* Actions */}
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Horas trabajadas</p>
            <p className="text-3xl font-bold text-mavic-pink">{totalHours.toFixed(1)}</p>
            <p className="text-xs text-gray-400 mt-1">{MONTHS[month - 1]} {year}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Estado</p>
            <p className="text-lg font-bold text-mavic-black">{profile?.name}</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${
              isSigned ? 'bg-green-100 text-green-700' : editMode ? 'bg-mavic-pink/10 text-mavic-pink' : 'bg-gray-100 text-gray-500'
            }`}>
              {isSigned ? 'Firmado' : editMode ? 'Editando' : 'Lectura'}
            </span>
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
                  {editMode && <th className="px-4 py-3 text-left font-semibold text-gray-700">Notas</th>}
                </tr>
              </thead>
              <tbody>
                {days.filter(d => d.day <= daysInMonth).map(day => {
                  const dow = new Date(year, month - 1, day.day).getDay();
                  const hours = calcDailyHours(day);
                  const hasAbsence = day.absence !== 'none';

                  return (
                    <tr key={day.day} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 font-semibold text-gray-700">
                        {day.day}
                        <span className="text-gray-400 text-xs ml-1">{DOW_LETTER[dow]}</span>
                      </td>

                      {(['entry1','exit1','entry2','exit2'] as const).map(field => (
                        <td key={field} className="px-2 py-1.5">
                          {editMode && !hasAbsence ? (
                            <input
                              type="time"
                              value={day[field]}
                              onChange={e => handleDayChange(day.day, field, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink"
                            />
                          ) : (
                            <span className="text-xs text-gray-500 block text-center">
                              {hasAbsence ? '—' : (day[field] || '—')}
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

                      {editMode && (
                        <td className="px-3 py-1.5">
                          <input
                            type="text"
                            value={day.notes}
                            onChange={e => handleDayChange(day.day, 'notes', e.target.value)}
                            placeholder="Notas..."
                            className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-mavic-pink"
                          />
                        </td>
                      )}
                    </tr>
                  );
                })}

                <tr className="bg-mavic-pink/10 font-bold border-t-2 border-mavic-pink/30">
                  <td className="px-4 py-3 text-mavic-black" colSpan={5}>TOTAL DEL MES</td>
                  <td className="px-3 py-3 text-center text-mavic-pink text-lg">{totalHours.toFixed(1)}</td>
                  <td colSpan={editMode ? 2 : 1} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
