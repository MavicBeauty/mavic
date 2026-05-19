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
      .select('name, apellidos, phone, fecha_nacimiento, dni')
      .eq('id', client_id)
      .single();

    if (clientError || !client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Extract birth year only
    const birthYear = client.fecha_nacimiento
      ? String(new Date(client.fecha_nacimiento).getFullYear())
      : '';

    // Load PDF template
    const pdfPath = path.join(process.cwd(), 'public', 'forms', 'HISTORIALASER_form.pdf');
    const pdfBytes = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.getPages()[0];
    const fontSize = 10;
    const black = rgb(0, 0, 0);

    const fullName = `${client.name} ${client.apellidos || ''}`.trim();
    const sessionDate = new Date(session_date).toLocaleDateString('es-ES');

    // ── Header section ──
    // Row 1: NOMBRE Y APELLIDOS  |  (right) EDAD
    page.drawText(fullName,           { x: 175, y: 757, size: fontSize, font, color: black });
    // Row 2: DNI  |  AÑO NACIMIENTO  |  TELÉFONO
    if (client.dni)       page.drawText(client.dni,  { x: 65,  y: 737, size: fontSize, font, color: black });
    if (birthYear)        page.drawText(birthYear,   { x: 255, y: 737, size: fontSize, font, color: black });
    if (client.phone)     page.drawText(client.phone,{ x: 420, y: 737, size: fontSize, font, color: black });
    // Row 3: DIRECCIÓN  (no dirección field in current form data — skip)
    // Row 4: POBLACIÓN / C.POSTAL / PROVINCIA  (skip — not collected yet)

    // ── Treatment grid ──
    // The grid has columns: ZONAS | FOT | SES.1 … SES.9
    // Each session occupies its own SES column (width ≈ 33 pts each, starting x ≈ 245)
    const sesNum = Math.max(1, Math.min(9, parseInt(sesion_number as string) || 1));
    const colX = 248 + (sesNum - 1) * 33;   // x for this session's column
    const rowY_date  = 481;   // FECHA header row
    const rowY_fot   = 458;   // FOT row (first data row)
    const rowY_zonas = 458;   // ZONAS shares the first data row (left column)
    const rowY_power = 435;   // second data row for potencia

    page.drawText(sessionDate,        { x: colX, y: rowY_date,  size: 7,  font, color: black });
    if (zonas) page.drawText(zonas,   { x: 50,   y: rowY_zonas, size: 8,  font, color: black });
    if (fot)   page.drawText(fot,     { x: 200,  y: rowY_fot,   size: 8,  font, color: black });
    if (power) page.drawText(power,   { x: colX, y: rowY_power, size: 8,  font, color: black });

    // Adverse reactions — write active ones in the session column rows below the grid
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
        page.drawText(`Adv: ${active.join(', ')}`,
          { x: 50, y: 200, size: 7, font, color: rgb(0.8, 0, 0) });
      }
    }

    if (observations) {
      const words = observations.split(' ');
      let line = '';
      let y = 185;
      for (const word of words) {
        if ((line + word).length > 90) {
          page.drawText(line.trim(), { x: 50, y, size: 8, font, color: black });
          line = word + ' ';
          y -= 12;
          if (y < 60) break;
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
