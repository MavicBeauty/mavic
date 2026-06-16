'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function EmpleadaDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [showPwForm, setShowPwForm] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', session.user.id)
        .single();
      if (profile) setName(profile.name as string);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/empleada');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) { setPwMsg('Las contraseñas no coinciden.'); return; }
    if (pw.length < 8) { setPwMsg('Mínimo 8 caracteres.'); return; }
    setPwLoading(true);
    setPwMsg('');
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) {
      setPwMsg(`Error: ${error.message}`);
    } else {
      setPwMsg('✓ Contraseña actualizada');
      setPw(''); setPw2('');
      setTimeout(() => { setShowPwForm(false); setPwMsg(''); }, 2000);
    }
    setPwLoading(false);
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Hola, {name || '...'}</h1>
            <p className="text-white/80 text-sm mt-0.5">Mavic Beauty &amp; Nails</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-white/80 hover:text-white text-sm font-semibold transition"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12 space-y-4">
        <Link
          href="/empleada/horario"
          className="block bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-mavic-pink/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-mavic-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-mavic-black group-hover:text-mavic-pink transition">
                Registro de horario
              </h2>
              <p className="text-gray-500 text-sm">Consulta y registra tus horas</p>
            </div>
            <div className="ml-auto text-gray-300 group-hover:text-mavic-pink transition text-xl font-light">
              →
            </div>
          </div>
        </Link>

        <div className="block bg-white rounded-2xl shadow p-6 opacity-40 cursor-not-allowed select-none">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-mavic-black">Nóminas</h2>
              <p className="text-gray-500 text-sm">Próximamente</p>
            </div>
          </div>
        </div>

        {/* Password change */}
        <div className="bg-white rounded-2xl shadow p-6">
          <button
            onClick={() => { setShowPwForm(v => !v); setPwMsg(''); setPw(''); setPw2(''); }}
            className="w-full flex items-center gap-4 text-left"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-mavic-black">Cambiar contraseña</h2>
              <p className="text-gray-500 text-sm">Actualiza tu acceso al portal</p>
            </div>
            <span className="text-gray-300 text-xl font-light">{showPwForm ? '−' : '+'}</span>
          </button>

          {showPwForm && (
            <form onSubmit={handleChangePassword} className="mt-5 space-y-3 border-t border-gray-100 pt-5">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nueva contraseña</label>
                <input
                  type="password"
                  value={pw}
                  onChange={e => setPw(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="Mínimo 8 caracteres"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Confirmar contraseña</label>
                <input
                  type="password"
                  value={pw2}
                  onChange={e => setPw2(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                />
              </div>
              {pwMsg && (
                <p className={`text-sm font-semibold ${pwMsg.startsWith('Error') || pwMsg.includes('no coinciden') || pwMsg.includes('Mínimo') ? 'text-red-600' : 'text-green-600'}`}>
                  {pwMsg}
                </p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="px-6 py-2 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white text-sm font-bold rounded-lg hover:shadow-lg transition disabled:opacity-50"
                >
                  {pwLoading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPwForm(false); setPwMsg(''); }}
                  className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 font-semibold transition"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
