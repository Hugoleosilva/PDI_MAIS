Relatório de Arquitetura — PDI+

Projeto: PDI+ (repositório github.com/Hugoleosilva/PDI_MAIS)
Autor: Hugo Silva — CESAR
Atualizado: 10/09/2026

Este documento descreve a arquitetura do PDI+, as decisões de projeto e o
motivo de cada uma, a estrutura de pastas e responsabilidades, e a extensão
de navegador (Chrome Manifest V3): como é construída, configurada, instalada
e por que ela existe.


================================================================================
1. VISÃO GERAL
================================================================================

O PDI+ transforma o Plano de Desenvolvimento Individual (PDI) — hoje uma
tabela estática na plataforma corporativa — num roadmap visual e interativo:
um canvas no estilo Miro/FigJam, com áreas de desenvolvimento, ações,
progresso, blocos de agrupamento e conexões. O objetivo é dar clareza do
caminho percorrido e dos próximos passos, e produzir insumos para as
reuniões de 1-on-1 com o gestor.

O sistema tem três formas de entrada de dados, em ordem de esforço:

  a) Extensão do navegador (Manifest V3) — lê o PDI direto da tela da
     plataforma e sincroniza com um clique. É o caminho ideal (zero
     digitação), mas depende de aprovação da TI/Segurança do CESAR.
  b) Import manual — o usuário cola uma tabela / CSV ou preenche um
     formulário campo a campo. É o "plano B" e já está pronto.
  c) Edição direta no canvas — ajustes pontuais de status, prazo e notas.

A saída principal, além da visualização, é o botão "Insight para 1-on-1":
gera um prompt pronto com todo o PDI para o usuário colar no Gemini e
receber um resumo executivo (entregas, riscos de prazo, lacunas e
argumentos para pedir apoio).


================================================================================
2. PRINCÍPIO DE ARQUITETURA: LÓGICA FORA DO FRAMEWORK
================================================================================

A decisão estruturante do projeto é separar a REGRA DE NEGÓCIO da
APLICAÇÃO WEB.

  - Toda a lógica que descreve "o que é um PDI e como ele se comporta" vive
    num pacote isolado, `packages/core`, escrito em TypeScript puro, sem
    React, sem Next.js, sem acesso a rede ou banco. São funções que recebem
    dados e devolvem dados.

  - A aplicação web, `apps/web`, cuida de tudo que é "mundo real":
    autenticação, banco de dados, rotas HTTP, renderização, canvas.

Por que essa divisão:

  1. Testabilidade. `packages/core` é testado com Vitest em milissegundos,
     sem subir servidor nem navegador. Hoje são 16 testes cobrindo o
     merge, o parser de import, o cálculo de progresso, os IDs e o prompt
     do Gemini.

  2. Reuso na extensão. A extensão do navegador vai precisar exatamente
     das mesmas regras (normalizar títulos, montar a payload, mapear os
     rótulos "Não iniciado / Em progresso / Finalizado" para os valores
     internos). Com a lógica no `core`, a extensão importa o mesmo pacote
     em vez de reimplementar — e não corre risco de divergir da web.

  3. Portabilidade. Se um dia o componente de roadmap virar uma feature
     nativa da plataforma de PDI da empresa, a regra de negócio já está
     empacotada e desacoplada da UI.

  4. Clareza de responsabilidade. Um bug de "o status da área está errado"
     é sempre no `core`; um bug de "o card não arrasta" é sempre na web.


================================================================================
3. MONOREPO
================================================================================

