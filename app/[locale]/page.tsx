'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

interface Service {
  id: string;
  category: string;
  name_es: string;
  price: number;
  price_note_es: string;
  is_active: boolean;
  sort_order: number;
}

export default function Home() {
  const locale = useLocale();
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('services').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }: { data: Service[] | null }) => { if (data?.length) setServices(data); });
  }, []);

  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://booksy.com/widget/code.js?id=97502&country=es&lang=es';
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const navLinks = [
    { href: '#servicios', label: 'Servicios' },
    { href: '#reservas', label: 'Reservas' },
    { href: `/${locale}/nuestras-creaciones`, label: 'Nuestras Creaciones' },
    { href: '#tarjetas', label: 'Tarjetas Regalo' },
    { href: '#contacto', label: 'Contacto' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAVIGATION ── */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          {/* Logo only */}
          <Link href={`/${locale}`} className="flex items-center">
            <Image src="/mavic-logo.png" alt="Mavic Beauty & Nails" width={48} height={48} className="object-contain" />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href}
                className="text-sm font-medium text-gray-700 hover:text-mavic-pink transition">
                {l.label}
              </a>
            ))}
            <div className="flex gap-1 ml-2 border border-mavic-beige-dark rounded-lg overflow-hidden text-xs font-semibold">
              <Link href="/es" className={`px-3 py-1.5 transition ${locale === 'es' ? 'bg-mavic-pink text-white' : 'text-gray-600 hover:bg-gray-100'}`}>ES</Link>
              <Link href="/ca" className={`px-3 py-1.5 transition ${locale === 'ca' ? 'bg-mavic-pink text-white' : 'text-gray-600 hover:bg-gray-100'}`}>CA</Link>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menú">
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 flex flex-col gap-4 shadow-lg">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
                className="text-sm font-medium text-gray-700 hover:text-mavic-pink py-1 transition">
                {l.label}
              </a>
            ))}
            <div className="flex gap-1 w-fit border border-mavic-beige-dark rounded-lg overflow-hidden text-xs font-semibold">
              <Link href="/es" className={`px-3 py-1.5 transition ${locale === 'es' ? 'bg-mavic-pink text-white' : 'text-gray-600'}`}>ES</Link>
              <Link href="/ca" className={`px-3 py-1.5 transition ${locale === 'ca' ? 'bg-mavic-pink text-white' : 'text-gray-600'}`}>CA</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <Image src="/salon/local.jpeg" alt="Mavic Beauty & Nails" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-20">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image src="/mavic-logo.png" alt="Mavic" width={90} height={90} className="drop-shadow-2xl" />
          </div>

          {/* TPO FREE badge */}
          <div className="flex justify-center mb-5">
            <span className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-widest uppercase">
              TPO FREE
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            Bienvenidos a<br />
            <span className="text-mavic-pink">Mavic Beauty & Nails</span>
          </h1>

          <p className="text-white/90 text-lg md:text-xl mb-3 drop-shadow">
            Centro de uñas, depilación láser y muchas más oportunidades de ponerte bella en nuestro salón.
          </p>

          <p className="text-mavic-gold font-semibold text-base md:text-lg mb-8 drop-shadow">
            ✨ Tu manicura ideal con esmalte semipermanente, desde 14€
          </p>

          <a href="https://mavicbeautynails.booksy.com/h" target="_blank" rel="noopener noreferrer"
            className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-10 rounded-full text-lg transition shadow-2xl hover:shadow-mavic-pink/40 hover:-translate-y-0.5 transform">
            Nuestros Servicios
          </a>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── BOOKSY WIDGET ── */}
      <section id="reservas" className="py-16 px-4 bg-gradient-to-b from-mavic-pink-light to-white">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">Reserva online</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-mavic-black mb-2">
            ¿Lista para tu próxima cita?
          </h2>
          <p className="text-gray-500 mb-8">Elige tu servicio, día y hora en segundos — sin esperas, sin llamadas.</p>
          <div className="bg-white rounded-2xl shadow-xl p-6 flex justify-center">
            <div className="booksy-widget-embed" data-id="97502" data-country="es" data-lang="es" />
          </div>
          <p className="text-gray-400 text-xs mt-4">Powered by Booksy</p>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicios" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">Lo que hacemos</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-12">
            Nuestros Servicios
          </h2>

          {/* Static category icons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {[
              { icon: '/icons/manicura.png', name: 'Manicura', desc: 'Semipermanente desde 14€' },
              { icon: '/icons/pedicura.png', name: 'Pedicura', desc: 'Cuidado completo del pie' },
              { icon: '/icons/laser.png', name: 'Depilación Láser', desc: 'Tecnología de vanguardia' },
              { icon: '/icons/cera.png', name: 'Depilación Cera', desc: 'Suave y duradera' },
              { icon: '/icons/pestanas.png', name: 'Pestañas', desc: 'Lifting y extensiones' },
              { icon: '/icons/masaje.png', name: 'Masajes', desc: 'Relax total' },
              { icon: '/icons/facial.png', name: 'Faciales', desc: 'Piel radiante' },
            ].map((s) => (
              <div key={s.name}
                className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition hover:-translate-y-1 transform group">
                <div className="w-14 h-14 mb-4 relative">
                  <Image src={s.icon} alt={s.name} fill className="object-contain group-hover:scale-110 transition" />
                </div>
                <h3 className="font-bold text-mavic-black mb-1">{s.name}</h3>
                <p className="text-sm text-mavic-pink font-medium">{s.desc}</p>
              </div>
            ))}

            <Link href={`/${locale}/nuestras-creaciones`}
              className="bg-mavic-black rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition hover:-translate-y-1 transform group">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <span className="text-3xl">💅</span>
              </div>
              <h3 className="font-bold text-white mb-1">Nuestras Creaciones</h3>
              <p className="text-sm text-mavic-gold font-medium">Ver galería →</p>
            </Link>
          </div>

          {/* Dynamic pricing from DB */}
          {services.length > 0 && (() => {
            const byCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
              if (!acc[s.category]) acc[s.category] = [];
              acc[s.category].push(s);
              return acc;
            }, {});
            return (
              <div className="space-y-8">
                {Object.entries(byCategory).map(([cat, items]) => (
                  <div key={cat} className="bg-white rounded-2xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-mavic-black mb-4 uppercase tracking-wide border-b border-gray-100 pb-3">
                      {cat}
                    </h3>
                    <div className="space-y-2">
                      {items.map((item) => (
                        <div key={item.id} className="flex justify-between items-center py-1.5">
                          <span className="text-gray-700 text-sm">{item.name_es}</span>
                          <span className="text-mavic-pink font-semibold text-sm whitespace-nowrap ml-4">
                            {item.price_note_es ? `${item.price_note_es} ` : ''}{item.price}€
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── GIFT CARDS ── */}
      <section id="tarjetas" className="py-20 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">El regalo perfecto</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-4">
            Tarjetas Regalo
          </h2>
          <p className="text-center text-gray-500 mb-10">
            Regala una experiencia de belleza única. Elige tu diseño favorito.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {['/gc1.png', '/gc2.png', '/gc3.png'].map((src, i) => (
              <div key={i} className="relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition hover:-translate-y-1 transform cursor-pointer">
                <Image src={src} alt={`Tarjeta regalo ${i + 1}`} width={400} height={250} className="w-full object-cover" />
              </div>
            ))}
          </div>

          <div className="text-center">
            <Link href={`/${locale}/tarjetas-regalo`}
              className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-10 rounded-full transition shadow-lg">
              Solicitar Tarjeta Regalo
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contacto" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-12">
            Encuéntranos
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">Horario</p>
                <p className="font-semibold text-mavic-black">Lunes — Viernes: 9:00 — 20:30</p>
                <p className="font-semibold text-mavic-black">Sábados: 10:00 — 14:00</p>
              </div>
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">Dirección</p>
                <p className="text-mavic-black">Plaça de l'Església, 11<br />08110 Montcada i Reixac, Barcelona</p>
              </div>
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">Teléfono</p>
                <p className="text-mavic-black font-semibold">643 59 19 84</p>
              </div>
            </div>
            <div className="space-y-4">
              <a href="https://wa.me/34643591984" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-semibold transition shadow-sm">
                <span className="text-2xl">💬</span>
                <span>Escríbenos por WhatsApp</span>
              </a>
              <a href="https://www.instagram.com/mavicnailscenter/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-semibold transition shadow-sm">
                <span className="text-2xl">📸</span>
                <span>@mavicnailscenter</span>
              </a>
              <a href="https://mavicbeautynails.booksy.com/h" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-mavic-black text-white p-4 rounded-xl font-semibold transition shadow-sm hover:bg-gray-900">
                <span className="text-2xl">📅</span>
                <span>Reservar cita en Booksy</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-mavic-black text-white py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <Image src="/mavic-logo.png" alt="Mavic" width={36} height={36} className="opacity-80" />
            <span className="text-sm text-gray-400">Mavic Beauty & Nails · Montcada i Reixac, Barcelona</span>
          </div>
          <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Mavic Beauty & Nails. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
