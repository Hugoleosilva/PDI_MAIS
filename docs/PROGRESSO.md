# Progresso do PDI+

Registro do que foi entregue por rodada. Roadmap completo: seção 9 de
[`PDI-PLUS-SPEC.md`](PDI-PLUS-SPEC.md).

---

## ✅ Rodada 1 — Fundação

Monorepo pnpm com `apps/web` (Next.js 15 App Router) e `packages/core`.

**`packages/core`** — lógica pura, testada com Vitest:
- `types.ts` — modelo do PDI (`PdiDoc`, `Area`, `Action`, `PdiLink`, `Status`).
- `labels.ts` — conversão dos rótulos da plataforma (`"Não iniciado"`,
  `"Finalizada"`, `"Desenvolver"`, `"Treinamento e estudo"`…) para os valores
  canônicos internos.
- `progress.ts` — `areaProgress` (ações done ÷ total) e `overallProgress`
  (**média** dos percentuais das áreas — confirmado na plataforma).
- `ids.ts` — id determinístico (hash cyrb53, puro JS) a partir do título
  normalizado; garante merge idempotente.
- `schema.ts` — validação Zod do payload de sync.
- `merge.ts` — `mergePdi(existing, payload)`: aplica um sync preservando
  edições locais (`layout`, `description`) e o status/prazo de ações marcadas
  como `manual`; recalcula o status derivado das áreas.

**`apps/web`**:
- Autenticação **Google OAuth** via Auth.js v5 (sessão JWT; `userId` = `sub`
  do Google). Cada usuário só acessa o próprio PDI.
- Cliente **MongoDB** singleton (`lib/mongo.ts`) + repositório (`lib/pdi-repo.ts`).
- `POST /api/sync` — recebe o PDI, valida sessão + payload, faz upsert.
- `GET /api/pdi` — devolve o documento do usuário.
- Tela de login/logout.

**Infra**: `docs/SETUP.md` com o passo a passo de MongoDB Atlas + Google Cloud.
Deploy alvo: Vercel.

---

## ✅ Rodada 2 — Canvas visual

Canvas interativo em `apps/web/src/components/canvas/` usando **React Flow**
(`@xyflow/react`) + **Dagre** para auto-layout.

**Visual** (paleta da plataforma — `lib/theme.ts`):
- 🟠 laranja = Em progresso · ⚪ cinza = Não iniciado · 🟢 verde-água = Finalizado.
- Nó **raiz** destacado (fundo azul, selo "PDI", barra de progresso geral);
  título e trilha **editáveis por duplo clique** (`PATCH /api/pdi/root`).
- Nós de **área** (status, % e nº de ações, 🕒 se tem ação não iniciada) e de
  **ação** (status, prazo, área, tipo).
- **Painel lateral** ao clicar num nó, com a descrição/comentário (estilo FigJam).

**Formatos de layout** (o usuário escolhe na barra de ferramentas):
| Formato | Descrição |
|---|---|
| Árvore → | raiz → áreas → ações, da esquerda para a direita |
| Árvore ↓ | mesma coisa, de cima para baixo |
| Kanban (status) | 3 colunas: Não iniciado / Em progresso / Finalizado |
| Raias (área) | uma faixa horizontal por área, com suas ações |
| Radial | raiz no centro, áreas em volta |

**Interações**:
- Arrastar nós; **guias de alinhamento** estilo FigJam (linha + snap ao alinhar
  com outro card).
- **Conexões manuais estilo n8n**: arrasta da bolinha de um card até outro para
  ligar áreas/ações que se complementam. Salvas no banco
  (`PdiDoc.links`, `POST`/`DELETE /api/pdi/link`). Não entram no auto-layout.
  Remover: clicar na conexão → botão **×** (ou tecla Delete).
- **Seleção múltipla**: Shift + arraste; move o bloco junto.
- **Desfazer** (Ctrl+Z / botão): posições e conexões, na mesma pilha.
- **Reorganizar**: volta ao auto-layout.
- `GET /api/dev/seed` (só em dev): popula o canvas com o PDI real de exemplo
  (8 áreas, 32 ações) transcrito dos prints.

