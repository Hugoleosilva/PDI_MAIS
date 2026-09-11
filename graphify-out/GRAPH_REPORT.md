# Graph Report - desafioPdi  (2026-09-11)

## Corpus Check
- 80 files · ~35,279 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 509 nodes · 963 edges · 28 communities (18 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `740f73e9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- pdi-to-graph.ts
- PlanningView.tsx
- ManualBuilder.tsx
- web/package.json
- core/package.json
- Web TypeScript Config
- index.ts
- Core TypeScript Config
- app/page.tsx
- Root Package Config
- pdi-repo.ts
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

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `formatPercent()` - 15 edges
3. `PdiDoc` - 14 edges
4. `collection()` - 13 edges
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

## Communities (28 total, 7 thin omitted)

### Community 0 - "pdi-to-graph.ts"
Cohesion: 0.06
Nodes (61): DetailPanel(), PanelData, edgeTypes, HelperLines(), selector(), ActionNode(), AreaNode(), borderStyle() (+53 more)

### Community 1 - "PlanningView.tsx"
Cohesion: 0.11
Nodes (34): Burndown(), pointOnPlanned(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+26 more)

### Community 2 - "ManualBuilder.tsx"
Cohesion: 0.13
Nodes (22): ImportPage(), ImportForm(), ImportTabs(), DraftArea, emptyAction(), emptyArea(), KINDS, ManualBuilder() (+14 more)

### Community 3 - "web/package.json"
Cohesion: 0.13
Nodes (14): @types/node, typescript, vitest, zod, name, private, version, autoprefixer (+6 more)

### Community 4 - "core/package.json"
Cohesion: 0.10
Nodes (20): dependencies, zod, devDependencies, @types/node, typescript, vitest, exports, @types/node (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "index.ts"
Cohesion: 0.07
Nodes (52): GeminiButton(), KINDS, Layout, groups, pdi, seedHugo, NOTE_COLORS, SEED_GROUPS (+44 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "app/page.tsx"
Cohesion: 0.18
Nodes (12): GET(), runtime, Home(), PlanningPage(), GroupNode(), PdiCanvas(), EmptyState(), formatDateTime() (+4 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "pdi-repo.ts"
Cohesion: 0.05
Nodes (54): GET(), runtime, POST(), runtime, isoDate, PATCH(), patchSchema, runtime (+46 more)

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

## Knowledge Gaps
- **217 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 242 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `ManualBuilder.tsx` to `pdi-to-graph.ts`, `PlanningView.tsx`, `web/package.json`, `index.ts`, `app/page.tsx`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `PdiDoc` connect `index.ts` to `pdi-to-graph.ts`, `PlanningView.tsx`, `pdi-repo.ts`, `app/page.tsx`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `next-auth` connect `Auth Session Types` to `pdi-repo.ts`, `web/package.json`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _217 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `pdi-to-graph.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05960705960705961 - nodes in this community are weakly interconnected._
- **Should `PlanningView.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11033681765389082 - nodes in this community are weakly interconnected._
- **Should `ManualBuilder.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12698412698412698 - nodes in this community are weakly interconnected._