// ============================================================================
// app/api/auth/signout/route.ts
// Chamado pelo mecanismo de inatividade no cliente para encerrar a sessão.
// ============================================================================

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createClient();
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}
