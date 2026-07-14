'use client';

import { MONTHS } from '@/lib/registro-format';

// Navegador de mes compartido del módulo Registro (MAVIC-14): flechas ‹ › en
// vez de dos selects de Mes/Año — un toque en lugar de dos desplegables.
export default function MonthNav({
  month,
  year,
  onChange,
}: {
  month: number;
  year: number;
  onChange: (month: number, year: number) => void;
}) {
  const prev = () => (month === 1 ? onChange(12, year - 1) : onChange(month - 1, year));
  const next = () => (month === 12 ? onChange(1, year + 1) : onChange(month + 1, year));

  return (
    <div className="inline-flex items-center bg-white border border-gray-200 rounded-full p-1">
      <button
        onClick={prev}
        aria-label="Mes anterior"
        className="p-1.5 rounded-full text-gray-400 hover:text-mavic-black hover:bg-gray-100 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <span className="text-sm font-bold text-mavic-black px-2 min-w-[8.5rem] text-center">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        aria-label="Mes siguiente"
        className="p-1.5 rounded-full text-gray-400 hover:text-mavic-black hover:bg-gray-100 transition"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </button>
    </div>
  );
}
