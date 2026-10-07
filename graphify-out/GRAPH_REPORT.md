# Graph Report - desafioPdi  (2026-10-07)

## Corpus Check
- 108 files · ~55,769 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 668 nodes · 1302 edges · 50 communities (37 shown, 8 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 23 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `de95ddef`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- index.ts
- PlanningView.tsx
- auth.ts
- web/package.json
- core/package.json
- Web TypeScript Config
- schema.ts
- Core TypeScript Config
- manager/route.ts
- Root Package Config
- ProgressDashboard.tsx
- Progresso do PDI+
- PDI+ — Especificação Técnica
- link/route.ts
- groups/route.ts
- PDI+ — contexto do projeto
- canvas/route.ts
- [id]/route.ts
- @pdi-mais/extension — Rodada 3 (v0.4, aguardando aval de TI/Segurança)
- background.js
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports
- collection
- pdi-repo.ts
- pdi-to-graph.ts
- Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)
- Setup do ambiente — PDI+
- Prompt inicial — PDI+
- README.md
- PDI+
- backfill/route.ts
- dependencies
- devDependencies
- layout.tsx
- canvas-presets/route.ts
- scripts
- popup.js
- shapes/route.ts
- apple-icon.tsx
- icon.tsx
- manifest.json
- extract.js
- mongo.ts

