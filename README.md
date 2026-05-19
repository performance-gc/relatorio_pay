# Central Farma | Painel Operacional

Painel logístico/comercial da Central Farma em tempo real, gerado a partir da
base `payments` do portal **pay.centralfarma.com.br**.

Stack: **Next.js 14 (App Router) + TypeScript** na Vercel, com conexão ao
MySQL via webhook n8n e autenticação Supabase SSO.

---

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # edite com suas credenciais
npm run dev
# abra http://localhost:3000
```

Em DEV, o `.env.local` está configurado pra conexão direta ao MySQL
(`DATA_SOURCE=DIRECT_DB`). Funciona porque sua IP corporativa está liberada na
Security Group da RDS.

## Como funciona

```
Browser ──► /dashboard (página protegida)
         │
         └──► fetch /api/payments
                  │
                  ├── DEV  : conecta direto no MySQL via mysql2
                  └── PROD : POST no webhook n8n (que executa o SELECT)
                  │
                  └── transform.ts aplica:
                       1. Title Case PT no "Criado por"
                       2. Remove 6 vendedoras excluídas
                       3. Classifica em Rota 08h/10h/14h/16h
                       4. Marca ATRASADO/NO PRAZO
                       5. Ordena por "Pago em" ascendente
                  ↓
              JSON { records, dataCorte, agoraOperacional }
                  ↓
        dashboard.tsx renderiza KPIs/gráficos/tabelas
```

## Estrutura

```
app/
  api/payments/route.ts   ← API: busca + transforma
  dashboard/page.tsx      ← UI (visual idêntico ao template validado)
  layout.tsx, page.tsx
lib/
  db.ts                   ← dispatch DIRECT_DB | N8N_WEBHOOK
  transform.ts            ← TODAS as regras do Prompt.txt
scripts/
  probe.mjs               ← validação rápida da pipeline contra dados reais
```

## Variáveis de ambiente

Ver `.env.example`. Resumo:

| Var | DEV | PROD |
| --- | --- | --- |
| `DATA_SOURCE` | `DIRECT_DB` | `N8N_WEBHOOK` |
| `MYSQL_*` | obrigatório | não usado |
| `N8N_WEBHOOK_URL` / `_SECRET` | não usado | obrigatório |
| `LOOKBACK_DAYS` | 30 | 30 |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | opcional (com BYPASS_AUTH) | obrigatório |
| `BYPASS_AUTH` | `true` enquanto não montou Supabase | sempre `false` |

## Deploy na Vercel

1. `git init && git remote add origin <repo>`
2. Conecte o repo no painel da Vercel
3. Configure as env vars de prod (lista acima) em Settings → Environment Variables
4. Deploy

## Regras do painel

Vêm 100% do `Prompt.txt` original. Resumo no `lib/transform.ts`.

## Atualização do template visual

> O template/layout da última versão validada deve ser preservado nas próximas
> atualizações, alterando apenas os dados da nova base enviada.
> Não recriar layout novo sem solicitação. — *Prompt.txt §IMPORTANTE*

CSS e estrutura HTML preservados em `app/dashboard/page.tsx` (constantes
`CSS` e `SCRIPT`).
