'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const SESSION_KEY = 'mavic_popup_dismissed';
const DURATION = 10;

function renderDescription(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

export default function PromoPopup() {
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(DURATION);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const supabase = createClient();
    supabase
      .from('popup_config')
      .select('is_active, title, description, expires_at')
      .eq('id', 'main')
      .single()
      .then(({ data }: { data: { is_active: boolean; title: string; description: string; expires_at: string | null } | null }) => {
        if (!data?.is_active || !data.title) return;
        if (data.expires_at && new Date(data.expires_at) < new Date()) return;
        setTitle(data.title);
        setDescription(data.description || '');
        setVisible(true);
      });
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (countdown <= 0) { dismiss(); return; }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [visible, countdown]);

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1');
    setVisible(false);
  }

  if (!visible) return null;

  const progress = (countdown / DURATION) * 100;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(0,0,0,0.45)' }}>

      <div
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300"
        onClick={e => e.stopPropagation()}>

        {/* Countdown bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-mavic-pink to-mavic-gold transition-all duration-1000 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Header */}
        <div className="relative bg-gradient-to-r from-mavic-pink to-mavic-gold px-6 py-5">
          <div className="pr-8">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
              Mavic Beauty & Nails
            </p>
            <h2 className="text-white font-extrabold text-xl leading-tight">
              {title}
            </h2>
          </div>
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 text-white/60 hover:text-white transition text-2xl leading-none w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10">
            ×
          </button>
        </div>

        {/* Body */}
        {description && (
          <div className="px-6 py-5 border-b border-gray-100">
            <p
              className="text-gray-700 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: renderDescription(description) }}
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between bg-gray-50/50">
          <span className="text-xs text-gray-400 tabular-nums">
            Cierra en {countdown}s
          </span>
          <button
            onClick={dismiss}
            className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white text-sm font-bold px-6 py-2.5 rounded-full hover:shadow-lg hover:shadow-mavic-pink/30 transition hover:-translate-y-0.5 transform">
            ¡Entendido!
          </button>
        </div>
      </div>
    </div>
  );
}
