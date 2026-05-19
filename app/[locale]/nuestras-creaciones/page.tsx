'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const BASE = 'https://cjqmterrgrthhpxmaoxc.supabase.co/storage/v1/object/public/nail-gallery';

const ALL_IMAGES = [
  `${BASE}/u1.jpg`,`${BASE}/u2.jpg`,`${BASE}/u3.jpg`,`${BASE}/u4.jpeg`,`${BASE}/u5.jpeg`,
  `${BASE}/u6.jpeg`,`${BASE}/u7.jpeg`,`${BASE}/u8.jpeg`,`${BASE}/u9.jpg`,`${BASE}/u10.jpeg`,
  `${BASE}/u11.jpeg`,`${BASE}/u12.jpeg`,`${BASE}/u13.jpeg`,`${BASE}/u14.jpg`,`${BASE}/u15.jpeg`,
  `${BASE}/u16.jpg`,`${BASE}/u17.jpg`,`${BASE}/u18.jpeg`,`${BASE}/u19.jpg`,`${BASE}/u20.jpeg`,
  `${BASE}/u21.jpg`,`${BASE}/u22.jpeg`,`${BASE}/u23.jpeg`,`${BASE}/u24.jpg`,`${BASE}/u25.jpeg`,
  `${BASE}/u26.jpeg`,`${BASE}/u27.jpg`,`${BASE}/u28.jpg`,`${BASE}/u29.jpeg`,`${BASE}/u30.jpg`,
  `${BASE}/u31.jpeg`,`${BASE}/u32.jpg`,`${BASE}/u33.jpg`,`${BASE}/u34.jpg`,`${BASE}/u35.jpeg`,
  `${BASE}/u36.jpeg`,`${BASE}/u37.jpeg`,`${BASE}/u38.jpeg`,`${BASE}/u39.jpeg`,`${BASE}/u40.jpg`,
  `${BASE}/u41.jpg`,`${BASE}/u42.jpg`,`${BASE}/u43.jpg`,`${BASE}/u44.jpg`,`${BASE}/u45.jpeg`,
  `${BASE}/u46.jpg`,`${BASE}/u47.jpeg`,`${BASE}/u48.jpg`,`${BASE}/u49.jpeg`,`${BASE}/u50.jpeg`,
  `${BASE}/u51.jpg`,`${BASE}/u52.jpg`,`${BASE}/u53.jpeg`,`${BASE}/u54.jpeg`,`${BASE}/u55.jpeg`,
  `${BASE}/u56.jpg`,`${BASE}/u57.jpeg`,`${BASE}/u58.jpeg`,`${BASE}/u59.jpg`,`${BASE}/u60.jpeg`,
  `${BASE}/u61.jpg`,`${BASE}/u62.jpg`,`${BASE}/u63.jpg`,`${BASE}/u64.jpeg`,`${BASE}/u65.jpg`,
  `${BASE}/u66.jpeg`,`${BASE}/u67.jpg`,`${BASE}/u68.jpeg`,`${BASE}/u69.jpg`,`${BASE}/u70.jpg`,
  `${BASE}/u71.jpeg`,`${BASE}/u72.jpg`,`${BASE}/u73.jpg`,`${BASE}/u74.jpeg`,`${BASE}/u75.jpeg`,
  `${BASE}/u76.jpeg`,`${BASE}/u77.jpg`,`${BASE}/u78.jpeg`,`${BASE}/u79.jpeg`,`${BASE}/u80.jpeg`,
  `${BASE}/u81.jpg`,`${BASE}/u82.jpeg`,`${BASE}/u83.jpeg`,`${BASE}/u84.jpg`,`${BASE}/u85.jpg`,
  `${BASE}/u86.jpeg`,`${BASE}/u87.jpeg`,`${BASE}/u88.jpg`,`${BASE}/u89.jpg`,`${BASE}/u90.jpeg`,
  `${BASE}/u91.jpeg`,`${BASE}/u92.jpeg`,`${BASE}/u93.jpeg`,`${BASE}/u94.jpg`,`${BASE}/u95.jpeg`,
  `${BASE}/u97.jpeg`,`${BASE}/u98.jpeg`,`${BASE}/u99.jpg`,`${BASE}/u100.jpeg`,`${BASE}/u101.jpeg`,
  `${BASE}/u102.jpg`,`${BASE}/u103.jpg`,`${BASE}/u104.jpg`,`${BASE}/u105.jpg`,`${BASE}/u106.jpeg`,
  `${BASE}/u107.jpg`,`${BASE}/u108.jpg`,`${BASE}/u109.jpeg`,`${BASE}/u110.jpeg`,`${BASE}/u111.jpeg`,
  `${BASE}/u112.jpeg`,`${BASE}/u113.jpeg`,`${BASE}/u114.jpg`,`${BASE}/u115.jpeg`,`${BASE}/u116.jpeg`,
  `${BASE}/u117.jpeg`,`${BASE}/u118.jpg`,`${BASE}/u119.jpeg`,`${BASE}/u120.jpg`,`${BASE}/u121.jpg`,
  `${BASE}/u122.jpg`,`${BASE}/u123.jpg`,`${BASE}/u124.jpeg`,`${BASE}/u125.jpeg`,`${BASE}/u126.jpg`,
  `${BASE}/u127.jpg`,`${BASE}/u128.jpg`,`${BASE}/u129.jpeg`,`${BASE}/u130.jpeg`,`${BASE}/u131.jpeg`,
  `${BASE}/u132.jpg`,`${BASE}/u133.jpeg`,`${BASE}/u134.jpeg`,`${BASE}/u135.jpg`,`${BASE}/u136.jpg`,
  `${BASE}/u137.jpeg`,`${BASE}/u138.jpeg`,`${BASE}/u139.jpg`,`${BASE}/u140.jpg`,`${BASE}/u141.jpg`,
  `${BASE}/u142.jpeg`,`${BASE}/u143.jpeg`,`${BASE}/u144.jpeg`,`${BASE}/u145.jpg`,`${BASE}/u146.jpg`,
  `${BASE}/u147.jpeg`,`${BASE}/u148.jpeg`,`${BASE}/u149.jpg`,`${BASE}/u150.jpg`,`${BASE}/u151.jpeg`,
  `${BASE}/u152.jpeg`,`${BASE}/u153.jpeg`,`${BASE}/u154.jpeg`,`${BASE}/u155.jpg`,`${BASE}/u156.jpeg`,
  `${BASE}/u157.jpeg`,`${BASE}/u158.jpg`,`${BASE}/u159.jpg`,`${BASE}/u160.jpg`,`${BASE}/u161.jpeg`,
  `${BASE}/u162.jpg`,`${BASE}/u163.jpeg`,`${BASE}/u164.jpeg`,`${BASE}/u165.jpeg`,`${BASE}/u166.jpeg`,
  `${BASE}/u167.jpeg`,`${BASE}/u168.jpeg`,`${BASE}/u169.jpg`,`${BASE}/u170.jpg`,`${BASE}/u171.jpg`,
  `${BASE}/u172.jpg`,`${BASE}/u173.jpeg`,`${BASE}/u174.jpeg`,`${BASE}/u175.jpeg`,`${BASE}/u176.jpg`,
  `${BASE}/u177.jpeg`,`${BASE}/u178.jpg`,`${BASE}/u179.jpg`,`${BASE}/u180.jpg`,`${BASE}/u181.jpg`,
  `${BASE}/u182.jpeg`,`${BASE}/u183.jpg`,
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function NuestrasCreacionesPage() {
  const locale = useLocale();
  const t = useTranslations('creations');
  const [shown, setShown] = useState(() => shuffle(ALL_IMAGES).slice(0, 12));

  const handleMore = useCallback(() => {
    setShown(shuffle(ALL_IMAGES).slice(0, 12));
  }, []);

  return (
    <div className="min-h-screen bg-mavic-beige">
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

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="text-center mb-12">
          <span className="inline-block bg-mavic-pink text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
            {locale === 'ca' ? 'Galeria' : 'Galería'}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-mavic-black mb-4">
            {t('title')}
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
          {shown.map((src, i) => (
            <div key={`${src}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition hover:-translate-y-0.5 transform bg-white">
              <Image
                src={src}
                alt={`Creación ${i + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                unoptimized
              />
            </div>
          ))}
        </div>

        {/* Shuffle button */}
        <div className="text-center">
          <button
            onClick={handleMore}
            className="inline-flex items-center gap-2 bg-mavic-black hover:bg-gray-900 text-white font-bold py-3 px-8 rounded-full transition shadow-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {locale === 'ca' ? 'Mostrar més' : 'Mostrar más'}
          </button>
          <p className="text-gray-400 text-sm mt-3">{ALL_IMAGES.length} {locale === 'ca' ? 'creacions a la nostra galeria' : 'creaciones en nuestra galería'}</p>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="bg-mavic-black text-white py-6 px-4 mt-8 text-center">
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Mavic Beauty & Nails · Montcada i Reixac</p>
      </footer>
    </div>
  );
}