O projeto é um monorepo gerenciado com pnpm workspaces.

  pdi-mais/
  ├── pnpm-workspace.yaml     -> declara os pacotes (apps/*, packages/*)
  ├── package.json            -> scripts raiz (dev, build, test, typecheck)
  ├── apps/
  │   ├── web/                -> a aplicação Next.js (PWA)
  │   └── extension/          -> a extensão Chrome (placeholder por enquanto)
  └── packages/
      └── core/               -> regra de negócio, TypeScript puro

Por que monorepo:

  - `apps/web` e `apps/extension` compartilham `packages/core` sem publicar
    pacote em registry nem versionar manualmente. `apps/web` referencia
    `"@pdi-mais/core": "workspace:*"` e o Next transpila o TypeScript do
    core diretamente (via `transpilePackages`), sem passo de build
    intermediário.

  - Um `pnpm install` na raiz resolve tudo. Um `pnpm typecheck` roda em
    todos os pacotes. As mudanças no `core` refletem na hora na web e na
    extensão.

  - Menos repositórios para clonar, revisar e configurar CI.


================================================================================
4. STACK E JUSTIFICATIVAS
================================================================================

Framework web: Next.js 15 (App Router)
  - Backend e frontend no mesmo projeto: as rotas de API (`/api/...`) e as
    páginas convivem. Não há um servidor Express separado para manter.
  - Server Components para as telas que só leem dados (o canvas recebe o
    PDI já carregado do servidor, sem "loading spinner").
  - Caminho natural para PWA (manifest, service worker) na Rodada 4.
  - Deploy trivial na Vercel.

Autenticação: Auth.js v5 (NextAuth) + Google OAuth
  - Login social: não guardamos nem validamos senhas.
  - Estratégia de sessão JWT, SEM adapter de banco. Não criamos tabelas de
    usuários/sessões. A identidade é o `sub` do Google, exposto em
    `session.user.id`. O dado do PDI é do próprio usuário, então não há
    necessidade de um registro de "usuário" no nosso banco.
  - O provider Google lê `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` do ambiente.

Banco: MongoDB Atlas
  - Um documento por usuário na coleção `pdis`, indexado por `userId`
    (único). O PDI é uma estrutura aninhada (áreas contêm ações); guardar
    como documento único elimina joins e faz a leitura ser O(1) por índice.
  - `shareId` com índice único + sparse, para o link read-only do gestor.

Canvas: React Flow (`@xyflow/react`) + Dagre (`@dagrejs/dagre`)
  - React Flow entrega zoom, pan, nós customizados, arestas, seleção e
    redimensionamento prontos. Reescrever isso seria semanas de trabalho.
  - Dagre calcula o layout automático da árvore (raiz -> áreas -> ações),
    inclusive com "clusters" (grafo composto) para manter as áreas de um
    mesmo bloco agrupadas.

Estilo: Tailwind CSS
  - Estilização rápida, consistente, com tema claro fixado
    (`color-scheme: light`).

Validação: Zod
  - Todo corpo de requisição é validado com um schema Zod antes de tocar o
    banco. Os schemas também fazem a conversão dos rótulos da plataforma
    ("Desenvolver", "Treinamento e estudo", "Não iniciado") para os valores
    canônicos internos.

Testes: Vitest
  - Rápido, mesma API do Jest, roda o TypeScript do `core` sem build.

Deploy: Vercel (CI/CD contínuo, SSL, suporte nativo a Next.js).


================================================================================
5. ESTRUTURA DE PASTAS E RESPONSABILIDADES
================================================================================

--------------------------------------------------------------------------------
packages/core/src/   — REGRA DE NEGÓCIO (TypeScript puro, testado)
--------------------------------------------------------------------------------

  types.ts
    O modelo do PDI: `PdiDoc`, `PdiRoot`, `Area`, `Action`, `PdiLink`
    (conexões manuais), `PdiGroup` (blocos), `PdiCanvasState` (posições e
    frames salvos), `Status`, `AreaKind`, `ActionKind`. É a "fonte de
    verdade" da forma dos dados; tudo o mais deriva daqui.

  labels.ts
    Tradução entre os RÓTULOS da plataforma corporativa e os VALORES
    internos. A plataforma diz "Não iniciada" (área, feminino) e
    "Não iniciado" (ação, masculino); internamente é sempre `todo`. Também
    mapeia "Desenvolver / Potencializar" e os tipos de ação
    ("Desafio profissional", "Treinamento e estudo", "Mentoria e feedbacks").
    Centralizar isso evita `if` de string espalhado pelo código.

  progress.ts
    `areaProgress` (ações concluídas ÷ total da área) e `overallProgress`
    (MÉDIA dos percentuais das áreas — comportamento confirmado observando
    a plataforma real: o progresso geral não é o total global de ações).
    `hasNotStarted` (a área tem alguma ação não iniciada — corresponde ao
    ícone de relógio da plataforma). `formatPercent` em pt-BR.

  ids.ts
    Gera um ID DETERMINÍSTICO para cada área e ação a partir do título
    normalizado (sem acento, sem caixa, espaços colapsados), usando um hash
    puro em JavaScript (cyrb53 — não criptográfico, só para casar
    registros). Consequência: sincronizar duas vezes o mesmo PDI não
    duplica nem perde nada, porque os IDs são estáveis.

  schema.ts
    Schemas Zod da payload de sincronização. `incomingActionSchema` e
    `incomingAreaSchema` aceitam tanto o rótulo da plataforma quanto o valor
    canônico e fazem a conversão via transform. Exporta `SyncPayloadInput`
    (o que se digita) e `SyncPayload` (o que sai do schema, já convertido).

  merge.ts
    O coração do sistema: `mergePdi(existente, payload, opts)`. Recebe o
    documento atual e uma nova payload de sincronização, e devolve o
    documento resultante com estas garantias:
      - Idempotente: rodar o mesmo sync duas vezes dá o mesmo resultado
        (IDs determinísticos).
      - Preserva edições locais: posição no canvas (`layout`), descrições,
        `root.note`, e o estado visual do canvas nunca são apagados por um
        sync.
      - Ações marcadas como `source: "manual"` mantêm o status e o prazo
        que o usuário definiu; o sync só atualiza o título e o tipo.
      - Recalcula o status derivado da área e faz o "prune": remove
        referências, em `links` e `groups`, a nós que sumiram do PDI.

  groups.ts
    Os blocos estratégicos de agrupamento. `SEED_GROUPS` traz os 5 blocos
    sugeridos para o PDI do Hugo (Core Full-Stack, Inteligência/IA,
    Plataforma/Dados, Institucional & Carreira, Opcional/Low-Code) mapeados
    por título de área; `resolveSeedGroups` troca os títulos pelos IDs
    reais do documento. `groupOfArea` monta o mapa área -> bloco.
    `GROUP_COLORS` é a paleta.

  import.ts
    `parseImportTable(texto, root)`: converte uma tabela colada ou CSV numa
    payload. Tem um tokenizador estilo RFC 4180 (campos entre aspas podem
    ter vírgula e quebra de linha), detecta o separador sozinho (vírgula,
    ponto-e-vírgula ou tab), ignora o cabeçalho e normaliza datas
    (DD/MM/AAAA, DD/MM/AA, AAAA-MM-DD). É "sync parcial": linha com área ou
    ação vazia vira aviso e é ignorada; status desconhecido vira
    "Não iniciado" com aviso; prazo inválido -> ação sem prazo. O resto
    sempre entra.

  insight.ts
    `buildInsightPrompt(pdi)`: monta o texto que o usuário cola no Gemini
    — ciclo, trilha, progresso geral, cada área com status/percentual/
    descrição, cada ação com status/prazo/contexto, e o pedido de resumo
    executivo para a 1-on-1.

  fixtures/seed-hugo.ts
    O PDI real do Hugo (8 áreas, 32 ações), transcrito das telas da
    plataforma. Usado só em desenvolvimento, pela rota `/api/dev/seed`,
    para popular o canvas sem depender da extensão nem do import manual.

  index.ts
    Reexporta tudo. É o único ponto de entrada do pacote.

--------------------------------------------------------------------------------
apps/web/src/app/   — ROTAS (Next.js App Router)
--------------------------------------------------------------------------------

  layout.tsx      Casca HTML, metadata, importa o globals.css.
  globals.css     Tailwind + `color-scheme: light`.
  page.tsx        A tela principal. Server Component: verifica a sessão,
                  carrega o PDI do usuário e renderiza o cabeçalho (título
                  do ciclo, barra de progresso, botão "Insight p/ 1-on-1",
                  link "Importar", "Sair") + o canvas (ou o EmptyState se
                  não há PDI).
  import/page.tsx A tela de import. Server Component: checa a sessão,
                  carrega o PDI atual e passa para o formulário (que já vem
                  pré-preenchido).

  api/auth/[...nextauth]/route.ts   Handlers do Auth.js (login/logout/callback).
  api/sync/route.ts     POST — recebe a payload da EXTENSÃO, valida a sessão
                        e o schema, faz o upsert (source: "extension").
  api/import/route.ts   POST — mesma coisa para o IMPORT MANUAL
                        (source: "manual", preserva edições).
  api/pdi/route.ts      GET — devolve o documento do usuário (usado pelo canvas).
  api/pdi/root/route.ts     PATCH — edita título do ciclo e trilha (nó raiz).
  api/pdi/groups/route.ts   PUT  — substitui a lista de blocos.
  api/pdi/canvas/route.ts   PUT  — salva posições arrastadas e caixas dos frames.
  api/pdi/link/route.ts     POST/DELETE — cria/remove uma conexão manual.
  api/dev/seed/route.ts     GET — só em dev, popula com o PDI de exemplo + blocos.

  Regra de ouro de toda rota: o `userId` vem SEMPRE da sessão
  (`session.user.id`), nunca do corpo da requisição. Assim cada usuário só
  consegue ler e escrever o próprio PDI.

--------------------------------------------------------------------------------
apps/web/src/components/   — INTERFACE
--------------------------------------------------------------------------------

  EmptyState.tsx    Tela de "PDI vazio" com o link para o import.
  GeminiButton.tsx  Botão + modal com o prompt do Gemini (copiar / abrir).
  ImportTabs.tsx    Abas "Preencher à mão" x "Colar tabela / CSV".
  ManualBuilder.tsx Formulário campo a campo: adiciona áreas e ações com
                    título, descrição, tipo, prazo e status. Pré-preenchido
                    com o PDI atual.
  ImportForm.tsx    Colar tabela / subir CSV, com pré-visualização e avisos.

  canvas/
    PdiCanvas.tsx   O componente central do canvas. Orquestra: estado dos
                    nós e arestas, layout, seleção, arraste, guias de
                    alinhamento, undo/redo, conexões manuais, blocos
                    (criar, mover, redimensionar, participação por
                    geometria), edição do nó raiz e persistência com
                    debounce. É grande de propósito — é onde a interação
                    acontece.
    nodes.tsx       Os nós customizados: RootNode (o ciclo), AreaNode,
                    ActionNode, BandNode (cabeçalho de coluna / faixa de
                    raia nos layouts kanban e swimlane) e GroupNode (o frame
                    do bloco, com a nota amarela ao lado).
    edges.tsx       LinkEdge — a conexão manual estilo n8n (curva, com seta
                    e botão "x" para remover).
    HelperLines.tsx As linhas-guia de alinhamento (canvas overlay) que
                    aparecem ao arrastar um card.
    DetailPanel.tsx O painel lateral que abre ao clicar num nó (por
                    enquanto só leitura; edição chega na Rodada 4).

--------------------------------------------------------------------------------
apps/web/src/lib/   — INFRAESTRUTURA E ADAPTADORES
--------------------------------------------------------------------------------

  mongo.ts         Cliente MongoDB como singleton por processo (guardado em
                   `global` para o hot-reload do dev não abrir dezenas de
                   conexões).
  pdi-repo.ts      Repositório: `getPdiByUserId`, `applySync` (chama o
                   `mergePdi` do core e faz o upsert), `updateRoot`,
                   `setGroups`, `setCanvas`, `addLink`, `removeLink`,
                   `ensureIndexes`. É a única camada que fala com o banco.
  pdi-to-graph.ts  Traduz o `PdiDoc` para o formato do React Flow: nós,
                   arestas e os 5 formatos de layout (árvore horizontal,
                   árvore vertical, kanban por status, raias por área,
                   radial). Contém a lógica dos frames dos blocos
                   (`computeFrames`, `hugBox`, `areasInBox`).
  helper-lines.ts  Cálculo puro das guias de alinhamento (adaptado do
                   exemplo oficial do React Flow).
  theme.ts         Paleta de cores seguindo a plataforma: laranja = em
                   progresso, cinza = não iniciado, verde-água = finalizado,
                   azul = raiz / progresso geral.
  format.ts        Formatação de data ISO -> DD/MM/AAAA.

  auth.ts          Configuração central do Auth.js (`handlers`, `auth`,
                   `signIn`, `signOut`).
  types/           `next-auth.d.ts` (adiciona `id` ao tipo Session),
                   `css.d.ts` (declara o import de `.css`).

--------------------------------------------------------------------------------
apps/extension/   — A EXTENSÃO (ver seção 8)
--------------------------------------------------------------------------------

  README.md        Estrutura prevista e o lembrete de validar com a TI.

--------------------------------------------------------------------------------
docs/
--------------------------------------------------------------------------------

  PDI-PLUS-SPEC.md     Especificação técnica.
  PROGRESSO.md         O que foi entregue, por rodada.
  SETUP.md             Passo a passo de MongoDB Atlas + Google OAuth.
  TEST-CHECKLIST.md    Checklist de testes manuais.
  RELATORIO.md         Este documento.


================================================================================
6. DECISÕES DE PROJETO (E O PORQUÊ)
================================================================================

IDs determinísticos + merge idempotente.
  Problema: se a extensão sincroniza o PDI toda vez que o usuário clica, e
  cada área/ação recebe um ID aleatório, cada sync criaria duplicatas e
  apagaria o que o usuário organizou. Solução: o ID é um hash do título
  normalizado. O mesmo curso "Udemy: Node.js do Zero a Maestria" é sempre o
  mesmo nó, então o merge sabe atualizar em vez de recriar, e a posição no
  canvas, a descrição e a nota são preservadas.

Progresso geral = média dos percentuais das áreas.
  Não é o total global de ações concluídas ÷ total de ações. Foi confirmado
  observando a plataforma real (com os números do PDI do Hugo: a média das
  áreas dava 53,75%, o total global daria 62,5% — a plataforma mostrava
  53,75%). O sistema replica o cálculo da plataforma.

Blocos por geometria.
  Um "bloco" é um retângulo (frame) que o usuário posiciona e redimensiona
  sobre os cards. A participação NÃO é uma lista fixa: uma área pertence ao
  bloco quando o centro do card da área está dentro do frame. Isso torna o
  agrupamento tátil ("desenho um retângulo em volta desses cards") e
  reversível ("arrasto o card pra fora e ele sai do bloco"). As ações
  seguem a área. Recalculado a cada arraste/redimensionamento.

Estado visual do canvas separado dos dados.
  As posições arrastadas e as caixas dos frames ficam em
  `PdiDoc.canvas` (um blob), não espalhadas dentro de cada área/ação.
  Motivo: um sync ou reimport pode reordenar/recriar áreas e ações, mas o
  arranjo visual do usuário continua valendo (é casado por ID de nó). E é
  uma única chamada `PUT /api/pdi/canvas`, com debounce, em vez de dezenas
  de PATCHs.

IA com custo zero de infraestrutura.
  Não há chave de API de LLM no backend nem chamada de IA no servidor. O
  botão "Insight p/ 1-on-1" monta um prompt determinístico com o PDI e o
  usuário cola na interface web do Gemini. Custo de infra de IA: R$ 0,00.
  Nada de chave para vazar. A extração de dados também é determinística
  (parser de DOM), não usa IA.

Sessão JWT sem adapter.
  Como o dado é do próprio usuário e a identidade é o `sub` do Google, não
  precisamos de tabelas de `users`/`sessions`/`accounts`. Menos schema,
  menos código, menos superfície de erro.

Decisão ainda em aberto: `source: "manual"` trava a ação inteira.
  Hoje, quando o usuário edita uma ação, ela vira `manual` e o sync passa a
  não sobrescrever status nem prazo dela. A alternativa seria rastrear
  override por campo (só o status ficou manual, o prazo ainda segue o
  sync). Fica para reavaliar quando a extensão existir.


================================================================================
7. MODELO DE DADOS (coleção `pdis`, um documento por usuário)
================================================================================

  PdiDoc
    userId      string   (Google sub — índice único)
    shareId     string?  (slug do link read-only do gestor — índice sparse)
    updatedAt   Date
    syncedAt    Date?    (último sync da extensão)
    root        { title, track? }              (ex.: "PDI 2026" / "Fullstack")
    areas       Area[]
    links       PdiLink[]?                     (conexões manuais)
    groups      PdiGroup[]?                    (blocos)
    canvas      { positions, frames }?         (estado visual)

  Area
    id          string   (hash determinístico do título)
    title       string
    kind        "desenvolver" | "potencializar"
    status      "todo" | "doing" | "done"      (DERIVADO das ações)
    order       number
    description string?  (comentário estilo FigJam)
    actions     Action[]

  Action
    id          string   (hash de: título da área + título da ação)
    title       string
    kind        "desafio_profissional" | "treinamento_estudo"
                | "mentoria_feedback" | "outro"
    description string?
    status      "todo" | "doing" | "done"
    dueDate     string?  ("AAAA-MM-DD")
    source      "extension" | "manual"

  PdiGroup   { id, title, color, order, areaIds[], note? }
  PdiLink    { id, source, target, label? }


================================================================================
8. A EXTENSÃO DO NAVEGADOR (CHROME — MANIFEST V3)
================================================================================

--------------------------------------------------------------------------------
8.1. O que é e por que Manifest V3
--------------------------------------------------------------------------------

Uma extensão de navegador é um pequeno pacote (HTML/CSS/JS) que o Chrome
carrega e que pode observar e modificar páginas, reagir a cliques na barra
de ferramentas e fazer requisições. O "manifest" é o arquivo que descreve
a extensão: nome, versão, permissões, quais scripts rodam e onde.

Manifest V3 (MV3) é a versão atual e obrigatória do formato. As diferenças
principais em relação ao antigo MV2:

  - O código de fundo roda num SERVICE WORKER (efêmero, acorda quando
    precisa e dorme depois), não numa "background page" sempre ligada.
    Consome menos memória.
  - PERMISSÕES DE HOST são declaradas separadas das permissões de API
    (`host_permissions`), e o usuário vê exatamente em quais sites a
    extensão pode agir.
  - É PROIBIDO carregar e executar código remoto. Tudo que a extensão
    executa tem que estar dentro do pacote. Isso a torna auditável: o que
    está no zip é o que roda.

Para o PDI+, MV3 é vantajoso porque:
  - A extensão só age no domínio da plataforma de PDI (host_permission
    específico), nada além disso.
  - Sem código remoto = uma revisão de segurança do CESAR consegue ler
    todo o comportamento no próprio código.
  - Service worker efêmero = quase nenhum custo de recurso quando a
    extensão não está sincronizando.

--------------------------------------------------------------------------------
8.2. Partes da extensão
--------------------------------------------------------------------------------

  manifest.json
    O descritor. Define permissões, o content script, o service worker e o
    popup.

  Content script  (src/content.ts)
    Roda DENTRO da página da plataforma de PDI. É ele que:
      1. Lê o DOM da tela (títulos das áreas, ações, status, prazos,
         descrições) usando seletores CSS.
      2. Normaliza esses dados na payload esperada pelo `POST /api/sync`
         (reaproveitando o `packages/core` para mapear os rótulos).
      3. Adiciona um item "PDI+" na barra de navegação da plataforma, ao
         lado de "Instruções de PDI", que abre o canvas do PDI+. É só um
         `<a>` acrescentado ao DOM — não lê nem envia nada — então pode ser
         a primeira coisa a funcionar.

  Service worker  (src/background.ts)
    O "fundo" da extensão. Guarda o token de sessão que o PWA entrega e
    intermedeia a chamada de sincronização.

  Popup  (src/popup/)
    A janelinha que abre ao clicar no ícone da extensão. Tem o botão
    "Sincronizar" e mostra o resultado (inclusive "sincronização parcial"
    com o aviso específico, se algum campo não pôde ser lido).

--------------------------------------------------------------------------------
8.3. manifest.json (exemplo comentado)
--------------------------------------------------------------------------------

  {
    "manifest_version": 3,
    "name": "PDI+ Sync",
    "version": "0.1.0",
    "description": "Sincroniza o PDI da plataforma com o PDI+.",

    // Permissões de API que a extensão usa:
    "permissions": ["storage", "activeTab", "scripting"],

    // Em QUAIS sites a extensão pode agir. Só o domínio da plataforma
    // de PDI — nada mais. (URL fictícia; a real entra depois da validação
    // com a TI.)
    "host_permissions": ["https://plataforma-pdi.exemplo.com/*"],

    // O script que roda dentro da página da plataforma:
    "content_scripts": [
      {
        "matches": ["https://plataforma-pdi.exemplo.com/*"],
        "js": ["content.js"],
        "run_at": "document_idle"
      }
    ],

    // O "fundo" da extensão (service worker efêmero):
    "background": { "service_worker": "background.js" },

    // O popup do ícone da barra de ferramentas:
    "action": {
      "default_popup": "popup/index.html",
      "default_title": "PDI+ Sync"
    },

    // Quem pode conversar com a extensão de fora: só o PWA em produção.
    // É por aqui que o PWA entrega o token de sessão para a extensão.
    "externally_connectable": {
      "matches": ["https://pdi-mais.vercel.app/*"]
    }
  }

--------------------------------------------------------------------------------
8.4. Fluxo de sincronização (e a autenticação da extensão)
--------------------------------------------------------------------------------

  1. O usuário faz login no PWA (Google). O PWA tem uma sessão válida.
  2. O usuário abre a plataforma de PDI e clica em "Sincronizar" no popup
     da extensão.
  3. O content script lê o DOM e monta a payload.
  4. A extensão precisa se autenticar na API do PWA (senão qualquer um
     faria POST). O PWA, via `externally_connectable`, entrega um TOKEN DE
     SESSÃO CURTO para a extensão através de `chrome.runtime.sendMessage`.
  5. A extensão faz `POST /api/sync` com esse token no header.
  6. A API valida o token contra a sessão Auth.js e só então grava. O
     `userId` vem da sessão — a extensão não escolhe por quem sincroniza.

Nada do PDI "sai do controle do usuário" além do que ele já acessa: a
leitura é feita no navegador dele, na sessão dele, sobre dados que ele já
tem permissão de ver. O que sobra de atenção não é privacidade de
terceiros — é o fato de uma CÓPIA do dado corporativo passar a existir no
MongoDB Atlas / Vercel. Por isso: validar com a TI/Segurança do CESAR
antes de rodar o content script contra a plataforma real, e manter o
import manual como plano B caso a extensão não seja aprovada.

--------------------------------------------------------------------------------
8.5. Como instalar no Chrome (modo desenvolvedor)
--------------------------------------------------------------------------------

  1. Compilar a extensão: `pnpm --filter @pdi-mais/extension build`
     (gera a pasta `apps/extension/dist` com o manifest e os .js).
  2. Abrir `chrome://extensions` no Chrome.
  3. Ligar o botão "Modo do desenvolvedor" (canto superior direito).
  4. Clicar em "Carregar sem compactação" ("Load unpacked") e selecionar a
     pasta `apps/extension/dist`.
  5. O Chrome mostra a extensão e um "ID" (uma string longa de letras).
     Copiar esse ID.
  6. Colar o ID na configuração do PWA (a ponte `ExtensionBridge`), para o
     PWA saber com qual extensão pode conversar.
  7. Fixar o ícone da extensão na barra (opcional) e testar o popup.

Para distribuir para o time depois, o caminho é empacotar (.zip) e publicar
na Chrome Web Store (modo privado / não listado) ou distribuir via política
de grupo da TI — decisão que depende da aprovação.

--------------------------------------------------------------------------------
8.6. Por que usar a extensão
--------------------------------------------------------------------------------

  - A plataforma de PDI NÃO exporta os dados. As alternativas seriam
    redigitar tudo ou tirar prints. A extensão elimina o retrabalho: um
    clique e o PDI+ reflete o estado atual do PDI corporativo.
  - O dado fica sempre atualizado. Toda vez que o usuário mexe no PDI da
    empresa, um sync deixa o canvas em dia — sem esforço.
  - O link "PDI+" injetado na navbar dá acesso ao canvas de dentro da
    própria plataforma, no fluxo natural de trabalho.
  - É de baixo risco por construção: MV3 sem código remoto, host_permission
    só do domínio da plataforma, tudo auditável, e a leitura acontece no
    navegador do próprio usuário.


================================================================================
9. TESTES
================================================================================

  pnpm test        — roda todos os testes
  pnpm typecheck   — checa tipos em todos os pacotes
  pnpm build       — build de produção da web

Cobertura atual (Vitest):
  packages/core   16 testes — merge idempotente, preservação de edições,
                  prune de links/blocos, parser de import (separador,
                  cabeçalho, sync parcial, aspas com vírgula/quebra),
                  progresso, IDs, prompt do Gemini.
  apps/web        12 testes — construção do grafo nos 5 layouts, layout LR
                  x TB, frames dos blocos, IDs únicos.


================================================================================
10. DEPLOY
================================================================================

  - `apps/web` publica na Vercel (CI/CD no push para `main`, SSL, domínio).
  - Variáveis de ambiente na Vercel: `MONGODB_URI`, `MONGODB_DB`,
    `AUTH_SECRET`, `AUTH_URL`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`.
  - No Google Cloud, adicionar o domínio de produção nas origens e no
    redirect (`https://.../api/auth/callback/google`).
  - A extensão é distribuída à parte (Chrome Web Store não listada ou
    política da TI).
