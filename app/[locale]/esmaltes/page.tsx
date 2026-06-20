'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { collections } from '@/lib/esmaltes-data';

/* ── Badge SVG icons ── */
function IconCE() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4C13 4 4 13 4 24s9 20 20 20 20-9 20-20S35 4 24 4z" />
      <path d="M30 18a8 8 0 1 0 0 12" />
      <path d="M18 18a8 8 0 1 0 0 12" />
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 36C12 36 14 18 36 12C36 12 34 30 12 36Z" />
      <path d="M12 36 L22 26" />
    </svg>
  );
}
function IconBunny() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="24" cy="30" rx="10" ry="9" />
      <path d="M17 21 C15 14 12 8 16 6 C20 4 20 14 20 18" />
      <path d="M31 21 C33 14 36 8 32 6 C28 4 28 14 28 18" />
      <circle cx="20" cy="31" r="1" fill="currentColor" />
      <circle cx="28" cy="31" r="1" fill="currentColor" />
    </svg>
  );
}
function IconDiamond() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 40 L6 20 L14 8 H34 L42 20 Z" />
      <path d="M6 20 H42" />
      <path d="M14 8 L18 20 L24 40" />
      <path d="M34 8 L30 20 L24 40" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4 L8 10 V24 C8 33 24 44 24 44 C24 44 40 33 40 24 V10 Z" />
      <path d="M17 24 L22 29 L32 19" />
    </svg>
  );
}
function IconNoTox() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 V18 L10 32 C8 35 10 42 16 42 H32 C38 42 40 35 38 32 L28 18 V6" />
      <path d="M16 6 H32" />
      <path d="M14 30 L34 30" />
      <path d="M10 38 L38 10" strokeWidth="2" stroke="currentColor" />
    </svg>
  );
}
function IconStar() {
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M24 4 L29 17 H44 L32 26 L37 40 L24 31 L11 40 L16 26 L4 17 H19 Z" />
    </svg>
  );
}

const TAG_STYLES: Record<string, string> = {
  tendencia: 'bg-mavic-pink text-white',
  nueva:     'bg-emerald-500 text-white',
  clasicos:  'bg-amber-500 text-white',
};

export default function EsmaltesPage() {
  const locale = useLocale();
  const t = useTranslations('esmaltes');

  const badges = [
    { label: t('badges.ce'),         Icon: IconCE },
    { label: t('badges.vegan'),      Icon: IconLeaf },
    { label: t('badges.crueltyfree'),Icon: IconBunny },
    { label: t('badges.duration'),   Icon: IconDiamond },
    { label: t('badges.safe'),       Icon: IconShield },
    { label: t('badges.tpof'),       Icon: IconNoTox },
    { label: t('badges.expert'),     Icon: IconStar },
  ];

  return (
    <div className="min-h-screen bg-mavic-beige flex flex-col">

      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <Link href={`/${locale}`} className="flex items-center gap-2 text-mavic-black hover:text-mavic-pink transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">{locale === 'ca' ? 'Inici' : 'Inicio'}</span>
          </Link>
          <Image src="/mavic-logo.png" alt="Mavic" width={40} height={40} />
        </div>
      </header>

      {/* Hero */}
      <section className="bg-mavic-black text-white py-16 px-4 text-center">
        <span className="inline-block border border-mavic-pink text-mavic-pink text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-5">
          {t('tag')}
        </span>
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{t('title')}</h1>
        <p className="text-gray-300 max-w-xl mx-auto text-sm leading-relaxed">{t('subtitle')}</p>
      </section>

      {/* Badges */}
      <section className="bg-white py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-4 md:grid-cols-7 gap-4">
            {badges.map(({ label, Icon }) => (
              <div key={label} className="flex flex-col items-center gap-2 text-center">
                <div className="text-mavic-pink">
                  <Icon />
                </div>
                <span className="text-xs font-semibold text-mavic-black leading-tight">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-gray-400 text-xs mt-8">{t('brands')}</p>
        </div>
      </section>

      {/* Collections */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 space-y-10">
        {collections.map((col) => (
          <div key={col.id} className="bg-white rounded-2xl p-8 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-2">
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${TAG_STYLES[col.tag]}`}>
                {t(col.tag)}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-mavic-black mb-2">{col.season}</h2>
            <p className="text-gray-500 text-sm mb-7 max-w-lg">
              {locale === 'ca' ? col.descCa : col.descEs}
            </p>

            {/* Color swatches */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-7">
              {col.colors.map((color) => (
                <div key={color.name} className="flex flex-col items-center gap-2">
                  <div
                    className="w-14 h-14 rounded-full shadow-md ring-2 ring-white ring-offset-2"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span className="text-xs text-center text-gray-600 font-medium leading-tight">{color.name}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href="https://mavicbeautynails.booksy.com/h"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-mavic-pink hover:bg-pink-600 text-white font-bold py-2.5 px-6 rounded-full transition text-sm shadow-sm"
            >
              📅 {t('bookCta')}
            </a>
          </div>
        ))}
      </main>

      <footer className="bg-mavic-black text-white py-6 px-4 text-center">
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Mavic Beauty & Nails · Montcada i Reixac</p>
      </footer>

    </div>
  );
}
