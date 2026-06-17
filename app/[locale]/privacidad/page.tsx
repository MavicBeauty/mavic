import Image from 'next/image';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidad | Mavic Beauty & Nails',
};

export default function Privacidad() {
  return (
    <div className="min-h-screen bg-mavic-beige py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/">
            <Image src="/mavic-logo.png" alt="Mavic Beauty & Nails" width={56} height={56} className="mx-auto mb-3" />
          </Link>
          <h1 className="text-2xl font-extrabold text-mavic-black">Política de Privacidad</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-8 space-y-6 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">1. Responsable del tratamiento</h2>
            <ul className="space-y-1 list-none">
              <li><span className="font-semibold">Identidad:</span> BOHREY PARTNERS SL</li>
              <li><span className="font-semibold">NIF:</span> B22599591</li>
              <li><span className="font-semibold">Dirección:</span> Plaça de l'Església 11, 08110 Montcada i Reixac (Barcelona)</li>
              <li><span className="font-semibold">Contacto:</span> mavicbeautyandnails@gmail.com</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">2. Finalidades y base jurídica del tratamiento</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-mavic-beige">
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Finalidad</th>
                    <th className="text-left p-2 font-semibold text-mavic-black border border-gray-200">Base jurídica</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border border-gray-200">Gestión de citas y clientes</td>
                    <td className="p-2 border border-gray-200">Ejecución de contrato (Art. 6.1.b RGPD)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-2 border border-gray-200">Consentimiento informado para tratamientos de depilación láser (datos de salud)</td>
                    <td className="p-2 border border-gray-200">Consentimiento explícito del interesado (Art. 9.2.a RGPD)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200">Historial de tratamientos y reacciones (datos de salud)</td>
                    <td className="p-2 border border-gray-200">Consentimiento explícito + prestación de asistencia sanitaria y estética (Art. 9.2.a y 9.2.h RGPD)</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="p-2 border border-gray-200">Comunicaciones comerciales y promociones</td>
                    <td className="p-2 border border-gray-200">Consentimiento del interesado (Art. 6.1.a RGPD)</td>
                  </tr>
                  <tr>
                    <td className="p-2 border border-gray-200">Cumplimiento de obligaciones contables y fiscales</td>
                    <td className="p-2 border border-gray-200">Obligación legal (Art. 6.1.c RGPD)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">3. Categorías especiales de datos</h2>
            <p>
              En el marco de los servicios de depilación láser, BOHREY PARTNERS SL trata datos relativos a la salud del cliente (zona tratada, tipo de piel, reacciones, historial de sesiones). Estos datos constituyen una categoría especial según el artículo 9 del RGPD y son tratados exclusivamente con el consentimiento explícito del interesado, recabado mediante la firma del formulario de consentimiento informado previo a cada ciclo de tratamiento.
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">4. Plazo de conservación</h2>
            <p>
              Los datos se conservarán mientras dure la relación comercial y, una vez finalizada, durante los plazos legalmente exigibles (mínimo 5 años para obligaciones contables y fiscales; hasta 5 años para datos de salud vinculados a tratamientos estéticos según normativa sanitaria autonómica de Cataluña).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">5. Destinatarios</h2>
            <p>
              Los datos no se ceden a terceros salvo obligación legal. BOHREY PARTNERS SL utiliza los siguientes encargados de tratamiento:
            </p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Supabase Inc.</strong> (alojamiento de base de datos y autenticación) — con garantías adecuadas bajo RGPD.</li>
              <li><strong>Vercel Inc.</strong> (alojamiento web) — con garantías adecuadas bajo RGPD.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">6. Derechos del interesado</h2>
            <p>Puede ejercer en cualquier momento sus derechos de:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong>Acceso:</strong> conocer qué datos tratamos sobre usted.</li>
              <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
              <li><strong>Supresión:</strong> solicitar la eliminación de sus datos cuando ya no sean necesarios.</li>
              <li><strong>Oposición:</strong> oponerse al tratamiento en determinadas circunstancias.</li>
              <li><strong>Limitación:</strong> solicitar la restricción del tratamiento.</li>
              <li><strong>Portabilidad:</strong> recibir sus datos en formato estructurado.</li>
            </ul>
            <p className="mt-3">
              Puede ejercer estos derechos enviando un correo a <strong>mavicbeautyandnails@gmail.com</strong> con copia de su DNI/NIE. Asimismo, tiene derecho a presentar una reclamación ante la <strong>Agencia Española de Protección de Datos</strong> (<a href="https://www.aepd.es" target="_blank" rel="noopener noreferrer" className="text-mavic-pink hover:underline">aepd.es</a>).
            </p>
          </section>

          <section>
            <h2 className="font-bold text-mavic-black text-base mb-2">7. Seguridad</h2>
            <p>
              BOHREY PARTNERS SL ha adoptado las medidas técnicas y organizativas necesarias para garantizar la seguridad de los datos personales y evitar su alteración, pérdida, tratamiento o acceso no autorizado, conforme al RGPD y la LOPDGDD.
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
