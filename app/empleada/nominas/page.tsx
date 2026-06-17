'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Nomina {
  id: string;
  period_month: number;
  period_year: number;
  file_path: string;
  file_name: string;
  importe_liquido: number | null;
  paid: boolean;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
}

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function EmpleadaNominasPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nominas, setNominas] = useState<Nomina[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeLaborId, setEmployeeLaborId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push('/empleada'); return; }
      const { data: profile } = await supabase
        .from('profiles')
        .select('employee_labor_info_id')
        .eq('id', session.user.id)
        .single();
      const laborId = (profile as { employee_labor_info_id: string | null } | null)?.employee_labor_info_id ?? null;
      setEmployeeLaborId(laborId);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadNominas = useCallback(async () => {
    if (!employeeLaborId) return;
    setLoading(true);
    const { data } = await supabase
      .from('nominas')
      .select('*')
      .eq('employee_id', employeeLaborId)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false });
    if (data) setNominas(data as Nomina[]);
    setLoading(false);
  }, [employeeLaborId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (employeeLaborId) loadNominas();
    else if (employeeLaborId === null && !loading) setLoading(false);
  }, [employeeLaborId, loadNominas]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (nomina: Nomina) => {
    const { data, error } = await supabase.storage
      .from('nominas')
      .createSignedUrl(nomina.file_path, 120);
    if (error || !data?.signedUrl) return;
    const a = document.createElement('a');
    a.href = data.signedUrl;
    a.download = nomina.file_name;
    a.click();
  };

  const pendingNominas = nominas.filter(n => !n.paid);

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Mis nóminas</h1>
            {pendingNominas.length > 0 && (
              <p className="text-white/90 text-sm mt-0.5 font-semibold">
                {pendingNominas.length} pendiente{pendingNominas.length > 1 ? 's' : ''} de pago
              </p>
            )}
          </div>
          <button
            onClick={() => router.push('/empleada/dashboard')}
            className="text-white/80 hover:text-white text-sm font-semibold transition"
          >
            ← Volver
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">Cargando...</p>
        ) : nominas.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-10 text-center">
            <p className="text-gray-400 text-sm">No hay nóminas disponibles todavía.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nominas.map(nomina => (
              <div
                key={nomina.id}
                className="bg-white rounded-2xl shadow p-5 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-mavic-pink/10 flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-mavic-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-mavic-black text-sm">
                    {MONTHS[nomina.period_month - 1]} {nomina.period_year}
                  </p>
                  {nomina.importe_liquido != null && (
                    <p className="text-mavic-pink font-semibold text-sm">
                      {nomina.importe_liquido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </p>
                  )}
                  {nomina.notes && (
                    <p className="text-gray-400 text-xs mt-0.5">{nomina.notes}</p>
                  )}
                </div>

                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  {nomina.paid ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">
                      ✓ Pagada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                      Pendiente de pago
                    </span>
                  )}
                  <button
                    onClick={() => handleDownload(nomina)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    Descargar PDF
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
