# PDI+ — Especificação Técnica

> **PDI+** — Transformando planos de desenvolvimento em jornadas.
> Autor: Hugo Silva — CESAR (Centro de Estudos e Sistemas Avançados do Recife)
> Status: POC / em desenvolvimento · Última revisão: 2026-09-08

---

## 1. Visão

O PDI da empresa **guarda os dados**. O PDI+ dá **vida, clareza e direção**
à carreira: converte a tabela estática do PDI corporativo num **roadmap
visual interativo** (canvas estilo Miro, da esquerda para a direita), com
sincronização sem digitação via extensão de navegador e insights
estratégicos via Gemini (interface web, sem custo de API).

Não substitui o PDI corporativo — **potencializa** (o "+").

### Dores que resolve

1. **Ineficiência operacional** — acaba com o retrabalho de desenhar
   blocos e setas à mão em whiteboards.
2. **Falta de clareza visual** — tabela corporativa vira roadmap
   interativo com o caminho percorrido e os próximos passos visíveis
   de imediato.
3. **Alinhamento com o gestor** — visão assíncrona e sempre atualizada
   do avanço, sem relatório manual para 1-on-1s.

Também serve como **projeto de portfólio**: arquitetura full-stack,
sincronização assíncrona, PWA e integração pragmática com IA.

---

## 2. Escopo e modelo de acesso

- **Cada usuário acessa apenas o próprio PDI.**
- Autenticação **Google OAuth** (Auth.js / NextAuth).
- `userId` = `sub` do Google (identificador estável; e-mail **não** é chave).
- Todo documento é indexado por `userId`; toda rota de API filtra pelo
  `userId` da sessão e **nunca** confia em `userId` vindo do payload.
- **Modo gestor** = link _read-only_ com `shareId` aleatório, gerado pelo
  próprio usuário. O usuário compartilha o próprio dado; o gestor não
  precisa autenticar.

### Nota de conformidade

A extensão lê o DOM da plataforma de PDI **apenas no navegador do próprio
usuário, na sessão dele, sobre dados que ele já acessa legitimamente**.
O ponto de atenção que resta não é privacidade de terceiros, e sim
**dado corporativo saindo do perímetro** (cópia do PDI em MongoDB Atlas +
Vercel). Ações:

- Validar com a TI/Segurança do CESAR antes de distribuir a extensão.
- Manter um **plano B de import manual** (colar tabela / upload CSV) caso
  a extensão não seja aprovada.
- Não armazenar dados de outras pessoas (sem "modo gestor de equipe" que
  agregue PDIs de terceiros nesta fase).

---

## 3. Stack

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | **Next.js (App Router)** | SSR/SSG, API routes, base natural para PWA |
| Canvas | **React Flow** | Zoom, pan, drag, nós customizados — canvas estilo Miro |
| UI | **Tailwind CSS** | Estilização rápida, dark mode nativo, responsivo |
| Auth | **Auth.js (NextAuth) + Google OAuth** | Login social, sessão em cookie |
| Banco | **MongoDB Atlas** | Documento aninhado (Objetivo → Áreas → Ações) por `userId` |
| Sync | **Chrome Extension (Manifest V3)** | Content script extrai o DOM da plataforma interna |
| IA | **Google Gemini (interface web)** | Deep link com prompt contextual — custo $0 de API |
| Deploy | **Vercel** | CI/CD, SSL, suporte nativo a Next.js |
| Linguagem | **TypeScript** em todo o código | |

---

## 4. Arquitetura

```
[ Plataforma PDI Corporativa ]
            │  (clique "Sincronizar" na extensão)
            ▼
┌───────────────────────────────────────────┐
│  Chrome Extension (Manifest V3)           │
│  • content script lê o DOM                │
│  • normaliza título, prazo, status        │
│  • obtém token de sessão via PWA          │
│    (externally_connectable)               │
└───────────────────┬───────────────────────┘
                    │  POST /api/sync  (JSON + Bearer token)
                    ▼
┌───────────────────────────────────────────┐
│  PWA Next.js — API Route                  │
│  • valida sessão (Auth.js) e payload (zod)│
│  • upsert do documento por userId         │
└───────────────────┬───────────────────────┘
                    │
        ┌───────────┴────────────┐
        ▼                        ▼
┌────────────────────┐   ┌──────────────────────────┐
│ Canvas React Flow  │   │ Deep link Gemini         │
│ layout LR          │   │ • monta prompt executivo │
│ nós custom + edges │   │ • abre gemini.google.com │
│ drawer de detalhes │   │ • copia p/ área de transf│
└────────────────────┘   └──────────────────────────┘
        │
        ▼
┌────────────────────┐
│ Share link /r/[id] │  read-only, sem auth, para o gestor
└────────────────────┘
```

### Autenticação da extensão

1. Usuário faz login no PWA (Google).
2. `externally_connectable` no manifest, restrito ao domínio de produção
   (Vercel), permite `chrome.runtime.sendMessage` entre a página do PWA e
   a extensão.
3. O PWA entrega um **token de sessão curto** à extensão.
4. A extensão envia esse token no header do `POST /api/sync`.
5. A API valida o token contra a sessão Auth.js antes de gravar.

---

## 5. Modelo de dados (MongoDB)

Um documento por usuário, coleção `pdis`:

```ts
type Status = "todo" | "doing" | "done";

interface PdiDoc {
  _id: ObjectId;
  userId: string;          // Google sub — índice único
  shareId: string | null;  // slug aleatório p/ link read-only
  updatedAt: Date;
  syncedAt: Date | null;   // último sync bem-sucedido da extensão
  root: {
    title: string;         // objetivo geral de carreira
    note?: string;
  };
  areas: Area[];
}

interface Area {
  id: string;              // estável entre syncs (hash do título)
  title: string;           // ex.: "Backend", "Arquitetura", "UX"
  status: Status;          // derivado das ações
  order: number;
  actions: Action[];
  layout?: { x: number; y: number };  // posição manual no canvas
}

interface Action {
  id: string;
  title: string;
  description?: string;
  status: Status;
  dueDate?: string;        // ISO 8601
  source: "extension" | "manual";
  layout?: { x: number; y: number };
}
```

