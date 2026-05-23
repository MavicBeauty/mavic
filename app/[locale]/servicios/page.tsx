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

interface StaticItem {
  name: string;
  price: string;
  note?: string;
}

interface StaticCategory {
  category: string;
  icon: string;
  items: StaticItem[];
}

const LAST_UPDATED = '23/05/2026';

const STATIC_CATALOGUE: StaticCategory[] = [
  {
    category: 'Manicura',
    icon: '💅',
    items: [
      { name: 'Baño Mágico + Manicura Completa', price: '25.90€' },
      { name: 'Kapping Acrílico o Polygel', price: '30€' },
      { name: 'Manicura Completa Semipermanente', price: '21.90€' },
      { name: 'Manicura Completa Semipermanente Francesa', price: '23.90€' },
      { name: 'Manicura Completa Sin Esmalte', price: '15€' },
      { name: 'Manicura Completa Tradicional', price: '19.90€' },
      { name: 'Manicura Express Tradicional', price: '14€' },
      { name: 'Manicura Semipermanente Express', price: '14€' },
      { name: 'Parafina Manos en Caliente', price: '5€' },
      { name: 'Relleno Acrílicas', price: 'desde 30€' },
      { name: 'Relleno Soft Gel (máx. 3 semanas)', price: '30€' },
      { name: 'Reparar Uña Acrílico', price: '3€' },
      { name: 'Retirar Acrílico / Soft Gel Manos', price: '20€' },
      { name: 'Retiro con Acetona', price: '5€' },
      { name: 'Uñas Acrílicas', price: 'desde 40€' },
      { name: 'Uñas Soft Gel', price: '35€' },
    ],
  },
  {
    category: 'Pedicura',
    icon: '🦶',
    items: [
      { name: 'Pedicura Completa Semipermanente', price: '35€' },
      { name: 'Pedicura Completa Sin Esmalte', price: '25€' },
      { name: 'Pedicura Completa Tradicional', price: '30€' },
      { name: 'Pedicura Semipermanente Express', price: '19.90€' },
      { name: 'Pedispa Completa Semipermanente', price: '40€' },
      { name: 'Reparar Uña Pie con Acrílico', price: '4€' },
    ],
  },
  {
    category: 'Depilación con Hilo',
    icon: '🧵',
    items: [
      { name: 'Depilación cejas con hilo', price: '13€' },
      { name: 'Depilación labio superior con hilo', price: '8€' },
      { name: 'Cejas + labio superior con hilo', price: '19€' },
      { name: 'Depilación patillas', price: '12€' },
      { name: 'Depilación cara completa con hilo', price: '30€' },
      { name: 'Henna diseño cejas + depilación', price: '25€' },
    ],
  },
  {
    category: 'Depilación Láser',
    icon: '✨',
    items: [
      { name: 'Mujeres — Pack o zonas sueltas', price: 'Consultar', note: 'Precio variable según zonas' },
      { name: 'Hombres — Pack o zonas sueltas', price: 'Consultar', note: 'Precio variable según zonas' },
    ],
  },
  {
    category: 'Pestañas & Cejas',
    icon: '👁️',
    items: [
      { name: 'Lifting de pestañas', price: '40€' },
      { name: 'Lifting + Tinte', price: '45€' },
      { name: 'Pestañas Pelo a Pelo', price: '55€' },
      { name: 'Extensiones 2D', price: '65€' },
      { name: 'Extensiones 3D', price: '70€' },
      { name: 'Extensiones 4D', price: '75€' },
      { name: 'Extensiones 5D / Volumen Ruso', price: '90€' },
      { name: 'Retirar Extensiones', price: '15€' },
      { name: 'Laminado de cejas', price: '40€' },
    ],
  },
  {
    category: 'Tratamientos Faciales',
    icon: '🌸',
    items: [
      { name: 'Limpieza Facial Profunda', price: '60€' },
      { name: 'Peeling', price: '55€' },
      { name: 'Dermapen', price: '55€' },
      { name: 'BB Glow', price: '55€' },
    ],
  },
  {
    category: 'Micropigmentación',
    icon: '🖊️',
    items: [
      { name: 'Micropigmentación Cejas', price: '200€' },
      { name: 'Micropigmentación Labios', price: '210€' },
      { name: 'Micropigmentación Ojos (eyeliner)', price: '180€' },
      { name: 'Micropigmentación Línea Inferior', price: '120€' },
    ],
  },
  {
    category: 'Suplementos & Extras',
    icon: '✦',
    items: [
      { name: 'Baby Boomer', price: '5€' },
      { name: 'Baño Mágico', price: '5€' },
      { name: 'Decoración en Manos', price: 'Variable', note: 'Según diseño y complejidad' },
      { name: 'Diseño 3D', price: '10€' },
      { name: 'Efecto Aurora / Espejo', price: '5€' },
      { name: 'Efecto Mate', price: '5€' },
      { name: 'Efecto Ojo de Gato', price: '5€' },
      { name: 'Francesas de Color', price: '4€' },
    ],
  },
];