**Ainda não persiste**: as posições que você arrasta e o formato de layout
escolhido são por sessão (persistência = Rodada 4).

---

## ✅ Rodada 2.5 — Blocos de agrupamento

Frames coloridos (estilo FigJam) que agrupam áreas semelhantes em grandes
blocos estratégicos. Modelo: `PdiDoc.groups` (`PdiGroup` = id, título, cor,
`areaIds`). Pré-configurados 5 blocos para o PDI do Hugo
(`core/groups.ts` → `SEED_GROUPS`):

| Bloco | Áreas |
|---|---|
| Core · Engenharia Full-Stack | Backend · Frontend · TideFlow |
| Inteligência · IA, Agentes & Automação | Inteligência Artificial / Automação |
| Plataforma · Dados & Integrações | Engenharia e Análise de Dados |
| Institucional & Carreira | Comportamental · Inglês |
| Opcional · Plataformas Alternativas | Low-Code |

**Regra de participação (geométrica):** um card pertence ao bloco quando a
**área de desenvolvimento** está dentro do frame. As ações seguem a área.
Recalculado ao mover/redimensionar frame ou mover um card (`recapture`).

**Interação (sem modos):**
- Arrastar um **card** → move só o card.
- Arrastar o **frame** → move o frame + os cards das áreas que estão dentro.
- **Clique / 2 cliques** no bloco → seleciona só o bloco (alças de
  redimensionar + `✕ Excluir`); não seleciona card nenhum.
- **Alças** nas 4 pontas redimensionam; quem entrar/sair pela borda ganha/perde
  o vínculo.
- **Shift+arrastar** → caixa de seleção só de cards.
- **Espaço+arrastar** ou botão do meio → navega.
- Título editável (duplo clique), cor (bolinha), `+ Bloco`, `★ Sugeridos`,
  `💾 Salvar`, toggle `▦ Blocos`.
- Persistência: `PUT /api/pdi/groups` (blocos) + `PUT /api/pdi/canvas`
  (posições + caixas dos frames). Só nos layouts em árvore.

---

---

## ✅ Rodada 5 — Import manual

Página **`/import`** com duas abas:

**Preencher à mão** (`ManualBuilder`) — formulário campo a campo: área +
descrição, e por ação título · descrição · tipo · prazo · status. Vem
pré-preenchido com o PDI atual (dá pra editar/completar). Salvar → canvas.

**Colar tabela / CSV** (`ImportForm`) — cola a tabela ou sobe `.csv`,
pré-visualização com contagem e avisos, confirmar → canvas.
- Colunas: `Área, Descrição da área, Ação, Descrição da ação, Tipo, Prazo, Status`.
- Parser RFC 4180 (`parseImportTable`): campos entre `"aspas"` com vírgula/
  quebra de linha; separador (`,` `;` tab) e cabeçalho detectados sozinhos.
- **Sync parcial**: linha com área/ação vazia → ignorada com aviso; status
  desconhecido → "Não iniciado" com aviso; prazo inválido → ação sem prazo.

`POST /api/import` (`source: "manual"`) reusa `applySync` → o merge preserva
posições, blocos e edições manuais. Reimportar = atualizar o PDI.

## ✅ Extra — Insight para 1-on-1 (Gemini)

Botão **"✦ Insight p/ 1-on-1"** no cabeçalho → modal com o prompt montado a
partir do PDI (`buildInsightPrompt` em `packages/core/src/insight.ts`):
ciclo, trilha, progresso, áreas com status/%/descrição, ações com status/prazo/
contexto, e o pedido de resumo executivo (entregas · riscos de prazo · lacunas ·
argumentos para pedir apoio). Botões: copiar prompt · abrir gemini.google.com.

---

## ✅ Rodada 6 — Planejamento de capacidade

Página **`/planejamento`**. Responde a “quando eu termino isso, no meu ritmo?”.

- **Progresso real por ação** — `Action.estimatedHours` (carga horária) +
  `unitsTotal/unitsDone/unitsLabel` (ex. 23 de 290 módulos) ou `hoursDone`.
  `actionCompletion`: módulos → horas feitas → status. Formação longa que
  ficava em “Em progresso” eterno agora mostra o % real (23/290 ≈ 8%).
