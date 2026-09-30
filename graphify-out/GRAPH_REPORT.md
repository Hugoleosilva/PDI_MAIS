# Graph Report - desafioPdi  (2026-09-25)

## Corpus Check
- 83 files · ~40,233 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 538 nodes · 1015 edges · 37 communities (28 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7afb94c6`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pdi-to-graph.ts
- PlanningView.tsx
- auth.ts
- web/package.json
- core/package.json
- Web TypeScript Config
- ManualBuilder.tsx
- Core TypeScript Config
- index.ts
- Root Package Config
- insight.ts
- Progresso do PDI+
- PDI+ — Especificação Técnica
- collection
- groups/route.ts
- PDI+ — contexto do projeto
- canvas/route.ts
- [id]/route.ts
- extension/README.md
- pdi-repo.ts
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports
- root/route.ts
- canvas-presets/route.ts
- mongo.ts
- Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)
- Setup do ambiente — PDI+
- shapes/route.ts
- Prompt inicial — PDI+
- README.md
- PDI+
- addReportSnapshot

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `collection()` - 15 edges
3. `PdiDoc` - 14 edges
4. `formatPercent()` - 13 edges
5. `Progresso do PDI+` - 13 edges
6. `PlanningView()` - 12 edges
7. `compilerOptions` - 12 edges
8. `PDI+ — Especificação Técnica` - 12 edges
9. `layoutGraph()` - 11 edges
10. `Status` - 11 edges

## Surprising Connections (you probably didn't know these)
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `AreaNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `GroupNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (37 total, 6 thin omitted)

### Community 0 - "pdi-to-graph.ts"
Cohesion: 0.06
Nodes (57): DetailPanel(), edgeTypes, HelperLines(), selector(), ActionNode(), AreaNode(), borderStyle(), handleStyle (+49 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.10
Nodes (36): pct(), PctBar(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+28 more)

### Community 2 - "auth.ts"
Cohesion: 0.13
Nodes (16): GET(), runtime, ImportPage(), Home(), PlanningPage(), { handlers, auth, signIn, signOut }, AppHeader(), TABS (+8 more)

### Community 3 - "web/package.json"
Cohesion: 0.04
Nodes (42): dependencies, @dagrejs/dagre, mongodb, next, next-auth, @pdi-mais/core, react, react-dom (+34 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "ManualBuilder.tsx"
Cohesion: 0.10
Nodes (28): PanelData, ImportForm(), DraftAction, emptyAction(), emptyArea(), KINDS, ManualBuilder(), STATUSES (+20 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "index.ts"
Cohesion: 0.08
Nodes (34): GET(), runtime, POST(), runtime, POST(), runtime, applySync(), Layout (+26 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "insight.ts"
Cohesion: 0.15
Nodes (20): GroupNode(), GeminiButton(), KINDS, formatDateTime(), ReportButton(), ASKS, br(), buildContextBlock() (+12 more)

### Community 11 - "Progresso do PDI+"
Cohesion: 0.15
Nodes (13): ✅ Extra — Insight para 1-on-1 (Gemini), Progresso do PDI+, ⏭️ Próximas rodadas, ✅ Rodada 1 — Fundação, ✅ Rodada 2.5 — Blocos de agrupamento, ✅ Rodada 2 — Canvas visual, ✅ Rodada 5 — Import manual, ✅ Rodada 6 — Planejamento de capacidade (+5 more)

### Community 12 - "PDI+ — Especificação Técnica"
Cohesion: 0.10
Nodes (20): 10. Decisões de engenharia, 11. Riscos, 1. Visão, 2. Escopo e modelo de acesso, 3. Stack, 4. Arquitetura, 5. Modelo de dados (MongoDB), 6. Contrato da API (+12 more)

### Community 13 - "collection"
Cohesion: 0.24
Nodes (10): createSchema, DELETE(), nodeId, POST(), runtime, addLink(), collection(), ensureIndexes() (+2 more)

### Community 14 - "groups/route.ts"
Cohesion: 0.21
Nodes (10): PUT(), runtime, bodySchema, PUT(), runtime, setGroups(), setLooseCapacity(), groupSchema (+2 more)

### Community 15 - "PDI+ — contexto do projeto"
Cohesion: 0.22
Nodes (8): Comandos (rodar da raiz), Convenções e decisões (não quebrar), Estado atual, Estrutura, Gotchas do ambiente, graphify, PDI+ — contexto do projeto, Stack

### Community 16 - "canvas/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, box, num, pos, PUT(), runtime, setCanvas()

### Community 17 - "[id]/route.ts"
Cohesion: 0.40
Nodes (5): isoDate, PATCH(), patchSchema, runtime, updateAction()

### Community 19 - "pdi-repo.ts"
Cohesion: 0.19
Nodes (13): GROUP_COLORS, NOTE_COLORS, SEED_GROUPS, AreaSnapshot, CanvasPreset, NodeLayout, PdiCanvasState, PdiDoc (+5 more)

### Community 26 - "root/route.ts"
Cohesion: 0.50
Nodes (4): PATCH(), patchSchema, runtime, updateRoot()

### Community 28 - "canvas-presets/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, frameSchema, posSchema, presetSchema, PUT(), runtime, setCanvasPresets()

### Community 29 - "mongo.ts"
Cohesion: 0.60
Nodes (4): clientPromise(), connect(), getDb(), mongodb

### Community 30 - "Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)"
Cohesion: 0.20
Nodes (10): 0. Pré-requisitos de ambiente, 1. Fundação — Auth (Rodada 1), 2. Import manual — plano B (Rodada 5), 3. Canvas read-only (Rodada 2) + edição (Rodada 4), 4. Deep link Gemini (Rodada 4), 5. Modo gestor — share link (Rodada 4), 6. PWA (Rodada 4), 7. Extensão — apenas o que dá pra testar SEM tocar na plataforma real (+2 more)

### Community 31 - "Setup do ambiente — PDI+"
Cohesion: 0.22
Nodes (8): 1. Ferramentas, 2. MongoDB Atlas (banco), 3. Google OAuth (login), 4. Variáveis de ambiente, 5. Rodar, 6. Índices do MongoDB (opcional agora, necessário antes de produção), Problemas comuns, Setup do ambiente — PDI+

### Community 32 - "shapes/route.ts"
Cohesion: 0.40
Nodes (5): bodySchema, PUT(), runtime, setShapes(), shapeSchema

### Community 33 - "Prompt inicial — PDI+"
Cohesion: 0.33
Nodes (5): Prompt inicial — PDI+, Rodada 1 — Fundação e dados, Rodada 2 — Canvas read-only, Rodada 3 — Extensão Manifest V3, Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA

### Community 35 - "PDI+"
Cohesion: 0.33
Nodes (6): Documentação, Estado atual, Estrutura (monorepo pnpm), PDI+, Rodar localmente, Stack

### Community 36 - "addReportSnapshot"
Cohesion: 0.67
Nodes (3): POST(), runtime, addReportSnapshot()

## Knowledge Gaps
- **229 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+224 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 255 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ManualBuilder.tsx` to `pdi-to-graph.ts`, `PlanningView.tsx`, `auth.ts`, `web/package.json`, `insight.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `pdi-repo.ts` to `pdi-to-graph.ts`, `PlanningView.tsx`, `insight.ts`, `index.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `next-auth` connect `auth.ts` to `web/package.json`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _229 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdi-to-graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06018018018018018 - nodes in this community are weakly interconnected._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1014799154334038 - nodes in this community are weakly interconnected._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12923076923076923 - nodes in this community are weakly interconnected._