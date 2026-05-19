'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

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

const CATEGORY_ICONS: Record<string, string> = {
  MANICURA:          '💅',
  PEDICURA:          '🦶',
  'DEPILACIÓN LÁSER': '✨',
  'DEPILACION LASER': '✨',
  PESTAÑAS:          '👁️',
  MASAJES:           '🤲',
  FACIALES:          '🌸',
  'LIMPIEZAS FACIALES': '🌸',
};

function categoryIcon(cat: string) {
  const key = Object.keys(CATEGORY_ICONS).find(k =>
    cat.toUpperCase().includes(k) || k.includes(cat.toUpperCase())
  );
  return key ? CATEGORY_ICONS[key] : '💎';
}

export default function ServiciosPage() {
  const locale = useLocale();
  const t = useTranslations('serviciosPage');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }: { data: Service[] | null }) => {
        if (data) setServices(data);
        setLoading(false);
      });
  }, []);

  const byCategory = services.reduce<Record<string, Service[]>>((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── NAV ── */}
      <nav className="sticky top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center">
            <Image src="/mavic-logo.png" alt="Mavic Beauty & Nails" width={44} height={44} className="object-contain" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href={`/${locale}`} className="text-sm font-medium text-gray-600 hover:text-mavic-pink transition">
              {locale === 'ca' ? 'Inici' : 'Inicio'}
            </Link>
            <Link href={`/${locale}/nuestras-creaciones`} className="text-sm font-medium text-gray-600 hover:text-mavic-pink transition">
              {locale === 'ca' ? 'Les nostres creacions' : 'Nuestras Creaciones'}
            </Link>
            <Link href={`/${locale}/tarjetas-regalo`} className="text-sm font-medium text-gray-600 hover:text-mavic-pink transition">
              {locale === 'ca' ? 'Targetes Regal' : 'Tarjetas Regalo'}
            </Link>
            <div className="flex gap-1 ml-2 border border-mavic-beige-dark rounded-lg overflow-hidden text-xs font-semibold">
              <Link href="/es/servicios" className={`px-3 py-1.5 transition ${locale === 'es' ? 'bg-mavic-pink text-white' : 'text-gray-600 hover:bg-gray-100'}`}>ES</Link>
              <Link href="/ca/servicios" className={`px-3 py-1.5 transition ${locale === 'ca' ? 'bg-mavic-pink text-white' : 'text-gray-600 hover:bg-gray-100'}`}>CA</Link>
            </div>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden flex flex-col gap-1.5 p-2" aria-label="Menú">
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-6 h-0.5 bg-mavic-black transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 flex flex-col gap-3 shadow-lg">
            <Link href={`/${locale}`} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-mavic-pink py-1 transition">
              {locale === 'ca' ? 'Inici' : 'Inicio'}
            </Link>
            <Link href={`/${locale}/nuestras-creaciones`} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-mavic-pink py-1 transition">
              {locale === 'ca' ? 'Les nostres creacions' : 'Nuestras Creaciones'}
            </Link>
            <Link href={`/${locale}/tarjetas-regalo`} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-gray-700 hover:text-mavic-pink py-1 transition">
              {locale === 'ca' ? 'Targetes Regal' : 'Tarjetas Regalo'}
            </Link>
            <div className="flex gap-1 w-fit border border-mavic-beige-dark rounded-lg overflow-hidden text-xs font-semibold">
              <Link href="/es/servicios" className={`px-3 py-1.5 transition ${locale === 'es' ? 'bg-mavic-pink text-white' : 'text-gray-600'}`}>ES</Link>
              <Link href="/ca/servicios" className={`px-3 py-1.5 transition ${locale === 'ca' ? 'bg-mavic-pink text-white' : 'text-gray-600'}`}>CA</Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="bg-gradient-to-br from-mavic-pink-light via-white to-mavic-beige py-16 px-4 text-center">
        <p className="text-mavic-pink font-semibold text-xs uppercase tracking-widest mb-3">{t('tag')}</p>
        <h1 className="text-4xl md:text-5xl font-extrabold text-mavic-black mb-3">
          {t('title')}
        </h1>
        <p className="text-gray-500 max-w-md mx-auto text-sm">
          {t('subtitle')}
        </p>
        <div className="mt-6 w-16 h-1 bg-gradient-to-r from-mavic-pink to-mavic-gold rounded-full mx-auto" />
      </section>

      {/* ── PRICE LIST ── */}
      <main className="max-w-3xl mx-auto px-4 py-14">

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-mavic-pink border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        )}

        {!loading && Object.keys(byCategory).length === 0 && (
          <p className="text-center text-gray-400 py-20">{t('empty')}</p>
        )}

        <div className="space-y-10">
          {Object.entries(byCategory).map(([category, items]) => (
            <div key={category}>
              {/* Category header */}
              <div className="flex items-center gap-3 mb-5">
                <span className="text-2xl">{categoryIcon(category)}</span>
                <h2 className="text-lg font-extrabold text-mavic-black uppercase tracking-wide">
                  {category}
                </h2>
                <div className="flex-1 h-px bg-gradient-to-r from-mavic-gold/40 to-transparent" />
              </div>

              {/* Services */}
              <div className="divide-y divide-gray-100">
                {items.map((item) => {
                  const name = locale === 'ca' && item.name_ca ? item.name_ca : item.name_es;
                  const note = locale === 'ca' && item.price_note_ca ? item.price_note_ca : item.price_note_es;
                  return (
                    <div key={item.id} className="flex justify-between items-baseline py-3.5 gap-4">
                      <span className="text-gray-800 text-sm font-medium">{name}</span>
                      <span className="flex items-baseline gap-1 shrink-0">
                        {note && (
                          <span className="text-gray-400 text-xs italic">{note}</span>
                        )}
                        <span className="text-mavic-pink font-bold text-base">{item.price}€</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        {!loading && Object.keys(byCategory).length > 0 && (
          <p className="text-center text-xs text-gray-400 mt-14 border-t border-gray-100 pt-8">
            {t('note')}
          </p>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-mavic-black text-white py-8 px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Image src="/mavic-logo.png" alt="Mavic" width={32} height={32} className="opacity-70" />
          <span className="text-sm text-gray-400">Mavic Beauty & Nails · Montcada i Reixac</span>
        </div>
        <Link href={`/${locale}`} className="text-mavic-pink text-xs hover:text-mavic-pink/70 transition">
          {locale === 'ca' ? '← Tornar a l\'inici' : '← Volver al inicio'}
        </Link>
      </footer>
    </div>
  );
}
