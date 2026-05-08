'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function TarjetasRegaloPage() {
  const [step, setStep] = useState<'form' | 'confirmation'>('form');
  const [formData, setFormData] = useState({
    amount: '50',
    customAmount: '',
    sender_name: '',
    receiver_name: '',
    message: '',
    delivery_type: 'digital' as 'digital' | 'physical',
    payment_method: 'card' as 'card' | 'cash' | 'transfer',
    customer_email: '',
  });

  const presetAmounts = [25, 50, 75, 100];

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData({
      ...formData,
      [name]:
        type === 'radio' && name === 'delivery_type'
          ? (value as 'digital' | 'physical')
          : type === 'radio' && name === 'payment_method'
            ? (value as 'card' | 'cash' | 'transfer')
            : value,
    });
  };

  const handleAmountSelect = (amount: number) => {
    setFormData({
      ...formData,
      amount: amount.toString(),
      customAmount: '',
    });
  };

  const handleCustomAmount = (value: string) => {
    setFormData({
      ...formData,
      amount: 'custom',
      customAmount: value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Here you would normally send the data to your API
    console.log('Gift card request:', formData);
    setStep('confirmation');
  };

  const finalAmount =
    formData.amount === 'custom' ? formData.customAmount : formData.amount;

  return (
    <div className="min-h-screen bg-mavic-beige">
      {/* Header */}
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Tarjetas Regalo</h1>
            <p className="text-white/80 mt-1">
              El regalo perfecto para los amantes del cuidado personal
            </p>
          </div>
          <Link
            href="/es"
            className="text-white hover:text-gray-100 font-semibold transition"
          >
            ← Volver
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-12">
        {step === 'form' ? (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Amount Selection */}
              <div>
                <h2 className="text-xl font-bold text-mavic-black mb-4">
                  1. Selecciona el Monto
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => handleAmountSelect(amount)}
                      className={`p-4 rounded-lg font-bold text-lg transition ${
                        formData.amount === amount.toString()
                          ? 'bg-mavic-pink text-white shadow-lg'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      €{amount}
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    O ingresa tu monto personalizado
                  </label>
                  <div className="flex gap-2">
                    <span className="text-2xl font-bold text-mavic-pink">€</span>
                    <input
                      type="number"
                      value={formData.customAmount}
                      onChange={(e) => handleCustomAmount(e.target.value)}
                      placeholder="100"
                      min="10"
                      step="5"
                      className="flex-1 px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    />
                  </div>
                </div>
              </div>

              {/* Recipient Info */}
              <div>
                <h2 className="text-xl font-bold text-mavic-black mb-4">
                  2. Información de la Tarjeta
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Tu Nombre *
                    </label>
                    <input
                      type="text"
                      name="sender_name"
                      value={formData.sender_name}
                      onChange={handleChange}
                      placeholder="María"
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Nombre del Destinatario *
                    </label>
                    <input
                      type="text"
                      name="receiver_name"
                      value={formData.receiver_name}
                      onChange={handleChange}
                      placeholder="Laura"
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Mensaje Personalizado (Opcional)
                    </label>
                    <textarea
                      name="message"
                      value={formData.message}
                      onChange={handleChange}
                      placeholder="Escribe un mensaje especial..."
                      rows={3}
                      className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div>
                <h2 className="text-xl font-bold text-mavic-black mb-4">
                  3. Forma de Entrega
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery_type"
                      value="digital"
                      checked={formData.delivery_type === 'digital'}
                      onChange={handleChange}
                      className="w-4 h-4 text-mavic-pink focus:ring-mavic-pink"
                    />
                    <div>
                      <p className="font-semibold text-mavic-black">📱 Entrega Digital</p>
                      <p className="text-sm text-gray-600">
                        Recibirá la tarjeta por email inmediatamente
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="delivery_type"
                      value="physical"
                      checked={formData.delivery_type === 'physical'}
                      onChange={handleChange}
                      className="w-4 h-4 text-mavic-pink focus:ring-mavic-pink"
                    />
                    <div>
                      <p className="font-semibold text-mavic-black">📦 Entrega Física</p>
                      <p className="text-sm text-gray-600">
                        Recoja la tarjeta en nuestro centro
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <h2 className="text-xl font-bold text-mavic-black mb-4">
                  4. Forma de Pago
                </h2>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="card"
                      checked={formData.payment_method === 'card'}
                      onChange={handleChange}
                      className="w-4 h-4 text-mavic-pink focus:ring-mavic-pink"
                    />
                    <div>
                      <p className="font-semibold text-mavic-black">💳 Tarjeta de Crédito</p>
                      <p className="text-sm text-gray-600">
                        Pago seguro en línea
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="cash"
                      checked={formData.payment_method === 'cash'}
                      onChange={handleChange}
                      className="w-4 h-4 text-mavic-pink focus:ring-mavic-pink"
                    />
                    <div>
                      <p className="font-semibold text-mavic-black">💵 Efectivo</p>
                      <p className="text-sm text-gray-600">
                        Pago en nuestro centro
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payment_method"
                      value="transfer"
                      checked={formData.payment_method === 'transfer'}
                      onChange={handleChange}
                      className="w-4 h-4 text-mavic-pink focus:ring-mavic-pink"
                    />
                    <div>
                      <p className="font-semibold text-mavic-black">📲 Transferencia</p>
                      <p className="text-sm text-gray-600">
                        Contacta por WhatsApp para detalles
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Email */}
              <div>
                <h2 className="text-xl font-bold text-mavic-black mb-4">
                  5. Tu Email de Contacto
                </h2>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleChange}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-2 border border-mavic-beige-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                  required
                />
                <p className="text-sm text-gray-600 mt-2">
                  Te usaremos para confirmar tu compra
                </p>
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition"
                >
                  Solicitar Tarjeta Regalo
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🎁</div>
            <h2 className="text-3xl font-bold text-mavic-black mb-4">
              ¡Gracias por tu Compra!
            </h2>
            <p className="text-gray-600 mb-6">
              Tu solicitud de tarjeta regalo ha sido recibida correctamente.
            </p>

            <div className="bg-mavic-beige rounded-lg p-6 mb-6 space-y-3 text-left">
              <div>
                <p className="text-sm text-gray-600">MONTO</p>
                <p className="text-2xl font-bold text-mavic-pink">€{finalAmount}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">DE</p>
                <p className="font-semibold text-mavic-black">{formData.sender_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">PARA</p>
                <p className="font-semibold text-mavic-black">{formData.receiver_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">ENTREGA</p>
                <p className="font-semibold text-mavic-black">
                  {formData.delivery_type === 'digital'
                    ? '📱 Digital'
                    : '📦 Física'}
                </p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                ¿Qué sucede ahora?
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>✓ Recibirás un email de confirmación</li>
                <li>
                  ✓ Nuestro equipo procesará tu solicitud en 24 horas
                </li>
                <li>
                  ✓ Si elegiste pago por transferencia, te contactaremos para los
                  detalles
                </li>
                <li>
                  ✓ La tarjeta será {formData.delivery_type === 'digital' ? 'enviada por email' : 'lista para recoger'}
                </li>
              </ul>
            </div>

            {formData.payment_method === 'transfer' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-semibold text-yellow-900 mb-2">
                  📲 Contacta por WhatsApp
                </p>
                <p className="text-sm text-yellow-800">
                  Haz clic en el botón de WhatsApp en la página principal para
                  coordinarte con nosotros sobre los detalles de la transferencia.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setStep('form');
                  setFormData({
                    amount: '50',
                    customAmount: '',
                    sender_name: '',
                    receiver_name: '',
                    message: '',
                    delivery_type: 'digital',
                    payment_method: 'card',
                    customer_email: '',
                  });
                }}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-3 px-4 rounded-lg transition"
              >
                Solicitar Otra
              </button>
              <Link
                href="/es"
                className="flex-1 bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 px-4 rounded-lg hover:shadow-lg transition text-center"
              >
                Volver al Inicio
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
