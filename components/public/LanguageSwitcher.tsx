'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const switchLanguage = (newLocale: string) => {
    if (pathname.startsWith(`/${locale}/`)) {
      const pathWithoutLocale = pathname.slice(3); // Remove /es or /ca
      router.push(`/${newLocale}${pathWithoutLocale || '/'}`);
    } else {
      router.push(`/${newLocale}/`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1 text-sm font-medium text-mavic-black border border-mavic-gold rounded hover:bg-mavic-pink-light transition"
      >
        {locale.toUpperCase()}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-mavic-gold rounded shadow-lg z-50">
          <button
            onClick={() => switchLanguage('es')}
            className={`block w-full text-left px-4 py-2 text-sm ${
              locale === 'es' ? 'bg-mavic-pink-light font-bold' : 'hover:bg-gray-100'
            }`}
          >
            Español
          </button>
          <button
            onClick={() => switchLanguage('ca')}
            className={`block w-full text-left px-4 py-2 text-sm ${
              locale === 'ca' ? 'bg-mavic-pink-light font-bold' : 'hover:bg-gray-100'
            }`}
          >
            Català
          </button>
        </div>
      )}
    </div>
  );
}
