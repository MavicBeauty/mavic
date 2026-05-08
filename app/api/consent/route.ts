import { NextRequest, NextResponse } from 'next/server';
import {
  Document, Packer, Paragraph, TextRun, ImageRun,
  Table, TableRow, TableCell, WidthType, BorderStyle,
  AlignmentType, HeadingLevel, ShadingType,
} from 'docx';
import { createClient } from '@supabase/supabase-js';

function fieldRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: 'F5EDD6' },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
        },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          left: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
          right: { style: BorderStyle.SINGLE, size: 1, color: 'E8D5B0' },
        },
        children: [new Paragraph({ children: [new TextRun({ text: value || '—', size: 20 })] })],
      }),
    ],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nombre, dni, telefono, fecha_nacimiento, direccion, poblacion, cp, signatureDataUrl } = body;

    if (!nombre || !dni || !telefono || !fecha_nacimiento || !signatureDataUrl) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const fechaDoc = new Date().toLocaleDateString('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const sigBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const sigBuffer = Buffer.from(sigBase64, 'base64');

    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          // Header
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [new TextRun({ text: 'MAVIC BEAUTY & NAILS', bold: true, size: 32, color: 'C9A84C' })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 60 },
            children: [new TextRun({ text: 'Plaça de l\'Església, 11 · 08110 Montcada i Reixac, Barcelona', size: 18, color: '666666' })],
          }),
          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 300 },
            children: [new TextRun({ text: 'CONSENTIMIENTO INFORMADO — DEPILACIÓN LÁSER', bold: true, size: 26, color: 'F8B4C8' })],
          }),

          // Client data table
          new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: 'DATOS DEL PACIENTE', bold: true, size: 22, color: '1A1A1A' })] }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              fieldRow('Nombre completo', nombre),
              fieldRow('DNI / NIE', dni),
              fieldRow('Teléfono', telefono),
              fieldRow('Fecha de nacimiento', fecha_nacimiento ? new Date(fecha_nacimiento).toLocaleDateString('es-ES') : ''),
              fieldRow('Dirección', [direccion, poblacion, cp].filter(Boolean).join(', ')),
              fieldRow('Centro', 'Mavic Beauty & Nails'),
            ],
          }),

          // Consent text
          new Paragraph({ spacing: { before: 400, after: 100 }, children: [new TextRun({ text: 'DECLARACIÓN DE CONSENTIMIENTO', bold: true, size: 22 })] }),
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({
              text: 'Yo, el/la abajo firmante, declaro haber sido informado/a sobre el tratamiento de depilación láser, sus posibles efectos secundarios y contraindicaciones. Confirmo que no padezco ninguna de las contraindicaciones indicadas y doy mi consentimiento para recibir el tratamiento en Mavic Beauty & Nails.',
              size: 20,
            })],
          }),
          new Paragraph({
            spacing: { after: 160 },
            children: [new TextRun({
              text: 'Mis datos personales serán tratados de conformidad con la LOPD y el RGPD únicamente para la gestión de mi historial de tratamientos.',
              size: 20,
            })],
          }),

          // Signature
          new Paragraph({ spacing: { before: 400, after: 100 }, children: [new TextRun({ text: 'FIRMA DEL PACIENTE', bold: true, size: 22 })] }),
          new Paragraph({
            children: [
              new ImageRun({
                data: sigBuffer,
                transformation: { width: 220, height: 70 },
                type: 'png',
              }),
            ],
          }),
          new Paragraph({ spacing: { before: 100 }, children: [new TextRun({ text: `Firmado digitalmente el ${fechaDoc}`, size: 18, color: '666666', italics: true })] }),
        ],
      }],
    });

    const docBuffer = await Packer.toBuffer(doc);

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
    const fileName = `consentimiento_${clientData.id}_${Date.now()}.docx`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, docBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
