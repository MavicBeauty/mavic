'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (accessToken && refreshToken && type === 'recovery') {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data, error }) => {
          if (data.session && !error) setReady(true);
          else setExpired(true);
        });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
      else setTimeout(() => setExpired(true), 1500);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
    if (password.length < 8) { setError('Mínimo 8 caracteres.'); return; }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) {
      setError('No se pudo guardar la contraseña. El enlace puede haber caducado.');
      setLoading(false);
      return;
    }
    router.push('/admin/dashboard');
  };

  if (expired) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠</div>
          <h2 className="text-xl font-bold text-mavic-black">Enlace caducado</h2>
          <p className="text-gray-500 text-sm">Este enlace ya no es válido. Solicita uno nuevo desde la pantalla de inicio de sesión.</p>
          <a href="/admin/login" className="text-mavic-pink text-sm font-semibold hover:underline block">
            Volver al inicio de sesión
          </a>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center">
        <p className="text-gray-500">Verificando enlace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-mavic-black">Nueva contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Panel de Administración</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nueva contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmar contraseña</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
