import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, session_date, zonas, fot, sesion_number, power, observations, adverse_reactions } = body;

    if (!client_id || !session_date || !zonas) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Fetch client data for the PDF header
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('name, apellidos, phone, fecha_nacimiento')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Calculate age
    let edad = '';
    if (client.fecha_nacimiento) {
      const birth = new Date(client.fecha_nacimiento);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
      edad = String(age);
    }

    // Load PDF template
    const pdfPath = path.join(process.cwd(), 'public', 'forms', 'HISTORIALASER_form.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];
    const fontSize = 10;
    const black = rgb(0, 0, 0);

    const fullName = `${client.name} ${client.apellidos || ''}`.trim();

    // Stamp header fields at known AcroForm Rect positions
    page.drawText(fullName,       { x: 132, y: 758, size: fontSize, font, color: black });
    page.drawText(edad,           { x: 452, y: 758, size: fontSize, font, color: black });
    page.drawText(client.phone,   { x: 132, y: 738, size: fontSize, font, color: black });

    // Stamp session data below the header (table area, estimated positions)
    const sessionDate = new Date(session_date).toLocaleDateString('es-ES');
    page.drawText(`Sesión ${sesion_number || '—'}  |  Fecha: ${sessionDate}  |  Zonas: ${zonas}`,
      { x: 50, y: 678, size: 9, font, color: black });
    if (fot) {
      page.drawText(`FOT: ${fot}`, { x: 50, y: 664, size: 9, font, color: black });
    }
    if (power) {
      page.drawText(`Potencia: ${power} J`, { x: fot ? 140 : 50, y: 664, size: 9, font, color: black });
    }

    // Adverse reactions
    if (adverse_reactions) {
      const labels: Record<string, string> = {
        sun_exposure: 'Sol/UVA',
        wax: 'Cera/Pinzas',
        accutane: 'Roacután',
        herpes: 'Herpes',
        bronzers: 'Bronceadores',
        bleaching: 'Decoloración',
        cosmetics: 'Ac.Glicólico',
        chloasma: 'Cloasma',
      };
      const active = Object.entries(adverse_reactions)
        .filter(([, v]) => v)
        .map(([k]) => labels[k] || k);
      if (active.length > 0) {
        page.drawText(`Advertencias: ${active.join(', ')}`,
          { x: 50, y: 650, size: 8, font, color: rgb(0.8, 0, 0) });
      }
    }

    if (observations) {
      // Wrap long observations text
      const words = observations.split(' ');
      let line = '';
      let y = 636;
      for (const word of words) {
        if ((line + word).length > 80) {
          page.drawText(line.trim(), { x: 50, y, size: 8, font, color: black });
          line = word + ' ';
          y -= 12;
          if (y < 130) break;
        } else {
          line += word + ' ';
        }
      }
      if (line.trim()) page.drawText(line.trim(), { x: 50, y, size: 8, font, color: black });
    }

    const docBuffer = await pdfDoc.save();

    // Upload to Supabase Storage
    const fileName = `historial_${client_id}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('client-documents')
      .upload(fileName, docBuffer, { contentType: 'application/pdf', upsert: false });

    const docPath = uploadError ? '' : fileName;

    // Insert clinical session record
    const { data: sessionData, error: sessionError } = await supabase
      .from('clinical_sessions')
      .insert([{
        client_id,
        session_date,
        doc_storage_path: docPath,
        form_data: { zonas, fot, sesion_number, power, observations, adverse_reactions },
      }])
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, sessionId: sessionData.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
