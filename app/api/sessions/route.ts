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

    // dd/mm/yy format
    const d = new Date(session_date);
    const sessionDate = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;

    // ── Header — positions from AcroForm field rects ──
    // Nombre field:  rect x=130→380  y=755→770  → draw at x=132, y=758
    // Edad field:    rect x=450→530  y=755→770  → draw at x=452, y=758  (birth year)
    // Telefono field:rect x=130→380  y=735→750  → draw at x=132, y=738
    // Correo field:  rect x=130→380  y=715→730  → draw at x=132, y=718  (reused for DNI)
    page.drawText(fullName,          { x: 132, y: 758, size: fontSize, font, color: black });
    if (birthYear)     page.drawText(birthYear,    { x: 452, y: 758, size: fontSize, font, color: black });
    if (client.phone)  page.drawText(client.phone, { x: 132, y: 738, size: fontSize, font, color: black });
    if (client.dni)    page.drawText(client.dni,   { x: 132, y: 718, size: fontSize, font, color: black });

    // ── Treatment grid ──
    // Columns: ZONAS (wide, left) | FOT | SES.1–SES.9 (each ≈33 pts wide, starting x≈248)
    const sesNum = Math.max(1, Math.min(9, parseInt(sesion_number as string) || 1));
    const colX = 248 + (sesNum - 1) * 33;

    page.drawText(sessionDate,                  { x: colX, y: 665, size: 7, font, color: black });
    if (zonas) page.drawText(zonas,             { x: 50,   y: 648, size: 8, font, color: black });
    if (fot)   page.drawText(String(fot),       { x: 205,  y: 648, size: 8, font, color: black });
    if (power) page.drawText(String(power),     { x: colX, y: 648, size: 8, font, color: black });

    // ── Adverse reactions — X marks on the form's pre-drawn checkboxes ──
    // Each reaction has its own row; the X goes in the current session's column.
    // Y positions are estimates — adjust per form feedback.
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

    // ── Observations — long blue line just above the signature (FirmaPaciente y=90–115) ──
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
