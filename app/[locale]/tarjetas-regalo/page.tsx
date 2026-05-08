'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

const CARDS = [
  { id: 1, src: '/gc1.png', name: 'Clásica' },
  { id: 2, src: '/gc2.png', name: 'Catalana' },
  { id: 3, src: '/gc3.png', name: 'Elegante' },
];

const WHATSAPP_NUMBER = '34643591984';

export default function TarjetasRegaloPage() {
  const locale = useLocale();
  const [step, setStep] = useState<'choose' | 'form' | 'pay' | 'done'>('choose');
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [form, setForm] = useState({ de: '', para: '', monto: '', mensaje: '' });
  const [payMethod, setPayMethod] = useState<'presencial' | 'virtual' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePay = async (method: 'presencial' | 'virtual') => {
    setPayMethod(method);
    setLoading(true);

    const supabase = createClient();
    await supabase.from('gift_cards').insert([{
      amount: parseFloat(form.monto),
      sender_name: form.de,
      receiver_name: form.para,
      message: form.mensaje,
      delivery_type: 'physical',
      payment_method: method,
      customer_email: '',
      status: 'pending',
      gc_number: '',
    }]);

    setLoading(false);

    if (method === 'virtual') {
      const text = encodeURIComponent(`Hola! Quiero pagar una tarjeta de regalo de ${form.monto}€ (estilo: ${CARDS.find(c => c.id === selectedCard)?.name})`);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${text}`, '_blank');
    }

    setStep('done');
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-mavic-black hover:text-mavic-pink transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Inicio</span>
          </Link>
          <Image src="/mavic-logo.png" alt="Mavic" width={40} height={40} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-12">

        {/* ── STEP 1: Choose card ── */}
        {step === 'choose' && (
          <div>
            <div className="text-center mb-8">
              <h1 className="text-3xl font-extrabold text-mavic-black mb-2">Tarjetas Regalo</h1>
              <p className="text-gray-500">Elige el diseño que más te guste</p>
            </div>
            <div className="grid gap-5">
              {CARDS.map((card) => (
                <button key={card.id}
                  onClick={() => { setSelectedCard(card.id); setStep('form'); }}
                  className={`relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition hover:-translate-y-0.5 transform border-4 ${selectedCard === card.id ? 'border-mavic-pink' : 'border-transparent'}`}>
                  <Image src={card.src} alt={card.name} width={600} height={380} className="w-full object-cover" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <span className="text-white font-bold text-lg">{card.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 2: Fill form ── */}
        {step === 'form' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <button onClick={() => setStep('choose')} className="text-mavic-pink text-sm font-semibold mb-6 flex items-center gap-1 hover:gap-2 transition-all">
              ← Cambiar diseño
            </button>

            {selectedCard && (
              <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
                <Image src={`/gc${selectedCard}.png`} alt="Tarjeta seleccionada" width={500} height={300} className="w-full object-cover" />
              </div>
            )}

            <h2 className="text-xl font-extrabold text-mavic-black mb-6">Datos de la tarjeta</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">De *</label>
                <input type="text" name="de" value={form.de} onChange={handleFormChange}
                  placeholder="Tu nombre"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                  required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Para *</label>
                <input type="text" name="para" value={form.para} onChange={handleFormChange}
                  placeholder="Nombre del destinatario"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                  required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Monto en € *</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">€</span>
                  <input type="number" name="monto" value={form.monto} onChange={handleFormChange}
                    placeholder="50"
                    min="10" step="5"
                    className="w-full pl-8 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Mensaje especial <span className="text-gray-400 font-normal">(solo tarjetas físicas)</span>
                </label>
                <textarea name="mensaje" value={form.mensaje} onChange={handleFormChange}
                  placeholder="Escribe algo bonito..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base resize-none" />
              </div>
            </div>

            <button
              onClick={() => { if (form.de && form.para && form.monto) setStep('pay'); }}
              disabled={!form.de || !form.para || !form.monto}
              className="w-full mt-6 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed text-base">
              Continuar →
            </button>
          </div>
        )}

        {/* ── STEP 3: Payment ── */}
        {step === 'pay' && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-extrabold text-mavic-black mb-2">¿Cómo quieres pagar?</h2>
            <p className="text-gray-500 mb-6">Tarjeta regalo de <strong>€{form.monto}</strong> — {CARDS.find(c => c.id === selectedCard)?.name}</p>

            <div className="space-y-4">
              <button
                onClick={() => handlePay('presencial')}
                disabled={loading}
                className="w-full flex items-start gap-4 p-5 border-2 border-gray-200 hover:border-mavic-pink rounded-xl transition text-left group">
                <span className="text-3xl mt-0.5">🏪</span>
                <div>
                  <p className="font-bold text-mavic-black group-hover:text-mavic-pink transition">Pagar en el centro</p>
                  <p className="text-sm text-gray-500 mt-1">Ven a nuestro salón y paga en persona</p>
                </div>
              </button>

              <button
                onClick={() => handlePay('virtual')}
                disabled={loading}
                className="w-full flex items-start gap-4 p-5 border-2 border-gray-200 hover:border-green-500 rounded-xl transition text-left group">
                <span className="text-3xl mt-0.5">💬</span>
                <div>
                  <p className="font-bold text-mavic-black group-hover:text-green-600 transition">Pagar por WhatsApp</p>
                  <p className="text-sm text-gray-500 mt-1">Te abriremos un chat con los detalles del pago</p>
                </div>
              </button>
            </div>

            <button onClick={() => setStep('form')} className="mt-6 text-sm text-gray-400 hover:text-gray-600 transition">
              ← Volver
            </button>
          </div>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h2 className="text-2xl font-extrabold text-mavic-black mb-2">¡Solicitud recibida!</h2>

            {payMethod === 'presencial' ? (
              <>
                <p className="text-gray-600 mb-6">Puedes venir a pagar cuando quieras. Te esperamos en:</p>
                <div className="bg-mavic-beige rounded-xl p-5 mb-6 text-left">
                  <p className="font-bold text-mavic-black">📍 Mavic Beauty & Nails</p>
                  <p className="text-gray-700 mt-1">Plaça de l'Església, 11<br />08110 Montcada i Reixac, Barcelona</p>
                  <p className="text-gray-700 mt-2">🕒 L–V 9:00–20:30 · Sáb 10:00–14:00</p>
                </div>
              </>
            ) : (
              <p className="text-gray-600 mb-6">
                Se ha abierto WhatsApp con los detalles. Si no se abrió,{' '}
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                  className="text-mavic-pink underline font-semibold">
                  haz clic aquí
                </a>.
              </p>
            )}

            <Link href={`/${locale}`}
              className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-8 rounded-full transition">
              Volver al inicio
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
