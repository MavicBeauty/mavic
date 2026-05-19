import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateHistorialPDF, normalizeZones } from '@/lib/historial-pdf';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function regeneratePDF(supabase: ReturnType<typeof getSupabase>, client_id: string) {
  const { data: client } = await supabase
    .from('clients')
    .select('name, apellidos, phone, fecha_nacimiento, dni')
    .eq('id', client_id)
    .single();

  const { data: allSessions } = await supabase
    .from('clinical_sessions')
    .select('session_date, form_data')
    .eq('client_id', client_id)
    .order('session_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (!client || !allSessions?.length) return;

  const sessionList = allSessions.map((s: { session_date: string; form_data: Record<string, unknown> }) => ({
    session_date: s.session_date,
    zones: normalizeZones(s.form_data),
    observations: s.form_data.observations as string | undefined,
    adverse_reactions: s.form_data.adverse_reactions as Record<string, boolean> | undefined,
  }));

  const pdfBuffer = await generateHistorialPDF(client, sessionList);
  const fileName = `historial_${client_id}.pdf`;

  await supabase.storage
    .from('client-documents')
    .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

  await supabase
    .from('clinical_sessions')
    .update({ doc_storage_path: fileName })
    .eq('client_id', client_id);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, session_date, zones, observations, adverse_reactions } = body;

    if (!client_id || !session_date || !zones?.length) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    const supabase = getSupabase();

    const { data: clientCheck, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .single();

    if (clientError || !clientCheck) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const { data: newSession, error: insertError } = await supabase
      .from('clinical_sessions')
      .insert([{
        client_id,
        session_date,
        form_data: { zones, observations, adverse_reactions },
        doc_storage_path: `historial_${client_id}.pdf`,
      }])
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await regeneratePDF(supabase, client_id);

    return NextResponse.json({ success: true, sessionId: newSession.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
