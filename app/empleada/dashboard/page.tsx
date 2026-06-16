'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function EmpleadaDashboardPage() {
  const router = useRouter();
  const [name, setName] = useState('');

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
      </main>
    </div>
  );
}
