'use client';

import Link from 'next/link';
import { useState } from 'react';

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

export default function TarjetasRegaloPage() {
  const [giftCards, setGiftCards] = useState<GiftCard[]>([
    {
      id: '1',
      amount: 50,
      sender_name: 'María',
      receiver_name: 'Laura',
      message: 'Para que disfrutes de un día de relax',
      delivery_type: 'digital',
      payment_method: 'card',
      customer_email: 'maria@example.com',
      status: 'pending',
      gc_number: '',
      created_at: '2026-05-06',
    },
    {
      id: '2',
      amount: 100,
      sender_name: 'Carmen',
      receiver_name: 'Sofía',
      message: 'Tarjeta regalo para tu cumpleaños',
      delivery_type: 'physical',
      payment_method: 'cash',
      customer_email: 'carmen@example.com',
      status: 'paid',
      gc_number: 'GC-2026-001',
      created_at: '2026-05-05',
    },
    {
      id: '3',
      amount: 75,
      sender_name: 'Juan',
      receiver_name: 'Elena',
      message: '',
      delivery_type: 'digital',
      payment_method: 'transfer',
      customer_email: 'juan@example.com',
      status: 'sent',
      gc_number: 'GC-2026-002',
      created_at: '2026-05-04',
    },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [gcNumber, setGcNumber] = useState('');

  const statuses = ['pending', 'paid', 'sent', 'cancelled'] as const;
  const statusLabels = {
    pending: 'Pendiente',
    paid: 'Pagada',
    sent: 'Enviada',
    cancelled: 'Cancelada',
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-blue-100 text-blue-800',
    sent: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  const handleAddGcNumber = (id: string) => {
    if (!gcNumber.trim()) return;
    setGiftCards(
      giftCards.map((gc) =>
        gc.id === id ? { ...gc, gc_number: gcNumber, status: 'paid' as const } : gc
      )
    );
    setEditingId(null);
    setGcNumber('');
  };

  const handleStatusChange = (id: string, newStatus: (typeof statuses)[number]) => {
    setGiftCards(
      giftCards.map((gc) => (gc.id === id ? { ...gc, status: newStatus } : gc))
    );
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Está seguro de que desea eliminar esta solicitud?')) {
      setGiftCards(giftCards.filter((gc) => gc.id !== id));
    }
  };

  const pendingCount = giftCards.filter((gc) => gc.status === 'pending').length;
  const totalValue = giftCards.reduce((sum, gc) => sum + gc.amount, 0);
  const sentCount = giftCards.filter((gc) => gc.status === 'sent').length;

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tarjetas Regalo</h1>
            <p className="text-white/80 mt-1">Gestionar solicitudes y envíos</p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-white hover:text-gray-100 font-semibold transition"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {/* Stats */}
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

        {/* Gift Cards Table */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-bold text-mavic-black">
              Solicitudes de Tarjetas Regalo
            </h3>
          </div>

          {giftCards.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No hay solicitudes de tarjetas regalo</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Solicitante
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Destinatario
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Monto
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Entrega
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Nº Booksy
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {giftCards.map((gc) => (
                    <tr key={gc.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-mavic-black">{gc.sender_name}</div>
                        <div className="text-xs text-gray-500">{gc.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-mavic-black">{gc.receiver_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-mavic-pink">€{gc.amount}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {gc.delivery_type === 'digital' ? '📱 Digital' : '📦 Física'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {gc.gc_number ? (
                          <span className="font-mono text-sm font-semibold text-mavic-pink">
                            {gc.gc_number}
                          </span>
                        ) : editingId === gc.id ? (
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={gcNumber}
                              onChange={(e) => setGcNumber(e.target.value)}
                              placeholder="GC-2026-XXX"
                              className="px-2 py-1 border border-mavic-beige-dark rounded text-xs"
                              autoFocus
                            />
                            <button
                              onClick={() => handleAddGcNumber(gc.id)}
                              className="px-2 py-1 bg-mavic-pink text-white rounded text-xs font-semibold hover:bg-mavic-pink/90"
                            >
                              OK
                            </button>
                            <button
                              onClick={() => {
                                setEditingId(null);
                                setGcNumber('');
                              }}
                              className="px-2 py-1 bg-gray-300 rounded text-xs font-semibold hover:bg-gray-400"
                            >
                              X
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingId(gc.id);
                              setGcNumber('');
                            }}
                            className="text-mavic-pink hover:text-mavic-pink/70 font-semibold text-xs"
                          >
                            Añadir →
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={gc.status}
                          onChange={(e) =>
                            handleStatusChange(gc.id, e.target.value as typeof statuses[number])
                          }
                          className={`px-2 py-1 rounded text-xs font-semibold border-0 cursor-pointer ${statusColors[gc.status]}`}
                        >
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {gc.delivery_type === 'digital' && gc.status === 'paid' && (
                            <button
                              onClick={() =>
                                alert(
                                  `Enviando tarjeta digital a ${gc.customer_email}`
                                )
                              }
                              className="text-green-600 hover:text-green-800 font-semibold text-xs"
                            >
                              Enviar
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(gc.id)}
                            className="text-red-600 hover:text-red-800 font-semibold text-xs"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detailed View */}
        {giftCards.filter((gc) => gc.status === 'pending').length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-mavic-black mb-6">Detalles de Solicitudes Pendientes</h3>
            <div className="grid gap-6">
              {giftCards
                .filter((gc) => gc.status === 'pending')
                .map((gc) => (
                  <div key={gc.id} className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="text-sm text-gray-600 font-semibold mb-2">
                          INFORMACIÓN DEL CLIENTE
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-semibold">Solicitante:</span> {gc.sender_name}
                          </p>
                          <p>
                            <span className="font-semibold">Email:</span> {gc.customer_email}
                          </p>
                          <p>
                            <span className="font-semibold">Fecha:</span>{' '}
                            {new Date(gc.created_at).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm text-gray-600 font-semibold mb-2">
                          DETALLES DE LA TARJETA
                        </h4>
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-semibold">Destinatario:</span> {gc.receiver_name}
                          </p>
                          <p>
                            <span className="font-semibold">Monto:</span>{' '}
                            <span className="text-mavic-pink font-bold">€{gc.amount}</span>
                          </p>
                          <p>
                            <span className="font-semibold">Entrega:</span>{' '}
                            {gc.delivery_type === 'digital' ? 'Digital' : 'Física'}
                          </p>
                          <p>
                            <span className="font-semibold">Pago:</span> {gc.payment_method}
                          </p>
                        </div>
                      </div>
                    </div>
                    {gc.message && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600 font-semibold mb-1">MENSAJE</p>
                        <p className="text-sm text-gray-700 italic">"{gc.message}"</p>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
