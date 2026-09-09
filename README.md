# PDI+

Transformando planos de desenvolvimento em jornadas.

PWA que converte o PDI corporativo (CESAR) num roadmap visual interativo,
com sincronização via extensão de navegador e insights via Gemini.

## Estrutura (monorepo pnpm)

```
pdi-mais/
├── apps/
│   ├── web/          # PWA Next.js (App Router) — Rodada 1+
│   └── extension/    # extensão Chrome Manifest V3 — Rodada 3 (placeholder)
├── packages/
│   └── core/         # tipos, schema (zod) e merge idempotente do PDI
└── docs/             # especificação, instruções e checklist de testes
```

## Rodar localmente

Pré-requisitos: **Node 20+** e **pnpm 9** (`corepack enable`).

```bash
pnpm install

# configure as variáveis:
cp apps/web/.env.example apps/web/.env.local
#   -> preencha MONGODB_URI, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET

pnpm dev          # sobe apps/web em http://localhost:3000
pnpm test         # roda os testes de @pdi-mais/core
pnpm typecheck    # checa tipos em todos os pacotes
```

Detalhes de configuração (MongoDB Atlas, Google OAuth): [`docs/SETUP.md`](docs/SETUP.md).

Para ver o canvas com dados de exemplo (só em dev): logado, acesse
`http://localhost:3000/api/dev/seed` — ele grava o PDI de exemplo e volta
para o canvas.

## Estado atual

| Rodada | Escopo | Status |
|---|---|---|
| 1 | Fundação: Auth Google + Mongo + `/api/sync` + `/api/pdi` | ✅ feito |
| 2 | Canvas (React Flow): 5 formatos, painel, edição da raiz, conexões n8n, guias de alinhamento | ✅ feito |
| 3 | Extensão Manifest V3 | ⬜ |
| 4 | Edição no canvas, deep link Gemini, modo gestor, PWA | ⬜ |
| 5 | Import manual (colar tabela / CSV) | ✅ feito |

Detalhe do que foi entregue: [`docs/PROGRESSO.md`](docs/PROGRESSO.md).

## Documentação

- [`docs/PDI-PLUS-SPEC.md`](docs/PDI-PLUS-SPEC.md) — especificação técnica completa
- [`docs/SETUP.md`](docs/SETUP.md) — passo a passo de configuração do ambiente
- [`docs/PROJECT-INSTRUCTIONS.md`](docs/PROJECT-INSTRUCTIONS.md) — instruções para o Claude Project
- [`docs/KICKOFF-PROMPT.md`](docs/KICKOFF-PROMPT.md) — prompts para iniciar o desenvolvimento
- [`docs/TEST-CHECKLIST.md`](docs/TEST-CHECKLIST.md) — checklist de testes manuais do MVP

## Stack

Next.js (App Router) · React Flow · Tailwind · Auth.js (Google OAuth) ·
MongoDB Atlas · Chrome Extension Manifest V3 · Vercel
