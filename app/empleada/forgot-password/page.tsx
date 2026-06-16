'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/empleada/set-password`,
    });
    if (err) {
      setError('No se pudo enviar el correo. Comprueba el email e inténtalo de nuevo.');
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-5xl">✉</div>
          <h2 className="text-xl font-bold text-mavic-black">Correo enviado</h2>
          <p className="text-gray-500 text-sm">
            Revisa tu bandeja de entrada y sigue el enlace para establecer una nueva contraseña.
          </p>
          <Link href="/empleada" className="text-mavic-pink text-sm font-semibold hover:underline block">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-10 max-w-sm w-full">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-mavic-black">Recuperar contraseña</h1>
          <p className="text-gray-500 text-sm mt-1">Te enviaremos un enlace a tu email</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>

          <div className="text-center">
            <Link href="/empleada" className="text-sm text-gray-500 hover:underline">
              ← Volver
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
