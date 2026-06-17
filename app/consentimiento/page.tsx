'use client';

import Image from 'next/image';
import { useRef, useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function ConsentimientoForm() {
  const searchParams = useSearchParams();
  const existingClientId = searchParams.get('clientId');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    nombre: '',
    dni: '',
    telefono: '',
    fecha_nacimiento: '',
    direccion: '',
    poblacion: '',
    cp: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Prefill from existing client when launched from the admin panel
  useEffect(() => {
    if (!existingClientId) return;
    const supabase = createClient();
    supabase
      .from('clients')
      .select('name, apellidos, phone, dni, fecha_nacimiento, direccion, poblacion, cp')
      .eq('id', existingClientId)
      .single()
      .then(({ data }: { data: { name: string; apellidos: string; phone: string; dni: string; fecha_nacimiento: string; direccion: string; poblacion: string; cp: string } | null }) => {
        if (!data) return;
        setForm({
          nombre: [data.name, data.apellidos].filter(Boolean).join(' '),
          dni: data.dni || '',
          telefono: data.phone || '',
          fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.slice(0, 10) : '',
          direccion: data.direccion || '',
          poblacion: data.poblacion || '',
          cp: data.cp || '',
        });
      });
  }, [existingClientId]);

  // Canvas setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1A1A1A';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX,
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    e.preventDefault();
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  };

  const endDraw = () => setDrawing(false);

  const clearSig = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasSig) { setError('Por favor, añade tu firma.'); return; }
    setError('');
    setLoading(true);

    const canvas = canvasRef.current!;
    const signatureDataUrl = canvas.toDataURL('image/png');

    try {
      const res = await fetch('/api/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, signatureDataUrl, existingClientId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Error al guardar');
      }
      setSubmitted(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md w-full text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-extrabold text-mavic-black mb-3">¡Consentimiento guardado!</h2>
          <p className="text-gray-500">Tu consentimiento informado ha sido registrado correctamente. Puedes devolverle el dispositivo al personal.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige py-8 px-4">
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-8">
          <Image src="/mavic-logo.png" alt="Mavic" width={60} height={60} className="mx-auto mb-3" />
          <h1 className="text-2xl font-extrabold text-mavic-black">Consentimiento Informado</h1>
          <p className="text-mavic-pink font-semibold text-sm mt-1">Depilación Láser — Mavic Beauty & Nails</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Personal data */}
          <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
            <h2 className="text-base font-bold text-mavic-black uppercase tracking-wide">Datos personales</h2>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre completo *</label>
              <input type="text" name="nombre" value={form.nombre} onChange={handleChange}
                placeholder="Nombre y apellidos"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                required />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">DNI / NIE *</label>
                <input type="text" name="dni" value={form.dni} onChange={handleChange}
                  placeholder="12345678A"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                  required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono *</label>
                <input type="tel" name="telefono" value={form.telefono} onChange={handleChange}
                  placeholder="612 345 678"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                  required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de nacimiento *</label>
              <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base"
                required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
              <input type="text" name="direccion" value={form.direccion} onChange={handleChange}
                placeholder="Calle y número"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Población</label>
                <input type="text" name="poblacion" value={form.poblacion} onChange={handleChange}
                  placeholder="Ciudad"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">CP</label>
                <input type="text" name="cp" value={form.cp} onChange={handleChange}
                  placeholder="08000"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-mavic-pink text-base" />
              </div>
            </div>
          </div>

          {/* Consent text — scrollable, must read before signing */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-base font-bold text-mavic-black uppercase tracking-wide mb-3">Información y consentimiento</h2>
            <p className="text-xs text-mavic-pink font-semibold mb-2">Lee el documento completo antes de firmar</p>
            <div className="h-64 overflow-y-scroll border border-gray-200 rounded-xl p-4 text-sm text-gray-600 leading-relaxed space-y-3 bg-gray-50">
              <p>Declaro que se me ha informado de la naturaleza del procedimiento de la depilación láser. El sistema de la depilación láser posibilita la destrucción de un número de folículos del pelo, siempre existe otra fracción de ellos que está en reposo (en el momento del procedimiento), y por lo tanto no desaparecen. De este modo nunca se elimina la totalidad del pelo.</p>
              <p>El número de sesiones recomendado para la eliminación de la mayor parte del pelo, se sitúa entre 8 y 10, pudiendo ser mayor en algunas ocasiones. La depilación facial puede ser especialmente resistente por el hecho que el hirsutismo que afecta a esta región, hace surgir el pelo nuevo a mayor velocidad que el láser es capaz de eliminarlo. Esta patología debe ser comunicada, ya que en estos casos se requieren más sesiones a las requeridas en circunstancias normales.</p>
              <p className="font-semibold text-mavic-black">EFECTOS SECUNDARIOS</p>
              <p>Enrojecimiento de la zona después de la sesión, hipopigmentación, hiperpigmentación, o raramente la aparición de pequeñas ampollas o vesículas en la zona tratada.</p>
              <p>En ciertas ocasiones, especialmente cuando la piel está menos blanca o ligeramente bronceada, pueden surgir costras de color granate en las zonas tratadas. Estas costras se desprenden posteriormente dejando la piel tratada algo menos pigmentada que el resto. Esta región recupera su color normal con la exposición solar, sin dejar secuela alguna.</p>
              <p>Se me ha explicado los cuidados que debo seguir para evitar estos efectos secundarios, como evitar el uso del maquillaje sobre la cara ó sustancias inflamables que pudieran reaccionar con la luz del láser como ocurre con el alcohol o la acetona.</p>
              <p className="font-semibold text-mavic-black">CONTRAINDICACIONES</p>
              <p>Embarazo, padecimiento de trastornos inmunosupresores donde se evidencie una inmunodepresión real, infecciones activas de la piel (Herpes Zoster o simple, varicela, Impétigo contagioso), trastornos que supongan un deterioro importante del estado de salud, personas que en los últimos 6 meses se hayan sometido a un tratamiento oral de ROACUTÁN®, TIGASÓN®, NEOTIGASÓN® (isotrerinoina oral) y en personas que en los últimos 6 meses se hayan sometido la zona a depilar a tratamiento con láser CO2, Erbio Yag o dermoabrasión, depilación cercana al ojo que pueda permitir la entrada de láser en el globo ocular y su impacto en estructuras pigmentadas como el iris y la retina, estar tomando ANTIBIÓTICOS.</p>
              <p className="font-semibold text-mavic-black">DECLARO NO PRESENTAR NI PADECER NINGUNA DE LAS CONTRAINDICACIONES ARRIBA MENCIONADAS.</p>
            </div>
          </div>

          {/* Signature */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-base font-bold text-mavic-black uppercase tracking-wide">Firma del paciente *</h2>
              <button type="button" onClick={clearSig}
                className="text-xs text-gray-400 hover:text-mavic-pink font-semibold transition">
                Borrar firma
              </button>
            </div>
            <div className={`border-2 rounded-xl overflow-hidden ${hasSig ? 'border-mavic-pink' : 'border-dashed border-gray-300'}`}>
              <canvas
                ref={canvasRef}
                width={560}
                height={180}
                className="w-full touch-none bg-gray-50 cursor-crosshair"
                onMouseDown={startDraw}
                onMouseMove={draw}
                onMouseUp={endDraw}
                onMouseLeave={endDraw}
                onTouchStart={startDraw}
                onTouchMove={draw}
                onTouchEnd={endDraw}
              />
            </div>
            {!hasSig && (
              <p className="text-xs text-gray-400 mt-2 text-center">Dibuja tu firma con el dedo o el ratón</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !form.nombre || !form.dni || !form.telefono || !form.fecha_nacimiento || !hasSig}
            className="w-full bg-mavic-pink hover:bg-mavic-pink/90 text-white font-bold py-4 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed text-lg shadow-lg">
            {loading ? 'Guardando...' : 'Firmar y enviar consentimiento'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6 pb-4">
          Mavic Beauty & Nails · Plaça de l&apos;Església, 11 · 08110 Montcada i Reixac
        </p>
      </div>
    </div>
  );
}

export default function ConsentimientoPage() {
  return (
    <Suspense>
      <ConsentimientoForm />
    </Suspense>
  );
}
