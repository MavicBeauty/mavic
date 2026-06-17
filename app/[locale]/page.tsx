'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import PromoPopup from '@/components/public/PromoPopup';

interface Service {
  id: string;
  category: string;
  name_es: string;
  name_ca: string;
  price: number;
  price_note_es: string;
  price_note_ca: string;
  is_active: boolean;
  sort_order: number;
}

export default function Home() {
  const locale = useLocale();
  const tNav = useTranslations('nav');
  const tHero = useTranslations('hero');
  const tBooksy = useTranslations('booksy');
  const tSvc = useTranslations('services');
  const tGc = useTranslations('giftCards');
  const tContact = useTranslations('contact');
  const tFooter = useTranslations('footer');
  const [menuOpen, setMenuOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const booksyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('services').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }: { data: Service[] | null }) => { if (data?.length) setServices(data); });
  }, []);

  useEffect(() => {
    if (!booksyRef.current) return;
    const container = booksyRef.current;

    const script = document.createElement('script');
    script.src = 'https://booksy.com/widget-2021/code.js?id=97502&country=es&lang=es&mode=dialog';
    script.async = true;

    container.appendChild(script);

    return () => { script.remove(); };
  }, []);

  const openBooksy = () => {
    const btn = document.querySelector('.booksy-widget-button') as HTMLElement | null;
    btn?.click();
  };


  const navLinks = [
    { href: '#servicios',              label: tNav('services') },
    { href: 'https://mavicbeautynails.booksy.com/h', label: tNav('bookings'), external: true },
    { href: `/${locale}/nuestras-creaciones`, label: tNav('creations') },
    { href: '#tarjetas',               label: tNav('giftCards') },
    { href: '#contacto',               label: tNav('contact') },
  ];

  return (
    <div className="min-h-screen bg-white font-sans">
      <PromoPopup />

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
                {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
                {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
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
          <Image src="/salon/local.jpeg" alt="Mavic Beauty & Nails" fill className="object-cover opacity-[0.50]" priority />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>

        {/* TPO FREE corner badge */}
        <div className="absolute bottom-24 right-8 z-20">
          <div className="w-[88px] h-[88px] rounded-full bg-black border-[3px] border-white flex flex-col items-center justify-center shadow-2xl">
            <span className="text-white text-[11px] font-black tracking-[0.18em] uppercase leading-none">TPO</span>
            <div className="w-9 h-px bg-white/40 my-1" />
            <span className="text-white text-[11px] font-black tracking-[0.18em] uppercase leading-none">FREE</span>
          </div>
        </div>

        <div className="relative z-10 text-center px-4 max-w-3xl mx-auto pt-20">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-4 leading-tight drop-shadow-lg">
            {tHero('welcome')}<br />
            <span className="text-mavic-pink">Mavic Beauty & Nails</span>
          </h1>

          <p className="text-white/90 text-lg md:text-xl mb-3 drop-shadow">
            {tHero('subtitle')}
          </p>

          <p className="text-mavic-gold font-semibold text-base md:text-lg mb-8 drop-shadow">
            {tHero('promo')}
          </p>

          <Link href={`/${locale}/servicios`}
            className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-10 rounded-full text-lg transition shadow-2xl hover:shadow-mavic-pink/40 hover:-translate-y-0.5 transform">
            {tHero('servicesBtn')}
          </Link>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/70">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── BOOKSY WIDGET ── */}
      <section id="reservas" className="py-20 px-4 bg-gradient-to-b from-mavic-pink-light to-white">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">{tBooksy('tag')}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-mavic-black mb-4">
            {tBooksy('title')}
          </h2>
          <button
            onClick={openBooksy}
            className="inline-flex items-center gap-3 bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-4 px-12 rounded-full text-lg transition shadow-2xl hover:shadow-mavic-pink/40 hover:-translate-y-0.5 transform">
            <span>📅</span>
            <span>{tBooksy('cta')}</span>
          </button>
          <p className="text-gray-400 text-xs mt-6">{tBooksy('poweredBy')}</p>
          {/* Hidden Booksy script container — dialog mode creates its own button + overlay */}
          <div ref={booksyRef} className="hidden" />
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section id="servicios" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">{tSvc('tag')}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-12">
            {tSvc('title')}
          </h2>

          {/* Static category icons */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {([
              { icon: '/icons/manicura.png', key: 'manicura' },
              { icon: '/icons/pedicura.png', key: 'pedicura' },
              { icon: '/icons/laser.png',    key: 'laser' },
              { icon: '/icons/pestanas.png', key: 'pestanas' },
              { icon: '/icons/masaje.png',   key: 'masajes' },
              { icon: '/icons/facial.png',   key: 'facial' },
            ] as const).map((s) => (
              <div key={s.key}
                className="bg-white rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition hover:-translate-y-1 transform group">
                <div className="w-14 h-14 mb-4 relative">
                  <Image src={s.icon} alt={tSvc(`items.${s.key}.name`)} fill className="object-contain group-hover:scale-110 transition" />
                </div>
                <h3 className="font-bold text-mavic-black mb-1">{tSvc(`items.${s.key}.name`)}</h3>
                <p className="text-sm text-mavic-pink font-medium">{tSvc(`items.${s.key}.desc`)}</p>
              </div>
            ))}

            <Link href={`/${locale}/nuestras-creaciones`}
              className="bg-mavic-black rounded-2xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition hover:-translate-y-1 transform group">
              <div className="w-14 h-14 mb-4 flex items-center justify-center">
                <span className="text-3xl">💅</span>
              </div>
              <h3 className="font-bold text-white mb-1">{tSvc('creationsName')}</h3>
              <p className="text-sm text-mavic-gold font-medium">{tSvc('creationsDesc')}</p>
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
                          <span className="text-gray-700 text-sm">
                            {locale === 'ca' && item.name_ca ? item.name_ca : item.name_es}
                          </span>
                          <span className="text-mavic-pink font-semibold text-sm whitespace-nowrap ml-4">
                            {(locale === 'ca' && item.price_note_ca ? item.price_note_ca : item.price_note_es)
                              ? `${locale === 'ca' && item.price_note_ca ? item.price_note_ca : item.price_note_es} `
                              : ''}{item.price}€
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
          <p className="text-center text-mavic-pink font-semibold text-sm uppercase tracking-widest mb-2">{tGc('tag')}</p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-4">
            {tGc('title')}
          </h2>
          <p className="text-center text-gray-500 mb-10">
            {tGc('description')}
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
              {tGc('request')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contacto" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold text-center text-mavic-black mb-12">
            {tContact('findUs')}
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm space-y-5">
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">{tContact('hours')}</p>
                <p className="font-semibold text-mavic-black">{tContact('weekdays')}</p>
                <p className="font-semibold text-mavic-black">{tContact('saturdays')}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">{tContact('addressLabel')}</p>
                <p className="text-mavic-black">{tContact('address')}<br />{tContact('city')}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">{tContact('phoneLbl')}</p>
                <p className="text-mavic-black font-semibold">643 59 19 84</p>
              </div>
            </div>
            <div className="space-y-4">
              <a href="https://wa.me/34643591984" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-green-500 hover:bg-green-600 text-white p-4 rounded-xl font-semibold transition shadow-sm">
                <span className="text-2xl">💬</span>
                <span>{tContact('whatsappBtn')}</span>
              </a>
              <a href="https://www.instagram.com/mavicnailscenter/" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-xl font-semibold transition shadow-sm">
                <span className="text-2xl">📸</span>
                <span>{tContact('instagram')}</span>
              </a>
              <a href="https://mavicbeautynails.booksy.com/h" target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-mavic-black text-white p-4 rounded-xl font-semibold transition shadow-sm hover:bg-gray-900">
                <span className="text-2xl">📅</span>
                <span>{tContact('booksyBtn')}</span>
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
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex gap-4 text-xs text-gray-500">
              <Link href={`/${locale}/aviso-legal`} className="hover:text-gray-300 transition">Aviso Legal</Link>
              <Link href={`/${locale}/privacidad`} className="hover:text-gray-300 transition">Privacidad</Link>
              <Link href={`/${locale}/cookies`} className="hover:text-gray-300 transition">Cookies</Link>
            </div>
            <p className="text-gray-500 text-xs">© {new Date().getFullYear()} Mavic Beauty & Nails. {tFooter('rights')}.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