**Regras**
- `id` de área/ação é **determinístico** (hash do título normalizado) para
  o sync ser _upsert_ e não duplicar nem perder posição manual.
- `status` de uma área = `done` se todas as ações `done`; `doing` se
  alguma `doing` ou mix; senão `todo`.
- Campos `layout` e `description` editados manualmente **não** são
  sobrescritos pelo sync (merge por `id`).

---

## 6. Contrato da API

### `POST /api/sync`
Recebe o PDI extraído pela extensão. Autenticado (sessão Auth.js).

```jsonc
// Request body
{
  "root": { "title": "Tech Lead em 2 anos" },
  "areas": [
    {
      "title": "Arquitetura de Software",
      "actions": [
        { "title": "Curso DDD", "status": "doing", "dueDate": "2026-10-31" },
        { "title": "Design de sistemas distribuídos", "status": "todo" }
      ]
    }
  ]
}
```

- Validação com **zod**. `userId` vem **da sessão**, nunca do body.
- Estratégia: buscar doc por `userId` → merge por `id` determinístico →
  preservar `layout`/`description`/`note` locais → `updatedAt`/`syncedAt`.
- Resposta: `200 { ok: true, areas: n, actions: m }`.

### `GET /api/pdi`
Retorna o documento do usuário autenticado (para o canvas).

### `POST /api/pdi/share`  ·  `DELETE /api/pdi/share`
Gera / revoga o `shareId`.

### `GET /r/[shareId]`
Página _read-only_ do canvas. Sem auth. Só leitura, sem dados sensíveis
além do PDI.

### `GET /api/pdi` (edição manual)
`PATCH /api/pdi/action/[id]` e `PATCH /api/pdi/area/[id]` para status,
descrição, `dueDate` e `layout`.

---

## 7. UX do canvas

- **Tela cheia**, grid infinito de pontos, zoom + pan.
- **Layout esquerda → direita:**
  - Extrema esquerda: **nó raiz** (objetivo de carreira).
  - Coluna central: **áreas de desenvolvimento**.
  - Direita: **cards de ações / treinamentos**.
- **Estados visuais:**
  - 🟢 `done` — card verde, aresta sólida contínua.
  - 🟡 `doing` — card amarelo, aresta **animada**.
  - ⚪ `todo` — card esmaecido neutro, aresta discreta.
- **Drawer lateral (slide-in):** clique num nó abre painel com descrição,
  observações e prazo — sem poluir a visão geral.
- **Drag & drop:** reposiciona nós; posição persistida em `layout`.
- Auto-layout inicial (dagre / elk) quando não há `layout` salvo.

---

## 8. Funcionalidades

| # | Funcionalidade | Descrição |
|---|---|---|
| F1 | Sync 1-clique | Extensão coleta do PDI interno e reflete no PWA |
| F2 | Canvas interativo | Zoom, pan, drag, nós customizados por status |
| F3 | Drawer de detalhes | Descrição, prazo e notas por nó |
| F4 | Edição manual | Ajustar status/descrição/prazo direto no PWA |
| F5 | Modo gestor | Link read-only gerado pelo usuário |
| F6 | Insight p/ 1-on-1 | Deep link Gemini com relatório executivo (lacunas + argumentos) |
| F7 | PWA instalável | macOS, Windows, Android, iOS |
| F8 | Import manual (plano B) | Colar tabela / upload CSV se a extensão não for aprovada |

---

## 9. Roadmap de implementação (ordem do MVP)

1. **Fundação** — Next.js + Tailwind + Auth.js (Google) + conexão Mongo.
2. **Dados + API** — schema, `zod`, `POST /api/sync`, `GET /api/pdi`.
3. **Canvas read-only** — React Flow, nós custom, auto-layout LR, estados.
4. **Extensão M3** — content script + parser do DOM + auth via PWA + sync.
5. **Drawer + edição manual** — painel lateral, `PATCH` de status/prazo.
6. **Deep link Gemini** — montagem do prompt executivo + botão copiar.
7. **Modo gestor** — `shareId`, `/r/[id]`.
8. **PWA** — manifest, service worker, ícones, install prompt.
9. **Plano B** — import manual por CSV/colar.

---

## 10. Decisões de engenharia

- **IA sem backend:** extração por algoritmo determinístico de DOM;
  insights via interface web do Gemini com prompt formatado. Custo de
  infra de IA = **$0**, latência mínima, sem chave de API para vazar.
- **Documento único por `userId`:** sem joins, leitura O(1) por índice,
  consumo de banco baixo.
- **Arquitetura desacoplada:** o componente de roadmap (React Flow) pode
  ser isolado e proposto no futuro como feature nativa da plataforma de
  PDI da empresa.
- **`id` determinístico** para sync idempotente e preservação de edições
  manuais.

---

## 11. Riscos

| Risco | Mitigação |
|---|---|
| Extensão barrada pela TI (ToS / LGPD / dado fora do perímetro) | Plano B de import manual; alinhamento prévio com Segurança |
| DOM da plataforma muda e quebra o parser | Parser tolerante + testes de _fixture_ do HTML; alerta de "sync parcial" |
| Token da extensão vazado | Token curto, escopo mínimo, `externally_connectable` restrito ao domínio |
| Share link vazado | `shareId` aleatório longo, revogável, só leitura |
