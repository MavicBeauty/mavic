'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/nail-gallery`;

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
  const [allImages, setAllImages] = useState<string[]>([]);
  const [shown, setShown] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gallery')
      .then((r) => r.json())
      .then(({ files }: { files: string[] }) => {
        const urls = (files ?? []).map((name) => `${BASE}/${name}`);
        setAllImages(urls);
        setShown(shuffle(urls).slice(0, 12));
        setLoading(false);
      });
  }, []);

  const handleMore = useCallback(() => {
    setShown(shuffle(allImages).slice(0, 12));
  }, [allImages]);

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

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
            <div className="w-8 h-8 border-2 border-mavic-pink border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">{t('loading')}</p>
          </div>
        ) : allImages.length === 0 ? (
          <p className="text-center text-gray-400 py-20">{t('empty')}</p>
        ) : (
          <>
            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-10">
              {shown.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  onClick={() => setSelected(src)}
                  className="relative aspect-square rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition hover:-translate-y-0.5 transform bg-white focus:outline-none"
                >
                  <Image
                    src={src}
                    alt={`Creación ${i + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                    unoptimized
                  />
                </button>
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
              <p className="text-gray-400 text-sm mt-3">
                {allImages.length} {locale === 'ca' ? 'creacions a la nostra galeria' : 'creaciones en nuestra galería'}
              </p>
            </div>
          </>
        )}
      </main>

      {/* Footer strip */}
      <footer className="bg-mavic-black text-white py-6 px-4 mt-8 text-center">
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Mavic Beauty & Nails · Montcada i Reixac</p>
      </footer>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/60 hover:text-white text-4xl font-light leading-none"
            onClick={() => setSelected(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
          <div
            className="relative max-w-[92vw] max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={selected}
              alt="Creación"
              width={1200}
              height={1200}
              className="object-contain max-w-[92vw] max-h-[92vh] rounded-xl shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
