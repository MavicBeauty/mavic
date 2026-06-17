import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';
import { regeneratePDF } from '@/lib/historial-pdf';

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

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { sessionId: string } }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const supabase = getSupabase();

  const { data: session } = await supabase
    .from('clinical_sessions')
    .select('client_id')
    .eq('id', params.sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  const { error } = await supabase
    .from('clinical_sessions')
    .delete()
    .eq('id', params.sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await regeneratePDF(supabase, session.client_id);

  return NextResponse.json({ success: true });
}

export async function PUT(req: NextRequest, { params }: { params: { sessionId: string } }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const body = await req.json();
  const supabase = getSupabase();

  const { data: session } = await supabase
    .from('clinical_sessions')
    .select('client_id')
    .eq('id', params.sessionId)
    .single();

  if (!session) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });

  const { error } = await supabase
    .from('clinical_sessions')
    .update({
      session_date: body.session_date,
      form_data: {
        zones: body.zones,
        observations: body.observations,
        adverse_reactions: body.adverse_reactions,
      },
    })
    .eq('id', params.sessionId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await regeneratePDF(supabase, session.client_id);

  return NextResponse.json({ success: true });
}