- **Capacidade semanal** — grade de 7 dias por bloco (`PdiGroup.capacity`) e
  uma grade para o que está fora de bloco (`PdiDoc.looseCapacity`).
- **Projeção** — `restante (h) ÷ h por semana` → data prevista de conclusão,
  por bloco; a data do PDI é a do bloco mais lento. Selo: no ritmo /
  adiantado / atrasado (X semanas).
- **Gráfico burn-down** — 2 linhas: previsto (reta do total → 0 no ritmo) e
  real (degraus nas datas de conclusão + o parcial de hoje).
- Editor inline: carga / módulos / status por ação, com save em debounce.
- `PATCH /api/pdi/action/[id]`, `PUT /api/pdi/capacity`; `planning.ts` no
  `core` com 12 testes.

---

## ✅ Rodada 7 — cores, IA com opções, relatório, versões do canvas

1. ✅ **Cor customizável nos blocos e nas notas** — o ponto de cor no cabeçalho
   do bloco e o pontinho na nota abrem um seletor (paleta + cor personalizada
   via `<input type="color">`) em vez do antigo "cicla pra próxima cor".
   Paleta dos blocos (`GROUP_COLORS`) e paleta de papel das notas
   (`NOTE_COLORS`) em `packages/core/src/groups.ts`; `PdiGroup.noteColor?`
   é independente da cor do bloco.
2. ✅ Menu de opções no botão da IA — 5 chips (Resumo p/ 1-on-1, Insights,
   Andamento geral, Onde focar, Sugestão de tecnologia ou curso), cada um
   com um "ask" próprio em `ASKS`; o contexto do PDI (`buildContextBlock`)
   é sempre o mesmo. `InsightKind` em `packages/core/src/insight.ts`.
3. ✅ % de andamento dentro do bloco — badge no cabeçalho do frame, média do
   `progress` das áreas de dentro (mesma conta do card da área). Calculado
   em `computeFrames` lendo direto do `AreaNode` já montado, sem precisar
   passar `pdi.areas` de novo.
4. ✅ Botão "Relatório" — `POST /api/pdi/reports` fotografa o andamento
   (`ProgressSnapshot`: geral + por área) e anexa a `PdiDoc.reports`
   (`packages/core/src/reports.ts`, máx. 60, preservado no merge). O painel
   lista o histórico mais recente primeiro, com a diferença em p.p. desde o
   relatório anterior e o detalhe por área ao expandir.
5. ✅ Nó raiz redimensionável — revisado após feedback (o "recolher tudo"
   inicial não fazia sentido pro usuário). Agora é igual ao bloco: seleciona
   o card do PDI, aparecem alças nos cantos, arrasta e o card fica maior
   (mais espaço pro título/trilha). Tamanho persiste em
   `PdiCanvasState.rootSize`. `NODE_SIZE.root` continua sendo o que o Dagre
   usa pra espaçar os vizinhos — o resize é só o card em si (min 220×150,
   max 420×300, pra não colidir com os cards ao lado).
6. ✅ Registro de certificado — `Action.certificateUrl` (link; o arquivo em
   si fica no PDI estático, por decisão do usuário — sem upload/storage
   novo). Campo aparece no formulário manual só quando a ação está
   "Finalizado"; no card da ação vira "🎓 certificado ↗" clicável.
7. ✅ Versões salvas do canvas — `CanvasPreset` (layout + blocos + posições +
   frames) em `PdiDoc.canvasPresets`, `PUT /api/pdi/canvas-presets`. UI mais
   simples possível: um `<select>` com as versões salvas + "💾 Salvar
   como…" (nome via prompt) no mesmo painel dos botões de layout. Puramente
   opt-in — carregar uma versão só troca o arranjo se o usuário escolher.

## ✅ Rodada 7.8 — quantitativo de ações no cartão do bloco

- `GroupNodeData.actionStats` — total/a iniciar/em andamento/finalizadas das
  ações do bloco, calculado em `computeFrames` a partir dos `ActionNode` já
  montados (mesmo padrão do `progress`).