## God Nodes (most connected - your core abstractions)
1. `formatPercent()` - 21 edges
2. `collection()` - 20 edges
3. `brand` - 18 edges
4. `PdiDoc` - 18 edges
5. `react` - 16 edges
6. `getPdiByUserId()` - 16 edges
7. `compilerOptions` - 16 edges
8. `layoutGraph()` - 15 edges
9. `overallProgress()` - 15 edges
10. `mergePdi()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `HistoricalSnapshotForm()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/HistoricalSnapshotForm.tsx → packages/core/src/progress.ts
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `Canvas()` --calls--> `deriveAreaStatus()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/merge.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (50 total, 8 thin omitted)

### Community 0 - "index.ts"
Cohesion: 0.08
Nodes (36): GET(), runtime, POST(), runtime, POST(), runtime, AIGroupingButton(), applySync() (+28 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.10
Nodes (35): pct(), PctBar(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+27 more)

### Community 2 - "auth.ts"
Cohesion: 0.11
Nodes (20): GET(), runtime, DELETE(), POST(), runtime, TeamMemberPage(), Home(), PlanningPage() (+12 more)

### Community 3 - "web/package.json"
Cohesion: 0.11
Nodes (16): @types/node, typescript, vitest, zod, name, private, version, autoprefixer (+8 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "schema.ts"
Cohesion: 0.08
Nodes (36): ImportPage(), HistoricalSnapshotForm(), ImportForm(), ImportTabs(), Tab, DraftArea, emptyAction(), emptyArea() (+28 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "manager/route.ts"
Cohesion: 0.50
Nodes (4): bodySchema, PUT(), runtime, setManagerEmail()

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "ProgressDashboard.tsx"
Cohesion: 0.09
Nodes (35): EquipePage(), GroupNode(), GeminiButton(), KINDS, AreaBars(), buildDoneTimeline(), buildPlannedTimeline(), BurndownChart() (+27 more)

### Community 11 - "Progresso do PDI+"
Cohesion: 0.15
Nodes (13): ✅ Extra — Insight para 1-on-1 (Gemini), Progresso do PDI+, ⏭️ Próximas rodadas, ✅ Rodada 1 — Fundação, ✅ Rodada 2.5 — Blocos de agrupamento, ✅ Rodada 2 — Canvas visual, ✅ Rodada 5 — Import manual, ✅ Rodada 6 — Planejamento de capacidade (+5 more)

### Community 12 - "PDI+ — Especificação Técnica"
Cohesion: 0.10
Nodes (20): 10. Decisões de engenharia, 11. Riscos, 1. Visão, 2. Escopo e modelo de acesso, 3. Stack, 4. Arquitetura, 5. Modelo de dados (MongoDB), 6. Contrato da API (+12 more)

### Community 13 - "link/route.ts"
Cohesion: 0.28
Nodes (8): createSchema, DELETE(), nodeId, POST(), runtime, addLink(), nodeIdSet(), removeLink()

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

### Community 18 - "@pdi-mais/extension — Rodada 3 (v0.4, aguardando aval de TI/Segurança)"
Cohesion: 0.25
Nodes (7): Botão "PDI+" dentro do Qulture.rocks, Como testar localmente, Estrutura, Limitação conhecida (ainda não testada contra a página real), @pdi-mais/extension — Rodada 3 (v0.4, aguardando aval de TI/Segurança), Por que não chama a API direto, Por que tem um `background.js` (service worker)

### Community 19 - "background.js"
Cohesion: 0.35
Nodes (9): closeHiddenWindow(), fillAndSubmitImport(), waitFor(), openHiddenWindow(), revealWindow(), runSync(), sendProgress(), sleep() (+1 more)

### Community 26 - "collection"
Cohesion: 0.22
Nodes (9): PATCH(), patchSchema, runtime, SharedPdiPage(), collection(), ensureIndexes(), getPdiByShareId(), getPdisSharedWithManager() (+1 more)

### Community 28 - "pdi-repo.ts"
Cohesion: 0.27
Nodes (9): AreaSnapshot, CanvasPreset, NodeLayout, PdiCanvasState, PdiLink, PdiRoot, PdiShape, ProgressSnapshot (+1 more)

### Community 29 - "pdi-to-graph.ts"
Cohesion: 0.05
Nodes (72): dynamic, dynamic, ActionEditor(), ActionPatch, DetailPanel(), EditableAction, PanelData, STATUS_ORDER (+64 more)

### Community 30 - "Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)"
Cohesion: 0.20
Nodes (10): 0. Pré-requisitos de ambiente, 1. Fundação — Auth (Rodada 1), 2. Import manual — plano B (Rodada 5), 3. Canvas read-only (Rodada 2) + edição (Rodada 4), 4. Deep link Gemini (Rodada 4), 5. Modo gestor — share link (Rodada 4), 6. PWA (Rodada 4), 7. Extensão — apenas o que dá pra testar SEM tocar na plataforma real (+2 more)

### Community 31 - "Setup do ambiente — PDI+"
Cohesion: 0.22
Nodes (8): 1. Ferramentas, 2. MongoDB Atlas (banco), 3. Google OAuth (login), 4. Variáveis de ambiente, 5. Rodar, 6. Índices do MongoDB (opcional agora, necessário antes de produção), Problemas comuns, Setup do ambiente — PDI+

### Community 33 - "Prompt inicial — PDI+"
Cohesion: 0.33
Nodes (5): Prompt inicial — PDI+, Rodada 1 — Fundação e dados, Rodada 2 — Canvas read-only, Rodada 3 — Extensão Manifest V3, Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA

### Community 35 - "PDI+"
Cohesion: 0.33
Nodes (6): Documentação, Estado atual, Estrutura (monorepo pnpm), PDI+, Rodar localmente, Stack

### Community 36 - "backfill/route.ts"
Cohesion: 0.24
Nodes (8): bodySchema, POST(), runtime, POST(), runtime, addHistoricalSnapshot(), addReportSnapshot(), appendSnapshot()

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

### Community 42 - "popup.js"
Cohesion: 0.29
Nodes (5): copyBtn, out, runBtn, statusEl, urlInput

### Community 43 - "shapes/route.ts"
Cohesion: 0.40
Nodes (5): bodySchema, PUT(), runtime, setShapes(), shapeSchema

### Community 48 - "manifest.json"
Cohesion: 0.15
Nodes (12): action, default_popup, background, service_worker, content_scripts, description, host_permissions, manifest_version (+4 more)

### Community 50 - "mongo.ts"
Cohesion: 0.60
Nodes (4): clientPromise(), connect(), getDb(), mongodb

## Knowledge Gaps
- **273 isolated node(s):** `manifest_version`, `name`, `version`, `description`, `default_popup` (+268 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 313 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `schema.ts` to `index.ts`, `PlanningView.tsx`, `auth.ts`, `web/package.json`, `layout.tsx`, `ProgressDashboard.tsx`, `pdi-to-graph.ts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `next-auth` connect `auth.ts` to `web/package.json`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `ProgressDashboard.tsx` to `index.ts`, `PlanningView.tsx`, `auth.ts`, `pdi-repo.ts`, `pdi-to-graph.ts`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `manifest_version`, `name`, `version` to the rest of the system?**
  _273 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08408163265306122 - nodes in this community are weakly interconnected._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10299003322259136 - nodes in this community are weakly interconnected._
- **Should `auth.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10685483870967742 - nodes in this community are weakly interconnected._