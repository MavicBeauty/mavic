import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { regeneratePDF } from '@/lib/historial-pdf';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
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
