'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') {
      setReady(true);
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        router.replace('/admin/login');
        return;
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      if (!profile || !['owner', 'employee'].includes(profile.role as string)) {
        await supabase.auth.signOut();
        router.replace('/admin/login');
        return;
      }
      setReady(true);
    });
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <p className="text-gray-500">Verificando acceso...</p>
      </div>
    );
  }

  const showBar = pathname !== '/admin/login' && pathname !== '/admin/dashboard';

  return (
    <>
      {showBar && (
        <div className="bg-mavic-black text-white text-xs font-semibold px-4 py-2 flex items-center gap-2 sticky top-0 z-50">
          <Link href="/admin/dashboard" className="flex items-center gap-1.5 hover:text-mavic-pink transition">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Panel de Control
          </Link>
        </div>
      )}
      {children}
    </>
  );
}
