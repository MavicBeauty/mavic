'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

export default function CaHome() {
  const [isLangOpen, setIsLangOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/ca" className="flex items-center gap-2 hover:opacity-80 transition">
            <Image src="/mavic-logo.png" alt="MAVIC" width={40} height={40} />
            <span className="text-lg font-bold text-mavic-pink">MAVIC</span>
          </Link>
          <div className="flex items-center gap-8">
            <a href="#servicios" className="text-sm font-medium hover:text-mavic-pink transition">
              Serveis
            </a>
            <a href="#precios" className="text-sm font-medium hover:text-mavic-pink transition">
              Preus
            </a>
            <a href="#tarjetas" className="text-sm font-medium hover:text-mavic-pink transition">
              Targetes Regal
            </a>
            <a href="#contacto" className="text-sm font-medium hover:text-mavic-pink transition">
              Contacte
            </a>
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="px-3 py-1 text-sm font-medium text-mavic-black border border-mavic-gold rounded hover:bg-mavic-pink-light transition"
              >
                CA
              </button>
              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-32 bg-white border border-mavic-gold rounded shadow-lg z-50">
                  <a
                    href="/es"
                    className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                  >
                    Español
                  </a>
                  <a
                    href="/ca"
                    className="block w-full text-left px-4 py-2 text-sm bg-mavic-pink-light font-bold"
                  >
                    Català
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-mavic-pink-light to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <Image
              src="/mavic-logo.png"
              alt="MAVIC Logo"
              width={120}
              height={120}
              priority
              className="rounded-full"
            />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-mavic-black mb-4">
            MAVIC Beauty & Nails
          </h1>
          <p className="text-xl text-mavic-gold font-semibold mb-4">
            Saló d'Estètica, Bellesa i Molt Més
          </p>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            Especialistes en manicura, pedicura, depilació làser i tractaments de bellesa professionals.
          </p>

          <a
            href="https://mavicbeautynails.booksy.com/h"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg"
          >
            Demana la teva cita
          </a>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-2 text-mavic-black">
            Els nostres serveis
          </h2>
          <p className="text-center text-gray-600 mb-12">
            Tots els nostres serveis realitzats per professionals certificades
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Manicura</h3>
              <p className="text-gray-600">Des de €18</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Pedicura</h3>
              <p className="text-gray-600">Des de €25</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Depilació Làser</h3>
              <p className="text-gray-600">Des de €50</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-mavic-black">
            Contacte
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Hours & Address */}
            <div className="bg-mavic-beige p-8 rounded-lg">
              <h3 className="font-bold text-mavic-black mb-4 text-lg">🕒 Horari</h3>
              <p className="text-mavic-black mb-6 font-semibold">L-V 9:00 a 20:30 | S 10:00 a 14:00</p>

              <h3 className="font-bold text-mavic-black mb-4 text-lg">📍 Adreça</h3>
              <p className="text-mavic-black">Plaça de l'Església, 11</p>
              <p className="text-mavic-black">08110 Montcada i Reixac, Barcelona</p>
            </div>

            {/* Quick Contact */}
            <div className="space-y-4">
              <a
                href="https://wa.me/34643591984"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-pink hover:bg-mavic-pink/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                💬 Contactar per WhatsApp
              </a>

              <a
                href="https://www.instagram.com/mavicnailscenter/"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-gold hover:bg-mavic-gold/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                📸 Segueix-nos a Instagram
              </a>

              <a
                href="https://mavicbeautynails.booksy.com/h"
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-black hover:bg-mavic-black/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                📅 Veure cites a Booksy
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Admin Link */}
      <section className="py-8 px-4 bg-gray-100">
        <div className="max-w-6xl mx-auto text-center">
          <p className="text-gray-600 mb-4">Ets administrador?</p>
          <Link
            href="/admin/login"
            className="inline-block text-mavic-pink font-semibold hover:underline"
          >
            Accés Administrador
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-mavic-black text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-3">MAVIC Beauty & Nails</h3>
              <p className="text-gray-300 text-sm">
                Plaça de l'Església, 11, 08110 Montcada i Reixac, Barcelona
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">📞 Contacte</h4>
              <p className="text-mavic-pink font-semibold">+34 643 59 19 84</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">🕒 Horari</h4>
              <p className="text-gray-300 text-sm">L-V 9:00-20:30 | S 10:00-14:00</p>
            </div>
          </div>
          <div className="text-center border-t border-gray-700 pt-8">
            <p className="text-gray-400 text-sm">Tots els drets reservats © 2024 MAVIC Beauty & Nails</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
