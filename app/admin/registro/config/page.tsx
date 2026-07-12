'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Producto {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  activo: boolean;
}

interface Empleada {
  id: string;
  name: string;
  comision_pct: number | null;
}

function fmtEuros(n: number) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function RegistroConfigPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [empleadas, setEmpleadas] = useState<Empleada[]>([]);
  const [msg, setMsg] = useState('');

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevaCategoria, setNuevaCategoria] = useState('Estética');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [addingProducto, setAddingProducto] = useState(false);

  const [precioEdits, setPrecioEdits] = useState<Record<string, string>>({});
  const [pctEdits, setPctEdits] = useState<Record<string, string>>({});

  const flash = (text: string) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 3000);
  };

  const load = useCallback(async () => {
    const [{ data: prods }, { data: profs }] = await Promise.all([
      supabase
        .from('registro_productos')
        .select('id, nombre, categoria, precio, activo')
        .order('categoria')
        .order('nombre'),
      supabase
        .from('profiles')
        .select('id, name, comision_pct')
        .eq('role', 'portal')
        .order('name'),
    ]);
    // numeric columns come back from PostgREST as strings — coerce before using.
    setProductos(
      ((prods as Array<Omit<Producto, 'precio'> & { precio: number | string }> | null) ?? [])
        .map(p => ({ ...p, precio: Number(p.precio) }))
    );
    setEmpleadas(
      ((profs as Array<Omit<Empleada, 'comision_pct'> & { comision_pct: number | string | null }> | null) ?? [])
        .map(e => ({ ...e, comision_pct: e.comision_pct === null ? null : Number(e.comision_pct) }))
    );
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleAddProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    const precio = parseFloat(nuevoPrecio);
    if (!nuevoNombre.trim() || !precio || precio <= 0) { flash('Error: nombre o precio inválido'); return; }
    setAddingProducto(true);
    const { error } = await supabase.from('registro_productos').insert({
      nombre: nuevoNombre.trim(),
      categoria: nuevaCategoria.trim() || 'General',
      precio,
    });
    setAddingProducto(false);
    if (error) { flash(`Error: ${error.message}`); return; }
    setNuevoNombre('');
    setNuevoPrecio('');
    flash('✓ Producto añadido');
    load();
  };

  const handleSavePrecio = async (id: string) => {
    const precio = parseFloat(precioEdits[id]);
    if (!precio || precio <= 0) { flash('Error: precio inválido'); return; }
    const { error } = await supabase.from('registro_productos').update({ precio }).eq('id', id);
    if (error) { flash(`Error: ${error.message}`); return; }
    setPrecioEdits(prev => { const next = { ...prev }; delete next[id]; return next; });
    flash('✓ Precio actualizado');
    load();
  };

  const handleToggleActivo = async (p: Producto) => {
    const { error } = await supabase.from('registro_productos').update({ activo: !p.activo }).eq('id', p.id);
    if (error) { flash(`Error: ${error.message}`); return; }
    load();
  };

  const handleSavePct = async (id: string) => {
    const raw = pctEdits[id].trim();
    const pct = raw === '' ? null : parseFloat(raw);
    if (pct !== null && (isNaN(pct) || pct < 0 || pct > 100)) { flash('Error: % inválido (0-100)'); return; }
    const { error } = await supabase.from('profiles').update({ comision_pct: pct }).eq('id', id);
    if (error) { flash(`Error: ${error.message}`); return; }
    setPctEdits(prev => { const next = { ...prev }; delete next[id]; return next; });
    flash('✓ Comisión actualizada');
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-mavic-beige flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mavic-beige">
      <header className="bg-gradient-to-r from-mavic-pink to-mavic-gold text-white shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Configuración del Registro</h1>
            <p className="text-white/80 text-sm">Productos, precios y comisiones</p>
          </div>
          <Link href="/admin/registro" className="text-white/80 hover:text-white text-sm font-semibold transition">
            ← Registro
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {msg && (
          <p className={`mb-4 text-sm font-semibold ${msg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {msg}
          </p>
        )}

        {/* Comisiones por empleada */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-mavic-gold">
          <h2 className="text-sm font-bold text-gray-700 mb-1 uppercase tracking-wide">Comisión por empleada</h2>
          <p className="text-xs text-gray-500 mb-4">
            % del precio que se queda la empleada en cada servicio vendido. Vacío = sin comisión por defecto.
            En cada venta se podrá ajustar manualmente si hay otro acuerdo puntual.
          </p>
          <div className="space-y-2">
            {empleadas.map(e => (
              <div key={e.id} className="flex items-center gap-3">
                <span className="w-40 text-sm font-semibold text-gray-700">{e.name}</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="100"
                    value={pctEdits[e.id] ?? (e.comision_pct === null ? '' : String(e.comision_pct))}
                    onChange={ev => setPctEdits(prev => ({ ...prev, [e.id]: ev.target.value }))}
                    placeholder="—"
                    className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                  />
                  <span className="text-sm text-gray-500">%</span>
                </div>
                {pctEdits[e.id] !== undefined && (
                  <button
                    onClick={() => handleSavePct(e.id)}
                    className="bg-mavic-pink text-white font-bold px-3 py-1.5 rounded-lg text-xs transition hover:bg-mavic-pink/90"
                  >
                    Guardar
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Nuevo producto */}
        <div className="bg-white rounded-lg shadow-lg p-5 mb-5 border-l-4 border-l-mavic-pink">
          <h2 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Nuevo producto</h2>
          <form onSubmit={handleAddProducto} className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-48">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
                required
                placeholder="Ej: Depilación cejas con hilo"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Categoría</label>
              <input
                type="text"
                value={nuevaCategoria}
                onChange={e => setNuevaCategoria(e.target.value)}
                className="w-32 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Precio €</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={nuevoPrecio}
                onChange={e => setNuevoPrecio(e.target.value)}
                required
                placeholder="0,00"
                className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-mavic-pink"
              />
            </div>
            <button
              type="submit"
              disabled={addingProducto}
              className="bg-mavic-pink text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50 transition hover:bg-mavic-pink/90"
            >
              {addingProducto ? 'Añadiendo...' : 'Añadir'}
            </button>
          </form>
        </div>

        {/* Lista de productos */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Producto</th>
                  <th className="px-3 py-3 text-left font-semibold text-gray-700">Categoría</th>
                  <th className="px-3 py-3 text-right font-semibold text-gray-700">Precio</th>
                  <th className="px-3 py-3 text-center font-semibold text-gray-700">Activo</th>
                </tr>
              </thead>
              <tbody>
                {productos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                      No hay productos todavía.
                    </td>
                  </tr>
                ) : productos.map(p => (
                  <tr key={p.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!p.activo ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-2 text-gray-700">{p.nombre}</td>
                    <td className="px-3 py-2 text-gray-500">{p.categoria}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={precioEdits[p.id] ?? String(p.precio)}
                          onChange={e => setPrecioEdits(prev => ({ ...prev, [p.id]: e.target.value }))}
                          className="w-20 px-2 py-1 border border-gray-200 rounded-lg text-sm text-right focus:outline-none focus:ring-2 focus:ring-mavic-pink"
                        />
                        <span className="text-gray-500">€</span>
                        {precioEdits[p.id] !== undefined && parseFloat(precioEdits[p.id]) !== p.precio && (
                          <button
                            onClick={() => handleSavePrecio(p.id)}
                            className="bg-mavic-pink text-white font-bold px-2.5 py-1 rounded-lg text-xs transition hover:bg-mavic-pink/90"
                          >
                            OK
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => handleToggleActivo(p)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                          p.activo
                            ? 'bg-green-50 text-green-700 border border-green-300'
                            : 'bg-gray-100 text-gray-400 border border-gray-200'
                        }`}
                      >
                        {p.activo ? 'Sí' : 'No'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-3">
          Precio de referencia: {productos.filter(p => p.activo).length} productos activos ·{' '}
          {fmtEuros(productos.filter(p => p.activo).reduce((s, p) => s + p.precio, 0))} € en catálogo
        </p>
      </main>
    </div>
  );
}
