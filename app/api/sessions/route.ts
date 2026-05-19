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

    // dd/mm/yy format
    const d = new Date(session_date);
    const sessionDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;

    // ── Header — positions measured from the actual PDF ──
    // NAME box:          x=117 y=691 w=122 h=17  → text at x=119, y=694
    // LAST NAME box:     x=315 y=690 w=210 h=18  → text at x=317, y=693
    // DNI box:           x=98  y=660 w=93  h=16  → text at x=100, y=663
    // AÑO NACIMIENTO box:x=284 y=662 w=50  h=12  → text at x=286, y=665
    // TELEFONO box:      x=401 y=661 w=117 h=15  → text at x=403, y=664
    page.drawText(client.name,              { x: 119, y: 694, size: fontSize, font, color: black });
    if (client.apellidos)
      page.drawText(client.apellidos,       { x: 317, y: 693, size: fontSize, font, color: black });
    if (client.dni)
      page.drawText(client.dni,             { x: 100, y: 663, size: fontSize, font, color: black });
    if (birthYear)
      page.drawText(birthYear,              { x: 286, y: 665, size: fontSize, font, color: black });
    if (client.phone)
      page.drawText(client.phone,           { x: 403, y: 664, size: fontSize, font, color: black });

    // ── Treatment grid — positions measured from the actual PDF ──
    // FECHA DE LA SESION: x=204 y=499 w=31 h=13  → SES.1 column; each col ≈31 pts wide
    // ZONA DE DEPILACION: x=81  y=452 w=80 h=20
    // FOT:                x=168 y=454 w=30 h=16
    // J (power):          x=205 y=453 w=30 h=16  → same column as FECHA (SES.1)
    const sesNum = Math.max(1, Math.min(9, parseInt(sesion_number as string) || 1));
    const colX = 206 + (sesNum - 1) * 31; // per-session column x

    page.drawText(sessionDate,              { x: colX, y: 502, size: 7, font, color: black });
    if (zonas) page.drawText(zonas,         { x: 83,   y: 455, size: 7, font, color: black });
    if (fot)   page.drawText(String(fot),   { x: 170,  y: 457, size: 7, font, color: black });
    if (power) page.drawText(String(power), { x: colX, y: 456, size: 7, font, color: black });

    // ── Adverse reactions — X marks on checkboxes (positions estimated, least priority) ──
    const reactionRowY: Record<string, number> = {
      sun_exposure: 430,
      wax:          410,
      accutane:     390,
      herpes:       370,
      bronzers:     350,
      bleaching:    330,
      cosmetics:    310,
      chloasma:     290,
    };
    if (adverse_reactions) {
      for (const [key, isActive] of Object.entries(adverse_reactions)) {
        if (isActive && reactionRowY[key] !== undefined) {
          page.drawText('X', { x: colX + 3, y: reactionRowY[key], size: 9, font, color: black });
        }
      }
    }

    // ── Observations — long blue line near bottom (user to confirm exact y) ──
    if (observations) {
      const words = observations.split(' ');
      let line = '';
      let obsY = 145;
      for (const word of words) {
        if ((line + word).length > 90) {
          page.drawText(line.trim(), { x: 50, y: obsY, size: 8, font, color: black });
          line = word + ' ';
          obsY -= 12;
          if (obsY < 60) break;
        } else {
          line += word + ' ';
        }
      }
      if (line.trim()) page.drawText(line.trim(), { x: 50, y: obsY, size: 8, font, color: black });
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
