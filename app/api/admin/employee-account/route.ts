import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

const admin = createAdminClient();

async function verifyAdmin(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (!profile || !['owner', 'employee'].includes(profile.role as string)) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const caller = await verifyAdmin(req);
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const employeeId = req.nextUrl.searchParams.get('employeeId');
  if (!employeeId) return NextResponse.json({ error: 'Missing employeeId' }, { status: 400 });

  const { data } = await admin
    .from('profiles')
    .select('id, email, timesheet_permission')
    .eq('employee_labor_info_id', employeeId)
    .eq('role', 'portal')
    .maybeSingle();

  return NextResponse.json({ account: data });
}

export async function POST(req: NextRequest) {
  const caller = await verifyAdmin(req);
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { employeeId, email } = await req.json();

  const { data: emp } = await admin
    .from('employee_labor_info')
    .select('display_name')
    .eq('id', employeeId)
    .single();

  if (!emp) return NextResponse.json({ error: 'Empleada no encontrada' }, { status: 404 });

  const host = req.headers.get('host') || 'mavic-ten.vercel.app';
  const protocol = host.includes('localhost') ? 'http' : 'https';
  const redirectTo = `${protocol}://${host}/empleada/set-password`;

  const { data: invite, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 500 });

  const { error: profileErr } = await admin.from('profiles').insert({
    id: invite.user.id,
    name: (emp as { display_name: string }).display_name,
    email,
    role: 'portal',
    employee_labor_info_id: employeeId,
    timesheet_permission: 'read',
  });

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, userId: invite.user.id });
}

export async function PATCH(req: NextRequest) {
  const caller = await verifyAdmin(req);
  if (!caller) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { userId, email, password, permission } = await req.json();

  if (email || password) {
    const updates: { email?: string; password?: string } = {};
    if (email) updates.email = email;
    if (password) updates.password = password;
    const { error } = await admin.auth.admin.updateUserById(userId, updates);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (email) {
      await admin.from('profiles').update({ email }).eq('id', userId);
    }
  }

  if (permission) {
    const { error } = await admin
      .from('profiles')
      .update({ timesheet_permission: permission })
      .eq('id', userId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
