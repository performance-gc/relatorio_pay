// ============================================================================
// app/api/payments/route.ts
// GET /api/payments → busca pagamentos (DB ou n8n), aplica regras e retorna JSON.
// Sempre fresh (no-store) — é um painel operacional.
// ============================================================================

import { NextResponse } from 'next/server';
import { fetchPayments } from '@/lib/db';
import { transformRows } from '@/lib/transform';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const rows = await fetchPayments();
    const payload = transformRows(rows);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error('[/api/payments]', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
