# Graph Report - desafioPdi  (2026-10-05)

## Corpus Check
- 100 files · ~51,211 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 612 nodes · 1216 edges · 47 communities (35 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ec0e2cbb`
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
- ProgressDashboard.tsx
- Root Package Config
- index.ts
- Progresso do PDI+
- PDI+ — Especificação Técnica
- pdi-repo.ts
- groups/route.ts
- PDI+ — contexto do projeto
- canvas/route.ts
- [id]/route.ts
- extension/README.md
- PdiCanvas.tsx
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports
- root/route.ts
- seed/route.ts
- nodes.tsx
- Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)
- Setup do ambiente — PDI+
- theme.ts
- Prompt inicial — PDI+
- README.md
- PDI+
- DetailPanel.tsx
- dependencies
- devDependencies
- layout.tsx
- canvas-presets/route.ts
- scripts
- Status
- share/route.ts
- apple-icon.tsx
- icon.tsx

## God Nodes (most connected - your core abstractions)
1. `formatPercent()` - 19 edges
2. `collection()` - 18 edges
3. `PdiDoc` - 18 edges
4. `react` - 16 edges
5. `brand` - 16 edges
6. `compilerOptions` - 16 edges
7. `getPdiByUserId()` - 14 edges
8. `layoutGraph()` - 14 edges
9. `mergePdi()` - 13 edges
10. `areaProgress()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `Canvas()` --calls--> `deriveAreaStatus()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/merge.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `AreaNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (47 total, 8 thin omitted)

### Community 0 - "pdi-to-graph.ts"
Cohesion: 0.19
Nodes (21): baseNodes(), computeFrames(), dagreEdges(), dirFor(), hugBox(), kanbanLayout(), Layout, layoutGraph() (+13 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.10
Nodes (35): pct(), PctBar(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+27 more)

### Community 2 - "auth.ts"
Cohesion: 0.13
Nodes (16): GET(), runtime, ImportPage(), Home(), PlanningPage(), ProgressPage(), { handlers, auth, signIn, signOut }, AppHeader() (+8 more)

### Community 3 - "web/package.json"
Cohesion: 0.11
Nodes (16): @types/node, typescript, vitest, zod, name, private, version, autoprefixer (+8 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "ManualBuilder.tsx"
Cohesion: 0.14
Nodes (21): ImportForm(), ImportTabs(), Tab, DraftArea, emptyAction(), emptyArea(), KINDS, ManualBuilder() (+13 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "ProgressDashboard.tsx"
Cohesion: 0.14
Nodes (19): GroupNode(), HistoricalSnapshotForm(), AreaBars(), buildDoneTimeline(), buildPlannedTimeline(), BurndownChart(), fmtDay(), MONTH_NAMES (+11 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "index.ts"
Cohesion: 0.05
Nodes (63): bodySchema, POST(), runtime, AIGroupingButton(), GeminiButton(), KINDS, addHistoricalSnapshot(), seedHugo (+55 more)

### Community 11 - "Progresso do PDI+"
Cohesion: 0.15
Nodes (13): ✅ Extra — Insight para 1-on-1 (Gemini), Progresso do PDI+, ⏭️ Próximas rodadas, ✅ Rodada 1 — Fundação, ✅ Rodada 2.5 — Blocos de agrupamento, ✅ Rodada 2 — Canvas visual, ✅ Rodada 5 — Import manual, ✅ Rodada 6 — Planejamento de capacidade (+5 more)

### Community 12 - "PDI+ — Especificação Técnica"
Cohesion: 0.10
Nodes (20): 10. Decisões de engenharia, 11. Riscos, 1. Visão, 2. Escopo e modelo de acesso, 3. Stack, 4. Arquitetura, 5. Modelo de dados (MongoDB), 6. Contrato da API (+12 more)

### Community 13 - "pdi-repo.ts"
Cohesion: 0.17
Nodes (17): createSchema, DELETE(), nodeId, POST(), runtime, POST(), runtime, clientPromise() (+9 more)

### Community 14 - "groups/route.ts"
Cohesion: 0.15
Nodes (13): PUT(), runtime, bodySchema, runtime, bodySchema, PUT(), runtime, setLooseCapacity() (+5 more)

### Community 15 - "PDI+ — contexto do projeto"
Cohesion: 0.22
Nodes (8): Comandos (rodar da raiz), Convenções e decisões (não quebrar), Estado atual, Estrutura, Gotchas do ambiente, graphify, PDI+ — contexto do projeto, Stack

### Community 16 - "canvas/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, box, num, pos, PUT(), runtime, setCanvas()

### Community 17 - "[id]/route.ts"
Cohesion: 0.40
Nodes (5): isoDate, PATCH(), patchSchema, runtime, updateAction()

### Community 19 - "PdiCanvas.tsx"
Cohesion: 0.12
Nodes (17): Canvas(), LAYOUTS, Pos, PosMap, UndoEntry, uuid(), getHelperLines(), HelperLinesResult (+9 more)

### Community 26 - "root/route.ts"
Cohesion: 0.50
Nodes (4): PATCH(), patchSchema, runtime, updateRoot()

### Community 28 - "seed/route.ts"
Cohesion: 0.22
Nodes (10): GET(), runtime, POST(), runtime, PUT(), POST(), runtime, applySync() (+2 more)

### Community 29 - "nodes.tsx"
Cohesion: 0.14
Nodes (13): ActionNode(), AreaNode(), borderStyle(), handleStyle, RootNode(), sourcePos(), targetPos(), BandNodeData (+5 more)

### Community 30 - "Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)"
Cohesion: 0.20
Nodes (10): 0. Pré-requisitos de ambiente, 1. Fundação — Auth (Rodada 1), 2. Import manual — plano B (Rodada 5), 3. Canvas read-only (Rodada 2) + edição (Rodada 4), 4. Deep link Gemini (Rodada 4), 5. Modo gestor — share link (Rodada 4), 6. PWA (Rodada 4), 7. Extensão — apenas o que dá pra testar SEM tocar na plataforma real (+2 more)

### Community 31 - "Setup do ambiente — PDI+"
Cohesion: 0.22
Nodes (8): 1. Ferramentas, 2. MongoDB Atlas (banco), 3. Google OAuth (login), 4. Variáveis de ambiente, 5. Rodar, 6. Índices do MongoDB (opcional agora, necessário antes de produção), Problemas comuns, Setup do ambiente — PDI+

### Community 32 - "theme.ts"
Cohesion: 0.18
Nodes (13): dynamic, SharedPdiPage(), edgeTypes, HelperLines(), selector(), nodeTypes, Canvas(), ReadOnlyCanvas() (+5 more)

### Community 33 - "Prompt inicial — PDI+"
Cohesion: 0.33
Nodes (5): Prompt inicial — PDI+, Rodada 1 — Fundação e dados, Rodada 2 — Canvas read-only, Rodada 3 — Extensão Manifest V3, Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA

### Community 35 - "PDI+"
Cohesion: 0.33
Nodes (6): Documentação, Estado atual, Estrutura (monorepo pnpm), PDI+, Rodar localmente, Stack

### Community 36 - "DetailPanel.tsx"
Cohesion: 0.21
Nodes (10): ActionEditor(), ActionPatch, DetailPanel(), EditableAction, STATUS_ORDER, StickyNote(), formatDate(), PdiNode (+2 more)

### Community 37 - "dependencies"
Cohesion: 0.18
Nodes (11): dependencies, @dagrejs/dagre, lucide-react, mongodb, next, next-auth, @pdi-mais/core, react (+3 more)

### Community 38 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 39 - "layout.tsx"
Cohesion: 0.25
Nodes (4): metadata, viewport, RegisterServiceWorker(), next

### Community 40 - "canvas-presets/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, frameSchema, posSchema, presetSchema, PUT(), runtime, setCanvasPresets()

### Community 41 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 42 - "Status"
Cohesion: 0.47
Nodes (6): PanelData, DraftAction, ActionNodeData, AreaNodeData, ActionKind, Status

### Community 43 - "share/route.ts"
Cohesion: 0.60
Nodes (4): DELETE(), POST(), runtime, setShareId()

## Knowledge Gaps
- **250 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+245 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 284 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ManualBuilder.tsx` to `theme.ts`, `PlanningView.tsx`, `auth.ts`, `web/package.json`, `layout.tsx`, `ProgressDashboard.tsx`, `index.ts`, `PdiCanvas.tsx`, `nodes.tsx`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `index.ts` to `theme.ts`, `PlanningView.tsx`, `auth.ts`, `pdi-to-graph.ts`, `ProgressDashboard.tsx`, `pdi-repo.ts`, `PdiCanvas.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `next-auth` connect `auth.ts` to `web/package.json`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _250 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10121951219512196 - nodes in this community are weakly interconnected._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12615384615384614 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._