- O cartãozinho ao lado do bloco (nota/anotação) virou popover de verdade:
  só existe enquanto o bloco está selecionado ou você está editando a nota
  — clicar fora desseleciona e ele some (antes, uma nota com texto ficava
  sempre visível). Mostra os 3 pills de quantitativo + a anotação.
- Textarea da anotação agora é `resize-y` (arrasta pra crescer) em vez de
  altura fixa.

## ✅ Rodada 7.9 — bug do raiz "pulando" + objetivo geral

- **Bug corrigido:** arrastar um bloco chamava `recapture()`, que muda
  `groups` quando a participação de alguma área mudou; isso recalculava o
  layout inteiro, e como a posição do raiz nunca tinha sido "ancorada"
  (só área/ação eram salvas em `positions` ao arrastar), o card do PDI
  recalculava do zero a cada vez — na prática, parecia "pular" pro meio do
  bloco que acabou de ser arrastado. Agora a posição do raiz é ancorada
  assim que calculada (mesmo esquema de área/ação); some ao trocar de
  direção da árvore (→/↓) ou em "Reorganizar". Arrastar o raiz manualmente
  também persiste, como já acontecia com área/ação.
- **Objetivo geral** ("pra onde estou indo") — mesmo padrão do card
  amarelo do bloco: anotação em popover acima do card do PDI, só existe
  selecionado ou editando, clicar fora fecha. `PdiRoot.note`, `PATCH
  /api/pdi/root` aceita `note` (null remove).

## ✅ Rodada 7.10 — Planejamento revisado (feedback de uso real)

Depois de lançar dados reais (7 blocos, 37 ações), veio uma lista de problemas:

1. **% ponderado por horas era enganoso.** Um curso de 90h parado "abafava" o
   progresso de outra ação de 10h finalizada. Fixo: `areaRealProgress` e
   `projectFromActions.completion` agora são **média simples** do
   `actionCompletion` de cada ação — módulos, horas e status contam igual.
   % é % sempre, seja qual for a régua usada pra chegar lá.
2. **Badge "Adiantado" contradizia o gráfico ("atrasado").** Eram dois
   cálculos diferentes (o `planStatus()` do bloco vs um `behind` calculado
   dentro do gráfico). Agora só existe UM cálculo (`b.status`) e tanto o
   badge quanto a cor da barra vêm dele.
3. **Gráfico de linha trocado por barras** (`PctBar.tsx`) — "Real" (sempre,
   vem do % acima) e "Previsto no seu ritmo" (só quando há carga horária +
   capacidade preenchidas). `Burndown.tsx` removido.
4. **Consolidado geral trocado.** Não soma mais a capacidade dos blocos
   (ninguém trabalha em todos ao mesmo tempo — 83h/semana não existe) nem
   projeta uma data única. Vira uma distribuição simples: X% não iniciado,
   Y% em andamento, Z% finalizado, com uma barra segmentada.
5. **Bug do "fecha sozinho" corrigido.** O bloco abria automaticamente
   enquanto não tinha carga horária; ao digitar a primeira hora, a condição
   ficava falsa e a seção recolhia sozinha, perdendo o lugar. Agora a
   decisão de abrir é tomada UMA vez (estado inicial), não a cada tecla.
6. **"Carga horária" marcada como opcional** — hint "(opcional — só p/
   prever a data)" ao lado do campo; não é mais pré-requisito pra ver
   andamento, só pra ver a data prevista.

## ⏭️ Próximas rodadas

| Rodada | Escopo |
|---|---|
| 3 | Extensão Chrome (Manifest V3): parser do DOM da plataforma + sync 1-clique + link "PDI+" na navbar. **Validar com TI/Segurança do CESAR antes.** |
| 4 (resto) | Editar status/prazo/nota clicando no card do canvas (o `DetailPanel` ainda é read-only; a edição de planejamento já existe em `/planejamento`); modo gestor (share link `/r/[shareId]`); PWA. |

Checklist de teste manual: [`TEST-CHECKLIST.md`](TEST-CHECKLIST.md).
