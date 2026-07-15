'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

interface PopupConfig {
  is_active: boolean;
  title: string;
  description: string;
  expires_at: string;
}

function renderDescription(text: string) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br />');
}

export default function OfertasPage() {
  const [config, setConfig] = useState<PopupConfig>({
    is_active: false,
    title: '',
    description: '',
    expires_at: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('popup_config')
      .select('*')
      .eq('id', 'main')
      .single()
      .then(({ data }: { data: PopupConfig | null }) => {
        if (data) setConfig(data);
        setLoading(false);
      });
  }, []);

  function wrapSelection(before: string, after: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = config.description.slice(start, end);
    const newText =
      config.description.slice(0, start) +
      before + (selected || 'texto') + after +
      config.description.slice(end);
    setConfig(c => ({ ...c, description: newText }));
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + (selected || 'texto').length);
    }, 0);
  }

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('popup_config').upsert({ id: 'main', ...config });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const isExpired = config.expires_at && new Date(config.expires_at) < new Date();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-mavic-beige">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Ventana Emergente</h1>
            <p className="text-white/80 mt-1">Configura el anuncio que aparece al entrar al sitio</p>
          </div>
          <Link href="/admin/dashboard" className="text-white hover:text-gray-100 font-semibold transition">
            ← Volver
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12 grid md:grid-cols-2 gap-8">

        {/* ── Config form ── */}
        <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
          <h2 className="text-lg font-bold text-mavic-black">Configuración</h2>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="font-semibold text-mavic-black text-sm">Estado</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {config.is_active
                  ? isExpired ? 'Activo pero expirado' : 'Visible en el sitio'
                  : 'No visible'}
              </p>
            </div>
            <button
              onClick={() => setConfig(c => ({ ...c, is_active: !c.is_active }))}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                config.is_active && !isExpired ? 'bg-mavic-pink' : 'bg-gray-300'
              }`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                config.is_active ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Título</label>
            <input
              type="text"
              value={config.title}
              onChange={e => setConfig(c => ({ ...c, title: e.target.value }))}
              placeholder="Ej: ¡Oferta especial esta semana!"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-sm"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
            <div className="flex gap-1.5 mb-1.5">
              <button
                type="button"
                onClick={() => wrapSelection('**', '**')}
                className="px-2.5 py-1 text-xs font-bold border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                N
              </button>
              <button
                type="button"
                onClick={() => wrapSelection('*', '*')}
                className="px-2.5 py-1 text-xs italic border border-gray-200 rounded-lg hover:bg-gray-100 transition">
                C
              </button>
              <span className="text-xs text-gray-400 self-center ml-1">**negrita** · *cursiva*</span>
            </div>
            <textarea
              ref={textareaRef}
              value={config.description}
              onChange={e => setConfig(c => ({ ...c, description: e.target.value }))}
              placeholder="Ej: Manicura + Pedicura por **solo 25€** hasta el domingo."
              rows={4}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-sm resize-none"
            />
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Fecha de expiración <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="date"
              value={config.expires_at}
              onChange={e => setConfig(c => ({ ...c, expires_at: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-sm"
            />
            {isExpired && (
              <p className="text-xs text-red-500 mt-1">⚠ Esta fecha ya ha pasado — el popup no se mostrará.</p>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-mavic-pink to-mavic-gold text-white font-bold py-3 rounded-xl hover:shadow-lg transition disabled:opacity-50">
            {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar cambios'}
          </button>
        </div>

        {/* ── Live preview ── */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-mavic-black">Vista previa</h2>
          <div className="bg-black/30 rounded-2xl p-4 flex items-center justify-center min-h-[420px] relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('/salon/local.jpeg')] bg-cover bg-center opacity-20" />

            {config.title || config.description ? (
              <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-mavic-pink to-mavic-gold w-3/4" />
                <div className="bg-gradient-to-r from-mavic-pink to-mavic-gold px-5 py-4 flex justify-between items-start">
                  <p className="text-white font-extrabold text-base leading-tight pr-4">
                    {config.title || 'Título del anuncio'}
                  </p>
                  <button className="text-white/70 hover:text-white text-xl leading-none mt-0.5">×</button>
                </div>
                <div className="px-5 py-4">
                  <p
                    className="text-gray-700 text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: renderDescription(config.description || 'Descripción...') }}
                  />
                </div>
                <div className="px-5 pb-5 flex justify-between items-center">
                  <span className="text-xs text-gray-400">Cierra en 10s</span>
                  <button className="bg-mavic-pink text-white text-sm font-bold px-5 py-2 rounded-full">
                    ¡Entendido!
                  </button>
                </div>
              </div>
            ) : (
              <p className="relative text-white/60 text-sm text-center">
                Rellena el título o descripción<br />para ver la vista previa
              </p>
            )}
          </div>
          <p className="text-xs text-gray-400 text-center">
            La barra superior se vacía en 10 segundos y el popup se cierra solo.
          </p>
        </div>

      </main>
    </div>
  );
}
