// ============================================================================
// lib/transform.ts
// Regras operacionais do painel Central Farma (do Prompt.txt).
//   - Padroniza "Criado por" em Title Case PT
//   - Exclui 6 vendedoras bloqueadas
//   - Classifica cada pagamento na rota correta (ciclo operacional)
//   - Sinaliza atraso (NO PRAZO / ATRASADO)
//   - Ordena por "Pago em" ascendente
//   - Toda lógica de datas em America/Sao_Paulo
// ============================================================================

export type RawPaymentRow = {
  id: number;
  pedido: string;
  cliente: string | null;
  status: string;
  expira_em: string | null;
  pago_em: string | null;            // "YYYY-MM-DD HH:mm:ss" (wallclock SP)
  valor: number | string;
  tipo: string | null;
  parcelas_pagas: number | null;
  parcelas_total: number | null;
  coupon: string | null;
  criado_por: string | null;
  data_criacao: string | null;
};

export type DashboardRecord = {
  Pedido: string;
  Cliente: string;
  Status: string;
  Pago_em: string;                   // "DD/MM/YYYY HH:mm"
  Valor: number;                     // arredondado
  Tipo: string;
  Criado_por: string;
  Janela_Rota: 'Rota 08h' | 'Rota 10h' | 'Rota 14h' | 'Rota 16h';
  Status_Operacional: 'No Prazo' | 'Atrasado';
  Pago_ordem: number;                // epoch ms (wallclock SP tratado como UTC) para sort estável
};

export type DashboardPayload = {
  records: DashboardRecord[];
  dataCorte: string;                 // "DD/MM/YYYY"
  agoraOperacional: string;          // "DD/MM/YYYY HH:mm"
  generatedAt: string;               // ISO UTC
};

// ----------------------------------------------------------------------------
// EXCLUSÕES OBRIGATÓRIAS (do Prompt.txt seção 4)
// ----------------------------------------------------------------------------
const EXCLUDED_SELLERS = new Set([
  'antonio gabriel meira coelho',
  'ludmila merces guimaraes lourenco',
  'vitor rocha rohwedder',
  'maria fernanda carvalho da rocha',
  'ana beatriz da silva alcantara',
  'tamiris fauro',
]);

// ----------------------------------------------------------------------------
// Title Case Português — preposições/artigos em minúsculas (exceto se 1ª palavra)
// ----------------------------------------------------------------------------
const LOWERCASE_TOKENS = new Set([
  'da', 'de', 'do', 'das', 'dos', 'di', 'du',
  'e', 'em', 'na', 'no', 'nas', 'nos',
  'la', 'le', 'lo', 'las', 'los',
  'van', 'von', 'der', 'den',
]);

