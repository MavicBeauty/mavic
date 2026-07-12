import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { createAdminClient } from '@/lib/supabase/admin';
import { GESTORIA_EMAIL_SET } from '@/lib/gestoria';

const admin = createAdminClient();

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'employee'].includes(profile.role as string)) return null;
  return user;
}

export async function POST(req: NextRequest) {
  const caller = await verifyAdmin(req);
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { pdfBase64, employeeName, month, year, recipients } = await req.json();
  if (!pdfBase64 || !employeeName || !month || !year) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 });
  }

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return NextResponse.json({ error: 'Selecciona al menos un destinatario' }, { status: 400 });
  }
  const invalid = recipients.filter((r: unknown) => typeof r !== 'string' || !GESTORIA_EMAIL_SET.has(r));
  if (invalid.length > 0) {
    return NextResponse.json({ error: `Destinatario no permitido: ${invalid.join(', ')}` }, { status: 400 });
  }

  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return NextResponse.json({ error: 'Variables de entorno de email no configuradas' }, { status: 500 });
  }

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const monthName = MONTHS[(month as number) - 1];
  const filename = `registro_jornada_${(employeeName as string).toLowerCase().replace(/\s+/g, '_')}_${String(month).padStart(2,'0')}_${year}.pdf`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: gmailUser, pass: gmailPass },
  });

  await transporter.sendMail({
    from: `Mavic Beauty & Nails <${gmailUser}>`,
    to: (recipients as string[]).join(', '),
    subject: `Registro de jornada — ${employeeName} — ${monthName} ${year}`,
    text: `Adjunto encontrarás el registro de jornada de ${employeeName} correspondiente a ${monthName} ${year}.\n\nFirmado por ambas partes.\n\nMavic Beauty & Nails\n\n---\nEste mensaje ha sido generado automáticamente desde el sistema de gestión de Mavic Beauty & Nails.`,
    attachments: [
      {
        filename,
        content: Buffer.from(pdfBase64, 'base64'),
        contentType: 'application/pdf',
      },
    ],
  });

  return NextResponse.json({ ok: true });
}
