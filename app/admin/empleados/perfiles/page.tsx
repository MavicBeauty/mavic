'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface EmployeeLaborInfo {
  id: string;
  display_name: string;
  nombre_completo: string;
  nif: string;
  num_afiliacion_ss: string;
  puesto_trabajo: string;
  categoria: string;
  grupo_cotizacion: string;
  fecha_antiguedad: string;
  weekly_hours: number | null;
  is_active: boolean;
}

const emptyForm = {
  display_name: '',
  nombre_completo: '',
  nif: '',
  num_afiliacion_ss: '',
  puesto_trabajo: '',
  categoria: '',
  grupo_cotizacion: '',
  fecha_antiguedad: '',
  weekly_hours: '',
  is_active: true,
};

const FIELDS: { key: keyof typeof emptyForm; label: string; hint?: string }[] = [
  { key: 'display_name', label: 'Nombre en la app', hint: 'Ej: María, Yoryerily' },
  { key: 'nombre_completo', label: 'Nombre completo para el PDF', hint: 'Apellidos + Nombre en mayúsculas · Ej: BARRERA QUINTERO YORYERILY MAIBELIN' },
  { key: 'nif', label: 'NIF / NIE', hint: 'Ej: Z1247983P' },
  { key: 'num_afiliacion_ss', label: 'Núm. afiliación Seg. Social', hint: 'Ej: 081479985953' },
  { key: 'puesto_trabajo', label: 'Puesto de trabajo', hint: 'Opcional' },
  { key: 'categoria', label: 'Categoría profesional', hint: 'Ej: MANICURA' },
  { key: 'grupo_cotizacion', label: 'Grupo de cotización', hint: 'Ej: 08' },
  { key: 'fecha_antiguedad', label: 'Fecha de antigüedad', hint: 'Formato DD/MM/AAAA · Ej: 14/02/2025' },
];

// Identity colors — literal class strings so Tailwind compiles them. Assigned by
// position in created_at order, so each empleada keeps her color over time.
const PALETTE = [
  { border: 'border-l-rose-400', avatar: 'bg-rose-100 text-rose-700' },
  { border: 'border-l-amber-400', avatar: 'bg-amber-100 text-amber-700' },
  { border: 'border-l-sky-400', avatar: 'bg-sky-100 text-sky-700' },
  { border: 'border-l-emerald-400', avatar: 'bg-emerald-100 text-emerald-700' },
  { border: 'border-l-violet-400', avatar: 'bg-violet-100 text-violet-700' },
  { border: 'border-l-orange-400', avatar: 'bg-orange-100 text-orange-700' },
  { border: 'border-l-teal-400', avatar: 'bg-teal-100 text-teal-700' },
  { border: 'border-l-fuchsia-400', avatar: 'bg-fuchsia-100 text-fuchsia-700' },
  { border: 'border-l-indigo-400', avatar: 'bg-indigo-100 text-indigo-700' },
  { border: 'border-l-lime-500', avatar: 'bg-lime-100 text-lime-700' },
];

function EmployeeForm({
  initial,
  onSave,
  onCancel,
  saving,
  error,
}: {
  initial: typeof emptyForm;
  onSave: (data: typeof emptyForm) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
}) {
  const [form, setForm] = useState(initial);
  const set = (key: string, value: string | boolean) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded text-sm">{error}</div>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key} className={key === 'nombre_completo' ? 'md:col-span-2' : ''}>
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
            <input
              type="text"
              value={form[key] as string}
              onChange={e => set(key, e.target.value)}
              placeholder={hint}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:opacity-50"
            />
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          </div>
        ))}
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Horas semanales contratadas</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="40"
            value={form.weekly_hours as string}
            onChange={e => set('weekly_hours', e.target.value)}
            placeholder="Ej: 40"
            disabled={saving}
            className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink disabled:opacity-50"
          />
          <span className="text-sm text-gray-500">h/semana</span>
        </div>
        <p className="text-xs text-gray-400 mt-0.5">Para calcular las horas esperadas en el control de horarios</p>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={form.is_active}
          onChange={e => set('is_active', e.target.checked)}
          disabled={saving}
          className="accent-mavic-pink"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">Empleada activa</label>
      </div>
      <div className="flex gap-3 pt-2">
        <button
          onClick={() => onSave(form)}
          disabled={saving || !form.display_name || !form.nombre_completo || !form.nif}
          className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold px-6 py-2 rounded-lg hover:shadow-lg transition disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg transition disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

