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
}

export default function EmpleadosPerfilesPage() {
  const [employees, setEmployees] = useState<EmployeeLaborInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    supabase
      .from('profiles')
      .select('id, email, timesheet_permission, employee_labor_info_id')
      .eq('role', 'portal')
      .then(({ data }: { data: PortalAccount[] | null }) => {
        if (data) {
          const map: Record<string, PortalAccount> = {};
          data.forEach(acc => { if (acc.employee_labor_info_id) map[acc.employee_labor_info_id] = acc; });
          setPortalAccounts(map);
        }
      });
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
        [employeeId]: { id: json.userId, email, timesheet_permission: 'read', employee_labor_info_id: employeeId },
      }));
      setPortalMsg(m => ({ ...m, [employeeId]: '✓ Invitación enviada' }));
    }
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
    const { data, error: err } = await supabase
      .from('employee_labor_info')
      .insert([form])
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
    const { error: err } = await supabase
      .from('employee_labor_info')
      .update(form)
      .eq('id', id);
    if (err) { setError(err.message); }
    else {
      setEmployees(e => e.map(emp => emp.id === id ? { ...emp, ...form } : emp));
      setEditingId(null);
    }
    setSaving(false);
  };

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

        {/* New employee */}
        {showNew ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-lg font-bold text-mavic-black mb-5">Nueva empleada</h2>
            <EmployeeForm
              initial={emptyForm}
              onSave={handleCreate}
              onCancel={() => { setShowNew(false); setError(''); }}
              saving={saving}
              error={error}
            />
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowNew(true)}
              className="bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold px-6 py-2 rounded-lg transition"
            >
              + Nueva empleada
            </button>
          </div>
        )}

        {/* Employee list */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">Cargando...</div>
        ) : employees.length === 0 ? (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
            No hay empleadas registradas aún.
          </div>
        ) : (
          <div className="space-y-4">
            {employees.map(emp => (
              <div key={emp.id} className={`bg-white rounded-lg shadow-lg p-6 ${!emp.is_active ? 'opacity-60' : ''}`}>
                {editingId === emp.id ? (
                  <>
                    <h2 className="text-lg font-bold text-mavic-black mb-5">Editando — {emp.display_name}</h2>
                    <EmployeeForm
                      initial={{
                        display_name: emp.display_name,
                        nombre_completo: emp.nombre_completo,
                        nif: emp.nif,
                        num_afiliacion_ss: emp.num_afiliacion_ss || '',
                        puesto_trabajo: emp.puesto_trabajo || '',
                        categoria: emp.categoria || '',
                        grupo_cotizacion: emp.grupo_cotizacion || '',
                        fecha_antiguedad: emp.fecha_antiguedad || '',
                        is_active: emp.is_active,
                      }}
                      onSave={form => handleUpdate(emp.id, form)}
                      onCancel={() => { setEditingId(null); setError(''); }}
                      saving={saving}
                      error={error}
                    />
                  </>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-mavic-black">{emp.display_name}</h2>
                        {!emp.is_active && (
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">Inactiva</span>
                        )}
                      </div>
                      <button
                        onClick={() => setEditingId(emp.id)}
                        className="text-sm font-semibold text-mavic-pink hover:text-mavic-pink/70 transition"
                      >
                        Editar
                      </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-3">
                      <div className="md:col-span-2">
                        <p className="text-xs text-gray-500 uppercase tracking-wide">Nombre para el PDF</p>
                        <p className="font-semibold text-mavic-black">{emp.nombre_completo}</p>
                      </div>
                      {[
                        { label: 'NIF / NIE', value: emp.nif },
                        { label: 'Núm. afiliación SS', value: emp.num_afiliacion_ss },
                        { label: 'Puesto de trabajo', value: emp.puesto_trabajo },
                        { label: 'Categoría', value: emp.categoria },
                        { label: 'Grupo de cotización', value: emp.grupo_cotizacion },
                        { label: 'Fecha de antigüedad', value: emp.fecha_antiguedad },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                          <p className="font-medium text-mavic-black">{value}</p>
                        </div>
                      ) : null)}
                    </div>

                    {/* Cuenta portal */}
                    <div className="mt-6 pt-5 border-t border-gray-100">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
                        Cuenta portal
                      </h3>
                      {portalAccounts[emp.id] ? (
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm text-gray-700 font-medium">
                              {portalAccounts[emp.id].email}
                            </span>
                            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              portalAccounts[emp.id].timesheet_permission === 'edit'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {portalAccounts[emp.id].timesheet_permission === 'edit'
                                ? 'Lectura + Edición'
                                : 'Solo lectura'}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-2 items-center">
                            <button
                              onClick={() => handleTogglePermission(emp.id)}
                              disabled={portalLoading[emp.id]}
                              className="text-xs text-mavic-pink hover:underline font-semibold disabled:opacity-50 transition"
                            >
                              {portalAccounts[emp.id].timesheet_permission === 'edit'
                                ? 'Cambiar a solo lectura'
                                : 'Dar permiso de edición'}
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => setCredEdit(c => ({ ...c, [emp.id]: credEdit[emp.id]?.field === 'email' ? null : { field: 'email', val: portalAccounts[emp.id].email || '', val2: '' } }))}
                              disabled={portalLoading[emp.id]}
                              className="text-xs text-gray-500 hover:text-mavic-pink font-semibold transition"
                            >
                              Cambiar email
                            </button>
                            <span className="text-gray-300">|</span>
                            <button
                              onClick={() => setCredEdit(c => ({ ...c, [emp.id]: credEdit[emp.id]?.field === 'password' ? null : { field: 'password', val: '', val2: '' } }))}
                              disabled={portalLoading[emp.id]}
                              className="text-xs text-gray-500 hover:text-mavic-pink font-semibold transition"
                            >
                              Cambiar contraseña
                            </button>
                            {portalMsg[emp.id] && (
                              <span className={`text-xs font-semibold ${portalMsg[emp.id].startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
                                {portalMsg[emp.id]}
                              </span>
                            )}
                          </div>
                          {credEdit[emp.id] && (
                            <div className="flex flex-wrap gap-2 items-end pt-1">
                              {credEdit[emp.id]!.field === 'email' ? (
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Nuevo email</label>
                                  <input
                                    type="email"
                                    value={credEdit[emp.id]!.val}
                                    onChange={e => setCredEdit(c => ({ ...c, [emp.id]: { ...c[emp.id]!, val: e.target.value } }))}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-64"
                                  />
                                </div>
                              ) : (
                                <>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Nueva contraseña</label>
                                    <input
                                      type="password"
                                      value={credEdit[emp.id]!.val}
                                      onChange={e => setCredEdit(c => ({ ...c, [emp.id]: { ...c[emp.id]!, val: e.target.value } }))}
                                      placeholder="Mín. 8 caracteres"
                                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-48"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Confirmar</label>
                                    <input
                                      type="password"
                                      value={credEdit[emp.id]!.val2}
                                      onChange={e => setCredEdit(c => ({ ...c, [emp.id]: { ...c[emp.id]!, val2: e.target.value } }))}
                                      className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink w-48"
                                    />
                                  </div>
                                </>
                              )}
                              <button
                                onClick={() => handleCredChange(emp.id)}
                                disabled={portalLoading[emp.id] || !credEdit[emp.id]!.val}
                                className="px-4 py-1.5 bg-mavic-pink text-white text-xs font-bold rounded-lg disabled:opacity-50 hover:bg-mavic-pink/90 transition"
                              >
                                {portalLoading[emp.id] ? 'Guardando...' : 'Guardar'}
                              </button>
                              <button
                                onClick={() => setCredEdit(c => ({ ...c, [emp.id]: null }))}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 font-semibold transition"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex gap-2 items-end flex-wrap">
                          <div className="flex-1 min-w-52">
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
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
