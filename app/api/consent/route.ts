import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
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

    // Load base PDF
    const pdfPath = path.join(process.cwd(), 'public', 'forms', 'CONSENTIMLASER_form.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Fill form fields
    const form = pdfDoc.getForm();
    form.getTextField('Nombre').setText(nombre);
    form.getTextField('DNI').setText(dni);
    form.getTextField('Centro').setText('Mavic Beauty & Nails');

    // Draw signature image at the FirmaPaciente field location
    try {
      const sigField = form.getField('FirmaPaciente');
      const widgets = sigField.acroField.getWidgets();
      if (widgets.length > 0) {
        const rect = widgets[0].getRectangle();
        const sigBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
        const sigBytes = Buffer.from(sigBase64, 'base64');
        const sigImage = await pdfDoc.embedPng(sigBytes);
        const pages = pdfDoc.getPages();
        // Find the page that contains this widget
        const page = pages[pages.length - 1]; // signature is typically on last page
        page.drawImage(sigImage, {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        });
      }
    } catch {
      // If signature field not found, skip — the rest of the form is still valid
    }

    form.flatten();

    const filledPdfBytes = await pdfDoc.save();

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

    // Upload PDF to Supabase Storage
    const fileName = `consentimiento_${clientData.id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, filledPdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });

    let docPath = '';
    if (!uploadError) {
      docPath = fileName;
    }

    // Insert consent form record
    await supabase.from('consent_forms').insert([{
      client_id: clientData.id,
      form_data: { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp },
      doc_storage_path: docPath,
    }]);

    return NextResponse.json({ success: true, clientId: clientData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
