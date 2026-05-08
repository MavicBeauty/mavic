'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';

const ALL_IMAGES = [
  '/unas/u1.jpg','/unas/u2.jpg','/unas/u3.jpg','/unas/u4.jpeg','/unas/u5.jpeg',
  '/unas/u6.jpeg','/unas/u7.jpeg','/unas/u8.jpeg','/unas/u9.jpg','/unas/u10.jpeg',
  '/unas/u11.jpeg','/unas/u12.jpeg','/unas/u13.jpeg','/unas/u14.jpg','/unas/u15.jpeg',
  '/unas/u16.jpg','/unas/u17.jpg','/unas/u18.jpeg','/unas/u19.jpg','/unas/u20.jpeg',
  '/unas/u21.jpg','/unas/u22.jpeg','/unas/u23.jpeg','/unas/u24.jpg','/unas/u25.jpeg',
  '/unas/u26.jpeg','/unas/u27.jpg','/unas/u28.jpg','/unas/u29.jpeg','/unas/u30.jpg',
  '/unas/u31.jpeg','/unas/u32.jpg','/unas/u33.jpg','/unas/u34.jpg','/unas/u35.jpeg',
  '/unas/u36.jpeg','/unas/u37.jpeg','/unas/u38.jpeg','/unas/u39.jpeg','/unas/u40.jpg',
  '/unas/u41.jpg','/unas/u42.jpg','/unas/u43.jpg','/unas/u44.jpg','/unas/u45.jpeg',
  '/unas/u46.jpg','/unas/u47.jpeg','/unas/u48.jpg','/unas/u49.jpeg','/unas/u50.jpeg',
  '/unas/u51.jpg','/unas/u52.jpg','/unas/u53.jpeg','/unas/u54.jpeg','/unas/u55.jpeg',
  '/unas/u56.jpg','/unas/u57.jpeg','/unas/u58.jpeg','/unas/u59.jpg','/unas/u60.jpeg',
  '/unas/u61.jpg','/unas/u62.jpg','/unas/u63.jpg','/unas/u64.jpeg','/unas/u65.jpg',
  '/unas/u66.jpeg','/unas/u67.jpg','/unas/u68.jpeg','/unas/u69.jpg','/unas/u70.jpg',
  '/unas/u71.jpeg','/unas/u72.jpg','/unas/u73.jpg','/unas/u74.jpeg','/unas/u75.jpeg',
  '/unas/u76.jpeg','/unas/u77.jpg','/unas/u78.jpeg','/unas/u79.jpeg','/unas/u80.jpeg',
  '/unas/u81.jpg','/unas/u82.jpeg','/unas/u83.jpeg','/unas/u84.jpg','/unas/u85.jpg',
  '/unas/u86.jpeg','/unas/u87.jpeg','/unas/u88.jpg','/unas/u89.jpg','/unas/u90.jpeg',
  '/unas/u91.jpeg','/unas/u92.jpeg','/unas/u93.jpeg','/unas/u94.jpg','/unas/u95.jpeg',
  '/unas/u97.jpeg','/unas/u98.jpeg','/unas/u99.jpg','/unas/u100.jpeg','/unas/u101.jpeg',
  '/unas/u102.jpg','/unas/u103.jpg','/unas/u104.jpg','/unas/u105.jpg','/unas/u106.jpeg',
  '/unas/u107.jpg','/unas/u108.jpg','/unas/u109.jpeg','/unas/u110.jpeg','/unas/u111.jpeg',
  '/unas/u112.jpeg','/unas/u113.jpeg','/unas/u114.jpg','/unas/u115.jpeg','/unas/u116.jpeg',
  '/unas/u117.jpeg','/unas/u118.jpg','/unas/u119.jpeg','/unas/u120.jpg','/unas/u121.jpg',
  '/unas/u122.jpg','/unas/u123.jpg','/unas/u124.jpeg','/unas/u125.jpeg','/unas/u126.jpg',
  '/unas/u127.jpg','/unas/u128.jpg','/unas/u129.jpeg','/unas/u130.jpeg','/unas/u131.jpeg',
  '/unas/u132.jpg','/unas/u133.jpeg','/unas/u134.jpeg','/unas/u135.jpg','/unas/u136.jpg',
  '/unas/u137.jpeg','/unas/u138.jpeg','/unas/u139.jpg','/unas/u140.jpg','/unas/u141.jpg',
  '/unas/u142.jpeg','/unas/u143.jpeg','/unas/u144.jpeg','/unas/u145.jpg','/unas/u146.jpg',
  '/unas/u147.jpeg','/unas/u148.jpeg','/unas/u149.jpg','/unas/u150.jpg','/unas/u151.jpeg',
  '/unas/u152.jpeg','/unas/u153.jpeg','/unas/u154.jpeg','/unas/u155.jpg','/unas/u156.jpeg',
  '/unas/u157.jpeg','/unas/u158.jpg','/unas/u159.jpg','/unas/u160.jpg','/unas/u161.jpeg',
  '/unas/u162.jpg','/unas/u163.jpeg','/unas/u164.jpeg','/unas/u165.jpeg','/unas/u166.jpeg',
  '/unas/u167.jpeg','/unas/u168.jpeg','/unas/u169.jpg','/unas/u170.jpg','/unas/u171.jpg',
  '/unas/u172.jpg','/unas/u173.jpeg','/unas/u174.jpeg','/unas/u175.jpeg','/unas/u176.jpg',
  '/unas/u177.jpeg','/unas/u178.jpg','/unas/u179.jpg','/unas/u180.jpg','/unas/u181.jpg',
  '/unas/u182.jpeg','/unas/u183.jpg',
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
            <span className="text-sm font-medium">Inicio</span>
          </Link>
          <Image src="/mavic-logo.png" alt="Mavic" width={40} height={40} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Intro */}
        <div className="text-center mb-12">
          <span className="inline-block bg-mavic-pink text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
            Galería
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-mavic-black mb-4">
            Nuestras Creaciones
          </h1>
          <p className="text-gray-600 text-lg max-w-xl mx-auto">
            Cada uña, una obra de arte. Aquí encontrarás una muestra de lo que hacemos con
            pasión cada día en Mavic Beauty & Nails — diseños únicos hechos para ti.
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
            Mostrar más
          </button>
          <p className="text-gray-400 text-sm mt-3">{ALL_IMAGES.length} creaciones en nuestra galería</p>
        </div>
      </main>

      {/* Footer strip */}
      <footer className="bg-mavic-black text-white py-6 px-4 mt-8 text-center">
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Mavic Beauty & Nails · Montcada i Reixac</p>
      </footer>
    </div>
  );
}
