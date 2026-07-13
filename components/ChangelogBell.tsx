'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CHANGELOG } from '@/lib/changelog';

const TAG_STYLES: Record<string, string> = {
  nuevo: 'bg-mavic-pink/15 text-mavic-pink',
  mejora: 'bg-mavic-gold/15 text-mavic-gold',
  arreglo: 'bg-gray-100 text-gray-600',
};
const TAG_LABELS: Record<string, string> = { nuevo: 'Nuevo', mejora: 'Mejora', arreglo: 'Arreglo' };

const TRANSITION_MS = 200;

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

export default function ChangelogBell() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const unseenCount = ready
    ? CHANGELOG.filter((entry) => !lastSeenAt || new Date(entry.date) > new Date(lastSeenAt)).length
    : 0;
  const hasUnseen = unseenCount > 0;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setReady(true); return; }
      const { data } = await supabase
        .from('profiles')
        .select('changelog_last_seen_at')
        .eq('id', session.user.id)
        .single();
      setLastSeenAt((data as { changelog_last_seen_at: string | null } | null)?.changelog_last_seen_at ?? null);
      setReady(true);
    });
  }, []);

  const markSeen = useCallback(() => {
    setLastSeenAt(new Date().toISOString()); // optimistic — clears the dot right away
    createClient().auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      fetch('/api/changelog/mark-seen', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      }).catch(() => {}); // best-effort; local state already reflects "seen"
    });
  }, []);

  const handleOpen = () => {
    setOpen(true);
    if (hasUnseen) markSeen();
  };

  const handleClose = useCallback(() => {
    setVisible(false);
    window.setTimeout(() => setOpen(false), TRANSITION_MS);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, handleClose]);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        aria-label={
          hasUnseen
            ? `Novedades del sistema (${unseenCount} ${unseenCount === 1 ? 'novedad sin leer' : 'novedades sin leer'})`
            : 'Novedades del sistema'
        }
        className="relative p-2.5 rounded-full bg-white text-mavic-pink shadow-md hover:shadow-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-mavic-pink"
      >
        <svg
          className={`w-6 h-6 origin-top ${hasUnseen ? 'motion-safe:animate-bell-shake' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {hasUnseen && (
          <span className="absolute -top-1 -right-1 flex">
            <span className="motion-safe:animate-ping motion-reduce:hidden absolute inline-flex h-full w-full rounded-full bg-mavic-gold opacity-75" />
            <span className="relative inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-mavic-gold ring-2 ring-white text-white text-[11px] font-bold leading-none">
              {unseenCount > 9 ? '9+' : unseenCount}
            </span>
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Novedades">
          <div
            onClick={handleClose}
            className={`absolute inset-0 bg-black/40 motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out ${
              visible ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div
            className={`relative bg-mavic-beige rounded-xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col motion-safe:transition motion-safe:duration-200 motion-safe:ease-out ${
              visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
            }`}
          >
            <div className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white px-6 py-5 flex items-start justify-between gap-4 flex-shrink-0 rounded-t-xl">
              <h2 className="text-lg font-bold">María, estas novedades son para ti.</h2>
              <button
                onClick={handleClose}
                aria-label="Cerrar"
                className="p-2.5 -mr-2 -mt-1 rounded-full hover:bg-white/15 transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
              {CHANGELOG.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-16">Todavía no hay novedades registradas.</p>
              ) : (
                CHANGELOG.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-xl shadow p-5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${TAG_STYLES[entry.tag]}`}>
                        {TAG_LABELS[entry.tag]}
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(entry.date)}</span>
                    </div>
                    <h3 className="text-base font-bold text-mavic-black mb-1.5">{entry.title}</h3>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">{entry.description}</p>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      <span className="font-semibold text-gray-700">Por qué: </span>{entry.why}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