interface PortalAccount {
  id: string;
  email: string;
  timesheet_permission: 'read' | 'edit';
  employee_labor_info_id: string;
  confirmed: boolean;
  portal_registro: boolean;
  portal_nominas: boolean;
  portal_horario: boolean;
}

const PORTAL_SECTIONS: { key: 'horario' | 'nominas' | 'registro'; col: 'portal_horario' | 'portal_nominas' | 'portal_registro'; label: string }[] = [
  { key: 'horario', col: 'portal_horario', label: 'Control de horarios' },
  { key: 'nominas', col: 'portal_nominas', label: 'Nóminas' },
  { key: 'registro', col: 'portal_registro', label: 'Registro' },
];

export default function EmpleadosPerfilesPage() {
  const [employees, setEmployees] = useState<EmployeeLaborInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [manage, setManage] = useState<{ id: string; tab: 'datos' | 'cuenta' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [portalAccounts, setPortalAccounts] = useState<Record<string, PortalAccount>>({});
  const [inviteEmails, setInviteEmails] = useState<Record<string, string>>({});
  const [portalLoading, setPortalLoading] = useState<Record<string, boolean>>({});
  const [portalMsg, setPortalMsg] = useState<Record<string, string>>({});
  const [credEdit, setCredEdit] = useState<Record<string, { field: 'email' | 'password'; val: string; val2: string } | null>>({});

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('employee_labor_info')
      .select('*')
      .order('created_at', { ascending: true })
      .then(({ data }: { data: EmployeeLaborInfo[] | null }) => {
        if (data) setEmployees(data);
        setLoading(false);
      });
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/employee-account', {
        headers: { 'Authorization': `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      const data = json.accounts as PortalAccount[] | undefined;
      if (data) {
        const map: Record<string, PortalAccount> = {};
        data.forEach(acc => { if (acc.employee_labor_info_id) map[acc.employee_labor_info_id] = acc; });
        setPortalAccounts(map);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSendInvite = async (employeeId: string) => {
    const email = inviteEmails[employeeId];
    if (!email) return;
    setPortalLoading(l => ({ ...l, [employeeId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/employee-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ employeeId, email }),
    });
    const json = await res.json();
    if (json.error) {
      setPortalMsg(m => ({ ...m, [employeeId]: `Error: ${json.error}` }));
    } else {
      setPortalAccounts(pa => ({
        ...pa,
        [employeeId]: {
          id: json.userId, email, timesheet_permission: 'read', employee_labor_info_id: employeeId, confirmed: false,
          portal_registro: false, portal_nominas: false, portal_horario: false,
        },
      }));
      setPortalMsg(m => ({ ...m, [employeeId]: '✓ Invitación enviada' }));
    }
    setPortalLoading(l => ({ ...l, [employeeId]: false }));
    setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
  };

  const handleResendInvite = async (employeeId: string) => {
    const acc = portalAccounts[employeeId];
    if (!acc) return;
    if (!confirm(`¿Reenviar el email de confirmación a ${acc.email}?`)) return;
    setPortalLoading(l => ({ ...l, [employeeId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/employee-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ employeeId, email: acc.email }),
    });
    const json = await res.json();
    setPortalMsg(m => ({ ...m, [employeeId]: json.error ? `Error: ${json.error}` : '✓ Confirmación reenviada' }));
    setPortalLoading(l => ({ ...l, [employeeId]: false }));
    setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
  };

  const handleTogglePermission = async (employeeId: string) => {
    const acc = portalAccounts[employeeId];
    if (!acc) return;
    const newPerm: 'read' | 'edit' = acc.timesheet_permission === 'read' ? 'edit' : 'read';
    setPortalLoading(l => ({ ...l, [employeeId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/employee-account', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: acc.id, permission: newPerm }),
    });
    const json = await res.json();
    if (!json.error) {
      setPortalAccounts(pa => ({ ...pa, [employeeId]: { ...acc, timesheet_permission: newPerm } }));
    }
    setPortalLoading(l => ({ ...l, [employeeId]: false }));
  };

  const handleTogglePortalSection = async (employeeId: string, section: typeof PORTAL_SECTIONS[number]) => {
    const acc = portalAccounts[employeeId];
    if (!acc) return;
    const newValue = !acc[section.col];
    setPortalLoading(l => ({ ...l, [employeeId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch('/api/admin/employee-account', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ userId: acc.id, portal: { [section.key]: newValue } }),
    });
    const json = await res.json();
    if (json.error) {
      setPortalMsg(m => ({ ...m, [employeeId]: `Error: ${json.error}` }));
      setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
    } else {
      setPortalAccounts(pa => ({ ...pa, [employeeId]: { ...acc, [section.col]: newValue } }));
    }
    setPortalLoading(l => ({ ...l, [employeeId]: false }));
  };

  const handleCredChange = async (employeeId: string) => {
    const acc = portalAccounts[employeeId];
    const edit = credEdit[employeeId];
    if (!acc || !edit) return;

    if (edit.field === 'password' && edit.val !== edit.val2) {
      setPortalMsg(m => ({ ...m, [employeeId]: 'Error: las contraseñas no coinciden' }));
      setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
      return;
    }
    if (edit.field === 'password' && edit.val.length < 8) {
      setPortalMsg(m => ({ ...m, [employeeId]: 'Error: mínimo 8 caracteres' }));
      setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
      return;
    }

    setPortalLoading(l => ({ ...l, [employeeId]: true }));
    const { data: { session } } = await supabase.auth.getSession();
    const body = edit.field === 'email'
      ? { userId: acc.id, email: edit.val }
      : { userId: acc.id, password: edit.val };

    const res = await fetch('/api/admin/employee-account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.error) {
      setPortalMsg(m => ({ ...m, [employeeId]: `Error: ${json.error}` }));
    } else {
      if (edit.field === 'email') {
        setPortalAccounts(pa => ({ ...pa, [employeeId]: { ...acc, email: edit.val } }));
      }
      setPortalMsg(m => ({ ...m, [employeeId]: edit.field === 'email' ? '✓ Email actualizado' : '✓ Contraseña actualizada' }));
      setCredEdit(c => ({ ...c, [employeeId]: null }));
    }
    setPortalLoading(l => ({ ...l, [employeeId]: false }));
    setTimeout(() => setPortalMsg(m => ({ ...m, [employeeId]: '' })), 4000);
  };

  const handleCreate = async (form: typeof emptyForm) => {
    setSaving(true);
    setError('');
    const { weekly_hours: whStr, ...rest } = form;
    const payload = { ...rest, weekly_hours: whStr ? parseInt(whStr, 10) : null };
    const { data, error: err } = await supabase
      .from('employee_labor_info')
      .insert([payload])
      .select()
      .single();
    if (err) { setError(err.message); }
    else {
      setEmployees(e => [...e, data as EmployeeLaborInfo]);
      setShowNew(false);
    }
    setSaving(false);
  };

  const handleUpdate = async (id: string, form: typeof emptyForm) => {
    setSaving(true);
    setError('');
    const { weekly_hours: whStr, ...rest } = form;
    const payload = { ...rest, weekly_hours: whStr ? parseInt(whStr, 10) : null };
    const { error: err } = await supabase
      .from('employee_labor_info')
      .update(payload)
      .eq('id', id);
    if (err) { setError(err.message); }
    else {
      setEmployees(e => e.map(emp => emp.id === id ? { ...emp, ...payload } : emp));
      setManage(null);
    }
    setSaving(false);
  };

  const closeManage = () => { setManage(null); setError(''); };

  const managedEmp = manage ? employees.find(e => e.id === manage.id) : undefined;
  const managedIdx = manage ? employees.findIndex(e => e.id === manage.id) : -1;

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-5xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Perfiles de Empleadas</h1>
            <p className="text-white/80 mt-1">Datos laborales para el registro de jornada</p>
          </div>
          <Link href="/admin/empleadas" className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12 space-y-6">

        <div className="flex justify-end">
          <button
            onClick={() => { setShowNew(true); setError(''); }}
            className="bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold px-6 py-2 rounded-lg transition"
          >
            + Nueva empleada
          </button>
        </div>

        {/* Employee cards */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">Cargando...</div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            No hay empleadas registradas aún.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {employees.map((emp, i) => {
              const color = PALETTE[i % PALETTE.length];
              const acc = portalAccounts[emp.id];
              return (
                <div
                  key={emp.id}
                  className={`bg-white rounded-lg shadow-lg border-l-4 ${color.border} p-4 ${!emp.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg shrink-0 ${color.avatar}`}>
                      {emp.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-mavic-black truncate">{emp.display_name}</h2>
                        {!emp.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full shrink-0">Inactiva</span>
                        )}
                      </div>
                      {acc ? (
                        <p className="text-sm text-gray-500 truncate">{acc.email}</p>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Sin cuenta portal</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      {acc && (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          acc.confirmed ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {acc.confirmed ? '✓ Confirmada' : 'Pendiente'}
                        </span>
                      )}
                      <button
                        onClick={() => { setManage({ id: emp.id, tab: 'datos' }); setError(''); }}
                        className="text-sm font-semibold text-mavic-pink hover:text-mavic-pink/70 transition"
                      >
                        Gestionar
                      </button>
                    </div>
                  </div>

                  {/* Invite flow — only while the empleada has no portal account */}
                  {!acc && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 items-end flex-wrap">
                      <div className="flex-1 min-w-40">
                        <label className="block text-xs text-gray-500 mb-1">Email de la empleada</label>
                        <input
                          type="email"
                          value={inviteEmails[emp.id] || ''}
                          onChange={e => setInviteEmails(ie => ({ ...ie, [emp.id]: e.target.value }))}
                          placeholder="correo@ejemplo.com"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                        />
                      </div>
                      <button
                        onClick={() => handleSendInvite(emp.id)}
                        disabled={!inviteEmails[emp.id] || portalLoading[emp.id]}
                        className="bg-mavic-pink text-white font-bold px-4 py-2 rounded-lg text-sm disabled:opacity-50 hover:bg-mavic-pink/90 transition whitespace-nowrap"
                      >
                        {portalLoading[emp.id] ? 'Enviando...' : 'Enviar invitación'}
                      </button>
                      {portalMsg[emp.id] && (
                        <span className={`text-xs font-semibold ${portalMsg[emp.id].startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                          {portalMsg[emp.id]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* New employee modal */}
      {showNew && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
          onClick={() => { setShowNew(false); setError(''); }}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-bold text-mavic-black">Nueva empleada</h2>
              <button
                onClick={() => { setShowNew(false); setError(''); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
            <EmployeeForm
              initial={emptyForm}
              onSave={handleCreate}
              onCancel={() => { setShowNew(false); setError(''); }}
              saving={saving}
              error={error}
            />
          </div>
        </div>
      )}

      {/* Manage modal — Datos laborales | Cuenta y permisos */}
      {manage && managedEmp && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto"
          onClick={closeManage}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl my-8 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold shrink-0 ${PALETTE[managedIdx % PALETTE.length].avatar}`}>
                  {managedEmp.display_name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-mavic-black">{managedEmp.display_name}</h2>
              </div>
              <button
                onClick={closeManage}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="flex gap-1 border-b border-gray-200 mb-5">
              {([
                { tab: 'datos', label: 'Datos laborales' },
                { tab: 'cuenta', label: 'Cuenta y permisos' },
              ] as const).map(({ tab, label }) => (
                <button
                  key={tab}
                  onClick={() => setManage(m => m && { ...m, tab })}
                  className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition -mb-px border-b-2 ${
                    manage.tab === tab
                      ? 'text-mavic-pink border-mavic-pink'
                      : 'text-gray-500 border-transparent hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {manage.tab === 'datos' ? (
              <EmployeeForm
                initial={{
                  display_name: managedEmp.display_name,
                  nombre_completo: managedEmp.nombre_completo,
                  nif: managedEmp.nif,
                  num_afiliacion_ss: managedEmp.num_afiliacion_ss || '',
                  puesto_trabajo: managedEmp.puesto_trabajo || '',
                  categoria: managedEmp.categoria || '',
                  grupo_cotizacion: managedEmp.grupo_cotizacion || '',
                  fecha_antiguedad: managedEmp.fecha_antiguedad || '',
                  weekly_hours: managedEmp.weekly_hours != null ? String(managedEmp.weekly_hours) : '',
                  is_active: managedEmp.is_active,
                }}
                onSave={form => handleUpdate(managedEmp.id, form)}
                onCancel={closeManage}
                saving={saving}
                error={error}
              />
            ) : portalAccounts[managedEmp.id] ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm text-gray-700 font-medium">
                    {portalAccounts[managedEmp.id].email}
                  </span>
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                    portalAccounts[managedEmp.id].confirmed
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {portalAccounts[managedEmp.id].confirmed ? '✓ Confirmada' : 'Pendiente de confirmar'}
                  </span>
                  {!portalAccounts[managedEmp.id].confirmed && (
                    <button
                      onClick={() => handleResendInvite(managedEmp.id)}
                      disabled={portalLoading[managedEmp.id]}
                      className="text-xs text-gray-500 hover:text-mavic-pink font-semibold disabled:opacity-50 transition"
                    >
                      Reenviar confirmación
                    </button>
                  )}
                </div>

                {/* Permisos del portal — qué secciones ve esta cuenta */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Puede ver:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {PORTAL_SECTIONS.map(sec => {
                      const on = portalAccounts[managedEmp.id][sec.col];
                      return (
                        <button
                          key={sec.key}
                          onClick={() => handleTogglePortalSection(managedEmp.id, sec)}
                          disabled={portalLoading[managedEmp.id]}
                          title={on ? `Quitar acceso a ${sec.label}` : `Dar acceso a ${sec.label}`}
                          className={`px-3 py-1 rounded-full text-xs font-bold border transition disabled:opacity-50 ${
                            on
                              ? 'bg-green-50 text-green-700 border-green-300'
                              : 'bg-gray-100 text-gray-400 border-gray-200 hover:text-gray-600'
                          }`}
                        >
                          {sec.label} {on ? '✓' : '✕'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {portalAccounts[managedEmp.id].portal_horario && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Horario:</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                        portalAccounts[managedEmp.id].timesheet_permission === 'edit'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {portalAccounts[managedEmp.id].timesheet_permission === 'edit'
                          ? 'Lectura + edición'
                          : 'Solo lectura'}
                      </span>
                      <button
                        onClick={() => handleTogglePermission(managedEmp.id)}
                        disabled={portalLoading[managedEmp.id]}
                        className="text-xs text-mavic-pink hover:underline font-semibold disabled:opacity-50 transition"
                      >
                        {portalAccounts[managedEmp.id].timesheet_permission === 'edit'
                          ? 'Cambiar a solo lectura'
                          : 'Dar permiso de edición'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Credenciales:</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <button
                      onClick={() => setCredEdit(c => ({ ...c, [managedEmp.id]: credEdit[managedEmp.id]?.field === 'email' ? null : { field: 'email', val: portalAccounts[managedEmp.id].email || '', val2: '' } }))}
                      disabled={portalLoading[managedEmp.id]}
                      className="text-xs text-gray-500 hover:text-mavic-pink font-semibold transition"
                    >
                      Cambiar email
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={() => setCredEdit(c => ({ ...c, [managedEmp.id]: credEdit[managedEmp.id]?.field === 'password' ? null : { field: 'password', val: '', val2: '' } }))}
                      disabled={portalLoading[managedEmp.id]}
                      className="text-xs text-gray-500 hover:text-mavic-pink font-semibold transition"
                    >
                      Cambiar contraseña
                    </button>
                    {portalMsg[managedEmp.id] && (
                      <span className={`text-xs font-semibold ${portalMsg[managedEmp.id].startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                        {portalMsg[managedEmp.id]}
                      </span>
                    )}
                  </div>
                  {credEdit[managedEmp.id] && (
                    <div className="flex flex-wrap gap-2 items-end pt-3">
                      {credEdit[managedEmp.id]!.field === 'email' ? (
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Nuevo email</label>
                          <input
                            type="email"
                            value={credEdit[managedEmp.id]!.val}
                            onChange={e => setCredEdit(c => ({ ...c, [managedEmp.id]: { ...c[managedEmp.id]!, val: e.target.value } }))}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-64"
                          />
                        </div>
                      ) : (
                        <>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
                            <input
                              type="password"
                              value={credEdit[managedEmp.id]!.val}
                              onChange={e => setCredEdit(c => ({ ...c, [managedEmp.id]: { ...c[managedEmp.id]!, val: e.target.value } }))}
                              placeholder="Mín. 8 caracteres"
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-48"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Confirmar</label>
                            <input
                              type="password"
                              value={credEdit[managedEmp.id]!.val2}
                              onChange={e => setCredEdit(c => ({ ...c, [managedEmp.id]: { ...c[managedEmp.id]!, val2: e.target.value } }))}
                              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-48"
                            />
                          </div>
                        </>
                      )}
                      <button
                        onClick={() => handleCredChange(managedEmp.id)}
                        disabled={portalLoading[managedEmp.id] || !credEdit[managedEmp.id]!.val}
                        className="px-4 py-1.5 bg-mavic-pink text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-mavic-pink/90 transition"
                      >
                        {portalLoading[managedEmp.id] ? 'Guardando...' : 'Guardar'}
                      </button>
                      <button
                        onClick={() => setCredEdit(c => ({ ...c, [managedEmp.id]: null }))}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold transition"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Esta empleada aún no tiene cuenta del portal — envíale la invitación desde su tarjeta.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
