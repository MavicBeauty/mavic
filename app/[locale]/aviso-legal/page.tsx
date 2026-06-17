import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Aviso Legal | Mavic Beauty & Nails',
};

export default function AvisoLegal() {
  return (
    <div className="min-h-screen bg-mavic-beige py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/mavic-logo.png" alt="Mavic Beauty & Nails" width={56} height={56} className="mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl font-extrabold text-mavic-black">Aviso Legal</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">1. Datos identificativos del titular</h2>
            <p>En cumplimiento del artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa:</p>
            <ul className="mt-3 space-y-1 list-none">
              <li><span className="font-semibold">Razón social:</span> BOHREY PARTNERS SL</li>
              <li><span className="font-semibold">NIF:</span> B22599591</li>
              <li><span className="font-semibold">Nombre comercial:</span> Mavic Beauty &amp; Nails</li>
              <li><span className="font-semibold">Domicilio social:</span> Plaça de l'Església 11, 08110 Montcada i Reixac (Barcelona)</li>
              <li><span className="font-semibold">Correo electrónico:</span> mavicbeautyandnails@gmail.com</li>
              <li><span className="font-semibold">Teléfono / WhatsApp:</span> 643 59 19 84</li>
              <li><span className="font-semibold">Registro Mercantil de Barcelona:</span> Tomo 1000455510661, Folio 1, Hoja B-639721, Inscripción 1ª</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">2. Objeto y ámbito de aplicación</h2>
            <p>
              El presente Aviso Legal regula el acceso y uso del sitio web <strong>mavicnails.es</strong> (en adelante, «el Sitio»), titularidad de BOHREY PARTNERS SL, que presta servicios de estética y belleza bajo el nombre comercial Mavic Beauty &amp; Nails.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">3. Condiciones de acceso y uso</h2>
            <p>
              El acceso al Sitio es gratuito. El usuario se compromete a hacer un uso adecuado de los contenidos y servicios ofrecidos, absteniéndose de emplearlo para actividades ilícitas o que vulneren los derechos de terceros.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">4. Propiedad intelectual e industrial</h2>
            <p>
              Todos los contenidos del Sitio (textos, imágenes, logotipos, diseño gráfico) son propiedad de BOHREY PARTNERS SL o de terceros que han autorizado su uso. Queda prohibida su reproducción, distribución o comunicación pública sin autorización expresa.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">5. Exclusión de garantías y responsabilidad</h2>
            <p>
              BOHREY PARTNERS SL no garantiza la disponibilidad y continuidad ininterrumpida del Sitio. Asimismo, no se responsabiliza de los daños y perjuicios que pudieran derivarse de interferencias, interrupciones, fallos o desconexiones en el sistema.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">6. Legislación aplicable y jurisdicción</h2>
            <p>
              El presente Aviso Legal se rige por la normativa española vigente. Para la resolución de cualquier controversia derivada del acceso o uso del Sitio, las partes se someten a los Juzgados y Tribunales de Barcelona, con renuncia a cualquier otro fuero que pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">7. Política de privacidad y cookies</h2>
            <p>
              El tratamiento de datos personales se detalla en la{' '}
              <Link href="/es/privacidad" className="text-mavic-pink font-semibold hover:underline">Política de Privacidad</Link>
              {' '}y en la{' '}
              <Link href="/es/cookies" className="text-mavic-pink font-semibold hover:underline">Política de Cookies</Link>.
            </p>
          </section>

          <p className="text-xs text-gray-400 pt-4 border-t border-gray-100">
            Última actualización: junio 2026
          </p>
        </div>
      </div>
    </div>
  );
}
