# Graph Report - desafioPdi  (2026-09-10)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 404 nodes · 816 edges · 26 communities (20 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 22 edges (avg confidence: 0.85)
- Token cost: 25,172 input · 1,296 output

## Graph Freshness
- Built from commit: `215b7959`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Canvas Nodes & Edges
- Planning & Burndown View
- Import & ID Generation
- Web App Dependencies
- Core Package Config
- Web TypeScript Config
- Import UI Components
- Core TypeScript Config
- Main Page & Gemini Insight
- Root Package Config
- Link API & Repository
- Auth & Page Routes
- Groups & Seed API
- Canvas State API
- Import & Sync API
- Capacity API & Schema
- Action Update API
- Root PDI Update API
- MongoDB Connection
- Auth Session Types
- Next.js Config
- Next.js Type Declarations
- CSS Type Declarations
- HTTP Method Exports

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `PdiDoc` - 12 edges
3. `collection()` - 12 edges
4. `formatPercent()` - 12 edges
5. `compilerOptions` - 12 edges
6. `Status` - 11 edges
7. `PlanningView()` - 11 edges
8. `layoutGraph()` - 10 edges
9. `projectFromActions()` - 10 edges
10. `getPdiByUserId()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `DetailPanel()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/DetailPanel.tsx → packages/core/src/progress.ts
- `AreaNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `RootNode()` --calls--> `formatPercent()`  [EXTRACTED]
  apps/web/src/components/canvas/nodes.tsx → packages/core/src/progress.ts
- `Canvas()` --calls--> `resolveSeedGroups()`  [EXTRACTED]
  apps/web/src/components/canvas/PdiCanvas.tsx → packages/core/src/groups.ts
- `Home()` --calls--> `overallProgress()`  [EXTRACTED]
  apps/web/src/app/page.tsx → packages/core/src/progress.ts

## Import Cycles
- None detected.

## Communities (26 total, 4 thin omitted)

### Community 0 - "Canvas Nodes & Edges"
Cohesion: 0.06
Nodes (65): DetailPanel(), PanelData, edgeTypes, HelperLines(), selector(), ActionNode(), AreaNode(), borderStyle() (+57 more)

### Community 1 - "Planning & Burndown View"
Cohesion: 0.09
Nodes (41): Burndown(), pointOnPlanned(), addDays(), daysBetween(), num(), PLAN_BADGE, PlanningView(), ProgMode (+33 more)

### Community 2 - "Import & ID Generation"
Cohesion: 0.08
Nodes (36): RFC-4180, seedHugo, actionId(), areaId(), COMBINING_MARKS, cyrb53(), normalizeTitle(), stableId() (+28 more)

### Community 3 - "Web App Dependencies"
Cohesion: 0.04
Nodes (41): dependencies, @dagrejs/dagre, mongodb, next, next-auth, @pdi-mais/core, react, react-dom (+33 more)

### Community 4 - "Core Package Config"
Cohesion: 0.10
Nodes (20): @types/node, typescript, dependencies, zod, devDependencies, @types/node, typescript, vitest (+12 more)

### Community 5 - "Web TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "Import UI Components"
Cohesion: 0.26
Nodes (10): ImportForm(), ImportTabs(), DraftArea, emptyAction(), emptyArea(), KINDS, ManualBuilder(), STATUSES (+2 more)

### Community 7 - "Core TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, declaration, esModuleInterop, forceConsistentCasingInFileNames, lib, module, moduleResolution, noEmit (+5 more)

### Community 8 - "Main Page & Gemini Insight"
Cohesion: 0.24
Nodes (9): Home(), PdiCanvas(), EmptyState(), GeminiButton(), br(), buildInsightPrompt(), ACTION_STATUS_LABEL, AREA_STATUS_LABEL (+1 more)

### Community 9 - "Root Package Config"
Cohesion: 0.15
Nodes (12): engines, node, name, packageManager, private, scripts, build, dev (+4 more)

### Community 10 - "Link API & Repository"
Cohesion: 0.29
Nodes (10): createSchema, DELETE(), nodeId, POST(), runtime, addLink(), collection(), ensureIndexes() (+2 more)

### Community 11 - "Auth & Page Routes"
Cohesion: 0.27
Nodes (6): GET(), runtime, ImportPage(), PlanningPage(), { handlers, auth, signIn, signOut }, getPdiByUserId()

### Community 12 - "Groups & Seed API"
Cohesion: 0.27
Nodes (8): GET(), runtime, bodySchema, groupSchema, PUT(), runtime, setGroups(), resolveSeedGroups()

### Community 13 - "Canvas State API"
Cohesion: 0.29
Nodes (7): bodySchema, box, num, pos, PUT(), runtime, setCanvas()

### Community 14 - "Import & Sync API"
Cohesion: 0.38
Nodes (5): POST(), runtime, POST(), runtime, applySync()

### Community 15 - "Capacity API & Schema"
Cohesion: 0.38
Nodes (5): PUT(), runtime, setLooseCapacity(), hours, weekCapacitySchema

### Community 16 - "Action Update API"
Cohesion: 0.40
Nodes (5): isoDate, PATCH(), patchSchema, runtime, updateAction()

### Community 17 - "Root PDI Update API"
Cohesion: 0.50
Nodes (4): PATCH(), patchSchema, runtime, updateRoot()

### Community 18 - "MongoDB Connection"
Cohesion: 0.83
Nodes (3): clientPromise(), connect(), getDb()

### Community 19 - "Auth Session Types"
Cohesion: 0.50
Nodes (3): next-auth, Session, next-auth

## Knowledge Gaps
- **151 isolated node(s):** `Pos`, `PosMap`, `UndoEntry`, `HelperLinesResult`, `ProgMode` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 172 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Import UI Components` to `Canvas Nodes & Edges`, `Main Page & Gemini Insight`, `Web App Dependencies`, `Planning & Burndown View`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Why does `next-auth` connect `Auth Session Types` to `Auth & Page Routes`, `Web App Dependencies`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `@xyflow/react` connect `Canvas Nodes & Edges` to `Web App Dependencies`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **What connects `Pos`, `PosMap`, `UndoEntry` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Canvas Nodes & Edges` be split into smaller, more focused modules?**
  _Cohesion score 0.055364314400458976 - nodes in this community are weakly interconnected._
- **Should `Planning & Burndown View` be split into smaller, more focused modules?**
  _Cohesion score 0.08941176470588236 - nodes in this community are weakly interconnected._
- **Should `Import & ID Generation` be split into smaller, more focused modules?**
  _Cohesion score 0.08405797101449275 - nodes in this community are weakly interconnected._