export function titleCasePt(input: string | null | undefined): string {
  if (!input) return '';
  const cleaned = input.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned
    .toLowerCase()
    .split(' ')
    .map((word, i) => {
      if (i > 0 && LOWERCASE_TOKENS.has(word)) return word;
      // Mantém pontuação/iniciais (ex.: "j." → "J.")
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function normalizeForExclusion(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

// ----------------------------------------------------------------------------
// Helpers de data (wallclock America/Sao_Paulo)
// ----------------------------------------------------------------------------
type SpStamp = {
  y: number; m: number; d: number;
  hh: number; mm: number; ss: number;
  minutes: number;       // minutos desde 00:00 do dia
  daySerial: number;     // YYYY*10000 + MM*100 + DD (comparável)
  epochMs: number;       // epoch UTC dessa wallclock tratada como UTC (para sort estável)
};

function buildSpStamp(y: number, m: number, d: number, hh: number, mm: number, ss: number): SpStamp {
  return {
    y, m, d, hh, mm, ss,
    minutes: hh * 60 + mm,
    daySerial: y * 10000 + m * 100 + d,
    epochMs: Date.UTC(y, m - 1, d, hh, mm, ss),
  };
}

function parseDbDateAsSP(s: string | null | undefined): SpStamp | null {
  if (!s) return null;
  // Aceita "YYYY-MM-DD HH:mm:ss" ou "YYYY-MM-DDTHH:mm:ss[.sss][Z]"
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  return buildSpStamp(+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]);
}

export function nowSP(reference: Date = new Date()): SpStamp {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(reference).map(p => [p.type, p.value]));
  // hour pode vir "24" em alguns runtimes — normaliza pra 0
  const hour = parts.hour === '24' ? 0 : +parts.hour;
  return buildSpStamp(+parts.year, +parts.month, +parts.day, hour, +parts.minute, +parts.second);
}

function addDaysToSerial(serial: number, days: number): number {
  const y = Math.floor(serial / 10000);
  const m = Math.floor((serial % 10000) / 100);
  const d = serial % 100;
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.getUTCFullYear() * 10000 + (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
}

function pad2(n: number): string { return n < 10 ? '0' + n : String(n); }

function formatBR(stamp: SpStamp, withTime = true): string {
  const base = `${pad2(stamp.d)}/${pad2(stamp.m)}/${stamp.y}`;
  return withTime ? `${base} ${pad2(stamp.hh)}:${pad2(stamp.mm)}` : base;
}

// ----------------------------------------------------------------------------
// Cortes de rota (do Prompt.txt seção 5)
//   <= 10:30 → Rota 08h
//   <= 13:00 → Rota 10h
//   <= 15:30 → Rota 14h
//   <= 17:50 → Rota 16h
//   >  17:50 → Rota 08h do próximo ciclo
// ----------------------------------------------------------------------------
const ROUTE_CUTOFFS: Array<{ rota: DashboardRecord['Janela_Rota']; maxMin: number; deadlineMin: number }> = [
  { rota: 'Rota 08h', maxMin: 10 * 60 + 30, deadlineMin: 10 * 60 + 30 },
  { rota: 'Rota 10h', maxMin: 13 * 60,       deadlineMin: 13 * 60       },
  { rota: 'Rota 14h', maxMin: 15 * 60 + 30, deadlineMin: 15 * 60 + 30 },
  { rota: 'Rota 16h', maxMin: 17 * 60 + 50, deadlineMin: 17 * 60 + 50 },
];

function classify(
  pago: SpStamp,
  now: SpStamp,
): { rota: DashboardRecord['Janela_Rota']; routeDaySerial: number; deadlineMin: number; status: DashboardRecord['Status_Operacional'] } {
  // Prior-day pago → Rota 08h de HOJE e SEMPRE atrasado (regra explícita do prompt)
  if (pago.daySerial < now.daySerial) {
    return { rota: 'Rota 08h', routeDaySerial: now.daySerial, deadlineMin: 10 * 60 + 30, status: 'Atrasado' };
  }
  // Same-day pago — classifica por horário
  if (pago.daySerial === now.daySerial) {
    for (const cut of ROUTE_CUTOFFS) {
      if (pago.minutes <= cut.maxMin) {
        const status: DashboardRecord['Status_Operacional'] =
          cut.deadlineMin < now.minutes ? 'Atrasado' : 'No Prazo';
        return { rota: cut.rota, routeDaySerial: now.daySerial, deadlineMin: cut.deadlineMin, status };
      }
    }
    // > 17:50 → Rota 08h do próximo dia (deadline futuro → NO PRAZO)
    return { rota: 'Rota 08h', routeDaySerial: addDaysToSerial(now.daySerial, 1), deadlineMin: 10 * 60 + 30, status: 'No Prazo' };
  }
  // Future-paid (não deve ocorrer; fallback seguro)
  return { rota: 'Rota 08h', routeDaySerial: pago.daySerial, deadlineMin: 10 * 60 + 30, status: 'No Prazo' };
}

// ----------------------------------------------------------------------------
// Pipeline principal
// ----------------------------------------------------------------------------
export function transformRows(rows: RawPaymentRow[], referenceTime: Date = new Date()): DashboardPayload {
  const now = nowSP(referenceTime);

  const records: DashboardRecord[] = [];

  for (const row of rows) {
    // 1. Padroniza nome
    const vendedora = titleCasePt(row.criado_por);

    // 2. EXCLUSÃO antes de qualquer agregação
    if (!vendedora || EXCLUDED_SELLERS.has(normalizeForExclusion(vendedora))) continue;

    // 3. Sem "Pago em" não entra no painel operacional
    const pago = parseDbDateAsSP(row.pago_em);
    if (!pago) continue;

    // 4. Classificação operacional
    const cls = classify(pago, now);

    // 5. Valor sem centavos
    const valor = Math.round(Number(row.valor) || 0);

    records.push({
      Pedido: row.pedido ?? '',
      Cliente: (row.cliente && row.cliente.trim()) || 'NÃO IDENTIFICADO',
      Status: row.status ?? '',
      Pago_em: formatBR(pago, true),
      Valor: valor,
      Tipo: row.tipo ?? '',
      Criado_por: vendedora,
      Janela_Rota: cls.rota,
      Status_Operacional: cls.status,
      Pago_ordem: pago.epochMs,
    });
  }

  // 6. Ordenação padrão (do mais antigo para o mais recente)
  records.sort((a, b) => a.Pago_ordem - b.Pago_ordem);

  return {
    records,
    dataCorte: formatBR(now, false),
    agoraOperacional: formatBR(now, true),
    generatedAt: new Date().toISOString(),
  };
}
