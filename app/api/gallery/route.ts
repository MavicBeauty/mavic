import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAdminClient } from '@/lib/supabase/admin';

const admin = createAdminClient();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin.from('profiles').select('role').eq('id', user.id).single();
  if (!profile || !['owner', 'employee'].includes(profile.role as string)) return null;
  return user;
}

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = adminClient();
  const { data, error } = await supabase.storage
    .from('nail-gallery')
    .list('', { limit: 2000, sortBy: { column: 'created_at', order: 'desc' } });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const files = (data ?? [])
    .filter((f) => f.name !== '.emptyFolderPlaceholder')
    .map((f) => f.name);
  return NextResponse.json({ files });
}

export async function POST(req: NextRequest) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const formData = await req.formData();
  const files = formData.getAll('files') as File[];
  if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 });

  const supabase = adminClient();
  const results: { name: string; error?: string }[] = [];

  for (const file of files) {
    if (!ALLOWED_MIME.includes(file.type)) {
      results.push({ name: file.name, error: 'Tipo de archivo no permitido' });
      continue;
    }
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filename = `u${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage
      .from('nail-gallery')
      .upload(filename, file, { contentType: file.type, upsert: false });
    results.push({ name: filename, error: error?.message });
  }

  return NextResponse.json({ results });
}
