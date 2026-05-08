'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState({ clients: 0, sessions: 0, pendingGC: 0 });
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) setUserEmail(session.user.email);
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('clinical_sessions').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabase.from('gift_cards').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]).then(([c, s, g]) => {
      setStats({
        clients: c.count ?? 0,
        sessions: s.count ?? 0,
        pendingGC: g.count ?? 0,
      });
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Panel de Control</h1>
            <p className="text-white/80 mt-1">{userEmail || 'Mavic Beauty & Nails'}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/es" className="text-white/80 hover:text-white text-sm font-medium transition">
              Ver sitio
            </Link>
            <button
              onClick={handleLogout}
              className="bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-lg transition text-sm">
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">CLIENTES</h3>
            <p className="text-4xl font-bold text-mavic-pink">{stats.clients}</p>
            <p className="text-gray-500 text-xs mt-2">Total registrados</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">SESIONES</h3>
            <p className="text-4xl font-bold text-mavic-gold">{stats.sessions}</p>
            <p className="text-gray-500 text-xs mt-2">Este mes</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">TARJETAS REGALO</h3>
            <p className="text-4xl font-bold text-mavic-black">{stats.pendingGC}</p>
            <p className="text-gray-500 text-xs mt-2">Pendientes</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">EMPLEADOS</h3>
            <p className="text-4xl font-bold text-mavic-pink">2</p>
            <p className="text-gray-500 text-xs mt-2">Activos</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link href="/admin/clientes" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">👥</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Gestión de Clientes</h2>
              <p className="text-gray-600 text-sm">Ver, buscar y editar clientes. Gestionar consentimientos e historiales clínicos.</p>
            </div>
          </Link>

          <Link href="/admin/servicios" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">💅</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Servicios & Precios</h2>
              <p className="text-gray-600 text-sm">Añadir, editar y eliminar servicios. Gestionar precios en español y catalán.</p>
            </div>
          </Link>

          <Link href="/admin/ofertas" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">🎁</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Ofertas Especiales</h2>
              <p className="text-gray-600 text-sm">Crear y gestionar promociones. Establecer fechas de validez.</p>
            </div>
          </Link>

          <Link href="/admin/tarjetas-regalo" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">🎫</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Tarjetas Regalo</h2>
              <p className="text-gray-600 text-sm">Revisar solicitudes, añadir código Booksy y enviar a clientes.</p>
            </div>
          </Link>

          <Link href="/admin/empleados" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">📊</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Control de Horarios</h2>
              <p className="text-gray-600 text-sm">Registro diario de horas trabajadas por empleado.</p>
            </div>
          </Link>

          <Link href="/es" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">🌐</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Ver Sitio Web</h2>
              <p className="text-gray-600 text-sm">Acceder al sitio web público de MAVIC Beauty & Nails.</p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
