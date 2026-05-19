import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp, signatureDataUrl, existingClientId } = body;

    if (!signatureDataUrl) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }
    if (!existingClientId && (!nombre || !dni || !telefono || !fecha_nacimiento)) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Load the original PDF template from private Supabase bucket
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data: templateBlob, error: templateError } = await supabase.storage
      .from('pdf-templates')
      .download('CONSENTIMLASER_form.pdf');
    if (templateError || !templateBlob) {
      return NextResponse.json({ error: 'No se pudo cargar la plantilla del consentimiento' }, { status: 500 });
    }
    const pdfBytes = await templateBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];

    const fontSize = 10;
    const textColor = rgb(0, 0, 0);

    // Stamp text at positions from PDF stream analysis (y nudged up +4 from baseline)
    // Line y=749: "En [city], a [date]"
    page.drawText('Montcada i Reixac', { x: 68, y: 753, size: fontSize, font, color: textColor });
    const now = new Date();
    const dateStr = `${now.getDate()} de ${now.toLocaleString('es-ES', { month: 'long' })} de ${now.getFullYear()}`;
    page.drawText(dateStr, { x: 195, y: 753, size: fontSize, font, color: textColor });

    // Line y=727: "D/Dña: [name]"
    page.drawText(nombre, { x: 98, y: 731, size: fontSize, font, color: textColor });

    // Line y=705: "DNI: [dni]"
    page.drawText(dni, { x: 85, y: 709, size: fontSize, font, color: textColor });

    // Line y=683: "...en el centro [clinic]"
    page.drawText('Mavic Beauty & Nails', { x: 320, y: 687, size: fontSize, font, color: textColor });

    // Signature — just below "FIRMA DEL PACIENTE" label (y=63), right column
    const sigBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const sigBytes = Buffer.from(sigBase64, 'base64');
    const sigImage = await pdfDoc.embedPng(sigBytes);
    page.drawImage(sigImage, { x: 390, y: 10, width: 200, height: 50 });

    const docBuffer = await pdfDoc.save();

    // Use existing client or insert new one
    let clientId: string;
    if (existingClientId) {
      clientId = existingClientId;
    } else {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([{
          name: nombre.split(' ')[0],
          apellidos: nombre.split(' ').slice(1).join(' '),
          phone: telefono,
          dni,
          fecha_nacimiento,
          direccion: direccion || '',
          poblacion: poblacion || '',
          cp: cp || '',
          provincia: 'Barcelona',
        }])
        .select()
        .single();
      if (clientError) {
        return NextResponse.json({ error: clientError.message }, { status: 500 });
      }
      clientId = clientData.id;
    }

    // Upload DOCX to Supabase Storage
    const fileName = `consentimiento_${clientId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, docBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    const docPath = uploadError ? '' : fileName;

    // Insert consent form record
    const { error: consentError } = await supabase.from('consent_forms').insert([{
      client_id: clientId,
      form_data: { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp },
      doc_storage_path: docPath,
    }]);

    if (consentError) {
      return NextResponse.json({ error: 'consent_forms: ' + consentError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, clientId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
