# Graph Report - desafioPdi  (2026-09-11)

## Corpus Check
- 81 files · ~37,209 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 521 nodes · 984 edges · 31 communities (23 shown, 5 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a958e9e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pdi-to-graph.ts
- PlanningView.tsx
- app/page.tsx
- web/package.json
- core/package.json
- Web TypeScript Config
- schema.ts
- Core TypeScript Config
- index.ts
- Root Package Config
- pdi-repo.ts
- Progresso do PDI+
- PDI+ — Especificação Técnica
- collection
- canvas-presets/route.ts
- PDI+ — contexto do projeto
- canvas/route.ts
- [id]/route.ts
- extension/README.md
- auth.ts
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports
- root/route.ts
- groups/route.ts
- mongo.ts
- seed/route.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `formatPercent()` - 15 edges
3. `collection()` - 14 edges
4. `PdiDoc` - 14 edges
5. `overallProgress()` - 12 edges
6. `compilerOptions` - 12 edges
7. `PDI+ — Especificação Técnica` - 12 edges
8. `PlanningView()` - 11 edges
9. `Status` - 11 edges
10. `react` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Home()` --calls--> `overallProgress()`  [EXTRACTED]
  apps/web/src/app/page.tsx → packages/core/src/progress.ts
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `AreaNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (31 total, 5 thin omitted)

### Community 0 - "pdi-to-graph.ts"
Cohesion: 0.06
Nodes (63): DetailPanel(), PanelData, edgeTypes, HelperLines(), selector(), ActionNode(), AreaNode(), borderStyle() (+55 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.11
Nodes (33): Burndown(), pointOnPlanned(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+25 more)

### Community 2 - "app/page.tsx"
Cohesion: 0.18
Nodes (12): GET(), runtime, Home(), PlanningPage(), GroupNode(), PdiCanvas(), EmptyState(), formatDateTime() (+4 more)

### Community 3 - "web/package.json"
Cohesion: 0.04
Nodes (42): dependencies, @dagrejs/dagre, mongodb, next, next-auth, @pdi-mais/core, react, react-dom (+34 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "schema.ts"
Cohesion: 0.08
Nodes (34): ImportPage(), ImportForm(), ImportTabs(), DraftArea, emptyAction(), emptyArea(), KINDS, ManualBuilder() (+26 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "index.ts"
Cohesion: 0.11
Nodes (31): GeminiButton(), KINDS, seedHugo, actionId(), areaId(), COMBINING_MARKS, cyrb53(), normalizeTitle() (+23 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "pdi-repo.ts"
Cohesion: 0.19
Nodes (12): GROUP_COLORS, NOTE_COLORS, SEED_GROUPS, AreaSnapshot, CanvasPreset, NodeLayout, PdiCanvasState, PdiGroup (+4 more)

### Community 11 - "Progresso do PDI+"
Cohesion: 0.04
Nodes (40): Prompt inicial — PDI+, Rodada 1 — Fundação e dados, Rodada 2 — Canvas read-only, Rodada 3 — Extensão Manifest V3, Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA, ✅ Extra — Insight para 1-on-1 (Gemini), Progresso do PDI+, ⏭️ Próximas rodadas (+32 more)

### Community 12 - "PDI+ — Especificação Técnica"
Cohesion: 0.10
Nodes (20): 10. Decisões de engenharia, 11. Riscos, 1. Visão, 2. Escopo e modelo de acesso, 3. Stack, 4. Arquitetura, 5. Modelo de dados (MongoDB), 6. Contrato da API (+12 more)

### Community 13 - "collection"
Cohesion: 0.24
Nodes (10): createSchema, DELETE(), nodeId, POST(), runtime, addLink(), collection(), ensureIndexes() (+2 more)

### Community 14 - "canvas-presets/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, frameSchema, posSchema, presetSchema, PUT(), runtime, setCanvasPresets()

### Community 15 - "PDI+ — contexto do projeto"
Cohesion: 0.22
Nodes (8): Comandos (rodar da raiz), Convenções e decisões (não quebrar), Estado atual, Estrutura, Gotchas do ambiente, graphify, PDI+ — contexto do projeto, Stack

### Community 16 - "canvas/route.ts"
Cohesion: 0.29
Nodes (7): bodySchema, box, num, pos, PUT(), runtime, setCanvas()

### Community 17 - "[id]/route.ts"
Cohesion: 0.40
Nodes (5): isoDate, PATCH(), patchSchema, runtime, updateAction()

### Community 19 - "auth.ts"
Cohesion: 0.20
Nodes (7): POST(), runtime, { handlers, auth, signIn, signOut }, addReportSnapshot(), next-auth, Session, next-auth

### Community 26 - "root/route.ts"
Cohesion: 0.50
Nodes (4): PATCH(), patchSchema, runtime, updateRoot()

### Community 28 - "groups/route.ts"
Cohesion: 0.21
Nodes (10): PUT(), runtime, bodySchema, PUT(), runtime, setGroups(), setLooseCapacity(), groupSchema (+2 more)

### Community 29 - "mongo.ts"
Cohesion: 0.60
Nodes (4): clientPromise(), connect(), getDb(), mongodb

### Community 33 - "seed/route.ts"
Cohesion: 0.25
Nodes (8): GET(), runtime, POST(), runtime, POST(), runtime, applySync(), resolveSeedGroups()

## Knowledge Gaps
- **222 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+217 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 248 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `schema.ts` to `pdi-to-graph.ts`, `PlanningView.tsx`, `app/page.tsx`, `web/package.json`, `index.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `index.ts` to `pdi-to-graph.ts`, `PlanningView.tsx`, `app/page.tsx`, `pdi-repo.ts`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `next-auth` connect `auth.ts` to `web/package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdi-to-graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05600722673893405 - nodes in this community are weakly interconnected._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11219512195121951 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._