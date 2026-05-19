// ============================================================================
// lib/db.ts — fetcher de pagamentos
// Em DEV (DATA_SOURCE=DIRECT_DB): conecta direto no MySQL com mysql2.
// Em PROD (DATA_SOURCE=N8N_WEBHOOK): chama o webhook do n8n via HTTPS.
// Ambos retornam o mesmo shape (RawPaymentRow[]) pro transform.ts processar.
// ============================================================================

import type { RawPaymentRow } from './transform';

const SELECT_PAGAMENTOS = `
  SELECT
    p.id,
    p.\`order\` AS pedido,
    COALESCE(NULLIF(pc.name, ''), 'NÃO IDENTIFICADO') AS cliente,
    ps.name AS status,
    p.expires_at AS expira_em,
    p.paid_at AS pago_em,
    p.amount AS valor,
    pt.name AS tipo,
    p.paid_installments AS parcelas_pagas,
    p.installments AS parcelas_total,
    p.coupon AS coupon,
    u.name AS criado_por,
    p.created_at AS data_criacao
  FROM payments p
  LEFT JOIN payment_statuses ps ON ps.id = p.status_id
  LEFT JOIN payment_types pt    ON pt.id = p.type_id
  LEFT JOIN payment_customers pc ON pc.payment_id = p.id
  LEFT JOIN users u             ON u.id = p.createable_id
                              AND p.createable_type = 'App\\\\Modules\\\\User\\\\Models\\\\User'
  WHERE p.deleted_at IS NULL
    AND ps.name = 'Pago'
    AND p.paid_at IS NOT NULL
    AND p.paid_at >= NOW() - INTERVAL ? DAY
  ORDER BY p.paid_at ASC
`;

export async function fetchPayments(): Promise<RawPaymentRow[]> {
  const source = (process.env.DATA_SOURCE || 'DIRECT_DB').toUpperCase();
  const lookback = Number(process.env.LOOKBACK_DAYS || 30);

  if (source === 'N8N_WEBHOOK') {
    return fetchFromN8n(lookback);
  }
  return fetchFromDirectDb(lookback);
}

// ----------------------------------------------------------------------------
async function fetchFromDirectDb(lookbackDays: number): Promise<RawPaymentRow[]> {
  const mysql = await import('mysql2/promise');
  const conn = await mysql.createConnection({
    host: must('MYSQL_HOST'),
    port: Number(process.env.MYSQL_PORT || 3306),
    user: must('MYSQL_USER'),
    password: must('MYSQL_PASSWORD'),
    database: must('MYSQL_DATABASE'),
    connectTimeout: 10_000,
    dateStrings: true,
  });
  try {
    const [rows] = await conn.query(SELECT_PAGAMENTOS, [lookbackDays]);
    return rows as RawPaymentRow[];
  } finally {
    await conn.end();
  }
}

// ----------------------------------------------------------------------------
async function fetchFromN8n(lookbackDays: number): Promise<RawPaymentRow[]> {
  const url = must('N8N_WEBHOOK_URL');
  const secret = must('N8N_WEBHOOK_SECRET');
  const headerName = process.env.N8N_WEBHOOK_HEADER_NAME || 'X-Webhook-Secret';

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      [headerName]: secret,
    },
    body: JSON.stringify({ lookbackDays }),
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`n8n webhook respondeu ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // O workflow do n8n deve retornar { rows: RawPaymentRow[] } OU diretamente RawPaymentRow[]
  if (Array.isArray(data)) return data as RawPaymentRow[];
  if (Array.isArray(data?.rows)) return data.rows as RawPaymentRow[];
  if (Array.isArray(data?.data)) return data.data as RawPaymentRow[];
  throw new Error('Resposta do n8n em formato inesperado. Esperado array ou { rows: [...] }.');
}

function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variável de ambiente faltando: ${name}`);
  return v;
}
