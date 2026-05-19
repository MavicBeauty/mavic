'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const sections = [
    { href: '/admin/clientes',       icon: '👥', title: 'Clientes',           desc: 'Ver, buscar y editar clientes. Gestionar consentimientos e historiales clínicos.' },
    { href: '/admin/servicios',      icon: '💅', title: 'Servicios & Precios', desc: 'Añadir, editar y eliminar servicios. Gestionar precios en español y catalán.' },
    { href: '/admin/ofertas',        icon: '📢', title: 'Ventana Emergente',   desc: 'Configura el anuncio que aparece al entrar al sitio web.' },
    { href: '/admin/tarjetas-regalo',icon: '🎫', title: 'Tarjetas Regalo',     desc: 'Revisar solicitudes, añadir código Booksy y enviar a clientes.' },
    { href: '/admin/empleados',      icon: '📊', title: 'Control de Horarios', desc: 'Registro diario de horas trabajadas por empleado.' },
  ];

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Panel de Control</h1>
            <p className="text-white/80 mt-1">{userEmail || 'Mavic Beauty & Nails'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg transition text-sm">
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sections.map((s) => (
            <Link key={s.href} href={s.href} className="block">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition inline-block">{s.icon}</div>
                <h2 className="text-xl font-bold text-mavic-black mb-2">{s.title}</h2>
                <p className="text-gray-600 text-sm">{s.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
