'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function EmpleadasHubPage() {
  const supabase = createClient();
  const [pendingNominas, setPendingNominas] = useState(0);

  useEffect(() => {
    supabase
      .from('nominas')
      .select('id', { count: 'exact', head: true })
      .eq('paid', false)
      .then(({ count }: { count: number | null }) => setPendingNominas(count ?? 0));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sections = [
    {
      href: '/admin/empleados',
      icon: (
        <svg className="w-7 h-7 text-mavic-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      title: 'Control de Horarios',
      desc: 'Registro diario de horas trabajadas, firmas mensuales y envío a gestoría.',
      badge: null,
    },
    {
      href: '/admin/nominas',
      icon: (
        <svg className="w-7 h-7 text-mavic-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      title: 'Nóminas',
      desc: 'Subir nóminas de la gestoría, marcar como pagadas y consultar historial.',
      badge: pendingNominas > 0 ? `${pendingNominas} pendiente${pendingNominas > 1 ? 's' : ''}` : null,
    },
    {
      href: '/admin/empleados/perfiles',
      icon: (
        <svg className="w-7 h-7 text-mavic-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      title: 'Perfiles de Empleadas',
      desc: 'Datos laborales, cuentas del portal y permisos de acceso.',
      badge: null,
    },
  ];

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Empleadas</h1>
            <p className="text-white/80 mt-1">Gestión de horarios, nóminas y perfiles</p>
          </div>
          <Link href="/admin/dashboard" className="text-white/80 hover:text-white font-semibold transition text-sm">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12 space-y-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href} className="block">
            <div className="bg-white rounded-2xl shadow hover:shadow-lg transition p-6 group flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl bg-mavic-pink/10 flex items-center justify-center flex-shrink-0 group-hover:bg-mavic-pink/20 transition">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-mavic-black group-hover:text-mavic-pink transition">
                  {s.title}
                </h2>
                <p className="text-gray-500 text-sm mt-0.5">{s.desc}</p>
              </div>
              {s.badge && (
                <span className="flex-shrink-0 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                  {s.badge}
                </span>
              )}
              <div className="flex-shrink-0 text-gray-300 group-hover:text-mavic-pink transition text-xl font-light ml-2">
                →
              </div>
            </div>
          </Link>
        ))}
      </main>
    </div>
  );
}
