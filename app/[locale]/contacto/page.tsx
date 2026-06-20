'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';

export default function ContactoPage() {
  const locale = useLocale();
  const tContact = useTranslations('contact');
  const tFooter = useTranslations('footer');

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

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-12">

        {/* Hero */}
        <div className="text-center mb-10">
          <span className="inline-block bg-mavic-pink text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest mb-4">
            {tContact('findUs')}
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-mavic-black">
            {locale === 'ca' ? 'Contacte' : 'Contacto'}
          </h1>
          <p className="text-gray-500 mt-3 text-sm">
            {locale === 'ca'
              ? 'Escriu-nos, truca\'ns o vine a visitar-nos.'
              : 'Escríbenos, llámanos o ven a visitarnos.'}
          </p>
        </div>

        {/* Action buttons — 2×2 grid, prominent */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <a href="https://wa.me/34643591984" target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white p-6 rounded-2xl font-semibold transition shadow-sm text-center">
            <Image src="/icons/whatsapp.png" alt="WhatsApp" width={36} height={36} className="shrink-0" />
            <span className="text-sm">{tContact('whatsappBtn')}</span>
          </a>
          <a href="https://www.instagram.com/mavicnailscenter/" target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-pink-500 text-white p-6 rounded-2xl font-semibold transition shadow-sm text-center">
            <Image src="/icons/instagram.png" alt="Instagram" width={36} height={36} className="shrink-0" />
            <span className="text-sm">{tContact('instagram')}</span>
          </a>
          <a href="https://mavicbeautynails.booksy.com/h" target="_blank" rel="noopener noreferrer"
            className="flex flex-col items-center justify-center gap-2 bg-mavic-black hover:bg-gray-900 text-white p-6 rounded-2xl font-semibold transition shadow-sm text-center">
            <span className="text-3xl leading-none">📅</span>
            <span className="text-sm">{tContact('booksyBtn')}</span>
          </a>
          <a href="mailto:mavicbeautyandnails@gmail.com"
            className="flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50 text-mavic-black border border-gray-200 p-6 rounded-2xl font-semibold transition shadow-sm text-center">
            <span className="text-3xl leading-none">✉️</span>
            <span className="text-sm">{tContact('emailVal')}</span>
          </a>
        </div>

        {/* Info strip — 3 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">

          {/* Hours */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-3">{tContact('hours')}</p>
            <div className="space-y-2">
              <div className="pb-2 border-b border-gray-100">
                <p className="text-sm font-semibold text-mavic-black">{tContact('weekdaysLabel')}</p>
                <p className="text-xs text-gray-500">{tContact('weekdaysMorning')}</p>
                <p className="text-xs text-gray-500">{tContact('weekdaysAfternoon')}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-mavic-black">{tContact('saturdaysLabel')}</p>
                <p className="text-xs text-gray-500">{tContact('saturdaysTimes')}</p>
              </div>
            </div>
          </div>

          {/* Address */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-3">{tContact('addressLabel')}</p>
            <a href="https://share.google/shRr8qAymIRJfmV5d" target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-2 text-mavic-black hover:text-mavic-pink transition group">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0 text-mavic-pink" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <div>
                <p className="text-sm font-medium">{tContact('address')}</p>
                <p className="text-xs text-gray-500">{tContact('city')}</p>
                <p className="text-xs text-mavic-pink mt-1 group-hover:underline">{tContact('mapsLink')}</p>
              </div>
            </a>
          </div>

          {/* Phone + Email */}
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">{tContact('phoneLbl')}</p>
              <a href="tel:+34643591984" className="text-mavic-black font-semibold hover:text-mavic-pink transition text-sm">
                643 59 19 84
              </a>
            </div>
            <div>
              <p className="text-xs font-bold text-mavic-pink uppercase tracking-widest mb-1">{tContact('emailLbl')}</p>
              <a href="mailto:mavicbeautyandnails@gmail.com" className="text-mavic-black font-medium hover:text-mavic-pink transition text-xs break-all">
                {tContact('emailVal')}
              </a>
            </div>
          </div>

        </div>

        {/* Trabaja con nosotros */}
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <h2 className="text-lg font-extrabold text-mavic-black mb-1">
            {tFooter('joinTeam')}
          </h2>
          <p className="text-gray-500 text-sm mb-3">
            {locale === 'ca'
              ? "Envia'ns el teu currículum i et contactarem quan tinguem una oportunitat."
              : 'Envíanos tu currículum y te contactaremos cuando tengamos una oportunidad.'}
          </p>
          <p className="text-mavic-pink text-sm font-medium mb-5">
            mavicbeautyandnails@gmail.com
          </p>
          <a href="mailto:mavicbeautyandnails@gmail.com?subject=Currículum - Mavic Beauty %26 Nails"
            className="inline-flex items-center gap-2 bg-mavic-pink hover:bg-pink-600 text-white font-bold py-3 px-8 rounded-full transition shadow-sm">
            <span>✉️</span>
            <span>{tFooter('joinTeamCta')}</span>
          </a>
        </div>

      </main>

      <footer className="bg-mavic-black text-white py-6 px-4 mt-8 text-center">
        <p className="text-gray-400 text-sm">© {new Date().getFullYear()} Mavic Beauty & Nails · Montcada i Reixac</p>
      </footer>

    </div>
  );
}
