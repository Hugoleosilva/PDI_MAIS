# Graph Report - desafioPdi  (2026-09-11)

## Corpus Check
- 81 files · ~36,637 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 519 nodes · 982 edges · 28 communities (18 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a1ddb80`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pdi-to-graph.ts
- PlanningView.tsx
- web/package.json
- core/package.json
- Web TypeScript Config
- schema.ts
- Core TypeScript Config
- types.ts
- Root Package Config
- Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)
- PDI+ — Especificação Técnica
- dependencies
- devDependencies
- PDI+ — contexto do projeto
- scripts
- layout.tsx
- extension/README.md
- Auth Session Types
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports
- tailwindcss
- pdi-repo.ts
- index.ts

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
- `Home()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/app/page.tsx → packages/core/src/progress.ts
- `ReportButton()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/ReportButton.tsx → packages/core/src/progress.ts
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (28 total, 7 thin omitted)

### Community 0 - "pdi-to-graph.ts"
Cohesion: 0.06
Nodes (64): DetailPanel(), PanelData, edgeTypes, HelperLines(), selector(), ActionNode(), AreaNode(), borderStyle() (+56 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.10
Nodes (36): GroupNode(), Burndown(), pointOnPlanned(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView() (+28 more)

### Community 3 - "web/package.json"
Cohesion: 0.13
Nodes (14): @types/node, typescript, vitest, zod, name, private, version, autoprefixer (+6 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "schema.ts"
Cohesion: 0.09
Nodes (33): ImportPage(), ImportForm(), ImportTabs(), DraftArea, emptyAction(), emptyArea(), KINDS, ManualBuilder() (+25 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "types.ts"
Cohesion: 0.09
Nodes (32): Home(), PdiCanvas(), EmptyState(), GeminiButton(), KINDS, formatDateTime(), ReportButton(), ASKS (+24 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 11 - "Checklist de Testes Manuais — PDI+ MVP (Rodadas 1–5)"
Cohesion: 0.05
Nodes (39): Prompt inicial — PDI+, Rodada 1 — Fundação e dados, Rodada 2 — Canvas read-only, Rodada 3 — Extensão Manifest V3, Rodada 4 — Drawer, edição manual, Gemini, modo gestor, PWA, ✅ Extra — Insight para 1-on-1 (Gemini), Progresso do PDI+, ⏭️ Próximas rodadas (+31 more)

### Community 12 - "PDI+ — Especificação Técnica"
Cohesion: 0.10
Nodes (20): 10. Decisões de engenharia, 11. Riscos, 1. Visão, 2. Escopo e modelo de acesso, 3. Stack, 4. Arquitetura, 5. Modelo de dados (MongoDB), 6. Contrato da API (+12 more)

### Community 13 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, @dagrejs/dagre, mongodb, next, next-auth, @pdi-mais/core, react, react-dom (+2 more)

### Community 14 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, @types/react-dom, typescript (+1 more)

### Community 15 - "PDI+ — contexto do projeto"
Cohesion: 0.22
Nodes (8): Comandos (rodar da raiz), Convenções e decisões (não quebrar), Estado atual, Estrutura, Gotchas do ambiente, graphify, PDI+ — contexto do projeto, Stack

### Community 16 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, build, dev, start, test, typecheck

### Community 19 - "Auth Session Types"
Cohesion: 0.50
Nodes (3): next-auth, Session, next-auth

### Community 28 - "pdi-repo.ts"
Cohesion: 0.05
Nodes (55): isoDate, PATCH(), patchSchema, runtime, bodySchema, frameSchema, posSchema, presetSchema (+47 more)

### Community 33 - "index.ts"
Cohesion: 0.12
Nodes (24): GET(), runtime, POST(), runtime, POST(), runtime, applySync(), Layout (+16 more)

## Knowledge Gaps
- **221 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+216 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 246 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `schema.ts` to `pdi-to-graph.ts`, `types.ts`, `web/package.json`, `PlanningView.tsx`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `types.ts` to `pdi-to-graph.ts`, `PlanningView.tsx`, `pdi-repo.ts`, `index.ts`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `next-auth` connect `Auth Session Types` to `web/package.json`, `pdi-repo.ts`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _221 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdi-to-graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05630834086118639 - nodes in this community are weakly interconnected._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10359408033826638 - nodes in this community are weakly interconnected._
- **Should `web/package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._