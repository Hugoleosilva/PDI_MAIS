# PDI+ — contexto do projeto

PWA que transforma o PDI corporativo (CESAR) — uma tabela estática — num roadmap
visual e interativo (canvas estilo Miro/FigJam), com blocos, conexões e
planejamento de capacidade. Repo: github.com/Hugoleosilva/PDI_MAIS.

Docs detalhados em `docs/`: **RELATORIO.md** (arquitetura + porquês), **PROGRESSO.md**
(o que foi feito por rodada), **PDI-PLUS-SPEC.md** (spec), **SETUP.md**, **TEST-CHECKLIST.md**.

---

## Stack

Monorepo pnpm · Next.js 15 (App Router) · Auth.js v5 + Google OAuth (sessão JWT,
sem adapter) · MongoDB Atlas (1 doc/usuário, coleção `pdis`) · React Flow
(`@xyflow/react`) + Dagre · Tailwind (tema claro fixo) · Zod · Vitest · deploy Vercel.

## Comandos (rodar da raiz)

```
pnpm dev         # sobe apps/web em localhost:3000
pnpm test        # Vitest — packages/core (28) + apps/web (12)
pnpm typecheck   # tsc --noEmit em todos os pacotes
pnpm build       # build de produção
```

## Estrutura

```
packages/core/src/     REGRA DE NEGÓCIO — TypeScript puro, sem framework, testado
  types.ts             modelo: PdiDoc, Area, Action, PdiGroup, PdiLink, PdiCanvasState, WeekCapacity
  labels.ts            rótulos da plataforma ("Não iniciado"…) <-> valores canônicos (todo/doing/done)
  progress.ts          areaProgress/overallProgress (binário, = plataforma)
  planning.ts          actionCompletion (módulos>horas>status), projeção de prazo, burndown, areaRealProgress
  ids.ts               id determinístico (hash cyrb53 do título normalizado)
  schema.ts            schemas Zod da payload de sync (aceitam rótulo ou canônico)
  merge.ts             mergePdi() — idempotente, preserva edições locais, prune de órfãos
  groups.ts            SEED_GROUPS (5 blocos), resolveSeedGroups, groupOfArea
  import.ts            parseImportTable — CSV RFC4180, separador auto, sync parcial
  insight.ts           buildInsightPrompt(pdi) — prompt do Gemini p/ 1-on-1
  fixtures/seed-hugo.ts  PDI real do Hugo (8 áreas, 32 ações), só dev

apps/web/src/
  app/
    page.tsx           tela principal (server): sessão -> PDI -> canvas / EmptyState
    import/            "Preencher à mão" (ManualBuilder) + "Colar tabela/CSV" (ImportForm)
    planejamento/      PlanningView — capacidade, projeção, burndown
    api/               userId SEMPRE da sessão, nunca do body:
      sync (extensão) · import (manual) · pdi (GET) · pdi/root · pdi/groups ·
      pdi/canvas · pdi/link · pdi/action/[id] · pdi/capacity · dev/seed (só dev)
  components/
    canvas/PdiCanvas.tsx   orquestra tudo do canvas (grande de propósito)
    canvas/nodes.tsx       Root/Area/Action/Band/Group nodes (+ nota amarela do bloco)
    canvas/edges.tsx       LinkEdge (conexão n8n)
    canvas/{HelperLines,DetailPanel}.tsx
    planning/{PlanningView,WeekGrid,Burndown}.tsx
    {ImportTabs,ManualBuilder,ImportForm,GeminiButton,EmptyState}.tsx
  lib/
    mongo.ts           cliente singleton
    pdi-repo.ts         ÚNICA camada que fala com o banco
    pdi-to-graph.ts     PdiDoc -> nós/arestas do React Flow; 5 layouts; frames dos blocos
    {helper-lines,theme,format,schemas}.ts
  auth.ts              config do Auth.js

apps/extension/        placeholder — Rodada 3 (bloqueada por aval da TI)
```

## Convenções e decisões (não quebrar)

- **Lógica de negócio vai no `packages/core`** (puro, testável). `apps/web` só faz
  auth/banco/HTTP/UI. Bug de cálculo = core; bug de interação = web.
- **`userId` vem sempre da sessão** em toda rota de API.
- **IDs de área/ação são determinísticos** (hash do título) → merge idempotente.
- **`mergePdi` preserva** posição no canvas, descrições, notas, blocos, e status/prazo
  de ações `source: "manual"`. Reimportar = atualizar, nunca duplicar.
- **Progresso geral = média dos % das áreas** (confirmado na plataforma real).
- **Blocos por geometria**: área pertence ao bloco se o centro do card está dentro
  do frame. `recapture()` recalcula. As ações seguem a área.
- **Estado visual** (`PdiDoc.canvas`) é separado dos dados; salvo com debounce.
- **Canvas de blocos CONGELADO** (muitas iterações de UX, aprovado) — não mexer sem
  o usuário pedir. Regra final: arrastar card = só o card; arrastar frame = frame +
  membros; seleção do bloco (`selectedGroupId`, estado próprio) só mostra as alças.
- Tema **claro only** (`color-scheme: light` no globals.css).

## Estado atual

| Rodada | Status |
|---|---|
| 1 Fundação (auth, Mongo, API) | ✅ |
| 2 Canvas (5 layouts, guias, conexões) + 2.5 Blocos | ✅ |
| 5 Import manual (2 abas) + Insight Gemini | ✅ |
| 6 Planejamento (capacidade, progresso real, burndown) | ✅ |
| 3 Extensão Chrome MV3 | ⬜ bloqueada — aval TI/Segurança do CESAR |
| 4 (resto) | editar status/prazo/nota no card do canvas (DetailPanel ainda read-only); modo gestor (`/r/[shareId]`); PWA |

## Gotchas do ambiente

- Windows + PowerShell. `pnpm` vem via `corepack` (v9.15). Bash tool também disponível.
- **`pnpm build` falha com EPERM** se o `pnpm dev` estiver rodando (trava o `.next`) —
  parar o dev, `rm -rf apps/web/.next`, buildar.
- Commits: mensagem multilinha via `git commit -m "$(printf '...')"` no Bash
  (o here-string do PowerShell quebra com `/` e parênteses). **Cuidado**: se a
  mensagem tiver `%` (ex. "% simples"), o `printf` interpreta como especificador
  de formato e corrompe o texto — nesse caso escreve a mensagem num arquivo
  (`Write`) e usa `git commit -F arquivo.txt` em vez de `printf`.
- O usuário tem **3 contas Google** com PDIs separados no banco; a de teste é
  `hugollsilva.dev@gmail.com`.
- `.env.local` em `apps/web/` (Mongo + Google OAuth) — fora do git.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
