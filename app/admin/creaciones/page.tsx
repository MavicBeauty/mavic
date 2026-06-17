'use client';

import Image from 'next/image';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

const BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/nail-gallery`;

interface GalleryFile {
  name: string;
  created_at: string | null;
}

async function authHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {};
}

export default function AdminCreacionesPage() {
  const [files, setFiles] = useState<GalleryFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch('/api/gallery', { headers: await authHeader() });
    const { files } = await res.json() as { files: string[] };
    setFiles((files ?? []).map((name) => ({ name, created_at: null })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (!picked.length) return;
    setUploading(true);
    setUploadProgress(`Subiendo 0 / ${picked.length}...`);

    const form = new FormData();
    picked.forEach((f) => form.append('files', f));

    const res = await fetch('/api/gallery', { method: 'POST', headers: await authHeader(), body: form });
    const { results } = await res.json() as { results: { name: string; error?: string }[] };
    const ok = results.filter((r) => !r.error).length;
    const fail = results.filter((r) => r.error).length;
    setUploadProgress(`${ok} subidas${fail ? `, ${fail} fallidas` : ''}`);
    setTimeout(() => setUploadProgress(''), 3000);

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    await load();
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`¿Eliminar "${filename}"?`)) return;
    setDeleting(filename);
    await fetch(`/api/gallery/${encodeURIComponent(filename)}`, { method: 'DELETE', headers: await authHeader() });
    setFiles((prev) => prev.filter((f) => f.name !== filename));
    setDeleting(null);
  };

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Nuestras Creaciones</h1>
            <p className="text-white/80 mt-1">Gestionar galería de imágenes</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-10">

        {/* Upload area */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-lg font-bold text-mavic-black mb-4">Subir imágenes</h2>
          <div
            className="border-2 border-dashed border-mavic-beige-dark rounded-lg p-8 text-center cursor-pointer hover:border-mavic-pink transition"
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="text-4xl mb-2">🖼️</div>
            <p className="text-gray-600 text-sm font-medium">Haz clic para seleccionar imágenes</p>
            <p className="text-gray-400 text-xs mt-1">JPG, JPEG, PNG · Selección múltiple</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleUpload}
          />
          {(uploading || uploadProgress) && (
            <p className={`mt-3 text-sm font-medium ${uploading ? 'text-mavic-pink' : 'text-green-600'}`}>
              {uploading ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-mavic-pink border-t-transparent rounded-full animate-spin" />
                  Subiendo imágenes...
                </span>
              ) : uploadProgress}
            </p>
          )}
        </div>

        {/* Stats */}
        {!loading && (
          <p className="text-sm text-gray-500 mb-4">{files.length} imagen{files.length !== 1 ? 'es' : ''} en la galería</p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-20 justify-center">
            <span className="w-5 h-5 border-2 border-mavic-pink border-t-transparent rounded-full animate-spin" />
            Cargando galería...
          </div>
        ) : files.length === 0 ? (
          <p className="text-center text-gray-400 py-20">No hay imágenes. Sube la primera.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {files.map((f) => (
              <div key={f.name} className="group relative aspect-square rounded-lg overflow-hidden bg-white shadow-sm">
                <Image
                  src={`${BASE}/${f.name}`}
                  alt={f.name}
                  fill
                  className="object-cover cursor-pointer"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  unoptimized
                  onClick={() => setSelected(`${BASE}/${f.name}`)}
                />
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(f.name); }}
                  disabled={deleting === f.name}
                  className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-sm"
                  aria-label="Eliminar"
                >
                  {deleting === f.name ? (
                    <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                  ) : '×'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-3xl font-light leading-none"
            onClick={() => setSelected(null)}
            aria-label="Cerrar"
          >
            ×
          </button>
          <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <Image
              src={selected}
              alt="Preview"
              width={1200}
              height={1200}
              className="object-contain max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
              unoptimized
            />
          </div>
        </div>
      )}
    </div>
  );
}
