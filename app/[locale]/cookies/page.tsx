import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Cookies | Mavic Beauty & Nails',
};

export default function Cookies() {
  return (
    <div className="min-h-screen bg-mavic-beige py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/mavic-logo.png" alt="Mavic Beauty & Nails" width={56} height={56} className="mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl font-extrabold text-mavic-black">Política de Cookies</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">1. ¿Qué son las cookies?</h2>
            <p>
              Las cookies son pequeños archivos de texto que los sitios web depositan en el dispositivo del usuario para recordar preferencias o mantener sesiones activas. El uso de cookies está regulado en España por la Ley 34/2002 (LSSI-CE) y el RGPD.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">2. Cookies que utiliza este sitio</h2>
            <p className="mb-3">
              Este sitio web utiliza <strong>únicamente cookies técnicas estrictamente necesarias</strong>. No se utilizan cookies de análisis, publicidad ni rastreo de terceros.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-mavic-beige">
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Nombre</th>
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Proveedor</th>
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Finalidad</th>
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Duración</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-200 font-mono">sb-*-auth-token</td>
                    <td className="p-2 border border-gray-200">Supabase</td>
                    <td className="p-2 border border-gray-200">Mantener la sesión de usuario autenticado en el panel de administración</td>
                    <td className="p-2 border border-gray-200">Sesión / 7 días</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-2 border border-gray-200 font-mono">sb-*-auth-token-code-verifier</td>
                    <td className="p-2 border border-gray-200">Supabase</td>
                    <td className="p-2 border border-gray-200">Seguridad en el flujo de autenticación (PKCE)</td>
                    <td className="p-2 border border-gray-200">Sesión</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Estas cookies son necesarias para el funcionamiento del sistema. No requieren consentimiento previo según el artículo 22.2 de la LSSI-CE.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">3. Cómo gestionar o desactivar las cookies</h2>
            <p>
              Puede configurar su navegador para bloquear o eliminar cookies. Tenga en cuenta que desactivar las cookies técnicas puede impedir el acceso al panel de administración. Instrucciones por navegador:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer" className="text-mavic-pink hover:underline">Google Chrome</a></li>
              <li><a href="https://support.mozilla.org/es/kb/habilitar-y-deshabilitar-cookies-sitios-web" target="_blank" rel="noopener noreferrer" className="text-mavic-pink hover:underline">Mozilla Firefox</a></li>
              <li><a href="https://support.apple.com/es-es/guide/safari/sfri11471/mac" target="_blank" rel="noopener noreferrer" className="text-mavic-pink hover:underline">Safari</a></li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">4. Actualización de esta política</h2>
            <p>
              BOHREY PARTNERS SL se reserva el derecho a modificar esta política para adaptarla a cambios normativos o técnicos. Se recomienda revisarla periódicamente.
            </p>
          </section>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Última actualización: junio 2026</p>
            <Link href="/es/privacidad" className="text-xs text-mavic-pink hover:underline">Política de Privacidad →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
