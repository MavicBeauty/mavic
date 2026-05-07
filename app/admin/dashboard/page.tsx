'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push('/admin/login');
        return;
      }

      setUser(user);

      // Get user profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Panel de Control</h1>
            <p className="text-white/80 mt-1">Bienvenido, {profile.name}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white text-mavic-pink font-semibold px-6 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats Row */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">CLIENTES</h3>
            <p className="text-4xl font-bold text-mavic-pink">-</p>
            <p className="text-gray-500 text-xs mt-2">Total registrados</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">SESIONES</h3>
            <p className="text-4xl font-bold text-mavic-gold">-</p>
            <p className="text-gray-500 text-xs mt-2">Este mes</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">TARJETAS REGALO</h3>
            <p className="text-4xl font-bold text-mavic-black">-</p>
            <p className="text-gray-500 text-xs mt-2">Pendientes</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">EMPLEADOS</h3>
            <p className="text-4xl font-bold text-mavic-pink">2</p>
            <p className="text-gray-500 text-xs mt-2">Activos</p>
          </div>
        </div>

        {/* Menu Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Clientes */}
          <Link href="/admin/clientes" className="block">
            <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
              <div className="text-4xl mb-4 group-hover:scale-110 transition">👥</div>
              <h2 className="text-xl font-bold text-mavic-black mb-2">Gestión de Clientes</h2>
              <p className="text-gray-600 text-sm">Ver, buscar y editar clientes. Gestionar consentimientos e historiales clínicos.</p>
            </div>
          </Link>

          {/* Servicios - Owner Only */}
          {profile.role === 'owner' && (
            <Link href="/admin/servicios" className="block">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition">💅</div>
                <h2 className="text-xl font-bold text-mavic-black mb-2">Servicios & Precios</h2>
                <p className="text-gray-600 text-sm">Añadir, editar y eliminar servicios. Gestionar precios en español y catalán.</p>
              </div>
            </Link>
          )}

          {/* Ofertas - Owner Only */}
          {profile.role === 'owner' && (
            <Link href="/admin/ofertas" className="block">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition">🎁</div>
                <h2 className="text-xl font-bold text-mavic-black mb-2">Ofertas Especiales</h2>
                <p className="text-gray-600 text-sm">Crear y gestionar promociones. Establecer fechas de validez.</p>
              </div>
            </Link>
          )}

          {/* Tarjetas Regalo - Owner Only */}
          {profile.role === 'owner' && (
            <Link href="/admin/tarjetas-regalo" className="block">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition">🎫</div>
                <h2 className="text-xl font-bold text-mavic-black mb-2">Tarjetas Regalo</h2>
                <p className="text-gray-600 text-sm">Revisar solicitudes, añadir código Booksy y enviar a clientes.</p>
              </div>
            </Link>
          )}

          {/* Empleados - Owner Only */}
          {profile.role === 'owner' && (
            <Link href="/admin/empleados" className="block">
              <div className="bg-white p-8 rounded-lg shadow hover:shadow-lg transition cursor-pointer group">
                <div className="text-4xl mb-4 group-hover:scale-110 transition">📊</div>
                <h2 className="text-xl font-bold text-mavic-black mb-2">Control de Horarios</h2>
                <p className="text-gray-600 text-sm">Registro diario de horas trabajadas por empleado.</p>
              </div>
            </Link>
          )}

          {/* Web */}
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