const CATEGORY_ICONS: Record<string, string> = {
  MANICURA: '💅',
  PEDICURA: '🦶',
  'DEPILACIÓN LÁSER': '✨',
  'DEPILACION LASER': '✨',
  PESTAÑAS: '👁️',
  MASAJES: '🤲',
  FACIALES: '🌸',
  'LIMPIEZAS FACIALES': '🌸',
};

function categoryIcon(cat: string) {
  const key = Object.keys(CATEGORY_ICONS).find(
    (k) => cat.toUpperCase().includes(k) || k.includes(cat.toUpperCase())
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

  const useStatic = !loading && Object.keys(byCategory).length === 0;

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

        {/* Pricing disclaimer */}
        <div className="mb-10 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 flex gap-3 items-start">
          <span className="text-amber-500 text-lg mt-0.5 shrink-0">⚠️</span>
          <div>
            <p className="text-amber-800 text-sm font-semibold leading-snug">
              {locale === 'ca'
                ? `Última actualització: ${LAST_UPDATED}`
                : `Última actualización: ${LAST_UPDATED}`}
            </p>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
              {locale === 'ca'
                ? 'Els preus que es mostren a continuació poden no reflectir les tarifes actuals del saló. Consulta\'ns per confirmar el preu final abans de la teva cita.'
                : 'Los precios mostrados a continuación pueden no reflejar las tarifas actuales del salón. Consúltanos para confirmar el precio final antes de tu cita.'}
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-mavic-pink border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        )}

        {/* ── DB-driven list (when Supabase has services) ── */}
        {!loading && !useStatic && (
          <div className="space-y-10">
            {Object.entries(byCategory).map(([category, items]) => (
              <div key={category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{categoryIcon(category)}</span>
                  <h2 className="text-lg font-extrabold text-mavic-black uppercase tracking-wide">
                    {category}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-mavic-gold/40 to-transparent" />
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const name = locale === 'ca' && item.name_ca ? item.name_ca : item.name_es;
                    const note = locale === 'ca' && item.price_note_ca ? item.price_note_ca : item.price_note_es;
                    return (
                      <div key={item.id} className="flex justify-between items-baseline py-3.5 gap-4">
                        <span className="text-gray-800 text-sm font-medium">{name}</span>
                        <span className="flex items-baseline gap-1 shrink-0">
                          {note && <span className="text-gray-400 text-xs italic">{note}</span>}
                          <span className="text-mavic-pink font-bold text-base">{item.price}€</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Static catalogue (fallback when Supabase is empty) ── */}
        {useStatic && (
          <div className="space-y-10">
            {STATIC_CATALOGUE.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className="text-2xl">{cat.icon}</span>
                  <h2 className="text-lg font-extrabold text-mavic-black uppercase tracking-wide">
                    {cat.category}
                  </h2>
                  <div className="flex-1 h-px bg-gradient-to-r from-mavic-gold/40 to-transparent" />
                </div>
                <div className="divide-y divide-gray-100">
                  {cat.items.map((item) => (
                    <div key={item.name} className="flex justify-between items-baseline py-3.5 gap-4">
                      <div className="flex flex-col">
                        <span className="text-gray-800 text-sm font-medium">{item.name}</span>
                        {item.note && (
                          <span className="text-gray-400 text-xs italic mt-0.5">{item.note}</span>
                        )}
                      </div>
                      <span className={`font-bold text-base shrink-0 ${item.price === 'Consultar' || item.price === 'Variable' ? 'text-gray-500 text-sm' : 'text-mavic-pink'}`}>
                        {item.price}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom note */}
        {!loading && (
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
          {locale === 'ca' ? "← Tornar a l'inici" : '← Volver al inicio'}
        </Link>
      </footer>
    </div>
  );
}
