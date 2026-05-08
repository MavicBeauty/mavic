'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface GiftCard {
  id: string;
  amount: number;
  sender_name: string;
  receiver_name: string;
  message: string;
  delivery_type: 'digital' | 'physical';
  payment_method: string;
  customer_email: string;
  status: 'pending' | 'paid' | 'sent' | 'cancelled';
  gc_number: string;
  created_at: string;
}

const statuses = ['pending', 'paid', 'sent', 'cancelled'] as const;
const statusLabels = { pending: 'Pendiente', paid: 'Pagada', sent: 'Enviada', cancelled: 'Cancelada' };
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-blue-100 text-blue-800',
  sent: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export default function TarjetasRegaloPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gcNumber, setGcNumber] = useState('');

  const supabase = createClient();

  const load = async () => {
    const { data } = await supabase.from('gift_cards').select('*').order('created_at', { ascending: false });
    if (data) setGiftCards(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAddGcNumber = async (id: string) => {
    if (!gcNumber.trim()) return;
    await supabase.from('gift_cards').update({ gc_number: gcNumber, status: 'paid' }).eq('id', id);
    setGiftCards(giftCards.map((gc) => gc.id === id ? { ...gc, gc_number: gcNumber, status: 'paid' } : gc));
    setEditingId(null);
    setGcNumber('');
  };

  const handleStatusChange = async (id: string, newStatus: typeof statuses[number]) => {
    await supabase.from('gift_cards').update({ status: newStatus }).eq('id', id);
    setGiftCards(giftCards.map((gc) => gc.id === id ? { ...gc, status: newStatus } : gc));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    await supabase.from('gift_cards').delete().eq('id', id);
    setGiftCards(giftCards.filter((gc) => gc.id !== id));
  };

  const pendingCount = giftCards.filter((gc) => gc.status === 'pending').length;
  const totalValue = giftCards.reduce((sum, gc) => sum + Number(gc.amount), 0);
  const sentCount = giftCards.filter((gc) => gc.status === 'sent').length;

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tarjetas Regalo</h1>
            <p className="text-white/80 mt-1">Gestionar solicitudes y envíos</p>
          </div>
          <Link href="/admin/dashboard" className="text-white hover:text-gray-100 font-semibold transition">← Volver</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">TOTAL SOLICITUDES</p>
            <p className="text-3xl font-bold text-mavic-pink">{giftCards.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">PENDIENTES</p>
            <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">ENVIADAS</p>
            <p className="text-3xl font-bold text-green-600">{sentCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">VALOR TOTAL</p>
            <p className="text-3xl font-bold text-mavic-gold">€{totalValue}</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">Solicitudes ({giftCards.length})</h3>
          </div>
          {loading ? (
            <div className="p-6 text-center text-gray-600">Cargando...</div>
          ) : giftCards.length === 0 ? (
            <div className="p-12 text-center text-gray-600">No hay solicitudes de tarjetas regalo</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Solicitante</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Destinatario</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Monto</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Entrega</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Nº Booksy</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map((gc) => (
                    <tr key={gc.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-mavic-black">{gc.sender_name}</div>
                        <div className="text-xs text-gray-500">{gc.customer_email}</div>
                        <div className="text-xs text-gray-500">{new Date(gc.created_at).toLocaleDateString('es-ES')}</div>
                      </td>
                      <td className="px-4 py-3 font-medium">{gc.receiver_name}</td>
                      <td className="px-4 py-3 font-bold text-mavic-pink">€{gc.amount}</td>
                      <td className="px-4 py-3 text-xs">
                        {gc.delivery_type === 'digital' ? '📱 Digital' : '📦 Física'}
                      </td>
                      <td className="px-4 py-3">
                        {gc.gc_number ? (
                          <span className="font-mono text-sm font-semibold text-mavic-pink">{gc.gc_number}</span>
                        ) : editingId === gc.id ? (
                          <div className="flex gap-1">
                            <input type="text" value={gcNumber} onChange={(e) => setGcNumber(e.target.value)}
                              placeholder="GC-2026-XXX" autoFocus
                              className="px-2 py-1 border border-mavic-beige-dark rounded text-xs" />
                            <button onClick={() => handleAddGcNumber(gc.id)}
                              className="px-2 py-1 bg-mavic-pink text-white rounded text-xs font-semibold">OK</button>
                            <button onClick={() => { setEditingId(null); setGcNumber(''); }}
                              className="px-2 py-1 bg-gray-300 rounded text-xs">X</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingId(gc.id)}
                            className="text-mavic-pink hover:text-mavic-pink/70 font-semibold text-xs">
                            Añadir →
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select value={gc.status}
                          onChange={(e) => handleStatusChange(gc.id, e.target.value as typeof statuses[number])}
                          className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${statusColors[gc.status]}`}>
                          {statuses.map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(gc.id)}
                          className="text-red-600 hover:text-red-800 font-semibold text-xs">
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
