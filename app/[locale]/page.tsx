'use client';

import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect } from 'react';
import LanguageSwitcher from '@/components/public/LanguageSwitcher';

export default function Home() {
  const t = useTranslations();
  const locale = useLocale();

  useEffect(() => {
    // Load Booksy widget script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://booksy.com/widget/code.js?id=${process.env.NEXT_PUBLIC_BOOKSY_ID}&country=${process.env.NEXT_PUBLIC_BOOKSY_COUNTRY}&lang=${locale}`;
    document.body.appendChild(script);
  }, [locale]);

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-sm z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-mavic-pink">MAVIC</div>
          <div className="flex items-center gap-8">
            <a href="#servicios" className="text-sm font-medium hover:text-mavic-pink transition">
              {t('nav.services')}
            </a>
            <a href="#precios" className="text-sm font-medium hover:text-mavic-pink transition">
              {t('nav.pricing')}
            </a>
            <a href="#tarjetas" className="text-sm font-medium hover:text-mavic-pink transition">
              {t('nav.giftCards')}
            </a>
            <a href="#contacto" className="text-sm font-medium hover:text-mavic-pink transition">
              {t('nav.contact')}
            </a>
            <LanguageSwitcher />
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 bg-gradient-to-b from-mavic-pink-light to-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="w-24 h-24 bg-mavic-pink rounded-full flex items-center justify-center">
              <span className="text-4xl font-bold text-white">M</span>
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-mavic-black mb-4">
            {t('hero.title')}
          </h1>
          <p className="text-xl text-mavic-gold font-semibold mb-4">
            {t('hero.subtitle')}
          </p>
          <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
            {t('hero.description')}
          </p>

          {/* Booksy Widget */}
          <div className="my-12 flex justify-center">
            <div id="booksy-widget" className="booksy" />
          </div>

          <a
            href={`https://booksy.com/es-es/97502`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg"
          >
            {t('hero.cta')}
          </a>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-2 text-mavic-black">
            {t('services.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12">
            {t('services.subtitle')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Placeholder service cards - will be filled from DB later */}
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Manicura</h3>
              <p className="text-gray-600">Desde €18</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Pedicura</h3>
              <p className="text-gray-600">Desde €25</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition">
              <h3 className="text-xl font-bold text-mavic-pink mb-2">Depilación Láser</h3>
              <p className="text-gray-600">Desde €50</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="precios" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-2 text-mavic-black">
            {t('pricing.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12">
            {t('pricing.subtitle')}
          </p>
          <p className="text-center text-gray-500">
            (Próximamente: lista de precios interactiva desde la base de datos)
          </p>
        </div>
      </section>

      {/* Promotions Section */}
      <section className="py-20 px-4 bg-mavic-pink-light">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-2 text-mavic-black">
            {t('promotions.title')}
          </h2>
          <p className="text-center text-gray-600 mb-12">
            {t('promotions.subtitle')}
          </p>
          <p className="text-center text-gray-500">
            (Próximamente: ofertas especiales desde la base de datos)
          </p>
        </div>
      </section>

      {/* Gift Cards Section */}
      <section id="tarjetas" className="py-20 px-4 bg-mavic-beige">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-2 text-mavic-black">
            {t('giftCards.title')}
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            {t('giftCards.subtitle')}
          </p>
          <Link
            href={`/${locale}/tarjetas-regalo`}
            className="inline-block bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-3 px-8 rounded-lg transition shadow-lg"
          >
            {t('giftCards.cta')}
          </Link>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contacto" className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-mavic-black">
            {t('contact.title')}
          </h2>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* Hours & Address */}
            <div className="bg-mavic-beige p-8 rounded-lg">
              <h3 className="font-bold text-mavic-black mb-4 text-lg">🕒 {t('contact.hours')}</h3>
              <p className="text-mavic-black mb-6 font-semibold">{t('contact.hoursDetail')}</p>

              <h3 className="font-bold text-mavic-black mb-4 text-lg">📍 {t('contact.address')}</h3>
              <p className="text-mavic-black">{t('contact.city')}</p>
            </div>

            {/* Quick Contact */}
            <div className="space-y-4">
              <a
                href={process.env.NEXT_PUBLIC_WHATSAPP_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-pink hover:bg-mavic-pink/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                💬 {t('contact.whatsapp')}
              </a>

              <a
                href={process.env.NEXT_PUBLIC_INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-gold hover:bg-mavic-gold/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                📸 {t('contact.instagram')}
              </a>

              <a
                href={process.env.NEXT_PUBLIC_BOOKSY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-mavic-black hover:bg-mavic-black/90 text-white p-4 rounded-lg text-center font-semibold transition"
              >
                📅 {t('contact.booksy')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-mavic-black text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-xl font-bold mb-3">MAVIC Beauty & Nails</h3>
              <p className="text-gray-300 text-sm">{t('footer.address')}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">📞 {t('contact.title')}</h4>
              <p className="text-mavic-pink font-semibold">{t('footer.phone')}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3">🕒 {t('contact.hours')}</h4>
              <p className="text-gray-300 text-sm">{t('footer.hours')}</p>
            </div>
          </div>
          <div className="text-center border-t border-gray-700 pt-8">
            <p className="text-gray-400 text-sm">{t('footer.rights')} © 2024 MAVIC Beauty & Nails</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
