import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp, signatureDataUrl } = body;

    if (!nombre || !dni || !telefono || !fecha_nacimiento || !signatureDataUrl) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Load the original PDF template
    const pdfPath = path.join(process.cwd(), 'public', 'forms', 'CONSENTIMLASER_form.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];

    const fontSize = 11;
    const textColor = rgb(0, 0, 0);

    // Stamp text directly at the exact field coordinates (bypasses AcroForm entirely)
    // Field rects from PDF inspection: [x1, y1, x2, y2] — y is from bottom
    page.drawText(nombre, { x: 132, y: 758, size: fontSize, font, color: textColor });
    page.drawText(dni,    { x: 132, y: 738, size: fontSize, font, color: textColor });
    page.drawText('Mavic Beauty & Nails', { x: 282, y: 713, size: fontSize, font, color: textColor });

    // Embed signature image at the FirmaPaciente field position [440, 90, 560, 115]
    const sigBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const sigBytes = Buffer.from(sigBase64, 'base64');
    const sigImage = await pdfDoc.embedPng(sigBytes);
    page.drawImage(sigImage, { x: 440, y: 90, width: 120, height: 25 });

    const docBuffer = await pdfDoc.save();

    // Save to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Insert client
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

    // Upload DOCX to Supabase Storage
    const fileName = `consentimiento_${clientData.id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, docBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    const docPath = uploadError ? '' : fileName;

    // Insert consent form record
    const { error: consentError } = await supabase.from('consent_forms').insert([{
      client_id: clientData.id,
      form_data: { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp },
      doc_storage_path: docPath,
    }]);

    if (consentError) {
      return NextResponse.json({ error: 'consent_forms: ' + consentError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, clientId: clientData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
